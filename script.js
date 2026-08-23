console.log("SCRIPT.JS IS RUNNING");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
    "https://ytpingwbaqfqygmfwcrv.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_SV2-fyvAWQqxSXQYvyGRqw_XQdpNJmG";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =========================
// ELEMENTS
// =========================

const authSection =
    document.getElementById("auth-section");

const app =
    document.getElementById("app");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const signupButton =
    document.getElementById("signup");

const loginButton =
    document.getElementById("login");

const logoutButton =
    document.getElementById("logout");

const authMessage =
    document.getElementById("auth-message");

const userEmail =
    document.getElementById("user-email");

const adminPanel =
    document.getElementById("admin-panel");

const friendEmailInput =
    document.getElementById("friend-email");

const addFriendButton =
    document.getElementById("add-friend");

const adminMessage =
    document.getElementById("admin-message");

const friendsList =
    document.getElementById("friends-list");

const noChat =
    document.getElementById("no-chat");

const chatWindow =
    document.getElementById("chat-window");

const chatFriendName =
    document.getElementById("chat-friend-name");

const messagesContainer =
    document.getElementById("messages");

const messageInput =
    document.getElementById("message-input");

const sendMessageButton =
    document.getElementById("send-message");

const friendSearch =
    document.getElementById("friend-search");

const backButton =
    document.getElementById("back-button");

const chatStatus =
    document.getElementById("chat-status");


// =========================
// STATE
// =========================

let currentUser = null;
let currentFriend = null;
let currentConversation = null;

let realtimeChannel = null;
let presenceChannel = null;

let onlineUsers = new Set();

let unreadMessages = {};


// =========================
// SIGN UP
// =========================

signupButton.addEventListener(
    "click",
    async () => {

        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        const password =
            passwordInput.value;

        if (!email || !password) {

            authMessage.textContent =
                "Enter an email and password.";

            return;
        }

        const { error } =
            await supabase.auth.signUp({
                email,
                password
            });

        if (error) {

            authMessage.textContent =
                error.message;

            return;
        }

        authMessage.textContent =
            "Account created! Check your email.";
    }
);


// =========================
// LOGIN
// =========================

loginButton.addEventListener(
    "click",
    async () => {

        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        const password =
            passwordInput.value;

        if (!email || !password) {

            authMessage.textContent =
                "Enter an email and password.";

            return;
        }

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email,
                password
            });

        if (error) {

            authMessage.textContent =
                error.message;

            return;
        }

        await startApp(data.user);
    }
);


// =========================
// LOGOUT
// =========================

logoutButton.addEventListener(
    "click",
    async () => {

        if (realtimeChannel) {

            await supabase.removeChannel(
                realtimeChannel
            );

            realtimeChannel = null;
        }

        if (presenceChannel) {

            await supabase.removeChannel(
                presenceChannel
            );

            presenceChannel = null;
        }

        await supabase.auth.signOut();

        currentUser = null;
        currentFriend = null;
        currentConversation = null;

        app.classList.add("hidden");

        authSection.classList.remove(
            "hidden"
        );
    }
);


// =========================
// START APP
// =========================

async function startApp(user) {

    currentUser = user;

    authSection.classList.add(
        "hidden"
    );

    app.classList.remove(
        "hidden"
    );

    userEmail.textContent =
        user.email;

    await checkAdmin();

    console.log("ABOUT TO LOAD FRIENDS");

    await loadFriends();

    console.log("FRIENDS FINISHED LOADING");

    startPresence();
}


// =========================
// CHECK ADMIN
// =========================

async function checkAdmin() {

    const { data, error } =
        await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", currentUser.id)
            .single();

    if (error) {

        console.error(error);

        return;
    }

    if (data?.is_admin === true) {

        adminPanel.classList.remove(
            "hidden"
        );

    } else {

        adminPanel.classList.add(
            "hidden"
        );
    }
}


