import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  RemoteAudioTrack,
  RemoteVideoTrack,
  type RemoteParticipant,
} from 'livekit-client'
import { apiUrl } from '../../lib/apiUrl'
import { toast } from '../../lib/classroom/toast'
import { isSupabaseConfigured, supabase } from '../../supabase'
import type { Participant, RoomMessage } from '../../types/classroom'

/** host: can end the call for everyone. participant: can only leave. */
export type LiveRole = 'host' | 'participant'

/** Who sent a LiveKit data message, as the server vouched for in their token. */
export type MessageSender = { identity: string; isHost: boolean }

export type LiveConnectionState =
  'connecting' | 'connected' | 'disconnected' | 'error'

export type RemoteMedia = {
  camera: RemoteVideoTrack | null
  screen: RemoteVideoTrack | null
  audio: RemoteAudioTrack | null
}

type LiveKitOptions = {
  roomId: string
  identity: string
  name: string
  role: LiveRole
  enabled: boolean
  /** A host closed the room on the server: everyone was disconnected. */
  onRoomClosed?: () => void
  camera: MediaStream | null
  microphone: MediaStream | null
  screen: MediaStream | null
}

type TokenResponse = { serverUrl: string; token: string }

function messageFromJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    return null
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function getTokenResponse(value: unknown): TokenResponse | null {
  if (!isRecord(value)) return null
  return typeof value.serverUrl === 'string' && typeof value.token === 'string'
    ? { serverUrl: value.serverUrl, token: value.token }
    : null
}

const UNREACHABLE =
  'The live video server isn’t reachable. Start the API server (npm --prefix server run dev) or set VITE_API_BASE_URL.'

/** The signed-in user's Supabase token, so the server can tell tutors from guests. */
async function authHeader(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** POST to the classroom API. Turns HTML or empty error pages into a clear message. */
async function postClassroomApi(path: string, payload: unknown) {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error(UNREACHABLE)
  }
  const raw = await response.text()
  let body: unknown = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = null
  }
  if (!response.ok) {
    if (isRecord(body) && typeof body.error === 'string') {
      throw new Error(body.error)
    }
    throw new Error(
      response.status >= 500 && !body
        ? UNREACHABLE
        : `The live room didn’t respond (HTTP ${response.status}).`,
    )
  }
  return body
}

async function requestToken(
  roomId: string,
  identity: string,
  name: string,
  role: LiveRole,
) {
  const body = await postClassroomApi('/api/classroom/token', {
    roomId,
    identity,
    name,
    role,
  })
  const tokenResponse = getTokenResponse(body)
  if (!tokenResponse) {
    throw new Error('The live-room service returned an invalid response.')
  }
  return tokenResponse
}

/** Host only: close the room on the server, which disconnects everyone. */
export async function endRoomForEveryone(roomId: string) {
  await postClassroomApi('/api/classroom/end', { roomId })
}

/** One connection attempt's state; a new attempt starts from freshState. */
type LiveState = {
  key: string | null
  connection: LiveConnectionState
  audioPlaybackBlocked: boolean
  error: string | null
  participants: Participant[]
  remoteMedia: Record<string, RemoteMedia>
}

const freshState = (key: string | null): LiveState => ({
  key,
  connection: key ? 'connecting' : 'disconnected',
  audioPlaybackBlocked: false,
  error: null,
  participants: [],
  remoteMedia: {},
})

function remoteParticipant(peer: RemoteParticipant): {
  participant: Participant
  media: RemoteMedia
} {
  const displayName = peer.name?.trim() || 'Guest'
  const camera = peer.getTrackPublication(Track.Source.Camera)?.track
  const screen = peer.getTrackPublication(Track.Source.ScreenShare)?.track
  const audio = peer.getTrackPublication(Track.Source.Microphone)?.track

  return {
    participant: {
      id: peer.identity,
      name: displayName,
      initial: displayName.charAt(0).toUpperCase(),
      cam: peer.isCameraEnabled,
      mic: peer.isMicrophoneEnabled,
      screen: peer.isScreenShareEnabled,
      hand: false,
      isSelf: false,
      speaking: peer.isSpeaking,
    },
    media: {
      camera: camera instanceof RemoteVideoTrack ? camera : null,
      screen: screen instanceof RemoteVideoTrack ? screen : null,
      audio: audio instanceof RemoteAudioTrack ? audio : null,
    },
  }
}

