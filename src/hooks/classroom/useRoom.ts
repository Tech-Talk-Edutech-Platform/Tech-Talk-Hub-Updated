import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { uid } from '../../lib/classroom/uid'
import type {
  ChatMessage,
  Participant,
  Reaction,
  RoomMessage,
} from '../../types/classroom'

// Presence, chat, reactions and "end class" shared between browser tabs of the
// same room via BroadcastChannel. No server: this is the seam where a real
// signalling/realtime backend (WebRTC, LiveKit, etc.) plugs in later.
// Protocol: docs/breakdown/12-realtime-sync.md

const HEARTBEAT_MS = 4000
const STALE_MS = 12000
const REACTION_MS = 3200

type RoomOptions = {
  roomId: string
  self: Participant
  onRemoteEnd?: (from: Participant) => void
  enabled?: boolean
}

/** Messages come from other tabs of this app; check the parts every type relies on. */
function isRoomMessage(value: unknown): value is RoomMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string' &&
    'from' in value &&
    typeof value.from === 'object' &&
    value.from !== null &&
    'id' in value.from &&
    typeof value.from.id === 'string'
  )
}

function showReaction(
  setReactions: Dispatch<SetStateAction<Reaction[]>>,
  reaction: Reaction,
) {
  setReactions((current) => [...current, reaction])
  setTimeout(() => {
    setReactions((current) => current.filter((r) => r.id !== reaction.id))
  }, REACTION_MS)
}

export function useRoom({
  roomId,
  self,
  onRemoteEnd,
  enabled = true,
}: RoomOptions) {
  const [peers, setPeers] = useState<Record<string, Participant>>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const channel = useRef<BroadcastChannel | null>(null)
  const selfRef = useRef(self)
  const endRef = useRef(onRemoteEnd)
  useEffect(() => {
    selfRef.current = self
    endRef.current = onRemoteEnd
  })

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') return undefined
    const ch = new BroadcastChannel(`coding-gal:room:${roomId}`)
    channel.current = ch
    const post = (type: 'hello' | 'here' | 'bye') =>
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel.postMessage has no targetOrigin; it only reaches this origin
      ch.postMessage({ type, from: selfRef.current } satisfies RoomMessage)
    const upsert = (from: Participant) =>
      setPeers((current) => ({
        ...current,
        [from.id]: { ...from, isSelf: false, lastSeen: Date.now() },
      }))

    ch.addEventListener('message', ({ data }: MessageEvent<unknown>) => {
      if (!isRoomMessage(data) || data.from.id === selfRef.current.id) return
      const { from } = data
      switch (data.type) {
        case 'hello':
          upsert(from)
          post('here')
          break
        case 'here':
        case 'state':
          upsert(from)
          break
        case 'bye':
          setPeers((current) =>
            Object.fromEntries(
              Object.entries(current).filter(([id]) => id !== from.id),
            ),
          )
          break
        case 'chat': {
          const { message } = data
          upsert(from)
          setMessages((current) => [...current, message])
          break
        }
        case 'reaction':
          showReaction(setReactions, data.reaction)
          break
        case 'end':
          endRef.current?.(from)
          break
      }
    })

    post('hello')
    const beat = setInterval(() => {
      post('here')
      const cutoff = Date.now() - STALE_MS
      setPeers((current) => {
        const alive = Object.fromEntries(
          Object.entries(current).filter(
            ([, peer]) => (peer.lastSeen ?? 0) > cutoff,
          ),
        )
        return Object.keys(alive).length === Object.keys(current).length
          ? current
          : alive
      })
    }, HEARTBEAT_MS)
    const bye = () => post('bye')
    window.addEventListener('pagehide', bye)

    return () => {
      clearInterval(beat)
      window.removeEventListener('pagehide', bye)
      post('bye')
      ch.close()
      channel.current = null
      setPeers({})
    }
  }, [roomId, enabled])

  // Tell the room when my camera/mic/hand/name changes.
  const { id, name, initial, cam, mic, screen, hand, isSelf } = self
  useEffect(() => {
    const from: Participant = {
      id,
      name,
      initial,
      cam,
      mic,
      screen,
      hand,
      isSelf,
    }
    channel.current?.postMessage({ type: 'state', from } satisfies RoomMessage)
  }, [id, name, initial, cam, mic, screen, hand, isSelf])

  const sendChat = (text: string) => {
    const me = selfRef.current
    const message: ChatMessage = {
      id: uid(),
      text,
      at: Date.now(),
      from: { id: me.id, name: me.name, initial: me.initial },
    }
    setMessages((current) => [...current, message])
    channel.current?.postMessage({
      type: 'chat',
      from: me,
      message,
    } satisfies RoomMessage)
  }

  const sendReaction = (emoji: string) => {
    const me = selfRef.current
    const reaction: Reaction = {
      id: uid(),
      emoji,
      fromId: me.id,
      drift: Math.round(Math.random() * 60 - 30),
    }
    showReaction(setReactions, reaction)
    channel.current?.postMessage({
      type: 'reaction',
      from: me,
      reaction,
    } satisfies RoomMessage)
  }

  const endForAll = () =>
    channel.current?.postMessage({
      type: 'end',
      from: selfRef.current,
    } satisfies RoomMessage)

  const others = Object.values(peers).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )

  return {
    participants: [self, ...others],
    messages,
    reactions,
    sendChat,
    sendReaction,
    endForAll,
  }
}
