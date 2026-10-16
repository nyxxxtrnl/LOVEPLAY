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
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import {
  collection,
  deleteDoc,
  deleteField,
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
  updateDoc,
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
const imageInput = document.getElementById("chatImageInput");
const voiceButton = document.getElementById("chatVoiceButton");
const stickerButton = document.getElementById("chatStickerButton");
const stickerPicker = document.getElementById("chatStickerPicker");
const gifDialog = document.getElementById("chatGifDialog");
const gifForm = document.getElementById("chatGifForm");
const chatThemeSelect = document.getElementById("chatThemeSelect");
const chatCustomThemeColor = document.getElementById("chatCustomThemeColor");
const activeToggle = document.getElementById("chatActiveToggle");
const settingsActiveToggle = document.getElementById("chatSettingsActiveToggle");
const profileForm = document.getElementById("chatProfileForm");
const profileDialog = document.getElementById("chatProfileDialog");
const settingsDialog = document.getElementById("chatSettingsDialog");
const profileNameInput = document.getElementById("chatProfileName");
const profilePhotoInput = document.getElementById("chatProfilePhoto");
const chatApp = document.getElementById("messengerApp");
const AVATAR_MAX_LENGTH = 180000;

function setStatus(message, isError = false) {
  if (!isError && message.startsWith("Signed in as ")) message = "";
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
    return `${action} was blocked by Firestore rules (permission-denied). Publish the latest firestore.rules to the LovePlay Firebase project, then try again.`;
  }
  if (code === "storage/unauthorized") {
    return `${action} was blocked by Firebase Storage rules. Enable Firebase Storage and publish the latest storage.rules.`;
  }
  if (code === "storage/bucket-not-found") {
    return "Firebase Storage is not enabled for this project yet. Create its default storage bucket, then try again.";
  }
  if (code === "failed-precondition") return `${action} needs a Firestore index or setup change. Check the browser console for Firebase's details.`;
  if (code === "unavailable") return `${action} could not reach Firestore. Check your internet connection and try again.`;
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
  const storage = getStorage(app);
  const realtimeDatabase = typeof firebaseConfig.databaseURL === "string" && firebaseConfig.databaseURL.startsWith("https://")
    ? getDatabase(app, firebaseConfig.databaseURL)
    : null;
  const profileCache = new Map();
  let currentUser = null;
  let currentProfile = null;
  let currentConversationId = null;
  let currentRecipient = null;
  let latestMessageSnapshot = null;
  let unsubscribeConversations = null;
  let unsubscribeMessages = null;
  let searchTimer = null;
  let searchRequest = 0;
  let registrationInProgress = false;
  let currentShowActive = true;
  let presenceConnection = null;
  let presenceConnectionUnsubscribe = null;
  let latestConversations = [];
  let selectedAvatarDataUrl = null;
  let returnToSettingsAfterProfileEdit = false;
  let currentRecipientPresence = null;
  let recipientSeenMessageId = null;
  let typingTimer = null;
  let typingIdleTimer = null;
  let recipientTypingTimer = null;
  let typingGeneration = 0;
  let lastSeenMessageId = null;
  let mediaRecorder = null;
  let recordingChunks = [];
  let recordingTimeout = null;
  const presenceSubscriptions = new Map();
  const REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "👏"];
  const CHAT_THEMES = ["berry", "ocean", "lavender", "mint", "custom"];

  function syncActiveToggleControls(checked, disabled) {
    [activeToggle, settingsActiveToggle].forEach(toggle => {
      toggle.checked = checked;
      toggle.disabled = disabled;
    });
  }

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
        if (currentRecipient?.uid === uid) {
          const seenMessageId = status?.seen?.[currentConversationId]?.messageId || null;
          const seenChanged = seenMessageId !== recipientSeenMessageId;
          recipientSeenMessageId = seenMessageId;
          currentRecipientPresence = status || {};
          renderRecipientActivity();
          if (seenChanged) renderMessagesFromCurrentSnapshot();
        }
      }, error => {
        setStatus(describeError(error, "Loading active status"), true);
        renderPresence(uid, false);
      });
      presenceSubscriptions.set(uid, unsubscribe);
    });
  }

  async function startPresence(user) {
    if (!realtimeDatabase) {
      syncActiveToggleControls(false, true);
      return;
    }

    syncActiveToggleControls(false, false);
    try {
      const savedPreference = await getRealtimeValue(realtimeRef(realtimeDatabase, `presence/${user.uid}/showActive`));
      currentShowActive = savedPreference.val() !== false;
      syncActiveToggleControls(currentShowActive, false);
    } catch (error) {
      syncActiveToggleControls(currentShowActive, true);
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
    stopTyping();
    currentConversationId = null;
    currentRecipient = null;
    currentRecipientPresence = null;
    recipientSeenMessageId = null;
    lastSeenMessageId = null;
    chatApp.dataset.chatOpen = "false";
    if (unsubscribeMessages) unsubscribeMessages();
    unsubscribeMessages = null;
    document.getElementById("chatThread").hidden = true;
    document.getElementById("chatEmptyState").hidden = false;
    document.getElementById("chatEmptyState").textContent = "Search for a person to start a private chat.";
    document.getElementById("chatTypingStatus").hidden = true;
    clearTimeout(recipientTypingTimer);
    recipientTypingTimer = null;
    messagesList.replaceChildren();
  }

  function renderRecipientActivity() {
    clearTimeout(recipientTypingTimer);
    recipientTypingTimer = null;
    const typingStatus = currentRecipientPresence?.typing?.[currentConversationId];
    const updatedAt = typingStatus && typeof typingStatus === "object"
      ? typingStatus.updatedAt
      : null;
    const age = typeof updatedAt === "number" ? Date.now() - updatedAt : Infinity;
    const typing = age >= 0 && age < 3000;
    document.getElementById("chatTypingStatus").hidden = !typing;
    if (typing) {
      recipientTypingTimer = setTimeout(renderRecipientActivity, 3000 - age);
    }
  }

  function renderMessagesFromCurrentSnapshot() {
    if (latestMessageSnapshot) renderMessages(latestMessageSnapshot);
  }

  function stopTyping() {
    typingGeneration += 1;
    clearTimeout(typingTimer);
    clearTimeout(typingIdleTimer);
    typingTimer = null;
    typingIdleTimer = null;
    if (!realtimeDatabase || !currentUser || !currentConversationId) return;
    removeRealtimeValue(
      realtimeRef(realtimeDatabase, `presence/${currentUser.uid}/typing/${currentConversationId}`)
    ).catch(error => setStatus(describeError(error, "Updating typing status"), true));
  }

  function updateTypingStatus() {
    clearTimeout(typingTimer);
    clearTimeout(typingIdleTimer);
    const generation = ++typingGeneration;
    if (!realtimeDatabase || !currentUser || !currentConversationId) return;
    const conversationId = currentConversationId;
    const typingRef = realtimeRef(
      realtimeDatabase,
      `presence/${currentUser.uid}/typing/${conversationId}`
    );
    if (!messageInput.value.trim()) {
      removeRealtimeValue(typingRef).catch(error => setStatus(describeError(error, "Updating typing status"), true));
      return;
    }
    typingTimer = setTimeout(async () => {
      try {
        await onDisconnect(typingRef).remove();
        if (generation !== typingGeneration || conversationId !== currentConversationId) return;
        await setRealtimeValue(typingRef, { updatedAt: realtimeServerTimestamp() });
        if (generation !== typingGeneration || conversationId !== currentConversationId) {
          await removeRealtimeValue(typingRef);
          return;
        }
        typingIdleTimer = setTimeout(() => {
          if (generation === typingGeneration && conversationId === currentConversationId) {
            removeRealtimeValue(typingRef).catch(error => setStatus(describeError(error, "Updating typing status"), true));
          }
        }, 1800);
      } catch (error) {
        setStatus(describeError(error, "Updating typing status"), true);
      }
    }, 250);
  }

  function markLatestIncomingAsSeen(messages) {
    if (!realtimeDatabase || !currentUser || !currentConversationId) return;
    const latestIncoming = messages.slice().reverse()
      .find(message => message.data().senderId !== currentUser.uid);
    if (!latestIncoming || latestIncoming.id === lastSeenMessageId) return;
    lastSeenMessageId = latestIncoming.id;
    setRealtimeValue(
      realtimeRef(realtimeDatabase, `presence/${currentUser.uid}/seen/${currentConversationId}`),
      { messageId: latestIncoming.id, at: realtimeServerTimestamp() }
    ).catch(error => setStatus(describeError(error, "Updating read status"), true));
  }

  function profileFromSnapshot(snapshot) {
    if (!snapshot.exists()) return null;
    const profile = { uid: snapshot.id, ...snapshot.data() };
    profileCache.set(profile.uid, profile);
    return profile;
  }

  function setAvatar(container, profile) {
    const image = container.querySelector("img");
    const fallback = container.querySelector("span");
    const photoUrl = typeof profile.photoUrl === "string" ? profile.photoUrl : "";
    image.hidden = false;
    image.alt = photoUrl ? `${profile.displayName} profile photo` : "Default profile avatar";
    image.onerror = () => {
      image.onerror = null;
      image.src = "../ASSETS/avatar-default.svg";
      image.alt = "Default profile avatar";
    };
    image.src = photoUrl || "../ASSETS/avatar-default.svg";
    fallback.hidden = true;
    fallback.textContent = profile.displayName.trim().charAt(0).toLocaleUpperCase() || "?";
  }

  function renderCurrentProfile() {
    document.getElementById("chatAccountName").textContent = currentProfile.displayName;
    setAvatar(document.getElementById("chatAccountAvatar"), currentProfile);
    document.getElementById("chatSettingsName").textContent = currentProfile.displayName;
    setAvatar(document.getElementById("chatSettingsAvatar"), currentProfile);
  }

  function openProfileEditor(fromSettings = false) {
    returnToSettingsAfterProfileEdit = fromSettings;
    if (settingsDialog.open) settingsDialog.close();
    profileNameInput.value = currentProfile.displayName;
    selectedAvatarDataUrl = null;
    profilePhotoInput.value = "";
    setAvatar(document.getElementById("chatProfileAvatar"), currentProfile);
    profileDialog.showModal();
    profileNameInput.focus();
  }

  function closeProfileEditor() {
    if (profileDialog.open) profileDialog.close();
    selectedAvatarDataUrl = null;
    profilePhotoInput.value = "";
  }

  async function resizeAvatar(file) {
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file for your profile photo.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image smaller than 8 MB.");

    let bitmap;
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
    } else {
      bitmap = await new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Your browser could not open this image."));
        };
        image.src = objectUrl;
      });
    }
    try {
      let size = 256;
      let quality = 0.78;
      let dataUrl = "";
      while (size >= 96) {
        const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Your browser could not process this image.");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length <= AVATAR_MAX_LENGTH) return dataUrl;
        size = Math.floor(size * 0.75);
        quality = Math.max(0.5, quality - 0.08);
      }
      throw new Error("This image could not be compressed enough. Try a different photo.");
    } finally {
      bitmap.close?.();
    }
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
    const avatar = document.createElement("div");
    avatar.className = "messenger-avatar";
    avatar.setAttribute("aria-hidden", "true");
    const avatarImage = document.createElement("img");
    avatarImage.alt = "";
    avatarImage.hidden = true;
    const avatarFallback = document.createElement("span");
    avatar.append(avatarImage, avatarFallback);
    setAvatar(avatar, profile);
    const copy = document.createElement("div");
    copy.className = "messenger-person-copy";
    const name = document.createElement("strong");
    name.textContent = profile.displayName;
    const detail = document.createElement("span");
    detail.textContent = subtitle;
    copy.append(name, detail);
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
    copy.append(presence);
    button.append(avatar, copy);
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

  function messagePreview(message) {
    if (message.type === "image") return "Photo";
    if (message.type === "audio") return "Voice message";
    if (message.type === "gif") return "GIF";
    if (message.type === "sticker") return "Sticker";
    return message.text;
  }

  async function sendChatMessage({ type = "text", text = "", blob = null, mediaUrl = "" } = {}) {
    if (!currentConversationId || !currentRecipient || !currentUser) return;
    const conversationId = currentConversationId;
    const conversationRef = doc(db, "conversations", conversationId);
    const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
    let uploadedRef = null;
    let finalMediaUrl = mediaUrl;

    try {
      if (blob) {
        const extension = blob.type.includes("png") ? "png"
          : blob.type.includes("webp") ? "webp"
            : blob.type.includes("ogg") ? "ogg"
              : blob.type.includes("mp4") ? "m4a"
                : blob.type.includes("mpeg") ? "mp3"
                  : blob.type.includes("wav") ? "wav"
                    : blob.type.includes("gif") ? "gif"
                      : blob.type.includes("webm") ? "webm"
                        : "jpg";
        uploadedRef = storageRef(
          storage,
          `conversations/${conversationId}/messages/${currentUser.uid}/${messageRef.id}.${extension}`
        );
        if (type === "audio") setStatus("Uploading voice message...");
        const upload = await uploadBytes(uploadedRef, blob, { contentType: blob.type.split(";")[0] });
        finalMediaUrl = await getDownloadURL(upload.ref);
      }

      const messageData = {
        senderId: currentUser.uid,
        senderName: currentProfile.displayName,
        text,
        type,
        reactions: {},
        createdAt: serverTimestamp()
      };
      if (uploadedRef) {
        messageData.mediaPath = uploadedRef.fullPath;
        messageData.mediaUrl = finalMediaUrl;
      } else if (type === "gif" || type === "image") {
        messageData.mediaUrl = finalMediaUrl;
      }

      const batch = writeBatch(db);
      batch.set(messageRef, messageData);
      batch.update(conversationRef, {
        lastMessage: messagePreview(messageData),
        updatedAt: serverTimestamp()
      });
      await batch.commit();
      if (type === "text") {
        messageInput.value = "";
        messageInput.focus();
      }
      stickerPicker.hidden = true;
      stickerButton.setAttribute("aria-expanded", "false");
      setStatus("");
    } catch (error) {
      if (uploadedRef) {
        try {
          await deleteObject(uploadedRef);
        } catch (cleanupError) {
          console.warn("Could not remove an unlinked chat upload.", cleanupError);
        }
      }
      setStatus(describeError(error, "Sending message"), true);
    }
  }

  async function updateMessageReaction(messageId, existingReaction, nextReaction) {
    if (!currentConversationId || !currentUser) return;
    try {
      await updateDoc(
        doc(db, "conversations", currentConversationId, "messages", messageId),
        { [`reactions.${currentUser.uid}`]: existingReaction === nextReaction ? deleteField() : nextReaction }
      );
    } catch (error) {
      setStatus(describeError(error, "Updating reaction"), true);
    }
  }

  async function deleteMessageForEveryone(messageSnapshot, message) {
    if (!currentUser || message.senderId !== currentUser.uid || !currentConversationId) return;
    if (!window.confirm("Delete this message for everyone in this chat?")) return;
    const conversationId = currentConversationId;
    const conversationRef = doc(db, "conversations", conversationId);
    const messageRef = doc(db, "conversations", conversationId, "messages", messageSnapshot.id);

    try {
      const latest = await getDocs(query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "desc"),
        limit(2)
      ));
      const isLatest = latest.docs[0]?.id === messageSnapshot.id;
      const nextMessage = latest.docs.find(snapshot => snapshot.id !== messageSnapshot.id);
      const batch = writeBatch(db);
      batch.delete(messageRef);
      if (isLatest) {
        batch.update(conversationRef, {
          lastMessage: nextMessage ? messagePreview(nextMessage.data()) : "",
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      if (message.mediaPath) {
        try {
          await deleteObject(storageRef(storage, message.mediaPath));
        } catch (error) {
          setStatus("Message deleted for everyone, but its uploaded file could not be removed.", true);
          console.warn("Could not remove a deleted chat attachment.", error);
          return;
        }
      }
      setStatus("Message deleted for everyone.");
    } catch (error) {
      setStatus(describeError(error, "Deleting message"), true);
    }
  }

  function renderReactions(messageId, reactions = {}) {
    const ownReaction = reactions[currentUser.uid] || "";
    const counts = new Map();
    Object.values(reactions).forEach(reaction => {
      if (REACTION_EMOJIS.includes(reaction)) counts.set(reaction, (counts.get(reaction) || 0) + 1);
    });
    const controls = document.createElement("div");
    controls.className = "messenger-message-actions";
    if (counts.size) {
      const summary = document.createElement("div");
      summary.className = "messenger-reaction-summary";
      counts.forEach((count, emoji) => {
        const reaction = document.createElement("span");
        reaction.textContent = `${emoji} ${count}`;
        summary.append(reaction);
      });
      controls.append(summary);
    }

    const picker = document.createElement("details");
    picker.className = "messenger-reaction-picker";
    const summary = document.createElement("summary");
    summary.textContent = "☺";
    summary.setAttribute("aria-label", "React to message");
    picker.append(summary);
    const options = document.createElement("div");
    options.className = "messenger-reaction-options";
    REACTION_EMOJIS.forEach(emoji => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = emoji;
      button.setAttribute("aria-label", `React with ${emoji}`);
      button.setAttribute("aria-pressed", String(ownReaction === emoji));
      button.addEventListener("click", () => {
        picker.open = false;
        updateMessageReaction(messageId, ownReaction, emoji);
      });
      options.append(button);
    });
    picker.append(options);
    controls.append(picker);
    return controls;
  }

  function renderMessages(snapshot) {
    latestMessageSnapshot = snapshot;
    const messages = snapshot.docs.slice().reverse();
    messagesList.replaceChildren();
    if (messages.length === 0) {
      const item = document.createElement("li");
      item.className = "messenger-empty";
      item.textContent = "Say hello to start the conversation.";
      messagesList.append(item);
      return;
    }

    markLatestIncomingAsSeen(messages);
    const seenMessageId = currentRecipientPresence?.seen?.[currentConversationId]?.messageId;
    const seenMessageIndex = messages.findIndex(messageSnapshot => messageSnapshot.id === seenMessageId);
    let latestSeenOwnIndex = -1;
    if (seenMessageIndex >= 0) {
      for (let index = 0; index <= seenMessageIndex; index += 1) {
        if (messages[index].data().senderId === currentUser.uid) latestSeenOwnIndex = index;
      }
    }

    messages.forEach((messageSnapshot, messageIndex) => {
      const message = messageSnapshot.data();
      const own = message.senderId === currentUser.uid;
      const item = document.createElement("li");
      item.className = "messenger-message";
      item.dataset.own = String(own);
      if (!own && currentRecipient) {
        const avatar = document.createElement("div");
        avatar.className = "messenger-avatar messenger-message-avatar";
        avatar.setAttribute("aria-hidden", "true");
        const avatarImage = document.createElement("img");
        avatarImage.alt = "";
        avatarImage.hidden = true;
        const avatarFallback = document.createElement("span");
        avatar.append(avatarImage, avatarFallback);
        setAvatar(avatar, currentRecipient);
        item.append(avatar);
      }

      const bubble = document.createElement("div");
      bubble.className = "messenger-message-bubble";
      if (message.type === "image" || message.type === "gif") {
        const image = document.createElement("img");
        image.className = `messenger-message-media${message.type === "gif" ? " messenger-message-gif" : ""}`;
        image.src = message.mediaUrl;
        image.alt = message.type === "gif" ? "GIF" : `Photo from ${message.senderName}`;
        image.loading = "lazy";
        image.addEventListener("error", () => {
          image.replaceWith(document.createTextNode("This image is no longer available."));
        }, { once: true });
        bubble.append(image);
      } else if (message.type === "audio") {
        const audio = document.createElement("audio");
        audio.className = "messenger-message-audio";
        audio.controls = true;
        audio.preload = "metadata";
        audio.src = message.mediaUrl;
        bubble.append(audio);
      } else if (message.type === "sticker") {
        const sticker = document.createElement("span");
        sticker.className = "messenger-message-sticker";
        sticker.textContent = message.text;
        bubble.append(sticker);
      } else if (message.type === "deleted") {
        const deleted = document.createElement("em");
        deleted.textContent = "This message was deleted.";
        bubble.append(deleted);
      } else {
        bubble.append(document.createTextNode(message.text || ""));
      }

      const time = document.createElement("small");
      const date = message.createdAt?.toDate?.();
      time.textContent = `${own ? "You" : message.senderName} · ${
        date ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) : "Sending..."
      }`;
      bubble.append(time);
      const content = document.createElement("div");
      content.className = "messenger-message-content";
      content.append(bubble, renderReactions(messageSnapshot.id, message.reactions));
      if (own) {
        const deleteButton = document.createElement("button");
        deleteButton.className = "messenger-delete-message";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete for everyone";
        deleteButton.addEventListener("click", event => {
          event.stopPropagation();
          deleteMessageForEveryone(messageSnapshot, message);
        });
        content.append(deleteButton);
        if (messageIndex === latestSeenOwnIndex) {
          const receipt = document.createElement("div");
          receipt.className = "messenger-read-receipt";
          const avatar = document.createElement("span");
          avatar.className = "messenger-avatar messenger-seen-avatar";
          avatar.setAttribute("aria-hidden", "true");
          const image = document.createElement("img");
          image.alt = "";
          image.hidden = true;
          avatar.append(image, document.createElement("span"));
          setAvatar(avatar, currentRecipient);
          const label = document.createElement("span");
          label.textContent = "Seen";
          receipt.append(avatar, label);
          content.append(receipt);
        }
      }
      item.append(content);
      item.addEventListener("click", event => {
        if (event.target.closest("button, details, summary, audio, a")) return;
        item.dataset.actionsOpen = String(item.dataset.actionsOpen !== "true");
      });
      messagesList.append(item);
    });
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  function subscribeToMessages(conversationId) {
    if (unsubscribeMessages) unsubscribeMessages();
    latestMessageSnapshot = null;
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
    stopTyping();
    const participants = [currentUser.uid, recipient.uid].sort();
    const conversationId = `dm_${participants.join("_")}`;
    const conversationRef = doc(db, "conversations", conversationId);
    currentConversationId = conversationId;
    currentRecipient = recipient;
    currentRecipientPresence = null;
    recipientSeenMessageId = null;
    lastSeenMessageId = null;
    clearTimeout(recipientTypingTimer);
    recipientTypingTimer = null;
    clearTimeout(typingTimer);
    typingTimer = null;
    document.getElementById("chatRecipientName").textContent = recipient.displayName;
    setAvatar(document.getElementById("chatRecipientAvatar"), recipient);
    const recipientStatus = document.getElementById("chatRecipientStatus");
    recipientStatus.dataset.presenceUid = recipient.uid;
    recipientStatus.querySelector("span:last-child").textContent = "Private conversation · Offline";
    document.getElementById("chatTypingStatus").hidden = true;
    document.getElementById("chatThread").hidden = false;
    document.getElementById("chatEmptyState").hidden = true;
    chatApp.dataset.chatOpen = "true";
    applyChatTheme(conversationId);
    messagesList.replaceChildren();
    syncPresenceSubscriptions();

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
      subscribeToMessages(conversationId);
      setStatus(`Private chat with ${recipient.displayName}.`);
      messageInput.focus();
    } catch (error) {
      setStatus(describeError(error, "Opening chat"), true);
    }
  }

  async function renderConversations(snapshot) {
    latestConversations = snapshot.docs.slice();
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
    renderCurrentProfile();
    clearConversation();
    watchConversations();
    renderSearchMessage("Type at least 2 letters to find people.");
    await startPresence(user);
    setStatus("");
  }

  document.getElementById("chatEditProfile").addEventListener("click", openProfileEditor);
  document.getElementById("chatEditProfileDetails").addEventListener("click", openProfileEditor);
  document.getElementById("chatCancelProfile").addEventListener("click", closeProfileEditor);
  document.getElementById("chatCancelProfileFooter").addEventListener("click", closeProfileEditor);
  profileDialog.addEventListener("close", () => {
    selectedAvatarDataUrl = null;
    profilePhotoInput.value = "";
    if (returnToSettingsAfterProfileEdit && currentUser) {
      returnToSettingsAfterProfileEdit = false;
      settingsDialog.showModal();
    }
  });
  [document.getElementById("chatSettingsButton"), document.getElementById("chatSettingsDesktopButton")]
    .forEach(button => button.addEventListener("click", () => {
    if (currentUser) settingsDialog.showModal();
    }));
  document.getElementById("chatCloseSettings").addEventListener("click", () => {
    settingsDialog.close();
  });
  document.getElementById("chatSettingsEditProfile").addEventListener("click", () => {
    openProfileEditor(true);
  });
  document.getElementById("chatBackToList").addEventListener("click", () => {
    chatApp.dataset.chatOpen = "false";
    document.getElementById("chatEmptyState").hidden = true;
    document.getElementById("chatUserSearch").focus();
  });

  profilePhotoInput.addEventListener("change", async () => {
    const file = profilePhotoInput.files?.[0];
    if (!file) return;
    try {
      selectedAvatarDataUrl = await resizeAvatar(file);
      setAvatar(document.getElementById("chatProfileAvatar"), {
        displayName: profileNameInput.value || currentProfile.displayName,
        photoUrl: selectedAvatarDataUrl
      });
      setStatus("Photo ready. Save changes to update your profile.");
    } catch (error) {
      profilePhotoInput.value = "";
      setStatus(error.message || "Could not prepare that profile photo.", true);
    }
  });

  document.getElementById("chatRemovePhoto").addEventListener("click", () => {
    selectedAvatarDataUrl = "";
    setAvatar(document.getElementById("chatProfileAvatar"), {
      displayName: profileNameInput.value || currentProfile.displayName,
      photoUrl: ""
    });
    profilePhotoInput.value = "";
  });

  profileNameInput.addEventListener("input", () => {
    if (selectedAvatarDataUrl) {
      setAvatar(document.getElementById("chatProfileAvatar"), {
        displayName: profileNameInput.value || currentProfile.displayName,
        photoUrl: selectedAvatarDataUrl
      });
    } else if (!profileForm.hidden) {
      setAvatar(document.getElementById("chatProfileAvatar"), {
        ...currentProfile,
        displayName: profileNameInput.value || currentProfile.displayName
      });
    }
  });

  profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    const displayName = profileNameInput.value.trim();
    if (displayName.length < 2 || displayName.length > 40) {
      setStatus("Your display name must be between 2 and 40 characters.", true);
      return;
    }

    const displayNameSearch = displayName.normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .trim();
    const updates = { displayName, displayNameSearch };
    if (selectedAvatarDataUrl !== null) updates.photoUrl = selectedAvatarDataUrl;
    setFormBusy(profileForm, true);
    setStatus("Saving profile...");
    try {
      await updateDoc(doc(db, "profiles", currentUser.uid), updates);
      currentProfile = { ...currentProfile, ...updates };
      profileCache.set(currentUser.uid, currentProfile);
      renderCurrentProfile();
      if (currentConversationId && currentRecipient) {
        document.getElementById("chatRecipientName").textContent = currentRecipient.displayName;
      }
      await renderConversations({ docs: latestConversations });
      if (searchInput.value.trim().length >= 2) await searchPeople();
      closeProfileEditor();
      setStatus("Your profile was updated.");
    } catch (error) {
      setStatus(describeError(error, "Saving profile"), true);
    } finally {
      setFormBusy(profileForm, false);
    }
  });

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

  messageForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    stopTyping();
    sendChatMessage({ text });
  });
  messageInput.addEventListener("input", event => {
    if ([
      "insertText",
      "insertCompositionText",
      "deleteContentBackward",
      "deleteContentForward"
    ].includes(event.inputType)) {
      updateTypingStatus();
    }
  });
  messageInput.addEventListener("blur", stopTyping);

  function saveChatTheme(conversationId, theme, color = chatCustomThemeColor.value) {
    if (!CHAT_THEMES.includes(theme)) return;
    try {
      localStorage.setItem(`loveplay-chat-theme-${conversationId}`, theme);
      if (theme === "custom" && /^#[0-9a-f]{6}$/i.test(color)) {
        localStorage.setItem(`loveplay-chat-theme-color-${conversationId}`, color);
      }
      chatApp.dataset.chatTheme = theme;
      chatThemeSelect.value = theme;
      chatCustomThemeColor.hidden = theme !== "custom";
      if (theme === "custom" && /^#[0-9a-f]{6}$/i.test(color)) {
        chatApp.style.setProperty("--chat-custom-accent", color);
        chatCustomThemeColor.value = color;
      } else {
        chatApp.style.removeProperty("--chat-custom-accent");
      }
    } catch (error) {
      setStatus("Could not save this chat's color theme.", true);
    }
  }

  function applyChatTheme(conversationId) {
    let theme = "berry";
    let color = "#87516f";
    try {
      const savedTheme = localStorage.getItem(`loveplay-chat-theme-${conversationId}`);
      if (CHAT_THEMES.includes(savedTheme)) theme = savedTheme;
      const savedColor = localStorage.getItem(`loveplay-chat-theme-color-${conversationId}`);
      if (savedColor && /^#[0-9a-f]{6}$/i.test(savedColor)) color = savedColor;
    } catch (error) {
      setStatus("Could not load this chat's color theme.", true);
    }
    chatApp.dataset.chatTheme = theme;
    chatThemeSelect.value = theme;
    chatCustomThemeColor.hidden = theme !== "custom";
    chatCustomThemeColor.value = color;
    if (theme === "custom") chatApp.style.setProperty("--chat-custom-accent", color);
    else chatApp.style.removeProperty("--chat-custom-accent");
  }

  chatThemeSelect.addEventListener("change", () => {
    chatCustomThemeColor.hidden = chatThemeSelect.value !== "custom";
    if (currentConversationId) saveChatTheme(currentConversationId, chatThemeSelect.value);
  });
  chatCustomThemeColor.addEventListener("input", () => {
    if (currentConversationId && chatThemeSelect.value === "custom") {
      saveChatTheme(currentConversationId, "custom", chatCustomThemeColor.value);
    }
  });

  async function resizeChatImage(file) {
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file to send.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Choose a photo smaller than 8 MB.");
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not process that photo.");
      let scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
      let quality = 0.8;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(result => {
            if (result) resolve(result);
            else reject(new Error("Your browser could not prepare that photo."));
          }, "image/jpeg", quality);
        });
        if (blob.size <= 640 * 1024) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener("load", () => resolve(reader.result), { once: true });
            reader.addEventListener("error", () => reject(new Error("Your browser could not prepare that photo.")), { once: true });
            reader.readAsDataURL(blob);
          });
        }
        scale *= 0.84;
        quality = Math.max(0.45, quality - 0.06);
      }
      throw new Error("That photo could not be compressed small enough to send. Try a smaller image.");
    } finally {
      bitmap.close();
    }
  }

  document.getElementById("chatImageButton").addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    try {
      const mediaUrl = await resizeChatImage(file);
      await sendChatMessage({ type: "image", text: "Photo", mediaUrl });
    } catch (error) {
      setStatus(error.message || describeError(error, "Preparing photo"), true);
    } finally {
      imageInput.value = "";
    }
  });

  voiceButton.addEventListener("click", async () => {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
      voiceButton.setAttribute("aria-label", "Record a voice message");
      voiceButton.classList.remove("is-recording");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== "function") {
      setStatus("Voice recording is not supported by this browser.", true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.addEventListener("dataavailable", event => {
        if (event.data.size) recordingChunks.push(event.data);
      });
      mediaRecorder.addEventListener("stop", async () => {
        clearTimeout(recordingTimeout);
        stream.getTracks().forEach(track => track.stop());
        voiceButton.classList.remove("is-recording");
        voiceButton.setAttribute("aria-label", "Record a voice message");
        const recording = new Blob(recordingChunks, { type: mediaRecorder.mimeType || "audio/webm" });
        recordingChunks = [];
        mediaRecorder = null;
        if (!recording.size) {
          setStatus("No voice audio was recorded.", true);
          return;
        }
        if (recording.size > 10 * 1024 * 1024) {
          setStatus("That voice message is too large to send. Record a shorter message.", true);
          return;
        }
        await sendChatMessage({ type: "audio", text: "Voice message", blob: recording });
      }, { once: true });
      mediaRecorder.start();
      voiceButton.classList.add("is-recording");
      voiceButton.setAttribute("aria-label", "Stop recording and send voice message");
      setStatus("Recording voice message. Tap stop when you are done.");
      recordingTimeout = setTimeout(() => {
        if (mediaRecorder?.state === "recording") mediaRecorder.stop();
      }, 120000);
    } catch (error) {
      setStatus(error.message || "Could not access the microphone.", true);
    }
  });

  stickerButton.addEventListener("click", () => {
    stickerPicker.hidden = !stickerPicker.hidden;
    stickerButton.setAttribute("aria-expanded", String(!stickerPicker.hidden));
  });
  stickerPicker.addEventListener("click", event => {
    const button = event.target.closest("[data-chat-sticker]");
    if (!button) return;
    sendChatMessage({ type: "sticker", text: button.dataset.chatSticker });
  });

  document.getElementById("chatGifButton").addEventListener("click", () => gifDialog.showModal());
  document.getElementById("chatCloseGif").addEventListener("click", () => gifDialog.close());
  document.getElementById("chatGifSearch").addEventListener("input", event => {
    const term = event.target.value.trim();
    document.getElementById("chatGifSearchLink").href =
      `https://giphy.com/search/${encodeURIComponent(term)}`;
  });

  function isAllowedGifUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        ["media.giphy.com", "i.giphy.com", "media.tenor.com"].includes(url.hostname.toLowerCase()) &&
        /\.gif$/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  gifForm.addEventListener("submit", async event => {
    event.preventDefault();
    const url = document.getElementById("chatGifUrl").value.trim();
    if (!isAllowedGifUrl(url)) {
      setStatus("Paste a direct HTTPS GIF link from GIPHY or Tenor.", true);
      return;
    }
    await sendChatMessage({ type: "gif", text: "GIF", mediaUrl: url });
    gifDialog.close();
    gifForm.reset();
    document.getElementById("chatGifSearchLink").href = "https://giphy.com/";
  });

  async function signOutCurrentUser() {
    settingsDialog.close();
    try {
      stopPresence();
      await signOut(auth);
      setStatus("You are signed out.");
    } catch (error) {
      setStatus(describeError(error, "Sign out"), true);
    }
  }

  async function updateActiveStatus(toggle) {
    if (!realtimeDatabase || !currentUser) return;
    const requestedPreference = toggle.checked;
    syncActiveToggleControls(requestedPreference, true);
    try {
      await setRealtimeValue(
        realtimeRef(realtimeDatabase, `presence/${currentUser.uid}/showActive`),
        requestedPreference
      );
      currentShowActive = requestedPreference;
      setStatus(requestedPreference ? "Your active status is visible to signed-in users." : "Your active status is hidden.");
    } catch (error) {
      syncActiveToggleControls(currentShowActive, false);
      setStatus(describeError(error, "Updating active status"), true);
    } finally {
      syncActiveToggleControls(currentShowActive, false);
    }
  }

  activeToggle.addEventListener("change", () => updateActiveStatus(activeToggle));
  settingsActiveToggle.addEventListener("change", () => updateActiveStatus(settingsActiveToggle));
  [document.getElementById("chatSignOut"), document.getElementById("chatSettingsSignOut")]
    .forEach(button => button.addEventListener("click", signOutCurrentUser));

  onAuthStateChanged(auth, async user => {
    clearSubscriptions();
    stopPresence();
    if (registrationInProgress) return;
    if (!user) {
      currentUser = null;
      currentProfile = null;
      profileCache.clear();
      latestConversations = [];
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
