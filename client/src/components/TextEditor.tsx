import { useState, useEffect, useCallback, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState } from '@excalidraw/excalidraw/types/types';

// Import custom font styles
import 'quill/dist/quill.snow.css';
import { getCookie } from '@/lib/utils';

// Add QuillCursors interface
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

// Updated toolbar options with font family and size
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }], // Add font family dropdown
  [{ size: ['small', false, 'large', 'huge'] }], // Add font size dropdown
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  ['blockquote', 'code-block'],
  ['link', 'image', 'video'],
  ['clean'],
];

// Save interval in milliseconds
const SAVE_INTERVAL_MS = 2000;

export const TextEditor = () => {
    const [socket, setSocket] = useState<Socket>();
    const [quill, setQuill] = useState<Quill>();
    const [userName, setUserName] = useState<string>("");
    const [cursors, setCursors] = useState<QuillCursors | null>(null);
    const [showDrawing, setShowDrawing] = useState<boolean>(false);
    const [excalidrawElements, setExcalidrawElements] = useState<ExcalidrawElement[]>([]);
    const [appState, setAppState] = useState<AppState>({
      viewBackgroundColor: "#f5f5f5",
      currentItemFontFamily: 1,
    } as AppState);
    const { id: documentId } = useParams();
    const cursorUpdateDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const excalidrawRef = useRef<any>(null);
    const drawingUpdateTimer = useRef<NodeJS.Timeout | null>(null);
    // Keep track of the latest elements to avoid stale state in callbacks
    const latestElementsRef = useRef<ExcalidrawElement[]>([]);
    
    // Update the ref whenever elements change
    useEffect(() => {
        latestElementsRef.current = excalidrawElements;
    }, [excalidrawElements]);
    
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

    // Register custom fonts with Quill
    useEffect(() => {
        // Add fonts to Quill's font whitelist
        const Font = Quill.import('formats/font');
        (Font as any).whitelist = [
            'arial', 
            'times-new-roman', 
            'courier-new', 
            'georgia', 
            'trebuchet-ms', 
            'verdana',
            'roboto',
            'open-sans',
            'dancing-script', // Cursive font
            'pacifico',       // Another cursive option
            'indie-flower',   // More casual handwriting
            'sacramento'      // Elegant cursive
        ];
        Quill.register(Font as any, true);
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
            
            // Add event handler for font changes
            const toolbar = qul.getModule('toolbar');
            (toolbar as any).addHandler('font', (value: string) => {
                qul.format('font', value);
                
                // Emit font change to other users
                if (socket) {
                    socket.emit('font-change', { 
                        font: value,
                        range: qul.getSelection()
                    });
                }
            });
        });
    }, [socket]);

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

        // Handle font changes from other users
        socket.on("receive-font-change", (data: any) => {
            // Apply the font change if it affects the document
            if (data.range) {
                quill.formatText(
                    data.range.index,
                    data.range.length,
                    'font',
                    data.font
                );
            }
        });

        return () => {
            socket.off("receive-changes", handler);
            socket.off("receive-font-change");
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

    // Handle Excalidraw drawing events
    useEffect(() => {
        if (!socket) return;

        // Load drawings from server
        socket.on("load-drawings", (drawings: ExcalidrawElement[]) => {
            if (Array.isArray(drawings)) {
                setExcalidrawElements(drawings);
            }
        });

        // Receive updated drawings from server
        socket.on("drawings-updated", (drawings: ExcalidrawElement[]) => {
            if (Array.isArray(drawings)) {
                setExcalidrawElements(drawings);
            }
        });

        // Receive individual drawing element updates - FIX: Use functional updates
        socket.on("drawing-element-updated", (element: ExcalidrawElement) => {
            setExcalidrawElements(prev => {
                const index = prev.findIndex(el => el.id === element.id);
                if (index >= 0) {
                    const newElements = [...prev];
                    newElements[index] = element;
                    return newElements;
                } else {
                    return [...prev, element];
                }
            });
        });

        // Handle drawing clear events
        socket.on("drawings-cleared", () => {
            setExcalidrawElements([]);
        });

        return () => {
            socket.off("load-drawings");
            socket.off("drawings-updated");
            socket.off("drawing-element-updated");
            socket.off("drawings-cleared");
        };
    }, [socket]);

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
            token: getCookie('token')! 
        });

    }, [socket, quill, documentId, userName]);

    // Save document at regular intervals - FIX: Use ref for latest elements
    useEffect(() => {
        if(!socket || !quill) return;
        
        const interval = setInterval(() => {
            socket.emit("save-document", quill.getContents());
            
            // Also save drawings if we have them - use ref to avoid stale state
            if (latestElementsRef.current.length > 0) {
                socket.emit("update-drawings-batch", latestElementsRef.current);
            }
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        }
    }, [socket, quill]);

    // Handle Excalidraw changes with debouncing - FIX: Use refs to avoid stale state
    const handleExcalidrawChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
        // Update local state
        const elementsArray = elements as ExcalidrawElement[];
        setExcalidrawElements(elementsArray);
        setAppState(appState);
        
        // Update the ref to prevent stale state in the interval
        latestElementsRef.current = elementsArray;
        
        // Debounce sending updates to the server
        if (socket) {
            if (drawingUpdateTimer.current) {
                clearTimeout(drawingUpdateTimer.current);
            }
            
            drawingUpdateTimer.current = setTimeout(() => {
                socket.emit("update-drawings-batch", elementsArray);
            }, 300); // Debounce time
        }
    }, [socket]);

    // Toggle between editor and drawing mode
    const toggleDrawingMode = useCallback(() => {
        setShowDrawing(prev => !prev);
    }, []);

    // Clear all drawings
    const clearDrawings = useCallback(() => {
        setExcalidrawElements([]);
        latestElementsRef.current = [];
        if (socket) {
            socket.emit("clear-drawings");
        }
    }, [socket]);

    return (
        <div className="editor-container">
            {/* Toggle button for drawing mode */}
            <div className="toolbar-extension">
                <button 
                    className={`toggle-drawing-btn ${showDrawing ? 'active' : ''}`}
                    onClick={toggleDrawingMode}
                >
                    {showDrawing ? 'Back to Editor' : 'Drawing Mode'}
                </button>
                
                {showDrawing && (
                    <button 
                        className="clear-drawings-btn"
                        onClick={clearDrawings}
                    >
                        Clear Drawings
                    </button>
                )}
            </div>
            
            {/* Editor or Drawing area based on mode */}
            {showDrawing ? (
                <div className="drawing-container" style={{ height: '70vh', width: '100%' }}>
                    <Excalidraw
                        initialData={{
                            elements: excalidrawElements,
                            appState: appState
                        }}
                        onChange={handleExcalidrawChange}
                        // excalidrawAPI={(api)=> api.updateScene({ elements: excalidrawElements })}
                    />
                </div>
            ) : (
                <div className="text-editor-container" ref={wrapperRef}>
                    {/* Quill editor will be mounted here */}
                </div>
            )}
            
            {/* Optional: Show active users */}
            <div className="active-users-container">
                {/* You can add a UI component here to show active users */}
            </div>
        </div>
    );
};