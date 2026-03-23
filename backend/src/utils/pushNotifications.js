const { Expo } = require("expo-server-sdk");
const admin = require("firebase-admin");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");

const expo = new Expo();
let firebaseReady = false;

const FIREBASE_STALE_TOKEN_ERRORS = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

const EXPO_STALE_TOKEN_ERRORS = new Set(["DeviceNotRegistered"]);

console.log("[Push] Initializing Push Notifications Utility...");

const loadServiceAccountFromEnvParts = () => {
  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKeyRaw = String(process.env.FIREBASE_PRIVATE_KEY || "").trim();

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return null;
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKeyRaw.replace(/\\n/g, "\n"),
  };
};

const loadServiceAccountFromPath = (rawPath) => {
  const candidatePath = String(rawPath || "").trim();
  if (!candidatePath) return null;

  const absolutePath = path.isAbsolute(candidatePath)
    ? candidatePath
    : path.resolve(__dirname, "../../", candidatePath);

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  return { json: JSON.parse(raw), source: absolutePath };
};

// Initialize Firebase Admin for Android Direct Push
try {
  let serviceAccount;
  const firebaseServiceAccountRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const firebaseServiceAccountFromParts = loadServiceAccountFromEnvParts();
  const configuredServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  if (firebaseServiceAccountRaw) {
    console.log("[Push] Found Firebase service account in environment variable.");
    serviceAccount = JSON.parse(firebaseServiceAccountRaw);
  } else if (firebaseServiceAccountFromParts) {
    console.log("[Push] Loaded Firebase service account from FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");
    serviceAccount = firebaseServiceAccountFromParts;
  } else if (configuredServiceAccountPath) {
    const fromPath = loadServiceAccountFromPath(configuredServiceAccountPath);
    if (!fromPath) {
      throw new Error(`Configured FIREBASE_SERVICE_ACCOUNT_PATH not found: ${configuredServiceAccountPath}`);
    }
    console.log(`[Push] Loaded Firebase service account from: ${fromPath.source}`);
    serviceAccount = fromPath.json;
  } else {
    const fallbackPaths = [
      "./pageturner-c5be1-firebase-adminsdk-fbsvc-4b43bbd046.json",
      "./src/utils/firebase-service-account.json",
    ];

    let loaded = null;
    for (const fallbackPath of fallbackPaths) {
      const fromPath = loadServiceAccountFromPath(fallbackPath);
      if (fromPath) {
        loaded = fromPath;
        break;
      }
    }

    if (!loaded) {
      throw new Error(
        "No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH."
      );
    }

    console.log(`[Push] Loaded Firebase service account from fallback: ${loaded.source}`);
    serviceAccount = loaded.json;
  }
  
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseReady = true;
    console.log("[Push] Firebase Admin initialized successfully for Android.");
  } else {
    firebaseReady = true;
    console.log("[Push] Firebase Admin already initialized.");
  }
} catch (error) {
  console.error("[Push] CRITICAL: Firebase initialization failed.");
  console.error("[Push] Error Detail:", error.message);
  console.warn(
    "[Push] To fix: Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
  );
}

const normalizePushEntry = (entry) => {
  if (!entry) return null;
  if (typeof entry === "string") {
    return { token: entry.trim(), platform: "unknown" };
  }
  return {
    token: String(entry.token || "").trim(),
    platform: String(entry.platform || "unknown").trim() || "unknown",
  };
};

const removeStaleTokensFromUsers = async (tokens, reason = "unknown") => {
  const uniqueTokens = Array.from(new Set((tokens || []).filter(Boolean)));
  if (!uniqueTokens.length) return 0;

  const result = await User.updateMany(
    { "pushTokens.token": { $in: uniqueTokens } },
    {
      $pull: {
        pushTokens: { token: { $in: uniqueTokens } },
      },
    }
  );

  const modified = result.modifiedCount || 0;
  if (modified > 0) {
    console.warn(
      `[Push] Cleaned ${uniqueTokens.length} stale token(s) from ${modified} user(s). Reason: ${reason}`
    );
  }

  return modified;
};

const sendExpoAndCollectInvalidTokens = async (messages, logLabel) => {
  const uniqueMessages = Array.from(
    new Map((messages || []).map((message) => [message.to, message])).values()
  );

  const invalidTokens = new Set();
  let successCount = 0;
  let failureCount = 0;

  // Send one token per request to avoid mixed-project batch failures.
  for (const message of uniqueMessages) {
    try {
      const tickets = await expo.sendPushNotificationsAsync([message]);
      const ticket = tickets?.[0];
      if (ticket?.status === "ok") {
        successCount += 1;
        continue;
      }

      failureCount += 1;
      const errorCode = ticket?.details?.error;
      if (EXPO_STALE_TOKEN_ERRORS.has(errorCode)) {
        invalidTokens.add(message.to);
      }

      console.warn(
        `[Push] Expo ticket error (${logLabel}) for token ${message.to}: ${errorCode || ticket?.message || "unknown"}`
      );
    } catch (error) {
      failureCount += 1;
      console.error(`[Push] Expo error (${logLabel}) for token ${message.to}:`, error.message);
    }
  }

  console.log(`[Push] Expo response (${logLabel}): ${successCount} success, ${failureCount} failure.`);
  return Array.from(invalidTokens);
};

