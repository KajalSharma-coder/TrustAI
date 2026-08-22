import crypto from "crypto";

export function generateContentHash(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}
