import React, { useEffect, useReducer, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

import authReducer from "../Reducers/Auth.reducer";
import { setCurrentUser } from "../Actions/Auth.actions";
import AuthGlobal from "./AuthGlobal";
import { getJwtToken } from "../../utils/sessionStorage";

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
        const decoded = jwtDecode(token);
        const profile = profileRaw ? JSON.parse(profileRaw) : {};
        dispatch(setCurrentUser(decoded, profile));
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