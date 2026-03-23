import { StatusBar } from "expo-status-bar";
import { useContext, useEffect, useRef } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { Provider, useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure Android Channel
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
}

import Main from "./Navigators/Main";
import Auth from "./Context/Store/Auth";
import AuthGlobal from "./Context/Store/AuthGlobal";
import store from "./Redux/store";
import { clearCart, loadCartFromStorage } from "./Redux/Actions/cartActions";
import customFontSources from "./theme/fontSources";
import { registerDevicePushToken } from "./utils/pushToken";

const AppContent = () => {
  const dispatch = useDispatch();
  const auth = useContext(AuthGlobal);
  const isAuthenticated = auth?.stateUser?.isAuthenticated;
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(loadCartFromStorage());
      // Re-register push token on app start/auth change
      registerDevicePushToken().catch(() => null);
      return;
    }
    dispatch(clearCart());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    // Handle notification that opened the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    const handleNotificationResponse = response => {
      const data = response.notification.request.content.data;
      const { promotionId, orderId, type } = data;
      console.log("[Push] Handling Notification Response:", data);

      setTimeout(() => {
        if (!navigationRef.isReady()) {
          console.log("[Push] Navigation not ready yet...");
          return;
        }

        if (type === "promotion" && promotionId) {
          const isAdmin = auth?.stateUser?.userProfile?.isAdmin;
          if (isAdmin) {
            navigationRef.navigate("Promotion Detail", { promotionId });
          } else {
            navigationRef.navigate("Shop", {
              screen: "Promotion Detail",
              params: { promotionId }
            });
          }
        } else if (type === "order") {
          const isAdmin = auth?.stateUser?.userProfile?.isAdmin;
          if (isAdmin) {
            navigationRef.navigate("Orders");
          } else {
            navigationRef.navigate("Profile", {
              screen: "Order Detail",
              params: { orderId }
            });
          }
        }
      }, 1000);
    };

    // Handle incoming notifications (Foreground)
    const receivedSubscription = Notifications.addNotificationReceivedListener(async notification => {
      const { title, body, data } = notification.request.content;
      console.log("[Push] Received in foreground:", title);
      
      // Save to local inbox
      try {
        const stored = await AsyncStorage.getItem("notifications");
        const inbox = stored ? JSON.parse(stored) : [];
        const newItem = {
          id: notification.request.identifier,
          title,
          body,
          data,
          receivedAt: new Date().toISOString(),
          read: false
        };
        await AsyncStorage.setItem("notifications", JSON.stringify([newItem, ...inbox].slice(0, 50)));
        
        // Show in-app Toast that is clickable
        Toast.show({
          type: "info",
          text1: title,
          text2: body,
          topOffset: 60,
          onPress: () => {
            Toast.hide();
            const { type, promotionId, orderId } = data;
            if (type === "promotion" && promotionId) {
              const isAdmin = auth?.stateUser?.userProfile?.isAdmin;
              if (isAdmin) {
                navigationRef.navigate("Promotion Detail", { promotionId });
              } else {
                navigationRef.navigate("Shop", {
                  screen: "Promotion Detail",
                  params: { promotionId }
                });
              }
            } else if (type === "order") {
              const isAdmin = auth?.stateUser?.userProfile?.isAdmin;
              if (isAdmin) {
                navigationRef.navigate("Orders");
              } else {
                navigationRef.navigate("Profile", {
                  screen: "Order Detail",
                  params: { orderId }
                });
              }
            }
          }
        });
      } catch (err) {
        console.error("Error saving notification to inbox:", err);
      }
    });

    // Handle notification clicks while app is open
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [navigationRef, auth]);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <Main />
    </NavigationContainer>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(customFontSources);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Auth>
      <Provider store={store}>
        <AppContent />
        <Toast />
      </Provider>
    </Auth>
  );
}