// =========================
// ADD FRIEND
// =========================

addFriendButton.addEventListener(
    "click",
    addFriend
);

async function addFriend() {

    const email =
        friendEmailInput.value
            .trim()
            .toLowerCase();

    if (!email) {

        adminMessage.textContent =
            "Enter an email.";

        return;
    }

    const { error } =
        await supabase
            .from("allowed_users")
            .insert({
                email,
                added_by: currentUser.id
            });

    if (error) {

        if (error.code === "23505") {

            adminMessage.textContent =
                "This email is already approved.";

        } else {

            adminMessage.textContent =
                error.message;
        }

        return;
    }

    friendEmailInput.value = "";

    adminMessage.textContent =
        "Friend added!";

    await loadFriends();
}


// =========================
// LOAD FRIENDS
// =========================

async function loadFriends() {

    console.log("LOAD FRIENDS STARTED");

    friendsList.innerHTML = "";

    const { data, error } =
        await supabase
            .from("allowed_users")
            .select("email, created_at")
            .order("created_at", {
                ascending: true
            });

    if (error) {

        console.error(
            "Error loading friends:",
            error
        );

        return;
    }

    console.log(
        "Allowed users:",
        data
    );


    for (const friend of data) {
        
        console.log("ADDING FRIEND TO LIST:", friend.email);
        
        // Don't show yourself
        if (
            friend.email.toLowerCase() ===
            currentUser.email.toLowerCase()
        ) {
            continue;
        }


        const div =
            document.createElement("div");

        div.className =
            "friend";


        const name =
            document.createElement("div");

        name.className =
            "friend-name";

        name.textContent =
            friend.email.split("@")[0];


        const email =
            document.createElement("div");

        email.className =
            "friend-email";

        email.textContent =
            friend.email;


        div.appendChild(name);
        div.appendChild(email);


        // Admin remove button
        if (
            !adminPanel.classList.contains("hidden")
        ) {

            const removeButton =
                document.createElement("button");

            removeButton.textContent =
                "Remove";

            removeButton.className =
                "remove-friend";


            removeButton.addEventListener(
                "click",
                async (event) => {

                    event.stopPropagation();

                    const confirmed =
                        confirm(
                            `Remove ${friend.email}?`
                        );

                    if (!confirmed) return;


                    const { error } =
                        await supabase
                            .from("allowed_users")
                            .delete()
                            .eq(
                                "email",
                                friend.email
                            );


                    if (error) {

                        console.error(
                            "Could not remove friend:",
                            error
                        );

                        alert(
                            "Could not remove friend."
                        );

                        return;
                    }


                    await loadFriends();
                }
            );


            div.appendChild(
                removeButton
            );
        }


        div.addEventListener(
            "click",
            () => openFriend(friend.email)
        );


        friendsList.appendChild(div);
    }
}


// =========================
// ONLINE STATUS
// =========================

function startPresence() {

    presenceChannel =
        supabase.channel(
            "school-chat-online",
            {
                config: {
                    presence: {
                        key: currentUser.id
                    }
                }
            }
        );

    presenceChannel
        .on(
            "presence",
            {
                event: "sync"
            },
            () => {

                const state =
                    presenceChannel.presenceState();

                onlineUsers =
                    new Set(
                        Object.keys(state)
                    );

                refreshStatuses();
            }
        )
        .subscribe(
            async status => {

                if (
                    status ===
                    "SUBSCRIBED"
                ) {

                    await presenceChannel
                        .track({
                            email:
                                currentUser.email,

                            online_at:
                                new Date()
                                    .toISOString()
                        });
                }
            }
        );
}


