import { useState, useEffect, useCallback, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { Socket } from "socket.io-client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import {
  Download,
  Save,
  Check,
  RefreshCcw,
  Languages,
  Bot,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TextEditingModal from "./TextSuggestion";

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

// Selection toolbar component
interface SelectionToolbarProps {
  position: { top: number; left: number } | null;
  onAction: (action: string) => void;
  visible: boolean;
  isProcessing: boolean;
}

const SelectionToolbar = ({
  position,
  onAction,
  visible,
  isProcessing,
}: SelectionToolbarProps) => {
  if (!visible || !position) return null;

  return (
    <div
      className="absolute z-50 bg-white rounded shadow-lg border border-gray-200 flex p-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateY(-100%)",
      }}
    >
      <Button
        onClick={() => onAction("fixGrammar")}
        variant="outline"
        size="sm"
        className="mx-1"
        disabled={isProcessing}
      >
        <Check className="h-4 w-4 mr-1" />
        Fix Grammar
      </Button>
      <Button
        onClick={() => onAction("rewrite")}
        variant="outline"
        size="sm"
        className="mx-1"
        disabled={isProcessing}
      >
        <RefreshCcw className="h-4 w-4 mr-1" />
        Rewrite
      </Button>
      <Button
        onClick={() => onAction("translate")}
        variant="outline"
        size="sm"
        className="mx-1"
        disabled={isProcessing}
      >
        <Languages className="h-4 w-4 mr-1" />
        Translate
      </Button>
    </div>
  );
};

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
  onTextSelection?: (range: any, oldRange: any, source: string) => void;
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
  onTextSelection,
}: QuillEditorProps) => {
  const [quill, setQuill] = useState<Quill>();
  const [cursors, setCursors] = useState<QuillCursors | null>(null);
  const [isLocalChange, setIsLocalChange] = useState(false);
  const [isTextEditingModalOpen, setIsTextEditingModalOpen] = useState(false);

  // AI Copilot state
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Document summary state
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [documentSummary, setDocumentSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  const isAITriggeredChange = useRef(false);

  // Selection toolbar state
  const [toolbarPosition, setToolbarPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [showToolbar, setShowToolbar] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorUpdateDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const cursorPosition = useRef<number | null>(null);

  // API URL
  const API_URL = "http://localhost:5000";

  // Simulates typing animation effect
  const simulateTypingEffect = useCallback(
    (text: string, range: any) => {
      if (!quill || !range) return;

      // Set AI flag before making changes
      isAITriggeredChange.current = true;

      quill.deleteText(range.index, range.length);

      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < text.length) {
          quill.insertText(range.index + currentIndex, text[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsProcessing(false);
          // Reset AI flag after processing
          isAITriggeredChange.current = false;
        }
      }, 30);
    },
    [quill]
  );

  // Handle selection toolbar actions
  const handleToolbarAction = useCallback(
    async (action: string) => {
      if (!quill) return;

      const range = quill.getSelection();
      if (!range) return;

      const text = quill.getText(range.index, range.length);
      if (!text.trim()) return;

      setIsProcessing(true);

      try {
        let endpoint = "";
        let requestBody = { text };
        let responseKey = "";

        switch (action) {
          case "fixGrammar":
            endpoint = "/fix_grammar";
            responseKey = "fixed_text";
            break;
          case "rewrite":
            endpoint = "/rewrite";
            responseKey = "rewritten_text";
            break;
          case "translate":
            endpoint = "/translate";
            responseKey = "translated_text";
            break;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const processedText = data.corrections[0].corrected;
        // Apply the processed text with typing animation
        simulateTypingEffect(processedText, range);
      } catch (error) {
        console.error(`Error processing text with ${action}:`, error);
        setIsProcessing(false);
      }

      // Don't hide toolbar until processing is complete
      if (!isProcessing) {
        setShowToolbar(false);
      }
    },
    [quill, simulateTypingEffect, isProcessing]
  );

  // AI Copilot function
  const handleAiCopilot = useCallback(async () => {
    if (!quill || !aiPrompt.trim()) return;

    setIsAiProcessing(true);
    setAiSidebarOpen(false);

    try {
      // Get cursor position or selection
      const range = quill.getSelection() || {
        index: quill.getLength() - 1,
        length: 0,
      };
      cursorPosition.current = range.index + range.length;

      // Call generate endpoint
      const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.generated_text;

      // Before inserting text, let others know we're going to insert AI content
      if (socket) {
        socket.emit("ai-copilot-start", {
          position: cursorPosition.current,
          userName,
        });
      }

      // Apply the generated text with a typing effect
      isAITriggeredChange.current = true;

      // Insert a newline first if we're not at the beginning
      if (cursorPosition.current > 0) {
        quill.insertText(cursorPosition.current, "\n\n");
        cursorPosition.current += 2;
      }

      // Insert AI-generated text with typing animation
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < generatedText.length) {
          quill.insertText(
            (cursorPosition as any).current + currentIndex,
            generatedText[currentIndex]
          );
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsAiProcessing(false);
          isAITriggeredChange.current = false;
          setAiPrompt("");

          // Notify others that AI insertion is complete
          if (socket) {
            socket.emit("ai-copilot-end");
          }
        }
      }, 20);
    } catch (error) {
      console.error("Error with AI Copilot:", error);
      setIsAiProcessing(false);
    }
  }, [quill, aiPrompt, socket, userName]);

  // Summarize document function
  const summarizeDocument = useCallback(async () => {
    if (!quill) return;

    setIsSummarizing(true);

    try {
      // Get entire document text
      const documentText = quill.getText();

      // Call summarize endpoint
      const response = await fetch(`${API_URL}/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: documentText }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setDocumentSummary(data.summary);
      setSummaryDialogOpen(true);
    } catch (error) {
      console.error("Error summarizing document:", error);
    } finally {
      setIsSummarizing(false);
    }
  }, [quill]);

  // Add summary to document function
  const addSummaryToDocument = useCallback(() => {
    if (!quill || !documentSummary) return;

    // Insert summary at the end of the document with special formatting
    const length = quill.getLength();

    isAITriggeredChange.current = true;

    // Add a separator and the summary
    quill.insertText(length, "\n\n--------- DOCUMENT SUMMARY ---------\n\n", {
      bold: true,
      color: "#4A55AF",
    });

    quill.insertText(length + 40, documentSummary, {
      background: "#F0F4FF",
      color: "#2D3748",
      italic: true,
    });

    isAITriggeredChange.current = false;
    setSummaryDialogOpen(false);
  }, [quill, documentSummary]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+I or Cmd+I for AI Copilot
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        // setAiDialogOpen(true);
        setAiSidebarOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
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

    // Add click listener to hide toolbar when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showToolbar &&
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node) &&
        containerRef.current &&
        containerRef.current.contains(e.target as Node)
      ) {
        // Only hide if click is inside the container but outside the toolbar
        // This allows toolbar buttons to work
        const editorElement = document.querySelector(".ql-editor");
        if (editorElement && editorElement.contains(e.target as Node)) {
          setShowToolbar(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showToolbar]);

  const wrapperRef = useCallback(
    (wrapper: HTMLDivElement) => {
      if (!wrapper) return;
      wrapper.innerHTML = "";
      (containerRef as any).current = wrapper;

      const editor = document.createElement("div");
      wrapper.append(editor);
      editor.spellcheck = true;
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
              userOnly: true,
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

        // Add selection change handler
        qul.on("selection-change", (range, oldRange, source) => {
          // Store current cursor position for AI copilot
          if (range) {
            cursorPosition.current = range.index;
          }

          // Handle selection for toolbar popup
          if (range && range.length > 0) {
            // Get selected text
            const text = qul.getText(range.index, range.length);
            setSelectedText(text);
            setSelectedRange(range);

            // Get selection boundaries to position toolbar
            setTimeout(() => {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const selectionRange = selection.getRangeAt(0);
                const bounds = selectionRange.getBoundingClientRect();

                if (containerRef.current) {
                  const containerRect =
                    containerRef.current.getBoundingClientRect();

                  // Position toolbar above the selection
                  setToolbarPosition({
                    top: bounds.top - containerRect.top,
                    left: bounds.left + bounds.width / 2 - containerRect.left,
                  });
                  setShowToolbar(true);
                }
              }
            }, 0);
          } else {
            // Don't hide immediately to allow clicking toolbar buttons
            // instead, we'll handle this with the click outside handler
          }

          // Call the external selection handler if provided
          if (onTextSelection) {
            onTextSelection(range, oldRange, source);
          }
        });
      });
    },
    [socket, onTextSelection]
  );

  // Sending changes to server
  useEffect(() => {
    if (!socket || !quill) return;

    // @ts-ignore
    const handler = (delta, oldDelta, source) => {
      // Allow emission if user action or AI-triggered
      if (source !== "user" && !isAITriggeredChange.current) return;

      setIsLocalChange(true);
      socket.emit("send-changes", delta);

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

    // Handle remote AI copilot operations
    socket.on("ai-copilot-started", (data: any) => {
      // Could add visual indicator that someone else is using AI
      console.log(`${data.userName} is using AI Copilot...`);
    });

    socket.on("ai-copilot-ended", () => {
      // Could remove visual indicator
      console.log("AI Copilot operation completed");
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
      socket.off("ai-copilot-started");
      socket.off("ai-copilot-ended");
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
  // In the useEffect for loading document content, modify the socket.once handler:
  // useEffect(() => {
  //   if (!socket || !quill) return;

  //   socket.once("load-document", (document) => {
  //     // Temporarily disable change tracking while loading
  //     setIsLocalChange(true);

  //     // Check if this is a new document with a template
  //     const templateContent = localStorage.getItem(`document-template-${documentId}`);

  //     if (templateContent) {
  //       // If template exists, set the content from the template
  //       quill.setContents([]);
  //       quill.insertText(0, templateContent);

  //       // Remove the template from localStorage to prevent reloading
  //       localStorage.removeItem(`document-template-${documentId}`);
  //     } else if (document) {
  //       // If no template but document exists, load the existing document
  //       quill.setContents(document);
  //     }

  //     quill.enable();

  //     // Restore change tracking after a short delay
  //     setTimeout(() => {
  //       setIsLocalChange(false);
  //     }, 50);
  //   });

  //   socket.emit("get-document", {
  //     documentId,
  //     documentName: documentTitle,
  //     token:
  //       document.cookie
  //         .split("; ")
  //         .find((row) => row.startsWith("token="))
  //         ?.split("=")[1] || "",
  //   });
  // }, [socket, quill, documentId, documentTitle, userName]);

  useEffect(() => {
    if (!socket || !quill) return;

    // Use 'on' instead of 'once' to keep the listener active
    const handleLoadDocument = (document: any) => {
      // Temporarily disable change tracking while loading
      setIsLocalChange(true);

      // Check if this is a new document with a template
      const templateContent = localStorage.getItem(
        `document-template-${documentId}`
      );

      if (templateContent) {
        // If template exists, set the content from the template
        quill.setContents([]);
        quill.insertText(0, templateContent);

        // Remove the template from localStorage to prevent reloading
        localStorage.removeItem(`document-template-${documentId}`);
      } else if (document) {
        // If no template but document exists, load the existing document
        quill.setContents(document);
      }

      quill.enable();

      // Restore change tracking after a short delay
      setTimeout(() => {
        setIsLocalChange(false);
      }, 50);
    };

    // Add the event listener
    socket.on("load-document", handleLoadDocument);

    // Emit get-document request
    socket.emit("get-document", {
      documentId,
      documentName: documentTitle,
      token:
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("token="))
          ?.split("=")[1] || "",
    });

    // Cleanup function to remove the event listener
    return () => {
      socket.off("load-document", handleLoadDocument);
    };
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
    <div className="flex flex-col h-full relative" ref={containerRef}>
      {/* Sidebar AI Copilot */}
      <div
        className={`fixed right-0 top-0 w-96 h-full bg-blue-50 p-6 shadow-lg transform ${
          aiSidebarOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300 ease-in-out z-50`}
      >
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-semibold text-blue-800 mb-4">
            AI Copilot
          </h2>
          <Textarea
            id="ai-prompt"
            placeholder="What would you like the AI to write about?"
            value={aiPrompt}
            onChange={(e: any) => setAiPrompt(e.target.value)}
            rows={6}
            className="w-full bg-white border-blue-100 focus:ring-blue-200 mb-4"
            disabled={isAiProcessing}
          />
          <div className="flex space-x-2">
            <Button
              onClick={handleAiCopilot}
              disabled={isAiProcessing || !aiPrompt.trim()}
              className="bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              Generate
            </Button>
            <Button
              onClick={() => setAiSidebarOpen(false)}
              variant="outline"
              className="bg-gray-50 text-gray-600 hover:bg-gray-100"
            >
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Selection Toolbar */}
      <div ref={toolbarRef}>
        <SelectionToolbar
          position={toolbarPosition}
          onAction={handleToolbarAction}
          visible={showToolbar}
          isProcessing={isProcessing}
        />
      </div>

      {/* Main Editor Container */}
      <Button
        onClick={() => setIsTextEditingModalOpen(true)}
        variant="outline"
        size="sm"
      >
        Text Analysis
      </Button>
      <div className="flex flex-col h-full">
        <TextEditingModal
          isOpen={isTextEditingModalOpen}
          onClose={() => setIsTextEditingModalOpen(false)}
          quill={quill}
        />
        <div className="flex-1 overflow-hidden">
          <div
            className="text-editor-container h-[70vh] custom-scrollbar"
            ref={wrapperRef}
          ></div>
        </div>

        {/* Toolbar with AI and Document Actions - Now at the bottom */}
        <div className="z-10 flex justify-between space-x-2 bg-mint-50 p-2 border-t">
          <div>
            <Button
              onClick={() => setAiSidebarOpen(true)}
              variant="outline"
              size="sm"
              className="mr-2 bg-blue-50 text-blue-800 hover:bg-blue-100"
              disabled={isAiProcessing}
            >
              <Bot className="h-4 w-4 mr-1" />
              AI Copilot {isAiProcessing ? "Working..." : ""}
            </Button>

            <Button
              onClick={summarizeDocument}
              variant="outline"
              size="sm"
              disabled={isSummarizing}
              className="bg-green-50 text-green-800 hover:bg-green-100"
            >
              <FileText className="h-4 w-4 mr-1" />
              {isSummarizing ? "Summarizing..." : "Summarize Document"}
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={exportDocument}
              variant="outline"
              size="sm"
              className="bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              onClick={saveDocument}
              variant="outline"
              size="sm"
              className="bg-purple-50 text-purple-800 hover:bg-purple-100"
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Document Summary Dialog */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="sm:max-w-md bg-green-50">
          <DialogHeader>
            <DialogTitle className="text-green-800">
              Document Summary
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto p-4 bg-green-100 rounded-md text-green-900">
            {documentSummary}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSummaryDialogOpen(false)}
              className="bg-gray-50 text-gray-600 hover:bg-gray-100"
            >
              Close
            </Button>
            <Button
              onClick={addSummaryToDocument}
              className="bg-green-100 text-green-800 hover:bg-green-200"
            >
              Add to Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Scrollbar CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          background-color: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #888;
          border-radius: 10px;
          border: 2px solid #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #555;
        }
      `}</style>
    </div>
  );
};

export default QuillEditor;
