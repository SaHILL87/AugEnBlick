import { useState, useEffect, useCallback, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io, Socket } from "socket.io-client";
import { useParams } from "react-router-dom";
import { Excalidraw } from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { AppState } from "@excalidraw/excalidraw/types/types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, FileText, Save, Users } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import custom font styles
import "quill/dist/quill.snow.css";
import { getCookie } from "@/lib/utils";

// QuillCursors interface
interface QuillCursors {
  createCursor: (id: string, name: string, color: string) => void;
  moveCursor: (id: string, range: { index: number; length: number }) => void;
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

// Enhanced toolbar options with font family and size
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],
  ["blockquote", "code-block"],
  ["link", "image", "video"],
  ["clean"],
];

// Save interval in milliseconds
const SAVE_INTERVAL_MS = 2000;

export const TextEditor = () => {
  const [socket, setSocket] = useState<Socket>();
  const [quill, setQuill] = useState<Quill>();
  const [userName, setUserName] = useState<string>("");
  const [documentTitle, setDocumentTitle] =
    useState<string>("Untitled Document");
  const [cursors, setCursors] = useState<QuillCursors | null>(null);
  const [showDrawing, setShowDrawing] = useState<boolean>(false);
  const [excalidrawElements, setExcalidrawElements] = useState<
    ExcalidrawElement[]
  >([]);
  const [appState, setAppState] = useState<AppState>({
    viewBackgroundColor: "#f5f5f5",
    currentItemFontFamily: 1,
  } as AppState);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [showActiveUsers, setShowActiveUsers] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<string>("pdf");

  const { id: documentId } = useParams();
  const cursorUpdateDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const excalidrawRef = useRef<any>(null);
  const drawingUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  // Keep track of the latest elements to avoid stale state in callbacks
  const latestElementsRef = useRef<ExcalidrawElement[]>([]);
  // Keep track of whether an external update is in progress
  const isExternalUpdateRef = useRef<boolean>(false);

  const isProcessingUpdateRef = useRef<boolean>(false);
  const pendingUpdatesRef = useRef<ExcalidrawElement[][]>([]);
  const updateSourceRef = useRef<"server" | "local" | null>(null);

  // Update the ref whenever elements change
  useEffect(() => {
    latestElementsRef.current = excalidrawElements;
  }, [excalidrawElements]);

  // Initialize username on component mount
  useEffect(() => {
    // Generate a random username if none exists in localStorage
    const storedName = localStorage.getItem("user-name");
    const generatedName =
      storedName || `User_${Math.floor(Math.random() * 10000)}`;

    if (!storedName) {
      localStorage.setItem("user-name", generatedName);
    }

    setUserName(generatedName);

    // Retrieve document title if available
    if (documentId) {
      const storedTitle = localStorage.getItem(
        `document-name-for-${documentId}`
      );
      if (storedTitle) {
        setDocumentTitle(storedTitle);
      }
    }
  }, [documentId]);

  useEffect(() => {
    const skt = io(import.meta.env.VITE_SERVER_URL);
    setSocket(skt);
    return () => {
      skt.disconnect();
    };
  }, []);

  // Register custom fonts with Quill
  useEffect(() => {
    // Add fonts to Quill's font whitelist
    const Font = Quill.import("formats/font");
    (Font as any).whitelist = [
      "arial",
      "times-new-roman",
      "courier-new",
      "georgia",
      "trebuchet-ms",
      "verdana",
      "roboto",
      "open-sans",
      "dancing-script", // Cursive font
      "pacifico", // Another cursive option
      "indie-flower", // More casual handwriting
      "sacramento", // Elegant cursive
    ];
    Quill.register(Font as any, true);
  }, []);

  const wrapperRef = useCallback(
    (wrapper: HTMLDivElement) => {
      if (!wrapper) return;
      wrapper.innerHTML = "";

      const editor = document.createElement("div");
      wrapper.append(editor);
      (editorRef as any).current = editor;

      // Import QuillCursors dynamically and initialize
      import("quill-cursors").then((cursorModule) => {
        // Register the module with Quill
        Quill.register("modules/cursors", cursorModule.default as any);

        const qul = new Quill(editor, {
          theme: "snow",
          modules: {
            toolbar: TOOLBAR_OPTIONS,
            cursors: {
              transformOnTextChange: true,
            },
          },
        });

        qul.disable();
        qul.setText("Loading...");
        setQuill(qul);

        // Store cursor module reference
        setCursors(qul.getModule("cursors") as QuillCursors);

        // Add event handler for font changes
        const toolbar = qul.getModule("toolbar");
        (toolbar as any).addHandler("font", (value: string) => {
          qul.format("font", value);

          // Emit font change to other users
          if (socket) {
            socket.emit("font-change", {
              font: value,
              range: qul.getSelection(),
            });
          }
        });
      });
    },
    [socket]
  );

  // Sending changes to server
  useEffect(() => {
    if (!socket || !quill) return;

    // @ts-ignore
    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
    };

    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler);
    };
  }, [socket, quill]);

  // Receiving changes from server
  useEffect(() => {
    if (!socket || !quill) return;

    // @ts-ignore
    const handler = (delta) => {
      quill.updateContents(delta);
    };

    socket.on("receive-changes", handler);

    // Handle font changes from other users
    socket.on("receive-font-change", (data: any) => {
      // Apply the font change if it affects the document
      if (data.range) {
        quill.formatText(
          data.range.index,
          data.range.length,
          "font",
          data.font
        );
      }
    });

    return () => {
      socket.off("receive-changes", handler);
      socket.off("receive-font-change");
    };
  }, [socket, quill]);

  // Handle cursor position updates
  useEffect(() => {
    if (!socket || !quill || !cursors) return;

    // Send cursor position when selection changes
    const selectionChangeHandler = (range: any, oldRange: any, source: any) => {
      if (source === "user" && range) {
        // Debounce cursor updates to avoid overloading the server
        if (cursorUpdateDebounceTimer.current) {
          clearTimeout(cursorUpdateDebounceTimer.current);
        }

        cursorUpdateDebounceTimer.current = setTimeout(() => {
          socket.emit("cursor-move", {
            index: range.index,
            length: range.length,
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
        cursors.moveCursor(userData.userId, userData.cursorPosition);
      } catch (error) {
        console.error("Error updating cursor:", error);
      }
    };

    // Handle users joining or leaving
    const usersChangedHandler = (users: User[]) => {
      if (!cursors) return;

      // Update active users list
      setActiveUsers(users);

      // First clear all cursors
      try {
        cursors.update();
      } catch (e) {
        console.error("Error updating cursors", e);
      }

      // Create new cursors for each active user
      users.forEach((user) => {
        if (user.userId && user.userId !== socket.id) {
          try {
            cursors.createCursor(user.userId, user.userName, user.color);

            if (user.cursorPosition) {
              cursors.moveCursor(user.userId, user.cursorPosition);
            }
          } catch (e) {
            console.error("Error creating cursor", e);
          }
        }
      });
    };

    quill.on("selection-change", selectionChangeHandler);
    socket.on("cursor-update", cursorUpdateHandler);
    socket.on("users-changed", usersChangedHandler);

    return () => {
      quill.off("selection-change", selectionChangeHandler);
      socket.off("cursor-update", cursorUpdateHandler);
      socket.off("users-changed", usersChangedHandler);

      if (cursorUpdateDebounceTimer.current) {
        clearTimeout(cursorUpdateDebounceTimer.current);
      }
    };
  }, [socket, quill, cursors]);

  // Handle Excalidraw drawing events
  useEffect(() => {
    if (!socket) return;

    // Safely apply updates without triggering loops
    const safelyApplyUpdate = (elements: ExcalidrawElement[]) => {
      // If we're already processing an update, queue this one
      if (isProcessingUpdateRef.current) {
        pendingUpdatesRef.current.push(elements);
        return;
      }

      isProcessingUpdateRef.current = true;
      updateSourceRef.current = "server";

      // Update the ref immediately
      latestElementsRef.current = elements;

      // Direct API update if ref is available
      if (excalidrawRef.current) {
        try {
          excalidrawRef.current.updateScene({
            elements: elements,
            appState,
          });
        } catch (err) {
          console.error("Error directly updating Excalidraw:", err);
        }
      }

      // Schedule state update outside current execution context
      Promise.resolve().then(() => {
        setExcalidrawElements(elements);

        // Process any pending updates after a short delay
        setTimeout(() => {
          isProcessingUpdateRef.current = false;
          updateSourceRef.current = null;

          if (pendingUpdatesRef.current.length > 0) {
            const nextUpdate = pendingUpdatesRef.current.shift();
            if (nextUpdate) {
              safelyApplyUpdate(nextUpdate);
            }
          }
        }, 50);
      });
    };

    // Load drawings handler
    const handleLoadDrawings = (drawings: ExcalidrawElement[]) => {
      if (!Array.isArray(drawings)) return;
      safelyApplyUpdate(drawings);
    };

    // Receive updated drawings handler
    const handleDrawingsUpdated = (drawings: ExcalidrawElement[]) => {
      if (!Array.isArray(drawings)) return;
      safelyApplyUpdate(drawings);
    };

    // Single element update handler
    const handleElementUpdated = (element: ExcalidrawElement) => {
      // Skip if we're currently processing a server update
      if (updateSourceRef.current === "server") return;

      const currentElements = [...latestElementsRef.current];
      const index = currentElements.findIndex((el) => el.id === element.id);

      const newElements =
        index >= 0
          ? currentElements.map((el) => (el.id === element.id ? element : el))
          : [...currentElements, element];

      safelyApplyUpdate(newElements);
    };

    // Clear drawings handler
    const handleDrawingsCleared = () => {
      safelyApplyUpdate([]);
    };

    // Register all socket event handlers
    socket.on("load-drawings", handleLoadDrawings);
    socket.on("drawings-updated", handleDrawingsUpdated);
    socket.on("drawing-element-updated", handleElementUpdated);
    socket.on("drawings-cleared", handleDrawingsCleared);

    // Clean up all socket listeners on unmount
    return () => {
      socket.off("load-drawings", handleLoadDrawings);
      socket.off("drawings-updated", handleDrawingsUpdated);
      socket.off("drawing-element-updated", handleElementUpdated);
      socket.off("drawings-cleared", handleDrawingsCleared);
    };
  }, [socket, appState]);

  // Completely separate the handling of Excalidraw changes
  const handleExcalidrawChange = useCallback(
    (elements: readonly ExcalidrawElement[], state: AppState) => {
      // Skip if this update originated from a server event
      if (updateSourceRef.current === "server") return;

      // Mark this as a local update
      updateSourceRef.current = "local";

      // Convert to regular array
      const elementsArray = Array.from(elements) as ExcalidrawElement[];

      // Only update if there's an actual change
      if (
        JSON.stringify(latestElementsRef.current) !==
        JSON.stringify(elementsArray)
      ) {
        // Update local refs and state
        latestElementsRef.current = elementsArray;

        // Use Promise to schedule state updates outside current execution context
        Promise.resolve().then(() => {
          setExcalidrawElements(elementsArray);
          setAppState(state);
        });

        // Debounce sending updates to the server
        if (socket) {
          if (drawingUpdateTimer.current) {
            clearTimeout(drawingUpdateTimer.current);
          }

          drawingUpdateTimer.current = setTimeout(() => {
            socket.emit("update-drawings-batch", elementsArray);

            // Reset update source after sending
            updateSourceRef.current = null;
          }, 300);
        }
      } else {
        // Reset update source if nothing was changed
        updateSourceRef.current = null;
      }
    },
    [socket]
  );

  const onExcalidrawAPIMount = useCallback(
    (api: any) => {
      excalidrawRef.current = api;

      // Initial scene setup if we have elements
      if (latestElementsRef.current.length > 0) {
        try {
          api.updateScene({
            elements: latestElementsRef.current,
            appState,
          });
        } catch (err) {
          console.error("Error setting initial Excalidraw scene:", err);
        }
      }
    },
    [appState]
  );

  // Load document content
  useEffect(() => {
    if (!socket || !quill) return;

    socket.once("load-document", (document) => {
      quill.setContents(document);
      quill.enable();
    });

    const docName =
      localStorage.getItem(`document-name-for-${documentId}`) ||
      "Untitled Document";
    setDocumentTitle(docName);

    socket.emit("get-document", {
      documentId,
      documentName: docName,
      token: getCookie("token")!,
    });
  }, [socket, quill, documentId, userName]);

  // Save document at regular intervals
  useEffect(() => {
    if (!socket || !quill) return;

    const interval = setInterval(() => {
      saveDocument();
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  // Save document function
  const saveDocument = useCallback(() => {
    if (!socket || !quill) return;

    setIsSaving(true);
    socket.emit("save-document", quill.getContents());

    // Also save drawings if we have them - use ref to avoid stale state
    if (latestElementsRef.current.length > 0) {
      socket.emit("update-drawings-batch", latestElementsRef.current);
    }

    // Save document title to localStorage
    if (documentId && documentTitle) {
      localStorage.setItem(`document-name-for-${documentId}`, documentTitle);
    }

    // Show saving indicator briefly
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  }, [socket, quill, documentId, documentTitle]);

  // Toggle between editor and drawing mode
  const toggleDrawingMode = useCallback(() => {
    setShowDrawing((prev) => !prev);
  }, []);

  // Toggle active users panel
  const toggleActiveUsers = useCallback(() => {
    setShowActiveUsers((prev) => !prev);
  }, []);

  // Export document function
  const exportDocument = useCallback(async () => {
    if (!quill) return;

    try {
      if (exportFormat === "pdf") {
        // PDF export using jsPDF and html2canvas
        const editorElement = document.querySelector(".ql-editor");
        if (!editorElement) return;

        const canvas = await html2canvas(editorElement as HTMLElement);
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: "a4",
        });

        // Calculate aspect ratio to fit on page
        const imgData = canvas.toDataURL("image/png");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`${documentTitle || "document"}.pdf`);
      } else if (exportFormat === "docx") {
        // Export as HTML (for Word processing)
        const htmlContent = (
          document.querySelector(".ql-editor") as HTMLElement
        ).innerHTML;
        const blob = new Blob([htmlContent], { type: "text/html" });
        saveAs(blob, `${documentTitle || "document"}.html`);
      }
    } catch (error) {
      console.error("Error exporting document:", error);
    }
  }, [quill, documentTitle, exportFormat]);

  // Update document title
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDocumentTitle(e.target.value);
    },
    []
  );

  const clearDrawings = useCallback(() => {
    // Mark as local update to prevent loops
    updateSourceRef.current = "local";

    // Update refs
    latestElementsRef.current = [];

    // Direct API update
    if (excalidrawRef.current) {
      try {
        excalidrawRef.current.updateScene({
          elements: [],
          appState,
        });
      } catch (err) {
        console.error("Error clearing drawings:", err);
      }
    }

    // Schedule state update
    Promise.resolve().then(() => {
      setExcalidrawElements([]);
    });

    // Notify server
    if (socket) {
      socket.emit("clear-drawings");
    }

    // Reset update source after a short delay
    setTimeout(() => {
      updateSourceRef.current = null;
    }, 50);
  }, [socket, appState]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header with controls */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={documentTitle}
                onChange={handleTitleChange}
                onBlur={saveDocument}
                className="text-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                aria-label="Document title"
              />
              <div className="flex items-center text-sm text-gray-500">
                {isSaving ? "Saving..." : "Saved"}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Label htmlFor="mode-toggle" className="text-sm font-medium">
                  {showDrawing ? "Drawing Mode" : "Text Mode"}
                </Label>
                <Switch
                  id="mode-toggle"
                  checked={showDrawing}
                  onCheckedChange={toggleDrawingMode}
                />
              </div>

              <div className="flex border-l border-gray-200 pl-3 space-x-2">
                <div className="flex items-center space-x-2">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="text-sm border rounded p-1"
                  >
                    <option value="pdf">PDF</option>
                    <option value="docx">HTML (Word)</option>
                  </select>
                  <Button onClick={exportDocument} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>

                <Button onClick={saveDocument} variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>

                <Button onClick={toggleActiveUsers} variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-1" />
                  Users ({activeUsers.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Active Users Panel (Conditional) */}
          {showActiveUsers && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="text-lg font-medium mb-2">Active Users</h3>
              <ul className="space-y-2">
                {activeUsers.map((user, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    ></span>
                    <span>{user.userName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Editor/Drawing Container */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Tabs
              defaultValue={showDrawing ? "drawing" : "text"}
              value={showDrawing ? "drawing" : "text"}
            >
              <TabsList className="bg-gray-100 border-b p-1">
                <TabsTrigger
                  value="text"
                  onClick={() => setShowDrawing(false)}
                  className="px-4 py-2"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Text Editor
                </TabsTrigger>
                <TabsTrigger
                  value="drawing"
                  onClick={() => setShowDrawing(true)}
                  className="px-4 py-2"
                >
                  Drawing Board
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className={showDrawing ? "hidden" : ""}>
                <div
                  className="text-editor-container h-[70vh]"
                  ref={wrapperRef}
                ></div>
              </TabsContent>

              <TabsContent
                value="drawing"
                className={!showDrawing ? "hidden" : ""}
              >
                <div className="drawing-controls bg-gray-50 p-2 border-b">
                  <Button onClick={clearDrawings} variant="outline" size="sm">
                    Clear Drawings
                  </Button>
                </div>
                <div className="drawing-container h-[65vh]">
                  <Excalidraw
                    initialData={{
                      elements: excalidrawElements,
                      appState: appState,
                    }}
                    onChange={handleExcalidrawChange}
                    zenModeEnabled={false}
                    excalidrawAPI={onExcalidrawAPIMount}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;
