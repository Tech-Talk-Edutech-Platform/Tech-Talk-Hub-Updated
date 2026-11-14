import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Ban, ImagePlus, LoaderCircle } from 'lucide-react'

import {
  BACKGROUND_PRESETS,
  backgroundEffectsSupported,
  NO_EFFECT,
  presetEffect,
  sameEffect,
  type BackgroundEffect,
} from '../../../lib/classroom/backgroundEffects'

type BackgroundPickerProps = {
  value: BackgroundEffect
  onChange: (effect: BackgroundEffect) => void
  /** The camera is on and the chosen effect is still starting. */
  applying: boolean
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

/** Blur or replace the camera background; part of the classroom Settings. */
export function BackgroundPicker({
  value,
  onChange,
  applying,
}: BackgroundPickerProps) {
  const [supported] = useState(backgroundEffectsSupported)
  const [upload, setUpload] = useState<BackgroundEffect | null>(() =>
    value.kind === 'image' && !value.src.startsWith('preset:') ? value : null,
  )
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  if (!supported) {
    return (
      <p className="mt-6 text-[13px] leading-[19px] text-muted">
        Background blur isn’t available in this browser. Use a recent Chrome,
        Edge or Firefox to blur or replace your background.
      </p>
    )
  }

  const choose = (effect: BackgroundEffect) => {
    setUploadError(null)
    onChange(effect)
  }

  const options: {
    key: string
    label: string
    effect: BackgroundEffect
    swatch: ReactNode
  }[] = [
    {
      key: 'none',
      label: 'No effect',
      effect: NO_EFFECT,
      swatch: <Ban size={20} aria-hidden className="text-ink-soft" />,
    },
    {
      key: 'blur-light',
      label: 'Slight blur',
      effect: { kind: 'blur', amount: 'light' },
      swatch: <BlurSwatch strength={3} />,
    },
    {
      key: 'blur-strong',
      label: 'Blur',
      effect: { kind: 'blur', amount: 'strong' },
      swatch: <BlurSwatch strength={7} />,
    },
    ...BACKGROUND_PRESETS.map((preset) => ({
      key: preset.id,
      label: preset.label,
      effect: presetEffect(preset.id),
      swatch: (
        <span
          aria-hidden
          className="block size-full"
          style={{ background: preset.css }}
        />
      ),
    })),
    ...(upload
      ? [
          {
            key: 'upload',
            label: 'Your picture',
            effect: upload,
            swatch: upload.kind === 'image' && (
              <img src={upload.src} alt="" className="size-full object-cover" />
            ),
          },
        ]
      : []),
  ]

  return (
    <fieldset className="mt-6">
      <legend className="flex items-center gap-2 text-[15px] font-medium text-ink">
        Background
        {applying && (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-normal text-muted">
            <LoaderCircle size={13} className="animate-spin" aria-hidden />
            Applying…
          </span>
        )}
      </legend>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {options.map((option) => {
          const selected = sameEffect(option.effect, value)
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              aria-label={option.label}
              title={option.label}
              onClick={() => choose(option.effect)}
              className={`press grid aspect-video place-items-center overflow-hidden rounded-[8px] bg-surface-2 outline-offset-2 ${
                selected
                  ? 'ring-2 ring-[var(--color-brand)]'
                  : 'ring-1 ring-line hover:ring-[var(--color-brand-faded)]'
              }`}
            >
              {option.swatch}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-label="Upload a background picture"
          title="Upload a picture"
          className="press grid aspect-video place-items-center rounded-[8px] bg-surface-2 text-ink-soft ring-1 ring-line hover:ring-[var(--color-brand-faded)]"
        >
          <ImagePlus size={20} aria-hidden />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            if (!file.type.startsWith('image/')) {
              setUploadError('Choose a PNG, JPG or WebP picture.')
              return
            }
            if (file.size > MAX_UPLOAD_BYTES) {
              setUploadError('That picture is over 8 MB. Choose a smaller one.')
              return
            }
            const effect: BackgroundEffect = {
              kind: 'image',
              id: `upload-${Date.now()}`,
              label: file.name,
              src: URL.createObjectURL(file),
            }
            // Free the picture this one replaces. The current one stays: the
            // camera keeps using it after Settings closes.
            if (upload?.kind === 'image' && upload.src.startsWith('blob:')) {
              URL.revokeObjectURL(upload.src)
            }
            setUpload(effect)
            choose(effect)
          }}
        />
      </div>
      {uploadError ? (
        <p role="alert" className="mt-2 text-[12.5px] text-danger-ink">
          {uploadError}
        </p>
      ) : (
        <p className="mt-2 text-[12.5px] leading-[18px] text-muted">
          Runs on this device; your video isn’t sent anywhere else. Students see
          the effect too.
        </p>
      )}
    </fieldset>
  )
}

/** A tiny "blurred room" thumbnail. */
function BlurSwatch({ strength }: { strength: number }) {
  return (
    <span aria-hidden className="relative block size-full overflow-hidden">
      <span
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(120deg, #94a3b8 0 30%, #e2e8f0 30% 55%, #64748b 55%)',
          filter: `blur(${strength}px)`,
          transform: 'scale(1.2)',
        }}
      />
      <span className="absolute bottom-0 left-1/2 h-[70%] w-[38%] -translate-x-1/2 rounded-t-full bg-[#334155]" />
    </span>
  )
}
