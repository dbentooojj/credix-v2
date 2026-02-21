import { createHash } from "crypto";

export function createPasswordResetVersion(passwordHash: string): string {
  return createHash("sha256")
    .update(passwordHash)
    .digest("hex")
    .slice(0, 24);
}

