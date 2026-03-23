import React, { useCallback, useContext, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";

import AuthGlobal from "../../Context/Store/AuthGlobal";
import { logoutUser } from "../../Context/Actions/Auth.actions";
import { fetchUserOrders } from "../../Redux/Actions/orderActions";
import { fetchMyReviews } from "../../Redux/Actions/reviewActions";

const { width: SW } = Dimensions.get("window");
const COVER_H = 210;
const AVATAR_SIZE = 104;

const FALLBACK_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#FFF8F2",
  white:        "#FFFFFF",
  ink:          "#1A0F00",
  inkMid:       "#5C3A1E",
  primary:      "#F4821F",
  primaryDark:  "#C45C00",
  primaryDeep:  "#8B3A00",
  primaryLight: "#FEF0E3",
  primaryGlow:  "#FFB36B",
  amber:        "#FFAA00",
  muted:        "#B08060",
  border:       "#F0E4D4",
  surface:      "#FDF6EE",
  green:        "#22C55E",
  greenLight:   "#DCFCE7",
  overlay:      "rgba(244,130,31,0.10)",
};

const F = {
  display: Platform.select({ ios: "Georgia",  android: "serif",      default: "serif" }),
  body:    Platform.select({ ios: "Avenir",   android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING ORB
// ─────────────────────────────────────────────────────────────────────────────
const FloatingOrb = ({ style, size, delay = 0, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3600, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY }] }, style]} />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FADE-UP
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 18, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESSABLE SCALE
// ─────────────────────────────────────────────────────────────────────────────
const PressableScale = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  return (
    <TouchableOpacity onPressIn={onIn} onPressOut={onOut} onPress={onPress} activeOpacity={1}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon, delay = 0, children }) => (
  <FadeUp delay={delay} style={sc.wrap}>
    <View style={sc.header}>
      <LinearGradient colors={[C.primary, C.primaryDark]} style={sc.iconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={icon} size={14} color="#FFF" />
      </LinearGradient>
      <Text style={sc.title}>{title}</Text>
    </View>
    <View style={sc.body}>{children}</View>
  </FadeUp>
);

const sc = StyleSheet.create({
  wrap:    { backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: "hidden", shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  header:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.display, letterSpacing: 0.1 },
  body:    { paddingHorizontal: 18, paddingBottom: 4 },
});

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL ROW
// ─────────────────────────────────────────────────────────────────────────────
const DetailRow = ({ icon, label, value, last, accent }) => (
  <View style={[dr.row, last && dr.rowLast]}>
    <View style={[dr.iconBox, accent && dr.iconBoxAccent]}>
      <Ionicons name={icon} size={15} color={accent ? C.primary : C.muted} />
    </View>
    <View style={dr.body}>
      <Text style={dr.label}>{label}</Text>
      <Text style={[dr.value, accent && dr.valueAccent]} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={13} color={C.border} />
  </View>
);

const dr = StyleSheet.create({
  row:          { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  rowLast:      { borderBottomWidth: 0 },
  iconBox:      { width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconBoxAccent:{ backgroundColor: C.primaryLight },
  body:         { flex: 1 },
  label:        { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  value:        { fontSize: 14, fontWeight: "700", color: C.ink, fontFamily: F.body },
  valueAccent:  { color: C.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTION BUTTON
// ─────────────────────────────────────────────────────────────────────────────
const QuickBtn = ({ icon, label, onPress, variant = "outline" }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = variant === "primary";
  const isDanger  = variant === "danger";
  return (
    <Animated.View style={[qb.wrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[qb.btn, isPrimary && qb.btnPrimary, isDanger && qb.btnDanger]}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, damping: 14 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 14 }).start()}
        activeOpacity={1}
      >
        <View style={[qb.iconCircle, isPrimary && qb.iconCirclePrimary, isDanger && qb.iconCircleDanger]}>
          <Ionicons name={icon} size={16} color={isPrimary || isDanger ? "#FFF" : C.primary} />
        </View>
        <Text style={[qb.label, isPrimary && qb.labelWhite, isDanger && qb.labelWhite]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const qb = StyleSheet.create({
  wrap:               { flex: 1 },
  btn:                { alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, gap: 7 },
  btnPrimary:         { backgroundColor: C.primary, borderColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.38, shadowRadius: 10, elevation: 6 },
  btnDanger:          { backgroundColor: "#EF4444", borderColor: "#EF4444", shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  iconCircle:         { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  iconCirclePrimary:  { backgroundColor: "rgba(255,255,255,0.22)" },
  iconCircleDanger:   { backgroundColor: "rgba(255,255,255,0.22)" },
  label:              { fontSize: 11.5, fontWeight: "800", color: C.ink, textAlign: "center" },
  labelWhite:         { color: "#FFF" },
});

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────
const UserProfile = ({ navigation }) => {
  const dispatch = useDispatch();
  const context = useContext(AuthGlobal);
  const user    = context?.stateUser?.user        || {};
  const profile = context?.stateUser?.userProfile || {};
  const isAdmin = Boolean(profile.isAdmin || user.isAdmin);
  const isAuthenticated = Boolean(context?.stateUser?.isAuthenticated);
  const { userOrders = [] } = useSelector((state) => state.orders || {});
  const { myReviews = [] } = useSelector((state) => state.reviews || {});

  // ── Entrance animations ──
  const coverOp     = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;
  const avatarTy    = useRef(new Animated.Value(30)).current;

  // Logo shimmer
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(coverOp,     { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, delay: 220, damping: 13, stiffness: 140, useNativeDriver: true }),
      Animated.spring(avatarTy,    { toValue: 0, delay: 220, damping: 16, stiffness: 130, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const ringScale = shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      dispatch(fetchUserOrders());
      dispatch(fetchMyReviews());
    }, [dispatch, isAuthenticated])
  );

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  const name     = profile.name     || user.name     || "Guest";
  const email    = profile.email    || user.email    || "";
  const phone    = profile.phone    || user.phone    || "";
  const birthday = profile.birthday || user.birthday || "";
  const address  = profile.address  || user.address  || "";
  const ordersCount = Array.isArray(userOrders) ? userOrders.length : 0;
  const reviewsCount = Array.isArray(myReviews) ? myReviews.length : 0;

  return (
    <View style={s.screen}>

      {/* ── FLOATING MENU BTN ── */}
      <View style={s.floatNav}>
        <TouchableOpacity style={s.floatBtn} onPress={openDrawer} activeOpacity={0.82}>
          <Ionicons name="menu" size={20} color={C.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ══ HERO COVER ══ */}
        <Animated.View style={[s.coverWrap, { opacity: coverOp }]}>
          <LinearGradient
            colors={[C.primaryDeep, C.primaryDark, C.primary, C.amber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={s.cover}
          >
            <FloatingOrb size={180} color="rgba(255,255,255,0.07)" style={{ top: -60, right: -50 }} delay={0} />
            <FloatingOrb size={90}  color="rgba(255,255,255,0.10)" style={{ bottom: 10, left: -20 }} delay={800} />
            <FloatingOrb size={50}  color="rgba(255,200,80,0.20)"  style={{ top: 40, left: SW * 0.42 }} delay={1400} />

            {isAdmin && (
              <View style={s.adminBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#FFF" />
                <Text style={s.adminBadgeTxt}>Admin</Text>
              </View>
            )}

            {/* Eyebrow text in cover */}
            <View style={s.coverLabel}>
              <Text style={s.coverEyebrow}>My Profile</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ══ HERO CARD (overlaps cover) ══ */}
        <View style={s.heroCard}>

          {/* Avatar — springs in from above */}
          <Animated.View style={[s.avatarWrap, { transform: [{ scale: avatarScale }, { translateY: avatarTy }] }]}>
            <Animated.View style={{ transform: [{ scale: ringScale }] }}>
              <LinearGradient
                colors={[C.primaryGlow, C.primary, C.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.avatarRing}
              >
                <Image source={{ uri: profile.avatar || FALLBACK_AVATAR }} style={s.avatar} />
              </LinearGradient>
            </Animated.View>
            <View style={s.onlineDot} />
          </Animated.View>

          {/* Name + role */}
          <FadeUp delay={300} style={s.nameBlock}>
            <Text style={s.heroName}>{name}</Text>
            <View style={[s.rolePill, isAdmin && s.rolePillAdmin]}>
              <Ionicons
                name={isAdmin ? "shield-checkmark-outline" : "person-outline"}
                size={10}
                color={isAdmin ? C.primaryDeep : C.primary}
              />
              <Text style={[s.roleTxt, isAdmin && s.roleTxtAdmin]}>
                {isAdmin ? "Administrator" : "Member"}
              </Text>
            </View>
            {!!email && <Text style={s.heroEmail}>{email}</Text>}
          </FadeUp>

          {/* Stats strip */}
          <FadeUp delay={380} style={s.statsStrip}>
            <View style={s.statItem}>
              <Ionicons name="book-outline" size={16} color={C.primary} />
              <Text style={s.statVal}>{ordersCount}</Text>
              <Text style={s.statLbl}>Orders</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Ionicons name="heart-outline" size={16} color={C.primary} />
              <Text style={s.statVal}>—</Text>
              <Text style={s.statLbl}>Wishlist</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Ionicons name="star-outline" size={16} color={C.primary} />
              <Text style={s.statVal}>{reviewsCount}</Text>
              <Text style={s.statLbl}>Reviews</Text>
            </View>
          </FadeUp>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <FadeUp delay={420} style={s.actionsRow}>
          <QuickBtn icon="pencil-outline"      label="Edit Profile"      onPress={() => navigation.navigate("Edit Profile")}      variant="primary" />
          <QuickBtn icon="lock-closed-outline" label="Change Password"   onPress={() => navigation.navigate("Change Password")}   variant="outline" />
          <QuickBtn icon="log-out-outline"     label="Log Out"           onPress={() => logoutUser(context.dispatch)}             variant="danger" />
        </FadeUp>

        {/* ── PERSONAL INFO ── */}
        <View style={s.sectionWrap}>
          <SectionCard title="Personal Info" icon="person-outline" delay={480}>
            <DetailRow icon="person-outline" label="Full Name" value={name} />
            <DetailRow icon="mail-outline"   label="Email"     value={email}    accent />
            <DetailRow icon="call-outline"   label="Phone"     value={phone} />
            <DetailRow icon="gift-outline"   label="Birthday"  value={birthday} />
            <DetailRow icon="home-outline"   label="Address"   value={address}  last />
          </SectionCard>

          <SectionCard title="Account Info" icon="shield-outline" delay={540}>
            <DetailRow
              icon="id-card-outline"
              label="User ID"
              value={`#${String(user.userId || user.id || user._id || "—").slice(-8).toUpperCase()}`}
            />
            <DetailRow
              icon="ribbon-outline"
              label="Account Type"
              value={isAdmin ? "Administrator" : "Standard Member"}
              accent={isAdmin}
            />
            <DetailRow
              icon="checkmark-circle-outline"
              label="Status"
              value="Active"
              accent
              last
            />
          </SectionCard>
        </View>

      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const CARD_TOP_OFFSET = 52;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 52 },

  // Floating menu
  floatNav: { position: "absolute", top: Platform.OS === "ios" ? 56 : 40, left: 16, zIndex: 20 },
  floatBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 5,
    borderWidth: 1, borderColor: C.border,
  },

  // Cover
  coverWrap: { height: COVER_H },
  cover:     { width: "100%", height: "100%", overflow: "hidden" },
  coverLabel:{ position: "absolute", bottom: CARD_TOP_OFFSET + 16, left: 24 },
  coverEyebrow: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2.5, textTransform: "uppercase" },

  adminBadge: {
    position: "absolute", top: Platform.OS === "ios" ? 58 : 44, right: 16,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  adminBadgeTxt: { color: "#FFF", fontSize: 11, fontWeight: "900" },

  // Hero card
  heroCard: {
    marginTop: -CARD_TOP_OFFSET,
    marginHorizontal: 14,
    backgroundColor: C.white,
    borderRadius: 28,
    borderWidth: 1, borderColor: C.border,
    alignItems: "center",
    paddingTop: 62,
    paddingBottom: 18,
    paddingHorizontal: 18,
    shadowColor: C.primaryDark,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    marginBottom: 14,
  },

  // Avatar
  avatarWrap: { position: "absolute", top: -(AVATAR_SIZE / 2 + 4), alignSelf: "center" },
  avatarRing: {
    width: AVATAR_SIZE + 8, height: AVATAR_SIZE + 8, borderRadius: (AVATAR_SIZE + 8) / 2,
    padding: 4, alignItems: "center", justifyContent: "center",
    shadowColor: C.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  avatar:    { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: C.border },
  onlineDot: { position: "absolute", bottom: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: C.green, borderWidth: 3, borderColor: C.white },

  // Name block
  nameBlock:   { alignItems: "center", width: "100%" },
  heroName:    { fontSize: 24, fontWeight: "900", fontFamily: F.display, color: C.ink, letterSpacing: 0.2, textAlign: "center" },
  heroEmail:   { fontSize: 12.5, color: C.muted, fontWeight: "600", marginTop: 6, textAlign: "center" },
  rolePill:    { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.primary, paddingHorizontal: 13, paddingVertical: 5, borderRadius: 20 },
  rolePillAdmin: { backgroundColor: "#FEF3C7", borderColor: C.primaryDeep },
  roleTxt:     { fontSize: 11, fontWeight: "800", color: C.primary },
  roleTxtAdmin:{ color: C.primaryDeep },

  // Stats
  statsStrip:  { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 18, paddingVertical: 14, width: "100%", marginTop: 18 },
  statItem:    { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: C.border },
  statVal:     { fontSize: 16, fontWeight: "900", color: C.ink, fontFamily: F.display },
  statLbl:     { fontSize: 9.5, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 },

  // Actions
  actionsRow:  { flexDirection: "row", gap: 10, paddingHorizontal: 14, marginBottom: 14 },

  // Sections
  sectionWrap: { paddingHorizontal: 14 },
});

export default UserProfile;