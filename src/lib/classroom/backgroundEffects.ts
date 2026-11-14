import type { ImageSegmenter, MPMask } from '@mediapipe/tasks-vision'
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'

/**
 * Camera background effects: blur the room behind you or replace it.
 *
 * MediaPipe's selfie segmenter finds the person in each camera frame; the
 * frame is then redrawn on a canvas with the background blurred or swapped,
 * and the canvas becomes the camera stream everyone sees (your preview and
 * the published LiveKit track alike). Everything runs in the browser.
 */

export type BlurAmount = 'light' | 'strong'

export type BackgroundEffect =
  | { kind: 'none' }
  | { kind: 'blur'; amount: BlurAmount }
  | { kind: 'image'; id: string; label: string; src: string }

export const NO_EFFECT: BackgroundEffect = { kind: 'none' }

export const sameEffect = (a: BackgroundEffect, b: BackgroundEffect) => {
  if (a.kind === 'none' || b.kind === 'none') return a.kind === b.kind
  if (a.kind === 'blur' && b.kind === 'blur') return a.amount === b.amount
  if (a.kind === 'image' && b.kind === 'image') return a.id === b.id
  return false
}

/** Pixel radius of each blur at 720p; scaled to the camera's resolution. */
const BLUR_RADIUS: Record<BlurAmount, number> = { light: 8, strong: 18 }

/** Built-in backgrounds, drawn on the fly so they need no image files. */
export const BACKGROUND_PRESETS: readonly {
  id: string
  label: string
  /** CSS for the picker thumbnail; the canvas paints the same gradient. */
  css: string
  stops: readonly [number, string][]
  /** Gradient direction: degrees, like CSS `linear-gradient`. */
  angle: number
}[] = [
  {
    id: 'brand',
    label: 'Tech Talk purple',
    css: 'linear-gradient(135deg, #4c1d95, #9333ea 55%, #ec4899)',
    stops: [
      [0, '#4c1d95'],
      [0.55, '#9333ea'],
      [1, '#ec4899'],
    ],
    angle: 135,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    css: 'linear-gradient(160deg, #0c4a6e, #0891b2 60%, #5eead4)',
    stops: [
      [0, '#0c4a6e'],
      [0.6, '#0891b2'],
      [1, '#5eead4'],
    ],
    angle: 160,
  },
  {
    id: 'sunset',
    label: 'Sunset',
    css: 'linear-gradient(180deg, #f97316, #fb7185 55%, #7c3aed)',
    stops: [
      [0, '#f97316'],
      [0.55, '#fb7185'],
      [1, '#7c3aed'],
    ],
    angle: 180,
  },
  {
    id: 'studio',
    label: 'Studio grey',
    css: 'radial-gradient(circle at 50% 35%, #e2e8f0, #94a3b8 60%, #475569)',
    stops: [
      [0, '#e2e8f0'],
      [0.6, '#94a3b8'],
      [1, '#475569'],
    ],
    angle: -1,
  },
]

const presetSrc = (id: string) => `preset:${id}`

export function presetEffect(id: string): BackgroundEffect {
  const preset = BACKGROUND_PRESETS.find((candidate) => candidate.id === id)
  return {
    kind: 'image',
    id,
    label: preset?.label ?? id,
    src: presetSrc(id),
  }
}

// ── The segmentation model (loaded once, on first use) ───────────────────────

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'

let segmenterPromise: Promise<ImageSegmenter> | null = null

const segmenterOptions = (delegate: 'GPU' | 'CPU') => ({
  baseOptions: { modelAssetPath: MODEL_URL, delegate },
  runningMode: 'VIDEO' as const,
  outputConfidenceMasks: true,
  outputCategoryMask: false,
})

async function createSegmenter(): Promise<ImageSegmenter> {
  const { ImageSegmenter } = await import('@mediapipe/tasks-vision')
  const fileset = { wasmLoaderPath, wasmBinaryPath }
  try {
    return await ImageSegmenter.createFromOptions(
      fileset,
      segmenterOptions('GPU'),
    )
  } catch {
    // No WebGL2 (older devices, some VMs): the CPU is slower but works.
    return ImageSegmenter.createFromOptions(fileset, segmenterOptions('CPU'))
  }
}

