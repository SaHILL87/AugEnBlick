import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";
import { Button } from "../ui/button";

interface FileUploadProps {
   fieldChange: (files: File[]) => void;
   mediaUrl: string;
   placeholder: string;
   acceptedTypes?: string;
   icon?: string;
   containerClassName?: string;
}

export const FileUpload = ({
   fieldChange,
   mediaUrl,
   placeholder,
   acceptedTypes = "*/*",
   icon = "/file-upload.svg",
   containerClassName = "h-36 w-36",
}: FileUploadProps) => {
   const [file, setFile] = useState<File | null>(null);
   const [fileUrl, setFileUrl] = useState<string>(mediaUrl || "");

   useEffect(() => {
      setFileUrl(mediaUrl);
   }, [mediaUrl]);

   const onDrop = useCallback(
      (acceptedFiles: File[]) => {
         const selectedFile = acceptedFiles[0];
         setFile(selectedFile);
         fieldChange(acceptedFiles);
         const url = URL.createObjectURL(selectedFile);
         setFileUrl(url);
      },
      [fieldChange]
   );

   interface RemoveFileEvent extends React.MouseEvent<HTMLButtonElement> {}

   const removeFile = (e: RemoveFileEvent) => {
      e.stopPropagation();
      setFile(null);
      fieldChange([]);
      if (fileUrl && !mediaUrl) {
         URL.revokeObjectURL(fileUrl);
      }
      setFileUrl("");
   };

   const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      accept: acceptedTypes.split(",").reduce((acc, type) => {
         acc[type.trim()] = [];
         return acc;
      }, {} as { [key: string]: [] }),
   });

   return (
      <div
         {...getRootProps()}
         className={`flex flex-col justify-center items-center rounded-xl cursor-pointer ${containerClassName}`}
      >
         <input {...getInputProps()} className="cursor-pointer" />

         {fileUrl || mediaUrl ? (
            <div
               className={`relative border border-muted-foreground rounded-lg overflow-hidden w-full h-full`}
            >
               <Button
                  onClick={removeFile}
                  size="icon"
                  variant="ghost"
                  className="absolute -top-1 -right-1 z-50 p-1 rounded-full transition-all"
               >
                  <X className="h-4 w-4 text-white" />
               </Button>

               {acceptedTypes.includes("image") ? (
                  <img
                     src={fileUrl || mediaUrl}
                     alt="file"
                     className="w-full h-full object-cover"
                  />
               ) : acceptedTypes.includes("video") ? (
                  <video
                     src={fileUrl || mediaUrl}
                     controls
                     className="w-full h-full object-cover"
                  />
               ) : (
                  <p className="text-center text-muted-foreground p-2 text-xs">
                     {file?.name}
                  </p>
               )}
            </div>
         ) : (
            <div
               className={`p-5 border border-muted-foreground rounded-lg text-center flex flex-col justify-center items-center ${containerClassName}`}
            >
               <img src={icon} alt="file-upload" className="m-auto h-16 w-16" />
               <p className="text-xs text-muted-foreground mt-2">
                  {placeholder}
               </p>
            </div>
         )}
      </div>
   );
};