function refreshStatuses() {

    document
        .querySelectorAll(".friend")
        .forEach(friend => {

            const email =
                friend
                    .querySelector(
                        ".friend-email"
                    )
                    ?.textContent;

            const status =
                friend
                    .querySelector(
                        ".friend-status"
                    );

            if (
                email &&
                status
            ) {

                updateFriendStatus(
                    status,
                    email
                );
            }
        });

    if (currentFriend) {

        const isOnline =
            isFriendOnline(
                currentFriend.email
            );

        chatStatus.textContent =
            isOnline
                ? "● Online"
                : "Offline";

        chatStatus.classList.toggle(
            "online",
            isOnline
        );
    }
}


function isFriendOnline(email) {

    // Presence keys are user IDs,
    // so the local presence state is
    // checked against each user's email.

    const state =
        presenceChannel
            ?.presenceState() || {};

    return Object.values(state)
        .some(entries =>
            entries.some(
                entry =>
                    entry.email
                        ?.toLowerCase() ===
                    email.toLowerCase()
            )
        );
}


function updateFriendStatus(
    element,
    email
) {

    if (
        isFriendOnline(email)
    ) {

        element.textContent =
            "● Online";

        element.classList.add(
            "online"
        );

    } else {

        element.textContent =
            "Offline";

        element.classList.remove(
            "online"
        );
    }
}


// =========================
// OPEN FRIEND
// =========================

async function openFriend(email) {
    
    console.log("OPEN FRIEND:", email);
    
    const { data: users, error } =
        await supabase
            .from("profiles")
            .select("id, email")
            .eq("email", email);

    if (error) {

        console.error(error);

        return;
    }

    if (
        !users ||
        users.length === 0
    ) {

        alert(
            "This person has not created an account yet."
        );

        return;
    }

    currentFriend =
        users[0];

    chatFriendName.textContent =
        currentFriend.email
            .split("@")[0];

    updateChatStatus();

    noChat.classList.add(
        "hidden"
    );

    chatWindow.classList.remove(
        "hidden"
    );

    app.classList.add(
        "chat-open"
    );


    // Clear unread count

    unreadMessages[
        currentFriend.email
    ] = 0;

    updateUnreadBadgeForEmail(
        currentFriend.email
    );


    await getOrCreateConversation();

if (!currentConversation) {
    console.error("No conversation was created.");
    return;
}

await loadMessages();

subscribeToMessages();
}


function updateChatStatus() {

    if (!currentFriend) return;

    const online =
        isFriendOnline(
            currentFriend.email
        );

    chatStatus.textContent =
        online
            ? "● Online"
            : "Offline";

    chatStatus.classList.toggle(
        "online",
        online
    );
}


// =========================
// CONVERSATION
// =========================

async function getOrCreateConversation() {

    if (!currentUser || !currentFriend) {
        console.error("Missing user or friend.");
        return;
    }

    const myId = currentUser.id;
    const friendId = currentFriend.id;

    console.log("Creating/finding conversation...");
    console.log("My ID:", myId);
    console.log("Friend ID:", friendId);

    let { data, error } =
        await supabase
            .from("conversations")
            .select("*")
            .eq("user1", myId)
            .eq("user2", friendId)
            .maybeSingle();

    if (error) {
        console.error(
            "Error checking conversation:",
            error
        );
        return;
    }

    if (!data) {

        const result =
            await supabase
                .from("conversations")
                .select("*")
                .eq("user1", friendId)
                .eq("user2", myId)
                .maybeSingle();

        if (result.error) {
            console.error(
                "Error checking reverse conversation:",
                result.error
            );
            return;
        }

        data = result.data;
    }

    if (data) {

        console.log(
            "Conversation found:",
            data
        );

        currentConversation = data;
        return;
    }

    const result =
        await supabase
            .from("conversations")
            .insert({
                user1: myId,
                user2: friendId
            })
            .select()
            .single();

    if (result.error) {

        console.error(
            "ERROR CREATING CONVERSATION:",
            result.error
        );

        alert(
            "Could not create the conversation. Check the browser console."
        );

        return;
    }

    currentConversation = result.data;

    console.log(
        "Conversation created:",
        currentConversation
    );
}