/** Starts downloading the model early, e.g. when Settings opens. */
export function preloadBackgroundModel(): Promise<ImageSegmenter> {
  segmenterPromise ??= createSegmenter().catch((error: unknown) => {
    segmenterPromise = null
    throw error
  })
  return segmenterPromise
}

/** Whether this browser can run background effects at all. */
export function backgroundEffectsSupported(): boolean {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  return (
    typeof canvas.captureStream === 'function' &&
    typeof WebAssembly === 'object' &&
    typeof Worker === 'function'
  )
}

// ── Frame clock ──────────────────────────────────────────────────────────────

/**
 * Ticks ~30 times a second from a worker. requestAnimationFrame stops when
 * the tab is hidden, which would freeze the video students see whenever the
 * tutor switches tabs; worker timers keep running.
 */
function startTicker(fps: number, onTick: () => void): () => void {
  const source = `setInterval(() => postMessage(0), ${Math.round(1000 / fps)})`
  const url = URL.createObjectURL(
    new Blob([source], { type: 'text/javascript' }),
  )
  const worker = new Worker(url)
  worker.addEventListener('message', onTick)
  return () => {
    worker.terminate()
    URL.revokeObjectURL(url)
  }
}

// ── The processor ────────────────────────────────────────────────────────────

/** Width of the frame given to the model: small is fast, and edges are feathered anyway. */
const MASK_WIDTH = 256
const FPS = 30

function makeCanvas(width: number, height: number) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return element
}

function context2d(element: HTMLCanvasElement) {
  const ctx = element.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available.')
  return ctx
}

