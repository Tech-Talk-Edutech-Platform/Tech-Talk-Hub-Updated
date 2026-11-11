import { useState } from 'react'
import { ExternalLink, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatClock } from '../../../lib/classroom/time'
import type {
  Activity,
  ClassMaterial,
  ClassroomSource,
  GivenBadge,
  Student,
  SubmittedProject,
} from '../../../types/classroom'
import { BadgeMedal } from '../ui/BadgeMedal'
import { AccordionSection } from './details/AccordionSection'
import { ActivitiesList } from './details/ActivitiesList'
import { MaterialContent } from './details/MaterialContent'
import { SectionEmpty } from './details/SectionEmpty'
import { StudentInfo } from './details/StudentInfo'
import { SidePanel } from './SidePanel'
import { SpecialRequirementTag } from './SpecialRequirementTag'

type DetailsSection =
  'activities' | 'material' | 'student' | 'projects' | 'badges'

type ClassDetailsPanelProps = {
  classroomId: string
  source: ClassroomSource
  students: Student[]
  /** The student badges and projects go to; null when nobody is booked. */
  student: Student | null
  onSelectStudent: (id: string) => void
  material: ClassMaterial | null
  activities: Activity[]
  now: number
  projects: SubmittedProject[]
  badgesGiven: GivenBadge[]
  onClose: () => void
  onOpenSubmit: () => void
  onOpenAiTools: () => void
  onOpenBadges: () => void
}

const SOURCE_NOTES: Partial<Record<ClassroomSource, string>> = {
  sample:
    'Sample class. Apply the classroom migration in Supabase to run real classes; nothing here is saved.',
  unlinked:
    'This room isn’t linked to a class you teach. Create one in Dashboard › Classroom with this room code, or ask an admin to assign you.',
}

