import type { AnchorHTMLAttributes } from 'react'
import { useRecordingUrl } from './recordingUrl'

type RecordingLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  /** `class_recordings.recording_url`: a web link or a storage path. */
  recording: string
}

/** An <a> that opens a recording, signing private storage paths first. */
export function RecordingLink({ recording, ...props }: RecordingLinkProps) {
  const { url: href, isError } = useRecordingUrl(recording)
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={href ? undefined : true}
      title={isError ? 'You don’t have access to this recording.' : undefined}
    />
  )
}
