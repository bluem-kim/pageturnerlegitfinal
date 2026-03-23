import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Platform, StyleSheet, Text, View } from "react-native";

import Checkout from "../Screens/Cart/Checkout/Checkout";
import Confirm from "../Screens/Cart/Checkout/Confirm";

const Tab = createMaterialTopTabNavigator();

const CheckoutNavigator = () => (
  <View style={s.screen}>
    <View style={s.titleWrap}>
      <View style={s.titleRow}>
        <View style={s.titleBar} />
        <View>
          <Text style={s.title}>Checkout</Text>
          <Text style={s.subtitle}>Shipping and confirmation</Text>
        </View>
      </View>
    </View>

    <View style={s.tabsWrap}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: s.tabBar,
          tabBarIndicatorStyle: s.tabIndicator,
          tabBarIndicatorContainerStyle: s.tabIndicatorContainer,
          tabBarItemStyle: s.tabItem,
          tabBarLabelStyle: s.tabLabel,
          tabBarActiveTintColor: "#B85E0E",
          tabBarInactiveTintColor: "#9A8A7A",
          tabBarPressColor: "transparent",
          tabBarPressOpacity: 0.9,
        }}
      >
        <Tab.Screen name="Shipping" component={Checkout} />
        <Tab.Screen name="Confirm" component={Confirm} />
      </Tab.Navigator>
    </View>
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFAF6" },
  titleWrap: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingBottom: 10,
    backgroundColor: "#FFFAF6",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleBar: { width: 4, height: 44, borderRadius: 2, backgroundColor: "#F4821F" },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#18120C",
  },
  subtitle: {
    fontSize: 13,
    color: "#9A8A7A",
    fontWeight: "600",
    marginTop: 2,
  },
  tabsWrap: { flex: 1 },
  tabBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDE5DC",
    elevation: 0,
    shadowOpacity: 0,
    height: 52,
    overflow: "hidden",
  },
  tabIndicatorContainer: {
    padding: 4,
  },
  tabIndicator: {
    height: "100%",
    borderRadius: 14,
    backgroundColor: "#FEF0E3",
  },
  tabItem: {
    borderRadius: 14,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "none",
    letterSpacing: 0.2,
  },
});

export default CheckoutNavigator;