/**
 * Sends a push notification to all users with registered tokens.
 */
const sendPushNotificationToAll = async (title, body, data = {}) => {
  const users = await User.find({ "pushTokens.0": { $exists: true } });
  const expoMessages = [];
  const firebaseTokens = [];

  console.log(`[Push] Notifying ${users.length} users.`);

  for (const user of users) {
    for (const entry of user.pushTokens) {
      const pushToken = normalizePushEntry(entry);
      if (!pushToken?.token) continue;

      if (Expo.isExpoPushToken(pushToken.token)) {
        expoMessages.push({
          to: pushToken.token,
          sound: "default",
          channelId: "default",
          title,
          body,
          data,
        });
      } else if (pushToken.platform === "android") {
        firebaseTokens.push(pushToken.token);
      }
    }
  }

  // Send via Firebase (Android)
  if (firebaseTokens.length > 0 && firebaseReady) {
    const uniqueFirebaseTokens = Array.from(new Set(firebaseTokens));
    const payload = {
      notification: { title, body },
      data: Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {}),
    };
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: uniqueFirebaseTokens,
        ...payload,
      });
      console.log(`[Push] Firebase response: ${response.successCount} success, ${response.failureCount} failure.`);

      const staleFirebaseTokens = [];
      (response.responses || []).forEach((item, idx) => {
        const code = item?.error?.code;
        if (code && FIREBASE_STALE_TOKEN_ERRORS.has(code)) {
          staleFirebaseTokens.push(uniqueFirebaseTokens[idx]);
        }
      });

      await removeStaleTokensFromUsers(staleFirebaseTokens, "firebase_send_failure");
    } catch (error) {
      console.error("[Push] Firebase error:", error.message);
    }
  } else if (firebaseTokens.length > 0) {
    console.warn("[Push] Firebase not initialized. Skipping Android native token delivery.");
  }

  // Send via Expo (iOS/Other)
  if (expoMessages.length > 0) {
    const staleExpoTokens = await sendExpoAndCollectInvalidTokens(expoMessages, "broadcast");
    await removeStaleTokensFromUsers(staleExpoTokens, "expo_send_failure");
  }

  return { expoCount: expoMessages.length, firebaseCount: firebaseTokens.length };
};

/**
 * Sends a push notification to a specific user.
 */
const sendPushNotificationToUser = async (user, title, body, data = {}) => {
  if (!user) {
    console.warn("[Push] Cannot send notification: User is null");
    return { success: false, reason: "user_null" };
  }
  
  const userEmail = user.email || "unknown-user";
  const tokenCount = (user.pushTokens || []).length;
  
  if (!tokenCount) {
    console.warn(`[Push] User ${userEmail} has no registered push tokens.`);
    return { success: false, reason: "no_tokens" };
  }

  console.log(`[Push] Sending to ${userEmail} (${tokenCount} tokens)`);

  const expoMessages = [];
  const firebaseTokens = [];

  for (const entry of user.pushTokens) {
    const pushToken = normalizePushEntry(entry);
    if (!pushToken?.token) continue;

    if (Expo.isExpoPushToken(pushToken.token)) {
      expoMessages.push({
        to: pushToken.token,
        sound: "default",
        channelId: "default",
        title,
        body,
        data,
      });
    } else if (pushToken.platform === "android") {
      firebaseTokens.push(pushToken.token);
    }
  }

  console.log(`[Push] Routing: ${expoMessages.length} via Expo, ${firebaseTokens.length} via Firebase.`);

  if (!expoMessages.length && !firebaseTokens.length) {
    console.warn(`[Push] User ${userEmail} has tokens, but none were valid for Expo/Android Firebase routing.`);
    return { success: false, reason: "no_routable_tokens" };
  }

  // Send via Firebase
  if (firebaseTokens.length > 0 && firebaseReady) {
    const uniqueFirebaseTokens = Array.from(new Set(firebaseTokens));
    const messagePayload = {
      notification: { title, body },
      data: Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {}),
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          sound: "default",
          priority: "high",
        },
      },
    };
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: uniqueFirebaseTokens,
        ...messagePayload,
      });
      console.log(`[Push] Firebase response for ${user.email}: ${response.successCount} success, ${response.failureCount} failure.`);

      const staleFirebaseTokens = [];
      (response.responses || []).forEach((item, idx) => {
        const code = item?.error?.code;
        if (code && FIREBASE_STALE_TOKEN_ERRORS.has(code)) {
          staleFirebaseTokens.push(uniqueFirebaseTokens[idx]);
        }
      });

      await removeStaleTokensFromUsers(staleFirebaseTokens, "firebase_send_failure");
    } catch (error) {
      console.error(`[Push] Firebase error for user ${user.email}:`, error.message);
    }
  } else if (firebaseTokens.length > 0) {
    console.warn(`[Push] Firebase not initialized. Skipping Android native token delivery for ${userEmail}.`);
  }

  // Send via Expo
  if (expoMessages.length > 0) {
    const staleExpoTokens = await sendExpoAndCollectInvalidTokens(expoMessages, userEmail);
    await removeStaleTokensFromUsers(staleExpoTokens, "expo_send_failure");
  }

  return { success: true };
};

module.exports = {
  sendPushNotificationToAll,
  sendPushNotificationToUser,
};
