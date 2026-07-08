self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "Rooma Ceritarasa";
    const body = payload.body || "Anda memiliki notifikasi baru.";
    const type = payload.type || "general";
    const relatedId = payload.relatedId || null;

    const options = {
      body,
      icon: "/window.svg", // Fallback icon
      badge: "/window.svg", // Fallback badge
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        type,
        relatedId,
        url: getUrlFromType(type, relatedId),
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));

    // Broadcast message to clients (so we can show in-app toast)
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: "PUSH_NOTIFICATION_RECEIVED",
            payload: { title, ...options },
          });
        }
      })
    );
  } catch (err) {
    console.error("Gagal mengurai payload Push:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  // Open the window or focus if already open
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

function getUrlFromType(type, relatedId) {
  const baseUrl = self.location.origin;
  switch (type) {
    case "new_reservation":
    case "cancellation":
    case "check_in":
      return baseUrl + `/admin/reservations${relatedId ? `?detail=${relatedId}` : ""}`;
    case "payment_confirmed":
      return baseUrl + "/admin/payments";
    default:
      return baseUrl + "/admin/notifications";
  }
}
