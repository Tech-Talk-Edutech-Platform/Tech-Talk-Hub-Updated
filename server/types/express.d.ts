import type { supabase } from '../supabase'

// Import Request/Response from here (not 'express') so this augmentation is
// always part of the program, including Vercel's own compile of index.ts.
export type { Request, Response } from 'express'

declare global {
  namespace Express {
    interface Request {
      supabase: typeof supabase
    }
  }
}