/** "Class details" (docs/breakdown/04-class-details-panel.md). One section open at a time. */
export function ClassDetailsPanel({
  classroomId,
  source,
  students,
  student,
  onSelectStudent,
  material,
  activities,
  now,
  projects,
  badgesGiven,
  onClose,
  onOpenSubmit,
  onOpenAiTools,
  onOpenBadges,
}: ClassDetailsPanelProps) {
  const [open, setOpen] = useState<DetailsSection | null>(null)
  const toggle = (name: DetailsSection) =>
    setOpen((current) => (current === name ? null : name))
  const note = SOURCE_NOTES[source]
  const studentProjects = student
    ? projects.filter((project) => project.studentId === student.id)
    : []

  return (
    <SidePanel
      title="Class details"
      labelId="class-details-title"
      onClose={onClose}
      footer={
        <div className="flex h-[60px] shrink-0 items-center border-t border-line px-4">
          <Link
            to="/classroom/tour"
            target="_blank"
            rel="noreferrer"
            className="group flex w-full items-center justify-between text-[15px] font-medium text-ink"
          >
            <span className="group-hover:text-brand">Classroom tour</span>
            <ExternalLink
              size={16}
              strokeWidth={2}
              aria-hidden="true"
              className="text-ink-soft group-hover:text-brand"
            />
          </Link>
        </div>
      }
    >
      {note && (
        <p className="mx-[9px] mt-3 flex gap-2 rounded-[10px] bg-info px-3 py-2.5 text-[12.5px] leading-[18px] text-info-ink">
          <Info
            size={14}
            strokeWidth={2.25}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <span>
            {note} Room code{' '}
            <span className="font-semibold tabular-nums">{classroomId}</span>.
          </span>
        </p>
      )}

      {students.length > 1 && (
        <fieldset className="mx-[9px] mt-3 flex [scrollbar-width:none] gap-1 overflow-x-auto rounded-[10px] bg-surface-2 p-1">
          <legend className="sr-only">Student</legend>
          {students.map((candidate) => {
            const selected = candidate.id === student?.id
            return (
              <label
                key={candidate.id}
                className={`press min-w-0 shrink-0 cursor-pointer truncate rounded-[8px] px-2.5 py-1.5 text-[13px] font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                  selected
                    ? 'bg-white text-brand shadow-[0_1px_2px_rgb(15_23_42/0.08)]'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <input
                  type="radio"
                  name={`classroom-student-${classroomId}`}
                  value={candidate.id}
                  checked={selected}
                  onChange={() => onSelectStudent(candidate.id)}
                  className="sr-only"
                />
                {candidate.name}
              </label>
            )
          })}
        </fieldset>
      )}

      <div className="px-[9px]">
        <AccordionSection
          title="Classroom activities"
          open={open === 'activities'}
          onToggle={() => toggle('activities')}
        >
          <ActivitiesList activities={activities} />
        </AccordionSection>

        <AccordionSection
          title="Classroom material"
          open={open === 'material'}
          onToggle={() => toggle('material')}
        >
          {material ? (
            <>
              <Link
                to={`/classroom/${classroomId}/material`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand hover:underline"
              >
                <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                Open in new tab
              </Link>
              <MaterialContent material={material} />
            </>
          ) : (
            <SectionEmpty>
              No lesson material is linked to this class. Pick one for the
              session in Dashboard › Classroom.
            </SectionEmpty>
          )}
        </AccordionSection>

        <AccordionSection
          title="Student info"
          aside={student?.specialRequirement ? <SpecialRequirementTag /> : null}
          open={open === 'student'}
          onToggle={() => toggle('student')}
        >
          {student ? (
            <StudentInfo
              student={student}
              now={now}
              onOpenAiTools={onOpenAiTools}
              onGiveBadge={onOpenBadges}
            />
          ) : (
            <SectionEmpty>
              No students are booked into this class. Add them to the session in
              Dashboard › Classroom.
            </SectionEmpty>
          )}
        </AccordionSection>

        <AccordionSection
          title="Student projects"
          open={open === 'projects'}
          onToggle={() => toggle('projects')}
        >
          {studentProjects.length ? (
            <ul className="space-y-2.5">
              {studentProjects.map((project) => (
                <li
                  key={project.id}
                  className="rounded-[10px] bg-surface-2 px-3 py-2.5"
                >
                  <p className="text-[14px] font-semibold text-ink">
                    {project.activity}
                  </p>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[13px] break-all text-brand hover:underline"
                  >
                    {project.link}
                  </a>
                  {project.note && (
                    <p className="mt-1 text-[13px] leading-5 text-ink-soft">
                      {project.note}
                    </p>
                  )}
                  <p className="mt-1 text-[12px] text-muted tabular-nums">
                    Submitted {formatClock(project.at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : student ? (
            <SectionEmpty
              action={{ label: 'Submit project', onClick: onOpenSubmit }}
            >
              No projects submitted for {student.name} yet.
            </SectionEmpty>
          ) : (
            <SectionEmpty>No students to submit projects for.</SectionEmpty>
          )}
        </AccordionSection>

        <AccordionSection
          title="Badges given to students"
          open={open === 'badges'}
          onToggle={() => toggle('badges')}
        >
          {badgesGiven.length ? (
            <ul className="space-y-1">
              {badgesGiven.map((badge) => (
                <li
                  key={badge.key}
                  className={`flex items-center gap-2.5 transition-opacity ${badge.saved ? '' : 'opacity-60'}`}
                >
                  <BadgeMedal icon={badge.icon} ornament="none" size={40} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">
                      {badge.name}
                    </p>
                    <p className="text-[12.5px] text-muted tabular-nums">
                      {badge.studentName} · {formatClock(badge.at)}
                      {badge.saved ? '' : ' · saving…'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <SectionEmpty
              action={
                student
                  ? { label: 'Give badge', onClick: onOpenBadges }
                  : undefined
              }
            >
              No badges given in this class yet.
            </SectionEmpty>
          )}
        </AccordionSection>
      </div>
    </SidePanel>
  )
}
