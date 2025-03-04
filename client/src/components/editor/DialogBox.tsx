import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import { useState } from "react";
import { Bot, FileText, Briefcase, Mail, Sparkles } from "lucide-react";

// Templates for different document types
const TEMPLATES = {
  resume: {
    emoji: "📄",
    template: `
## Professional Resume

### Contact Information
[Your Name]
[Phone Number] | [Email Address] | [City, State]

### Professional Summary
A brief statement highlighting your key professional strengths and career objectives.

### Work Experience
#### [Job Title] | [Company Name] | [Dates of Employment]
- Key responsibility or achievement
- Key responsibility or achievement
- Key responsibility or achievement

#### [Previous Job Title] | [Company Name] | [Dates of Employment]
- Key responsibility or achievement
- Key responsibility or achievement
- Key responsibility or achievement

### Education
#### [Degree] | [University Name] | [Graduation Year]
- Relevant coursework or academic achievements

### Skills
- Skill 1
- Skill 2
- Skill 3
- Skill 4
`,
  },
  businessLetter: {
    emoji: "💼",
    template: `
[Your Name]
[Your Address]
[City, State ZIP Code]

[Date]

[Recipient Name]
[Recipient Title]
[Company Name]
[Company Address]
[City, State ZIP Code]

Dear [Recipient Name],

[First paragraph: State the purpose of your letter]

[Second paragraph: Provide additional details or explanation]

[Final paragraph: Conclude with a call to action or next steps]

Sincerely,

[Your Signature]
[Your Printed Name]
`,
  },
  letter: {
    emoji: "✉️",
    template: `
[Your Name]
[Your Address]
[City, State ZIP Code]

[Date]

Dear [Recipient's Name],

[First paragraph: Introduction and purpose of the letter]

[Second paragraph: Main body of the letter, providing details or explanation]

[Final paragraph: Closing thoughts or call to action]

Sincerely,
[Your Name]
`,
  },
};

export function Dialogbox() {
  const navigate = useNavigate();
  const [docName, setDocName] = useState("");
  const [open, setOpen] = useState(false);
  const [aiTemplateModalOpen, setAiTemplateModalOpen] = useState(false);
  const [aiTemplatePrompt, setAiTemplatePrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<
    keyof typeof TEMPLATES | null
  >(null);
  const [isGeneratingAiTemplate, setIsGeneratingAiTemplate] = useState(false);

  const createDoc = (docId: string, template?: string) => {
    // Store the selected template in localStorage to be used when loading the document
    if (template) {
      localStorage.setItem(`document-template-${docId}`, template);
    }
    navigate(`/documents/${docId}`);
  };

  const handleSubmit = () => {
    if (!docName.trim() || !selectedTemplate) return;

    const id = uuidV4();
    localStorage.setItem(`document-name-for-${id}`, docName);
    createDoc(id, TEMPLATES[selectedTemplate].template);
    setOpen(false);
  };

  const generateAiTemplate = async () => {
    if (!aiTemplatePrompt.trim()) return;

    setIsGeneratingAiTemplate(true);
    try {
      // Replace with actual Mistral API call
      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer 7LmAgUBYsjwwT6fcnpwkqQfOwkjXA9AN`,
          },
          body: JSON.stringify({
            model: "mistral-medium",
            messages: [
              {
                role: "system",
                content: `You are an expert document template generator. Create a professional, well-structured template based on the user's specific requirements. 
              
              Guidelines:
              - Use markdown formatting
              - Include clear sections
              - Provide placeholder text for customization
              - Ensure professional and clear language`,
              },
              {
                role: "user",
                content: `Generate a professional template for: ${aiTemplatePrompt}. 
              Provide a structured markdown template with clear sections and placeholders for personalization.`,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      const data = await response.json();
      console.log(data);
      const generatedTemplate = data.choices[0].message.content;

      // Create a new document with AI-generated template
      const id = uuidV4();
      localStorage.setItem(
        `document-name-for-${id}`,
        `AI-Generated ${aiTemplatePrompt}`
      );
      localStorage.setItem(`document-template-${id}`, generatedTemplate);

      // Close modals and navigate
      setAiTemplateModalOpen(false);
      setOpen(false);
      navigate(`/documents/${id}`);
    } catch (error) {
      console.error("Error generating AI template:", error);
      // Handle error (show toast, etc.)
    } finally {
      setIsGeneratingAiTemplate(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2">
            <Sparkles className="mr-2" /> Create a New Document
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Create a New Document
            </DialogTitle>
            <DialogDescription>
              Choose a template or generate an AI-powered template
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            {/* Document Name Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Document Name
              </Label>
              <Input
                id="name"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="col-span-3"
                placeholder="Enter document name"
              />
            </div>

            {/* Template Selection */}
            <div>
              <Label className="block mb-4 text-lg">Select a Template</Label>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(TEMPLATES).map(([key, { emoji }]) => (
                  <div
                    key={key}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all 
                      ${
                        selectedTemplate === key
                          ? "border-blue-500 bg-blue-50 shadow-lg"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                      }
                    `}
                    onClick={() =>
                      setSelectedTemplate(key as keyof typeof TEMPLATES)
                    }
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-5xl mb-2">{emoji}</span>
                      <span className="font-semibold capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </div>
                  </div>
                ))}

                {/* AI Template Generation Card */}
                <div
                  className="border border-dashed border-purple-300 rounded-lg p-4 
                             cursor-pointer hover:bg-purple-50 transition-all
                             flex flex-col items-center justify-center"
                  onClick={() => setAiTemplateModalOpen(true)}
                >
                  <Bot className="text-purple-500 w-12 h-12 mb-2" />
                  <span className="font-semibold text-purple-700">
                    AI Template
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!docName.trim() || !selectedTemplate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Template Generation Modal */}
      <Dialog open={aiTemplateModalOpen} onOpenChange={setAiTemplateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center">
              <Bot className="mr-2 text-purple-500" />
              AI Template Generator
            </DialogTitle>
            <DialogDescription>
              Describe the type of document you want to create
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={aiTemplatePrompt}
            onChange={(e) => setAiTemplatePrompt(e.target.value)}
            placeholder="E.g., Professional project proposal for a tech startup, Personal travel blog template..."
            className="min-h-[150px]"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAiTemplateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={generateAiTemplate}
              disabled={!aiTemplatePrompt.trim() || isGeneratingAiTemplate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGeneratingAiTemplate ? "Generating..." : "Generate Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
