import {
  MY_REVIEWS_REQUEST,
  MY_REVIEWS_SUCCESS,
  MY_REVIEWS_FAIL,
  MY_REVIEW_DELETE_SUCCESS,
  MY_REVIEW_UPSERT_SUCCESS,
  ADMIN_REVIEWS_REQUEST,
  ADMIN_REVIEWS_SUCCESS,
  ADMIN_REVIEWS_FAIL,
  ADMIN_REVIEW_ARCHIVE_SUCCESS,
  ADMIN_REVIEWS_BULK_ARCHIVE_SUCCESS,
  ADMIN_REVIEW_REPLY_SUCCESS,
} from "../constants";

const initialState = {
  myReviews: [],
  adminReviews: [],
  loading: false,
  loadingAdmin: false,
  error: "",
  errorAdmin: "",
};

const reviewsReducer = (state = initialState, action) => {
  switch (action.type) {
    case MY_REVIEWS_REQUEST:
      return { ...state, loading: true, error: "" };
    case MY_REVIEWS_SUCCESS:
      return { ...state, loading: false, myReviews: action.payload || [], error: "" };
    case MY_REVIEWS_FAIL:
      return { ...state, loading: false, error: action.payload || "Failed to load reviews" };
    case MY_REVIEW_DELETE_SUCCESS:
      return {
        ...state,
        myReviews: (state.myReviews || []).filter(
          (item) => String(item.productId) !== String(action.payload)
        ),
      };
    case MY_REVIEW_UPSERT_SUCCESS:
      return state;

    case ADMIN_REVIEWS_REQUEST:
      return { ...state, loadingAdmin: true, errorAdmin: "" };
    case ADMIN_REVIEWS_SUCCESS:
      return {
        ...state,
        loadingAdmin: false,
        adminReviews: action.payload || [],
        errorAdmin: "",
      };
    case ADMIN_REVIEWS_FAIL:
      return {
        ...state,
        loadingAdmin: false,
        errorAdmin: action.payload || "Failed to load reviews",
      };
    case ADMIN_REVIEW_ARCHIVE_SUCCESS:
      return {
        ...state,
        adminReviews: (state.adminReviews || []).map((item) => {
          const sameProduct = String(item.productId) === String(action.payload?.productId);
          const sameReview = String(item.reviewId) === String(action.payload?.reviewId);
          if (!sameProduct || !sameReview) return item;
          return { ...item, isArchived: Boolean(action.payload?.isArchived) };
        }),
      };
    case ADMIN_REVIEWS_BULK_ARCHIVE_SUCCESS:
      return {
        ...state,
        adminReviews: (state.adminReviews || []).map((item) => {
          const hit = (action.payload?.items || []).some(
            (target) =>
              String(target?.productId) === String(item.productId) &&
              String(target?.reviewId) === String(item.reviewId)
          );
          return hit ? { ...item, isArchived: Boolean(action.payload?.isArchived) } : item;
        }),
      };
    case ADMIN_REVIEW_REPLY_SUCCESS:
      return {
        ...state,
        adminReviews: (state.adminReviews || []).map((item) => {
          const sameProduct = String(item.productId) === String(action.payload?.productId);
          const sameReview = String(item.reviewId) === String(action.payload?.reviewId);
          if (!sameProduct || !sameReview) return item;
          return { ...item, reply: action.payload?.reply };
        }),
      };
    default:
      return state;
  }
};

export default reviewsReducer;
