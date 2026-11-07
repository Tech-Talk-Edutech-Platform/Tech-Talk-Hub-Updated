// This file is compiled for a service-worker scope and emitted as public/sw.js.
// The standard WebWorker lib types `self` as WorkerGlobalScope even for
// service-worker entries; this build target guarantees the narrower runtime.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- type-aware lint uses the app's DOM tsconfig, which has no ServiceWorkerGlobalScope; tsconfig.worker.json type-checks this file
const serviceWorker = self as unknown as ServiceWorkerGlobalScope

serviceWorker.addEventListener('push', (event) => {
  const data = event.data
    ? event.data.json()
    : { title: 'New Update', body: 'Check your dashboard.' }

  const options = {
    body: data.body,
    icon: '/icon.png', // Replace with your logo
    badge: '/badge.png', // Small icon for mobile bars
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  }

  event.waitUntil(
    serviceWorker.registration.showNotification(data.title, options),
  )
})

// Open the dashboard when the user clicks the notification
serviceWorker.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    serviceWorker.clients.openWindow(
      event.notification.data.url || '/notifications',
    ),
  )
})
