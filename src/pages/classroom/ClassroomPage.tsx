import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Copy, Link2, LogOut, Maximize, Minimize, Settings } from 'lucide-react'
import { ClassEnded } from '../../components/classroom/ClassEnded'
import { NeedHelpWidget } from '../../components/classroom/help/NeedHelpWidget'
import { AiToolsModal } from '../../components/classroom/modals/AiToolsModal'
import { EndClassModal } from '../../components/classroom/modals/EndClassModal'
import { SettingsModal } from '../../components/classroom/modals/SettingsModal'
import { SubmitProjectModal } from '../../components/classroom/modals/SubmitProjectModal'
import { SwitchPlatformModal } from '../../components/classroom/modals/SwitchPlatformModal'
import { ChatPanel } from '../../components/classroom/panels/ChatPanel'
import { ClassDetailsPanel } from '../../components/classroom/panels/ClassDetailsPanel'
import { PeoplePanel } from '../../components/classroom/panels/PeoplePanel'
import { Stage } from '../../components/classroom/stage/Stage'
import { ClassToolbar } from '../../components/classroom/toolbar/ClassToolbar'
import {
  BUILT_IN_PLATFORM,
  CLASS_STUDENTS,
  CLASSROOM,
  PLATFORMS,
  STUDENT,
} from '../../data/classroom'
import { CLASSROOM_BRAND } from '../../data/classroomBrand'
import { useClassTimer } from '../../hooks/classroom/useClassTimer'
import { useIsSpeaking } from '../../hooks/classroom/useIsSpeaking'
import { useLiveKitRoom } from '../../hooks/classroom/useLiveKitRoom'
import { useLocalMedia } from '../../hooks/classroom/useLocalMedia'
import { useRecording } from '../../hooks/classroom/useRecording'
import { useRoom } from '../../hooks/classroom/useRoom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { copyText } from '../../lib/classroom/clipboard'
import { toast } from '../../lib/classroom/toast'
import { uid } from '../../lib/classroom/uid'
import type {
  Badge,
  ClassAlert,
  ClassEndInfo,
  ClassModal,
  GivenBadge,
  MenuAction,
  PanelName,
  Participant,
  SubmittedProject,
  ToolbarMenu,
} from '../../types/classroom'

const isWideScreen = () => window.matchMedia('(min-width: 1024px)').matches

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
    return
  }
  const root = document.documentElement
  if ('requestFullscreen' in root) {
    root
      .requestFullscreen()
      .catch(() => toast('Full screen isn’t available here.'))
  }
}

