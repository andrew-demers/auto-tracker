"use client";

import { useRef } from "react";
import { Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * A single pending-file picker used in "add" forms - the file isn't
 * uploaded until the parent record exists, so this just tracks a `File` in
 * memory and hands it back via `onChange`. Uses the `capture` attribute so
 * phones can jump straight to the camera for a receipt photo.
 */
export function AttachmentFileInput({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        capture="environment"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="size-4" />
        {file ? "Change receipt" : "Attach receipt (optional)"}
      </Button>
      {file ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="max-w-40 truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            aria-label="Remove selected file"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
