"use client";

import { useTransition } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { deleteAttachment, uploadAttachment } from "@/actions/attachments";
import { cn } from "@/lib/utils";
import type { AttachmentOwnerType } from "@/generated/prisma/client";

export interface AttachmentRow {
  id: string;
  filename: string;
  mimeType: string;
}

/**
 * Compact thumbnail grid for a fuel-up/expense list row: image thumbnails
 * (via the authenticated /api/attachments/[id] route), a file icon for
 * PDFs, a delete (x) per attachment, and a small "+" control to attach
 * another file without opening the edit dialog.
 */
export function AttachmentGrid({
  ownerType,
  ownerId,
  attachments,
}: {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  attachments: AttachmentRow[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await uploadAttachment(ownerType, ownerId, formData);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(attachment: AttachmentRow) {
    if (!window.confirm(`Delete "${attachment.filename}"? This can't be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAttachment(attachment.id);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {attachments.map((attachment) => {
        const isImage = attachment.mimeType.startsWith("image/");
        return (
          <div key={attachment.id} className="group/attachment relative">
            <a
              href={`/api/attachments/${attachment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title={attachment.filename}
              className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted"
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/attachments/${attachment.id}`}
                  alt={attachment.filename}
                  className="size-full object-cover"
                />
              ) : (
                <FileText className="size-4 text-muted-foreground" />
              )}
            </a>
            <button
              type="button"
              onClick={() => handleDelete(attachment)}
              disabled={isPending}
              aria-label={`Delete ${attachment.filename}`}
              className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover/attachment:opacity-100 disabled:opacity-50"
            >
              <X className="size-2.5" />
            </button>
          </div>
        );
      })}
      <label
        title="Attach a file"
        className={cn(
          "flex size-10 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-muted",
          isPending && "pointer-events-none opacity-50"
        )}
      >
        <Paperclip className="size-4" />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="sr-only"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
