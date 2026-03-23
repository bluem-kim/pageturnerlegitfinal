import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";

import { archiveProduct, fetchProducts } from "../../Redux/Actions/productActions";
import { formatPHP } from "../../utils/currency";
import { buildListPdfHtml, exportPdfFromHtml } from "../../utils/pdfExport";

const { width: SW } = Dimensions.get("window");

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
  danger:       "#EF4444",
  dangerLight:  "#FEE2E2",
  green:        "#22C55E",
  greenLight:   "#DCFCE7",
  overlay:      "rgba(244,130,31,0.08)",
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
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY: ty }] }, style]} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// FADE-UP
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 460, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 18, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESSABLE SCALE
// ─────────────────────────────────────────────────────────────────────────────
const PressableScale = ({ children, onPress, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  return (
    <TouchableOpacity onPressIn={onIn} onPressOut={onOut} onPress={onPress} activeOpacity={1} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CARD
// ─────────────────────────────────────────────────────────────────────────────
const ProductCard = ({ item, onEdit, onToggleSelect, selected, index }) => {
  const scale = useRef(new Animated.Value(0.97)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 360, delay: index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay: index * 50, damping: 16, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const isArchived = Boolean(item?.isArchived);
  const stock      = item?.countInStock ?? 0;
  const lowStock   = stock > 0 && stock <= 5;
  const outOfStock = stock === 0;

  const stockColor = outOfStock ? C.danger : lowStock ? C.amber : C.green;
  const stockBg    = outOfStock ? C.dangerLight : lowStock ? "#FEF9E7" : C.greenLight;
  const imageUri   = item?.image || (Array.isArray(item?.images) ? item.images[0] : null);

  return (
    <Animated.View style={[pc.wrap, { opacity: op, transform: [{ scale }] }, isArchived && pc.wrapArchived]}>
      <View style={pc.content}>
        {/* Title row */}
        <View style={pc.titleRow}>
          <View style={pc.titleMain}>
            <View style={pc.coverWrap}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={pc.coverImage} resizeMode="cover" />
              ) : (
                <View style={pc.coverFallback}>
                  <Ionicons name="book-outline" size={18} color={C.muted} />
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[pc.title, isArchived && pc.titleMuted]} numberOfLines={1}>{item.name}</Text>
              <Text style={pc.author} numberOfLines={1}>
                {item.author || item.brand || "Unknown Author"}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[pc.selectBtn, selected && pc.selectBtnOn]} onPress={onToggleSelect} activeOpacity={0.8}>
            <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? C.primary : C.muted} />
          </TouchableOpacity>
        </View>

        {isArchived && (
          <View style={pc.archivedBadge}>
            <Ionicons name="archive-outline" size={10} color={C.muted} />
            <Text style={pc.archivedBadgeTxt}>Archived</Text>
          </View>
        )}

        {/* Meta chips */}
        <View style={pc.chipRow}>
          <View style={pc.priceChip}>
            <Text style={pc.priceChipTxt}>{formatPHP(item.price || 0)}</Text>
          </View>
          <View style={[pc.stockChip, { backgroundColor: stockBg }]}>
            <View style={[pc.stockDot, { backgroundColor: stockColor }]} />
            <Text style={[pc.stockChipTxt, { color: stockColor }]}>
              {outOfStock ? "Out of stock" : `${stock} in stock`}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={pc.actionRow}>
          <PressableScale onPress={onEdit} style={pc.editBtn}>
            <Ionicons name="pencil-outline" size={13} color={C.primary} />
            <Text style={pc.editBtnTxt}>Edit</Text>
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
};

const pc = StyleSheet.create({
  wrap:           { flexDirection: "row", backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: "hidden", shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  wrapArchived:   { opacity: 0.72, backgroundColor: C.surface },
  content:        { flex: 1, padding: 14, gap: 10 },
  titleRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  titleMain:      { flex: 1, flexDirection: "row", gap: 10 },
  coverWrap:      { width: 54, height: 72, borderRadius: 10, overflow: "hidden", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  coverImage:     { width: "100%", height: "100%" },
  coverFallback:  { flex: 1, alignItems: "center", justifyContent: "center" },
  selectBtn:      { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  selectBtnOn:    { backgroundColor: C.primaryLight, borderColor: C.primary },
  title:          { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.display, letterSpacing: 0.1 },
  titleMuted:     { color: C.muted },
  author:         { fontSize: 12, color: C.muted, fontWeight: "600", marginTop: 2 },
  archivedBadge:  { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  archivedBadgeTxt:{ fontSize: 10, color: C.muted, fontWeight: "700" },

  chipRow:    { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  priceChip:  { backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  priceChipTxt:{ fontSize: 13, fontWeight: "900", color: C.primary, fontFamily: F.display },
  stockChip:  { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  stockDot:   { width: 7, height: 7, borderRadius: 4 },
  stockChipTxt:{ fontSize: 12, fontWeight: "700" },

  actionRow:   { flexDirection: "row", gap: 10, marginTop: 2 },
  editBtn:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.primary, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10, minHeight: 42 },
  editBtnTxt:  { fontSize: 13, fontWeight: "800", color: C.primary },
  archiveBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.dangerLight, borderWidth: 1.5, borderColor: C.danger, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10, minHeight: 42 },
  restoreBtn:  { backgroundColor: C.greenLight, borderColor: C.green },
  archiveBtnTxt:{ fontSize: 13, fontWeight: "800", color: C.danger },
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Products = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items: products, loading, error } = useSelector((state) => state.products);
  const [refreshing,   setRefreshing]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [activeTab,    setActiveTab]    = useState("active");
  const [searchFocused,setSearchFocused]= useState(false);
  const [selectedIds,  setSelectedIds]  = useState([]);

  // Search bar animated border
  const searchAnim = useRef(new Animated.Value(0)).current;
  const onSearchFocus = () => {
    setSearchFocused(true);
    Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onSearchBlur  = () => {
    setSearchFocused(false);
    Animated.timing(searchAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };
  const searchBorder = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });
  const searchBg     = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.white] });

  // ── Backend (unchanged) ──
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          await dispatch(fetchProducts({ includeArchived: true }));
        } catch (error) {
          Toast.show({ type: "error", text1: "Failed to load products", text2: "Check server connection", topOffset: 60 });
        }
      };
      load();
      return undefined;
    }, [dispatch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try { await dispatch(fetchProducts({ includeArchived: true })); }
    finally { setRefreshing(false); }
  };

  const toggleArchive = async (item) => {
    try {
      const nextArchived = !Boolean(item?.isArchived);
      await dispatch(archiveProduct(item.id || item._id, nextArchived));
      Toast.show({ type: "success", text1: nextArchived ? "Product archived" : "Product restored", topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Archive update failed", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  const bulkArchiveProducts = async (isArchived) => {
    const targets = filteredProducts.filter((item) => Boolean(item?.isArchived) !== Boolean(isArchived));
    if (!targets.length) { Toast.show({ type: "info", text1: "No matching products", topOffset: 60 }); return; }
    try {
      await Promise.all(targets.map((item) => dispatch(archiveProduct(item.id || item._id, isArchived)).catch(() => null)));
      Toast.show({ type: "success", text1: isArchived ? "Bulk archive done" : "Bulk restore done", text2: `${targets.length} products processed`, topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Bulk update failed", text2: error?.message || "Please try again", topOffset: 60 });
    }
  };

  const bulkArchiveSelected = async (isArchived) => {
    const selected = filteredProducts.filter(
      (item) => selectedIds.includes(String(item.id || item._id)) && Boolean(item?.isArchived) !== Boolean(isArchived)
    );

    if (!selected.length) {
      Toast.show({
        type: "info",
        text1: "Select products first",
        topOffset: 60,
      });
      return;
    }

    try {
      await Promise.all(
        selected.map((item) => dispatch(archiveProduct(item.id || item._id, isArchived)).catch(() => null))
      );
      Toast.show({
        type: "success",
        text1: isArchived ? "Selected products archived" : "Selected products restored",
        text2: `${selected.length} products processed`,
        topOffset: 60,
      });
      setSelectedIds([]);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Bulk selected update failed",
        text2: error?.message || "Please try again",
        topOffset: 60,
      });
    }
  };

  useEffect(() => {
    if (!error) return;
    Toast.show({ type: "error", text1: "Failed to load products", text2: error, topOffset: 60 });
  }, [error]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return (products || []).filter((item) => {
        const archived = Boolean(item?.isArchived);
        return activeTab === "archived" ? archived : !archived;
      });
    }

    const matches = (products || []).filter((item) => {
      const archived = Boolean(item?.isArchived);
      const matchesTab = activeTab === "archived" ? archived : !archived;
      if (!matchesTab) return false;

      return (
        String(item?.name || "").toLowerCase().includes(q) ||
        String(item?.author || item?.brand || "").toLowerCase().includes(q) ||
        String(item?.description || "").toLowerCase().includes(q)
      );
    });

    // Sort: items that START with the search query appear at the top
    return matches.sort((a, b) => {
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
  }, [products, activeTab, searchQuery]);

  const visibleIds = useMemo(() => filteredProducts.map((item) => String(item.id || item._id)), [filteredProducts]);
  const selectedVisibleCount = useMemo(() => selectedIds.filter((id) => visibleIds.includes(id)).length, [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  const exportProductListPdf = async () => {
    try {
      const rows = (products || []).map((item, index) => [
        index + 1, item?.name || "N/A", item?.author || item?.brand || "N/A",
        formatPHP(item?.price || 0), item?.countInStock ?? 0, item?.isArchived ? "Archived" : "Active",
      ]);
      const html = buildListPdfHtml({ title: "PageTurner Product Records", summaryLines: [{ label: "Total records:", value: String(rows.length) }], headers: ["#", "Product", "Author", "Price", "Stock", "State"], rows });
      const result = await exportPdfFromHtml(html, { fileName: "PageTurnerProductRecords", dialogTitle: "Export product records" });
      Toast.show({ type: "success", text1: "Product records exported", text2: result.shared ? "PDF ready to share" : result.uri, topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Export failed", text2: error?.message || "Please try again", topOffset: 60 });
    }
  };

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  const activeCount   = (products || []).filter((i) => !i?.isArchived).length;
  const archivedCount = (products || []).filter((i) =>  i?.isArchived).length;

  if (loading && !refreshing) {
    return (
      <View style={s.loadScreen}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadTxt}>Loading products…</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>

      {/* ══ HERO HEADER ══ */}
      <LinearGradient
        colors={[C.primaryDeep, C.primaryDark, C.primary, C.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.1 }}
        style={s.header}
      >
        <FloatingOrb size={160} color="rgba(255,255,255,0.07)" style={{ top: -50, right: -40 }} delay={0} />
        <FloatingOrb size={80}  color="rgba(255,255,255,0.09)" style={{ bottom: 0, left: -20 }}  delay={800} />

        <FadeUp delay={0}>
          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <TouchableOpacity style={s.menuBtn} onPress={openDrawer} activeOpacity={0.8}>
                <Ionicons name="menu" size={22} color="#FFF" />
              </TouchableOpacity>
              <View>
                <Text style={s.brandEyebrow}>PageTurner</Text>
                <Text style={s.headerTitle}>Products</Text>
              </View>
            </View>
            <PressableScale onPress={exportProductListPdf} style={s.exportBtn}>
              <Ionicons name="document-text-outline" size={14} color={C.primary} />
              <Text style={s.exportBtnTxt}>Export</Text>
            </PressableScale>
          </View>

          {/* Stats pill */}
          <View style={s.headerPill}>
            <Ionicons name="book-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={s.headerPillTxt}>{(products || []).length} total products</Text>
          </View>
        </FadeUp>
      </LinearGradient>

      {/* ══ BODY ══ */}
      <View style={s.body}>

        {/* ── SEARCH + ADD ROW ── */}
        <FadeUp delay={60} style={s.topRow}>
          <Animated.View style={[s.searchWrap, { borderColor: searchBorder, backgroundColor: searchBg }]}>
            <Ionicons name="search-outline" size={16} color={searchFocused ? C.primary : C.muted} style={{ marginLeft: 4 }} />
            <TextInput
              style={s.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products…"
              placeholderTextColor={C.muted}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              autoCapitalize="none"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.muted} />
              </TouchableOpacity>
            )}
          </Animated.View>

          <PressableScale
            onPress={() => navigation.navigate("Product Form")}
            style={s.addBtn}
          >
            <LinearGradient colors={[C.primaryGlow, C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.addBtnGradient}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={s.addBtnTxt}>Add</Text>
            </LinearGradient>
          </PressableScale>
        </FadeUp>

        {/* ── TABS ── */}
        <FadeUp delay={100} style={s.tabRow}>
          <TouchableOpacity
            style={[s.tab, activeTab === "active" && s.tabActive]}
            onPress={() => setActiveTab("active")}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, activeTab === "active" && s.tabTxtActive]}>Active</Text>
            <View style={[s.tabBadge, activeTab === "active" && s.tabBadgeActive]}>
              <Text style={[s.tabBadgeTxt, activeTab === "active" && s.tabBadgeTxtActive]}>{activeCount}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === "archived" && s.tabActive]}
            onPress={() => setActiveTab("archived")}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, activeTab === "archived" && s.tabTxtActive]}>Archived</Text>
            <View style={[s.tabBadge, activeTab === "archived" && s.tabBadgeActive]}>
              <Text style={[s.tabBadgeTxt, activeTab === "archived" && s.tabBadgeTxtActive]}>{archivedCount}</Text>
            </View>
          </TouchableOpacity>
        </FadeUp>

        {/* ── SELECTION ACTIONS ── */}
        <FadeUp delay={140} style={s.selectRow}>
          <TouchableOpacity
            style={s.selectToggleBtn}
            onPress={() => setSelectedIds(allVisibleSelected ? [] : visibleIds)}
            activeOpacity={0.78}
          >
            <Ionicons name={allVisibleSelected ? "checkbox" : "square-outline"} size={15} color={C.primary} />
            <Text style={s.selectToggleTxt}>{allVisibleSelected ? "Clear All" : "Select All"}</Text>
          </TouchableOpacity>

          <Text style={s.selectedCountTxt}>{selectedVisibleCount} selected</Text>
        </FadeUp>

        {selectedVisibleCount > 0 && (
          <FadeUp delay={170} style={s.bulkRow}>
            {activeTab === "active" ? (
              <TouchableOpacity
                style={s.bulkBtnArchive}
                onPress={() => bulkArchiveSelected(true)}
                activeOpacity={0.78}
              >
                <Ionicons name="archive-outline" size={14} color={C.danger} />
                <Text style={s.bulkBtnArchiveTxt}>Archive Selected</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.bulkBtnRestore}
                onPress={() => bulkArchiveSelected(false)}
                activeOpacity={0.78}
              >
                <Ionicons name="refresh-outline" size={14} color={C.green} />
                <Text style={s.bulkBtnRestoreTxt}>Restore Selected</Text>
              </TouchableOpacity>
            )}
          </FadeUp>
        )}
      </View>

      {/* ══ LIST ══ */}
      <FlatList
        data={filteredProducts}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
        }
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="book-outline" size={32} color={C.border} />
            </View>
            <Text style={s.emptyTitle}>No products found</Text>
            <Text style={s.emptySubtitle}>
              {searchQuery ? "Try a different search term" : "Add your first product to get started"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <ProductCard
            item={item}
            index={index}
            onEdit={() => navigation.navigate("Product Form", { item })}
            onToggleArchive={() => toggleArchive(item)}
            selected={selectedIds.includes(String(item.id || item._id))}
            onToggleSelect={() => {
              const id = String(item.id || item._id);
              setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
            }}
          />
        )}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: C.bg },

  // Loading
  loadScreen:{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 12 },
  loadTxt:   { fontSize: 14, color: C.muted, fontWeight: "600" },

  // Hero header
  header: {
    paddingTop:        Platform.OS === "ios" ? 62 : 46,
    paddingBottom:     24,
    paddingHorizontal: 20,
    overflow:          "hidden",
  },
  headerTop:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerLeft:   { flexDirection: "row", alignItems: "center", gap: 12 },
  menuBtn:      { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  brandEyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.60)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 },
  headerTitle:  { fontSize: 22, fontWeight: "900", fontFamily: F.display, color: "#FFF", letterSpacing: 0.1 },
  headerPill:   { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  headerPillTxt:{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.88)" },
  exportBtn:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
  exportBtnTxt: { fontSize: 12, fontWeight: "800", color: C.primary },

  // Body controls
  body:      { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 4 },

  topRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  searchWrap:{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 12 },
  searchInput:{ flex: 1, fontSize: 14, color: C.ink, fontFamily: F.body, fontWeight: "500" },
  addBtn:    { borderRadius: 16, overflow: "hidden", shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.36, shadowRadius: 8, elevation: 6 },
  addBtnGradient:{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 13 },
  addBtnTxt: { fontSize: 14, fontWeight: "900", color: "#FFF" },

  // Tabs
  tabRow:    { flexDirection: "row", backgroundColor: C.surface, borderRadius: 16, padding: 4, gap: 4, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  tab:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, borderRadius: 13 },
  tabActive: { backgroundColor: C.white, shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  tabTxt:    { fontSize: 13, fontWeight: "700", color: C.muted },
  tabTxtActive:{ color: C.ink, fontWeight: "900" },
  tabBadge:  { backgroundColor: C.border, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeActive:{ backgroundColor: C.primaryLight },
  tabBadgeTxt:{ fontSize: 11, fontWeight: "800", color: C.muted },
  tabBadgeTxtActive:{ color: C.primary },

  // Bulk
  bulkRow:           { flexDirection: "row", gap: 10, marginBottom: 4 },
  bulkBtnArchive:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.dangerLight, borderWidth: 1.5, borderColor: C.danger, borderRadius: 14, paddingVertical: 11 },
  bulkBtnArchiveTxt: { fontSize: 12, fontWeight: "800", color: C.danger },
  bulkBtnRestore:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.greenLight, borderWidth: 1.5, borderColor: C.green, borderRadius: 14, paddingVertical: 11 },
  bulkBtnRestoreTxt: { fontSize: 12, fontWeight: "800", color: C.green },
  bulkBtnDisabled:   { backgroundColor: C.surface, borderColor: C.border },
  bulkBtnTxtDisabled:{ color: C.muted },

  // Selection
  selectRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectToggleBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  selectToggleTxt:   { fontSize: 12, fontWeight: "800", color: C.primary },
  selectedCountTxt:  { fontSize: 12, fontWeight: "700", color: C.muted },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 48 },

  // Empty
  emptyWrap:    { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  emptyTitle:   { fontSize: 16, fontWeight: "900", color: C.inkMid, fontFamily: F.display },
  emptySubtitle:{ fontSize: 13, color: C.muted, fontWeight: "600", textAlign: "center" },
});

export default Products;