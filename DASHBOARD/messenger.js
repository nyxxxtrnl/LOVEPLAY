import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  get as getRealtimeValue,
  getDatabase,
  onDisconnect,
  onValue as onRealtimeValue,
  push,
  ref as realtimeRef,
  remove as removeRealtimeValue,
  serverTimestamp as realtimeServerTimestamp,
  set as setRealtimeValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const messengerStatus = document.getElementById("messengerStatus");
const messengerAuth = document.getElementById("messengerAuth");
const messengerApp = document.getElementById("messengerApp");
const loginForm = document.getElementById("chatLoginForm");
const signupForm = document.getElementById("chatSignupForm");
const searchInput = document.getElementById("chatUserSearch");
const searchResults = document.getElementById("chatSearchResults");
const conversationList = document.getElementById("chatConversationList");
const messagesList = document.getElementById("chatMessages");
const messageForm = document.getElementById("chatMessageForm");
const messageInput = document.getElementById("chatMessageInput");
const activeToggle = document.getElementById("chatActiveToggle");

function setStatus(message, isError = false) {
  messengerStatus.textContent = message;
  messengerStatus.dataset.error = String(isError);
}

function showAuthView(view = "login") {
  messengerAuth.hidden = false;
  messengerApp.hidden = true;
  loginForm.hidden = view !== "login";
  signupForm.hidden = view !== "signup";
}

function describeError(error, action) {
  const code = typeof error?.code === "string" ? error.code : "unknown";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password is incorrect.";
  }
  if (code === "auth/email-already-in-use") return "That email already has an account. Sign in instead.";
  if (code === "auth/weak-password") return "Choose a stronger password with at least 8 characters.";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a little and try again.";
  if (code === "auth/operation-not-allowed") return "Email/password sign-in is disabled. Enable it in Firebase Authentication → Sign-in method.";
  if (code === "auth/invalid-api-key" || code === "auth/configuration-not-found") return "Firebase web config is invalid or belongs to a different project. Check firebase-config.js.";
  if (code === "auth/app-not-authorized") return "This website domain is not authorized. Add it in Firebase Authentication → Settings → Authorized domains.";
  if (code === "auth/network-request-failed") return "Could not reach Firebase. Check your internet connection, HTTPS, and browser extensions.";
  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return `${action} was blocked by Firestore rules. Confirm that the setup instructions and security rules are applied.`;
  }
  return `${action} failed (${code}). Check your connection and Firebase setup, then try again.`;
}

function setFormBusy(form, busy) {
  form.querySelectorAll("button, input, textarea").forEach(control => {
    control.disabled = busy;
  });
}

const isConfigured = ["apiKey", "authDomain", "projectId", "appId"].every(key =>
  typeof firebaseConfig[key] === "string" &&
  firebaseConfig[key].length > 0 &&
  !firebaseConfig[key].includes("REPLACE_WITH")
);

document.querySelectorAll("[data-chat-view]").forEach(button => {
  button.addEventListener("click", () => {
    showAuthView(button.dataset.chatView);
    const prompt = button.dataset.chatView === "signup"
      ? "Create an account to start chatting."
      : "Sign in to continue.";
    setStatus(isConfigured ? prompt : "Follow FIREBASE-SETUP.md and configure Firebase before signing in or creating an account.");
  });
});

