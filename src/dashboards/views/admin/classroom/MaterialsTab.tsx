import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { parseAgenda, parseLinks } from '../../../../lib/classroom/repository'
import { uid } from '../../../../lib/classroom/uid'
import type { MaterialLinkRow } from '../../../../types/classroom'
import { orNull } from './format'
import {
  classroomKeys,
  deleteMaterial,
  listActivities,
  listCourses,
  listMaterials,
  saveMaterial,
  type ActivityDraft,
  type ActivityRow,
  type MaterialDraft,
  type MaterialRow,
} from './classroomAdminApi'
import {
  Button,
  Card,
  CardTitle,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  inputBase,
  inputClass,
  textareaClass,
} from './ui'

const DEFAULT_WARNING = {
  title: 'This agenda is for the teacher only.',
  body: 'Please do not share your screen while viewing this. Only open it in a separate window.',
}

// Editor rows carry a local key so React can track them while they move.
type Keyed<T> = T & { key: string }
type OutcomeRow = Keyed<{ text: string }>
type AgendaRow = Keyed<{ minutes: string; step: string }>
type LinkItemRow = Keyed<{ text: string; href: string; underline: boolean }>
type LinkRow = Keyed<{
  label: string
  isNew: boolean
  note: string
  items: LinkItemRow[]
}>
type ActivityEditRow = Keyed<{
  id: string | null
  title: string
  outline: string
  projectUrl: string
}>

type EditorState = {
  title: string
  courseId: string
  isActive: boolean
  outline: string
  outcomes: OutcomeRow[]
  agenda: AgendaRow[]
  warningTitle: string
  warningBody: string
  links: LinkRow[]
  activities: ActivityEditRow[]
}

const keyed = <T extends object>(value: T): Keyed<T> => ({
  ...value,
  key: uid(),
})
const newLinkItem = () => keyed({ text: '', href: '', underline: false })

function toEditor(
  material: MaterialRow | null,
  activities: ActivityRow[],
): EditorState {
  return {
    title: material?.title ?? '',
    courseId: material?.course_id ?? '',
    isActive: material?.is_active ?? true,
    outline: material?.outline ?? '',
    outcomes: (material?.outcomes ?? ['']).map((text) => keyed({ text })),
    agenda: parseAgenda(material?.agenda ?? []).map((step) =>
      keyed({ minutes: String(step.minutes), step: step.step }),
    ),
    warningTitle: material?.agenda_warning_title ?? DEFAULT_WARNING.title,
    warningBody: material?.agenda_warning_body ?? DEFAULT_WARNING.body,
    links: parseLinks(material?.links ?? []).map((row) =>
      keyed({
        label: row.label,
        isNew: !!row.isNew,
        note: row.note ?? '',
        items: row.items.map((item) =>
          keyed({
            text: item.text,
            href: item.href,
            underline: !!item.underline,
          }),
        ),
      }),
    ),
    activities: activities.map((activity) =>
      keyed({
        id: activity.id,
        title: activity.title,
        outline: activity.outline,
        projectUrl: activity.project_url ?? '',
      }),
    ),
  }
}

const isWebLink = (value: string) => /^https?:\/\/\S+$/i.test(value)

/** Editor state -> rows to save, or the first problem found. */
function toDrafts(
  state: EditorState,
): { material: MaterialDraft; activities: ActivityDraft[] } | string {
  const links: MaterialLinkRow[] = []
  for (const row of state.links) {
    if (!row.label.trim()) continue
    const items = row.items
      .filter((item) => item.text.trim() || item.href.trim())
      .map((item) => ({
        text: item.text.trim() || item.href.trim(),
        href: item.href.trim(),
        // Left out of the saved JSON unless set.
        underline: item.underline || undefined,
      }))
    const broken = items.find((item) => !isWebLink(item.href))
    if (broken) {
      return `“${broken.text}” in “${row.label.trim()}” needs a link starting with https://`
    }
    links.push({
      label: row.label.trim(),
      ...(row.isNew ? { isNew: true } : {}),
      ...(row.note.trim() ? { note: row.note.trim() } : {}),
      items,
    })
  }

  const activities: ActivityDraft[] = []
  for (const row of state.activities) {
    if (!row.title.trim()) continue
    const url = row.projectUrl.trim()
    if (url && !isWebLink(url)) {
      return `The project link for “${row.title.trim()}” must start with https://`
    }
    activities.push({
      id: row.id,
      title: row.title.trim(),
      outline: row.outline.trim(),
      project_url: url || null,
    })
  }

  return {
    material: {
      title: state.title.trim(),
      course_id: orNull(state.courseId),
      is_active: state.isActive,
      outline: state.outline.trim(),
      outcomes: state.outcomes.map((row) => row.text.trim()).filter(Boolean),
      agenda: state.agenda
        .filter((row) => row.step.trim())
        .map((row) => ({
          minutes: Math.max(0, Math.round(Number(row.minutes) || 0)),
          step: row.step.trim(),
        })),
      agenda_warning_title: state.warningTitle.trim() || DEFAULT_WARNING.title,
      agenda_warning_body: state.warningBody.trim() || DEFAULT_WARNING.body,
      links,
    },
    activities,
  }
}

