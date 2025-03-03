import { useState, useEffect, useCallback, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { TOOLBAR_OPTIONS, SAVE_INTERVAL_MS } from '../data';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';

// Add a QuillCursors interface
interface QuillCursors {
  createCursor: (id: string, name: string, color: string) => void;
  moveCursor: (id: string, range: { index: number, length: number }) => void;
  removeCursor: (id: string) => void;
  update: () => void;
}

// Type for user information
interface User {
  userName: string;
  color: string;
  cursorPosition: {
    index: number;
    length: number;
  };
  userId?: string;
}

export const TextEditor = () => {
    const [socket, setSocket] = useState<Socket>();
    const [quill, setQuill] = useState<Quill>();
    const [userName, setUserName] = useState<string>("");
    const [cursors, setCursors] = useState<QuillCursors | null>(null);
    const { id: documentId } = useParams();
    const cursorUpdateDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    
    // Initialize username on component mount
    useEffect(() => {
        // Generate a random username if none exists in localStorage
        const storedName = localStorage.getItem('user-name');
        const generatedName = storedName || `User_${Math.floor(Math.random() * 10000)}`;
        
        if (!storedName) {
            localStorage.setItem('user-name', generatedName);
        }
        
        setUserName(generatedName);
    }, []);

    useEffect(() => {
        const skt = io(import.meta.env.VITE_SERVER_URL);
        setSocket(skt);
        return () => {
            skt.disconnect();
        }
    }, []);

    const wrapperRef = useCallback((wrapper: HTMLDivElement) => {
        if(!wrapper) return;
        wrapper.innerHTML = '';
    
        const editor = document.createElement("div");
        wrapper.append(editor);

        // Import QuillCursors dynamically and initialize
        import('quill-cursors').then(cursorModule => {
            // Register the module with Quill
            Quill.register('modules/cursors', cursorModule.default as any);
            
            const qul = new Quill(editor, { 
                theme: "snow", 
                modules: {
                    toolbar: TOOLBAR_OPTIONS,
                    cursors: {
                        transformOnTextChange: true,
                    }
                }
            });
            
            qul.disable();
            qul.setText("Loading...");
            setQuill(qul);
            
            // Store cursor module reference
            setCursors(qul.getModule('cursors') as QuillCursors);
        });
    }, []);

    // Sending changes to server
    useEffect(() => {
        if(!socket || !quill) return;

        // @ts-ignore
        const handler = (delta, oldDelta, source) => {
            if (source !== "user") return;
            socket.emit("send-changes", delta);
        }

        quill.on("text-change", handler);

        return () => {
            quill.off("text-change", handler);
        }
    }, [socket, quill]);

    // Receiving changes from server
    useEffect(() => {
        if(!socket || !quill) return;

        // @ts-ignore
        const handler = (delta) => {
            quill.updateContents(delta);
        }

        socket.on("receive-changes", handler);

        return () => {
            socket.off("receive-changes", handler);
        }
    }, [socket, quill]);

    // Handle cursor position updates
    useEffect(() => {
        if (!socket || !quill || !cursors) return;

        // Send cursor position when selection changes
        const selectionChangeHandler = (range:any, oldRange:any, source:any) => {
            if (source === 'user' && range) {
                // Debounce cursor updates to avoid overloading the server
                if (cursorUpdateDebounceTimer.current) {
                    clearTimeout(cursorUpdateDebounceTimer.current);
                }
                
                cursorUpdateDebounceTimer.current = setTimeout(() => {
                    socket.emit("cursor-move", {
                        index: range.index,
                        length: range.length
                    });
                }, 100);
            }
        };

        // Receive cursor updates from others
        const cursorUpdateHandler = (userData: User) => {
            if (!userData || !userData.userId) return;
            
            try {
                // Create cursor if it doesn't exist yet
                cursors.createCursor(
                    userData.userId,
                    userData.userName,
                    userData.color
                );
                
                // Update cursor position
                cursors.moveCursor(
                    userData.userId,
                    userData.cursorPosition
                );
            } catch (error) {
                console.error("Error updating cursor:", error);
            }
        };

        // Handle users joining or leaving
        const usersChangedHandler = (users: User[]) => {
            if (!cursors) return;
            
            // First clear all cursors
            try {
                cursors.update();
            } catch (e) {
                console.error("Error updating cursors", e);
            }
            
            // Create new cursors for each active user
            users.forEach(user => {
                if (user.userId && user.userId !== socket.id) {
                    try {
                        cursors.createCursor(
                            user.userId,
                            user.userName,
                            user.color
                        );
                        
                        if (user.cursorPosition) {
                            cursors.moveCursor(
                                user.userId,
                                user.cursorPosition
                            );
                        }
                    } catch (e) {
                        console.error("Error creating cursor", e);
                    }
                }
            });
        };

        quill.on('selection-change', selectionChangeHandler);
        socket.on('cursor-update', cursorUpdateHandler);
        socket.on('users-changed', usersChangedHandler);

        return () => {
            quill.off('selection-change', selectionChangeHandler);
            socket.off('cursor-update', cursorUpdateHandler);
            socket.off('users-changed', usersChangedHandler);
            
            if (cursorUpdateDebounceTimer.current) {
                clearTimeout(cursorUpdateDebounceTimer.current);
            }
        };
    }, [socket, quill, cursors]);

    // Load document content
    useEffect(() => {
        if(!socket || !quill) return;

        socket.once("load-document", document => {
            quill.setContents(document);
            quill.enable();
        });

        const documentName = localStorage.getItem(`document-name-for-${documentId}`) || "Untitled";
        socket.emit("get-document", { 
            documentId, 
            documentName, 
            userName 
        });

    }, [socket, quill, documentId, userName]);

    // Save document at regular intervals
    useEffect(() => {
        if(!socket || !quill) return;
        
        const interval = setInterval(() => {
            socket.emit("save-document", quill.getContents());
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        }
    }, [socket, quill]);

    return (
        <div className="editorContainer" ref={wrapperRef}>
            {/* Optional: Show active users */}
            <div className="active-users-container">
                {/* You can add a UI component here to show active users */}
            </div>
        </div>
    );
}