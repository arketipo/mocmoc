import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  label: string;
  hint: string;
  value: string | null;
  onChange: (dataUrl: string | null, file: File | null) => void;
}

export function ImageDropzone({ label, hint, value, onChange }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string, file);
    reader.readAsDataURL(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-card transition-all",
          dragging
            ? "border-primary bg-accent shadow-elegant"
            : "border-border hover:border-primary/60 hover:bg-accent/40",
        )}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null, null);
              }}
              className="absolute right-2 top-2 rounded-full bg-foreground/80 p-1 text-background backdrop-blur transition-colors hover:bg-foreground"
              aria-label="Quitar imagen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-2 text-center">
            <span className="rounded-full bg-accent p-2 text-primary transition-transform group-hover:scale-110">
              <ImagePlus className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-medium leading-tight text-foreground">
              Arrastra aquí
            </span>
            <span className="text-[10px] text-muted-foreground">PNG o JPG</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}