import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { SHIPPING_REGION_OPTIONS, getShippingFee } from "../../../utils/shipping";
import { formatPHP } from "../../../utils/currency";
import AuthGlobal from "../../../Context/Store/AuthGlobal";

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
  inputBg:      "#FAF6F1",
  danger:       "#EF4444",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

const fmt = (v) => formatPHP ? formatPHP(v) : "\u20B1" + Number(v || 0).toLocaleString();

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION
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
// FIELD ROW  — icon + label + input
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({ icon, label, children, error }) => (
  <View style={fi.wrap}>
    <View style={fi.labelRow}>
      <Ionicons name={icon} size={12} color={error ? C.danger : C.muted} />
      <Text style={[fi.label, error && { color: C.danger }]}>{label}</Text>
    </View>
    {children}
    {!!error && <Text style={fi.errorTxt}>{error}</Text>}
  </View>
);

const fi = StyleSheet.create({
  wrap:     { marginBottom: 14 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  label:    { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 },
  errorTxt: { fontSize: 10, color: C.danger, fontWeight: "700", marginTop: 4, marginLeft: 2 },
});

const inputStyle = {
  backgroundColor: C.inputBg,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: C.border,
  paddingHorizontal: 14,
  height: 46,
  fontSize: 14,
  color: C.ink,
  fontWeight: "500",
};

// ─────────────────────────────────────────────────────────────────────────────
// REGION CARD
// ─────────────────────────────────────────────────────────────────────────────
const RegionCard = ({ option, active, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 14 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1.0,  useNativeDriver: true, damping: 14 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[rg.card, active && rg.cardActive]}
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={1}
      >
        {active && <View style={rg.activeBar} />}

        <View style={rg.left}>
          <View style={[rg.radioRing, active && rg.radioRingActive]}>
            {active && <View style={rg.radioDot} />}
          </View>
          <View style={rg.info}>
            <Text style={[rg.label, active && rg.labelActive]}>{option.label}</Text>
            <Text style={rg.sub}>Standard delivery</Text>
          </View>
        </View>

        <View style={[rg.feeBadge, active && rg.feeBadgeActive]}>
          <Text style={[rg.feeTxt, active && rg.feeTxtActive]}>
            +{fmt(getShippingFee(option.value))}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const rg = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 16, padding: 14, marginBottom: 10,
    backgroundColor: C.surface, overflow: "hidden",
  },
  cardActive:  { borderColor: C.primary, backgroundColor: C.primaryLight },
  activeBar:   { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.primary, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },

  left:        { flexDirection: "row", alignItems: "center", gap: 12 },
  radioRing:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  radioRingActive: { borderColor: C.primary },
  radioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },

  info:        { gap: 2 },
  label:       { fontSize: 14, fontWeight: "800", color: C.ink },
  labelActive: { color: C.primary },
  sub:         { fontSize: 11, color: C.muted, fontWeight: "500" },

  feeBadge:       { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 5 },
  feeBadgeActive: { backgroundColor: C.primary, borderColor: C.primary },
  feeTxt:         { fontSize: 13, fontWeight: "800", color: C.muted },
  feeTxtActive:   { color: "#FFF" },
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDER SUMMARY ROW
// ─────────────────────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, bold, accent }) => (
  <View style={sr.row}>
    <Text style={[sr.label, bold && sr.labelBold]}>{label}</Text>
    <Text style={[sr.value, bold && sr.valueBold, accent && { color: C.primary }]}>{value}</Text>
  </View>
);

