self.addEventListener("push", event => {

    let data = {};

    try {
        data = event.data.json();
    } catch {
        data = {
            title: "HaTexts",
            body: "You have a new notification."
        };
    }

    const title =
        data.title || "HaTexts";

    const options = {
        body:
            data.body || "You have a new notification.",

        icon:
            "/HaTexts/favicon.png",

        badge:
            "/HaTexts/favicon.png",

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


self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();

        const url =
            event.notification.data?.url ||
            "/HaTexts/";

        event.waitUntil(
            clients.openWindow(url)
        );
    }
);
