import React, { useEffect, useReducer, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

import authReducer from "../Reducers/Auth.reducer";
import { setCurrentUser } from "../Actions/Auth.actions";
import AuthGlobal from "./AuthGlobal";
import { getJwtToken, removeJwtToken } from "../../utils/sessionStorage";

const Auth = ({ children }) => {
  const [stateUser, dispatch] = useReducer(authReducer, {
    isAuthenticated: null,
    user: {},
  });
  const [showChild, setShowChild] = useState(false);

  useEffect(() => {
    const restoreUser = async () => {
      const token = await getJwtToken();
      const profileRaw = await AsyncStorage.getItem("userProfile");
      if (token) {
        try {
          const decoded = jwtDecode(token);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const isExpired = Number(decoded?.exp || 0) > 0 && Number(decoded.exp) <= nowSeconds;

          if (isExpired) {
            await removeJwtToken();
            await AsyncStorage.removeItem("userProfile");
            dispatch(setCurrentUser({}));
          } else {
            const profile = profileRaw ? JSON.parse(profileRaw) : {};
            dispatch(setCurrentUser(decoded, profile));
          }
        } catch (error) {
          await removeJwtToken();
          await AsyncStorage.removeItem("userProfile");
          dispatch(setCurrentUser({}));
        }
      }
      setShowChild(true);
    };

    restoreUser();

    return () => setShowChild(false);
  }, []);

  if (!showChild) return null;

  return (
    <AuthGlobal.Provider
      value={{
        stateUser,
        dispatch,
      }}
    >
      {children}
    </AuthGlobal.Provider>
  );
};

export default Auth;