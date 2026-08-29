self.addEventListener("push", event => {

    let data = {};

    try {
        data = event.data
            ? event.data.json()
            : {};
    } catch (error) {
        console.error("Push data error:", error);
    }

    const title =
        data.title || "School Chat";

    const options = {
        body:
            data.body ||
            "You have a new notification.",

        icon: "/HaTexts/favicon.png",

        badge: "/HaTexts/favicon.png",

        data: {
            url:
                data.url ||
                "/HaTexts/"
        }
    };

    event.waitUntil(
        self.registration.showNotification(
            title,
            options
        )
    );
});


self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();

        const url =
            event.notification.data?.url ||
            "/HaTexts/";

        event.waitUntil(
            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            }).then(
                windowClients => {

                    for (
                        const client
                        of windowClients
                    ) {

                        if (
                            "focus" in client
                        ) {

                            client.navigate(url);

                            return client.focus();
                        }
                    }

                    if (
                        clients.openWindow
                    ) {

                        return clients.openWindow(
                            url
                        );
                    }
                }
            )
        );
    }
);
