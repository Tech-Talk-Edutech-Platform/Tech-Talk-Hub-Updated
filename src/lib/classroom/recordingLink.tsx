import type { AnchorHTMLAttributes } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../supabase'
import { RECORDINGS_BUCKET } from './repository'

const SIGNED_URL_SECONDS = 60 * 60

const isWebUrl = (value: string) => /^https?:\/\//i.test(value)

/**
 * A recording's playable URL. Links pasted into the Recordings manager are
 * used as they are; classroom recordings are paths in the private
 * `class-recordings` bucket and get a one-hour signed URL.
 */
async function recordingUrl(value: string) {
  if (isWebUrl(value)) return value
  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(value, SIGNED_URL_SECONDS)
  if (error) throw error
  return data.signedUrl
}

type RecordingLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  /** `class_recordings.recording_url`: a web link or a storage path. */
  recording: string
}

/** An <a> that opens a recording, signing private storage paths first. */
export function RecordingLink({ recording, ...props }: RecordingLinkProps) {
  const direct = isWebUrl(recording)
  const signed = useQuery({
    queryKey: ['recording-url', recording],
    queryFn: () => recordingUrl(recording),
    enabled: !direct,
    // Refresh well before the signed URL expires.
    staleTime: (SIGNED_URL_SECONDS - 10 * 60) * 1000,
    refetchInterval: (SIGNED_URL_SECONDS - 10 * 60) * 1000,
  })
  const href = direct ? recording : signed.data
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={href ? undefined : true}
      title={
        signed.isError ? 'You don’t have access to this recording.' : undefined
      }
    />
  )
}
