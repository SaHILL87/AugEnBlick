import { Dialogbox } from "@/components/editor/DialogBox";
import { Docs } from "@/components/editor/Docs";
import { Topbar } from "@/components/editor/TopBar";
import { useState, useEffect } from "react" ;
import { io } from "socket.io-client";

 


interface DocumentType {
    _id: string;
    name: string;
    data: {
        ops: any[];
    };
    __v: number;
}




export const Homepage = () => {
    const [documents, setDocuments] = useState<DocumentType[]>([]) ;


    useEffect(() => {
        const socket = io(import.meta.env.VITE_SERVER_URL) ;


        socket.emit("get-all-documents") ;


        socket.on("all-documents", (allDocuments) => {
            setDocuments(allDocuments) ;
        });
       
        return () => {
            socket.disconnect() ;
        }
    }, []) ;


    return(
        <div className="LandingPage">
            <Topbar />
            <div className="Docs-container-1">
                <div className="title-1"> Start a new document </div>
                <div> <Dialogbox /> </div>
            </div>


            {
                (documents.length > 0) && (
                <div className="Docs-container-2">
                    <div className="title-2"> Recent documents </div>
                    <div className="grid grid-cols-6">
                    {
                        documents?.map((docs, index) =>
                            <Docs documentId={docs._id} docName={docs.name} key={index}/>
                        )
                    }
                    </div>
                </div>)
            }
        </div>
    )
}
