```javascript
// =========================
// PUSH NOTIFICATIONS
// =========================

self.addEventListener("push", event => {

    let data = {};

    try {
        data = event.data
            ? event.data.json()
            : {};
    } catch (error) {

        console.error(
            "Could not read push data:",
            error
        );

        data = {};
    }

    const title =
        data.title || "HaTexts";

    const options = {

        body:
            data.body ||
            "You have a new message.",

        icon:
            "/HaTexts/favicon.png",

        badge:
            "/HaTexts/favicon.png",

        tag:
            data.tag || "hatextexts-message",

        renotify:
            true,

        data: {
            url:
                data.url || "/HaTexts/"
        }
    };

    event.waitUntil(
        self.registration.showNotification(
            title,
            options
        )
    );
});


// =========================
// NOTIFICATION CLICK
// =========================

self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();

        const url =
            event.notification.data?.url ||
            "/HaTexts/";

        event.waitUntil(

            clients
                .matchAll({
                    type: "window",
                    includeUncontrolled: true
                })
                .then(windowClients => {

                    // Try to focus the existing HaTexts tab
                    for (const client of windowClients) {

                        if (
                            client.url.includes("/HaTexts/") &&
                            "focus" in client
                        ) {

                            return client.focus();
                        }
                    }

                    // Otherwise open HaTexts
                    return clients.openWindow(url);
                })
        );
    }
);
```
