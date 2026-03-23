import React, {
  useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import {
  ActivityIndicator, Animated, Dimensions, FlatList, Image,
  ImageBackground, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import CategoryFilter from "./CategoryFilter";
import ProductList from "./ProductList";
import { addToCart } from "../../Redux/Actions/cartActions";
import { fetchProducts } from "../../Redux/Actions/productActions";
import baseURL from "../../assets/common/baseurl";
import AuthGlobal from "../../Context/Store/AuthGlobal";

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
  chip:         "#F2EBE3",
  overlay:      "rgba(18,8,2,0.62)",
  cardShadow:   "#D4600A",
};

const F = {
  serif:    Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:     Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
  sansMono: Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" }),
};

const { width: SW, height: SH } = Dimensions.get("window");
const PEEK     = 24;
const GAP      = 14;
const POSTER_W = SW - PEEK * 2 - GAP;
const POSTER_H = Math.round(SW * 1.18);
const PAGE_SZ  = 20;

const SORT_OPTIONS = [
  { key: "popular", label: "Most Popular",       icon: "flame" },
  { key: "latest",  label: "Newest First",       icon: "time" },
  { key: "asc",     label: "Price ↑ Low–High",   icon: "trending-up" },
  { key: "desc",    label: "Price ↓ High–Low",   icon: "trending-down" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const getUri = (item) =>
  item?.image || item?.images?.[0] || item?.coverImage || item?.thumbnail || null;

const fmt = (v) => "\u20B1" + Number(v || 0).toLocaleString();

function applySort(arr, key) {
  const c = [...arr];
  if (key === "popular") return c.sort((a, b) => Number(b.purchasedCount || 0) - Number(a.purchasedCount || 0));
  if (key === "latest")  return c.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
  if (key === "asc")     return c.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (key === "desc")    return c.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// FADE-IN
// ─────────────────────────────────────────────────────────────────────────────
const FadeIn = ({ delay = 0, dy = 20, style, children }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(dy)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 16, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
};

// ─────────────────────────────────────────────────────────────────────────────
// HERO CARD  — full-bleed portrait with dramatic bottom-up gradient
// ─────────────────────────────────────────────────────────────────────────────
const HeroCard = ({ item, onPress, scale, rank }) => {
  const uri = getUri(item);
  const stockQty = Number(
    item?.stock ??
    item?.countInStock ??
    item?.inStock ??
    item?.quantity ??
    1
  );
  const inStock = Number.isFinite(stockQty) ? stockQty > 0 : true;
  return (
    <Animated.View style={[hc.wrap, { transform: [{ scale }] }]}>
      <TouchableOpacity style={hc.touch} onPress={() => onPress(item)} activeOpacity={0.93}>
        {uri ? (
          <ImageBackground source={{ uri }} style={hc.img} imageStyle={hc.imgStyle} resizeMode="cover">
            {/* Vignette top */}
            <LinearGradient
              colors={["rgba(18,8,2,0.55)", "transparent"]}
              style={hc.vignetteTop}
              pointerEvents="none"
            />
            {/* Rich bottom gradient */}
            <LinearGradient
              colors={["rgba(244,130,31,0.50)", "rgba(244,130,31,0.22)", "rgba(244,130,31,0.00)"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={hc.gradient}
            >
              {/* Top badges */}
              <View style={hc.topRow}>
                <View style={hc.genreBadge}>
                  <Text style={hc.genreText}>
                    {item.genre?.name || item.category?.name || "Book"}
                  </Text>
                </View>
                <View style={hc.statRow}>
                  <View style={hc.statPill}>
                    <Ionicons name="eye" size={10} color="#FFF" />
                    <Text style={hc.statTxt}>{item.purchasedCount || 0}</Text>
                  </View>
                  <View style={hc.statPill}>
                    <Ionicons name="heart" size={10} color="#FFF" />
                    <Text style={hc.statTxt}>{item.reviewCount || 0}</Text>
                  </View>
                </View>
              </View>

              {/* Bottom info */}
              <View style={hc.bottom}>
                {/* Number tag */}
                <View style={hc.numberTag}>
                  <Text style={hc.numberTagText}>#{rank}</Text>
                </View>
                <Text style={hc.title} numberOfLines={2}>{item.name || item.title}</Text>
                <Text style={hc.author} numberOfLines={1}>
                  {(item.author || item.brand || "").toUpperCase()}
                </Text>
                <View style={hc.divLine} />
                <View style={hc.priceRow}>
                  <Text style={hc.price}>{fmt(item.price)}</Text>
                  <View style={[hc.stockBadge, !inStock && hc.stockOut]}>
                    <Text style={hc.stockText}>
                      {inStock ? "In Stock" : "Sold Out"}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        ) : (
          <LinearGradient colors={[C.primary, C.primaryDark, "#6B2E00"]} style={hc.img}>
            <LinearGradient
              colors={["rgba(244,130,31,0.46)", "rgba(244,130,31,0.20)", "rgba(244,130,31,0.00)"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={hc.gradient}
            >
              <View style={hc.bottom}>
                <Text style={hc.title}>{item.name || item.title}</Text>
                <Text style={hc.author}>{(item.author || "").toUpperCase()}</Text>
                <Text style={hc.price}>{fmt(item.price)}</Text>
              </View>
            </LinearGradient>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const hc = StyleSheet.create({
  wrap: {
    width: POSTER_W, height: POSTER_H, marginRight: GAP,
    borderRadius: 24,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.45, shadowRadius: 20,
    elevation: 14, backgroundColor: C.white,
  },
  touch:    { width: "100%", height: "100%", borderRadius: 24, overflow: "hidden" },
  img:      { width: "100%", height: "100%" },
  imgStyle: { borderRadius: 24 },
  vignetteTop: {
    position: "absolute", top: 0, left: 0, right: 0, height: 120,
  },
  gradient: { flex: 1, justifyContent: "space-between", padding: 18, paddingTop: 16 },

  topRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  genreBadge: {
    backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  genreText: { color: "#FFF", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  statRow:   { flexDirection: "row", gap: 6 },
  statPill:  {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.38)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  statTxt:   { color: "#FFF", fontSize: 11, fontWeight: "700" },

  bottom:    { gap: 6 },
  numberTag: {
    alignSelf: "flex-start",
    backgroundColor: C.gold, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6,
    marginBottom: 4,
  },
  numberTagText: { color: C.ink, fontSize: 12, fontWeight: "900", fontFamily: F.serif },
  title: { color: "#FFF", fontSize: 26, fontWeight: "900", fontFamily: F.serif, lineHeight: 32, letterSpacing: 0.2 },
  author: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", letterSpacing: 1.8 },
  divLine: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 10 },
  priceRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price:     { color: C.gold, fontSize: 24, fontWeight: "900", fontFamily: F.serif },
  stockBadge: {
    backgroundColor: "rgba(244,130,31,0.9)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  stockOut:  { backgroundColor: "rgba(120,60,20,0.7)" },
  stockText: { color: "#FFF", fontSize: 11, fontWeight: "800" },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
    marginBottom: 10,
    backgroundColor: "rgba(244,130,31,0.06)", // very subtle primary tint
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────
const HeroCarousel = ({ items, onPress }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  if (!items?.length) return null;
  const STEP = POSTER_W + GAP;
  return (
    <View style={{ overflow: "visible" }}>
      <Animated.ScrollView
        horizontal snapToInterval={STEP} decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: PEEK, paddingRight: PEEK, paddingBottom: 16 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {items.map((item, idx) => {
          const scale = scrollX.interpolate({
            inputRange: [(idx - 1) * STEP, idx * STEP, (idx + 1) * STEP],
            outputRange: [0.91, 1.0, 0.91], extrapolate: "clamp",
          });
          return <HeroCard key={item.id || item._id || idx} item={item} onPress={onPress} scale={scale} rank={idx + 1} />;
        })}
      </Animated.ScrollView>
      {items.length > 1 && (
        <View style={hc.pagination}>
          {items.map((_, i) => {
            const w  = scrollX.interpolate({ inputRange: [(i-1)*STEP, i*STEP, (i+1)*STEP], outputRange: [6, 20, 6], extrapolate: "clamp" });
            const op = scrollX.interpolate({ inputRange: [(i-1)*STEP, i*STEP, (i+1)*STEP], outputRange: [0.35, 1, 0.35], extrapolate: "clamp" });
            return (
              <Animated.View 
                key={i} 
                style={{ 
                  width: w, 
                  height: 6, 
                  borderRadius: 3, 
                  backgroundColor: C.primary, 
                  opacity: op 
                }} 
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDED CARD  — bold cover + orange price
// ─────────────────────────────────────────────────────────────────────────────
const RecCard = ({ item, onPress }) => {
  const uri = getUri(item);
  const sc  = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <TouchableOpacity
        style={rec.card} activeOpacity={1}
        onPress={() => onPress(item)}
        onPressIn={() => Animated.spring(sc, { toValue: 0.94, useNativeDriver: true, damping: 14 }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, damping: 14 }).start()}
      >
        <View style={rec.imgWrap}>
          {uri
            ? <Image source={{ uri }} style={rec.img} resizeMode="cover" />
            : <LinearGradient colors={[C.primary, C.primaryDark]} style={rec.img}><Ionicons name="book" size={28} color="rgba(255,255,255,0.4)" /></LinearGradient>
          }
          {/* small orange corner accent */}
          <View style={rec.cornerAccent} />
        </View>
        <Text style={rec.name} numberOfLines={2}>{item.name || item.title}</Text>
        <Text style={rec.price}>{fmt(item.price)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const rec = StyleSheet.create({
  card:     { width: 118, marginRight: 16 },
  imgWrap:  {
    width: 118, height: 158, borderRadius: 16, overflow: "hidden",
    marginBottom: 9,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5,
    backgroundColor: C.border,
  },
  img:      { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  cornerAccent: {
    position: "absolute", top: 0, right: 0,
    width: 30, height: 30,
    backgroundColor: C.primary,
    borderBottomLeftRadius: 14,
    opacity: 0.85,
  },
  name:  { fontSize: 12, fontWeight: "800", color: C.ink, lineHeight: 17 },
  price: { fontSize: 14, fontWeight: "900", color: C.primary, marginTop: 3, fontFamily: F.serif },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER  — bold with decorative accent bar
// ─────────────────────────────────────────────────────────────────────────────
const SectionHead = ({ title, action, actionLabel }) => (
  <View style={sh2.row}>
    <View style={sh2.left}>
      <View style={sh2.bar} />
      <Text style={sh2.title}>{title}</Text>
    </View>
    {action && (
      <TouchableOpacity onPress={action} activeOpacity={0.7} style={sh2.actionBtn}>
        <Text style={sh2.actionLabel}>{actionLabel || "View all"}</Text>
        <Ionicons name="arrow-forward" size={12} color={C.primary} />
      </TouchableOpacity>
    )}
  </View>
);

const sh2 = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  left:  { flexDirection: "row", alignItems: "center", gap: 10 },
  bar:   { width: 4, height: 22, borderRadius: 2, backgroundColor: C.primary },
  title: { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.ink, letterSpacing: 0.2 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  actionLabel: { fontSize: 12, fontWeight: "800", color: C.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// FILTER SHEET
// ─────────────────────────────────────────────────────────────────────────────
const FilterSheet = ({ visible, onClose, minPrice, maxPrice, setMinPrice, setMaxPrice, bounds, sort, setSort }) => {
  const slide = useRef(new Animated.Value(800)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: visible ? 0 : 800, useNativeDriver: true, damping: 26, stiffness: 220 }).start();
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={fs.overlay} onPress={onClose} />
      <Animated.View style={[fs.sheet, { transform: [{ translateY: slide }] }]}>
        <View style={fs.handle} />
        <View style={fs.header}>
          <Text style={fs.title}>Filters</Text>
          <TouchableOpacity onPress={onClose} hitSlop={14} style={fs.closeBtn}>
            <Ionicons name="close" size={18} color={C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={fs.body}>
          {/* Sort */}
          <Text style={fs.label}>SORT BY</Text>
          <View style={fs.grid}>
            {SORT_OPTIONS.map((opt) => {
              const on = sort === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[fs.optCard, on && fs.optCardOn]}
                  onPress={() => setSort(opt.key)}
                  activeOpacity={0.8}
                >
                  <View style={[fs.optIcon, on && fs.optIconOn]}>
                    <Ionicons name={opt.icon} size={14} color={on ? "#FFF" : C.primary} />
                  </View>
                  <Text style={[fs.optText, on && fs.optTextOn]}>{opt.label}</Text>
                  {on && <View style={fs.check}><Ionicons name="checkmark" size={11} color="#FFF" /></View>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Price slider */}
          <Text style={[fs.label, { marginTop: 28 }]}>PRICE RANGE</Text>
          <View style={fs.sliderBox}>
            <View style={fs.sliderRow}>
              <Text style={fs.sliderKey}>Min</Text>
              <Text style={fs.sliderVal}>{fmt(minPrice)}</Text>
            </View>
            <Slider
              minimumValue={bounds.min} maximumValue={Math.max(bounds.min, maxPrice)}
              value={minPrice} step={1}
              minimumTrackTintColor={C.primary} maximumTrackTintColor={C.border} thumbTintColor={C.primary}
              onValueChange={(v) => setMinPrice(Math.min(Math.round(v), maxPrice))}
            />
            <View style={[fs.sliderRow, { marginTop: 8 }]}>
              <Text style={fs.sliderKey}>Max</Text>
              <Text style={fs.sliderVal}>{fmt(maxPrice)}</Text>
            </View>
            <Slider
              minimumValue={Math.min(minPrice, bounds.max)} maximumValue={bounds.max}
              value={maxPrice} step={1}
              minimumTrackTintColor={C.primary} maximumTrackTintColor={C.border} thumbTintColor={C.primary}
              onValueChange={(v) => setMaxPrice(Math.max(Math.round(v), minPrice))}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={fs.hint}>{fmt(bounds.min)}</Text>
              <Text style={fs.hint}>{fmt(bounds.max)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={fs.footer}>
          <TouchableOpacity style={fs.applyBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={fs.applyTxt}>Apply Filters</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const fs = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: C.overlay },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: "86%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 28,
  },
  handle:  { width: 44, height: 4, borderRadius: 2, backgroundColor: "#D4C8BC", alignSelf: "center", marginTop: 14, marginBottom: 4 },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  title:   { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  closeBtn:{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.chip, alignItems: "center", justifyContent: "center" },
  body:    { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 12 },
  label:   { fontSize: 10, fontWeight: "900", letterSpacing: 1.8, color: C.muted, marginBottom: 14 },

  grid: { gap: 10 },
  optCard: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 16, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.white,
  },
  optCardOn: { borderColor: C.primary, backgroundColor: C.primaryLight },
  optIcon:   { width: 34, height: 34, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 12 },
  optIconOn: { backgroundColor: C.primary },
  optText:   { flex: 1, fontSize: 14, fontWeight: "600", color: C.muted },
  optTextOn: { color: C.primary, fontWeight: "800" },
  check:     { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },

  sliderBox: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  sliderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sliderKey: { fontSize: 12, fontWeight: "700", color: C.muted },
  sliderVal: { fontSize: 14, fontWeight: "900", color: C.ink },
  hint:      { fontSize: 11, color: C.muted },

  footer: { paddingHorizontal: 22, paddingVertical: 18, borderTopWidth: 1, borderTopColor: C.border },
  applyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary, borderRadius: 18, paddingVertical: 17,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  applyTxt: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CONTAINER
// ─────────────────────────────────────────────────────────────────────────────
const ProductContainer = ({ navigation }) => {
  const [query,          setQuery]          = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [minPrice,       setMinPrice]       = useState(0);
  const [maxPrice,       setMaxPrice]       = useState(0);
  const [activeSort,     setActiveSort]     = useState("popular");
  const [sheetVisible,   setSheetVisible]   = useState(false);
  const [categories,     setCategories]     = useState([]);
  const [refreshing,     setRefreshing]     = useState(false);

  const { items: products, loading, error } = useSelector((st) => st.products);
  const dispatch    = useDispatch();
  const authContext = useContext(AuthGlobal);

  useEffect(() => {
    let mounted = true;
    dispatch(fetchProducts({ limit: PAGE_SZ, page: 1 }));
    (async () => {
      try { const r = await axios.get(`${baseURL}categories`); if (mounted) setCategories(r.data || []); }
      catch { Toast.show({ type: "info", text1: "Genres unavailable", topOffset: 60 }); }
    })();
    return () => { mounted = false; };
  }, [dispatch]);

  useEffect(() => { if (error) Toast.show({ type: "error", text1: "Unable to load catalog", text2: error, topOffset: 60 }); }, [error]);

  const onRefresh = async () => { setRefreshing(true); await dispatch(fetchProducts({ limit: PAGE_SZ, page: 1 })); setRefreshing(false); };

  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 5000 };
    const ps = products.map((p) => Number(p.price || 0)).filter(Number.isFinite);
    return { min: Math.floor(Math.min(...ps)), max: Math.ceil(Math.max(...ps)) };
  }, [products]);

  // init slider when products load
  useEffect(() => {
    if (!products.length) return;
    setMinPrice((p) => p === 0 ? priceBounds.min : p);
    setMaxPrice((p) => p === 0 ? priceBounds.max : p);
  }, [priceBounds.min, priceBounds.max, products.length]);

  const popularItems    = useMemo(() => [...products].sort((a, b) => Number(b.purchasedCount||0)-Number(a.purchasedCount||0)).slice(0,5), [products]);
  const recommendedItems = useMemo(() => [...products].sort((a, b) => new Date(b.createdAt||b.updatedAt||0)-new Date(a.createdAt||a.updatedAt||0)).slice(0,10), [products]);

  const filtered = useMemo(() => {
    const getId = (v) => (!v ? "" : typeof v === "object" ? String(v.id || v._id || "") : String(v));
    const q = query.toLowerCase().trim();

    // 1. Filter by category
    const byCat = activeCategory === "all" ? products : products.filter((p) => {
      const sel = String(activeCategory);
      const gId = typeof p.genre === "object" ? p.genre?.id || p.genre?._id : p.genre;
      if (gId && String(gId) === sel) return true;
      const cPar = typeof p.category === "object" ? p.category?.parent?.id || p.category?.parent?._id || p.category?.parent : null;
      if (cPar && String(cPar) === sel) return true;
      if (getId(p.category) === sel) return true;
      return Array.isArray(p.subGenres) && p.subGenres.some((s) => getId(s) === sel || getId(s?.parent) === sel);
    });

    // 2. Filter by search query and price
    const matches = byCat.filter((p) => {
      const nameMatch = String(p.name || "").toLowerCase().includes(q);
      const authorMatch = String(p.author || p.brand || "").toLowerCase().includes(q);
      const priceMatch = Number(p.price || 0) >= minPrice && Number(p.price || 0) <= maxPrice;
      return (nameMatch || authorMatch) && priceMatch;
    });

    // 3. Apply base sorting (popular, latest, price)
    let sorted = applySort(matches, activeSort);

    // 4. If searching, prioritize "starts with" matches at the top
    if (q) {
      sorted = [...sorted].sort((a, b) => {
        const aName = String(a?.name || "").toLowerCase();
        const bName = String(b?.name || "").toLowerCase();
        const aAuthor = String(a?.author || a?.brand || "").toLowerCase();
        const bAuthor = String(b?.author || b?.brand || "").toLowerCase();

        const aStarts = aName.startsWith(q) || aAuthor.startsWith(q);
        const bStarts = bName.startsWith(q) || bAuthor.startsWith(q);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    }

    return sorted;
  }, [query, activeCategory, minPrice, maxPrice, activeSort, products]);

  const clearFilters = () => { setQuery(""); setActiveCategory("all"); setMinPrice(priceBounds.min); setMaxPrice(priceBounds.max); setActiveSort("popular"); };

  const isPriceFiltered  = minPrice > priceBounds.min || maxPrice < priceBounds.max;
  const hasActiveFilters = query !== "" || activeCategory !== "all" || isPriceFiltered || activeSort !== "popular";
  const filterCount      = [isPriceFiltered, activeSort !== "popular"].filter(Boolean).length;

  const handleAdd = (item) => {
    if (!authContext?.stateUser?.isAuthenticated) {
      Toast.show({ type: "info", text1: "Login required", text2: "Please login first", topOffset: 60 });
      navigation.navigate("Profile", { screen: "Login" }); return;
    }
    dispatch(addToCart(item));
    Toast.show({ 
      type: "success", 
      text1: `${item.name} added`, 
      text2: "Open Cart to review your order", 
      topOffset: 60,
      onPress: () => {
        Toast.hide();
        navigation.navigate("Cart");
      }
    });
  };

  const handleDetails = useCallback((item) => navigation.navigate("Product Detail", { item }), [navigation]);
  const sortLabel     = SORT_OPTIONS.find((o) => o.key === activeSort)?.label;
  const sortIcon      = SORT_OPTIONS.find((o) => o.key === activeSort)?.icon;
  const openDrawer    = () => navigation?.getParent?.()?.openDrawer?.();

  // ── LIST HEADER ──────────────────────────────────────────────────────────────
  const Header = (
    <View>
      {/* ── PAGE TITLE ── */}
      <FadeIn delay={0} style={main.titleBlock}>
        <View style={main.titleRow}>
          <TouchableOpacity
            style={main.drawerFab}
            onPress={openDrawer}
            activeOpacity={0.85}
          >
            <Ionicons name="menu" size={28} color={C.primary} />
          </TouchableOpacity>
          <Text style={main.pageTitle}>Explore</Text>
        </View>
        <TouchableOpacity
            style={main.cartFab}
            onPress={() => navigation.navigate("Profile", { screen: "Notification Inbox" })}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={28} color={C.primary} />
          </TouchableOpacity>
      </FadeIn>

      {/* ── SEARCH BAR ── */}
      <FadeIn delay={60} style={main.searchRow}>
        <View style={main.searchPill}>
          <Ionicons name="search" size={16} color={C.muted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search books & authors..."
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={setQuery}
            style={main.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
      </FadeIn>

      {/* ── BESTSELLERS SECTION ── */}
      {popularItems.length > 0 && (
        <FadeIn delay={120}>
          <View style={{ marginBottom: 16 }}>
            <SectionHead title="Bestsellers" />
            <HeroCarousel items={popularItems} onPress={handleDetails} />
          </View>
        </FadeIn>
      )}

      {/* ── RECOMMENDED SECTION ── */}
      {recommendedItems.length > 0 && (
        <FadeIn delay={180} style={{ marginBottom: 20 }}>
          <SectionHead title="Recommended" action={() => setActiveSort("latest")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            {recommendedItems.map((item, i) => (
              <RecCard key={item.id||item._id||i} item={item} onPress={handleDetails} />
            ))}
          </ScrollView>
        </FadeIn>
      )}

      {/* ── DIVIDER STRIPE ── */}
      <LinearGradient
        colors={[C.border, C.primary, C.border]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={main.stripe}
      />

      {/* ── ALL BOOKS HEADER + CATEGORY FILTER ── */}
      <View style={{ marginTop: 20, marginBottom: 4 }}>
        <SectionHead title="All Books" />
        <CategoryFilter categories={categories} active={activeCategory} onChange={setActiveCategory} />
      </View>

      {/* ── ACTIVE FILTER PILLS ── */}
      {hasActiveFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={main.pillRow}>
          {isPriceFiltered && (
            <View style={main.pill}>
              <Ionicons name="pricetag" size={11} color={C.primary} />
              <Text style={main.pillTxt}>{fmt(minPrice)} – {fmt(maxPrice)}</Text>
              <TouchableOpacity onPress={() => { setMinPrice(priceBounds.min); setMaxPrice(priceBounds.max); }} hitSlop={6}>
                <Ionicons name="close-circle" size={13} color={C.primary} />
              </TouchableOpacity>
            </View>
          )}
          {activeSort !== "popular" && (
            <View style={main.pill}>
              <Ionicons name={sortIcon} size={11} color={C.primary} />
              <Text style={main.pillTxt}>{sortLabel}</Text>
              <TouchableOpacity onPress={() => setActiveSort("popular")} hitSlop={6}>
                <Ionicons name="close-circle" size={13} color={C.primary} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={main.clearPill} onPress={clearFilters} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={11} color="#FFF" />
            <Text style={main.clearPillTxt}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── RESULTS + SORT CHIP ── */}
      <View style={main.resultsRow}>
        <Text style={main.resultsCount}>
          {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "book" : "books"}`}
        </Text>
        <TouchableOpacity style={main.sortChip} onPress={() => setSheetVisible(true)} activeOpacity={0.8}>
          <Ionicons name={sortIcon} size={12} color={C.primary} />
          <Text style={main.sortChipTxt}>{sortLabel}</Text>
          <Ionicons name="chevron-down" size={11} color={C.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={main.screen}>
      <FlatList
        data={filtered}
        numColumns={2}
        columnWrapperStyle={main.colWrap}
        keyExtractor={(item, i) => String(item.id||item._id||i)}
        contentContainerStyle={main.list}
        ListHeaderComponent={Header}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => <ProductList item={item} navigation={navigation} onAdd={handleAdd} />}
        ListFooterComponent={loading ? <View style={main.center}><ActivityIndicator size="large" color={C.primary} /></View> : null}
        ListEmptyComponent={!loading ? (
          <View style={main.center}>
            <View style={main.emptyCircle}>
              <Ionicons name="book-outline" size={40} color={C.primary} />
            </View>
            <Text style={main.emptyTitle}>No books found</Text>
            <Text style={main.emptyBody}>Try changing your search or filters.</Text>
            {hasActiveFilters && (
              <TouchableOpacity style={main.emptyBtn} onPress={clearFilters}>
                <Text style={main.emptyBtnTxt}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      />

      <FilterSheet
        visible={sheetVisible} onClose={() => setSheetVisible(false)}
        minPrice={minPrice} maxPrice={maxPrice}
        setMinPrice={setMinPrice} setMaxPrice={setMaxPrice}
        bounds={priceBounds} sort={activeSort} setSort={setActiveSort}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN STYLES
// ─────────────────────────────────────────────────────────────────────────────
const main = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  list:    { paddingBottom: 48 },
  colWrap: { justifyContent: "space-between", paddingHorizontal: 12 },

  titleBlock: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pageTitle: { fontSize: 36, fontWeight: "900", fontFamily: F.serif, color: C.ink, letterSpacing: -0.5 },
  drawerFab: {
    width: 36, height: 36,
    alignItems: "center", justifyContent: "center",
  },
  cartFab: {
    width: 36, height: 36,
    alignItems: "center", justifyContent: "center",
  },

  searchRow: { paddingHorizontal: 16, paddingBottom: 16 },
  searchPill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 40, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 16, height: 50,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, fontWeight: "500" },

  stripe: { height: 2, marginHorizontal: 0, marginBottom: 4 },

  pillRow: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: C.primaryLight,
    borderWidth: 1.5, borderColor: C.primary,
  },
  pillTxt:  { fontSize: 12, fontWeight: "800", color: C.primary },
  clearPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, backgroundColor: C.primaryDark,
  },
  clearPillTxt: { fontSize: 12, fontWeight: "800", color: "#FFF" },

  resultsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  resultsCount: { fontSize: 13, color: C.muted, fontWeight: "700" },
  sortChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, backgroundColor: C.primaryLight,
    borderWidth: 1.5, borderColor: C.primary,
  },
  sortChipTxt: { fontSize: 12, fontWeight: "800", color: C.primary },

  center: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  emptyBody:  { fontSize: 13, color: C.muted, textAlign: "center" },
  emptyBtn: {
    marginTop: 4, paddingHorizontal: 26, paddingVertical: 13,
    borderRadius: 24, backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  emptyBtnTxt: { color: "#FFF", fontWeight: "900", fontSize: 15 },
});

export default ProductContainer;