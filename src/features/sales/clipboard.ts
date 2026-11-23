/**
 * Copies text that is still loading (e.g. a signed link from the server).
 *
 * Safari only allows clipboard writes during the click itself, so awaiting a
 * request and then calling `writeText` fails there. Handing the clipboard a
 * pending `ClipboardItem` straight away keeps the click's permission. Call
 * this synchronously from the click handler, before any `await`.
 */
export async function copyPendingText(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      'text/plain': text.then(
        (value) => new Blob([value], { type: 'text/plain' }),
      ),
    })
    try {
      await navigator.clipboard.write([item])
      return
    } catch {
      // Report a failed request as itself, not as a clipboard problem.
      await text
      // Older browsers reject pending items; try the plain write below.
    }
  }
  await navigator.clipboard.writeText(await text)
}
