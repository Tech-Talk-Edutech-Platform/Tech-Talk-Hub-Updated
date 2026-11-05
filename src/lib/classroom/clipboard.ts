import { toast } from './toast'

async function writeToClipboard(text: string, confirmation: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast(confirmation)
  } catch {
    toast('Couldn’t copy. Your browser blocked clipboard access.')
  }
}

/** Copies `text` and confirms with a toast (or explains why it couldn't). */
export function copyText(text: string, confirmation = 'Copied') {
  void writeToClipboard(text, confirmation)
}