/** The live classroom: class bar, video room, side panels and modals. */
export function ClassroomPage() {
  const { classroomId = CLASSROOM.id } = useParams()
  const [params] = useSearchParams()
  const name = params.get('name')?.trim() || CLASSROOM.teacher.name
  const [selfId] = useState(uid)

  const media = useLocalMedia()
  const speaking = useIsSpeaking(media.mic)
  const timer = useClassTimer(classroomId)
  const recording = useRecording({ micStream: media.mic, classroomId })

  // Class details is open on arrival, as in the recording (desktop only; it overlays on small screens).
  const [panel, setPanel] = useState<PanelName | null>(() =>
    isWideScreen() ? 'details' : null,
  )
  const [modal, setModal] = useState<ClassModal | null>(null)
  const [modalKey, setModalKey] = useState(0)
  const [toolbarMenu, setToolbarMenu] = useState<ToolbarMenu | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [hand, setHand] = useState(false)
  const [platformId, setPlatformId] = useState(BUILT_IN_PLATFORM.id)
  const [projects, setProjects] = useState<SubmittedProject[]>([])
  const [badgesGiven, setBadgesGiven] = useState<GivenBadge[]>([])
  const [alertSentAt, setAlertSentAt] = useState<
    Partial<Record<string, number>>
  >({})
  const [chatDraft, setChatDraft] = useState('')
  const [chatSeenAt, setChatSeenAt] = useState(0)
  const [ended, setEnded] = useState<ClassEndInfo | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useDocumentTitle(`${CLASSROOM.pageTitle} | ${CLASSROOM_BRAND.name}`)

  const self: Participant = {
    id: selfId,
    name,
    initial: name.charAt(0).toUpperCase(),
    cam: !!media.cam,
    mic: !!media.mic,
    screen: !!media.screen,
    hand,
    isSelf: true,
    speaking,
  }

  const finish = (info: Omit<ClassEndInfo, 'elapsedMs'>) => {
    recording.stop()
    media.stopAll()
    setModal(null)
    setHelpOpen(false)
    setHand(false)
    setEnded({ elapsedMs: timer.elapsedMs, ...info })
  }

  const liveRoom = useLiveKitRoom({
    roomId: classroomId,
    identity: selfId,
    name,
    enabled: !ended,
    camera: media.cam,
    microphone: media.mic,
    screen: media.screen,
  })
  const room = useRoom({
    roomId: classroomId,
    self,
    enabled: !ended,
    connected: liveRoom.connection === 'connected',
    sendMessage: liveRoom.sendMessage,
    onRemoteEnd: (from) => finish({ reason: 'ended', by: from.name }),
  })
  useEffect(() => {
    liveRoom.setMessageHandler(room.receiveMessage)
  }, [liveRoom.setMessageHandler, room.receiveMessage])

  const participants =
    liveRoom.connection === 'connected'
      ? [
          self,
          ...liveRoom.participants.map((person) => {
            const state = room.participants.find(
              (candidate) => candidate.id === person.id,
            )
            return {
              ...person,
              hand: state?.hand ?? false,
            }
          }),
        ]
      : room.participants.map((person) =>
          person.id === selfId ? { ...person, speaking } : person,
        )

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const openModal = (next: ClassModal) => {
    setToolbarMenu(null)
    setModalKey((k) => k + 1)
    setModal(next)
  }

  const togglePanel = (next: PanelName) => {
    if (next === 'chat' || panel === 'chat') setChatSeenAt(Date.now())
    setPanel((current) => (current === next ? null : next))
  }

  const chatUnread =
    panel === 'chat'
      ? 0
      : room.messages.filter(
          (message) => message.from.id !== selfId && message.at > chatSeenAt,
        ).length

  const giveBadge = (badge: Badge) => {
    const entry: GivenBadge = { ...badge, key: uid(), at: Date.now() }
    setBadgesGiven((given) => [entry, ...given])
    toast(`${badge.name} given to ${STUDENT.name}`, {
      action: {
        label: 'Undo',
        onClick: () =>
          setBadgesGiven((given) => given.filter((b) => b.key !== entry.key)),
      },
    })
  }

  const sendAlert = (alert: ClassAlert) => {
    setAlertSentAt((sent) => ({ ...sent, [alert.id]: Date.now() }))
    toast(alert.sent)
  }

  const roomLink = `${window.location.origin}/classroom/${classroomId}`
  const guestLink = `${roomLink}?name=${encodeURIComponent(STUDENT.name)}`
  const platform =
    PLATFORMS.find((option) => option.id === platformId) ?? BUILT_IN_PLATFORM

  const moreActions: MenuAction[] = [
    {
      id: 'fullscreen',
      label: fullscreen ? 'Exit full screen' : 'Full screen',
      icon: fullscreen ? Minimize : Maximize,
      onSelect: toggleFullscreen,
    },
    {
      id: 'copy-room',
      label: 'Copy room link',
      icon: Copy,
      onSelect: () => copyText(roomLink, 'Room link copied'),
    },
    {
      id: 'copy-guest',
      label: 'Copy guest link',
      icon: Link2,
      onSelect: () =>
        copyText(
          guestLink,
          'Guest link copied. Open it in another tab to join.',
        ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onSelect: () => openModal('settings'),
    },
    {
      id: 'leave',
      label: 'Leave room',
      icon: LogOut,
      danger: true,
      divider: true,
      onSelect: () => finish({ reason: 'left' }),
    },
  ]

  if (ended) {
    return (
      <ClassEnded
        info={ended}
        onRejoin={() => {
          if (ended.reason === 'ended') timer.restart()
          setEnded(null)
        }}
      />
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ClassToolbar
        classroom={{ ...CLASSROOM, id: classroomId }}
        studentName={STUDENT.name}
        elapsedMs={timer.elapsedMs}
        now={timer.now}
        panel={panel}
        chatUnread={chatUnread}
        alertSentAt={alertSentAt}
        menu={toolbarMenu}
        setMenu={setToolbarMenu}
        onTogglePanel={togglePanel}
        onOpenModal={openModal}
        onGiveBadge={giveBadge}
        onSendAlert={sendAlert}
        onOpenHelp={() => setHelpOpen((open) => !open)}
        onEndClass={() => openModal('end')}
      />

      <main className="relative flex min-h-0 flex-1">
        <Stage
          media={media}
          self={{ ...self, speaking }}
          participants={participants}
          remoteMedia={liveRoom.remoteMedia}
          liveConnection={liveRoom.connection}
          liveError={liveRoom.error}
          audioPlaybackBlocked={liveRoom.audioPlaybackBlocked}
          onReconnect={liveRoom.reconnect}
          onEnableAudio={() => void liveRoom.enableAudio()}
          reactions={room.reactions}
          recording={recording}
          onToggleRecording={recording.toggle}
          onToggleHand={() => setHand((raised) => !raised)}
          onReact={room.sendReaction}
          panel={panel}
          onTogglePanel={togglePanel}
          platform={platform}
          onSwitchBack={() => setPlatformId(BUILT_IN_PLATFORM.id)}
          onOpenSettings={() => openModal('settings')}
          moreActions={moreActions}
        />

        {panel === 'details' && (
          <ClassDetailsPanel
            classroomId={classroomId}
            student={STUDENT}
            now={timer.now}
            projects={projects}
            badgesGiven={badgesGiven}
            onClose={() => setPanel(null)}
            onOpenSubmit={() => openModal('submit')}
            onOpenAiTools={() => openModal('ai')}
            onOpenBadges={() => setToolbarMenu('badge')}
          />
        )}
        {panel === 'chat' && (
          <ChatPanel
            messages={room.messages}
            selfId={selfId}
            onSend={room.sendChat}
            draft={chatDraft}
            onDraftChange={setChatDraft}
            onClose={() => togglePanel('chat')}
          />
        )}
        {panel === 'people' && (
          <PeoplePanel
            participants={participants}
            guestLink={guestLink}
            onClose={() => setPanel(null)}
          />
        )}
      </main>

      {helpOpen && <NeedHelpWidget onClose={() => setHelpOpen(false)} />}

      <SubmitProjectModal
        key={`submit-${modalKey}`}
        open={modal === 'submit'}
        onClose={() => setModal(null)}
        student={STUDENT}
        onSubmit={(project) => {
          setProjects((current) => [
            { id: uid(), at: Date.now(), ...project },
            ...current,
          ])
          setModal(null)
          toast(`Project submitted for ${STUDENT.name}`)
        }}
      />
      <AiToolsModal
        key={`ai-${modalKey}`}
        open={modal === 'ai'}
        onClose={() => setModal(null)}
        student={STUDENT}
        onSendToChat={(text) => {
          room.sendChat(text)
          setModal(null)
          setChatSeenAt(Date.now())
          setPanel('chat')
        }}
      />
      <SwitchPlatformModal
        open={modal === 'platform'}
        onClose={() => setModal(null)}
        current={platformId}
        onSwitch={(next) => {
          setPlatformId(next.id)
          setModal(null)
          toast(`Video platform switched to ${next.label}`)
        }}
      />
      <SettingsModal
        open={modal === 'settings'}
        onClose={() => setModal(null)}
        media={media}
      />
      <EndClassModal
        key={`end-${modalKey}`}
        open={modal === 'end'}
        onClose={() => setModal(null)}
        elapsedMs={timer.elapsedMs}
        recording={recording.active}
        students={CLASS_STUDENTS}
        present={participants
          .filter((person) => !person.isSelf)
          .map((person) => person.name)}
        platformId={platformId}
        onConfirm={async (report) => {
          await room.endForAll()
          finish({ reason: 'ended', by: null, report })
        }}
      />
    </div>
  )
}
