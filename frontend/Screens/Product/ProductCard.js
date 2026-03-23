import React, { useRef } from "react";
import {
  Animated, Dimensions, Image, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { formatPHP } from "../../utils/currency";

const { width } = Dimensions.get("window");
const CARD_W    = width / 2 - 18;

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
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

const getUri = (item) =>
  item?.image || item?.images?.[0] || item?.coverImage || item?.thumbnail ||
  "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const fmt = (v) =>
  formatPHP ? formatPHP(v) : "\u20B1" + Number(v || 0).toLocaleString();

const ProductCard = ({ item, onAdd, onDetails }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.955, useNativeDriver: true, damping: 14 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1.0,   useNativeDriver: true, damping: 14 }).start();

  const author  = item?.author || item?.brand || "Unknown Author";
  const category = item?.genre?.name || item?.category?.name || "Book";
  const sold    = item?.purchasedCount || 0;

  return (
    <Animated.View style={[s.shadow, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={s.card}
        onPress={onDetails}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={1}
      >
        {/* ── COVER ── */}
        <View style={s.imgWrap}>
          <Image source={{ uri: getUri(item) }} style={s.img} resizeMode="cover" />

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(18,8,2,0.72)"]}
            style={s.imgGrad}
            pointerEvents="none"
          />

          {/* Price — bottom-left inside image */}
          <Text style={s.priceOverlay}>{fmt(item.price)}</Text>

          {/* Category pill — top-right */}
          <View style={s.categoryPill}>
            <Text style={s.categoryTxt} numberOfLines={1}>{category}</Text>
          </View>
        </View>

        {/* ── INFO ── */}
        <View style={s.info}>
          <Text style={s.title} numberOfLines={2}>{item.name}</Text>
          <Text style={s.author} numberOfLines={1}>{author}</Text>

          {/* ── BOTTOM ROW: stat + add button ── */}
          <View style={s.bottomRow}>
            <View style={s.soldRow}>
              <Ionicons name="bag-handle-outline" size={11} color={C.muted} />
              <Text style={s.soldTxt}>{sold} sold</Text>
            </View>

            <TouchableOpacity
              style={s.addBtn}
              onPress={() => onAdd(item)}
              activeOpacity={0.82}
            >
              <Ionicons name="add" size={14} color="#FFF" />
              <Text style={s.addBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Decorative corner accent */}
        <View style={s.cornerAccent} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  shadow: {
    width: CARD_W, marginBottom: 16,
    borderRadius: 20,
    shadowColor: "#C05010",
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 12,
    elevation: 6, backgroundColor: C.white,
  },
  card: {
    width: "100%", borderRadius: 20, overflow: "hidden",
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
  },

  // ── Cover ──
  imgWrap: { width: "100%", height: CARD_W * 1.22, backgroundColor: C.border },
  img:     { width: "100%", height: "100%" },
  imgGrad: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    height: "55%",
  },

  priceOverlay: {
    position: "absolute", bottom: 10, left: 10,
    color: C.gold, fontSize: 16, fontWeight: "900", fontFamily: F.serif,
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  categoryPill: {
    position: "absolute", top: 9, right: 9,
    maxWidth: "62%",
    alignItems: "center",
    backgroundColor: "rgba(18,8,2,0.52)",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  categoryTxt: { color: "#FFF", fontSize: 10, fontWeight: "700" },

  // ── Info ──
  info: { paddingHorizontal: 11, paddingTop: 10, paddingBottom: 11, gap: 3 },
  title: {
    fontSize: 13, fontWeight: "800", color: C.ink,
    lineHeight: 18, minHeight: 36,
  },
  author: { fontSize: 11, color: C.muted, fontWeight: "500" },

  bottomRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 10,
  },
  soldRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  soldTxt: { fontSize: 11, color: C.muted, fontWeight: "600" },

  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: C.primary,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.45, shadowRadius: 6, elevation: 4,
  },
  addBtnTxt: { color: "#FFF", fontSize: 12, fontWeight: "900" },

  // Orange corner cut
  cornerAccent: {
    position: "absolute", top: 0, left: 0,
    width: 28, height: 28,
    backgroundColor: C.primary,
    borderBottomRightRadius: 16,
    opacity: 0.9,
  },
});

export default ProductCard;