if (!isConfigured) {
  setStatus("Chat is not connected yet. Follow FIREBASE-SETUP.md and add your Firebase web app settings to firebase-config.js.");
  showAuthView();
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const realtimeDatabase = typeof firebaseConfig.databaseURL === "string" && firebaseConfig.databaseURL.startsWith("https://")
    ? getDatabase(app, firebaseConfig.databaseURL)
    : null;
  const profileCache = new Map();
  let currentUser = null;
  let currentProfile = null;
  let currentConversationId = null;
  let currentRecipient = null;
  let unsubscribeConversations = null;
  let unsubscribeMessages = null;
  let searchTimer = null;
  let searchRequest = 0;
  let registrationInProgress = false;
  let currentShowActive = true;
  let presenceConnection = null;
  let presenceConnectionUnsubscribe = null;
  const presenceSubscriptions = new Map();

  function clearSubscriptions() {
    if (unsubscribeConversations) unsubscribeConversations();
    if (unsubscribeMessages) unsubscribeMessages();
    unsubscribeConversations = null;
    unsubscribeMessages = null;
  }

  function stopPresence() {
    if (presenceConnectionUnsubscribe) presenceConnectionUnsubscribe();
    presenceConnectionUnsubscribe = null;
    if (presenceConnection) {
      removeRealtimeValue(presenceConnection).catch(error => {
        console.warn("Could not immediately clear this user's active connection.", error);
      });
      presenceConnection = null;
    }
    presenceSubscriptions.forEach(unsubscribe => unsubscribe());
    presenceSubscriptions.clear();
  }

  function renderPresence(uid, online) {
    document.querySelectorAll("[data-presence-uid]").forEach(element => {
      if (element.dataset.presenceUid !== uid) return;
      const dot = element.querySelector(".messenger-presence-dot");
      const label = element.querySelector(".messenger-presence-label-text");
      if (dot) dot.dataset.online = String(online);
      if (label) label.textContent = online ? "Active" : "Offline";
      if (element.id === "chatRecipientStatus") {
        const description = element.querySelector("span:last-child");
        if (description) description.textContent = `Private conversation · ${online ? "Active" : "Offline"}`;
      }
    });
  }

  function syncPresenceSubscriptions() {
    if (!realtimeDatabase || !currentUser) return;
    const visibleUids = new Set(
      Array.from(document.querySelectorAll("[data-presence-uid]"))
        .map(element => element.dataset.presenceUid)
        .filter(uid => uid && uid !== currentUser.uid)
    );

    presenceSubscriptions.forEach((unsubscribe, uid) => {
      if (!visibleUids.has(uid)) {
        unsubscribe();
        presenceSubscriptions.delete(uid);
      }
    });

    visibleUids.forEach(uid => {
      if (presenceSubscriptions.has(uid)) return;
      const statusRef = realtimeRef(realtimeDatabase, `presence/${uid}`);
      const unsubscribe = onRealtimeValue(statusRef, snapshot => {
        const status = snapshot.val();
        const connections = status?.connections || {};
        const online = status?.showActive !== false && Object.keys(connections).length > 0;
        renderPresence(uid, online);
      }, error => {
        setStatus(describeError(error, "Loading active status"), true);
        renderPresence(uid, false);
      });
      presenceSubscriptions.set(uid, unsubscribe);
    });
  }

  async function startPresence(user) {
    if (!realtimeDatabase) {
      activeToggle.checked = false;
      activeToggle.disabled = true;
      setStatus(`Signed in as ${currentProfile.displayName}. Add the Firebase Realtime Database URL and rules to enable active status.`);
      return;
    }

    activeToggle.disabled = false;
    try {
      const savedPreference = await getRealtimeValue(realtimeRef(realtimeDatabase, `presence/${user.uid}/showActive`));
      currentShowActive = savedPreference.val() !== false;
      activeToggle.checked = currentShowActive;
    } catch (error) {
      activeToggle.disabled = true;
      setStatus(describeError(error, "Loading active-status preference"), true);
      return;
    }

    const connectedRef = realtimeRef(realtimeDatabase, ".info/connected");
    presenceConnectionUnsubscribe = onRealtimeValue(connectedRef, async snapshot => {
      if (snapshot.val() !== true || auth.currentUser?.uid !== user.uid) return;
      try {
        const connection = push(realtimeRef(realtimeDatabase, `presence/${user.uid}/connections`));
        await onDisconnect(connection).remove();
        await setRealtimeValue(connection, { connectedAt: realtimeServerTimestamp() });
        presenceConnection = connection;
      } catch (error) {
        setStatus(describeError(error, "Setting active status"), true);
      }
    }, error => {
      setStatus(describeError(error, "Connecting active status"), true);
    });
  }

  function clearConversation() {
    currentConversationId = null;
    currentRecipient = null;
    if (unsubscribeMessages) unsubscribeMessages();
    unsubscribeMessages = null;
    document.getElementById("chatThread").hidden = true;
    document.getElementById("chatEmptyState").hidden = false;
    document.getElementById("chatEmptyState").textContent = "Search for a person to start a private chat.";
    messagesList.replaceChildren();
  }

  function profileFromSnapshot(snapshot) {
    if (!snapshot.exists()) return null;
    const profile = { uid: snapshot.id, ...snapshot.data() };
    profileCache.set(profile.uid, profile);
    return profile;
  }

  async function getProfile(uid) {
    if (profileCache.has(uid)) return profileCache.get(uid);
    const snapshot = await getDoc(doc(db, "profiles", uid));
    return profileFromSnapshot(snapshot);
  }

  function renderSearchMessage(message) {
    searchResults.replaceChildren();
    const item = document.createElement("li");
    item.textContent = message;
    searchResults.append(item);
  }

  function makePersonButton(profile, subtitle, isActive = false) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "messenger-person-button";
    button.setAttribute("aria-current", String(isActive));
    const name = document.createElement("strong");
    name.textContent = profile.displayName;
    const detail = document.createElement("span");
    detail.textContent = subtitle;
    button.append(name, detail);
    const presence = document.createElement("span");
    presence.className = "messenger-presence-label";
    const dot = document.createElement("span");
    dot.className = "messenger-presence-dot";
    dot.setAttribute("aria-hidden", "true");
    const presenceText = document.createElement("span");
    presenceText.className = "messenger-presence-label-text";
    presenceText.textContent = "Offline";
    presence.append(dot, presenceText);
    presence.dataset.presenceUid = profile.uid;
    button.append(presence);
    item.append(button);
    return { item, button };
  }

  async function searchPeople() {
    const term = searchInput.value.trim().toLocaleLowerCase();
    const requestNumber = ++searchRequest;
    if (term.length < 2) {
      renderSearchMessage("Type at least 2 letters to find people.");
      return;
    }

    renderSearchMessage("Searching...");
    try {
      const peopleQuery = query(
        collection(db, "profiles"),
        orderBy("displayNameSearch"),
        where("displayNameSearch", ">=", term),
        where("displayNameSearch", "<=", `${term}\uf8ff`),
        limit(30)
      );
      const result = await getDocs(peopleQuery);
      if (requestNumber !== searchRequest) return;

      const profiles = result.docs
        .map(profileFromSnapshot)
        .filter(profile => profile && profile.uid !== currentUser.uid);
      searchResults.replaceChildren();
      if (profiles.length === 0) {
        renderSearchMessage("No people found with that name.");
        return;
      }

      profiles.forEach(profile => {
        const { item, button } = makePersonButton(profile, "Start a private chat");
        button.addEventListener("click", () => openConversation(profile));
        searchResults.append(item);
      });
      syncPresenceSubscriptions();
    } catch (error) {
      renderSearchMessage("Could not search for people.");
      setStatus(describeError(error, "People search"), true);
    }
  }

  function renderMessages(snapshot) {
    const messages = snapshot.docs.slice().reverse();
    messagesList.replaceChildren();
    if (messages.length === 0) {
      const item = document.createElement("li");
      item.className = "messenger-empty";
      item.textContent = "Say hello to start the conversation.";
      messagesList.append(item);
      return;
    }

    messages.forEach(messageSnapshot => {
      const message = messageSnapshot.data();
      const item = document.createElement("li");
      item.className = "messenger-message";
      item.dataset.own = String(message.senderId === currentUser.uid);
      item.append(document.createTextNode(message.text));
      const time = document.createElement("small");
      const date = message.createdAt?.toDate?.();
      time.textContent = `${message.senderId === currentUser.uid ? "You" : message.senderName} · ${
        date ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) : "Sending..."
      }`;
      item.append(time);
      messagesList.append(item);
    });
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  function subscribeToMessages(conversationId) {
    if (unsubscribeMessages) unsubscribeMessages();
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    unsubscribeMessages = onSnapshot(messagesQuery, renderMessages, error => {
      setStatus(describeError(error, "Loading messages"), true);
    });
  }

  async function openConversation(recipient) {
    if (!currentUser || recipient.uid === currentUser.uid) return;
    const participants = [currentUser.uid, recipient.uid].sort();
    const conversationId = `dm_${participants.join("_")}`;
    const conversationRef = doc(db, "conversations", conversationId);
    currentConversationId = conversationId;
    currentRecipient = recipient;
    document.getElementById("chatRecipientName").textContent = recipient.displayName;
    const recipientStatus = document.getElementById("chatRecipientStatus");
    recipientStatus.dataset.presenceUid = recipient.uid;
    recipientStatus.querySelector("span:last-child").textContent = "Private conversation · Offline";
    document.getElementById("chatThread").hidden = false;
    document.getElementById("chatEmptyState").hidden = true;
    messagesList.replaceChildren();
    syncPresenceSubscriptions();
    subscribeToMessages(conversationId);

    try {
      const existing = await getDoc(conversationRef);
      if (!existing.exists()) {
        await setDoc(conversationRef, {
          participants,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: ""
        });
      }
      setStatus(`Private chat with ${recipient.displayName}.`);
      messageInput.focus();
    } catch (error) {
      setStatus(describeError(error, "Opening chat"), true);
    }
  }

  async function renderConversations(snapshot) {
    const conversations = snapshot.docs.slice().sort((a, b) => {
      const aTime = a.data().updatedAt?.toMillis?.() || 0;
      const bTime = b.data().updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    const items = await Promise.all(conversations.map(async conversationSnapshot => {
      const conversation = conversationSnapshot.data();
      const recipientId = conversation.participants.find(uid => uid !== currentUser.uid);
      if (!recipientId) return null;
      const profile = await getProfile(recipientId);
      if (!profile) return null;
      const { item, button } = makePersonButton(
        profile,
        conversation.lastMessage || "No messages yet",
        conversationSnapshot.id === currentConversationId
      );
      button.addEventListener("click", () => openConversation(profile));
      return item;
    }));
    conversationList.replaceChildren();
    const visibleItems = items.filter(Boolean);
    if (visibleItems.length === 0) {
      const item = document.createElement("li");
      item.textContent = "Your conversations will appear here.";
      conversationList.append(item);
      return;
    }
    conversationList.append(...visibleItems);
    syncPresenceSubscriptions();
  }

  function watchConversations() {
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );
    unsubscribeConversations = onSnapshot(conversationsQuery, snapshot => {
      renderConversations(snapshot).catch(error => {
        setStatus(describeError(error, "Loading conversations"), true);
      });
    }, error => {
      setStatus(describeError(error, "Loading conversations"), true);
    });
  }

  async function activateAccount(user) {
    const profileSnapshot = await getDoc(doc(db, "profiles", user.uid));
    let profile = profileFromSnapshot(profileSnapshot);
    if (!profile || typeof profile.displayName !== "string") {
      const displayName = user.displayName?.trim() || user.email?.split("@")[0] || "LovePlay user";
      const displayNameSearch = displayName.normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim();
      await setDoc(doc(db, "profiles", user.uid), {
        displayName,
        displayNameSearch,
        createdAt: serverTimestamp()
      });
      profile = { uid: user.uid, displayName, displayNameSearch };
      profileCache.set(user.uid, profile);
    }
    currentUser = user;
    currentProfile = profile;
    messengerAuth.hidden = true;
    messengerApp.hidden = false;
    conversationList.replaceChildren();
    searchInput.value = "";
    document.getElementById("chatAccountName").textContent = profile.displayName;
    clearConversation();
    watchConversations();
    renderSearchMessage("Type at least 2 letters to find people.");
    await startPresence(user);
    if (realtimeDatabase) setStatus(`Signed in as ${profile.displayName}.`);
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    setFormBusy(loginForm, true);
    setStatus("Signing in...");
    try {
      await signInWithEmailAndPassword(
        auth,
        document.getElementById("chatLoginEmail").value.trim(),
        document.getElementById("chatLoginPassword").value
      );
    } catch (error) {
      setStatus(describeError(error, "Sign in"), true);
    } finally {
      setFormBusy(loginForm, false);
    }
  });

  signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    const displayName = document.getElementById("chatSignupName").value.trim();
    if (displayName.length < 2) {
      setStatus("Your display name must have at least 2 characters.", true);
      return;
    }

    setFormBusy(signupForm, true);
    setStatus("Creating your account...");
    registrationInProgress = true;
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        document.getElementById("chatSignupEmail").value.trim(),
        document.getElementById("chatSignupPassword").value
      );
      await updateProfile(credential.user, { displayName });
      const displayNameSearch = displayName.normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim();
      await setDoc(doc(db, "profiles", credential.user.uid), {
        displayName,
        displayNameSearch,
        createdAt: serverTimestamp()
      });
      registrationInProgress = false;
      await activateAccount(credential.user);
      signupForm.reset();
    } catch (error) {
      registrationInProgress = false;
      setStatus(error.message || describeError(error, "Account creation"), true);
    } finally {
      setFormBusy(signupForm, false);
    }
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(searchPeople, 250);
  });
  document.getElementById("chatSearchForm").addEventListener("submit", event => {
    event.preventDefault();
    clearTimeout(searchTimer);
    searchPeople();
  });

  messageForm.addEventListener("submit", async event => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !currentConversationId || !currentRecipient) return;

    const conversationId = currentConversationId;
    const conversationRef = doc(db, "conversations", conversationId);
    const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
    const batch = writeBatch(db);
    batch.set(messageRef, {
      senderId: currentUser.uid,
      senderName: currentProfile.displayName,
      text,
      createdAt: serverTimestamp()
    });
    batch.update(conversationRef, {
      lastMessage: text,
      updatedAt: serverTimestamp()
    });
    const sendButton = messageForm.querySelector("button[type='submit']");
    sendButton.disabled = true;
    try {
      await batch.commit();
      messageInput.value = "";
      setStatus(`Message sent to ${currentRecipient.displayName}.`);
      messageInput.focus();
    } catch (error) {
      setStatus(describeError(error, "Sending message"), true);
    } finally {
      sendButton.disabled = false;
    }
  });

  document.getElementById("chatSignOut").addEventListener("click", async () => {
    try {
      stopPresence();
      await signOut(auth);
      setStatus("You are signed out.");
    } catch (error) {
      setStatus(describeError(error, "Sign out"), true);
    }
  });

  activeToggle.addEventListener("change", async () => {
    if (!realtimeDatabase || !currentUser) return;
    activeToggle.disabled = true;
    const requestedPreference = activeToggle.checked;
    try {
      await setRealtimeValue(
        realtimeRef(realtimeDatabase, `presence/${currentUser.uid}/showActive`),
        requestedPreference
      );
      currentShowActive = requestedPreference;
      setStatus(requestedPreference ? "Your active status is visible to signed-in users." : "Your active status is hidden.");
    } catch (error) {
      activeToggle.checked = currentShowActive;
      setStatus(describeError(error, "Updating active status"), true);
    } finally {
      activeToggle.disabled = false;
    }
  });

  onAuthStateChanged(auth, async user => {
    clearSubscriptions();
    stopPresence();
    if (registrationInProgress) return;
    if (!user) {
      currentUser = null;
      currentProfile = null;
      profileCache.clear();
      clearConversation();
      conversationList.replaceChildren();
      searchResults.replaceChildren();
      searchInput.value = "";
      showAuthView("login");
      setStatus("Sign in or create an account to chat.");
      return;
    }

    setStatus("Loading your account...");
    try {
      await activateAccount(user);
    } catch (error) {
      currentUser = null;
      currentProfile = null;
      messengerApp.hidden = true;
      showAuthView("login");
      setStatus(error.message || describeError(error, "Loading account"), true);
    }
  }, error => {
    setStatus(describeError(error, "Checking sign-in"), true);
  });

  messengerAuth.hidden = false;
  showAuthView("login");
}
