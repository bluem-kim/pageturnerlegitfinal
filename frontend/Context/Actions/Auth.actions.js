import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { jwtDecode } from "jwt-decode";

import baseURL from "../../assets/common/baseurl";
import { registerDevicePushToken, removeDevicePushToken } from "../../utils/pushToken";
import { getJwtToken, removeJwtToken, setJwtToken } from "../../utils/sessionStorage";

export const SET_CURRENT_USER = "SET_CURRENT_USER";

export const setCurrentUser = (decoded, user) => ({
  type: SET_CURRENT_USER,
  payload: decoded,
  userProfile: user,
});

const persistUserSession = async (data, dispatch) => {
  const decoded = jwtDecode(data.token);
  await setJwtToken(data.token);
  await AsyncStorage.setItem(
    "userProfile",
    JSON.stringify({
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      birthday: data.birthday,
      address: data.address,
      avatar: data.avatar,
      isAdmin: data.isAdmin,
    })
  );

  dispatch(
    setCurrentUser(decoded, {
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      birthday: data.birthday,
      address: data.address,
      avatar: data.avatar,
      isAdmin: data.isAdmin,
    })
  );

  // Token registration should never block login success.
  registerDevicePushToken(data.token).catch(() => null);
};

export const loginUser = async (user, dispatch) => {
  try {
    const response = await fetch(`${baseURL}users/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });

    const data = await response.json();
    if (!response.ok || !data?.token) {
      throw new Error(data?.message || "Invalid credentials");
    }

    await persistUserSession(data, dispatch);

    Toast.show({
      type: "success",
      text1: "Login successful",
      text2: "Welcome back",
      topOffset: 60,
    });
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Login failed",
      text2: error?.message || "Please try again",
      topOffset: 60,
    });
  }
};

export const loginGoogleUser = async (idToken, dispatch) => {
  try {
    const response = await fetch(`${baseURL}users/login/google`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();
    if (!response.ok || !data?.token) {
      throw new Error(data?.message || "Google login failed");
    }

    await persistUserSession(data, dispatch);

    Toast.show({
      type: "success",
      text1: "Google login successful",
      text2: `Welcome back, ${data.name}`,
      topOffset: 60,
    });
  } catch (error) {
    Toast.show({
      type: "error",
      text1: "Google login failed",
      text2: error?.message || "Please try again",
      topOffset: 60,
    });
  }
};

export const logoutUser = async (dispatch) => {
  await removeJwtToken();
  await AsyncStorage.removeItem("userProfile");
  dispatch(setCurrentUser({}));
};