import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import the separated components
import { QuillEditor } from "./QuillEditor";
import { DrawingBoard } from "./DrawingBoard";
import axios from "axios";
import { getCookie } from "@/lib/utils";
import { ActiveUsersDrawer } from "./editor/active-users";
import { RequestAccess } from "./editor/request-access";

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
interface DocumentAccessResponse {
  isAccessible: boolean;
  isCollaborator: boolean;
  isOwner: boolean;
}

// Save interval in milliseconds
const SAVE_INTERVAL_MS = 10000;

export const TextEditor = () => {
  const [socket, setSocket] = useState<Socket>();
  const [userName, setUserName] = useState<string>("");
  const [documentTitle, setDocumentTitle] =
    useState<string>("Untitled Document");
  const [showDrawing, setShowDrawing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [showActiveUsers, setShowActiveUsers] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<string>("pdf");

  const { id: documentId } = useParams();

  const [accessStatus, setAccessStatus] = useState<DocumentAccessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDocumentAccess = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await axios.post<DocumentAccessResponse>(`${import.meta.env.VITE_SERVER_URL}/api/user/isContributor`,{
          documentId,
          token:getCookie("token")
        });

        setAccessStatus(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to check document access', error);
        setAccessStatus(null);
        setIsLoading(false);
      }
    };

    checkDocumentAccess();
  }, [documentId]);

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

  // Initialize socket connection
  useEffect(() => {
    const skt = io(import.meta.env.VITE_SERVER_URL);
    setSocket(skt);

    // Set up handler for active users
    skt.on("users-changed", (users: User[]) => {
      setActiveUsers(users);
    });

    return () => {
      skt.disconnect();
    };
  }, []);

  // Save document at regular intervals
  useEffect(() => {
    if (!socket) return;

    const interval = setInterval(() => {
      saveDocument();
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket]);

  // Save document function
  const saveDocument = useCallback(() => {
    if (!socket) return;

    setIsSaving(true);
    socket.emit("save-document");

    // Save document title to localStorage
    if (documentId && documentTitle) {
      localStorage.setItem(`document-name-for-${documentId}`, documentTitle);
    }

    // Show saving indicator briefly
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);

    socket.on("access-denied",()=>{
      alert("You are not authorized to edit this document");
    })

  }, [socket, documentId, documentTitle]);

  // Toggle between editor and drawing mode
  const toggleDrawingMode = useCallback(() => {
    setShowDrawing((prev) => !prev);
  }, []);

  // Toggle active users panel
  const toggleActiveUsers = useCallback(() => {
    setShowActiveUsers((prev) => !prev);
  }, []);

  // Update document title
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDocumentTitle(e.target.value);
    },
    []
  );

  if(isLoading || !accessStatus?.isAccessible){
    return (
      <div>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="h-screen flex items-center justify-center">
            <RequestAccess documentId={documentId!} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header with pastel-colored controls */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={documentTitle}
                onChange={handleTitleChange}
                onBlur={saveDocument}
                className="text-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-2 py-1 bg-blue-50 text-blue-800"
                aria-label="Document title"
              />
              <div className="flex items-center text-sm text-gray-500">
                {isSaving ? "Saving..." : "Saved"}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Label 
                  htmlFor="mode-toggle" 
                  className="text-sm font-medium text-purple-800"
                >
                  {showDrawing ? "Drawing Mode" : "Text Mode"}
                </Label>
                <Switch
                  id="mode-toggle"
                  checked={showDrawing}
                  onCheckedChange={toggleDrawingMode}
                  className="bg-purple-100"
                />
              </div>

              <div className="flex border-l border-gray-200 pl-3 space-x-2">
                <div className="flex items-center space-x-2">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="text-sm border rounded p-1 bg-mint-50 text-green-800"
                  >
                    <option value="pdf">PDF</option>
                    <option value="docx">HTML (Word)</option>
                  </select>
                </div>

                <Button 
                  onClick={toggleActiveUsers} 
                  variant="outline" 
                  size="sm"
                  className="bg-pink-50 text-pink-800 hover:bg-pink-100"
                >
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
          {showActiveUsers && <ActiveUsersDrawer activeUsers={activeUsers} setShowActiveUsers={setShowActiveUsers} showActiveUsers={showActiveUsers} />
          }

          {/* Editor/Drawing Container */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Tabs
              defaultValue={showDrawing ? "drawing" : "text"}
              value={showDrawing ? "drawing" : "text"}
            >
              <TabsList className="bg-blue-50 border-b p-1">
                <TabsTrigger
                  value="text"
                  onClick={() => setShowDrawing(false)}
                  className="px-4 py-2 text-blue-800 data-[state=active]:bg-blue-100"
                >
                  Text Editor
                </TabsTrigger>
                <TabsTrigger
                  value="drawing"
                  onClick={() => setShowDrawing(true)}
                  className="px-4 py-2 text-purple-800 data-[state=active]:bg-purple-100"
                >
                  Drawing Board
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className={showDrawing ? "hidden" : ""}>
                <QuillEditor
                  socket={socket}
                  documentId={documentId}
                  userName={userName}
                  documentTitle={documentTitle}
                  isSaving={isSaving}
                  saveDocument={saveDocument}
                  activeUsers={activeUsers}
                  exportFormat={exportFormat}
                  
                />
              </TabsContent>

              <TabsContent
                value="drawing"
                className={!showDrawing ? "hidden" : ""}
              >
                <DrawingBoard socket={socket} documentId={documentId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;
