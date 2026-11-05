import { ArrowUpRight, OctagonX } from 'lucide-react'
import { MATERIAL } from '../../../../data/classroom'

type MaterialContentProps = {
  /** The full-page view uses larger type. */
  wide?: boolean
}

/**
 * "Classroom material": outcome, outline, the teacher-only agenda and the links
 * table. Shared by the side panel and the full-page view ("Open in new tab").
 */
export function MaterialContent({ wide = false }: MaterialContentProps) {
  const heading = wide ? 'text-[18px]' : 'text-[15px]'
  const body = wide
    ? 'text-[16px] leading-[26px]'
    : 'text-[13.5px] leading-[21px]'

  return (
    <div className="text-ink">
      <h4 className={`${heading} mt-3 font-semibold`}>Outcome</h4>
      <ul className={`mt-1 list-disc pl-10 ${body} text-ink-soft`}>
        {MATERIAL.outcome.map((outcome) => (
          <li key={outcome}>{outcome}</li>
        ))}
      </ul>

      <h4 className={`${heading} mt-6 font-semibold`}>Outline</h4>
      <p className={`mt-1 ${body} text-ink-soft`}>{MATERIAL.outline}</p>

      <h4 className={`${heading} mt-6 font-semibold`}>Agenda</h4>
      <div className="mt-3 rounded-[4px] bg-warning-soft px-3 py-2.5 text-[13px] leading-[19px] text-warning-ink">
        <OctagonX
          size={14}
          strokeWidth={2.5}
          aria-hidden="true"
          className="-mt-0.5 mr-1 inline text-brand"
        />
        <strong className="font-semibold text-ink">
          {MATERIAL.agendaWarning.title}
        </strong>{' '}
        {MATERIAL.agendaWarning.body}
      </div>
      <ol className={`mt-3 space-y-1.5 ${body}`}>
        {MATERIAL.agenda.map((item) => (
          <li key={item.step} className="flex gap-3">
            <span className="w-12 shrink-0 text-muted tabular-nums">
              {item.minutes} min
            </span>
            <span className="text-ink-soft">{item.step}</span>
          </li>
        ))}
      </ol>

      <table
        className={`mt-6 w-full border-collapse border border-line-strong ${wide ? 'text-[15px]' : 'text-[12.5px]'}`}
      >
        <caption className="bg-ink px-3 py-2.5 text-left text-[11px] font-bold tracking-[0.03em] text-white uppercase">
          Important links / resources
        </caption>
        <tbody>
          {MATERIAL.links.map((row) => (
            <tr
              key={row.label}
              className="border-t border-line-strong align-middle"
            >
              <th
                scope="row"
                className="w-[45%] border-r border-line-strong px-3 py-3 text-left leading-[18px] font-semibold"
              >
                {row.isNew && (
                  <span className="mr-1 rounded-[3px] bg-brand px-1 py-px text-[9.5px] font-bold text-white">
                    New
                  </span>
                )}
                {row.label}
              </th>
              <td className="px-3 py-3 leading-[18px]">
                {row.items.map((item, i) => (
                  <span key={item.text}>
                    {i > 0 && <span className="mx-1 text-faint">|</span>}
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`font-semibold text-brand hover:underline ${item.underline ? 'underline' : ''}`}
                    >
                      {item.text}
                      <ArrowUpRight
                        size={11}
                        strokeWidth={2.5}
                        aria-hidden="true"
                        className="ml-0.5 inline"
                      />
                    </a>
                  </span>
                ))}
                {row.note && <p className="mt-1 text-muted">{row.note}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
