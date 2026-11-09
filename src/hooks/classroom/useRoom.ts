import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { uid } from '../../lib/classroom/uid'
import { toast } from '../../lib/classroom/toast'
import type {
  ChatMessage,
  Participant,
  Reaction,
  RoomMessage,
} from '../../types/classroom'

// LiveKit carries room messages across devices; BroadcastChannel remains the
// local fallback when the live room is unavailable.

const HEARTBEAT_MS = 4000
const STALE_MS = 12000
const REACTION_MS = 3200

type RoomOptions = {
  roomId: string
  self: Participant
  onRemoteEnd?: (from: Participant) => void
  enabled?: boolean
  connected?: boolean
  sendMessage?: (message: RoomMessage) => Promise<void>
}

function isParticipant(value: unknown): value is Participant {
  if (typeof value !== 'object' || value === null) return false
  const person = value as Record<string, unknown>
  return (
    typeof person.id === 'string' &&
    typeof person.name === 'string' &&
    typeof person.initial === 'string' &&
    typeof person.cam === 'boolean' &&
    typeof person.mic === 'boolean' &&
    typeof person.screen === 'boolean' &&
    typeof person.hand === 'boolean' &&
    typeof person.isSelf === 'boolean'
  )
}

/** Validate data from BroadcastChannel and the room's LiveKit data channel. */
function isRoomMessage(value: unknown): value is RoomMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  if (!isParticipant(message.from)) return false
  switch (message.type) {
    case 'hello':
    case 'here':
    case 'state':
    case 'bye':
    case 'end':
      return true
    case 'chat': {
      const chat = message.message
      if (typeof chat !== 'object' || chat === null) return false
      const item = chat as Record<string, unknown>
      const from = item.from
      return (
        typeof item.id === 'string' &&
        typeof item.text === 'string' &&
        item.text.length <= 2000 &&
        typeof item.at === 'number' &&
        typeof from === 'object' &&
        from !== null &&
        'id' in from &&
        typeof from.id === 'string' &&
        'name' in from &&
        typeof from.name === 'string' &&
        'initial' in from &&
        typeof from.initial === 'string'
      )
    }
    case 'reaction': {
      const reaction = message.reaction
      if (typeof reaction !== 'object' || reaction === null) return false
      const item = reaction as Record<string, unknown>
      return (
        typeof item.id === 'string' &&
        typeof item.emoji === 'string' &&
        typeof item.fromId === 'string' &&
        typeof item.drift === 'number'
      )
    }
    default:
      return false
  }
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
  connected = false,
  sendMessage,
}: RoomOptions) {
  const [peers, setPeers] = useState<Record<string, Participant>>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const channel = useRef<BroadcastChannel | null>(null)
  const selfRef = useRef(self)
  const endRef = useRef(onRemoteEnd)
  const transportRef = useRef({ connected, sendMessage })
  useEffect(() => {
    selfRef.current = self
    endRef.current = onRemoteEnd
  })
  useEffect(() => {
    transportRef.current = { connected, sendMessage }
  }, [connected, sendMessage])

  const post = useCallback((message: RoomMessage): Promise<void> => {
    const transport = transportRef.current
    if (transport.connected && transport.sendMessage) {
      return transport.sendMessage(message).catch(() => {
        toast('Couldn’t send this update. Check your connection and try again.')
      })
    }
    const ch = channel.current
    if (!ch) return Promise.resolve()
    // BroadcastChannel is restricted to this origin and has no targetOrigin.
    ch.postMessage(message)
    return Promise.resolve()
  }, [])

  const receiveMessage = useCallback((value: unknown) => {
    if (!isRoomMessage(value) || value.from.id === selfRef.current.id) return
    const { from } = value
    const upsert = () =>
      setPeers((current) => ({
        ...current,
        [from.id]: { ...from, isSelf: false, lastSeen: Date.now() },
      }))

    switch (value.type) {
      case 'hello':
        upsert()
        void post({ type: 'here', from: selfRef.current })
        break
      case 'here':
      case 'state':
        upsert()
        break
      case 'bye':
        setPeers((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([id]) => id !== from.id),
          ),
        )
        break
      case 'chat':
        upsert()
        setMessages((current) => [...current, value.message])
        break
      case 'reaction':
        showReaction(setReactions, value.reaction)
        break
      case 'end':
        endRef.current?.(from)
        break
    }
  }, [post])

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') return undefined
    const ch = new BroadcastChannel(`coding-gal:room:${roomId}`)
    channel.current = ch
    const onMessage = ({ data }: MessageEvent<unknown>) =>
      receiveMessage(data)
    ch.addEventListener('message', onMessage)
    void post({ type: 'hello', from: selfRef.current })
    const beat = setInterval(() => {
      void post({ type: 'here', from: selfRef.current })
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
    const bye = () => {
      void post({ type: 'bye', from: selfRef.current })
    }
    window.addEventListener('pagehide', bye)

    return () => {
      clearInterval(beat)
      window.removeEventListener('pagehide', bye)
      void post({ type: 'bye', from: selfRef.current })
      ch.removeEventListener('message', onMessage)
      ch.close()
      channel.current = null
      setPeers({})
    }
  }, [roomId, enabled, connected, post, receiveMessage])

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
      speaking: self.speaking,
    }
    void post({ type: 'state', from })
  }, [id, name, initial, cam, mic, screen, hand, isSelf, self.speaking, post])

  const sendChat = (text: string) => {
    const me = selfRef.current
    const message: ChatMessage = {
      id: uid(),
      text,
      at: Date.now(),
      from: { id: me.id, name: me.name, initial: me.initial },
    }
    setMessages((current) => [...current, message])
    void post({
      type: 'chat',
      from: me,
      message,
    })
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
    void post({
      type: 'reaction',
      from: me,
      reaction,
    })
  }

  const endForAll = () =>
    post({
      type: 'end',
      from: selfRef.current,
    })

  const others = Object.values(peers).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )

  return {
    participants: [self, ...others],
    messages,
    reactions,
    receiveMessage,
    sendChat,
    sendReaction,
    endForAll,
  }
}
