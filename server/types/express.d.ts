import type { supabase } from "../supabase";

declare global {
  namespace Express {
    interface Request {
      supabase: typeof supabase;
    }
  }
}

export {};
