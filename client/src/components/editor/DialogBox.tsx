import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate } from "react-router-dom"
import { v4 as uuidV4 } from "uuid"
import { useState } from "react"

export function Dialogbox() {
  const navigate = useNavigate();
  const [docName, setDocName] = useState("");
  const [open, setOpen] = useState(false);

  const createDoc = (docId: string) => {
    navigate(`/documents/${docId}`);
  }

  const handleSubmit = () => {
    const id = uuidV4();
    localStorage.setItem(`document-name-for-${id}`, docName);
    createDoc(id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create a new document</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new document</DialogTitle>
          <DialogDescription>
            Enter a name for your document. Click create when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}