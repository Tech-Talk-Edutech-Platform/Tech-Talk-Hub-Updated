import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatClock } from '../../../lib/classroom/time'
import type {
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
  student: Student
  now: number
  projects: SubmittedProject[]
  badgesGiven: GivenBadge[]
  onClose: () => void
  onOpenSubmit: () => void
  onOpenAiTools: () => void
  onOpenBadges: () => void
}

/** "Class details" (docs/breakdown/04-class-details-panel.md). One section open at a time. */
export function ClassDetailsPanel({
  classroomId,
  student,
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

  return (
    <SidePanel
      title="Class details"
      labelId="class-details-title"
      onClose={onClose}
      footer={
        <div className="border-line flex h-[68px] shrink-0 items-center border-t px-4">
          <Link
            to="/classroom/tour"
            target="_blank"
            rel="noreferrer"
            className="text-ink group flex w-full items-center justify-between text-[15px] font-medium"
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
      <div className="px-[9px]">
        <AccordionSection
          title="Classroom activities"
          open={open === 'activities'}
          onToggle={() => toggle('activities')}
        >
          <ActivitiesList />
        </AccordionSection>

        <AccordionSection
          title="Classroom material"
          open={open === 'material'}
          onToggle={() => toggle('material')}
        >
          <Link
            to={`/classroom/${classroomId}/material`}
            target="_blank"
            className="text-brand inline-flex items-center gap-1.5 text-[13.5px] font-medium hover:underline"
          >
            <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
            Open in new tab
          </Link>
          <MaterialContent />
        </AccordionSection>

        <AccordionSection
          title="Student info"
          aside={<SpecialRequirementTag />}
          open={open === 'student'}
          onToggle={() => toggle('student')}
        >
          <StudentInfo
            student={student}
            now={now}
            onOpenAiTools={onOpenAiTools}
            onGiveBadge={onOpenBadges}
          />
        </AccordionSection>

        <AccordionSection
          title="Student projects"
          open={open === 'projects'}
          onToggle={() => toggle('projects')}
        >
          {projects.length ? (
            <ul className="space-y-2.5">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="bg-surface-2 rounded-[6px] px-3 py-2.5"
                >
                  <p className="text-ink text-[14px] font-semibold">
                    {project.activity}
                  </p>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand block break-all text-[13px] hover:underline"
                  >
                    {project.link}
                  </a>
                  {project.note && (
                    <p className="text-ink-soft mt-1 text-[13px] leading-5">
                      {project.note}
                    </p>
                  )}
                  <p className="text-muted mt-1 text-[12px] tabular-nums">
                    Submitted {formatClock(project.at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <SectionEmpty
              action={{ label: 'Submit project', onClick: onOpenSubmit }}
            >
              No projects submitted for {student.name} yet.
            </SectionEmpty>
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
                <li key={badge.key} className="flex items-center gap-2.5">
                  <BadgeMedal icon={badge.icon} ornament="none" size={40} />
                  <div className="min-w-0">
                    <p className="text-ink text-[14px] font-semibold">
                      {badge.name}
                    </p>
                    <p className="text-muted text-[12.5px] tabular-nums">
                      {student.name} · {formatClock(badge.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <SectionEmpty
              action={{ label: 'Give badge', onClick: onOpenBadges }}
            >
              No badges given in this class yet.
            </SectionEmpty>
          )}
        </AccordionSection>
      </div>
    </SidePanel>
  )
}
