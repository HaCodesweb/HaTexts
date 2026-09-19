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

const newFriendEmailInput =
    document.getElementById("new-friend-email");

const newFriendAddButton =
    document.getElementById("new-friend-add");

const friendMessage =
    document.getElementById("friend-message");

const scrollBottomButton =
    document.getElementById("scroll-bottom");

const emptyChat =
    document.getElementById("empty-chat");


// =========================
// STATE
// =========================

let currentUser = null;
let currentFriend = null;
let currentConversation = null;

let realtimeChannel = null;
let presenceChannel = null;
let typingChannel = null;

let onlineUsers = new Set();

let unreadMessages = {};

let typingTimeout = null;
let isCurrentlyTyping = false;
let typingHideTimeout = null;

let lastMessageDate = null;


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

        if (typingChannel) {

            supabase.removeChannel(
                typingChannel
            );

            typingChannel = null;
        }

        clearTimeout(typingTimeout);
        clearTimeout(typingHideTimeout);
        isCurrentlyTyping = false;

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
// ADMIN: APPROVE USER (allowed_users table)
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
        "User approved!";

    await loadFriends();
}


// =========================
// ADD FRIEND BY EMAIL (all users - friendships table)
// =========================

newFriendAddButton.addEventListener(
    "click",
    addFriendByEmail
);

newFriendEmailInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            addFriendByEmail();
        }
    }
);

async function addFriendByEmail() {

    const email =
        newFriendEmailInput.value
            .trim()
            .toLowerCase();

    if (!email) {

        friendMessage.textContent =
            "Enter an email.";

        return;
    }

    if (
        email ===
        currentUser.email.toLowerCase()
    ) {

        friendMessage.textContent =
            "You can't add yourself as a friend.";

        return;
    }

    const { error } =
        await supabase
            .from("friendships")
            .insert({
                user_email:
                    currentUser.email,

                friend_email:
                    email
            });

    if (error) {

        if (error.code === "23505") {

            friendMessage.textContent =
                "You're already friends.";

        } else {

            friendMessage.textContent =
                error.message;
        }

        return;
    }

    newFriendEmailInput.value = "";

    friendMessage.textContent =
        "Friend added!";

    await loadFriends();
}


// =========================
// LOAD FRIENDS (sorted by most recent message)
// =========================

