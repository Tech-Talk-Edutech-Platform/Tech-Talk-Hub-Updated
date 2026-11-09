import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  RemoteAudioTrack,
  RemoteVideoTrack,
  type RemoteParticipant,
} from 'livekit-client'
import { toast } from '../../lib/classroom/toast'
import type { Participant, RoomMessage } from '../../types/classroom'

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
  enabled: boolean
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

function getTokenResponse(value: unknown): TokenResponse | null {
  if (typeof value !== 'object' || value === null) return null
  const body = value as Record<string, unknown>
  return typeof body.serverUrl === 'string' && typeof body.token === 'string'
    ? { serverUrl: body.serverUrl, token: body.token }
    : null
}

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
  enabled,
  camera,
  microphone,
  screen,
}: LiveKitOptions) {
  const [connection, setConnection] =
    useState<LiveConnectionState>('connecting')
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [remoteMedia, setRemoteMedia] = useState<Record<string, RemoteMedia>>(
    {},
  )
  const [attempt, setAttempt] = useState(0)
  const roomRef = useRef<Room | null>(null)
  const messageRef = useRef<(message: unknown) => void>(() => {})
  const publishedTracks = useRef(new Map<string, MediaStreamTrack>())
  const publishQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (!enabled) {
      setConnection('disconnected')
      setError(null)
      setParticipants([])
      setRemoteMedia({})
      return undefined
    }

    let active = true
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    publishedTracks.current.clear()
    setConnection('connecting')
    setAudioPlaybackBlocked(false)
    setError(null)

    const refreshParticipants = () => {
      const next = [...room.remoteParticipants.values()].map((peer) =>
        remoteParticipant(peer),
      )
      setParticipants(next.map(({ participant }) => participant))
      setRemoteMedia(
        Object.fromEntries(
          next.map(({ participant, media }) => [participant.id, media]),
        ),
      )
    }

    room.on(RoomEvent.Connected, () => {
      if (!active) return
      setConnection('connected')
      setError(null)
      refreshParticipants()
    })
    room.on(RoomEvent.AudioPlaybackStatusChanged, (allowed) => {
      if (active) setAudioPlaybackBlocked(!allowed)
    })
    room.on(RoomEvent.Reconnected, refreshParticipants)
    room.on(RoomEvent.Reconnecting, () => {
      if (active) setConnection('connecting')
    })
    room.on(RoomEvent.Disconnected, () => {
      if (!active) return
      setConnection('disconnected')
      setAudioPlaybackBlocked(false)
      publishedTracks.current.clear()
      refreshParticipants()
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
    room.on(RoomEvent.DataReceived, (payload) => {
      if (active) messageRef.current(messageFromJson(payload))
    })

    const connect = async () => {
      const response = await fetch('/api/classroom/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, identity, name }),
      })
      const body: unknown = await response.json()
      if (!response.ok) {
        const detail =
          typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          typeof body.error === 'string'
            ? body.error
            : `Couldn’t join the live room (HTTP ${response.status}).`
        throw new Error(detail)
      }
      const tokenResponse = getTokenResponse(body)
      if (!tokenResponse) {
        throw new Error('The live-room service returned an invalid response.')
      }
      if (!active) return
      await room.connect(tokenResponse.serverUrl, tokenResponse.token, {
        autoSubscribe: true,
      })
    }

    void connect().catch((reason: unknown) => {
      if (!active) return
      setConnection('error')
      setError(
        reason instanceof Error
          ? reason.message
          : 'Couldn’t connect to the live room.',
      )
    })

    return () => {
      active = false
      room.removeAllListeners()
      void room.disconnect(false)
      if (roomRef.current === room) roomRef.current = null
      publishedTracks.current.clear()
    }
  }, [roomId, identity, name, enabled, attempt])

  useEffect(() => {
    const room = roomRef.current
    if (!room || connection !== 'connected') return undefined
    let active = true
    const desired = new Map<string, MediaStreamTrack | null>([
      ['camera', firstTrack(camera, 'video')],
      ['microphone', firstTrack(microphone, 'audio')],
      ['screen', firstTrack(screen, 'video')],
    ])

    publishQueue.current = publishQueue.current
      .then(async () => {
        if (!active) return
        for (const [source, current] of publishedTracks.current) {
          if (current !== desired.get(source)) {
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
          await room.localParticipant.publishTrack(track, {
            source: trackSource,
          })
          publishedTracks.current.set(source, track)
        }
      })
      .catch((reason: unknown) => {
        if (!active) return
        const detail =
          reason instanceof Error
            ? reason.message
            : 'Couldn’t publish your media.'
        setError(detail)
        toast('Couldn’t publish your media. Check your camera and microphone.')
      })

    return () => {
      active = false
    }
  }, [camera, microphone, screen, connection])

  const sendMessage = useCallback(async (message: RoomMessage) => {
    const room = roomRef.current
    if (!room || room.state !== ConnectionState.Connected) {
      throw new Error('The live room is not connected.')
    }
    const payload = new TextEncoder().encode(JSON.stringify(message))
    await room.localParticipant.publishData(payload, { reliable: true })
  }, [])

  const setMessageHandler = useCallback(
    (handler: (message: unknown) => void) => {
      messageRef.current = handler
    },
    [],
  )

  const reconnect = useCallback(() => {
    setConnection('connecting')
    setError(null)
    setAttempt((current) => current + 1)
  }, [])

  const enableAudio = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    try {
      await room.startAudio()
      setAudioPlaybackBlocked(false)
    } catch (reason: unknown) {
      const detail =
        reason instanceof Error
          ? reason.message
          : 'Check your browser sound settings and try again.'
      toast(`Couldn’t enable call audio. ${detail}`)
    }
  }, [])

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
