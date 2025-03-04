import { useNavigate } from "react-router-dom"
import { FileText, Clock, Users, Edit } from "lucide-react"

export const Docs = ({ document }: { document: any }) => { 
    const navigate = useNavigate();

    const openDoc = (id: string) => {
        navigate(`/documents/${id}`);
    }

    const getColorScheme = (index: number) => {
        const colorSchemes = [
            { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'text-yellow-600' },
            { bg: 'bg-pink-100', text: 'text-pink-800', icon: 'text-pink-600' },
            { bg: 'bg-green-100', text: 'text-green-800', icon: 'text-green-600' },
            { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'text-blue-600' }
        ];
        return colorSchemes[index % colorSchemes.length];
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    const colorScheme = getColorScheme(Math.floor(Math.random() * 4));

    return(
        <div 
            className={`${colorScheme.bg} p-6 rounded-xl shadow-md hover:shadow-lg 
                        transition-all duration-300 cursor-pointer 
                        transform hover:-translate-y-2`}
            onClick={() => openDoc(document._id)}
        >
            <div className="flex items-center mb-4">
                <FileText className={`${colorScheme.icon} w-8 h-8 mr-3`} />
                <h3 className={`text-xl font-semibold ${colorScheme.text} truncate max-w-[200px]`}>
                    {document.documentName || 'Untitled'}
                </h3>
            </div>
            
            <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2 text-gray-500" />
                    <span>Updated: {formatDate(document.updatedAt)}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2 text-gray-500" />
                    <span>
                        {document.collaborators.length} Collaborator{document.collaborators.length !== 1 ? 's' : ''}
                    </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                    <Edit className="w-4 h-4 mr-2 text-gray-500" />
                    <span>
                        Owner: {document.owner.email.split('@')[0]}
                    </span>
                </div>
            </div>
        </div>
    )
}