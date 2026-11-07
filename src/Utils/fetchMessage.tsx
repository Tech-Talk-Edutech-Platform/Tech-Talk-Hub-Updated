import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

interface MessageView {
  id: string
  name: string
  msg: string
  time: string
  statusColor: string
}

interface MessagesProps {
  /** Shows the latest messages sent to this user. */
  receiverId?: string | null
}

/** The latest five messages sent to `receiverId`, with the senders' names. */
async function loadMessages(receiverId: string): Promise<MessageView[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, content, created_at, is_read, sender_id')
    .eq('receiver_id', receiverId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw error

  // `messages` has no foreign key to `users`, so look the senders up separately.
  const senderIds = [
    ...new Set(data.flatMap((row) => (row.sender_id ? [row.sender_id] : []))),
  ]
  const senderNames = new Map<string, string>()
  if (senderIds.length > 0) {
    const { data: senders } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', senderIds)
    for (const sender of senders ?? []) {
      senderNames.set(sender.id, sender.full_name)
    }
  }

  return data.map((row) => ({
    id: row.id,
    name:
      (row.sender_id && senderNames.get(row.sender_id)) || 'Unknown Student',
    msg: row.content,
    time: row.is_read ? 'Read' : 'Unread',
    statusColor: row.is_read ? 'bg-slate-300' : 'bg-red-500',
  }))
}

export default function Messages({ receiverId }: MessagesProps) {
  const [chats, setChats] = useState<MessageView[]>([])

  useEffect(() => {
    if (!receiverId) return undefined

    let cancelled = false
    const refresh = () => {
      loadMessages(receiverId).then(
        (rows) => {
          if (!cancelled) setChats(rows)
        },
        (error: unknown) => {
          console.error('Could not load messages:', error)
        },
      )
    }

    refresh()

    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${receiverId}`,
        },
        refresh, // Refetch to get the sender's name
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [receiverId])

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
      <div className="mb-6 flex justify-between">
        <h3 className="font-bold text-slate-800">Recent Messages</h3>
        <button
          type="button"
          className="text-xs font-bold text-blue-600 hover:underline"
        >
          View All &gt;
        </button>
      </div>
      <div className="space-y-4">
        {chats.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No messages received yet.
          </p>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center justify-between gap-4 rounded-xl p-2 transition-colors hover:bg-slate-50"
            >
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    {chat.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${chat.statusColor}`}
                  >
                    {chat.time}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">{chat.msg}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
