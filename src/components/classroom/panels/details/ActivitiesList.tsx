import { ACTIVITIES } from '../../../../data/classroom'

/** "Classroom activities": numbered lesson activities with outline and project link. */
export function ActivitiesList() {
  return (
    <ol className="space-y-5 pl-1.5">
      {ACTIVITIES.map((activity, i) => (
        <li key={activity.id}>
          <h4 className="text-[15px] leading-6 font-semibold text-ink">
            {i + 1}. {activity.title}
          </h4>
          <div className="pl-[14px]">
            <p className="mt-2 text-[14px] font-semibold text-ink">Outline:</p>
            <p className="mt-0.5 text-[13.5px] leading-[21px] text-ink-soft">
              {activity.outline}
            </p>
            <p className="mt-2 text-[14px] font-semibold text-ink">Project:</p>
            <a
              href={activity.project}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block text-[14.5px] leading-6 break-all text-brand hover:underline"
            >
              {activity.project}
            </a>
          </div>
        </li>
      ))}
    </ol>
  )
}