async function loadFriends() {

    console.log(
        "CURRENT USER:",
        currentUser.email
    );

    friendsList.innerHTML = "";

    // 1. Get friendships

    const { data: friendships, error: fError } =
        await supabase
            .from("friendships")
            .select("user_email, friend_email")
            .or(
                `user_email.eq.${currentUser.email},` +
                `friend_email.eq.${currentUser.email}`
            );

    if (fError) {

        console.error(
            "Error loading friendships:",
            fError
        );

        return;
    }

    // 2. Extract friend emails

    const friendEmails =
        (friendships || []).map(f =>
            f.user_email.toLowerCase() ===
            currentUser.email.toLowerCase()
                ? f.friend_email
                : f.user_email
        );

    if (friendEmails.length === 0) {

        const empty =
            document.createElement("div");

        empty.className =
            "no-friends";

        empty.textContent =
            "No friends yet. Add someone!";

        friendsList.appendChild(empty);

        return;
    }

    // 3. Get friend profiles

    const { data: profiles, error: pError } =
        await supabase
            .from("profiles")
            .select("id, email")
            .in("email", friendEmails);

    if (pError) {

        console.error(
            "Error loading profiles:",
            pError
        );

        return;
    }

    // Map email -> profile

    const profileMap = {};

    for (const profile of profiles || []) {

        profileMap[
            profile.email.toLowerCase()
        ] = profile;
    }

    // 4. Get all conversations for current user

    const {
        data: conversations,
        error: cError
    } = await supabase
        .from("conversations")
        .select("id, user1, user2")
        .or(
            `user1.eq.${currentUser.id},` +
            `user2.eq.${currentUser.id}`
        );

    if (cError) {

        console.error(
            "Error loading conversations:",
            cError
        );

        return;
    }

    // 5. Get latest message for each conversation

    const conversationIds =
        (conversations || []).map(c => c.id);

    let latestMessages = {};

    if (conversationIds.length > 0) {

        const {
            data: messages,
            error: mError
        } = await supabase
            .from("messages")
            .select(
                "conversation_id, " +
                "message, sender, " +
                "created_at"
            )
            .in("conversation_id", conversationIds)
            .order("created_at", {
                ascending: false
            })
            .limit(100);

        if (!mError && messages) {

            for (const msg of messages) {

                if (!latestMessages[
                    msg.conversation_id
                ]) {

                    latestMessages[
                        msg.conversation_id
                    ] = msg;
                }
            }
        }
    }

    // 6. Match friends with conversations and latest messages

    const friendsWithData =
        friendEmails.map(email => {

            const profile =
                profileMap[
                    email.toLowerCase()
                ] || {
                    id: null,
                    email: email
                };

            const conversation =
                (conversations || []).find(c =>
                    (c.user1 === currentUser.id &&
                     c.user2 === profile.id) ||
                    (c.user1 === profile.id &&
                     c.user2 === currentUser.id)
                );

            const lastMessage =
                conversation
                    ? latestMessages[
                        conversation.id
                      ]
                    : null;

            return {
                ...profile,
                conversationId:
                    conversation?.id,
                lastMessage: lastMessage,
                lastMessageTime:
                    lastMessage
                        ? new Date(
                            lastMessage.created_at
                          ).getTime()
                        : 0
            };
        });

    // 7. Sort by most recent message (newest first)

    friendsWithData.sort(
        (a, b) =>
            b.lastMessageTime -
            a.lastMessageTime
    );

    // 8. Render friends

    for (const friend of friendsWithData) {

        console.log(
            "ADDING FRIEND TO LIST:",
            friend.email
        );

        const div =
            document.createElement("div");

        div.className =
            "friend";


        // Friend name

        const name =
            document.createElement("div");

        name.className =
            "friend-name";

        name.textContent =
            friend.email.split("@")[0];


        // Last message preview

        const lastMsg =
            document.createElement("div");

        lastMsg.className =
            "friend-last-message";

        if (friend.lastMessage) {

            const prefix =
                friend.lastMessage.sender ===
                currentUser.email
                    ? "You: "
                    : "";

            const text =
                friend.lastMessage.message;

            lastMsg.textContent =
                prefix +
                (text.length > 40
                    ? text.substring(0, 40) +
                      "..."
                    : text);

        } else {

            lastMsg.textContent =
                "No messages yet";
        }


        // Friend email

        const email =
            document.createElement("div");

        email.className =
            "friend-email";

        email.textContent =
            friend.email;


        // Friend online status

        const friendStatus =
            document.createElement("div");

        friendStatus.className =
            "friend-status";

        if (friend.id) {

            friendStatus.textContent =
                "Offline";

        } else {

            friendStatus.textContent =
                "Not signed up";
        }


        div.appendChild(name);
        div.appendChild(lastMsg);
        div.appendChild(email);
        div.appendChild(friendStatus);


        // Remove button (all users)

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

                if (!confirmed) {
                    return;
                }

                // Delete friendship entries in both directions

                await supabase
                    .from("friendships")
                    .delete()
                    .eq(
                        "user_email",
                        currentUser.email
                    )
                    .eq(
                        "friend_email",
                        friend.email
                    );

                await supabase
                    .from("friendships")
                    .delete()
                    .eq(
                        "user_email",
                        friend.email
                    )
                    .eq(
                        "friend_email",
                        currentUser.email
                    );


                await loadFriends();
            }
        );

        div.appendChild(removeButton);


        // Open chat (only if friend has a profile)

        if (friend.id) {

            div.addEventListener(
                "click",
                () => openFriend(friend.email)
            );

        } else {

            div.style.opacity = "0.5";
            div.style.cursor = "default";
        }

        friendsList.appendChild(div);
    }
}


// =========================
// ONLINE STATUS
// =========================

