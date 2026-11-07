import { useContext, type ReactNode } from 'react'

import { ArticleSourceContext } from '../../../context/ArticleSourceContext'
import {
  createHeadingId,
  getNodeText,
  shouldShowAgeCards,
  shouldShowBenefitsCards,
  shouldShowChecklist,
} from '../../../lib/blog'
import { AgeGroupCards } from './AgeGroupCards'
import { BenefitsCards } from './BenefitsCards'
import { LearningChecklist } from './LearningChecklist'

type ArticleSectionHeadingProps = {
  children?: ReactNode
}

/** A `##` heading, followed by the inline cards its topic calls for. */
export function ArticleSectionHeading({
  children,
}: ArticleSectionHeadingProps) {
  const content = useContext(ArticleSourceContext)
  const title = getNodeText(children)

  return (
    <>
      <h2
        id={createHeadingId(title)}
        className="mt-14 mb-5 scroll-mt-28 text-2xl leading-tight font-black text-[#2947C7] sm:text-3xl"
      >
        {children}
      </h2>
      {shouldShowAgeCards(title, content) && <AgeGroupCards />}
      {shouldShowBenefitsCards(title) && <BenefitsCards />}
      {shouldShowChecklist(title) && <LearningChecklist />}
    </>
  )
}
