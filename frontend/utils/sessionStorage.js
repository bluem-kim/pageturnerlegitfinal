import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const JWT_KEY = "jwt";

export const setJwtToken = async (token) => {
  const value = String(token || "").trim();
  if (!value) return;

  await SecureStore.setItemAsync(JWT_KEY, value);
  // Keep legacy AsyncStorage in sync for existing screens that still read `jwt`.
  await AsyncStorage.setItem(JWT_KEY, value);
};

export const getJwtToken = async () => {
  const secureToken = await SecureStore.getItemAsync(JWT_KEY);
  if (secureToken) return secureToken;

  const legacyToken = await AsyncStorage.getItem(JWT_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(JWT_KEY, legacyToken);
  }
  return legacyToken;
};

export const removeJwtToken = async () => {
  await SecureStore.deleteItemAsync(JWT_KEY);
  await AsyncStorage.removeItem(JWT_KEY);
};