const sr = StyleSheet.create({
  row:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label:      { fontSize: 13, color: C.muted, fontWeight: "500" },
  labelBold:  { color: C.ink, fontWeight: "800", fontSize: 15 },
  value:      { fontSize: 13, color: C.ink, fontWeight: "600" },
  valueBold:  { fontSize: 18, fontWeight: "900", fontFamily: F.serif },
});

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT
// ─────────────────────────────────────────────────────────────────────────────
const Checkout = ({ navigation, route }) => {
  const context     = useContext(AuthGlobal);
  const profile     = context?.stateUser?.userProfile || {};
  const cartItems   = useSelector((s) => s.cartItems);
  const items       = Array.isArray(route?.params?.selectedItems) && route.params.selectedItems.length
    ? route.params.selectedItems
    : cartItems;

  const [address,        setAddress]        = useState("");
  const [city,           setCity]           = useState("");
  const [zip,            setZip]            = useState("");
  const [country,        setCountry]        = useState("");
  const [phone,          setPhone]          = useState("");
  const [shippingRegion, setShippingRegion] = useState("luzon");

  // Errors state for each field
  const [errors, setErrors] = useState({});

  // Pre-fill from profile details
  useEffect(() => {
    if (profile.address) setAddress(profile.address);
    if (profile.city)    setCity(profile.city);
    if (profile.zip)     setZip(profile.zip);
    if (profile.country) setCountry(profile.country);
    if (profile.phone)   setPhone(profile.phone);
  }, [profile]);

  const shippingFee = getShippingFee(shippingRegion);
  const totalUnits  = items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
  const subtotal    = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1),
    0
  );
  const total       = subtotal + shippingFee;

  const order = useMemo(() => ({
    shippingAddress1: address,
    city, zip, country, phone,
    shippingRegion, shippingFee, subtotal, total,
    orderItems: items,
    status: "3",
    dateOrdered: new Date().toISOString(),
  }), [address, city, zip, country, phone, shippingRegion, shippingFee, subtotal, total, items]);

  const handleContinue = () => {
    const newErrors = {};
    if (!address) newErrors.address = "Address is required";
    if (!city)    newErrors.city    = "City is required";
    if (!zip)     newErrors.zip     = "ZIP code is required";
    if (!country) newErrors.country = "Country is required";
    if (!phone)   newErrors.phone   = "Phone number is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Toast.show({ type: "error", text1: "Validation failed", text2: "Please check all fields", topOffset: 60 });
      return;
    }
    navigation.navigate("Confirm", { order });
  };

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── PAGE HEADER ── */}
        <FadeUp delay={0} style={s.pageHeader}>
          <View style={s.titleRow}>
            <View style={s.titleBar} />
            <View>
              <Text style={s.pageTitle}>Shipping Details</Text>
              <Text style={s.pageSubtitle}>{totalUnits} {totalUnits === 1 ? "item" : "items"} · {fmt(subtotal)}</Text>
            </View>
          </View>
          {/* Step indicator */}
          <View style={s.stepRow}>
            <View style={s.stepDot}><Text style={s.stepNum}>1</Text></View>
            <View style={s.stepLine} />
            <View style={[s.stepDot, s.stepDotMuted]}><Text style={[s.stepNum, s.stepNumMuted]}>2</Text></View>
          </View>
        </FadeUp>

        {/* ── CONTACT DETAILS ── */}
        <SectionCard title="Contact & Phone" icon="call-outline" delay={60}>
          <Field icon="call" label="Phone Number" error={errors.phone}>
            <TextInput
              value={phone}
              onChangeText={(txt) => { setPhone(txt); setErrors(prev => ({ ...prev, phone: null })); }}
              placeholder="+63 900 000 0000"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              style={[inputStyle, errors.phone && { borderColor: C.danger }]}
            />
          </Field>
        </SectionCard>

        {/* ── SHIPPING ADDRESS ── */}
        <SectionCard title="Shipping Address" icon="location-outline" delay={120}>
          <Field icon="home-outline" label="Street Address" error={errors.address}>
            <TextInput
              value={address}
              onChangeText={(txt) => { setAddress(txt); setErrors(prev => ({ ...prev, address: null })); }}
              placeholder="House no., Street, Barangay"
              placeholderTextColor={C.muted}
              style={[inputStyle, errors.address && { borderColor: C.danger }]}
            />
          </Field>
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Field icon="business-outline" label="City / Municipality" error={errors.city}>
                <TextInput
                  value={city}
                  onChangeText={(txt) => { setCity(txt); setErrors(prev => ({ ...prev, city: null })); }}
                  placeholder="City"
                  placeholderTextColor={C.muted}
                  style={[inputStyle, errors.city && { borderColor: C.danger }]}
                />
              </Field>
            </View>
            <View style={{ width: 100 }}>
              <Field icon="mail-outline" label="ZIP Code" error={errors.zip}>
                <TextInput
                  value={zip}
                  onChangeText={(txt) => { setZip(txt); setErrors(prev => ({ ...prev, zip: null })); }}
                  placeholder="ZIP"
                  placeholderTextColor={C.muted}
                  keyboardType="number-pad"
                  style={[inputStyle, errors.zip && { borderColor: C.danger }]}
                />
              </Field>
            </View>
          </View>
          <Field icon="globe-outline" label="Country" error={errors.country}>
            <TextInput
              value={country}
              onChangeText={(txt) => { setCountry(txt); setErrors(prev => ({ ...prev, country: null })); }}
              placeholder="Philippines"
              placeholderTextColor={C.muted}
              style={[inputStyle, errors.country && { borderColor: C.danger }]}
            />
          </Field>
        </SectionCard>

        {/* ── SHIPPING REGION ── */}
        <SectionCard title="Shipping Region" icon="map-outline" delay={180}>
          {SHIPPING_REGION_OPTIONS.map((option) => (
            <RegionCard
              key={option.value}
              option={option}
              active={shippingRegion === option.value}
              onPress={() => setShippingRegion(option.value)}
            />
          ))}
        </SectionCard>

        {/* ── ORDER SUMMARY ── */}
        <FadeUp delay={240} style={sum.card}>
          <View style={sum.header}>
            <View style={sum.bar} />
            <Ionicons name="receipt-outline" size={14} color={C.primary} />
            <Text style={sum.title}>Order Summary</Text>
          </View>
          <View style={sum.body}>
            <SummaryRow label={`${totalUnits} items`} value={fmt(subtotal)} />
            <SummaryRow label="Shipping fee" value={`+${fmt(shippingFee)}`} />
            <View style={sum.divider} />
            <SummaryRow label="Total" value={fmt(total)} bold accent />
          </View>
        </FadeUp>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── STICKY CONTINUE BAR ── */}
      <View style={s.stickyBar}>
        <View style={s.stickyInfo}>
          <Text style={s.stickyLabel}>Order Total</Text>
          <Text style={s.stickyTotal}>{fmt(total)}</Text>
        </View>
        <TouchableOpacity style={s.continueBtn} onPress={handleContinue} activeOpacity={0.86}>
          <Text style={s.continueBtnTxt}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDER SUMMARY CARD STYLES
