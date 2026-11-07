import type { Json } from '../types/database'

/**
 * A quiz question's answer choices. `quiz_questions.options` is stored as JSON;
 * anything that isn't a list of strings or numbers reads as no options.
 */
export function quizOptions(options: Json): string[] {
  if (!Array.isArray(options)) return []

  return options.map((option) =>
    typeof option === 'string' || typeof option === 'number'
      ? String(option)
      : '',
  )
}
