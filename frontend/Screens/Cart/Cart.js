import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import {
  clearCart,
  removeSelectedFromCart,
  updateCartLineQuantity,
} from "../../Redux/Actions/cartActions";
import AuthGlobal from "../../Context/Store/AuthGlobal";
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
  checked:      "#22C55E",
  checkedLight: "#DCFCE7",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

const fmt = (v) => formatPHP ? formatPHP(v) : "\u20B1" + Number(v || 0).toLocaleString();

// ─────────────────────────────────────────────────────────────────────────────
// FADE-UP ANIMATION
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
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
// CART ITEM CARD
// ─────────────────────────────────────────────────────────────────────────────
const CartItem = ({ item, isSelected, onToggle, onIncrease, onDecrease, index }) => {
  const scale    = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkAnim, {
      toValue: isSelected ? 1 : 0,
      useNativeDriver: true,
      damping: 14, stiffness: 200,
    }).start();
  }, [isSelected]);

  const onIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 14 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1.0,  useNativeDriver: true, damping: 14 }).start();

  const imageUri = item?.image || item?.images?.[0] || item?.coverImage ||
    "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

  const checkScale = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.0] });
  const quantity = Math.max(1, Number(item?.quantity) || 1);

  return (
    <FadeUp delay={index * 70}>
      <Animated.View style={[ci.shadow, { transform: [{ scale }] }]}>
        <Pressable
          style={[ci.card, isSelected && ci.cardSelected]}
          onPress={() => onToggle(item.cartLineId)}
          onPressIn={onIn}
          onPressOut={onOut}
        >
          {/* Selected accent bar */}
          {isSelected && <View style={ci.selectedBar} />}

          {/* Checkbox */}
          <Animated.View
            style={[
              ci.checkbox,
              isSelected && ci.checkboxOn,
              { transform: [{ scale: checkScale }] },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
          </Animated.View>

          {/* Book cover */}
          <View style={ci.coverWrap}>
            <Image source={{ uri: imageUri }} style={ci.cover} resizeMode="cover" />
            {isSelected && (
              <View style={ci.coverOverlay}>
                <Ionicons name="checkmark-circle" size={22} color={C.checked} />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={ci.info}>
            <Text style={ci.name} numberOfLines={2}>{item.name}</Text>
            <Text style={ci.author} numberOfLines={1}>{item.brand || item.author || ""}</Text>
            <View style={ci.priceRow}>
              <Text style={ci.price}>{fmt(item.price)}</Text>
            </View>
          </View>

          <View style={ci.rightActions}>
            <View style={ci.qtyWrap}>
              <TouchableOpacity style={ci.qtyBtn} onPress={() => onDecrease(item)} activeOpacity={0.8}>
                <Ionicons name="remove" size={14} color={C.primaryDark} />
              </TouchableOpacity>
              <Text style={ci.qtyText}>{quantity}</Text>
              <TouchableOpacity style={ci.qtyBtn} onPress={() => onIncrease(item)} activeOpacity={0.8}>
                <Ionicons name="add" size={14} color={C.primaryDark} />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </FadeUp>
  );
};

const ci = StyleSheet.create({
  shadow: {
    marginBottom: 12,
    borderRadius: 18,
    shadowColor: "#C05010",
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10,
    elevation: 4, backgroundColor: C.white,
  },
  card: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 18, overflow: "hidden",
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
    padding: 12, gap: 12,
  },
  cardSelected: {
    borderColor: C.primary, backgroundColor: "#FFFDF9",
  },
  selectedBar: {
    position: "absolute", top: 0, left: 0, bottom: 0,
    width: 4, backgroundColor: C.primary, borderTopLeftRadius: 18, borderBottomLeftRadius: 18,
  },

  checkbox: {
    width: 24, height: 24, borderRadius: 8,
    borderWidth: 2, borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },

  coverWrap: {
    width: 54, height: 70, borderRadius: 10, overflow: "hidden",
    backgroundColor: C.border, flexShrink: 0,
  },
  cover:        { width: "100%", height: "100%" },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,250,246,0.55)",
    alignItems: "center", justifyContent: "center",
  },

  info: { flex: 1, gap: 2 },
  name:   { fontSize: 13, fontWeight: "800", color: C.ink, lineHeight: 18 },
  author: { fontSize: 11, color: C.muted, fontWeight: "500" },
  priceRow: { marginTop: 4, flexDirection: "row", alignItems: "center" },
  price:  { fontSize: 15, fontWeight: "900", color: C.primary, fontFamily: F.serif, marginTop: 3 },
  rightActions: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { minWidth: 16, textAlign: "center", fontSize: 13, fontWeight: "800", color: C.ink },

});

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
const EmptyCart = () => (
  <FadeUp delay={0} style={em.wrap}>
    <LinearGradient colors={[C.primaryLight, C.bg]} style={em.circle}>
      <Ionicons name="cart-outline" size={48} color={C.primary} />
    </LinearGradient>
    <Text style={em.title}>Your cart is empty</Text>
    <Text style={em.body}>Add books to your cart to get started.</Text>
  </FadeUp>
);

