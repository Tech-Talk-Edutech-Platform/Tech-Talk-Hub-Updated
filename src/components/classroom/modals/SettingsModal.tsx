import { useState } from 'react'
import { useAudioMeter } from '../../../hooks/classroom/useAudioMeter'
import type { LocalMedia } from '../../../hooks/classroom/useLocalMedia'
import {
  autoPipSupported,
  setAutoPip,
  useAutoPip,
} from '../../../lib/classroom/autoPip'
import type { SelectOption } from '../../../types/classroom'
import { VideoView } from '../stage/VideoView'
import { BackgroundPicker } from './BackgroundPicker'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

/** Device options, named "Camera 1", "Camera 2"… until access reveals labels. */
function deviceOptions(
  list: MediaDeviceInfo[],
  fallback: string,
  empty: string,
): SelectOption[] {
  if (!list.length) return [{ value: '', label: empty }]
  return list.map((device, i) => ({
    value: device.deviceId,
    label: device.label || `${fallback} ${i + 1}`,
  }))
}

type SettingsModalProps = {
  open: boolean
  onClose: () => void
  media: LocalMedia
}

/**
 * Camera, microphone, background and Picture in Picture, with a live preview
 * and mic meter. On a short or zoomed-in screen the modal scrolls and the
 * preview stays pinned (smaller) at the top, so a background can be picked
 * while watching it apply.
 */
export function SettingsModal({ open, onClose, media }: SettingsModalProps) {
  const level = useAudioMeter(open ? media.mic : null)
  const { devices, deviceIds } = media

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      labelledBy="settings-title"
    >
      <h2 id="settings-title" className="text-[20px] font-semibold text-ink">
        Settings
      </h2>

      <div className="sticky top-0 z-[5] -mx-10 mt-2 bg-white px-10 py-3 max-sm:-mx-6 max-sm:px-6">
        <div className="mx-auto aspect-video w-full max-w-[calc(30dvh*16/9)] overflow-hidden rounded-[8px] bg-stage">
          {media.cam ? (
            <VideoView stream={media.cam} mirror={media.mirror} />
          ) : media.pending.cam ? (
            <div className="grid size-full place-items-center text-[14px] text-white/90">
              Starting your camera…
            </div>
          ) : (
            <div className="grid size-full place-items-center text-center text-[14px] text-white/90">
              <div>
                <p>Your camera is off</p>
                <button
                  type="button"
                  onClick={media.toggleCam}
                  className="press mt-3 h-9 rounded-[8px] bg-white px-3.5 text-[14px] font-medium text-stage hover:bg-white/90"
                >
                  Turn on camera
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-5 sm:grid-cols-2">
        <Select
          label="Camera"
          value={deviceIds.videoinput || devices.videoinput[0]?.deviceId || ''}
          onChange={(id) => media.chooseDevice('videoinput', id)}
          options={deviceOptions(
            devices.videoinput,
            'Camera',
            'No camera found',
          )}
        />
        <div>
          <Select
            label="Microphone"
            value={
              deviceIds.audioinput || devices.audioinput[0]?.deviceId || ''
            }
            onChange={(id) => media.chooseDevice('audioinput', id)}
            options={deviceOptions(
              devices.audioinput,
              'Microphone',
              'No microphone found',
            )}
          />
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a styled level bar; native <meter> can't be restyled consistently across browsers
            role="meter"
            aria-label="Microphone level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
          >
            <div
              className="h-full origin-left rounded-full bg-brand transition-transform duration-75"
              style={{ transform: `scaleX(${media.mic ? level : 0})` }}
            />
          </div>
          {!media.mic && (
            <p className="mt-1.5 text-[12.5px] text-muted">
              Unmute to test your microphone.
            </p>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-3 self-end pb-2 text-[15px] text-ink">
          <input
            type="checkbox"
            checked={media.mirror}
            onChange={(event) => media.setMirror(event.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Mirror my video
        </label>
      </div>
      <BackgroundPicker
        value={media.background}
        onChange={media.setBackground}
        applying={media.pending.cam && media.background.kind !== 'none'}
      />
      <PopOutSetting />
      {devices.videoinput.some((device) => !device.label) && (
        <p className="mt-4 text-[12.5px] leading-[18px] text-muted">
          Device names appear after you allow camera and microphone access.
        </p>
      )}
    </Modal>
  )
}

/** Automatic Picture in Picture on tab switch (Chrome and Edge). */
function PopOutSetting() {
  const on = useAutoPip()
  const [supported] = useState(autoPipSupported)

  return (
    <fieldset className="mt-6">
      <legend className="text-[15px] font-medium text-ink">
        Picture in Picture
      </legend>
      {supported ? (
        <div className="mt-3 flex items-start gap-3">
          <input
            id="auto-pip"
            type="checkbox"
            checked={on}
            onChange={(event) => setAutoPip(event.target.checked)}
            aria-describedby="auto-pip-hint"
            className="mt-[3px] size-4 shrink-0 cursor-pointer accent-[var(--color-brand)]"
          />
          <div>
            <label
              htmlFor="auto-pip"
              className="block cursor-pointer text-[15px] text-ink"
            >
              Pop the class out when I switch tabs
            </label>
            <p
              id="auto-pip-hint"
              className="mt-1 text-[12.5px] leading-[18px] text-muted"
            >
              Switch to another tab and a small window keeps the class on top,
              with no button to press. It tucks away when you come back. While
              this is on, your mic stays connected but muted from the moment you
              join (nothing is sent): Chrome only pops a class out while the mic
              or camera is in use.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[13px] leading-[19px] text-muted">
          This browser can’t pop the class out by itself. Use the Picture in
          Picture button at the top of the room, or join from Chrome or Edge.
        </p>
      )}
    </fieldset>
  )
}
