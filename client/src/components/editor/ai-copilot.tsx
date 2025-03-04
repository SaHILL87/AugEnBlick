import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, X, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  isProcessed: boolean;
}

interface AICopilotSidebarProps {
  aiSidebarOpen: boolean;
  setAiSidebarOpen: (open: boolean) => void;
}

export function AICopilotSidebar({
  aiSidebarOpen,
  setAiSidebarOpen,
}: AICopilotSidebarProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const handleAiCopilot = () => {
    if (!aiPrompt.trim()) return;
    
    // Add the prompt to chat history
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: aiPrompt,
      timestamp: new Date(),
      isProcessed: false
    };
    
    setChatHistory([...chatHistory, newMessage]);
    setIsAiProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      // Update the message to show it's been processed
      setChatHistory(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, isProcessed: true } : msg
        )
      );
      setAiPrompt("");
      setIsAiProcessing(false);
    }, 1500);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={cn(
        "fixed right-0 top-0 w-80 sm:w-96 h-full bg-card border-l shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col",
        aiSidebarOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">AI Copilot</h2>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setAiSidebarOpen(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Chat History */}
      <ScrollArea className="flex-1 p-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 text-blue-200" />
            <p className="text-lg font-medium mb-2">Your AI Assistant</p>
            <p className="text-sm">Ask me to write or generate content for you.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatHistory.map((message) => (
              <div key={message.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(message.timestamp)}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setChatHistory(chatHistory.filter(msg => msg.id !== message.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg text-sm",
                  message.isProcessed 
                    ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" 
                    : "bg-muted"
                )}>
                  {message.content}
                  {!message.isProcessed && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="animate-pulse">Processing...</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <Separator />
      
      {/* Input Area */}
      <div className="p-4 bg-muted/30">
        <Textarea
          id="ai-prompt"
          placeholder="What would you like the AI to write about?"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={3}
          className="w-full resize-none mb-3 bg-background"
          disabled={isAiProcessing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAiCopilot();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Press Enter to send
          </div>
          <Button
            onClick={handleAiCopilot}
            disabled={isAiProcessing || !aiPrompt.trim()}
            size="sm"
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}