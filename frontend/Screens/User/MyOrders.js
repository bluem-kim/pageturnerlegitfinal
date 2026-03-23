import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import {
  fetchUserOrders,
  userConfirmDelivered,
  userRequestCancelOrder,
} from "../../Redux/Actions/orderActions";
import { formatPHP } from "../../utils/currency";

const { width: SW } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#FFFAF6",
  white:        "#FFFFFF",
  ink:          "#18120C",
  primary:      "#F4821F",
  primaryDark:  "#B85E0E",
  primaryLight: "#FEF0E3",
  gold:         "#F5C842",
  muted:        "#9A8A7A",
  border:       "#EDE5DC",
  surface:      "#F7F2EC",
  danger:       "#EF4444",
  dangerLight:  "#FEE2E2",
  green:        "#22C55E",
  greenLight:   "#DCFCE7",
  blue:         "#3B82F6",
  blueLight:    "#DBEAFE",
  amber:        "#F59E0B",
  amberLight:   "#FEF3C7",
  grey:         "#9CA3AF",
  greyLight:    "#F3F4F6",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  "1": { label: "Delivered",  color: C.green,   bg: C.greenLight,  icon: "checkmark-circle",  accentBar: C.green  },
  "2": { label: "Shipped",    color: C.blue,    bg: C.blueLight,   icon: "bicycle",            accentBar: C.blue   },
  "3": { label: "Pending",    color: C.amber,   bg: C.amberLight,  icon: "time",               accentBar: C.amber  },
  "0": { label: "Cancelled",  color: C.grey,    bg: C.greyLight,   icon: "close-circle",       accentBar: C.grey   },
};

const getStatus = (raw) => STATUS_MAP[String(raw)] || STATUS_MAP["3"];

const ORDER_FILTERS = [
  { key: "all", label: "All", status: null },
  { key: "pending", label: "Pending", status: "3" },
  { key: "shipped", label: "Shipped", status: "2" },
  { key: "delivered", label: "Delivered", status: "1" },
  { key: "cancelled", label: "Cancel", status: "0" },
];

const fmt = (v) => formatPHP ? formatPHP(v) : "\u20B1" + Number(v || 0).toLocaleString();

const fmtDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  } catch { return String(d).split("T")[0]; }
};

