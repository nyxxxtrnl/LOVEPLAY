import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { Share } from "@capacitor/share";

const isNative = Capacitor.isNativePlatform();
const publicAppUrl = "https://nyxxxtrnl.github.io/LOVEPLAY/DASHBOARD/index.html#home";

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function showError(message) {
  const status = document.getElementById("messengerStatus");
  if (status) {
    status.textContent = message;
    status.dataset.error = "true";
    return;
  }
  showToast(message);
}

function dispatchPushToken(token) {
  document.dispatchEvent(new CustomEvent("loveplay:push-token", {
    detail: { token, platform: Capacitor.getPlatform() }
  }));
}

const pushListenersReady = isNative
  ? Promise.all([
      FirebaseMessaging.addListener("tokenReceived", ({ token }) => dispatchPushToken(token)),
      FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
        const conversationId = notification.data?.conversationId;
        window.location.hash = "chat";
        if (conversationId) {
          window.LovePlayPendingConversationId = conversationId;
          document.dispatchEvent(new CustomEvent("loveplay:open-conversation", {
            detail: { conversationId }
          }));
        }
      }),
      FirebaseMessaging.addListener("notificationReceived", ({ notification }) => {
        showToast(notification.title || "New LovePlay notification.");
      })
    ])
  : Promise.resolve();

async function chooseNativePhoto(input) {
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.Uri,
      quality: 90,
      allowEditing: false,
      promptLabelHeader: "Choose a photo",
      promptLabelPhoto: "Photo library",
      promptLabelPicture: "Camera"
    });
    if (!photo.webPath) throw new Error("The selected photo could not be opened.");

    const response = await fetch(photo.webPath);
    if (!response.ok) throw new Error(`Could not load the selected photo (${response.status}).`);
    const blob = await response.blob();
    const mimeType = blob.type || (photo.format === "png" ? "image/png" : "image/jpeg");
    const extension = mimeType === "image/png" ? "png" : "jpg";
    const file = new File([blob], `loveplay-${Date.now()}.${extension}`, { type: mimeType });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("cancel")) return;
    console.error("Could not select a photo in the LovePlay app.", error);
    showError(error.message || "Could not open the camera or photo library.");
  }
}

if (isNative) {
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const input = target?.closest('input[type="file"][accept*="image"]');
    if (!input) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void chooseNativePhoto(input);
  }, true);
}

const shareButton = document.getElementById("shareLovePlay");
shareButton?.addEventListener("click", async () => {
  try {
    if (isNative) {
      await Share.share({
        title: "LovePlay",
        text: "A little world, made for you.",
        url: isNative ? publicAppUrl : window.location.href,
        dialogTitle: "Share LovePlay"
      });
    } else if (navigator.share) {
      await navigator.share({
        title: "LovePlay",
        text: "A little world, made for you.",
        url: window.location.href
      });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(window.location.href);
      showToast("LovePlay link copied.");
    } else {
      throw new Error("Sharing is not available on this device.");
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error("Could not share LovePlay.", error);
    showError(error.message || "Could not share LovePlay.");
  }
});

const enablePushButton = document.getElementById("chatEnablePush");
if (enablePushButton) enablePushButton.hidden = !isNative;
enablePushButton?.addEventListener("click", async () => {
  enablePushButton.disabled = true;
  try {
    const permission = await FirebaseMessaging.requestPermissions();
    if (permission.receive !== "granted") {
      throw new Error("Allow notifications in your device settings to receive chat alerts.");
    }
    await pushListenersReady;
    const { token } = await FirebaseMessaging.getToken();
    dispatchPushToken(token);
    showToast("Notifications enabled for this app.");
  } catch (error) {
    console.error("Could not enable LovePlay notifications.", error);
    showError(error.message || "Could not enable notifications.");
  } finally {
    enablePushButton.disabled = false;
  }
});

window.LovePlayNative = Object.freeze({
  isNative,
  platform: Capacitor.getPlatform()
});
