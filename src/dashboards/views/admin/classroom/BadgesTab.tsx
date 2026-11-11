import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { BadgeMedal } from '../../../../components/classroom/ui/BadgeMedal'
import {
  asBadgeIcon,
  asBadgeOrnament,
} from '../../../../lib/classroom/repository'
import type { BadgeIcon, BadgeOrnament } from '../../../../types/classroom'
import {
  classroomKeys,
  deleteBadge,
  listBadges,
  saveBadge,
  type BadgeDraft,
  type BadgeRow,
} from './classroomAdminApi'
import {
  Button,
  Card,
  CardTitle,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  inputClass,
} from './ui'

const ICONS: { value: BadgeIcon; label: string }[] = [
  { value: 'code', label: 'Code' },
  { value: 'crown', label: 'Crown' },
  { value: 'bulb', label: 'Light bulb' },
  { value: 'pen', label: 'Pen' },
  { value: 'medal', label: 'Medal' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'stars', label: 'Sparkles' },
  { value: 'star', label: 'Star' },
]

const ORNAMENTS: { value: BadgeOrnament; label: string }[] = [
  { value: 'wreath', label: 'Gold wreath' },
  { value: 'wings', label: 'Pink wings' },
  { value: 'none', label: 'None' },
]

/** "Rising Coding Star" -> "rising-coding-star". */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)

type Editing = { row: BadgeRow | null }

