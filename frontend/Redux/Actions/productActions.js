import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import baseURL from "../../assets/common/baseurl";
import {
  PRODUCTS_REQUEST,
  PRODUCTS_SUCCESS,
  PRODUCTS_FAIL,
  PRODUCT_ARCHIVE_SUCCESS,
} from "../constants";

export const fetchProducts = (options = {}) => async (dispatch) => {
  dispatch({ type: PRODUCTS_REQUEST });
  try {
    const query = [];
    if (options?.includeArchived) query.push("includeArchived=1");
    if (options?.archivedOnly) query.push("archived=1");
    if (options?.limit) query.push(`limit=${options.limit}`);
    if (options?.page) query.push(`page=${options.page}`);

    const suffix = query.length ? `?${query.join("&")}` : "";
    const res = await axios.get(`${baseURL}products${suffix}`);
    // New backend returns { products, total, page, pageSize, totalPages }
    dispatch({ type: PRODUCTS_SUCCESS, payload: res.data });
  } catch (error) {
    let errorMessage = "Failed to load products";
    if (error.response) {
      errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = "Network error: Could not connect to the backend";
    } else {
      errorMessage = error.message || "An unexpected error occurred";
    }
    dispatch({
      type: PRODUCTS_FAIL,
      payload: errorMessage,
    });
  }
};

export const archiveProduct = (productId, isArchived = true) => async (dispatch) => {
  const token = await AsyncStorage.getItem("jwt");
  await axios.put(
    `${baseURL}products/${productId}/archive`,
    { isArchived },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  dispatch({ type: PRODUCT_ARCHIVE_SUCCESS, payload: { productId, isArchived } });
};

// Backward-compatible alias for legacy imports.
export const deleteProduct = (productId) => async (dispatch) => {
  const token = await AsyncStorage.getItem("jwt");
  await axios.put(
    `${baseURL}products/${productId}/archive`,
    { isArchived: true },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  dispatch({ type: PRODUCT_ARCHIVE_SUCCESS, payload: { productId, isArchived: true } });
};
