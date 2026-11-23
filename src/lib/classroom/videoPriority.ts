import type { Participant } from '../../types/classroom'

const rank = (person: Participant) => (person.host ? 0 : person.isSelf ? 1 : 2)

/**
 * Who comes first on screen: the tutor, then you, then everyone else in the
 * order they joined. The tutor is the one students need to see.
 */
export function tutorFirst<T extends Participant>(people: readonly T[]): T[] {
  return people
    .map((person, index) => ({ person, index }))
    .toSorted((a, b) => rank(a.person) - rank(b.person) || a.index - b.index)
    .map(({ person }) => person)
}

/**
 * The person to show large: the tutor, when the tutor is someone else.
 * A tutor watching their own class gets no spotlight (their students share
 * the grid), so this is null for them.
 */
export function spotlightOf<T extends Participant>(
  people: readonly T[],
): T | null {
  return people.find((person) => person.host && !person.isSelf) ?? null
}
