import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import ProductContainer from "../Screens/Product/ProductContainer";
import SingleProduct from "../Screens/Product/SingleProduct";
import PromotionDetails from "../Screens/User/PromotionDetails";

const Stack = createStackNavigator();

const HomeNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Home"
      component={ProductContainer}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Product Detail"
      component={SingleProduct}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Promotion Detail"
      component={PromotionDetails}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export default HomeNavigator;