function move<T>(list: T[], index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  const [item] = next.splice(index, 1)
  if (item !== undefined) next.splice(target, 0, item)
  return next
}

const replaceAt = <T,>(list: T[], index: number, patch: Partial<T>) =>
  list.map((item, i) => (i === index ? { ...item, ...patch } : item))

function RowControls({
  index,
  count,
  label,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  label: string
  onMove: (delta: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        size="sm"
        variant="ghost"
        square
        disabled={index === 0}
        aria-label={`Move ${label} up`}
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={14} aria-hidden="true" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        square
        disabled={index === count - 1}
        aria-label={`Move ${label} down`}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={14} aria-hidden="true" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        square
        className="hover:text-red-600"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <X size={14} aria-hidden="true" />
      </Button>
    </div>
  )
}

function Group({
  title,
  hint,
  onAdd,
  addLabel,
  children,
}: {
  title: string
  hint?: string
  onAdd: () => void
  addLabel: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 border-t border-slate-100 pt-5 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-black text-slate-900 dark:text-white">{title}</h4>
          {hint && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          )}
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus size={14} aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
      {children}
    </section>
  )
}

type Editing = { id: string | null; version: number; saved: boolean }

export function MaterialsTab() {
  const [editing, setEditing] = useState<Editing | null>(null)
  const materials = useQuery({
    queryKey: classroomKeys.materials,
    queryFn: listMaterials,
  })
  const courses = useQuery({
    queryKey: classroomKeys.courses,
    queryFn: listCourses,
  })

  if (editing) {
    const material = editing.id
      ? (materials.data?.find((row) => row.id === editing.id) ?? null)
      : null
    return (
      <MaterialLoader
        key={`${editing.id ?? 'new'}-${editing.version}`}
        material={material}
        courses={courses.data ?? []}
        saved={editing.saved}
        onSaved={(id) =>
          setEditing({ id, version: editing.version + 1, saved: true })
        }
        onBack={() => setEditing(null)}
      />
    )
  }

  const courseTitle = (id: string | null) =>
    courses.data?.find((course) => course.id === id)?.title

  return (
    <Card>
      <CardTitle
        aside={
          <Button
            variant="primary"
            onClick={() => setEditing({ id: null, version: 0, saved: false })}
          >
            <Plus size={16} aria-hidden="true" />
            New material
          </Button>
        }
      >
        Lesson materials
      </CardTitle>
      <p className="-mt-3 mb-5 text-sm text-slate-500 dark:text-slate-400">
        The outcome, outline, teacher agenda, links and activities a class shows
        in Class details. Pick one for each class in its settings.
      </p>
      {materials.isPending ? (
        <Loading label="Loading lesson materials…" />
      ) : materials.isError ? (
        <ErrorNote>{materials.error.message}</ErrorNote>
      ) : materials.data.length === 0 ? (
        <EmptyState>No lesson materials yet.</EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {materials.data.map((material) => (
            <li key={material.id}>
              <button
                type="button"
                onClick={() =>
                  setEditing({ id: material.id, version: 0, saved: false })
                }
                className="h-full w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-left transition-colors hover:border-purple-200 hover:bg-white focus-visible:border-purple-400 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-black text-slate-900 dark:text-white">
                    {material.title}
                  </span>
                  {!material.is_active && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      Hidden
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {[
                    courseTitle(material.course_id),
                    `${material.outcomes.length} outcomes`,
                    `${parseAgenda(material.agenda).length} agenda steps`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {material.outline && (
                  <span className="mt-2 line-clamp-2 block text-sm text-slate-600 dark:text-slate-300">
                    {material.outline}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

type LoaderProps = {
  material: MaterialRow | null
  courses: { id: string; title: string }[]
  /** Reopened straight after a save: say so. */
  saved: boolean
  onSaved: (id: string) => void
  onBack: () => void
}

/** Waits for the material's activities, then opens the editor. */
function MaterialLoader(props: LoaderProps) {
  const { material } = props
  const activities = useQuery({
    queryKey: classroomKeys.activities(material?.id ?? 'new'),
    queryFn: () => (material ? listActivities(material.id) : []),
  })
  if (activities.isPending) return <Loading label="Loading the material…" />
  if (activities.isError)
    return <ErrorNote>{activities.error.message}</ErrorNote>
  return <MaterialEditor {...props} activities={activities.data} />
}

function MaterialEditor({
  material,
  activities,
  courses,
  saved: initiallySaved,
  onSaved,
  onBack,
}: LoaderProps & { activities: ActivityRow[] }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState(() => toEditor(material, activities))
  const [problem, setProblem] = useState<string | null>(null)
  const [saved, setSaved] = useState(initiallySaved)
  const patch = (next: Partial<EditorState>) => {
    setSaved(false)
    setState((current) => ({ ...current, ...next }))
  }

  const save = useMutation({
    mutationFn: (drafts: {
      material: MaterialDraft
      activities: ActivityDraft[]
    }) =>
      saveMaterial(material?.id ?? null, drafts.material, drafts.activities),
    onSuccess: async (id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: classroomKeys.materials }),
        queryClient.invalidateQueries({
          queryKey: classroomKeys.activities(id),
        }),
        // The live classroom reads materials too.
        queryClient.invalidateQueries({ queryKey: ['classroom'] }),
      ])
      onSaved(id)
    },
  })
  const remove = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: classroomKeys.materials })
      onBack()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const drafts = toDrafts(state)
    if (typeof drafts === 'string') {
      setProblem(drafts)
      return
    }
    setProblem(null)
    save.mutate(drafts)
  }

  const id = material?.id ?? 'new'
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="-ml-2">
        <ArrowLeft size={16} aria-hidden="true" />
        All lesson materials
      </Button>
      <Card>
        <CardTitle>
          {material ? 'Edit lesson material' : 'New lesson material'}
        </CardTitle>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Title" htmlFor={`${id}-title`} required>
              <input
                id={`${id}-title`}
                required
                maxLength={200}
                value={state.title}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="AI & Coding Trial: build a Scratch game"
                className={inputClass}
              />
            </Field>
            <Field label="Course" htmlFor={`${id}-course`}>
              <select
                id={`${id}-course`}
                value={state.courseId}
                onChange={(event) => patch({ courseId: event.target.value })}
                className={inputClass}
              >
                <option value="">Not part of a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Outline"
              htmlFor={`${id}-outline`}
              className="md:col-span-2"
            >
              <textarea
                id={`${id}-outline`}
                rows={3}
                value={state.outline}
                onChange={(event) => patch({ outline: event.target.value })}
                className={textareaClass}
              />
            </Field>
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700 md:col-span-2 dark:text-slate-200">
              <input
                type="checkbox"
                checked={state.isActive}
                onChange={(event) => patch({ isActive: event.target.checked })}
                className="size-4 accent-purple-600"
              />
              Offer this material when setting up classes
            </label>
          </div>

          <Group
            title="Outcomes"
            hint="What the student will be able to do by the end."
            addLabel="Add outcome"
            onAdd={() =>
              patch({ outcomes: [...state.outcomes, keyed({ text: '' })] })
            }
          >
            {state.outcomes.map((row, index) => (
              <div key={row.key} className="flex items-center gap-2">
                <input
                  aria-label={`Outcome ${index + 1}`}
                  value={row.text}
                  onChange={(event) =>
                    patch({
                      outcomes: replaceAt(state.outcomes, index, {
                        text: event.target.value,
                      }),
                    })
                  }
                  className={inputClass}
                />
                <RowControls
                  index={index}
                  count={state.outcomes.length}
                  label={`outcome ${index + 1}`}
                  onMove={(delta) =>
                    patch({ outcomes: move(state.outcomes, index, delta) })
                  }
                  onRemove={() =>
                    patch({
                      outcomes: state.outcomes.filter((_, i) => i !== index),
                    })
                  }
                />
              </div>
            ))}
          </Group>

          <Group
            title="Teacher agenda"
            hint="Minutes per step. The total is the class’s recommended length."
            addLabel="Add step"
            onAdd={() =>
              patch({
                agenda: [...state.agenda, keyed({ minutes: '5', step: '' })],
              })
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Warning title" htmlFor={`${id}-warning-title`}>
                <input
                  id={`${id}-warning-title`}
                  value={state.warningTitle}
                  onChange={(event) =>
                    patch({ warningTitle: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Warning text" htmlFor={`${id}-warning-body`}>
                <input
                  id={`${id}-warning-body`}
                  value={state.warningBody}
                  onChange={(event) =>
                    patch({ warningBody: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
            {state.agenda.map((row, index) => (
              <div key={row.key} className="flex items-center gap-2">
                <input
                  aria-label={`Step ${index + 1} minutes`}
                  type="number"
                  min={0}
                  max={240}
                  value={row.minutes}
                  onChange={(event) =>
                    patch({
                      agenda: replaceAt(state.agenda, index, {
                        minutes: event.target.value,
                      }),
                    })
                  }
                  className={`${inputBase} w-20 shrink-0 tabular-nums`}
                />
                <input
                  aria-label={`Step ${index + 1}`}
                  value={row.step}
                  onChange={(event) =>
                    patch({
                      agenda: replaceAt(state.agenda, index, {
                        step: event.target.value,
                      }),
                    })
                  }
                  placeholder="Welcome and introductions"
                  className={inputClass}
                />
                <RowControls
                  index={index}
                  count={state.agenda.length}
                  label={`step ${index + 1}`}
                  onMove={(delta) =>
                    patch({ agenda: move(state.agenda, index, delta) })
                  }
                  onRemove={() =>
                    patch({
                      agenda: state.agenda.filter((_, i) => i !== index),
                    })
                  }
                />
              </div>
            ))}
            {state.agenda.length > 0 && (
              <p className="text-xs font-bold text-slate-500 tabular-nums dark:text-slate-400">
                Total:{' '}
                {state.agenda.reduce(
                  (sum, row) => sum + (Number(row.minutes) || 0),
                  0,
                )}{' '}
                min
              </p>
            )}
          </Group>

          <Group
            title="Links and resources"
            hint="Each row has a label and one or more links, e.g. Launch | Guide."
            addLabel="Add row"
            onAdd={() =>
              patch({
                links: [
                  ...state.links,
                  keyed({
                    label: '',
                    isNew: false,
                    note: '',
                    items: [newLinkItem()],
                  }),
                ],
              })
            }
          >
            {state.links.map((row, index) => {
              const setRow = (next: Partial<LinkRow>) =>
                patch({ links: replaceAt(state.links, index, next) })
              return (
                <div
                  key={row.key}
                  className="space-y-3 rounded-2xl border border-slate-100 p-3 dark:border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`Row ${index + 1} label`}
                      value={row.label}
                      onChange={(event) =>
                        setRow({ label: event.target.value })
                      }
                      placeholder="Scratch project"
                      className={inputClass}
                    />
                    <label className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={row.isNew}
                        onChange={(event) =>
                          setRow({ isNew: event.target.checked })
                        }
                        className="size-4 accent-purple-600"
                      />
                      New
                    </label>
                    <RowControls
                      index={index}
                      count={state.links.length}
                      label={`row ${row.label || index + 1}`}
                      onMove={(delta) =>
                        patch({ links: move(state.links, index, delta) })
                      }
                      onRemove={() =>
                        patch({
                          links: state.links.filter((_, i) => i !== index),
                        })
                      }
                    />
                  </div>
                  {row.items.map((item, itemIndex) => (
                    <div
                      key={item.key}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <input
                        aria-label={`Row ${index + 1} link ${itemIndex + 1} text`}
                        value={item.text}
                        onChange={(event) =>
                          setRow({
                            items: replaceAt(row.items, itemIndex, {
                              text: event.target.value,
                            }),
                          })
                        }
                        placeholder="Launch"
                        className={`${inputClass} sm:w-40`}
                      />
                      <input
                        aria-label={`Row ${index + 1} link ${itemIndex + 1} address`}
                        type="url"
                        value={item.href}
                        onChange={(event) =>
                          setRow({
                            items: replaceAt(row.items, itemIndex, {
                              href: event.target.value,
                            }),
                          })
                        }
                        placeholder="https://"
                        className={inputClass}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        square
                        className="self-end hover:text-red-600 sm:self-auto"
                        aria-label={`Remove link ${itemIndex + 1}`}
                        onClick={() =>
                          setRow({
                            items: row.items.filter((_, i) => i !== itemIndex),
                          })
                        }
                      >
                        <X size={14} aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setRow({ items: [...row.items, newLinkItem()] })
                      }
                    >
                      <Plus size={14} aria-hidden="true" />
                      Add link
                    </Button>
                    <input
                      aria-label={`Row ${index + 1} note`}
                      value={row.note}
                      onChange={(event) => setRow({ note: event.target.value })}
                      placeholder="Optional note, e.g. Use the teacher account"
                      className={inputClass}
                    />
                  </div>
                </div>
              )
            })}
          </Group>

          <Group
            title="Classroom activities"
            hint="Listed in Class details, in the Submit project form and in AI tools."
            addLabel="Add activity"
            onAdd={() =>
              patch({
                activities: [
                  ...state.activities,
                  keyed({ id: null, title: '', outline: '', projectUrl: '' }),
                ],
              })
            }
          >
            {state.activities.map((row, index) => {
              const setRow = (next: Partial<ActivityEditRow>) =>
                patch({ activities: replaceAt(state.activities, index, next) })
              return (
                <div
                  key={row.key}
                  className="space-y-2 rounded-2xl border border-slate-100 p-3 dark:border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-sm font-black text-slate-400 tabular-nums">
                      {index + 1}
                    </span>
                    <input
                      aria-label={`Activity ${index + 1} title`}
                      value={row.title}
                      onChange={(event) =>
                        setRow({ title: event.target.value })
                      }
                      placeholder="Make the cat move"
                      className={inputClass}
                    />
                    <RowControls
                      index={index}
                      count={state.activities.length}
                      label={`activity ${index + 1}`}
                      onMove={(delta) =>
                        patch({
                          activities: move(state.activities, index, delta),
                        })
                      }
                      onRemove={() =>
                        patch({
                          activities: state.activities.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 pl-8">
                    <textarea
                      aria-label={`Activity ${index + 1} outline`}
                      rows={2}
                      value={row.outline}
                      onChange={(event) =>
                        setRow({ outline: event.target.value })
                      }
                      placeholder="What the student does in this activity"
                      className={textareaClass}
                    />
                    <input
                      aria-label={`Activity ${index + 1} project link`}
                      type="url"
                      value={row.projectUrl}
                      onChange={(event) =>
                        setRow({ projectUrl: event.target.value })
                      }
                      placeholder="Starter project link (optional), https://"
                      className={inputClass}
                    />
                  </div>
                </div>
              )
            })}
          </Group>

          {problem && <ErrorNote>{problem}</ErrorNote>}
          {save.isError && <ErrorNote>{save.error.message}</ErrorNote>}
          {remove.isError && <ErrorNote>{remove.error.message}</ErrorNote>}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-white/10">
            <Button type="submit" variant="primary" busy={save.isPending}>
              {material ? 'Save material' : 'Create material'}
            </Button>
            {saved && (
              <output className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Saved
              </output>
            )}
            {material && (
              <Button
                variant="danger"
                className="ml-auto"
                busy={remove.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete “${material.title}”? Classes using it will show no material. Submitted projects are kept.`,
                    )
                  ) {
                    remove.mutate(material.id)
                  }
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete material
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
