import { BrandMark } from '../brand/BrandMark'

/** The support bot's round avatar beside its messages. */
export function BotAvatar() {
  return (
    <span className="grid size-[30px] shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06)]">
      <BrandMark size={30} radius={15} />
    </span>
  )
}
