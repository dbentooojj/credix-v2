import type { AppJwtPayload } from "../../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AppJwtPayload;
    }
  }
}

export {};
