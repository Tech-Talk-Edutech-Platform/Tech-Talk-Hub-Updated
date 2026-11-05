import { ACTIVITIES } from '../../../../data/classroom'

/** "Classroom activities": numbered lesson activities with outline and project link. */
export function ActivitiesList() {
  return (
    <ol className="space-y-5 pl-1.5">
      {ACTIVITIES.map((activity, i) => (
        <li key={activity.id}>
          <h4 className="text-ink text-[15px] font-semibold leading-6">
            {i + 1}. {activity.title}
          </h4>
          <div className="pl-[14px]">
            <p className="text-ink mt-2 text-[14px] font-semibold">Outline:</p>
            <p className="text-ink-soft mt-0.5 text-[13.5px] leading-[21px]">
              {activity.outline}
            </p>
            <p className="text-ink mt-2 text-[14px] font-semibold">Project:</p>
            <a
              href={activity.project}
              target="_blank"
              rel="noreferrer"
              className="text-brand mt-0.5 block break-all text-[14.5px] leading-6 hover:underline"
            >
              {activity.project}
            </a>
          </div>
        </li>
      ))}
    </ol>
  )
}
