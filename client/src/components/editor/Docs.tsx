import { useNavigate } from "react-router-dom"

export const Docs = ({ documentId, docName }: { documentId: string, docName: string }) => {
    const navigate = useNavigate() ;


    const openDoc = (id: string) => {
        navigate(`/documents/${id}`) ;
    }
    return(
        <div className="docs" onClick={() => {openDoc(documentId); }}>
            <div> {docName} </div>
        </div>
    )
}