export function BadgesTab() {
  const badges = useQuery({
    queryKey: classroomKeys.badges,
    queryFn: listBadges,
  })
  const [editing, setEditing] = useState<Editing | null>(null)
  const rows = badges.data ?? []

  return (
    <Card>
      <CardTitle
        aside={
          !editing && (
            <Button variant="primary" onClick={() => setEditing({ row: null })}>
              <Plus size={16} aria-hidden="true" />
              New badge
            </Button>
          )
        }
      >
        Badges
      </CardTitle>
      <p className="-mt-3 mb-5 text-sm text-slate-500 dark:text-slate-400">
        The medals a teacher can give from the classroom’s Give badge menu, in
        this order.
      </p>

      {editing && (
        <BadgeForm
          key={editing.row?.id ?? 'new'}
          row={editing.row}
          position={Math.max(0, ...rows.map((badge) => badge.position)) + 1}
          onDone={() => setEditing(null)}
        />
      )}

      {badges.isPending ? (
        <Loading label="Loading badges…" />
      ) : badges.isError ? (
        <ErrorNote>{badges.error.message}</ErrorNote>
      ) : rows.length === 0 ? (
        !editing && <EmptyState>No badges yet.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setEditing({ row })}
                aria-label={`Edit ${row.name}`}
                className={`flex h-full w-full flex-col items-center rounded-2xl border p-4 text-center transition-colors hover:border-purple-200 hover:bg-white focus-visible:border-purple-400 dark:hover:bg-white/10 ${
                  editing?.row?.id === row.id
                    ? 'border-purple-300 bg-white dark:border-purple-500/40 dark:bg-white/10'
                    : 'border-slate-100 bg-slate-50/50 dark:border-white/10 dark:bg-white/5'
                } ${row.is_active ? '' : 'opacity-55'}`}
              >
                <BadgeMedal
                  icon={asBadgeIcon(row.icon)}
                  ornament={asBadgeOrnament(row.ornament)}
                  size={88}
                />
                <span className="mt-1 text-sm font-black text-balance text-slate-900 dark:text-white">
                  {row.name}
                </span>
                <span className="mt-0.5 text-[11px] font-bold text-slate-400">
                  {row.is_active ? `Order ${row.position}` : 'Hidden in class'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function BadgeForm({
  row,
  position,
  onDone,
}: {
  row: BadgeRow | null
  position: number
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<BadgeDraft>(() =>
    row
      ? {
          slug: row.slug,
          name: row.name,
          icon: row.icon,
          ornament: row.ornament,
          position: row.position,
          is_active: row.is_active,
        }
      : {
          slug: '',
          name: '',
          icon: 'star',
          ornament: 'wreath',
          position,
          is_active: true,
        },
  )
  // A new badge's short name follows its name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(!!row)
  const set = (patch: Partial<BadgeDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: classroomKeys.badges }),
      queryClient.invalidateQueries({ queryKey: ['classroom'] }),
    ])
  const save = useMutation({
    mutationFn: (next: BadgeDraft) => saveBadge(row?.id ?? null, next),
    onSuccess: async () => {
      await refresh()
      onDone()
    },
  })
  const remove = useMutation({
    mutationFn: deleteBadge,
    onSuccess: async () => {
      await refresh()
      onDone()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate({
      ...draft,
      name: draft.name.trim(),
      slug: draft.slug || slugify(draft.name),
    })
  }

  const id = `badge-${row?.id ?? 'new'}`
  return (
    <form
      onSubmit={submit}
      className="mb-6 flex flex-col gap-5 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 md:flex-row md:p-5 dark:border-purple-500/20 dark:bg-purple-500/5"
    >
      <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-white px-6 py-4 md:w-48 dark:bg-white/5">
        <BadgeMedal
          icon={asBadgeIcon(draft.icon)}
          ornament={asBadgeOrnament(draft.ornament)}
          size={120}
        />
        <p className="mt-1 text-center text-sm font-black text-balance text-slate-900 dark:text-white">
          {draft.name || 'Badge name'}
        </p>
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-black text-slate-900 dark:text-white">
            {row ? `Edit ${row.name}` : 'New badge'}
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDone}
            square
            aria-label="Close without saving"
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor={`${id}-name`} required>
            <input
              id={`${id}-name`}
              required
              maxLength={80}
              value={draft.name}
              onChange={(event) =>
                set({
                  name: event.target.value,
                  ...(slugTouched ? {} : { slug: slugify(event.target.value) }),
                })
              }
              className={inputClass}
            />
          </Field>
          <Field
            label="Short name"
            htmlFor={`${id}-slug`}
            required
            hint="Lowercase letters, numbers and dashes. Unique."
          >
            <input
              id={`${id}-slug`}
              required
              pattern="[a-z0-9\-]{1,64}"
              value={draft.slug}
              onChange={(event) => {
                setSlugTouched(true)
                set({ slug: event.target.value })
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Icon" htmlFor={`${id}-icon`}>
            <select
              id={`${id}-icon`}
              value={draft.icon}
              onChange={(event) =>
                set({ icon: asBadgeIcon(event.target.value) })
              }
              className={inputClass}
            >
              {ICONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ornament" htmlFor={`${id}-ornament`}>
            <select
              id={`${id}-ornament`}
              value={draft.ornament}
              onChange={(event) =>
                set({ ornament: asBadgeOrnament(event.target.value) })
              }
              className={inputClass}
            >
              {ORNAMENTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Order"
            htmlFor={`${id}-position`}
            hint="Lower numbers come first."
          >
            <input
              id={`${id}-position`}
              type="number"
              min={0}
              value={draft.position}
              onChange={(event) =>
                set({
                  position: Math.max(
                    0,
                    Math.round(Number(event.target.value) || 0),
                  ),
                })
              }
              className={`${inputClass} tabular-nums`}
            />
          </Field>
          <label className="flex items-center gap-3 self-end pb-2.5 text-sm font-bold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(event) => set({ is_active: event.target.checked })}
              className="size-4 accent-purple-600"
            />
            Show in class
          </label>
        </div>

        {save.isError && <ErrorNote>{save.error.message}</ErrorNote>}
        {remove.isError && <ErrorNote>{remove.error.message}</ErrorNote>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" busy={save.isPending}>
            {row ? 'Save badge' : 'Add badge'}
          </Button>
          <Button onClick={onDone}>Cancel</Button>
          {row && (
            <Button
              variant="danger"
              className="ml-auto"
              busy={remove.isPending}
              onClick={() => {
                if (window.confirm(`Delete the “${row.name}” badge?`)) {
                  remove.mutate(row.id)
                }
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
