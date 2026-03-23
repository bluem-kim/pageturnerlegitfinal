import axios from "axios";

import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../utils/sessionStorage";
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

export const fetchAdminOrders = (options = {}) => async (dispatch) => {
  dispatch({ type: ADMIN_ORDERS_REQUEST });
  try {
    const token = await getJwtToken();
    const query = [];
    if (options?.includeArchived) query.push("includeArchived=1");
    if (options?.archivedOnly) query.push("archived=1");
    const suffix = query.length ? `?${query.join("&")}` : "";

    const res = await axios.get(`${baseURL}orders${suffix}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: ADMIN_ORDERS_SUCCESS, payload: res.data || [] });
  } catch (error) {
    dispatch({
      type: ADMIN_ORDERS_FAIL,
      payload: error?.response?.data?.message || "Failed to load orders",
    });
  }
};

export const updateAdminOrderStatus = (orderId, status) => async (dispatch) => {
  const token = await getJwtToken();
  const res = await axios.put(
    `${baseURL}orders/${orderId}`,
    { status },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  dispatch({ type: ADMIN_ORDER_STATUS_SUCCESS, payload: res.data });
  return res.data;
};

export const updateAdminOrderArchive = (orderId, isArchived) => async (dispatch) => {
  const token = await getJwtToken();
  const res = await axios.put(
    `${baseURL}orders/${orderId}/archive`,
    { isArchived },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  dispatch({ type: ADMIN_ORDER_STATUS_SUCCESS, payload: res.data });
  return res.data;
};

export const fetchUserOrders = () => async (dispatch) => {
  dispatch({ type: USER_ORDERS_REQUEST });
  try {
    const token = await getJwtToken();
    const res = await axios.get(`${baseURL}orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    dispatch({ type: USER_ORDERS_SUCCESS, payload: res.data || [] });
  } catch (error) {
    dispatch({
      type: USER_ORDERS_FAIL,
      payload: error?.response?.data?.message || "Failed to load orders",
    });
  }
};

export const userCancelOrder = (orderId) => async (dispatch) => {
  const token = await getJwtToken();
  const res = await axios.post(`${baseURL}orders/${orderId}/cancel`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  dispatch({ type: USER_ORDER_STATUS_SUCCESS, payload: res.data });
  return res.data;
};

export const userRequestCancelOrder = (orderId, reason) => async (dispatch) => {
  const token = await getJwtToken();
  const res = await axios.post(
    `${baseURL}orders/${orderId}/request-cancel`,
    { reason },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  dispatch({ type: USER_ORDER_STATUS_SUCCESS, payload: res.data.order });
  return res.data;
};

export const adminHandleCancelRequest = (orderId, action) => async (dispatch) => {
  const token = await getJwtToken();
  const res = await axios.post(
    `${baseURL}orders/${orderId}/handle-cancel-request`,
    { action },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  dispatch({ type: ADMIN_ORDER_STATUS_SUCCESS, payload: res.data.order });
  return res.data;
};

export const userConfirmDelivered = (orderId) => async (dispatch) => {
  const token = await getJwtToken();
  const res = await axios.post(`${baseURL}orders/${orderId}/confirm-delivered`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  dispatch({ type: USER_ORDER_STATUS_SUCCESS, payload: res.data });
  return res.data;
};