// ─────────────────────────────────────────────────────────────────────────────
const sum = StyleSheet.create({
  card:   { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  bar:    { width: 4, height: 18, borderRadius: 2, backgroundColor: C.primary },
  title:  { fontSize: 14, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  body:   { padding: 16 },
  divider:{ height: 1, backgroundColor: C.border, marginVertical: 10 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  pageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 34, paddingBottom: 18,
  },
  titleRow:     { flexDirection: "row", alignItems: "center", gap: 12 },
  titleBar:     { width: 4, height: 46, borderRadius: 2, backgroundColor: C.primary },
  pageTitle:    { fontSize: 28, fontWeight: "900", fontFamily: F.serif, color: C.ink, letterSpacing: 0.2 },
  pageSubtitle: { fontSize: 13, color: C.muted, fontWeight: "600", marginTop: 2 },

  stepRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  stepDotMuted: { backgroundColor: C.border },
  stepNum:      { color: "#FFF", fontSize: 12, fontWeight: "900" },
  stepNumMuted: { color: C.muted },
  stepLine:     { width: 20, height: 2, backgroundColor: C.border },

  row2: { flexDirection: "row", gap: 10 },

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

  continueBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 26, paddingVertical: 14,
    borderRadius: 22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.42, shadowRadius: 10, elevation: 7,
  },
  continueBtnTxt: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 0.3 },
});

export default Checkout;