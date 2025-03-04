import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Check, Info } from "lucide-react";

// Type for suggestion with more detailed scoring
interface Suggestion {
  id: number;
  category: string;
  message: string;
  severity: "low" | "medium" | "high";
  originalText: string;
  suggestedText?: string;
  scores?: {
    readability?: number;
    grammar?: number;
    style?: number;
    clarity?: number;
  };
}
type Severity = "low" | "medium" | "high";
interface TextEditingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quill: any; // or define the type of quill if you know it
}

// Detailed severity and scoring components
const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const severityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${severityColors[severity]}`}
    >
      {severity.toUpperCase()}
    </span>
  );
};

const ScoreDisplay = ({ scores }: { scores?: { [key: string]: number } }) => {
  if (!scores) return null;

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800";
    if (score >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="grid grid-cols-2 gap-1 mt-1">
      {Object.entries(scores).map(([key, value]) => (
        <div
          key={key}
          className={`p-1 rounded text-center ${getScoreColor(value)}`}
        >
          <div className="text-xs font-semibold">
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </div>
          <div className="text-sm font-bold">{value.toFixed(1)}/10</div>
        </div>
      ))}
    </div>
  );
};

const TextEditingModal: React.FC<TextEditingModalProps> = ({
  isOpen,
  onClose,
  quill,
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overallAnalysis, setOverallAnalysis] = useState<{
    totalScore?: number;
    readabilityScore?: number;
    grammarScore?: number;
    styleScore?: number;
  }>({});

  // Function to fetch text editing suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!quill) return;

    // Get current document text
    const text = quill.getText();
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5001/analyze_text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();

      // Transform backend response to our Suggestion type
      const transformedSuggestions: Suggestion[] = data.suggestions.map(
        (suggestion: any, index: number) => ({
          id: index,
          category: suggestion.category,
          message: suggestion.message,
          severity: suggestion.severity || "low",
          originalText: suggestion.original_text,
          suggestedText: suggestion.suggested_text,
          scores: suggestion.scores || {
            readability: Math.random() * 10,
            grammar: Math.random() * 10,
            style: Math.random() * 10,
            clarity: Math.random() * 10,
          },
        })
      );

      // Calculate overall analysis
      const overallScores = {
        totalScore:
          transformedSuggestions.reduce(
            (sum, suggestion) =>
              sum +
              (suggestion.scores?.readability || 0) +
              (suggestion.scores?.grammar || 0) +
              (suggestion.scores?.style || 0) +
              (suggestion.scores?.clarity || 0),
            0
          ) /
          (transformedSuggestions.length * 4),
        readabilityScore:
          transformedSuggestions.reduce(
            (sum, s) => sum + (s.scores?.readability || 0),
            0
          ) / transformedSuggestions.length,
        grammarScore:
          transformedSuggestions.reduce(
            (sum, s) => sum + (s.scores?.grammar || 0),
            0
          ) / transformedSuggestions.length,
        styleScore:
          transformedSuggestions.reduce(
            (sum, s) => sum + (s.scores?.style || 0),
            0
          ) / transformedSuggestions.length,
      };

      setSuggestions(transformedSuggestions);
      setOverallAnalysis(overallScores);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [quill]);

  // Apply a specific suggestion
  const applySuggestion = (suggestion: Suggestion) => {
    if (!quill) return;

    // Find the original text in the document
    const fullText = quill.getText();
    const index = fullText.indexOf(suggestion.originalText);

    if (index !== -1) {
      // Replace the text
      quill.deleteText(index, suggestion.originalText.length);
      quill.insertText(
        index,
        suggestion.suggestedText || suggestion.originalText
      );
    }

    // Remove the applied suggestion
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  };

  // Dismiss a suggestion
  const dismissSuggestion = (suggestionId: number) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  // Trigger suggestions when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen, fetchSuggestions]);

  // Overall score color
  const getOverallScoreColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-800";
    if (score >= 8) return "bg-green-100 text-green-800";
    if (score >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div
      className={`fixed top-0 left-0 w-1/2 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Text Editing Analysis
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-2">
              <p>Analyzing your document...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-2">
              <p>No suggestions found. Your document looks great!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Overall Scores */}
              {overallAnalysis.totalScore !== undefined && (
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium">Overall Score:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getOverallScoreColor(
                      overallAnalysis.totalScore
                    )}`}
                  >
                    {(overallAnalysis.totalScore * 10).toFixed(1)}/10
                  </span>
                </div>
              )}

              {/* Detailed Suggestions */}
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-sm flex items-center">
                        {suggestion.category}
                        <SeverityBadge severity={suggestion.severity} />
                      </h3>
                      <p className="text-gray-600 text-xs mt-1">
                        {suggestion.message}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        onClick={() => applySuggestion(suggestion)}
                        variant="outline"
                        size="sm"
                        className="bg-green-50 text-green-800 hover:bg-green-100"
                      >
                        <Check className="h-3 w-3 mr-1" /> Apply
                      </Button>
                      <Button
                        onClick={() => dismissSuggestion(suggestion.id)}
                        variant="outline"
                        size="sm"
                        className="bg-red-50 text-red-800 hover:bg-red-100"
                      >
                        <X className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>

                  {/* Original and Suggested Text */}
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <div className="bg-white p-1 rounded border">
                      <strong className="text-xs">Original:</strong>
                      <p className="text-gray-700 text-xs italic">
                        {suggestion.originalText}
                      </p>
                    </div>
                    <div className="bg-white p-1 rounded border">
                      <strong className="text-xs">Suggested:</strong>
                      <p className="text-gray-700 text-xs italic">
                        {suggestion.suggestedText}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Scores */}
                  <ScoreDisplay scores={suggestion.scores} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextEditingModal;
