import {
  ADMIN_ORDERS_REQUEST,
  ADMIN_ORDERS_SUCCESS,
  ADMIN_ORDERS_FAIL,
  ADMIN_ORDER_STATUS_SUCCESS,
  USER_ORDERS_REQUEST,
  USER_ORDERS_SUCCESS,
  USER_ORDERS_FAIL,
  USER_ORDER_STATUS_SUCCESS,
} from "../constants";

const initialState = {
  adminOrders: [],
  userOrders: [],
  loadingAdmin: false,
  loadingUser: false,
  errorAdmin: "",
  errorUser: "",
};

const replaceOrder = (orders, updated) =>
  (orders || []).map((order) => {
    const currentId = order.id || order._id;
    const updatedId = updated.id || updated._id;
    if (String(currentId) !== String(updatedId)) return order;
    return { ...order, ...updated };
  });

const ordersReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADMIN_ORDERS_REQUEST:
      return { ...state, loadingAdmin: true, errorAdmin: "" };
    case ADMIN_ORDERS_SUCCESS:
      return { ...state, loadingAdmin: false, adminOrders: action.payload || [], errorAdmin: "" };
    case ADMIN_ORDERS_FAIL:
      return { ...state, loadingAdmin: false, errorAdmin: action.payload || "Failed to load orders" };
    case ADMIN_ORDER_STATUS_SUCCESS:
      return {
        ...state,
        adminOrders: replaceOrder(state.adminOrders, action.payload),
      };

    case USER_ORDERS_REQUEST:
      return { ...state, loadingUser: true, errorUser: "" };
    case USER_ORDERS_SUCCESS:
      return { ...state, loadingUser: false, userOrders: action.payload || [], errorUser: "" };
    case USER_ORDERS_FAIL:
      return { ...state, loadingUser: false, errorUser: action.payload || "Failed to load orders" };
    case USER_ORDER_STATUS_SUCCESS:
      return {
        ...state,
        userOrders: replaceOrder(state.userOrders, action.payload),
      };
    default:
      return state;
  }
};

export default ordersReducer;