// =========================
// LOAD MESSAGES
// =========================

async function loadMessages() {

    if (!currentConversation) return;

    const { data, error } =
        await supabase
            .from("messages")
            .select("*")
            .eq(
                "conversation_id",
                currentConversation.id
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(error);

        return;
    }

    messagesContainer.innerHTML = "";

    data.forEach(
        displayMessage
    );
}


// =========================
// DISPLAY MESSAGE
// =========================

function displayMessage(message) {

    const div =
        document.createElement("div");

    div.className =
        "message";

    if (
        message.sender ===
        currentUser.email
    ) {

        div.classList.add(
            "mine"
        );
    }


    const text =
        document.createElement("div");

    text.textContent =
        message.message;


    const time =
        document.createElement("span");

    time.className =
        "message-time";

    time.textContent =
        new Date(
            message.created_at
        ).toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    div.appendChild(text);

    div.appendChild(time);

    messagesContainer.appendChild(
        div
    );

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}


// =========================
// SEND MESSAGE
// =========================

sendMessageButton.addEventListener(
    "click",
    sendMessage
);

messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            sendMessage();
        }
    }
);


async function sendMessage() {

    if (
        !currentConversation ||
        !currentFriend
    ) {

        return;
    }

    const text =
        messageInput.value.trim();

    if (!text) return;

    const { error } =
        await supabase
            .from("messages")
            .insert({
                conversation_id:
                    currentConversation.id,

                sender:
                    currentUser.email,

                receiver:
                    currentFriend.email,

                message:
                    text
            });

    if (error) {

        console.error(error);

        return;
    }

    messageInput.value = "";
}


// =========================
// REALTIME MESSAGES
// =========================

function subscribeToMessages() {

    if (realtimeChannel) {

        supabase.removeChannel(
            realtimeChannel
        );
    }

    realtimeChannel =
        supabase
            .channel(
                "conversation-" +
                currentConversation.id
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",

                    schema: "public",

                    table: "messages",

                    filter:
                        "conversation_id=eq." +
                        currentConversation.id
                },

                payload => {

                    displayMessage(
                        payload.new
                    );
                }
            )
            .subscribe();
}


// =========================
// UNREAD MESSAGES
// =========================

function updateUnreadBadge(
    element,
    email
) {

    const count =
        unreadMessages[email] || 0;

    if (count > 0) {

        element.textContent =
            count > 99
                ? "99+"
                : count;

        element.classList.add(
            "show"
        );

    } else {

        element.textContent = "";

        element.classList.remove(
            "show"
        );
    }
}


function updateUnreadBadgeForEmail(
    email
) {

    const badge =
        document.querySelector(
            `.unread-badge[data-email="${CSS.escape(email)}"]`
        );

    if (badge) {

        updateUnreadBadge(
            badge,
            email
        );
    }
}


// =========================
// SEARCH
// =========================

friendSearch.addEventListener(
    "input",
    () => {

        const search =
            friendSearch.value
                .trim()
                .toLowerCase();

        document
            .querySelectorAll(".friend")
            .forEach(friend => {

                const text =
                    friend.textContent
                        .toLowerCase();

                friend.style.display =
                    text.includes(search)
                        ? ""
                        : "none";
            });
    }
);


// =========================
// BACK BUTTON
// =========================

backButton.addEventListener(
    "click",
    () => {

        app.classList.remove(
            "chat-open"
        );

        chatWindow.classList.add(
            "hidden"
        );

        noChat.classList.remove(
            "hidden"
        );

        currentFriend = null;

        currentConversation = null;

        if (realtimeChannel) {

            supabase.removeChannel(
                realtimeChannel
            );

            realtimeChannel = null;
        }
    }
);


// =========================
// EXISTING SESSION
// =========================

async function checkUser() {

    const {
        data: { user }
    } =
        await supabase.auth.getUser();

    if (user) {

        await startApp(user);
    }
}

checkUser();
