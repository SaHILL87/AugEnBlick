import { Dialogbox } from "@/components/editor/DialogBox";
import { Docs } from "@/components/editor/Docs";
import { Topbar } from "@/components/editor/TopBar";
import { getCookie } from "@/lib/utils";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Plus } from "lucide-react";

interface Document { 
    _id: string; 
    documentName: string; 
    data: { ops: any[] }; 
    __v: number;
    updatedAt: string;
  }

const Homepage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SERVER_URL);

    socket.emit("get-all-documents", {
      token: getCookie("token")
    });

    socket.on("all-documents", (allDocuments) => {
      setDocuments(allDocuments);
    });
   
    return () => {
      socket.disconnect();
    }
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <Topbar />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Your Document Workspace
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Create, collaborate, and manage your documents with ease
          </p>
        </div>

        <div className="bg-gray-50 p-8 rounded-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Your Documents
            </h2>
            <div className="text-black px-4 py-2 rounded-md">
              <Dialogbox />
            </div>
          </div>

          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {documents.map((doc) => (
                <Docs 
                  key={doc._id} 
                  document={doc}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No documents yet. Create your first document!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Homepage;