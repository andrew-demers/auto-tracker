import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveStoredPath } from "@/lib/storage";

// Streams an attachment's file from disk. Sits under proxy.ts route
// protection like the rest of the app, but also independently verifies the
// session here since this is a file-serving route, not a page.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return new Response("Not found", { status: 404 });
  }

  const absolutePath = resolveStoredPath(attachment.storedPath);
  let size: number;
  try {
    size = (await stat(absolutePath)).size;
  } catch {
    return new Response("File not found", { status: 404 });
  }

  const nodeStream = createReadStream(absolutePath);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk) =>
        controller.enqueue(chunk as Buffer as Uint8Array)
      );
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  const encodedFilename = encodeURIComponent(attachment.filename);

  return new Response(body, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(size),
      "Content-Disposition": `inline; filename="${attachment.filename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
