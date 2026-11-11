import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Copy,
  LoaderCircle,
  LogOut,
  Maximize,
  Minimize,
  Settings,
  Share2,
} from 'lucide-react'
import { ClassEnded } from '../../components/classroom/ClassEnded'
import { GuestJoinScreen } from '../../components/classroom/GuestJoinScreen'
import { NeedHelpWidget } from '../../components/classroom/help/NeedHelpWidget'
import { AiToolsModal } from '../../components/classroom/modals/AiToolsModal'
import { EndClassModal } from '../../components/classroom/modals/EndClassModal'
import { SettingsModal } from '../../components/classroom/modals/SettingsModal'
import { ShareCallModal } from '../../components/classroom/modals/ShareCallModal'
import {
  SubmitProjectModal,
  type ProjectDraft,
} from '../../components/classroom/modals/SubmitProjectModal'
import { SwitchPlatformModal } from '../../components/classroom/modals/SwitchPlatformModal'
import { ChatPanel } from '../../components/classroom/panels/ChatPanel'
import { ClassDetailsPanel } from '../../components/classroom/panels/ClassDetailsPanel'
import { PeoplePanel } from '../../components/classroom/panels/PeoplePanel'
import { Stage } from '../../components/classroom/stage/Stage'
import { ClassToolbar } from '../../components/classroom/toolbar/ClassToolbar'
import { BrandMark } from '../../components/classroom/brand/BrandMark'
import {
  BUILT_IN_PLATFORM,
  DEFAULT_ROOM_CODE,
  PLATFORMS,
} from '../../data/classroom'
import { CLASSROOM_BRAND } from '../../data/classroomBrand'
import { useClassroomData } from '../../hooks/classroom/useClassroomData'
import { useClassTimer } from '../../hooks/classroom/useClassTimer'
import { useIsSpeaking } from '../../hooks/classroom/useIsSpeaking'
import {
  endRoomForEveryone,
  useLiveKitRoom,
} from '../../hooks/classroom/useLiveKitRoom'
import { useLocalMedia } from '../../hooks/classroom/useLocalMedia'
import { useRecording } from '../../hooks/classroom/useRecording'
import { useRoom } from '../../hooks/classroom/useRoom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { copyText } from '../../lib/classroom/clipboard'
import {
  deleteBadgeAward,
  markSessionLive,
  saveAlert,
  saveBadgeAward,
  saveProject,
  saveRecording,
  saveSessionEnd,
} from '../../lib/classroom/repository'
import { toast } from '../../lib/classroom/toast'
import { uid } from '../../lib/classroom/uid'
import type {
  Badge,
  BadgeAnnouncement,
  ClassAlert,
  ClassEndInfo,
  ClassEndReport,
  ClassModal,
  ClassroomData,
  GivenBadge,
  MenuAction,
  PanelName,
  Participant,
  SubmittedProject,
  ToolbarMenu,
} from '../../types/classroom'

const CELEBRATION_MS = 3200

const isWideScreen = () => window.matchMedia('(min-width: 1024px)').matches

const errorDetail = (error: unknown) =>
  error instanceof Error && error.message ? ` ${error.message}` : ''

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

/** /classroom/:classroomId: loads the class, then opens the room. */
export function ClassroomPage() {
  const { classroomId = DEFAULT_ROOM_CODE } = useParams()
  const query = useClassroomData(classroomId)

  if (query.isPending) {
    return <RoomMessage>Opening your classroom…</RoomMessage>
  }
  if (query.isError) {
    return (
      <RoomMessage
        title="Couldn’t open this class"
        action={{ label: 'Try again', onClick: () => void query.refetch() }}
      >
        {query.error.message || 'Check your connection and try again.'}
      </RoomMessage>
    )
  }
  // Remount per room so every piece of in-class state starts fresh.
  return <LiveClassroom key={classroomId} data={query.data} />
}

type RoomMessageProps = {
  title?: string
  action?: { label: string; onClick: () => void }
  children: string
}