const em = StyleSheet.create({
  wrap:   { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14 },
  circle: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title:  { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  body:   { fontSize: 14, color: C.muted, textAlign: "center", fontWeight: "500" },
});

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────
const Cart = ({ navigation }) => {
  const cartItems = useSelector((state) => state.cartItems);
  const dispatch  = useDispatch();
  const context   = useContext(AuthGlobal);
  const [selectedIds, setSelectedIds] = useState([]);

  const selectedSet   = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => cartItems.filter((item) => selectedSet.has(item.cartLineId)),
    [cartItems, selectedSet]
  );
  const totalCartUnits = cartItems.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
  const total      = selectedItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1),
    0
  );
  const selectedUnits = selectedItems.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
  const allSelected = cartItems.length > 0 && selectedIds.length === cartItems.length;

  useEffect(() => {
    const available = new Set(cartItems.map((i) => i.cartLineId).filter(Boolean));
    setSelectedIds((prev) => prev.filter((id) => available.has(id)));
  }, [cartItems]);

  useEffect(() => {
    if (context?.stateUser?.isAuthenticated) return;
    navigation.navigate("Profile", { screen: "Login" });
  }, [context?.stateUser?.isAuthenticated, navigation]);

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") {
      navigation.openDrawer();
      return;
    }
    navigation?.getParent?.()?.openDrawer?.();
  };

  const toggleSelected  = (id) => { if (!id) return; setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); };
    const increaseQty = (item) => {
      if (!item?.cartLineId) return;
      const currentQty = Math.max(1, Number(item.quantity) || 1);
      dispatch(updateCartLineQuantity({ cartLineId: item.cartLineId, quantity: currentQty + 1 }));
    };

    const decreaseQty = (item) => {
      if (!item?.cartLineId) return;
      const currentQty = Math.max(1, Number(item.quantity) || 1);
      const nextQty = Math.max(1, currentQty - 1);
      dispatch(updateCartLineQuantity({ cartLineId: item.cartLineId, quantity: nextQty }));
    };

  const selectAll       = () => setSelectedIds(cartItems.map((i) => i.cartLineId).filter(Boolean));
  const clearSelection  = () => setSelectedIds([]);
  const toggleSelectAll = () => allSelected ? clearSelection() : selectAll();

  const removeSelected = () => {
    if (!selectedIds.length) {
      Toast.show({ type: "info", text1: "No items selected", text2: "Select one or more items to remove", topOffset: 60 });
      return;
    }
    dispatch(removeSelectedFromCart(selectedIds));
    setSelectedIds([]);
    Toast.show({ type: "success", text1: "Selected items removed", topOffset: 60 });
  };

  const checkoutSelected = () => {
    if (!selectedItems.length) {
      Toast.show({ type: "info", text1: "No items selected", text2: "Select items to checkout", topOffset: 60 });
      return;
    }
    if (context?.stateUser?.isAuthenticated) {
      navigation.navigate("Checkout", { selectedItems });
      return;
    }
    navigation.navigate("Profile", { screen: "Login" });
  };

  return (
    <View style={s.screen}>
      <FlatList
        data={cartItems}
        keyExtractor={(item, i) => `${item.cartLineId || item.id || item._id || "row"}-${i}`}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
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
                  <Text style={s.pageTitle}>Your Cart</Text>
                  <Text style={s.pageSubtitle}>
                    {totalCartUnits > 0
                      ? `${totalCartUnits} ${totalCartUnits === 1 ? "item" : "items"}`
                      : "Nothing added yet"}
                  </Text>
                </View>
              </View>
              {cartItems.length > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeTxt}>{totalCartUnits}</Text>
                </View>
              )}
            </FadeUp>

            {/* ── SELECT ALL BAR ── */}
            {cartItems.length > 0 && (
              <FadeUp delay={60} style={s.selectBar}>
                <TouchableOpacity
                  style={[s.selectAllToggle, allSelected && s.selectAllToggleOn]}
                  onPress={toggleSelectAll}
                  activeOpacity={0.8}
                >
                  <View style={[s.selectAllCheck, allSelected && s.selectAllCheckOn]}>
                    {allSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  <Text style={[s.selectAllTxt, allSelected && s.selectAllTxtOn]}>
                    {allSelected ? "Deselect All" : "Select All"}
                  </Text>
                </TouchableOpacity>

                {selectedIds.length > 0 && (
                  <TouchableOpacity style={s.removeSelBtn} onPress={removeSelected} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={13} color={C.danger} />
                    <Text style={s.removeSelTxt}>Remove ({selectedIds.length})</Text>
                  </TouchableOpacity>
                )}
              </FadeUp>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <CartItem
            item={item}
            index={index}
            isSelected={selectedSet.has(item.cartLineId)}
            onToggle={toggleSelected}
            onIncrease={increaseQty}
            onDecrease={decreaseQty}
          />
        )}
        ListEmptyComponent={<EmptyCart />}
      />

      {/* ── STICKY BOTTOM BAR ── */}
      {cartItems.length > 0 && (
        <View style={s.stickyBar}>
          {/* Total + selection info */}
          <View style={s.totalBlock}>
            <Text style={s.totalLabel}>
              {selectedItems.length > 0 ? `${selectedUnits} selected` : "Select items"}
            </Text>
            <Text style={s.totalPrice}>{fmt(total)}</Text>
          </View>

          {/* Action group */}
          <View style={s.barActions}>
            {/* Clear cart */}
            <TouchableOpacity
              style={s.clearCartBtn}
              onPress={() => { dispatch(clearCart()); setSelectedIds([]); }}
              activeOpacity={0.85}
            >
              <Ionicons name="trash" size={15} color={C.danger} />
            </TouchableOpacity>

            {/* Checkout */}
            <TouchableOpacity
              style={[s.checkoutBtn, !selectedItems.length && s.checkoutBtnDisabled]}
              onPress={checkoutSelected}
              activeOpacity={0.86}
            >
              <Ionicons name="cart" size={16} color="#FFF" />
              <Text style={s.checkoutBtnTxt}>Checkout</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list:   { paddingHorizontal: 16, paddingBottom: 120 },

  // Header
  pageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 34, paddingBottom: 16,
  },
  titleRow:     { flexDirection: "row", alignItems: "center", gap: 12 },
  drawerBtn:    { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  titleBar:     { width: 4, height: 46, borderRadius: 2, backgroundColor: C.primary },
  pageTitle:    { fontSize: 28, fontWeight: "900", fontFamily: F.serif, color: C.ink, letterSpacing: 0.2 },
  pageSubtitle: { fontSize: 13, color: C.muted, fontWeight: "600", marginTop: 2 },
  countBadge:   {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.primaryLight, borderWidth: 2, borderColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  countBadgeTxt: { fontSize: 17, fontWeight: "900", color: C.primary, fontFamily: F.serif },

  // Select bar
  selectBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  selectAllToggle: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22,
  },
  selectAllToggleOn: { backgroundColor: C.primaryLight, borderColor: C.primary },
  selectAllCheck: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: C.border, backgroundColor: C.white,
    alignItems: "center", justifyContent: "center",
  },
  selectAllCheckOn:  { backgroundColor: C.primary, borderColor: C.primary },
  selectAllTxt:      { fontSize: 13, fontWeight: "700", color: C.muted },
  selectAllTxtOn:    { color: C.primary, fontWeight: "800" },

  removeSelBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.dangerLight, borderWidth: 1.5, borderColor: C.danger,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22,
  },
  removeSelTxt: { fontSize: 13, fontWeight: "800", color: C.danger },

  // Sticky bar
  stickyBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 12,
  },
  totalBlock: { gap: 2 },
  totalLabel: { fontSize: 11, color: C.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  totalPrice: { fontSize: 22, fontWeight: "900", fontFamily: F.serif, color: C.primary },

  barActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  clearCartBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.dangerLight,
    borderWidth: 1.5, borderColor: C.danger,
    alignItems: "center", justifyContent: "center",
  },
  checkoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: C.primary,
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.42, shadowRadius: 10, elevation: 7,
  },
  checkoutBtnDisabled: { backgroundColor: C.muted, shadowOpacity: 0 },
  checkoutBtnTxt: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 0.3 },
});

export default Cart;