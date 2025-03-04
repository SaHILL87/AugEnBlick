import { useState, useEffect } from "react";
import { User } from "@/types";
import { X, MessageSquare } from "lucide-react";


interface Comment {
  _id: string;
  user: User;
  content: string;
  createdAt: string;
}

interface CommentsDrawerProps {
  comments: Comment[];
  onAddComment: (content: string) => void;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsDrawer = ({
  comments,
  onAddComment,
  userId,
  isOpen,
  onClose,
}: CommentsDrawerProps) => {
  const [newComment, setNewComment] = useState("");
  const [sortedComments, setSortedComments] = useState<Comment[]>([]);

  useEffect(() => {
    setSortedComments(
      [...comments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  }, [comments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && userId) {
      onAddComment(newComment);
      setNewComment("");
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "block" : "hidden"}`}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer Content */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex flex-col h-[calc(100vh-60px)]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sortedComments.map((comment) => (
              <div key={comment._id} className="border-b pb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">
                    {comment.user.email}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full p-2 border rounded mb-2 text-sm"
              placeholder={userId ? "Add a comment..." : "Login to comment"}
              rows={3}
              disabled={!userId}
            />
            {userId ? (
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm w-full"
              >
                Post Comment
              </button>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                Please login to comment
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

interface ToggleCommentsButtonProps {
    onClick: () => void;
    commentCount: number;
  }
  
  export const ToggleCommentsButton = ({
    onClick,
    commentCount,
  }: ToggleCommentsButtonProps) => {
    return (
      <button
        onClick={onClick}
        className="relative p-2 hover:bg-gray-100 rounded-lg"
      >
        <MessageSquare className="h-5 w-5" />
        {commentCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {commentCount}
          </span>
        )}
      </button>
    );
  };
