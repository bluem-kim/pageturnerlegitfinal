import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import axios from "axios";
import baseURL from "../assets/common/baseurl";
import AsyncStorage from "@react-native-async-storage/async-storage";

let registerInFlight = null;

export const registerDevicePushToken = async (passedToken) => {
  if (registerInFlight) {
    return registerInFlight;
  }

  registerInFlight = (async () => {
  // Push notifications work on physical devices. 
  // On Emulators, they only work if using a specific setup (Firebase), 
  // but standard Expo tokens usually require a physical device.
  if (!Device.isDevice && Platform.OS !== "android") {
    console.log("Push notifications usually require a physical device.");
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Permission for push notifications was denied!");
      return null;
    }

    // PROJECT ID IS REQUIRED FOR EXPO PUSH TOKENS
    // If no projectId is found in config, we use a fallback or skip token generation
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId || 
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn("No Expo Project ID found. Push notifications will only work in production or with a valid projectId in app.json.");
      return null;
    }

    // Prefer Expo token on all platforms to keep delivery consistent.
    // Android native token is only a fallback when Expo token fails.
    let token = "";
    try {
      const expoTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      token = expoTokenData.data;
      console.log("[Push] Expo Token generated:", token);
    } catch (expoErr) {
      if (Platform.OS === "android") {
        const deviceTokenData = await Notifications.getDevicePushTokenAsync();
        token = deviceTokenData.data;
        console.warn("[Push] Expo token failed, fallback to Android device token:", token);
      } else {
        throw expoErr;
      }
    }

    const jwt = passedToken || (await AsyncStorage.getItem("jwt"));
    if (!jwt) {
      console.log("[Push] No JWT found, push token will not be saved to backend yet.");
      return token;
    }

    console.log("[Push] Sending token to backend...");
    const response = await axios.post(
      `${baseURL}users/push-token`,
      {
        token,
        platform: Platform.OS,
      },
      {
        headers: { Authorization: `Bearer ${jwt}` },
      }
    );
    console.log("[Push] Backend sync response:", response.data);

    return token;
  } catch (error) {
    console.error("[Push] Error in registerDevicePushToken:", error.response?.data || error.message);
    return null;
  }
  })();

  try {
    return await registerInFlight;
  } finally {
    registerInFlight = null;
  }
};

export const removeDevicePushToken = async () => {
  const projectId = 
    Constants?.expoConfig?.extra?.eas?.projectId || 
    Constants?.easConfig?.projectId;

  const tokenData = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId }).catch(() => null)
    : null;
  if (!tokenData?.data) return;

  const jwt = await AsyncStorage.getItem("jwt");
  if (!jwt) return;

  try {
    await axios.delete(`${baseURL}users/push-token`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { token: tokenData.data },
    });
  } catch (error) {
    console.error("Error removing push token from backend:", error);
  }
};
