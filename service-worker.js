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
            "You have a new notification.",

        icon:
            "/HaTexts/favicon.png",

        badge:
            "/HaTexts/favicon.png",

        tag:
            data.tag ||
            "hatexts-notification",

        renotify:
            true,

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
                .then(
                    clientList => {

                        // If HaTexts is already open,
                        // focus it instead of opening
                        // another tab.

                        for (
                            const client
                            of clientList
                        ) {

                            if (
                                client.url.includes(
                                    "/HaTexts/"
                                ) &&
                                "focus" in client
                            ) {

                                return client.focus();
                            }
                        }


                        // Otherwise open HaTexts

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
