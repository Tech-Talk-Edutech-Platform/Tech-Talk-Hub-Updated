import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, UploadCloud } from 'lucide-react'

import { Modal } from '../../components/ui/Modal'
import { getErrorMessage } from '../../lib/getErrorMessage'
import {
  addRecording,
  recordingFileProblem,
  RECORDING_FILE_TYPES,
  uploadRecordingFile,
  type PersonOption,
  type RecordingKind,
} from './recordingsApi'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-purple-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600'
const labelClass =
  'text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-slate-300'

type UploadRecordingModalProps = {
  userId: string
  admin: boolean
  students: PersonOption[]
  tutors: PersonOption[]
  onClose: () => void
  onSaved: () => void
}

type Source = 'file' | 'link'

function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

/** Add a recording: upload a video file, or paste a YouTube/Drive/Loom link. */
export function UploadRecordingModal({
  userId,
  admin,
  students,
  tutors,
  onClose,
  onSaved,
}: UploadRecordingModalProps) {
  const [source, setSource] = useState<Source>('file')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [link, setLink] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [kind, setKind] = useState<RecordingKind>('regular')
  const [studentId, setStudentId] = useState('')
  const [tutorId, setTutorId] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      const recordingUrl =
        source === 'file' && file
          ? await uploadRecordingFile(userId, file)
          : link.trim()
      await addRecording({
        title: title.trim(),
        recordingUrl,
        thumbnailUrl: thumbnailUrl.trim() || null,
        studentId: studentId || null,
        // A tutor's uploads are always their own.
        tutorId: admin ? tutorId || null : userId,
        kind,
      })
    },
    onSuccess: onSaved,
    onError: (error) =>
      setProblem(getErrorMessage(error, 'Couldn’t save the recording.')),
  })

  const ready =
    title.trim() !== '' &&
    (source === 'file' ? file !== null : /^https?:\/\/\S+$/i.test(link.trim()))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProblem(null)
    if (ready) save.mutate()
  }

  const audienceLabel = admin
    ? tutorId
      ? 'All of that tutor’s students'
      : 'Nobody yet (staff only)'
    : 'All my students'

  return (
    <Modal
      title="Add a recording"
      closeLabel="Close add recording"
      size="wide"
      onClose={save.isPending ? () => undefined : onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="recording-title" className={labelClass}>
            Session title
          </label>
          <input
            id="recording-title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Intro to Loops & Variables"
            className={inputClass}
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Video</legend>
          <div className="mt-1.5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
            {(['file', 'link'] as const).map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-bold transition focus-within:ring-2 focus-within:ring-purple-500 ${
                  source === option
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="recording-source"
                  value={option}
                  checked={source === option}
                  onChange={() => setSource(option)}
                  className="sr-only"
                />
                {option === 'file' ? 'Upload a file' : 'Paste a link'}
              </label>
            ))}
          </div>

          {source === 'file' ? (
            <div className="mt-3">
              <label
                htmlFor="recording-file"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 transition focus-within:border-purple-500 hover:border-purple-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <UploadCloud
                  size={24}
                  className="text-purple-600"
                  aria-hidden="true"
                />
                {file ? (
                  <span className="font-bold break-all">
                    {file.name} · {megabytes(file.size)}
                  </span>
                ) : (
                  <span>Choose an MP4, WebM or MOV video</span>
                )}
                <input
                  id="recording-file"
                  type="file"
                  accept={RECORDING_FILE_TYPES.join(',')}
                  onChange={(event) => {
                    const picked = event.target.files?.[0] ?? null
                    setProblem(picked ? recordingFileProblem(picked) : null)
                    setFile(
                      picked && !recordingFileProblem(picked) ? picked : null,
                    )
                  }}
                  className="sr-only"
                />
              </label>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Large files may be over the storage upload limit. If so, upload
                the video to YouTube or Drive and paste the link.
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <label htmlFor="recording-url" className="sr-only">
                Recording link
              </label>
              <input
                id="recording-url"
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://… (YouTube, Drive or Loom)"
                className={inputClass}
              />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Class type</legend>
          <div className="mt-1.5 flex gap-4 text-sm text-slate-700 dark:text-slate-200">
            {(['regular', 'trial'] as const).map((option) => (
              <label key={option} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="recording-kind"
                  value={option}
                  checked={kind === option}
                  onChange={() => setKind(option)}
                  className="accent-purple-600"
                />
                {option === 'regular' ? 'Regular class' : 'Trial class'}
              </label>
            ))}
          </div>
        </fieldset>

        <div
          className={`grid grid-cols-1 gap-4 ${admin ? 'sm:grid-cols-2' : ''}`}
        >
          {admin && (
            <div>
              <label htmlFor="recording-tutor" className={labelClass}>
                Tutor
              </label>
              <select
                id="recording-tutor"
                value={tutorId}
                onChange={(event) => setTutorId(event.target.value)}
                className={inputClass}
              >
                <option value="">No tutor</option>
                {tutors.map((tutor) => (
                  <option key={tutor.id} value={tutor.id}>
                    {tutor.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="recording-student" className={labelClass}>
              Who can watch
            </label>
            <select
              id="recording-student"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className={inputClass}
            >
              <option value="">{audienceLabel}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  Only {student.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="recording-thumbnail" className={labelClass}>
            Thumbnail image link (optional)
          </label>
          <input
            id="recording-thumbnail"
            type="url"
            value={thumbnailUrl}
            onChange={(event) => setThumbnailUrl(event.target.value)}
            placeholder="Leave empty to use the course picture"
            className={inputClass}
          />
        </div>

        {problem && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {problem}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={save.isPending}
            className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || save.isPending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {save.isPending && (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            )}
            {save.isPending
              ? source === 'file' && file
                ? `Uploading ${megabytes(file.size)}… keep this tab open`
                : 'Saving…'
              : 'Save recording'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
