import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { useDismiss } from '../../../hooks/useDismiss'
import type { SelectOption } from '../../../types/classroom'

type SelectProps = {
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * Single-select listbox styled after the reference "Select activity" control:
 * placeholder, a divider, a chevron, and a menu that overflows the modal.
 */
export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  const labelId = useId()
  useDismiss([root], () => setOpen(false), open)

  const selected = options.find((option) => option.value === value)

  const openMenu = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    )
    setOpen(true)
  }

  const choose = (option: SelectOption | undefined) => {
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openMenu()
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(options[active])
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={root} className="relative">
      <div id={labelId} className="mb-2 text-[15px] font-medium text-ink">
        {label}
      </div>
      <button
        type="button"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- WAI-ARIA select-only combobox; a native <select> can't render this styled menu
        role="combobox"
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex h-10 w-full items-center rounded-[8px] border bg-white pl-2.5 text-left text-[15px] transition-colors duration-150 outline-none ${
          open
            ? 'border-brand'
            : 'border-line-strong hover:border-faint focus-visible:border-brand'
        }`}
      >
        <span
          className={`flex-1 truncate ${selected ? 'text-ink' : 'text-faint'}`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <span aria-hidden="true" className="h-5 w-px bg-line-strong" />
        <span className="grid w-9 place-items-center text-ink-soft">
          <ChevronDown size={18} strokeWidth={2} />
        </span>
      </button>
      {open && (
        <ul
          id={listId}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role -- the combobox's popup listbox (WAI-ARIA pattern)
          role="listbox"
          aria-labelledby={labelId}
          className="pop absolute top-full right-0 left-0 z-10 mt-1.5 max-h-[232px] origin-top overflow-y-auto rounded-[8px] bg-white py-1 shadow-[0_8px_28px_-6px_rgb(0_0_0/0.22),0_0_0_1px_rgb(0_0_0/0.06)]"
        >
          {options.map((option, i) => (
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard selection runs through the combobox (aria-activedescendant)
            <li
              key={option.value}
              id={`${listId}-${i}`}
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role -- an option of the listbox above
              role="option"
              aria-selected={option.value === value}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(option)}
              className={`flex h-10 cursor-pointer items-center px-3 text-[15px] text-ink ${
                i === active ? 'bg-brand-soft' : ''
              } ${option.value === value ? 'font-medium' : ''}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
