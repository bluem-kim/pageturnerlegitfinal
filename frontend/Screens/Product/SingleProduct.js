import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { addToCart } from "../../Redux/Actions/cartActions";
import { formatPHP } from "../../utils/currency";
import AuthGlobal from "../../Context/Store/AuthGlobal";

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");

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
  star:         "#F5A623",
  green:        "#22C55E",
  amber:        "#F59E0B",
  red:          "#EF4444",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

const HERO_H = SH * 0.52;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (v) =>
  formatPHP ? formatPHP(v) : "\u20B1" + Number(v || 0).toLocaleString();

// Animated fade+slide-up
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(22)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 16, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
};

// Star rating row
const Stars = ({ rating = 0, size = 14 }) => (
  <View style={{ flexDirection: "row", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Ionicons
        key={i}
        name={i <= Math.round(rating) ? "star" : i - 0.5 <= rating ? "star-half" : "star-outline"}
        size={size}
        color={C.star}
      />
    ))}
  </View>
);

// Stock status config
function stockConfig(count) {
  if (count <= 0)  return { color: C.red,   bg: "#FEE2E2", dot: C.red,   label: "Unavailable",   icon: "close-circle" };
  if (count <= 5)  return { color: C.amber, bg: "#FEF3C7", dot: C.amber, label: "Limited Stock",  icon: "warning" };
  return              { color: C.green, bg: "#DCFCE7", dot: C.green, label: "In Stock",       icon: "checkmark-circle" };
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT PILL  — small info badge
// ─────────────────────────────────────────────────────────────────────────────
const StatPill = ({ icon, value, label }) => (
  <View style={sp.wrap}>
    <View style={sp.iconWrap}>
      <Ionicons name={icon} size={16} color={C.primary} />
    </View>
    <Text style={sp.val}>{value}</Text>
    <Text style={sp.lbl}>{label}</Text>
  </View>
);
const sp = StyleSheet.create({
  wrap:    { alignItems: "center", flex: 1 },
  iconWrap:{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  val:     { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  lbl:     { fontSize: 10, color: C.muted, fontWeight: "600", marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5 },
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW CARD
// ─────────────────────────────────────────────────────────────────────────────
const ReviewCard = ({ review, index }) => {
  const initials = (review.name || "U").slice(0, 2).toUpperCase();
  // cycle avatar bg colors
  const avatarColors = ["#F4821F", "#B85E0E", "#F5C842", "#22C55E", "#3B82F6"];
  const avatarBg = avatarColors[index % avatarColors.length];

  return (
    <FadeUp delay={300 + index * 80}>
      <View style={rv.card}>
        {/* Left accent bar */}
        <View style={rv.accentBar} />

        <View style={rv.inner}>
          {/* Header */}
          <View style={rv.header}>
            <View style={[rv.avatar, { backgroundColor: avatarBg }]}>
              <Text style={rv.avatarTxt}>{initials}</Text>
            </View>
            <View style={rv.headerInfo}>
              <Text style={rv.name}>{review.name || "Anonymous"}</Text>
              <Stars rating={review.rating} size={11} />
            </View>
            <View style={rv.ratingBadge}>
              <Text style={rv.ratingBadgeTxt}>{review.rating}/5</Text>
            </View>
          </View>

          {/* Comment */}
          <Text style={rv.comment}>{review.comment || "No comment provided."}</Text>

          {/* Review images */}
          {Array.isArray(review.images) && review.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
              {review.images.map((img, i) => (
                <Image key={`${img}-${i}`} source={{ uri: img }} style={rv.img} resizeMode="cover" />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </FadeUp>
  );
};

const rv = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  accentBar: { width: 4, backgroundColor: C.primary },
  inner:     { flex: 1, padding: 14 },
  header:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar:    { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#FFF", fontSize: 13, fontWeight: "900" },
  headerInfo:{ flex: 1, gap: 3 },
  name:      { fontSize: 13, fontWeight: "800", color: C.ink },
  ratingBadge:{ backgroundColor: C.primaryLight, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  ratingBadgeTxt: { fontSize: 12, fontWeight: "900", color: C.primary, fontFamily: F.serif },
  comment:   { fontSize: 13, color: C.muted, lineHeight: 20, fontWeight: "500" },
  img:       { width: 72, height: 72, borderRadius: 10 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADING with accent bar
// ─────────────────────────────────────────────────────────────────────────────
const SectionHead = ({ title, count }) => (
  <View style={sec.row}>
    <View style={sec.bar} />
    <Text style={sec.title}>{title}</Text>
    {count !== undefined && (
      <View style={sec.badge}>
        <Text style={sec.badgeTxt}>{count}</Text>
      </View>
    )}
  </View>
);
const sec = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  bar:      { width: 4, height: 22, borderRadius: 2, backgroundColor: C.primary },
  title:    { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  badge:    { backgroundColor: C.primaryLight, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 12, fontWeight: "800", color: C.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
const SingleProduct = ({ route, navigation }) => {
  const item    = route.params?.item ?? {};
  const dispatch    = useDispatch();
  const authContext = useContext(AuthGlobal);
  const reviews = Array.isArray(item?.reviews) ? item.reviews : [];
  const stock   = stockConfig(item.countInStock ?? 0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // Parallax hero scale
  const heroScale = scrollY.interpolate({ inputRange: [-80, 0], outputRange: [1.12, 1], extrapolate: "clamp" });
  // Header title fade-in on scroll
  const headerOpacity = scrollY.interpolate({ inputRange: [HERO_H - 120, HERO_H - 60], outputRange: [0, 1], extrapolate: "clamp" });

  const handleAdd = () => {
    if (!authContext?.stateUser?.isAuthenticated) {
      Toast.show({ type: "info", text1: "Login required", text2: "Please login to add items to cart", topOffset: 60 });
      navigation.navigate("Profile", { screen: "Login" });
      return;
    }
    dispatch(addToCart(item));
    Toast.show({ 
      type: "success", 
      text1: `${item.name} added`, 
      text2: "Go to Cart to checkout", 
      topOffset: 60,
      onPress: () => {
        Toast.hide();
        navigation.navigate("Cart");
      }
    });
  };

  const images = item.images && item.images.length > 0 ? item.images : [item.image || "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png"];

  return (
    <View style={s.screen}>
      {/* ── FLOATING HEADER ── */}
      <View style={s.floatingHeader}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <Animated.Text style={[s.headerTitle, { opacity: headerOpacity }]} numberOfLines={1}>
          {item.name}
        </Animated.Text>
        <TouchableOpacity 
          style={s.backBtn} 
          onPress={() => navigation.navigate("Profile", { screen: "Notification Inbox" })} 
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={20} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* ── SCROLL BODY ── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* ── HERO ── */}
        <Animated.View style={[s.heroWrap, { transform: [{ scale: heroScale }] }]}>
          <Animated.FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            keyExtractor={(img, i) => `${img}-${i}`}
            renderItem={({ item: img }) => (
              <View style={{ width: SW, height: 420 }}>
                <ImageBackground source={{ uri: img }} style={s.heroBg} resizeMode="cover">
                  {/* Top vignette */}
                  <LinearGradient colors={["rgba(18,8,2,0.5)", "transparent"]} style={s.vigTop} pointerEvents="none" />
                  {/* Bottom vignette */}
                  <LinearGradient
                    colors={["rgba(244,130,31,0.52)", "rgba(244,130,31,0.22)", "rgba(244,130,31,0)"]}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0.5, y: 1 }}
                    end={{ x: 0.5, y: 0 }}
                    style={s.vigBottom}
                    pointerEvents="none"
                  />
                </ImageBackground>
              </View>
            )}
          />

          {/* Pagination dots */}
          {images.length > 1 && (
            <View style={s.pagination}>
              {images.map((_, i) => {
                const w = scrollX.interpolate({
                  inputRange: [(i - 1) * SW, i * SW, (i + 1) * SW],
                  outputRange: [6, 18, 6],
                  extrapolate: "clamp",
                });
                const op = scrollX.interpolate({
                  inputRange: [(i - 1) * SW, i * SW, (i + 1) * SW],
                  outputRange: [0.5, 1, 0.5],
                  extrapolate: "clamp",
                });
                return (
                  <Animated.View 
                    key={i} 
                    style={[
                      s.dot, 
                      { 
                        width: w, 
                        opacity: op,
                        backgroundColor: C.white,
                      }
                    ]} 
                  />
                );
              })}
            </View>
          )}

          {/* Genre badge */}
          <View style={s.heroBadgeRow}>
            <View style={s.genreBadge}>
              <Text style={s.genreTxt}>
                {item.genre?.name || item.category?.name || "Book"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── CONTENT CARD ── */}
        <View style={s.contentWrap}>

          {/* Title + Author */}
          <FadeUp delay={0}>
            <Text style={s.bookTitle}>{item.name}</Text>
            <Text style={s.bookAuthor}>{item.author || item.brand || "Unknown Author"}</Text>
          </FadeUp>

          {/* Price + Stock row */}
          <FadeUp delay={60} style={s.priceRow}>
            <Text style={s.price}>{fmt(item.price)}</Text>
            <View style={[s.stockBadge, { backgroundColor: stock.bg }]}>
              <View style={[s.stockDot, { backgroundColor: stock.dot }]} />
              <Text style={[s.stockTxt, { color: stock.color }]}>{stock.label}</Text>
            </View>
          </FadeUp>

          {/* Stars + review count */}
          <FadeUp delay={100} style={s.starsRow}>
            <Stars rating={item.rating || 0} size={16} />
            <Text style={s.ratingNum}>{Number(item.rating || 0).toFixed(1)}</Text>
            <Text style={s.ratingCount}>({item.numReviews || reviews.length} reviews)</Text>
          </FadeUp>

          {/* ── STATS ROW ── */}
          <FadeUp delay={140} style={s.statsCard}>
            <StatPill icon="layers-outline"     value={item.countInStock ?? 0} label="In Stock" />
            <View style={s.statsDivider} />
            <StatPill icon="bag-handle-outline" value={item.purchasedCount || 0} label="Sold" />
            <View style={s.statsDivider} />
            <StatPill icon="chatbubble-outline"  value={item.numReviews || reviews.length} label="Reviews" />
          </FadeUp>

          {/* ── DESCRIPTION ── */}
          {(item.description || item.richDescription) && (
            <FadeUp delay={180} style={s.section}>
              <SectionHead title="About this Book" />
              {item.description ? <Text style={s.descTxt}>{item.description}</Text> : null}
              {item.richDescription ? <Text style={[s.descTxt, { marginTop: 8 }]}>{item.richDescription}</Text> : null}
            </FadeUp>
          )}

          {/* ── REVIEWS ── */}
          <View style={s.section}>
            <SectionHead title="Reviews" count={reviews.length} />
            {reviews.length ? (
              reviews.map((review, idx) => (
                <ReviewCard key={review._id || review.id || idx} review={review} index={idx} />
              ))
            ) : (
              <FadeUp delay={300}>
                <View style={s.noReviewWrap}>
                  <View style={s.noReviewCircle}>
                    <Ionicons name="chatbubble-ellipses-outline" size={32} color={C.primary} />
                  </View>
                  <Text style={s.noReviewTitle}>No reviews yet</Text>
                  <Text style={s.noReviewBody}>Be the first to share your thoughts.</Text>
                </View>
              </FadeUp>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* ── STICKY ADD TO CART BAR ── */}
      <View style={s.stickyBar}>
        <View style={s.stickyInfo}>
          <Text style={s.stickyPrice}>{fmt(item.price)}</Text>
          <Text style={s.stickyLabel}>per copy</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.88}>
          <Ionicons name="cart-outline" size={18} color="#FFF" />
          <Text style={s.addBtnTxt}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // ── Floating header ──
  floatingHeader: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,250,246,0.92)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  headerTitle: {
    fontSize: 15, fontWeight: "800", color: C.ink, fontFamily: F.serif,
    flex: 1, textAlign: "center", marginHorizontal: 8,
  },

  // ── Hero ──
  heroWrap:  { width: SW, height: HERO_H, overflow: "hidden" },
  heroBg:    { width: "100%", height: "100%" },
  vigTop:    { position: "absolute", top: 0, left: 0, right: 0, height: 130 },
  vigBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 200 },
  heroBadgeRow: {
    position: "absolute", top: Platform.OS === "ios" ? 66 : 50,
    right: 16,
  },
  genreBadge: {
    backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 22,
  },
  genreTxt: { color: "#FFF", fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },

  // Pagination
  pagination: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: "#FFF",
  },

  // ── Content ──
  contentWrap: { backgroundColor: C.bg, marginTop: -32, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 28 },

  bookTitle:  { fontSize: 28, fontWeight: "900", fontFamily: F.serif, color: C.ink, lineHeight: 34, letterSpacing: 0.2 },
  bookAuthor: { fontSize: 14, color: C.muted, fontWeight: "700", marginTop: 6, letterSpacing: 0.8, textTransform: "uppercase" },

  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  price:    { fontSize: 30, fontWeight: "900", fontFamily: F.serif, color: C.primary },

  stockBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  stockDot:   { width: 8, height: 8, borderRadius: 4 },
  stockTxt:   { fontSize: 13, fontWeight: "800" },

  starsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  ratingNum:   { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  ratingCount: { fontSize: 13, color: C.muted, fontWeight: "500" },

  // Stats card
  statsCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    paddingVertical: 18, paddingHorizontal: 12,
    marginTop: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statsDivider: { width: 1, height: 40, backgroundColor: C.border },

  section: { marginTop: 28 },

  descTxt: { fontSize: 15, color: C.muted, lineHeight: 24, fontWeight: "500" },

  // No reviews
  noReviewWrap:   { alignItems: "center", paddingVertical: 32, gap: 10 },
  noReviewCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  noReviewTitle:  { fontSize: 17, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  noReviewBody:   { fontSize: 13, color: C.muted, textAlign: "center" },

  // ── Sticky bar ──
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
  stickyInfo:  { gap: 1 },
  stickyPrice: { fontSize: 22, fontWeight: "900", fontFamily: F.serif, color: C.primary },
  stickyLabel: { fontSize: 11, color: C.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },

  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 28, paddingVertical: 15,
    borderRadius: 22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  addBtnTxt: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 0.4 },
});

export default SingleProduct;