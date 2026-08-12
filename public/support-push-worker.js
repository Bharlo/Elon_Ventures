self.addEventListener('push', event => {
  let data = { title: 'New message from Chat Support', body: 'A visitor sent you a new message.' }
  try { data = { ...data, ...event.data.json() } } catch { /* Use the safe default notification. */ }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, tag: data.tag || 'support-message', renotify: true, data: { url: '/admin-support' } }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(windowClient => new URL(windowClient.url).pathname === '/admin-support')
    return existing ? existing.focus() : clients.openWindow('/admin-support')
  }))
})