function paintPreset(
  ctx: CanvasRenderingContext2D,
  id: string,
  width: number,
  height: number,
) {
  const preset =
    BACKGROUND_PRESETS.find((candidate) => candidate.id === id) ??
    BACKGROUND_PRESETS[0]
  if (!preset) return
  let gradient: CanvasGradient
  if (preset.angle < 0) {
    gradient = ctx.createRadialGradient(
      width / 2,
      height * 0.35,
      0,
      width / 2,
      height * 0.35,
      Math.max(width, height) * 0.75,
    )
  } else {
    const radians = ((preset.angle - 90) * Math.PI) / 180
    const half = Math.hypot(width, height) / 2
    const dx = Math.cos(radians) * half
    const dy = Math.sin(radians) * half
    gradient = ctx.createLinearGradient(
      width / 2 - dx,
      height / 2 - dy,
      width / 2 + dx,
      height / 2 + dy,
    )
  }
  for (const [offset, color] of preset.stops)
    gradient.addColorStop(offset, color)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

/** Draws `image` to fill the canvas, cropping like CSS `object-fit: cover`. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  )
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  ctx.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  )
}

/** Which confidence mask holds "person" for the loaded model. */
function personMaskIndex(segmenter: ImageSegmenter, maskCount: number) {
  const labels = segmenter.getLabels().map((label) => label.toLowerCase())
  const named = labels.findIndex((label) =>
    /person|selfie|foreground|human/.test(label),
  )
  if (named >= 0 && named < maskCount) return named
  // Single output: the person's probability. Two: [background, person].
  return maskCount > 1 ? maskCount - 1 : 0
}

export class BackgroundProcessor {
  /** The processed camera; publish and preview this instead of the raw one. */
  readonly stream: MediaStream

  private readonly video: HTMLVideoElement
  private readonly output: HTMLCanvasElement
  private readonly outputCtx: CanvasRenderingContext2D
  private readonly small: HTMLCanvasElement
  private readonly smallCtx: CanvasRenderingContext2D
  private readonly mask: HTMLCanvasElement
  private readonly maskCtx: CanvasRenderingContext2D
  private readonly person: HTMLCanvasElement
  private readonly personCtx: CanvasRenderingContext2D
  private readonly blurFallback: HTMLCanvasElement
  private readonly blurFallbackCtx: CanvasRenderingContext2D
  private maskPixels: ImageData
  private effect: BackgroundEffect
  private image: HTMLImageElement | null = null
  private stopTicker: (() => void) | null = null
  private lastTimestamp = 0
  /** Votes on whether the model's mask needs flipping (see `checkOrientation`). */
  private orientationVotes = 0
  private invert = false
  private readonly filterSupported: boolean

  private constructor(
    private readonly segmenter: ImageSegmenter,
    source: MediaStream,
    effect: BackgroundEffect,
    width: number,
    height: number,
  ) {
    this.effect = effect
    this.video = document.createElement('video')
    this.video.muted = true
    this.video.playsInline = true
    this.video.srcObject = source

    this.output = makeCanvas(width, height)
    this.outputCtx = context2d(this.output)
    const maskHeight = Math.max(1, Math.round((MASK_WIDTH * height) / width))
    this.small = makeCanvas(MASK_WIDTH, maskHeight)
    this.smallCtx = context2d(this.small)
    this.mask = makeCanvas(MASK_WIDTH, maskHeight)
    this.maskCtx = context2d(this.mask)
    this.maskPixels = this.maskCtx.createImageData(MASK_WIDTH, maskHeight)
    this.person = makeCanvas(width, height)
    this.personCtx = context2d(this.person)
    this.blurFallback = makeCanvas(1, 1)
    this.blurFallbackCtx = context2d(this.blurFallback)
    this.filterSupported = typeof this.outputCtx.filter === 'string'

    this.stream = this.output.captureStream(FPS)
    this.loadImage(effect)
  }

  static async create(source: MediaStream, effect: BackgroundEffect) {
    const settings = source.getVideoTracks()[0]?.getSettings()
    const width = settings?.width ?? 1280
    const height = settings?.height ?? 720
    const segmenter = await preloadBackgroundModel()
    const processor = new BackgroundProcessor(
      segmenter,
      source,
      effect,
      width,
      height,
    )
    await processor.video.play()
    processor.renderFrame()
    processor.stopTicker = startTicker(FPS, () => processor.renderFrame())
    return processor
  }

  setEffect(effect: BackgroundEffect) {
    this.effect = effect
    this.loadImage(effect)
  }

  /** Stops the processed track. The raw camera belongs to the caller. */
  stop() {
    this.stopTicker?.()
    this.stopTicker = null
    for (const track of this.stream.getTracks()) track.stop()
    this.video.pause()
    this.video.srcObject = null
  }

  private loadImage(effect: BackgroundEffect) {
    if (effect.kind !== 'image' || effect.src.startsWith('preset:')) {
      this.image = null
      return
    }
    const image = new Image()
    image.decoding = 'async'
    image.src = effect.src
    image.addEventListener('load', () => {
      // Ignore a late load after the person picked something else.
      if (this.effect.kind === 'image' && this.effect.src === effect.src) {
        this.image = image
      }
    })
  }

  private renderFrame() {
    const { video } = this
    if (video.readyState < 2 || !video.videoWidth) return
    const { width, height } = this.output

    // Resolution changed (e.g. a different camera): follow it.
    if (video.videoWidth !== width || video.videoHeight !== height) {
      this.resize(video.videoWidth, video.videoHeight)
    }

    this.smallCtx.drawImage(video, 0, 0, this.small.width, this.small.height)
    const timestamp = Math.max(performance.now(), this.lastTimestamp + 1)
    this.lastTimestamp = timestamp

    let drewMask = false
    try {
      this.segmenter.segmentForVideo(this.small, timestamp, (result) => {
        const masks = result.confidenceMasks
        if (!masks?.length) return
        const index = personMaskIndex(this.segmenter, masks.length)
        const mask = masks[index]
        if (mask) {
          this.updateMask(mask)
          drewMask = true
        }
      })
    } catch (error) {
      console.error('Background segmentation failed:', error)
    }

    const ctx = this.outputCtx
    if (!drewMask) {
      // No mask this frame: show the camera rather than a frozen picture.
      ctx.drawImage(video, 0, 0, this.output.width, this.output.height)
      return
    }
    this.drawBackground()
    this.drawPerson()
  }

  private resize(width: number, height: number) {
    this.output.width = width
    this.output.height = height
    this.person.width = width
    this.person.height = height
    const maskHeight = Math.max(1, Math.round((MASK_WIDTH * height) / width))
    this.small.height = maskHeight
    this.mask.height = maskHeight
    this.maskPixels = this.maskCtx.createImageData(MASK_WIDTH, maskHeight)
  }

  /** Turns the model's confidences into an alpha mask, with softened edges. */
  private updateMask(mask: MPMask) {
    const values = mask.getAsFloat32Array()
    const pixels = this.maskPixels.data
    const count = Math.min(values.length, pixels.length / 4)
    this.checkOrientation(values, mask.width, mask.height)
    for (let i = 0; i < count; i += 1) {
      const raw = values[i] ?? 0
      const confidence = this.invert ? 1 - raw : raw
      // Below 0.25 is background, above 0.75 is person, ramp in between.
      const alpha = Math.min(1, Math.max(0, (confidence - 0.25) / 0.5))
      const offset = i * 4
      pixels[offset] = 255
      pixels[offset + 1] = 255
      pixels[offset + 2] = 255
      pixels[offset + 3] = Math.round(alpha * 255)
    }
    this.maskCtx.putImageData(this.maskPixels, 0, 0)
  }

  /**
   * Safety net for the model's output convention: in a webcam frame the top
   * corners are almost always background and the lower middle is the person.
   * If over the first frames the corners look "more person" than the middle,
   * the mask is the other way round, so flip it.
   */
  private checkOrientation(
    values: Float32Array,
    width: number,
    height: number,
  ) {
    if (Math.abs(this.orientationVotes) >= 20 || !width || !height) return
    const at = (x: number, y: number) =>
      values[Math.floor(y) * width + Math.floor(x)] ?? 0
    const corners =
      (at(width * 0.05, height * 0.05) + at(width * 0.95, height * 0.05)) / 2
    const middle = at(width * 0.5, height * 0.8)
    if (Math.abs(corners - middle) < 0.3) return
    this.orientationVotes += corners > middle ? 1 : -1
    this.invert = this.orientationVotes > 0
  }

  private drawBackground() {
    const ctx = this.outputCtx
    const { width, height } = this.output
    const { effect } = this

    if (effect.kind === 'image') {
      if (effect.src.startsWith('preset:')) {
        paintPreset(ctx, effect.src.slice('preset:'.length), width, height)
      } else if (this.image) {
        drawCover(ctx, this.image, width, height)
      } else {
        // Uploaded picture still loading.
        paintPreset(ctx, 'studio', width, height)
      }
      return
    }

    const amount = effect.kind === 'blur' ? effect.amount : 'strong'
    if (this.filterSupported) {
      const radius = Math.round((BLUR_RADIUS[amount] * height) / 720)
      ctx.filter = `blur(${radius}px)`
      // Overdraw past the edges so the blur doesn't fade to black there.
      ctx.drawImage(
        this.video,
        -radius * 2,
        -radius * 2,
        width + radius * 4,
        height + radius * 4,
      )
      ctx.filter = 'none'
    } else {
      // No canvas filters (older Safari): shrink and stretch back, a cheap blur.
      const tiny = this.blurFallback
      const divisor = amount === 'light' ? 12 : 24
      const tinyWidth = Math.max(1, Math.round(width / divisor))
      const tinyHeight = Math.max(1, Math.round(height / divisor))
      if (tiny.width !== tinyWidth || tiny.height !== tinyHeight) {
        tiny.width = tinyWidth
        tiny.height = tinyHeight
      }
      this.blurFallbackCtx.drawImage(this.video, 0, 0, tinyWidth, tinyHeight)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(tiny, 0, 0, width, height)
    }
  }

  private drawPerson() {
    const ctx = this.personCtx
    const { width, height } = this.person
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    if (this.filterSupported)
      ctx.filter = `blur(${Math.max(2, Math.round(height / 240))}px)`
    ctx.drawImage(this.mask, 0, 0, width, height)
    if (this.filterSupported) ctx.filter = 'none'
    ctx.globalCompositeOperation = 'source-in'
    ctx.drawImage(this.video, 0, 0, width, height)
    ctx.globalCompositeOperation = 'source-over'
    this.outputCtx.drawImage(this.person, 0, 0)
  }
}