/** Loading and error states, on the room's own navy ground. */
function RoomMessage({ title, action, children }: RoomMessageProps) {
  return (
    <main
      data-surface="stage"
      className="grid h-dvh place-items-center bg-stage bg-[url(/stage-bg.svg)] bg-cover bg-bottom p-4"
    >
      <div className="pop w-full max-w-[380px] rounded-[16px] bg-white p-7 text-center shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)]">
        <BrandMark size={44} className="mx-auto" />
        {title ? (
          <h1 className="mt-4 text-[19px] font-semibold text-ink">{title}</h1>
        ) : (
          <LoaderCircle
            size={22}
            aria-hidden="true"
            className="mx-auto mt-5 animate-spin text-brand"
          />
        )}
        <output className="mt-2 block text-[14.5px] text-ink-soft">
          {children}
        </output>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="press mt-6 h-10 w-full rounded-[10px] bg-brand text-[15px] font-medium text-white hover:bg-brand-strong"
          >
            {action.label}
          </button>
        )}
      </div>
    </main>
  )
}

/** The live classroom: class bar, video room, side panels and modals. */
function LiveClassroom({ data }: { data: ClassroomData }) {
  const { classroom, students, viewer, badges, activities, material } = data
  const classroomId = classroom.id
  const sessionId = classroom.sessionId
  const [params] = useSearchParams()
  const guestJoin = params.get('join') === '1'
  // The host (admin or this class's tutor) runs the class and can end it for
  // everyone; everyone else is a participant who can only leave. A ?join=1
  // invite always opens the participant view.
  const teacherMode = viewer.canHost && !guestJoin
  // Saved to Supabase only for a real session run by staff.
  const persist = data.source === 'live' && teacherMode && !!sessionId

  const [name, setName] = useState(() => {
    if (teacherMode) {
      return params.get('name')?.trim() || viewer.name || classroom.teacher.name
    }
    return viewer.name ?? ''
  })
  const [joinStarted, setJoinStarted] = useState(() => !!name)
  const [selfId] = useState(uid)

  const media = useLocalMedia()
  const speaking = useIsSpeaking(media.mic)
  const timer = useClassTimer(classroomId)

  const latest = useRef({ classroom, students, viewer })
  useEffect(() => {
    latest.current = { classroom, students, viewer }
  })
  const recording = useRecording({
    micStream: media.mic,
    classroomId,
    upload:
      persist && sessionId
        ? async (result) => {
            const current = latest.current
            const only =
              current.students.length === 1 ? current.students[0] : null
            await saveRecording({
              sessionId,
              roomCode: classroomId,
              title: `${current.classroom.title} · ${new Date().toLocaleDateString()}`,
              blob: result.blob,
              extension: result.extension,
              tutorId: current.viewer.userId,
              studentId: only?.userId ?? null,
            })
          }
        : undefined,
  })

  // Class details is open on arrival for the teacher (desktop only; it overlays on small screens).
  const [panel, setPanel] = useState<PanelName | null>(() =>
    teacherMode && isWideScreen() ? 'details' : null,
  )
  const [modal, setModal] = useState<ClassModal | null>(null)
  const [modalKey, setModalKey] = useState(0)
  const [toolbarMenu, setToolbarMenu] = useState<ToolbarMenu | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [hand, setHand] = useState(false)
  const [platformId, setPlatformId] = useState(BUILT_IN_PLATFORM.id)
  const [selectedStudentId, setSelectedStudentId] = useState(
    students[0]?.id ?? null,
  )
  const [projects, setProjects] = useState<SubmittedProject[]>(data.projects)
  const [badgesGiven, setBadgesGiven] = useState<GivenBadge[]>(data.awards)
  const [celebration, setCelebration] = useState<BadgeAnnouncement | null>(null)
  const celebrationTimer = useRef(0)
  const [alertSentAt, setAlertSentAt] = useState<
    Partial<Record<string, number>>
  >({})
  const [chatDraft, setChatDraft] = useState('')
  const [chatSeenAt, setChatSeenAt] = useState(0)
  const [ended, setEnded] = useState<ClassEndInfo | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const student =
    students.find((candidate) => candidate.id === selectedStudentId) ??
    students[0] ??
    null

  useDocumentTitle(`${classroom.pageTitle} | ${CLASSROOM_BRAND.name}`)

  // The teacher opened the room: mark the session live (once per visit).
  useEffect(() => {
    if (persist && sessionId && joinStarted) void markSessionLive(sessionId)
  }, [persist, sessionId, joinStarted])

  useEffect(() => () => clearTimeout(celebrationTimer.current), [])

  const celebrate = (award: BadgeAnnouncement) => {
    clearTimeout(celebrationTimer.current)
    setCelebration(award)
    celebrationTimer.current = window.setTimeout(
      () => setCelebration(null),
      CELEBRATION_MS,
    )
  }

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
    // The host's "end" message and the server closing the room can both
    // arrive; keep the first, which names who ended it.
    setEnded((current) => current ?? { elapsedMs: timer.elapsedMs, ...info })
  }

  const liveRoom = useLiveKitRoom({
    roomId: classroomId,
    identity: selfId,
    name,
    role: teacherMode ? 'host' : 'participant',
    onRoomClosed: () => finish({ reason: 'ended', by: null }),
    enabled: !ended && joinStarted,
    camera: media.cam,
    microphone: media.mic,
    screen: media.screen,
  })
  const room = useRoom({
    roomId: classroomId,
    self,
    enabled: !ended && joinStarted,
    connected: liveRoom.connection === 'connected',
    sendMessage: liveRoom.sendMessage,
    onRemoteEnd: (from) => finish({ reason: 'ended', by: from.name }),
    onBadge: (award) => {
      celebrate(award)
      toast(`${award.studentName} earned “${award.name}”`)
    },
  })
  const { setMessageHandler } = liveRoom
  const { receiveMessage } = room
  useEffect(() => {
    setMessageHandler(receiveMessage)
  }, [setMessageHandler, receiveMessage])

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
    if (!student) return
    const entry: GivenBadge = {
      ...badge,
      key: uid(),
      at: Date.now(),
      studentId: student.id,
      studentName: student.name,
      saved: !persist,
    }
    setBadgesGiven((given) => [entry, ...given])
    const announcement: BadgeAnnouncement = {
      id: entry.key,
      name: badge.name,
      icon: badge.icon,
      ornament: badge.ornament,
      studentName: student.name,
    }
    celebrate(announcement)
    room.announceBadge(announcement)

    // The saved row's id, once Supabase has it (null if not saved).
    const saving: Promise<string | null> =
      persist && sessionId
        ? saveBadgeAward(sessionId, student.id, badge.id).then(
            ({ id, at }) => {
              setBadgesGiven((given) =>
                given.map((item) =>
                  item.key === entry.key
                    ? { ...item, key: id, at, saved: true }
                    : item,
                ),
              )
              return id
            },
            (error: unknown) => {
              setBadgesGiven((given) =>
                given.filter((item) => item.key !== entry.key),
              )
              toast(`Couldn’t save the badge.${errorDetail(error)}`)
              return null
            },
          )
        : Promise.resolve(null)

    toast(`${badge.name} given to ${student.name}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setBadgesGiven((given) =>
            given.filter((item) => item.key !== entry.key),
          )
          void saving.then(async (savedId) => {
            if (!savedId) return
            setBadgesGiven((given) =>
              given.filter((item) => item.key !== savedId),
            )
            try {
              await deleteBadgeAward(savedId)
            } catch (error) {
              toast(`Couldn’t undo the badge.${errorDetail(error)}`)
            }
          })
        },
      },
    })
  }

  const submitProject = async (draft: ProjectDraft) => {
    const target = students.find(
      (candidate) => candidate.id === draft.studentId,
    )
    if (!target) return
    try {
      const saved =
        persist && sessionId
          ? await saveProject(sessionId, draft)
          : { id: uid(), at: Date.now() }
      setProjects((current) => [
        {
          id: saved.id,
          at: saved.at,
          activity: draft.activity,
          link: draft.link,
          note: draft.note,
          studentId: target.id,
          studentName: target.name,
        },
        ...current,
      ])
      setModal(null)
      toast(`Project submitted for ${target.name}`)
    } catch (error) {
      toast(`Couldn’t submit the project.${errorDetail(error)}`)
    }
  }

  const sendAlert = (alert: ClassAlert) => {
    setAlertSentAt((sent) => ({ ...sent, [alert.id]: Date.now() }))
    const alertType =
      alert.id === 'ac' || alert.id === 'support' ? alert.id : null
    if (!persist || !sessionId || !alertType) {
      toast(alert.sent)
      return
    }
    saveAlert(sessionId, alertType).then(
      () => toast(alert.sent),
      (error: unknown) => {
        // Let the teacher try again straight away.
        setAlertSentAt((sent) => ({ ...sent, [alert.id]: undefined }))
        toast(`Couldn’t send the alert.${errorDetail(error)}`)
      },
    )
  }

  const endClass = async (report: ClassEndReport) => {
    if (persist && sessionId) {
      await saveSessionEnd(sessionId, report, timer.elapsedMs, students)
    }
    // Tell everyone who ended it, then close the room on the server so
    // nobody stays connected.
    await room.endForAll()
    if (liveRoom.connection === 'connected') {
      try {
        await endRoomForEveryone(classroomId)
      } catch (error) {
        toast(`Couldn’t close the room for everyone.${errorDetail(error)}`)
        throw error
      }
    }
    finish({ reason: 'ended', by: null, report })
  }

  const roomLink = `${window.location.origin}/classroom/${classroomId}`
  const guestLink = `${roomLink}?join=1`
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
      label: 'Share call invite',
      icon: Share2,
      onSelect: () => openModal('share'),
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
        // A participant can rejoin after leaving, not after the class ended.
        canRejoin={ended.reason === 'left' || teacherMode}
        onRejoin={() => {
          if (ended.reason === 'ended') timer.restart()
          setEnded(null)
        }}
      />
    )
  }

  if (!joinStarted) {
    return (
      <GuestJoinScreen
        roomTitle={classroom.title}
        onJoin={(displayName) => {
          setName(displayName)
          setJoinStarted(true)
        }}
      />
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ClassToolbar
        classroom={classroom}
        mode={teacherMode ? 'teacher' : 'learner'}
        studentName={student?.name ?? null}
        badges={badges}
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
        onLeave={() => finish({ reason: 'left' })}
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
          onShareCall={() => openModal('share')}
          reactions={room.reactions}
          celebration={celebration}
          recording={recording}
          canRecord={teacherMode}
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

        {teacherMode && panel === 'details' && (
          <ClassDetailsPanel
            classroomId={classroomId}
            source={data.source}
            students={students}
            student={student}
            onSelectStudent={setSelectedStudentId}
            material={material}
            activities={activities}
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

      {teacherMode && helpOpen && (
        <NeedHelpWidget onClose={() => setHelpOpen(false)} />
      )}

      {teacherMode && (
        <>
          <SubmitProjectModal
            key={`submit-${modalKey}`}
            open={modal === 'submit'}
            onClose={() => setModal(null)}
            students={students}
            initialStudentId={student?.id ?? null}
            activities={activities}
            onSubmit={submitProject}
          />
          {student && (
            <AiToolsModal
              key={`ai-${modalKey}`}
              open={modal === 'ai'}
              onClose={() => setModal(null)}
              student={student}
              activities={activities}
              onSendToChat={(text) => {
                room.sendChat(text)
                setModal(null)
                setChatSeenAt(Date.now())
                setPanel('chat')
              }}
            />
          )}
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
          <EndClassModal
            key={`end-${modalKey}`}
            open={modal === 'end'}
            onClose={() => setModal(null)}
            elapsedMs={timer.elapsedMs}
            recording={recording.active}
            students={students}
            recommendedMinutes={classroom.recommendedMinutes}
            present={participants
              .filter((person) => !person.isSelf)
              .map((person) => person.name)}
            platformId={platformId}
            onConfirm={endClass}
          />
        </>
      )}
      <SettingsModal
        open={modal === 'settings'}
        onClose={() => setModal(null)}
        media={media}
      />
      <ShareCallModal
        open={modal === 'share'}
        onClose={() => setModal(null)}
        guestLink={guestLink}
      />
    </div>
  )
}
