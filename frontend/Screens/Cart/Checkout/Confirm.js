import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { clearCart, removeSelectedFromCart } from "../../../Redux/Actions/cartActions";
import baseURL from "../../../assets/common/baseurl";
import { formatPHP } from "../../../utils/currency";
import { getShippingFee } from "../../../utils/shipping";

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
  green:        "#22C55E",
  greenLight:   "#DCFCE7",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

const fmt = (v) => formatPHP ? formatPHP(v) : "\u20B1" + Number(v || 0).toLocaleString();

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 440, delay, useNativeDriver: true }),
      Animated.spring(ty,  { toValue: 0, delay, damping: 15, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon, delay = 0, children }) => (
  <FadeUp delay={delay} style={sc.wrap}>
    <View style={sc.header}>
      <View style={sc.bar} />
      <View style={sc.iconWrap}>
        <Ionicons name={icon} size={14} color={C.primary} />
      </View>
      <Text style={sc.title}>{title}</Text>
    </View>
    <View style={sc.body}>{children}</View>
  </FadeUp>
);

const sc = StyleSheet.create({
  wrap:    { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  header:  { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  bar:     { width: 4, height: 18, borderRadius: 2, backgroundColor: C.primary },
  iconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 14, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  body:    { padding: 16 },
});

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESS DETAIL ROW
// ─────────────────────────────────────────────────────────────────────────────
const DetailRow = ({ icon, label, value }) => (
  <View style={dr.row}>
    <View style={dr.iconWrap}>
      <Ionicons name={icon} size={13} color={C.primary} />
    </View>
    <View style={dr.body}>
      <Text style={dr.label}>{label}</Text>
      <Text style={dr.value}>{value}</Text>
    </View>
  </View>
);

const dr = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  iconWrap:{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  body:    { flex: 1 },
  label:   { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 },
  value:   { fontSize: 14, fontWeight: "700", color: C.ink },
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDER ITEM ROW
// ─────────────────────────────────────────────────────────────────────────────
const OrderItemRow = ({ item, index }) => {
  const qty   = Math.max(1, Number(item.quantity) || 1);
  const price = Number(item.price || 0) * qty;
  const uri   = item?.image || item?.images?.[0] || item?.coverImage || null;

  return (
    <FadeUp delay={200 + index * 60}>
      <View style={oi.row}>
        <View style={oi.coverWrap}>
          {uri
            ? <Image source={{ uri }} style={oi.cover} resizeMode="cover" />
            : <View style={oi.coverFallback}><Ionicons name="book" size={16} color={C.primary} /></View>
          }
        </View>

        <View style={oi.info}>
          <Text style={oi.name} numberOfLines={2}>{item.name}</Text>
          <View style={oi.qtyRow}>
            <View style={oi.qtyBadge}>
              <Text style={oi.qtyTxt}>×{qty}</Text>
            </View>
          </View>
        </View>

        <Text style={oi.price}>{fmt(price)}</Text>
      </View>
    </FadeUp>
  );
};

const oi = StyleSheet.create({
  row:         { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  coverWrap:   { width: 44, height: 58, borderRadius: 10, overflow: "hidden", backgroundColor: C.border, flexShrink: 0 },
  cover:       { width: "100%", height: "100%" },
  coverFallback: { width: "100%", height: "100%", backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  info:        { flex: 1, gap: 4 },
  name:        { fontSize: 13, fontWeight: "800", color: C.ink, lineHeight: 18 },
  qtyRow:      { flexDirection: "row", alignItems: "center" },
  qtyBadge:    { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  qtyTxt:      { fontSize: 11, fontWeight: "800", color: C.primary },
  price:       { fontSize: 14, fontWeight: "900", color: C.primary, fontFamily: F.serif, flexShrink: 0 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY ROW
// ─────────────────────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, bold, accent, topDivider }) => (
  <>
    {topDivider && <View style={{ height: 1, backgroundColor: C.border, marginVertical: 10 }} />}
    <View style={sr.row}>
      <Text style={[sr.label, bold && sr.labelBold]}>{label}</Text>
      <Text style={[sr.value, bold && sr.valueBold, accent && { color: C.primary }]}>{value}</Text>
    </View>
  </>
);

const sr = StyleSheet.create({
  row:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label:     { fontSize: 13, color: C.muted, fontWeight: "500" },
  labelBold: { fontSize: 15, color: C.ink, fontWeight: "800" },
  value:     { fontSize: 13, color: C.ink, fontWeight: "600" },
  valueBold: { fontSize: 20, fontWeight: "900", fontFamily: F.serif },
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM
// ─────────────────────────────────────────────────────────────────────────────
const Confirm = ({ route, navigation }) => {
  const dispatch    = useDispatch();
  const order       = route.params?.order;
  const [placing, setPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const orderItems  = order?.orderItems || [];
  const baseShippingFee = Number(order?.shippingFee ?? getShippingFee(order?.shippingRegion));
  const subtotal    = orderItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1),
    0
  );

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const jwt = await AsyncStorage.getItem("jwt");
      const res = await axios.post(`${baseURL}promotions/validate`, { code: couponCode }, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      
      const promo = res.data;
      setAppliedPromotion(promo);
      
      let discount = 0;
      if (promo.applyToShipping) {
        // Apply to shipping fee
        if (promo.discountPercentage > 0) {
          discount = (baseShippingFee * promo.discountPercentage) / 100;
        } else if (promo.discountAmount > 0) {
          discount = Math.min(promo.discountAmount, baseShippingFee);
        }
      } else {
        // Apply to subtotal
        if (promo.discountPercentage > 0) {
          discount = (subtotal * promo.discountPercentage) / 100;
        } else if (promo.discountAmount > 0) {
          discount = promo.discountAmount;
        }
      }
      
      setDiscountAmount(discount);
      Toast.show({ type: "success", text1: "Coupon applied!" });
    } catch (err) {
      Toast.show({ type: "error", text1: "Invalid coupon code" });
    }
  };

  const shippingFee = appliedPromotion?.applyToShipping ? Math.max(0, baseShippingFee - discountAmount) : baseShippingFee;
  const finalSubtotal = appliedPromotion?.applyToShipping ? subtotal : Math.max(0, subtotal - discountAmount);
  const grandTotal  = finalSubtotal + shippingFee;

  // ── Place order (unchanged) ───────────────────────────────────────────────
  const placeOrder = async () => {
    try {
      setPlacing(true);
      const token = await AsyncStorage.getItem("jwt");
      if (!token) {
        Toast.show({ type: "error", text1: "Please login first", text2: "Authentication is required", topOffset: 60 });
        return;
      }

      const grouped = orderItems.reduce((acc, item) => {
        const productId = item.id || item._id;
        if (!productId) return acc;
        if (!acc[productId]) acc[productId] = { quantity: 0, product: productId };
        acc[productId].quantity += Math.max(1, Number(item.quantity) || 1);
        return acc;
      }, {});

      const payload = {
        orderItems: Object.values(grouped),
        shippingAddress1: order?.shippingAddress1,
        shippingAddress2: "",
        city:    order?.city,
        zip:     order?.zip,
        country: order?.country,
        phone:   order?.phone,
        shippingRegion: order?.shippingRegion,
        shippingFee,
        totalPrice: grandTotal,
        discountAmount: discountAmount,
        promotion: appliedPromotion?._id || appliedPromotion?.id,
        dateOrdered: Date.now(),
        status: "3",
      };

      await axios.post(`${baseURL}orders`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const lineIds = orderItems.map((item) => item?.cartLineId).filter(Boolean);
      if (lineIds.length) dispatch(removeSelectedFromCart(lineIds));
      else                dispatch(clearCart());

      Toast.show({ type: "success", text1: "Order placed", text2: "Saved successfully", topOffset: 60 });
      navigation.navigate("Cart Home");
    } catch (err) {
      Toast.show({ type: "error", text1: "Order failed", text2: err?.response?.data?.message || "Please try again", topOffset: 60 });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── PAGE HEADER ── */}
        <FadeUp delay={0} style={s.pageHeader}>
          <View style={s.titleRow}>
            <View style={s.titleBar} />
            <View>
              <Text style={s.pageTitle}>Confirm Order</Text>
              <Text style={s.pageSubtitle}>Review everything before placing</Text>
            </View>
          </View>
          {/* Step 2 indicator */}
          <View style={s.stepRow}>
            <View style={[s.stepDot, s.stepDotDone]}>
              <Ionicons name="checkmark" size={13} color="#FFF" />
            </View>
            <View style={[s.stepLine, s.stepLineDone]} />
            <View style={s.stepDot}>
              <Text style={s.stepNum}>2</Text>
            </View>
          </View>
        </FadeUp>

        {/* ── SHIPPING DETAILS ── */}
        <SectionCard title="Shipping Details" icon="location-outline" delay={60}>
          <DetailRow icon="home-outline"    label="Address"  value={order?.shippingAddress1 || "—"} />
          <DetailRow icon="business-outline" label="City"    value={`${order?.city || "—"}, ${order?.country || "—"} ${order?.zip || ""}`} />
          <DetailRow icon="call-outline"    label="Phone"    value={order?.phone || "—"} />
          <DetailRow icon="map-outline"     label="Region"   value={String(order?.shippingRegion || "").toUpperCase() || "—"} />
        </SectionCard>

        {/* ── ORDER ITEMS ── */}
        <SectionCard title={`Items (${orderItems.length})`} icon="bag-outline" delay={120}>
          {orderItems.map((item, i) => (
            <OrderItemRow key={`${item.id || item._id}-${i}`} item={item} index={i} />
          ))}
        </SectionCard>

        {/* ── COUPON CODE ── */}
        <SectionCard title="Coupon Code" icon="pricetag-outline" delay={180}>
          <View style={cp.row}>
            <TextInput
              style={cp.input}
              placeholder="Enter code (e.g. FREE_SHIPPING)"
              value={couponCode}
              onChangeText={(val) => setCouponCode(val.toUpperCase())}
              autoCapitalize="characters"
              editable={!appliedPromotion}
            />
            <TouchableOpacity 
              style={[cp.btn, appliedPromotion && cp.btnApplied]} 
              onPress={handleApplyCoupon}
              disabled={!!appliedPromotion}
            >
              <Text style={cp.btnText}>{appliedPromotion ? "Applied" : "Apply"}</Text>
            </TouchableOpacity>
          </View>
          {appliedPromotion && (
            <View style={cp.promoInfo}>
              <Ionicons name="checkmark-circle" size={16} color={C.green} />
              <Text style={cp.promoText}>
                {appliedPromotion.title} applied! 
                {appliedPromotion.applyToShipping ? " (Discount on shipping)" : ""}
              </Text>
              <TouchableOpacity onPress={() => { setAppliedPromotion(null); setDiscountAmount(0); setCouponCode(""); }}>
                <Text style={cp.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </SectionCard>

        {/* ── PAYMENT SUMMARY ── */}
        <FadeUp delay={300} style={ps.card}>
          <View style={ps.header}>
            <View style={ps.bar} />
            <View style={ps.iconWrap}>
              <Ionicons name="receipt-outline" size={14} color={C.primary} />
            </View>
            <Text style={ps.title}>Payment Summary</Text>
          </View>
          <View style={ps.body}>
            <SummaryRow label={`${orderItems.length} items`} value={fmt(subtotal)} />
            <SummaryRow label="Shipping fee"                  value={`+${fmt(baseShippingFee)}`} />
            {appliedPromotion && (
              <SummaryRow 
                label={`Discount (${appliedPromotion.couponCode})`} 
                value={`-${fmt(discountAmount)}`} 
                accent 
              />
            )}
            <SummaryRow label="Grand Total" value={fmt(grandTotal)} bold accent topDivider />
          </View>
        </FadeUp>

        {/* ── NOTICE ── */}
        <FadeUp delay={360} style={s.notice}>
          <Ionicons name="information-circle" size={15} color={C.primary} />
          <Text style={s.noticeTxt}>
            By placing this order you agree to our terms of service. Payment is collected on delivery.
          </Text>
        </FadeUp>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── STICKY PLACE ORDER BAR ── */}
      <View style={s.stickyBar}>
        <View style={s.stickyInfo}>
          <Text style={s.stickyLabel}>Grand Total</Text>
          <Text style={s.stickyTotal}>{fmt(grandTotal)}</Text>
        </View>

        <TouchableOpacity
          style={[s.placeBtn, placing && s.placeBtnDisabled]}
          onPress={placeOrder}
          disabled={placing}
          activeOpacity={0.86}
        >
          {placing ? (
            <>
              <Ionicons name="hourglass-outline" size={16} color="#FFF" />
              <Text style={s.placeBtnTxt}>Placing…</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
              <Text style={s.placeBtnTxt}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SUMMARY CARD STYLES
// ─────────────────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  card:    { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  header:  { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  bar:     { width: 4, height: 18, borderRadius: 2, backgroundColor: C.primary },
  iconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 14, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  body:    { padding: 16 },
});

const cp = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginBottom: 8 },
  input: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, fontSize: 14, color: C.ink, backgroundColor: C.surface },
  btn: { backgroundColor: C.primary, paddingHorizontal: 20, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnApplied: { backgroundColor: C.green },
  btnText: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  promoInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  promoText: { flex: 1, fontSize: 12, color: C.green, fontWeight: "700" },
  removeText: { fontSize: 12, color: "#EF4444", fontWeight: "800", textDecorationLine: "underline" },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  pageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 20, paddingBottom: 18,
  },
  titleRow:     { flexDirection: "row", alignItems: "center", gap: 12 },
  titleBar:     { width: 4, height: 46, borderRadius: 2, backgroundColor: C.primary },
  pageTitle:    { fontSize: 28, fontWeight: "900", fontFamily: F.serif, color: C.ink, letterSpacing: 0.2 },
  pageSubtitle: { fontSize: 13, color: C.muted, fontWeight: "600", marginTop: 2 },

  stepRow:      { flexDirection: "row", alignItems: "center", gap: 0 },
  stepDot:      { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  stepDotDone:  { backgroundColor: C.green },
  stepNum:      { color: "#FFF", fontSize: 12, fontWeight: "900" },
  stepLine:     { width: 20, height: 2, backgroundColor: C.border },
  stepLineDone: { backgroundColor: C.green },

  notice: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: C.primaryLight,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 14,
  },
  noticeTxt: { flex: 1, fontSize: 12, color: C.muted, fontWeight: "500", lineHeight: 18 },

  stickyBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 12,
  },
  stickyInfo:  { gap: 2 },
  stickyLabel: { fontSize: 10, color: C.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  stickyTotal: { fontSize: 22, fontWeight: "900", fontFamily: F.serif, color: C.primary },

  placeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.42, shadowRadius: 10, elevation: 7,
  },
  placeBtnDisabled: { backgroundColor: C.muted, shadowOpacity: 0 },
  placeBtnTxt:      { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 0.3 },
});

export default Confirm;