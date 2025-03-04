import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import axios from 'axios';
import { Delta } from 'quill/core';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { getCookie } from '@/lib/utils';

interface DocumentVersion {
  _id: string;
  name: string;
  data: { ops: any[] };
  createdAt: string;
}

const DocumentVersionViewer = () => {
  const { documentId, versionId } = useParams();
  const navigate = useNavigate();
  const quillRef = useRef<Quill | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [versionData, setVersionData] = useState<DocumentVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/versions/documents/${documentId}/versions/${versionId}`,
          {
            headers: { Authorization: `Bearer ${getCookie("token")}` }
          }
        );

        setVersionData({
          ...response.data,
          createdAt: new Date(response.data.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      } catch (err) {
        setError('Failed to load document version');
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
  }, [documentId, versionId]);

  useEffect(() => {
    if (!versionData || !editorRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      readOnly: true,
      modules: { toolbar: false }
    });

    try {
      const delta = new Delta(versionData.data.ops);
      quill.setContents(delta);
      quill.enable(false); // Ensure editor is read-only
      quillRef.current = quill;
    } catch (error) {
      console.error('Error setting quill content:', error);
      setError('Invalid document format');
    }

    return () => {
      if (quillRef.current) {
        quillRef.current.disable();
        quillRef.current = null;
      }
    };
  }, [versionData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={60} />
        <span className="ml-4 text-gray-600">Loading version...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-red-500 text-lg">{error}</div>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back to Document
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {versionData?.name}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Version saved on: {versionData?.createdAt}
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden bg-gray-50">
          <div
            ref={editorRef}
            className="ql-container ql-snow"
            style={{
              height: '70vh',
              border: 'none',
              fontSize: '16px',
              lineHeight: '1.6'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionViewer;