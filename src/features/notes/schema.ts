import { z } from 'zod'

// Mirrors the previous check (`!noteTitle || !noteContent`): non-empty only.
export const noteFormSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
})

export type NoteFormValues = z.infer<typeof noteFormSchema>
