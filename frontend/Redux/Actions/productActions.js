import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import baseURL from "../../assets/common/baseurl";
import {
  PRODUCTS_REQUEST,
  PRODUCTS_SUCCESS,
  PRODUCTS_FAIL,
  PRODUCT_ARCHIVE_SUCCESS,
} from "../constants";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryProductFetch = (error) => {
  const status = error?.response?.status;
  if ([502, 503, 504].includes(status)) return true;
  if (error?.code === "ECONNABORTED") return true;
  return Boolean(error?.request && !error?.response);
};

export const fetchProducts = (options = {}) => async (dispatch) => {
  dispatch({ type: PRODUCTS_REQUEST });
  try {
    const query = [];
    if (options?.includeArchived) query.push("includeArchived=1");
    if (options?.archivedOnly) query.push("archived=1");
    if (options?.limit) query.push(`limit=${options.limit}`);
    if (options?.page) query.push(`page=${options.page}`);

    const suffix = query.length ? `?${query.join("&")}` : "";
    const maxAttempts = 3;
    const timeoutMs = 12000;

    let res;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        res = await axios.get(`${baseURL}products${suffix}`, { timeout: timeoutMs });
        break;
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !shouldRetryProductFetch(error)) {
          throw error;
        }

        const waitMs = attempt * 1200;
        console.warn(
          `[Products] Fetch attempt ${attempt}/${maxAttempts} failed (${error?.response?.status || error.code || "network"}). Retrying in ${waitMs}ms...`
        );
        await delay(waitMs);
      }
    }

    if (!res) {
      throw lastError || new Error("Failed to load products");
    }

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
