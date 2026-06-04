import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  selectedFile: File | null;
  previewUrl: string | null;
  onClear: () => void;
}

export function ImageUploader({ onFileSelect, isLoading, selectedFile, previewUrl, onClear }: ImageUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isLoading || !!selectedFile
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        {...getRootProps()} 
        className={cn(
          "relative overflow-hidden rounded-3xl border-3 border-dashed transition-all duration-300 ease-out",
          !selectedFile ? "cursor-pointer" : "cursor-default",
          isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-card hover:border-primary/50",
          isDragReject && "border-destructive bg-destructive/5",
          selectedFile && "border-transparent bg-transparent shadow-2xl shadow-black/10 p-0",
          !selectedFile && "p-12 md:p-20"
        )}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div 
              key="upload-prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300",
                isDragActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}>
                <UploadCloud className="w-10 h-10" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-foreground">
                  {isDragActive ? "Drop it here!" : "Upload food image"}
                </h3>
                <p className="mt-2 text-muted-foreground max-w-xs mx-auto">
                  Drag and drop a clear photo of an Indian dish, or click to browse files.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground/80 mt-6">
                <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> JPEG, PNG, WEBP</span>
                <span>•</span>
                <span>Max 10MB</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="image-preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black/5"
            >
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt="Food preview" 
                  className={cn(
                    "w-full h-full object-cover transition-all duration-700",
                    isLoading && "scale-105 blur-sm opacity-60"
                  )} 
                />
              )}
              
              {/* Overlay gradient for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
              
              {/* Clear button */}
              {!isLoading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              
              {/* Loading overlay */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-white z-20"
                  >
                    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6 shadow-lg" />
                    <h3 className="text-2xl font-display font-bold shadow-black/50 drop-shadow-md">Analyzing Image...</h3>
                    <p className="text-white/80 font-medium mt-2 shadow-black/50 drop-shadow-md">Running MobileNetV2 inference</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
