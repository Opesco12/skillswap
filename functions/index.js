/**
 * Firebase Cloud Functions for SkillSwap notifications.
 * Triggers notifications for exchange creation, updates, messages, and ratings.
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Fetches the displayName of a user from the users collection.
 * @param {string} userId - The ID of the user.
 * @return {Promise<string>} The user's displayName or "Someone" if not found.
 */
async function getUserDisplayName(userId) {
  try {
    const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .get();
    return userDoc.exists ? userDoc.data().displayName || "Someone" : "Someone";
  } catch (error) {
    console.error(`Error fetching displayName for user ${userId}:`, error);
    return "Someone";
  }
}

// Exchange Created: Notify recipient
exports.onExchangeCreate = functions.firestore
    .document("exchanges/{exchangeId}")
    .onCreate(async (snap, context) => {
      const exchange = snap.data();
      const initiatorName = await getUserDisplayName(exchange.initiatorId);

      const notification = {
        userId: exchange.recipientId,
        type: "exchange_request",
        title: "New Exchange Request",
        message: `New exchange proposed by ${initiatorName}`,
        relatedId: snap.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      try {
        await admin
            .firestore()
            .collection("notifications")
            .doc()
            .set(notification);
        console.log(
            `Notification created for user ${exchange.recipientId}: ` +
          "exchange_request",
        );
      } catch (error) {
        console.error("Error creating exchange_request notification:", error);
      }
    });

// Exchange Status Updated: Notify initiator
exports.onExchangeUpdate = functions.firestore
    .document("exchanges/{exchangeId}")
    .onUpdate(async (change, context) => {
      const newData = change.after.data();
      const oldData = change.before.data();

      if (newData.status !== oldData.status) {
        const recipientName = await getUserDisplayName(newData.recipientId);
        const notification = {
          userId: newData.initiatorId,
          type: `exchange_${newData.status}`,
          title: `Exchange ${
            newData.status.charAt(0).toUpperCase() + newData.status.slice(1)
          }`,
          message:
          `Your exchange with ${recipientName} has been ` + `${newData.status}`,
          relatedId: context.params.exchangeId,
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        try {
          await admin
              .firestore()
              .collection("notifications")
              .doc()
              .set(notification);
          console.log(
              `Notification created for user ${newData.initiatorId}: ` +
            `exchange_${newData.status}`,
          );
        } catch (error) {
          console.error(
              `Error creating exchange_${newData.status} notification:`,
              error,
          );
        }
      }
    });

// New Message: Notify recipient
exports.onMessageCreate = functions.firestore
    .document("messages/{messageId}")
    .onCreate(async (snap, context) => {
      const message = snap.data();
      const senderName = await getUserDisplayName(message.senderId);

      const notification = {
        userId: message.recipientId,
        type: "new_message",
        title: "New Message",
        message: `New message from ${senderName}`,
        relatedId: message.chatId,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      try {
        await admin
            .firestore()
            .collection("notifications")
            .doc()
            .set(notification);
        console.log(
            `Notification created for user ${message.recipientId}: new_message`,
        );
      } catch (error) {
        console.error("Error creating new_message notification:", error);
      }
    });

// New Rating: Notify rated user
exports.onRatingCreate = functions.firestore
    .document("ratings/{ratingId}")
    .onCreate(async (snap, context) => {
      const rating = snap.data();
      const raterName = await getUserDisplayName(rating.raterId);

      const notification = {
        userId: rating.ratedUserId,
        type: "new_rating",
        title: "New Rating Received",
        message: `You received a rating from ${raterName}`,
        relatedId: rating.ratedUserId,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      try {
        await admin
            .firestore()
            .collection("notifications")
            .doc()
            .set(notification);
        console.log(
            `Notification created for user ${rating.ratedUserId}: new_rating`,
        );
      } catch (error) {
        console.error("Error creating new_rating notification:", error);
      }
    });
