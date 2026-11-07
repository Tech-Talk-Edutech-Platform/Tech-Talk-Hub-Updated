import type { PolicyPageContent } from '../../types/policy'
import { InformationCard } from './InformationCard'
import { InformationPageLayout } from './InformationPageLayout'
import { PolicyContacts } from './PolicyContacts'

const NOTICE_CLASSES: Record<PolicyPageContent['noticeTone'], string> = {
  neutral: 'border-purple-100 bg-white text-slate-600',
  pink: 'border-pink-100 bg-pink-50 leading-7 text-[#172554]',
}

type PolicyPageProps = {
  content: PolicyPageContent
}

/** Renders a policy page (privacy, terms, child safety) from its content. */
export function PolicyPage({ content }: PolicyPageProps) {
  return (
    <InformationPageLayout
      badge={content.badge}
      title={content.title}
      highlightedText={content.highlightedText}
      description={content.description}
    >
      <div
        className={`mb-8 rounded-2xl border px-5 py-4 text-sm ${NOTICE_CLASSES[content.noticeTone]}`}
      >
        {content.notice}
      </div>

      <div className="space-y-6">
        {content.sections.map((section) => (
          <InformationCard
            key={section.title}
            icon={section.icon}
            title={section.title}
          >
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            {section.bullets && (
              <ul className="list-disc space-y-2 pl-5">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}

            {section.contacts && <PolicyContacts contacts={section.contacts} />}
          </InformationCard>
        ))}
      </div>
    </InformationPageLayout>
  )
}
