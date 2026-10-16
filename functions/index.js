const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

initializeApp();
setGlobalOptions({ maxInstances: 5 });

exports.notifyNewChatMessage = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async event => {
    const message = event.data?.data();
    const senderId = message?.senderId;
    if (typeof senderId !== "string") return;

    const conversationId = event.params.conversationId;
    const conversation = await getFirestore()
      .collection("conversations")
      .doc(conversationId)
      .get();
    const participants = conversation.data()?.participants;
    if (!Array.isArray(participants) || !participants.includes(senderId)) return;

    const recipientIds = participants.filter(uid => uid !== senderId);
    const body = message.type === "image"
      ? "Sent you a photo."
      : message.type === "audio"
        ? "Sent you a voice message."
        : "Sent you a message.";

    for (const recipientId of recipientIds) {
      const tokenSnapshot = await getDatabase()
        .ref(`pushTokens/${recipientId}`)
        .get();
      const entries = Object.entries(tokenSnapshot.val() || {})
        .filter(([, value]) => typeof value?.token === "string");
      if (!entries.length) continue;

      const response = await getMessaging().sendEachForMulticast({
        tokens: entries.map(([, value]) => value.token),
        notification: {
          title: typeof message.senderName === "string" ? message.senderName : "LovePlay",
          body
        },
        data: {
          conversationId,
          url: "https://nyxxxtrnl.github.io/LOVEPLAY/DASHBOARD/index.html#chat"
        },
        android: { priority: "high" }
      });

      const staleTokens = [];
      response.responses.forEach((result, index) => {
        if (result.success) return;
        const code = result.error?.code;
        if (code === "messaging/registration-token-not-registered"
          || code === "messaging/invalid-registration-token") {
          staleTokens.push(entries[index][0]);
        } else {
          logger.warn("Could not deliver a LovePlay chat notification.", {
            recipientId,
            code: code || "unknown"
          });
        }
      });

      await Promise.all(staleTokens.map(tokenKey =>
        getDatabase().ref(`pushTokens/${recipientId}/${tokenKey}`).remove()
      ));
    }
  }
);
