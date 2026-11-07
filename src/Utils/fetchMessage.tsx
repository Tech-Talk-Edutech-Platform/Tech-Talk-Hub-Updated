import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'

interface MessageRow {
  id: string
  content: string
  is_read: boolean
  sender?:
    { full_name?: string | null } | Array<{ full_name?: string | null }> | null
}

interface MessageView {
  id: string
  name: string
  msg: string
  time: string
  statusColor: string
}

interface MessagesProps {
  tutorId?: string | null
}

export default function Messages({ tutorId }: MessagesProps) {
  const [chats, setChats] = useState<MessageView[]>([])

  const formatMessage = useCallback(
    (msg: MessageRow): MessageView => ({
      id: msg.id,
      name:
        (Array.isArray(msg.sender)
          ? msg.sender[0]?.full_name
          : msg.sender?.full_name) || 'Unknown Student',
      msg: msg.content,
      time: msg.is_read ? 'Read' : 'Unread',
      statusColor: msg.is_read ? 'bg-slate-300' : 'bg-red-500',
    }),
    [],
  )

  const fetchMessages = useCallback(async () => {
    if (!tutorId) return
    const { data, error } = await supabase
      .from('messages')
      .select(`id, content, created_at, is_read, sender:users ( full_name )`)
      .eq('receiver_id', tutorId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!error && data)
      setChats(data.map((row: MessageRow) => formatMessage(row)))
  }, [tutorId, formatMessage])

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${tutorId}`,
        },
        () => fetchMessages(), // Refetch to get the joined 'sender' data
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tutorId, fetchMessages])

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
      <div className="mb-6 flex justify-between">
        <h3 className="font-bold text-slate-800">Recent Messages</h3>
        <button className="text-xs font-bold text-blue-600 hover:underline">
          View All &gt;
        </button>
      </div>
      <div className="space-y-4">
        {chats.length === 0 ? (
          <p className="text-xs italic text-slate-400">
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
