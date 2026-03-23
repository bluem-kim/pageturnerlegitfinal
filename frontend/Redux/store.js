import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";

import cartItems from "./Reducers/cartItems";
import products from "./Reducers/products";
import orders from "./Reducers/orders";
import reviews from "./Reducers/reviews";

const rootReducer = combineReducers({
  cartItems,
  products,
  orders,
  reviews,
});

const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;