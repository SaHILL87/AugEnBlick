import { useState, useEffect, useCallback, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { Socket } from "socket.io-client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Download, Save } from "lucide-react";

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

interface QuillEditorProps {
  socket: Socket | undefined;
  documentId: string | undefined;
  userName: string;
  documentTitle: string;
  isSaving: boolean;
  saveDocument: () => void;
  activeUsers: User[];
  exportFormat: string;
}

export const QuillEditor = ({
  socket,
  documentId,
  userName,
  documentTitle,
  isSaving,
  saveDocument,
  activeUsers,
  exportFormat,
}: QuillEditorProps) => {
  const [quill, setQuill] = useState<Quill>();
  const [cursors, setCursors] = useState<QuillCursors | null>(null);
  const [isLocalChange, setIsLocalChange] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const cursorUpdateDebounceTimer = useRef<NodeJS.Timeout | null>(null);

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
            history: {
              userOnly: true
            }
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
      
      setIsLocalChange(true);
      socket.emit("send-changes", delta);
      
      // Reset the flag after a short delay
      setTimeout(() => {
        setIsLocalChange(false);
      }, 30);
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
      // Only apply remote changes when we're not in the middle of a local change
      if (!isLocalChange) {
        quill.updateContents(delta);
      }
    };

    socket.on("receive-changes", handler);

    // Handle font changes from other users
    socket.on("receive-font-change", (data: any) => {
      if (!isLocalChange && data.range) {
        quill.formatText(
          data.range.index,
          data.range.length,
          "font",
          data.font
        );
      }
    });

    // Handle document state request (for saving)
    socket.on("request-document-state", () => {
      if (quill) {
        socket.emit("document-state", quill.getContents());
      }
    });

    // Handle save confirmation
    socket.on("save-confirmed", () => {
      // Could add visual feedback here
    });

    return () => {
      socket.off("receive-changes", handler);
      socket.off("receive-font-change");
      socket.off("request-document-state");
      socket.off("save-confirmed");
    };
  }, [socket, quill, isLocalChange]);

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

  // Load document content
  useEffect(() => {
    if (!socket || !quill) return;

    socket.once("load-document", (document) => {
      // Temporarily disable change tracking while loading
      setIsLocalChange(true);
      quill.setContents(document);
      quill.enable();
      
      // Restore change tracking after a short delay
      setTimeout(() => {
        setIsLocalChange(false);
      }, 50);
    });

    socket.emit("get-document", {
      documentId,
      documentName: documentTitle,
      token: document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || '',
    });
  }, [socket, quill, documentId, documentTitle, userName]);

  // Export document function
  const exportDocument = useCallback(async () => {
    if (!quill) return;
    console.log("Exporting document...");
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="text-editor-container h-[70vh]" ref={wrapperRef}></div>
      </div>
      <div className="z-10 flex justify-end space-x-2 bg-gray-50 p-2 border-t">
        <Button onClick={exportDocument} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        <Button onClick={saveDocument} variant="outline" size="sm">
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};