import {
  ADD_TO_CART,
  REMOVE_FROM_CART,
  UPDATE_CART_LINE_QUANTITY,
  REMOVE_SELECTED_FROM_CART,
  CLEAR_CART,
  HYDRATE_CART,
} from "../constants";

const cartItems = (state = [], action) => {
  switch (action.type) {
    case ADD_TO_CART:
      return [...state, action.payload];
    case REMOVE_FROM_CART:
      return state.filter((item) => {
        if (item.cartLineId && action.payload?.cartLineId) {
          return item.cartLineId !== action.payload.cartLineId;
        }
        const currentId = item.id || item._id;
        const targetId = action.payload.id || action.payload._id;
        return currentId !== targetId;
      });
    case UPDATE_CART_LINE_QUANTITY: {
      const lineId = action.payload?.cartLineId;
      const nextQty = Math.max(1, Number(action.payload?.quantity) || 1);
      if (!lineId) return state;
      return state.map((item) =>
        item.cartLineId === lineId ? { ...item, quantity: nextQty } : item
      );
    }
    case REMOVE_SELECTED_FROM_CART: {
      const selected = new Set(Array.isArray(action.payload) ? action.payload : []);
      if (!selected.size) return state;
      return state.filter((item) => !selected.has(item.cartLineId));
    }
    case CLEAR_CART:
      return [];
    case HYDRATE_CART:
      return Array.isArray(action.payload) ? action.payload : [];
    default:
      return state;
  }
};

export default cartItems;