const shortId = (id = "") => String(id).slice(-8).toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(ty,  { toValue: 0, delay, damping: 16, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDER ITEM ROW  (product inside the review section)
// ─────────────────────────────────────────────────────────────────────────────
const OrderItemRow = ({ orderItem, orderId, navigation }) => {
  const product   = orderItem?.product;
  const productId = product?.id || product?._id;
  if (!productId) return null;

  const imgUri = product?.image || product?.images?.[0] || null;
  const unitPrice =
    orderItem?.price ??
    orderItem?.unitPrice ??
    orderItem?.product?.price ??
    orderItem?.product?.srp ??
    0;

  return (
    <View style={ir.row}>
      <View style={ir.coverWrap}>
        {imgUri
          ? <Image source={{ uri: imgUri }} style={ir.cover} resizeMode="cover" />
          : <View style={[ir.cover, ir.coverFallback]}><Ionicons name="book" size={18} color={C.primary} /></View>
        }
      </View>
      <View style={ir.meta}>
        <Text style={ir.name} numberOfLines={2}>{product?.name || "Product"}</Text>
        <Text style={ir.price}>{fmt(unitPrice)}</Text>
      </View>
      <TouchableOpacity
        style={ir.reviewBtn}
        activeOpacity={0.82}
        onPress={() => navigation.navigate("Profile", { screen: "Review Product", params: { product, orderId } })}
      >
        <Ionicons name="pencil" size={12} color={C.primary} />
        <Text style={ir.reviewBtnTxt}>Review</Text>
      </TouchableOpacity>
    </View>
  );
};

const ir = StyleSheet.create({
  row:        { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  coverWrap:  { width: 40, height: 52, borderRadius: 8, overflow: "hidden", backgroundColor: C.border },
  cover:      { width: "100%", height: "100%" },
  coverFallback: { alignItems: "center", justifyContent: "center", backgroundColor: C.primaryLight },
  meta:       { flex: 1, gap: 3 },
  name:       { fontSize: 13, fontWeight: "700", color: C.ink, lineHeight: 18 },
  price:      { fontSize: 12, fontWeight: "800", color: C.primaryDark },
  reviewBtn:  {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.primary,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
  },
  reviewBtnTxt: { fontSize: 12, fontWeight: "800", color: C.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CARD
// ─────────────────────────────────────────────────────────────────────────────
const OrderCard = ({ item, index, onRequestCancel, onConfirm, navigation }) => {
  const scale  = useRef(new Animated.Value(1)).current;
  const status = getStatus(item.status);
  const orderId = item.id || item._id;
  const isPending   = String(item.status) === "3";
  const isShipped   = String(item.status) === "2";
  const isDelivered = String(item.status) === "1";
  const orderItems  = item.orderItems || [];
  const cancelReq   = item?.cancelRequest;

  const onIn  = () => Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, damping: 14 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1.0,   useNativeDriver: true, damping: 14 }).start();

  return (
    <FadeUp delay={index * 80}>
      <Animated.View style={[oc.shadow, { transform: [{ scale }] }]}>
        <View style={oc.card}>
          {/* ── Header ── */}
          <View style={oc.header}>
            <View style={oc.headerLeft}>
              {/* Order number */}
              <View style={oc.orderNumWrap}>
                <Text style={oc.orderNumLabel}>ORDER</Text>
                <Text style={oc.orderNum}>#{shortId(orderId)}</Text>
              </View>
            </View>

            {/* Status badge */}
            <View style={[oc.statusBadge, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={13} color={status.color} />
              <Text style={[oc.statusTxt, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {/* ── Meta row ── */}
          <View style={oc.metaRow}>
            <View style={oc.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={C.muted} />
              <Text style={oc.metaTxt}>{fmtDate(item.dateOrdered)}</Text>
            </View>
            <View style={oc.metaItem}>
              <Ionicons name="layers-outline" size={13} color={C.muted} />
              <Text style={oc.metaTxt}>{orderItems.length} {orderItems.length === 1 ? "item" : "items"}</Text>
            </View>
          </View>

          {/* ── Cancellation Request Status ── */}
          {!!cancelReq?.status && (
            <View style={[oc.cancelStatus, { backgroundColor: cancelReq.status === "approved" ? C.greenLight : cancelReq.status === "disapproved" ? C.dangerLight : C.amberLight }]}>
              <Ionicons 
                name={cancelReq.status === "approved" ? "checkmark-circle" : cancelReq.status === "disapproved" ? "close-circle" : "time"} 
                size={14} 
                color={cancelReq.status === "approved" ? C.green : cancelReq.status === "disapproved" ? C.danger : C.amber} 
              />
              <Text style={[oc.cancelStatusTxt, { color: cancelReq.status === "approved" ? C.green : cancelReq.status === "disapproved" ? C.danger : C.amber }]}>
                Cancellation {cancelReq.status.charAt(0).toUpperCase() + cancelReq.status.slice(1)}
              </Text>
            </View>
          )}

          {/* ── Total price strip ── */}
          <LinearGradient
            colors={[C.primaryLight, "#FFF9F4"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={oc.totalStrip}
          >
            <Text style={oc.totalLabel}>Order Total</Text>
            <Text style={oc.totalPrice}>{fmt(item.totalPrice)}</Text>
          </LinearGradient>

          {/* ── Action buttons ── */}
          {(isPending || isShipped) && (
            <View style={oc.actions}>
              {isPending && !cancelReq?.status && (
                <TouchableOpacity
                  style={oc.cancelBtn}
                  onPress={() => onRequestCancel(orderId)}
                  onPressIn={onIn} onPressOut={onOut}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle-outline" size={15} color={C.danger} />
                  <Text style={oc.cancelBtnTxt}>Request Cancellation</Text>
                </TouchableOpacity>
              )}
              {isShipped && (
                <TouchableOpacity
                  style={oc.confirmBtn}
                  onPress={() => onConfirm(orderId)}
                  onPressIn={onIn} onPressOut={onOut}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={15} color={C.green} />
                  <Text style={oc.confirmBtnTxt}>Confirm Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Review section (delivered only) ── */}
          {isDelivered && orderItems.length > 0 && (
            <View style={oc.reviewSection}>
              <View style={oc.reviewHeader}>
                <View style={oc.reviewHeaderBar} />
                <Text style={oc.reviewHeaderTxt}>Review Purchased Items</Text>
              </View>
              {orderItems.map((oi) => (
                <OrderItemRow
                  key={`${orderId}-${oi?.product?.id || oi?.product?._id}`}
                  orderItem={oi}
                  orderId={orderId}
                  navigation={navigation}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </FadeUp>
  );
};

const oc = StyleSheet.create({
  shadow: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: "#C05010",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12,
    elevation: 5, backgroundColor: C.white,
  },
  card: {
    borderRadius: 20, overflow: "hidden",
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
  },

  // Header
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  headerLeft: { gap: 2 },
  orderNumWrap: {},
  orderNumLabel:{ fontSize: 9, fontWeight: "800", color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" },
  orderNum:   { fontSize: 17, fontWeight: "900", fontFamily: F.serif, color: C.ink },

  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusTxt:   { fontSize: 12, fontWeight: "800" },

  // Meta
  metaRow:  { flexDirection: "row", gap: 16, paddingHorizontal: 16, paddingBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaTxt:  { fontSize: 12, color: C.muted, fontWeight: "600" },

  cancelStatus: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: "flex-start" },
  cancelStatusTxt: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },

  // Total strip
  totalStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 14, marginBottom: 12,
    borderRadius: 14,
  },
  totalLabel: { fontSize: 11, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  totalPrice: { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.primary },

  // Actions
  actions:    { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  cancelBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: C.danger, backgroundColor: C.dangerLight,
    paddingVertical: 11, borderRadius: 14,
  },
  cancelBtnTxt:  { fontSize: 13, fontWeight: "800", color: C.danger },
  confirmBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: C.green, backgroundColor: C.greenLight,
    paddingVertical: 11, borderRadius: 14,
  },
  confirmBtnTxt: { fontSize: 13, fontWeight: "800", color: C.green },

  // Review section
  reviewSection: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  reviewHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  reviewHeaderBar: { width: 3, height: 16, borderRadius: 2, backgroundColor: C.primary },
  reviewHeaderTxt: { fontSize: 13, fontWeight: "900", color: C.ink, fontFamily: F.serif },
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY STRIP
// ─────────────────────────────────────────────────────────────────────────────
const SummaryStrip = ({ orders }) => {
  const total     = orders.length;
  const delivered = orders.filter((o) => String(o.status) === "1").length;
  const pending   = orders.filter((o) => String(o.status) === "3").length;
  const shipped   = orders.filter((o) => String(o.status) === "2").length;
  const cancelled = orders.filter((o) => String(o.status) === "0").length;

  return (
    <FadeUp delay={60} style={sum.card}>
      <View style={sum.item}>
        <Text style={sum.val}>{total}</Text>
        <Text style={sum.lbl}>Total</Text>
      </View>
      <View style={sum.divider} />
      <View style={sum.item}>
        <Text style={[sum.val, { color: C.amber }]}>{pending}</Text>
        <Text style={sum.lbl}>Pending</Text>
      </View>
      <View style={sum.divider} />
      <View style={sum.item}>
        <Text style={[sum.val, { color: C.blue }]}>{shipped}</Text>
        <Text style={sum.lbl}>Shipped</Text>
      </View>
      <View style={sum.divider} />
      <View style={sum.item}>
        <Text style={[sum.val, { color: C.green }]}>{delivered}</Text>
        <Text style={sum.lbl}>Delivered</Text>
      </View>
      <View style={sum.divider} />
      <View style={sum.item}>
        <Text style={[sum.val, { color: C.grey }]}>{cancelled}</Text>
        <Text style={sum.lbl}>Cancel</Text>
      </View>
    </FadeUp>
  );
};

const sum = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 18,
    backgroundColor: C.white,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    paddingVertical: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  item:    { flex: 1, alignItems: "center", gap: 3 },
  val:     { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.primary },
  lbl:     { fontSize: 10, color: C.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  divider: { width: 1, height: 32, backgroundColor: C.border },
});

// ─────────────────────────────────────────────────────────────────────────────
// MY ORDERS
// ─────────────────────────────────────────────────────────────────────────────
const MyOrders = ({ navigation }) => {
  const dispatch = useDispatch();
  const { userOrders: orders, loadingUser: loading, errorUser } = useSelector((s) => s.orders);
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [cancelReason,    setCancelReason]    = useState("");
  const [submitting,      setSubmitting]      = useState(false);

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") {
      navigation.openDrawer();
      return;
    }
    navigation?.getParent?.()?.openDrawer?.();
  };

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchUserOrders());
    }, [dispatch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchUserOrders());
    setRefreshing(false);
  };

  useEffect(() => {
    if (!errorUser) return;
    Toast.show({ type: "error", text1: "Failed to load orders", text2: errorUser, topOffset: 60 });
  }, [errorUser]);

  const filteredOrders = useMemo(() => {
    const selected = ORDER_FILTERS.find((f) => f.key === activeFilter);
    if (!selected || selected.status === null) return orders;
    return orders.filter((order) => String(order.status) === selected.status);
  }, [activeFilter, orders]);

  const handleRequestCancel = (orderId) => {
    setSelectedOrderId(orderId);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const submitCancelRequest = async () => {
    if (!cancelReason.trim()) {
      Toast.show({ type: "error", text1: "Reason required", text2: "Please provide a reason for cancellation", topOffset: 60 });
      return;
    }

    try {
      setSubmitting(true);
      await dispatch(userRequestCancelOrder(selectedOrderId, cancelReason));
      setShowCancelModal(false);
      Toast.show({ type: "success", text1: "Request sent", text2: "Admin will review your cancellation request", topOffset: 60 });
    } catch (err) {
      Toast.show({ type: "error", text1: "Request failed", text2: err?.response?.data?.message || "Please try again", topOffset: 60 });
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirm = async (id) => {
    try {
      await dispatch(userConfirmDelivered(id));
      Toast.show({ type: "success", text1: "Order completed", text2: "Thank you for confirming delivery!", topOffset: 60 });
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to confirm", text2: err?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  if (loading) {
    return (
      <View style={s.loadWrap}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadTxt}>Loading your orders…</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View>
            {/* ── PAGE HEADER ── */}
            <FadeUp delay={0} style={s.pageHeader}>
              <View style={s.titleRow}>
                <TouchableOpacity style={s.drawerBtn} onPress={openDrawer} activeOpacity={0.8}>
                  <Ionicons name="menu" size={28} color={C.primary} />
                </TouchableOpacity>
                <View style={s.titleBar} />
                <View>
                  <Text style={s.pageTitle}>My Orders</Text>
                  <Text style={s.pageSubtitle}>
                    {orders.length > 0
                      ? `${orders.length} ${orders.length === 1 ? "order" : "orders"} found`
                      : "Track your purchases here"}
                  </Text>
                </View>
              </View>
              {orders.length > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeTxt}>{orders.length}</Text>
                </View>
              )}
            </FadeUp>

            {/* ── SUMMARY STRIP ── */}
            {orders.length > 0 && <SummaryStrip orders={orders} />}

            {/* ── FILTER STRIP ── */}
            {orders.length > 0 && (
              <View style={s.filterRow}>
                {ORDER_FILTERS.map((filter) => {
                  const isActive = activeFilter === filter.key;
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[s.filterChip, isActive && s.filterChipActive]}
                      onPress={() => setActiveFilter(filter.key)}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{filter.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <OrderCard
            item={item}
            index={index}
            onRequestCancel={handleRequestCancel}
            onConfirm={onConfirm}
            navigation={navigation}
          />
        )}
        ListEmptyComponent={
          <FadeUp delay={100} style={s.emptyWrap}>
            <LinearGradient colors={[C.primaryLight, C.bg]} style={s.emptyCircle}>
              <Ionicons name="bag-outline" size={44} color={C.primary} />
            </LinearGradient>
            <Text style={s.emptyTitle}>{orders.length === 0 ? "No orders yet" : "No matching orders"}</Text>
            <Text style={s.emptyBody}>
              {orders.length === 0
                ? "Your order history will appear here."
                : "Try another filter to see more orders."}
            </Text>
          </FadeUp>
        }
      />

      {/* ── CANCELLATION MODAL ── */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setShowCancelModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Cancel Order</Text>
            <Text style={s.modalSub}>Please tell us why you want to cancel this order.</Text>
            
            <TextInput
              style={s.modalInput}
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={4}
            />

            <View style={s.modalActions}>
              <TouchableOpacity 
                style={[s.modalBtn, s.modalBtnCancel]} 
                onPress={() => setShowCancelModal(false)}
                disabled={submitting}
              >
                <Text style={s.modalBtnCancelTxt}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.modalBtn, s.modalBtnSubmit]} 
                onPress={submitCancelRequest}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color={C.white} /> : <Text style={s.modalBtnSubmitTxt}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  list:    { paddingHorizontal: 16, paddingBottom: 40 },

  loadWrap:{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: C.bg },
  loadTxt: { fontSize: 14, color: C.muted, fontWeight: "600" },

  pageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 34, paddingBottom: 16,
  },
  titleRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  drawerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  titleBar:  { width: 4, height: 46, borderRadius: 2, backgroundColor: C.primary },
  pageTitle: { fontSize: 28, fontWeight: "900", fontFamily: F.serif, color: C.ink, letterSpacing: 0.2 },
  pageSubtitle: { fontSize: 13, color: C.muted, fontWeight: "600", marginTop: 2 },
  countBadge: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.primaryLight, borderWidth: 2, borderColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  countBadgeTxt: { fontSize: 17, fontWeight: "900", color: C.primary, fontFamily: F.serif },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginHorizontal: 2,
    marginBottom: 14,
  },
  filterChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  filterChipActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
  },
  filterChipTextActive: {
    color: C.primaryDark,
    fontWeight: "900",
  },

  emptyWrap:   { alignItems: "center", paddingTop: 60, gap: 14 },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:  { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  emptyBody:   { fontSize: 14, color: C.muted, textAlign: "center", fontWeight: "500" },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: C.white, borderRadius: 24, padding: 24, gap: 16 },
  modalTitle:   { fontSize: 22, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  modalSub:     { fontSize: 14, color: C.muted, fontWeight: "500" },
  modalInput:   { 
    backgroundColor: C.surface, borderRadius: 12, padding: 14, 
    fontSize: 14, color: C.ink, textAlignVertical: "top", 
    borderWidth: 1, borderColor: C.border, height: 100 
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn:     { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalBtnCancel: { backgroundColor: C.greyLight },
  modalBtnCancelTxt: { fontWeight: "700", color: C.muted },
  modalBtnSubmit: { backgroundColor: C.primary },
  modalBtnSubmitTxt: { fontWeight: "800", color: C.white },
});

export default MyOrders;