function firstTrack(stream: MediaStream | null, kind: 'audio' | 'video') {
  return stream?.getTracks().find((track) => track.kind === kind) ?? null
}

export function useLiveKitRoom({
  roomId,
  identity,
  name,
  role,
  enabled,
  onRoomClosed,
  camera,
  microphone,
  screen,
}: LiveKitOptions) {
  const [attempt, setAttempt] = useState(0)
  const sessionKey = enabled
    ? JSON.stringify([roomId, identity, name, role, attempt])
    : null
  const closedRef = useRef(onRoomClosed)
  useEffect(() => {
    closedRef.current = onRoomClosed
  })
  const [stored, setStored] = useState<LiveState>(() => freshState(sessionKey))
  // State left over from an earlier attempt (or room) reads as a fresh one.
  const live = stored.key === sessionKey ? stored : freshState(sessionKey)
  const { connection, audioPlaybackBlocked, error, participants, remoteMedia } =
    live

  /** Update one attempt's state; a stale attempt's updates start it fresh. */
  const update = useCallback(
    (key: string, patch: Partial<Omit<LiveState, 'key'>>) => {
      setStored((current) => {
        const base = current.key === key ? current : freshState(key)
        return { ...base, ...patch }
      })
    },
    [],
  )
  const roomRef = useRef<Room | null>(null)
  const messageRef = useRef<
    (message: unknown, sender?: MessageSender) => void
  >(() => {})
  const publishedTracks = useRef(new Map<string, MediaStreamTrack>())
  const publishQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (!sessionKey) return undefined
    const key = sessionKey
    const state = { active: true }
    const tracks = publishedTracks.current
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    tracks.clear()

    const refreshParticipants = () => {
      if (!state.active) return
      const next = [...room.remoteParticipants.values()].map((peer) =>
        remoteParticipant(peer),
      )
      update(key, {
        participants: next.map(({ participant }) => participant),
        remoteMedia: Object.fromEntries(
          next.map(({ participant, media }) => [participant.id, media]),
        ),
      })
    }

    room.on(RoomEvent.Connected, () => {
      if (!state.active) return
      update(key, { connection: 'connected', error: null })
      refreshParticipants()
    })
    room.on(RoomEvent.AudioPlaybackStatusChanged, (allowed) => {
      if (state.active) update(key, { audioPlaybackBlocked: !allowed })
    })
    room.on(RoomEvent.Reconnected, () => {
      if (state.active) update(key, { connection: 'connected' })
      refreshParticipants()
    })
    room.on(RoomEvent.Reconnecting, () => {
      if (state.active) update(key, { connection: 'connecting' })
    })
    room.on(RoomEvent.Disconnected, (reason) => {
      if (!state.active) return
      update(key, { connection: 'disconnected', audioPlaybackBlocked: false })
      tracks.clear()
      refreshParticipants()
      if (reason === DisconnectReason.ROOM_DELETED) closedRef.current?.()
    })
    room.on(RoomEvent.ParticipantConnected, refreshParticipants)
    room.on(RoomEvent.ParticipantDisconnected, refreshParticipants)
    room.on(RoomEvent.TrackPublished, refreshParticipants)
    room.on(RoomEvent.TrackSubscribed, refreshParticipants)
    room.on(RoomEvent.TrackUnsubscribed, refreshParticipants)
    room.on(RoomEvent.TrackUnpublished, refreshParticipants)
    room.on(RoomEvent.TrackMuted, refreshParticipants)
    room.on(RoomEvent.TrackUnmuted, refreshParticipants)
    room.on(RoomEvent.ActiveSpeakersChanged, refreshParticipants)
    room.on(RoomEvent.ParticipantNameChanged, refreshParticipants)
    room.on(RoomEvent.DataReceived, (payload, sender) => {
      if (!state.active) return
      messageRef.current(messageFromJson(payload), {
        identity: sender?.identity ?? '',
        // Set by the server in the sender's token; they can't change it.
        isHost: sender?.attributes.role === 'host',
      })
    })

    const connect = async () => {
      const token = await requestToken(roomId, identity, name, role)
      if (!state.active) return
      await room.connect(token.serverUrl, token.token, { autoSubscribe: true })
    }

    void connect().catch((reason: unknown) => {
      if (!state.active) return
      update(key, {
        connection: 'error',
        error:
          reason instanceof Error
            ? reason.message
            : 'Couldn’t connect to the live room.',
      })
    })

    return () => {
      state.active = false
      room.removeAllListeners()
      void room.disconnect(false)
      if (roomRef.current === room) roomRef.current = null
      tracks.clear()
    }
  }, [sessionKey, roomId, identity, name, role, update])

  useEffect(() => {
    const room = roomRef.current
    if (!room || connection !== 'connected') return undefined
    const key = sessionKey
    const state = { active: true }
    const desired = new Map<string, MediaStreamTrack | null>([
      ['camera', firstTrack(camera, 'video')],
      ['microphone', firstTrack(microphone, 'audio')],
      ['screen', firstTrack(screen, 'video')],
    ])

    publishQueue.current = publishQueue.current
      .then(async () => {
        if (!state.active) return
        for (const [source, current] of publishedTracks.current) {
          if (current !== desired.get(source)) {
            // Sequential on purpose: one track change at a time.
            // oxlint-disable-next-line eslint/no-await-in-loop -- see above
            await room.localParticipant.unpublishTrack(current, false)
            publishedTracks.current.delete(source)
          }
        }
        for (const [source, track] of desired) {
          if (!track || publishedTracks.current.has(source)) continue
          const trackSource =
            source === 'camera'
              ? Track.Source.Camera
              : source === 'microphone'
                ? Track.Source.Microphone
                : Track.Source.ScreenShare
          // oxlint-disable-next-line eslint/no-await-in-loop -- one track at a time
          await room.localParticipant.publishTrack(track, {
            source: trackSource,
          })
          publishedTracks.current.set(source, track)
        }
      })
      .catch((reason: unknown) => {
        if (!state.active) return
        const detail =
          reason instanceof Error
            ? reason.message
            : 'Couldn’t publish your media.'
        if (key) update(key, { error: detail })
        toast('Couldn’t publish your media. Check your camera and microphone.')
      })

    return () => {
      state.active = false
    }
  }, [camera, microphone, screen, connection, sessionKey, update])

  const sendMessage = useCallback(async (message: RoomMessage) => {
    const room = roomRef.current
    if (!room || room.state !== ConnectionState.Connected) {
      throw new Error('The live room is not connected.')
    }
    const payload = new TextEncoder().encode(JSON.stringify(message))
    await room.localParticipant.publishData(payload, { reliable: true })
  }, [])

  const setMessageHandler = useCallback(
    (handler: (message: unknown, sender?: MessageSender) => void) => {
      messageRef.current = handler
    },
    [],
  )

  const reconnect = useCallback(() => {
    setAttempt((current) => current + 1)
  }, [])

  const enableAudio = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    try {
      await room.startAudio()
      if (sessionKey) update(sessionKey, { audioPlaybackBlocked: false })
    } catch (reason: unknown) {
      const detail =
        reason instanceof Error
          ? reason.message
          : 'Check your browser sound settings and try again.'
      toast(`Couldn’t enable call audio. ${detail}`)
    }
  }, [sessionKey, update])

  return {
    connection,
    audioPlaybackBlocked,
    error,
    participants,
    remoteMedia,
    sendMessage,
    setMessageHandler,
    reconnect,
    enableAudio,
  }
}