function startPresence() {

    // Remove old presence channel

    if (presenceChannel) {

        supabase.removeChannel(
            presenceChannel
        );

        presenceChannel = null;
    }


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
                    presenceChannel
                        .presenceState();


                onlineUsers =
                    new Set(
                        Object.keys(state)
                    );


                refreshStatuses();
            }
        )


        .subscribe(
            async presenceStatus => {

                if (
                    presenceStatus ===
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


// =========================
// REFRESH STATUSES
// =========================

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


            const friendStatus =
                friend
                    .querySelector(
                        ".friend-status"
                    );


            if (
                email &&
                friendStatus
            ) {

                updateFriendStatus(
                    friendStatus,
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


// =========================
// CHECK IF FRIEND IS ONLINE
// =========================

function isFriendOnline(email) {

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


// =========================
// UPDATE FRIEND STATUS
// =========================

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
        console.error("Error finding friend:", error);
        return;
    }

    if (!users || users.length === 0) {
        alert("This person has not created an account yet.");
        return;
    }

    currentFriend = users[0];

    console.log("CURRENT FRIEND:", currentFriend);

    chatFriendName.textContent =
        currentFriend.email.split("@")[0];

    updateChatStatus();

    noChat.classList.add("hidden");
    chatWindow.classList.remove("hidden");
    app.classList.add("chat-open");

    unreadMessages[currentFriend.email] = 0;

    updateUnreadBadgeForEmail(
        currentFriend.email
    );

    // Reset previous conversation
    currentConversation = null;

    // Reset date separator tracking
    lastMessageDate = null;

    // Hide empty chat state
    emptyChat.classList.add("hidden");

    // Find/create conversation
    await getOrCreateConversation();

    console.log(
        "CURRENT CONVERSATION AFTER GET:",
        currentConversation
    );

    if (!currentConversation) {
        console.error(
            "No conversation was created."
        );
        return;
    }

    // Load existing messages
    console.log("ABOUT TO LOAD MESSAGES");

    await loadMessages();

    console.log("LOAD MESSAGES FINISHED");

    // Mark received messages as read
    await markMessagesAsRead();

    // Setup typing indicator
    setupTypingIndicator();

    // Start realtime messages
    subscribeToMessages();
}

// =========================
// UPDATE CHAT STATUS
// =========================

function updateChatStatus() {

    if (!currentFriend) {
        return;
    }

    // Don't override typing indicator
    if (chatStatus.classList.contains("typing")) {
        return;
    }

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

    if (
        !currentUser ||
        !currentFriend
    ) {

        console.error(
            "Missing user or friend."
        );

        return;
    }

    const myId =
        currentUser.id;

    const friendId =
        currentFriend.id;

    console.log(
        "Creating/finding conversation..."
    );

    console.log(
        "My ID:",
        myId
    );

    console.log(
        "Friend ID:",
        friendId
    );

    // Check normal direction

    let { data, error } =
        await supabase
            .from("conversations")
            .select("*")
            .eq(
                "user1",
                myId
            )
            .eq(
                "user2",
                friendId
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Error checking conversation:",
            error
        );

        return;
    }

    // Check reverse direction

    if (!data) {

        const result =
            await supabase
                .from("conversations")
                .select("*")
                .eq(
                    "user1",
                    friendId
                )
                .eq(
                    "user2",
                    myId
                )
                .maybeSingle();


        if (result.error) {

            console.error(
                "Error checking reverse conversation:",
                result.error
            );

            return;
        }

        data =
            result.data;
    }

    // Existing conversation

    if (data) {

        console.log(
            "Conversation found:",
            data
        );

        currentConversation =
            data;

        return;
    }

    // Create conversation

    const result =
        await supabase
            .from("conversations")
            .insert({
                user1:
                    myId,

                user2:
                    friendId
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

    currentConversation =
        result.data;

    console.log(
        "Conversation created:",
        currentConversation
    );
}


// =========================
// FORMAT DATE SEPARATOR
// =========================

function formatDateSeparator(dateString) {

    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(
        yesterday.getDate() - 1
    );

    if (
        date.toDateString() ===
        today.toDateString()
    ) {

        return "Today";

    } else if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {

        return "Yesterday";

    } else {

        return date.toLocaleDateString(
            [],
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    }
}


// =========================
// LOAD MESSAGES
// =========================

async function loadMessages() {

    console.log("LOAD MESSAGES RUNNING");

    if (!currentConversation) {
        console.error(
            "loadMessages: No current conversation!"
        );
        return;
    }

    console.log(
        "LOADING CONVERSATION:",
        currentConversation.id
    );

    // Reset date separator tracking
    lastMessageDate = null;

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

        console.error(
            "ERROR LOADING MESSAGES:",
            error
        );

        return;
    }

    console.log(
        "MESSAGES FROM DATABASE:",
        data
    );

    messagesContainer.innerHTML = "";

    // Show or hide empty conversation state

    if (!data || data.length === 0) {

        emptyChat.classList.remove("hidden");

    } else {

        emptyChat.classList.add("hidden");

        data.forEach(message => {
            displayMessage(message);
        });
    }
}


// =========================
// DISPLAY MESSAGE
// =========================

function displayMessage(message) {

    console.log("DISPLAY MESSAGE FUNCTION RUNNING", message);

    // Check if user was near bottom before adding new content

    const wasNearBottom =
        messagesContainer.scrollHeight -
        messagesContainer.scrollTop -
        messagesContainer.clientHeight < 150;

    // Date separator

    const messageDate =
        new Date(
            message.created_at
        ).toDateString();

    if (lastMessageDate !== messageDate) {

        lastMessageDate = messageDate;

        const separator =
            document.createElement("div");

        separator.className =
            "date-separator";

        separator.textContent =
            formatDateSeparator(
                message.created_at
            );

        messagesContainer.appendChild(
            separator
        );
    }

    const div =
        document.createElement("div");

    div.className =
        "message";

    div.dataset.messageId =
        message.id;

    console.log("MESSAGE SENDER:", message.sender);
console.log("CURRENT USER:", currentUser.email);

    const isMine =
        message.sender === currentUser.email;

    if (isMine) {
        div.classList.add("mine");
    }

    // Message text
    const text =
        document.createElement("div");

    text.textContent =
        message.message;

    // Date
    const date =
        document.createElement("span");

    date.className =
        "message-date";

    date.textContent =
        new Date(
            message.created_at
        ).toLocaleDateString(
            [],
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

    // Message meta (time, receipt, copy, delete)
    const meta =
        document.createElement("div");

    meta.className =
        "message-meta";

    // Time
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

    meta.appendChild(time);

    // Read receipt (only for own messages)

    if (isMine) {

        const receipt =
            document.createElement("span");

        receipt.className =
            "message-receipt";

        if (message.read_at) {

            receipt.textContent = "✓✓";

            receipt.classList.add("read");

        } else {

            receipt.textContent = "✓";
        }

        meta.appendChild(receipt);
    }

    // Copy button (all messages)

    const copyButton =
        document.createElement("button");

    copyButton.textContent = "📋";

    copyButton.className =
        "copy-message";

    copyButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            navigator.clipboard.writeText(
                message.message
            );

            copyButton.textContent = "✓";

            setTimeout(() => {

                copyButton.textContent = "📋";

            }, 2000);
        }
    );

    meta.appendChild(copyButton);

    // Delete button (only for own messages)

    if (isMine) {

        const deleteButton =
            document.createElement("button");

        deleteButton.textContent =
            "🗑️";

        deleteButton.className =
            "delete-message";


        deleteButton.addEventListener(
            "click",
            async event => {

                event.stopPropagation();

                const confirmed =
                    confirm(
                        "Delete this message?"
                    );

                if (!confirmed) {
                    return;
                }

                const { error } =
                    await supabase
                        .from("messages")
                        .delete()
                        .eq(
                            "id",
                            message.id
                        );


                if (error) {

                    console.error(
                        "Could not delete message:",
                        error
                    );

                    alert(
                        "Could not delete the message."
                    );

                    return;
                }

                // Remove it immediately
                div.remove();
            }
        );

        meta.appendChild(deleteButton);
    }

    div.appendChild(text);
    div.appendChild(date);
    div.appendChild(meta);

    messagesContainer.appendChild(
        div
    );

    // Auto-scroll only if user was near bottom

    if (wasNearBottom) {

        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

        scrollBottomButton.classList.add(
            "hidden"
        );

    } else {

        scrollBottomButton.classList.remove(
            "hidden"
        );
    }
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

// Typing indicator: send typing status on input

messageInput.addEventListener(
    "input",
    () => {

        if (
            !typingChannel ||
            !currentConversation
        ) {

            return;
        }

        if (!isCurrentlyTyping) {

            isCurrentlyTyping = true;

            typingChannel.send({
                type: "broadcast",

                event: "typing",

                payload: {
                    email:
                        currentUser.email
                }
            });
        }

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {

            isCurrentlyTyping = false;

            if (typingChannel) {

                typingChannel.send({
                    type: "broadcast",

                    event: "stop-typing",

                    payload: {
                        email:
                            currentUser.email
                    }
                });
            }

        }, 2000);
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


    if (!text) {
        return;
    }

    // Message length limit

    if (text.length > 2000) {

        alert(
            "Message is too long. Please keep it under 2000 characters."
        );

        return;
    }

    // Stop typing indicator

    clearTimeout(typingTimeout);

    isCurrentlyTyping = false;

    if (typingChannel) {

        typingChannel.send({
            type: "broadcast",

            event: "stop-typing",

            payload: {
                email:
                    currentUser.email
            }
        });
    }

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

    if (
        !currentConversation
    ) {

        return;
    }

    if (realtimeChannel) {

        supabase.removeChannel(
            realtimeChannel
        );

        realtimeChannel =
            null;
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
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "messages",

                    filter:
                        "conversation_id=eq." +
                        currentConversation.id
                },

                payload => {

                    displayMessage(
                        payload.new
                    );

                    // If message is from the other user and chat is open, mark as read

                    if (
                        payload.new.sender !==
                        currentUser.email
                    ) {

                        supabase
                            .from("messages")
                            .update({
                                read_at:
                                    new Date()
                                        .toISOString()
                            })
                            .eq(
                                "id",
                                payload.new.id
                            )
                            .is("read_at", null);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event:
                        "UPDATE",

                    schema:
                        "public",

                    table:
                        "messages",

                    filter:
                        "conversation_id=eq." +
                        currentConversation.id
                },

                payload => {

                    // Update read receipt for this message

                    updateMessageReadReceipt(
                        payload.new
                    );
                }
            )
            .subscribe();
}


// =========================
// TYPING INDICATOR
// =========================

function setupTypingIndicator() {

    if (typingChannel) {

        supabase.removeChannel(
            typingChannel
        );

        typingChannel = null;
    }

    if (!currentConversation) {
        return;
    }

    typingChannel =
        supabase.channel(
            "typing-" +
            currentConversation.id
        );

    typingChannel
        .on(
            "broadcast",
            {
                event: "typing"
            },
            payload => {

                if (
                    payload.payload?.email !==
                    currentUser.email
                ) {

                    showTypingIndicator();
                }
            }
        )
        .on(
            "broadcast",
            {
                event: "stop-typing"
            },
            payload => {

                if (
                    payload.payload?.email !==
                    currentUser.email
                ) {

                    hideTypingIndicator();
                }
            }
        )
        .subscribe();
}


function showTypingIndicator() {

    chatStatus.textContent =
        "typing...";

    chatStatus.classList.add("typing");

    chatStatus.classList.remove(
        "online"
    );

    // Auto-hide after 3 seconds

    clearTimeout(typingHideTimeout);

    typingHideTimeout = setTimeout(() => {

        hideTypingIndicator();

    }, 3000);
}


function hideTypingIndicator() {

    chatStatus.classList.remove(
        "typing"
    );

    clearTimeout(typingHideTimeout);

    updateChatStatus();
}


// =========================
// READ RECEIPTS
// =========================

async function markMessagesAsRead() {

    if (
        !currentConversation ||
        !currentUser
    ) {

        return;
    }

    await supabase
        .from("messages")
        .update({
            read_at:
                new Date().toISOString()
        })
        .eq(
            "conversation_id",
            currentConversation.id
        )
        .neq(
            "sender",
            currentUser.email
        )
        .is("read_at", null);
}


function updateMessageReadReceipt(message) {

    const messageElement =
        messagesContainer.querySelector(
            `[data-message-id="${message.id}"]`
        );

    if (!messageElement) {
        return;
    }

    const receipt =
        messageElement.querySelector(
            ".message-receipt"
        );

    if (receipt && message.read_at) {

        receipt.textContent = "✓✓";

        receipt.classList.add("read");
    }
}


// =========================
// SCROLL TO BOTTOM
// =========================

messagesContainer.addEventListener(
    "scroll",
    () => {

        const isNearBottom =
            messagesContainer.scrollHeight -
            messagesContainer.scrollTop -
            messagesContainer.clientHeight < 100;

        if (isNearBottom) {

            scrollBottomButton.classList.add(
                "hidden"
            );

        } else {

            scrollBottomButton.classList.remove(
                "hidden"
            );
        }
    }
);

scrollBottomButton.addEventListener(
    "click",
    () => {

        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

        scrollBottomButton.classList.add(
            "hidden"
        );
    }
);


// =========================
// UNREAD MESSAGES
// =========================

function updateUnreadBadge(
    element,
    email
) {

    const count =
        unreadMessages[email] ||
        0;


    if (count > 0) {

        element.textContent =
            count > 99
                ? "99+"
                : count;


        element.classList.add(
            "show"
        );

    } else {

        element.textContent =
            "";


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


        currentFriend =
            null;


        currentConversation =
            null;

        // Reset date separator tracking
        lastMessageDate = null;

        // Clean up typing channel

        if (typingChannel) {

            supabase.removeChannel(
                typingChannel
            );

            typingChannel = null;
        }

        clearTimeout(typingTimeout);
        clearTimeout(typingHideTimeout);
        isCurrentlyTyping = false;

        // Hide empty chat state
        emptyChat.classList.add("hidden");

        // Hide scroll-to-bottom button
        scrollBottomButton.classList.add(
            "hidden"
        );

        if (realtimeChannel) {

            supabase.removeChannel(
                realtimeChannel
            );


            realtimeChannel =
                null;
        }


        chatStatus.textContent =
            "Offline";


        chatStatus.classList.remove(
            "online"
        );

        chatStatus.classList.remove(
            "typing"
        );
    }
);


// =========================
// EXISTING SESSION
// =========================

async function checkUser() {

    const {
        data: {
            user
        }
    } =
        await supabase.auth.getUser();


    if (user) {

        await startApp(user);
    }
}


checkUser();
