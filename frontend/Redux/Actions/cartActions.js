import {
  ADD_TO_CART,
  REMOVE_FROM_CART,
  UPDATE_CART_LINE_QUANTITY,
  REMOVE_SELECTED_FROM_CART,
  CLEAR_CART,
  HYDRATE_CART,
} from "../constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearCartDb, loadCartFromDb, saveCartToDb } from "../../utils/cartStorage";

const createCartLineId = () =>
  `line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const withCartLineId = (item, lineId) => ({
  ...item,
  cartLineId: lineId || item?.cartLineId || createCartLineId(),
  quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
});

const ensureUniqueLineId = (preferredId, usedIds) => {
  if (preferredId && !usedIds.has(preferredId)) {
    usedIds.add(preferredId);
    return preferredId;
  }

  let nextId = createCartLineId();
  while (usedIds.has(nextId)) {
    nextId = createCartLineId();
  }
  usedIds.add(nextId);
  return nextId;
};

const sanitizeCartLines = (items = []) => {
  const usedIds = new Set();
  return items.map((item) => {
    const uniqueLineId = ensureUniqueLineId(item?.cartLineId, usedIds);
    return withCartLineId(item, uniqueLineId);
  });
};

const getActiveOwnerKey = async () => {
  const profileRaw = await AsyncStorage.getItem("userProfile");
  if (!profileRaw) return "guest";

  try {
    const profile = JSON.parse(profileRaw);
    return String(profile?.userId || "guest");
  } catch (error) {
    return "guest";
  }
};

export const addToCart = (payload) => async (dispatch, getState) => {
  const stateItems = Array.isArray(getState().cartItems) ? getState().cartItems : [];
  const usedIds = new Set(stateItems.map((item) => item?.cartLineId).filter(Boolean));
  const uniqueLineId = ensureUniqueLineId(null, usedIds);
  dispatch({ type: ADD_TO_CART, payload: withCartLineId(payload, uniqueLineId) });
  const ownerKey = await getActiveOwnerKey();
  await saveCartToDb(getState().cartItems, ownerKey);
};

export const removeFromCart = (payload) => async (dispatch, getState) => {
  dispatch({ type: REMOVE_FROM_CART, payload });
  const ownerKey = await getActiveOwnerKey();
  await saveCartToDb(getState().cartItems, ownerKey);
};

export const updateCartLineQuantity = ({ cartLineId, quantity }) => async (dispatch, getState) => {
  dispatch({ type: UPDATE_CART_LINE_QUANTITY, payload: { cartLineId, quantity } });
  const ownerKey = await getActiveOwnerKey();
  await saveCartToDb(getState().cartItems, ownerKey);
};

export const removeSelectedFromCart = (lineIds = []) => async (dispatch, getState) => {
  dispatch({ type: REMOVE_SELECTED_FROM_CART, payload: lineIds });
  const ownerKey = await getActiveOwnerKey();
  await saveCartToDb(getState().cartItems, ownerKey);
};

export const clearCart = () => async (dispatch) => {
  dispatch({ type: CLEAR_CART });
  const ownerKey = await getActiveOwnerKey();
  await clearCartDb(ownerKey);
};

export const loadCartFromStorage = () => async (dispatch) => {
  try {
    const ownerKey = await getActiveOwnerKey();
    const parsed = await loadCartFromDb(ownerKey);
    const sanitized = sanitizeCartLines(Array.isArray(parsed) ? parsed : []);
    dispatch({ type: HYDRATE_CART, payload: sanitized });
    await saveCartToDb(sanitized, ownerKey);
  } catch (error) {
    dispatch({ type: HYDRATE_CART, payload: [] });
  }
};