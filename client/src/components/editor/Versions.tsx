import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getCookie } from '@/lib/utils';

export const VersionModal = ({ documentId, quill, onSave }: {
  documentId: string;
  quill: any;
  onSave: () => void;
}) => {
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveVersion = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getCookie('token')}`
        },
        body: JSON.stringify({
          documentId,
          name,
          data: quill.current.getContents(),
          drawings: [] // Add drawing data if available
        })
      });

      if (!response.ok) throw new Error('Failed to save version');
      
      onSave();
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving version:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Save Version
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save New Version</DialogTitle>
        </DialogHeader>
        <Input 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Version name"
          className="mb-4"
        />
        <Button 
          onClick={handleSaveVersion}
          disabled={isSaving || !name}
        >
          {isSaving ? 'Saving...' : 'Save Version'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};



export const VersionsListModal = ({documentId}:{documentId:string}) => {
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchVersions = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/versions/${documentId}`, {
            headers: {
              'Authorization': `Bearer ${getCookie('token')}`
            }
          });
          const data = await response.json();
          setVersions(data);
        } catch (error) {
          console.error('Error fetching versions:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchVersions();
    }
  }, [isOpen, documentId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Versions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Versions</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-2">
            {versions.map((version: any) => (
              <div
                key={version._id}
                className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                onClick={() => {
                  navigate(`/documents/${documentId}/version/${version._id}`);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium">{version.name}</div>
                <div className="text-sm text-gray-500">
                  {new Date(version.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};