import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// turbopackIgnore: this app runs via a custom server (server.ts), not `next start` with
// standalone output tracing, so dynamic path resolution here doesn't affect deployment size.
const UPLOAD_ROOT = path.resolve(process.cwd(), /* turbopackIgnore: true */ process.env.UPLOAD_DIR || "./uploads");

export const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function saveResumeFile(file: File): Promise<{ url: string; fileName: string }> {
  if (!ALLOWED_RESUME_TYPES.has(file.type)) {
    throw new Error("Only PDF or Word documents are allowed for resumes.");
  }
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    throw new Error("Resume file must be smaller than 10MB.");
  }

  const dir = path.join(UPLOAD_ROOT, "resumes");
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || guessExtension(file.type);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  return { url: `/api/files/resumes/${storedName}`, fileName: file.name };
}

function guessExtension(mimeType: string) {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "application/msword") return ".doc";
  if (mimeType.includes("wordprocessingml")) return ".docx";
  return "";
}

export function resolveUploadPath(segments: string[]) {
  const filePath = path.join(/* turbopackIgnore: true */ UPLOAD_ROOT, ...segments);
  if (!filePath.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid file path.");
  }
  return filePath;
}
