import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import Dashboard from "../Screens/Admin/Dashboard";
import Products from "../Screens/Admin/Products";
import ProductForm from "../Screens/Admin/ProductForm";
import Categories from "../Screens/Admin/Categories";
import Orders from "../Screens/Admin/Orders";
import Users from "../Screens/Admin/Users";
import Reviews from "../Screens/Admin/Reviews";
import Promotions from "../Screens/Admin/Promotions";
import PromotionForm from "../Screens/Admin/PromotionForm";
import PromotionDetails from "../Screens/User/PromotionDetails";

const Stack = createStackNavigator();

export const AdminNavigator = () => (
  <Stack.Navigator initialRouteName="Dashboard">
    <Stack.Screen name="Dashboard" component={Dashboard} />
    <Stack.Screen name="Product Management" component={Products} />
    <Stack.Screen name="Product Form" component={ProductForm} />
    <Stack.Screen name="Genres" component={Categories} />
    <Stack.Screen name="Order Management" component={Orders} />
    <Stack.Screen name="User Management" component={Users} />
    <Stack.Screen name="Review Management" component={Reviews} />
    <Stack.Screen name="Promotions" component={Promotions} />
    <Stack.Screen name="Promotion Form" component={PromotionForm} />
    <Stack.Screen name="Promotion Detail" component={PromotionDetails} />
  </Stack.Navigator>
);
