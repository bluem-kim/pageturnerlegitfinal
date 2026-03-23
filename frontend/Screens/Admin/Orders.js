import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  ScrollView,
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

import {
  adminHandleCancelRequest,
  fetchAdminOrders,
  updateAdminOrderArchive,
  updateAdminOrderStatus,
} from "../../Redux/Actions/orderActions";
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
  blue:         "#3B82F6",
  blueLight:    "#DBEAFE",
  purple:       "#A855F7",
  purpleLight:  "#F3E8FF",
  yellow:       "#EAB308",
  yellowLight:  "#FEF9C3",
};

const F = {
  display: Platform.select({ ios: "Georgia",  android: "serif",      default: "serif" }),
  body:    Platform.select({ ios: "Avenir",   android: "sans-serif", default: "sans-serif" }),
  mono:    Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Status config ──
const STATUS = { "3": "Pending", "2": "Shipped", "1": "Delivered", "0": "Cancelled" };

const STATUS_CONFIG = {
  "3": { label: "Pending",   color: C.yellow,  bg: C.yellowLight, icon: "time-outline" },
  "2": { label: "Shipped",   color: C.blue,    bg: C.blueLight,   icon: "cube-outline" },
  "1": { label: "Delivered", color: C.green,   bg: C.greenLight,  icon: "checkmark-circle-outline" },
  "0": { label: "Cancelled", color: C.danger,  bg: C.dangerLight, icon: "close-circle-outline" },
};

const statusOptions = [
  { code: "3", label: "Pending",  color: C.yellow },
  { code: "2", label: "Shipped",  color: C.blue },
];

const statusTabs = [
  { key: "all",      label: "All" },
  { key: "3",        label: "Pending" },
  { key: "2",        label: "Shipped" },
  { key: "1",        label: "Delivered" },
  { key: "archived", label: "Archived" },
];

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
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
const StatusBadge = ({ statusCode }) => {
  const cfg = STATUS_CONFIG[statusCode] || STATUS_CONFIG["3"];
  return (
    <View style={[sb.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[sb.txt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};
const sb = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  txt:  { fontSize: 11, fontWeight: "800" },
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CARD
// ─────────────────────────────────────────────────────────────────────────────
const OrderCard = ({ item, onToggleSelect, selected, onUpdateStatus, onHandleCancel, index }) => {
  const scale = useRef(new Animated.Value(0.97)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 360, delay: index * 40, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay: index * 40, damping: 16, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const isArchived = Boolean(item?.isArchived);
  const orderId    = String(item?.id || item?._id || "").slice(-8).toUpperCase();
  const cfg        = STATUS_CONFIG[String(item?.status)] || STATUS_CONFIG["3"];
  const cancelReq  = item?.cancelRequest;

  return (
    <Animated.View style={[oc.wrap, { opacity: op, transform: [{ scale }] }, isArchived && oc.wrapArchived]}>
      {/* Left accent */}
      <View style={[oc.accent, { backgroundColor: isArchived ? C.border : cfg.color }]} />

      <View style={oc.body}>
        {/* Top row — ID + status + total */}
        <View style={oc.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={oc.orderId}>#{orderId}</Text>
            <Text style={oc.customer} numberOfLines={1}>
              <Ionicons name="person-outline" size={11} color={C.muted} /> {item.user?.name || "Unknown"}
            </Text>
            <Text style={oc.dateTxt}>
              <Ionicons name="calendar-outline" size={10} color={C.muted} /> {formatDateTime(item.dateOrdered || item.createdAt)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 5 }}>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TouchableOpacity style={[oc.selectBtn, selected && oc.selectBtnOn]} onPress={onToggleSelect} activeOpacity={0.8}>
                <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? C.primary : C.muted} />
              </TouchableOpacity>
              <StatusBadge statusCode={String(item?.status)} />
            </View>
            <Text style={oc.total}>{formatPHP(item.totalPrice || 0)}</Text>
          </View>
        </View>

        {/* Cancellation Request Section */}
        {cancelReq?.status === "pending" && (
          <View style={oc.cancelSection}>
            <View style={oc.cancelHeader}>
              <Ionicons name="alert-circle" size={14} color={C.danger} />
              <Text style={oc.cancelTitle}>Cancellation Requested</Text>
            </View>
            <Text style={oc.cancelReason}>Reason: {cancelReq.reason}</Text>
            <View style={oc.cancelActions}>
              <TouchableOpacity 
                style={[oc.cancelBtn, { backgroundColor: C.greenLight, borderColor: C.green }]} 
                onPress={() => onHandleCancel("approve")}
              >
                <Text style={[oc.cancelBtnTxt, { color: C.green }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[oc.cancelBtn, { backgroundColor: C.dangerLight, borderColor: C.danger }]} 
                onPress={() => onHandleCancel("disapprove")}
              >
                <Text style={[oc.cancelBtnTxt, { color: C.danger }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Location */}
        <View style={oc.locationRow}>
          <Ionicons name="location-outline" size={13} color={C.muted} />
          <Text style={oc.locationTxt} numberOfLines={1}>
            {[item.city, item.country, item.zip].filter(Boolean).join(", ") || "—"}
          </Text>
          {isArchived && (
            <View style={oc.archivedBadge}>
              <Text style={oc.archivedBadgeTxt}>Archived</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={oc.actionsRow}>
          {/* Status buttons */}
          {!isArchived && statusOptions.map((opt) => (
            <TouchableOpacity
              key={opt.code}
              style={[oc.statusBtn, { borderColor: opt.color + "55", backgroundColor: opt.color + "12" }]}
              onPress={() => onUpdateStatus(opt.code)}
              activeOpacity={0.8}
            >
              <Text style={[oc.statusBtnTxt, { color: opt.color }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const oc = StyleSheet.create({
  wrap:           { flexDirection: "row", backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: "hidden", shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  wrapArchived:   { opacity: 0.7, backgroundColor: C.surface },
  accent:         { width: 4, flexShrink: 0 },
  body:           { flex: 1, padding: 14, gap: 10 },
  topRow:         { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  orderId:        { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.display, letterSpacing: 0.5 },
  customer:       { fontSize: 12.5, color: C.muted, fontWeight: "600", marginTop: 3 },
  dateTxt:        { fontSize: 10, color: C.muted, fontWeight: "500", marginTop: 2, flexDirection: "row", alignItems: "center" },
  total:          { fontSize: 14, fontWeight: "900", color: C.primary, fontFamily: F.display },
  selectBtn:      { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  selectBtnOn:    { backgroundColor: C.primaryLight, borderColor: C.primary },
  
  cancelSection:  { backgroundColor: C.dangerLight + "40", borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1, borderColor: C.danger + "20" },
  cancelHeader:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  cancelTitle:    { fontSize: 12, fontWeight: "800", color: C.danger, textTransform: "uppercase" },
  cancelReason:   { fontSize: 12, color: C.inkMid, fontWeight: "500", marginBottom: 10, fontStyle: "italic" },
  cancelActions:  { flexDirection: "row", gap: 8 },
  cancelBtn:      { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  cancelBtnTxt:   { fontSize: 11, fontWeight: "800" },

  locationRow:    { flexDirection: "row", alignItems: "center", gap: 5 },
  locationTxt:    { flex: 1, fontSize: 12, color: C.muted, fontWeight: "600" },
  archivedBadge:  { backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: C.border },
  archivedBadgeTxt:{ fontSize: 10, color: C.muted, fontWeight: "700" },
  actionsRow:     { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  statusBtn:      { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11, borderWidth: 1.5 },
  statusBtnTxt:   { fontSize: 11.5, fontWeight: "800" },
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Orders = ({ navigation }) => {
  const dispatch = useDispatch();
  const { adminOrders: orders, loadingAdmin: loading, errorAdmin } = useSelector((state) => state.orders);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [activeTab,     setActiveTab]     = useState("all");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState([]);

  // Animated search border
  const searchAnim = useRef(new Animated.Value(0)).current;
  const onSearchFocus = () => { setSearchFocused(true);  Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(); };
  const onSearchBlur  = () => { setSearchFocused(false); Animated.timing(searchAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(); };
  const searchBorder  = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });
  const searchBg      = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.white] });

  // ── Backend (unchanged) ──
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        try { await dispatch(fetchAdminOrders({ includeArchived: true })); }
        catch (error) { Toast.show({ type: "error", text1: "Failed to load orders", text2: error?.response?.data?.message || "Please try again", topOffset: 60 }); }
        finally { if (mounted) {} }
      };
      load();
      return () => { mounted = false; };
    }, [dispatch])
  );

  useEffect(() => {
    if (!errorAdmin) return;
    Toast.show({ type: "error", text1: "Failed to load orders", text2: errorAdmin, topOffset: 60 });
  }, [errorAdmin]);

  const updateStatus = async (orderId, status) => {
    try {
      await dispatch(updateAdminOrderStatus(orderId, status));
      Toast.show({ type: "success", text1: `Order marked ${STATUS[status]}`, topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Status update failed", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  const handleCancelRequest = async (orderId, action) => {
    try {
      await dispatch(adminHandleCancelRequest(orderId, action));
      Toast.show({ 
        type: "success", 
        text1: `Cancellation ${action}d`, 
        text2: action === "approve" ? "Order is now cancelled" : "Request has been declined",
        topOffset: 60 
      });
    } catch (error) {
      Toast.show({ type: "error", text1: "Update failed", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  const bulkArchiveSelected = async (isArchived) => {
    const targets = filteredOrders.filter((item) => selectedIds.includes(String(item.id || item._id)) && Boolean(item?.isArchived) !== Boolean(isArchived));
    if (!targets.length) { Toast.show({ type: "info", text1: "Select orders first", topOffset: 60 }); return; }
    try {
      await Promise.all(targets.map((order) => dispatch(updateAdminOrderArchive(order.id || order._id, isArchived)).catch(() => null)));
      Toast.show({ type: "success", text1: isArchived ? "Selected orders archived" : "Selected orders restored", text2: `${targets.length} orders processed`, topOffset: 60 });
      setSelectedIds([]);
    } catch (error) {
      Toast.show({ type: "error", text1: "Bulk update failed", text2: error?.message || "Please try again", topOffset: 60 });
    }
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return (orders || []).filter((item) => {
        const isArchived = Boolean(item?.isArchived);
        return activeTab === "all" ? !isArchived : activeTab === "archived" ? isArchived : !isArchived && String(item?.status) === activeTab;
      });
    }

    const matches = (orders || []).filter((item) => {
      const isArchived = Boolean(item?.isArchived);
      const matchesStatus = activeTab === "all" ? !isArchived : activeTab === "archived" ? isArchived : !isArchived && String(item?.status) === activeTab;
      if (!matchesStatus) return false;

      return (
        String(item?.id || item?._id || "").toLowerCase().includes(q) ||
        String(item?.user?.name || "").toLowerCase().includes(q) ||
        String(item?.city || "").toLowerCase().includes(q) ||
        String(item?.country || "").toLowerCase().includes(q) ||
        String(STATUS[item?.status] || "Pending").toLowerCase().includes(q)
      );
    });

    // Sort: items that START with the search query appear at the top
    return matches.sort((a, b) => {
      const aId = String(a?.id || a?._id || "").toLowerCase();
      const bId = String(b?.id || b?._id || "").toLowerCase();
      const aName = String(a?.user?.name || "").toLowerCase();
      const bName = String(b?.user?.name || "").toLowerCase();

      const aStarts = aId.startsWith(q) || aName.startsWith(q);
      const bStarts = bId.startsWith(q) || bName.startsWith(q);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [orders, activeTab, searchQuery]);

  const visibleIds = useMemo(() => filteredOrders.map((item) => String(item.id || item._id)), [filteredOrders]);
  const selectedVisibleCount = useMemo(() => selectedIds.filter((id) => visibleIds.includes(id)).length, [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  const exportOrderListPdf = async () => {
    try {
      const rows = (orders || []).map((item, index) => [
        index + 1, item?.id || item?._id || "N/A", item?.user?.name || "N/A",
        STATUS[item?.status] || "Pending", item?.isArchived ? "Archived" : "Active", formatPHP(item?.totalPrice || 0),
      ]);
      const html = buildListPdfHtml({ title: "PageTurner Order Records", summaryLines: [{ label: "Total records:", value: String(rows.length) }], headers: ["#", "Order ID", "Customer", "Status", "State", "Total"], rows });
      const result = await exportPdfFromHtml(html, { fileName: "PageTurnerOrderRecords", dialogTitle: "Export order records" });
      Toast.show({ type: "success", text1: "Order records exported", text2: result.shared ? "PDF ready to share" : result.uri, topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Export failed", text2: error?.message || "Please try again", topOffset: 60 });
    }
  };

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  const tabCount = (key) => {
    if (key === "all")      return (orders || []).filter((i) => !i?.isArchived).length;
    if (key === "archived") return (orders || []).filter((i) =>  i?.isArchived).length;
    return (orders || []).filter((i) => !i?.isArchived && String(i?.status) === key).length;
  };

  if (loading) {
    return (
      <View style={s.loadScreen}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadTxt}>Loading orders…</Text>
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
        style={s.hero}
      >
        <FloatingOrb size={160} color="rgba(255,255,255,0.07)" style={{ top: -50, right: -40 }} delay={0} />
        <FloatingOrb size={80}  color="rgba(255,255,255,0.09)" style={{ bottom: 0, left: -25 }}  delay={900} />

        <FadeUp delay={0}>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.menuBtn} onPress={openDrawer} activeOpacity={0.8}>
              <Ionicons name="menu" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>PageTurner</Text>
              <Text style={s.heroTitle}>Order Management</Text>
            </View>
            <TouchableOpacity style={s.exportBtn} onPress={exportOrderListPdf} activeOpacity={0.85}>
              <Ionicons name="document-text-outline" size={14} color={C.primary} />
              <Text style={s.exportBtnTxt}>Export</Text>
            </TouchableOpacity>
          </View>
          <View style={s.heroPill}>
            <Ionicons name="receipt-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={s.heroPillTxt}>{(orders || []).length} total orders</Text>
          </View>
        </FadeUp>
      </LinearGradient>

      {/* ══ CONTROLS ══ */}
      <View style={s.controls}>

        {/* Search */}
        <FadeUp delay={60}>
          <Animated.View style={[s.searchWrap, { borderColor: searchBorder, backgroundColor: searchBg }]}>
            <Ionicons name="search-outline" size={16} color={searchFocused ? C.primary : C.muted} />
            <TextInput
              style={s.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by ID, customer, city…"
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
        </FadeUp>

        {/* Status tabs */}
        <FadeUp delay={100}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsScroll}>
            {statusTabs.map((tab) => {
              const active = activeTab === tab.key;
              const count  = tabCount(tab.key);
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tabChip, active && s.tabChipActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
                  <View style={[s.tabBadge, active && s.tabBadgeActive]}>
                    <Text style={[s.tabBadgeTxt, active && s.tabBadgeTxtActive]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </FadeUp>

        {/* Selection actions */}
        <FadeUp delay={115} style={s.selectRow}>
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

        {/* Bulk actions */}
        {selectedVisibleCount > 0 && (
          <FadeUp delay={130} style={s.bulkRow}>
            {activeTab === "archived" ? (
              <TouchableOpacity style={s.bulkBtnRestore} onPress={() => bulkArchiveSelected(false)} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={13} color={C.green} />
                <Text style={s.bulkBtnRestoreTxt}>Restore Selected</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.bulkBtnArchive} onPress={() => bulkArchiveSelected(true)} activeOpacity={0.8}>
                <Ionicons name="archive-outline" size={13} color={C.danger} />
                <Text style={s.bulkBtnArchiveTxt}>Archive Selected</Text>
              </TouchableOpacity>
            )}
          </FadeUp>
        )}
      </View>

      {/* ══ LIST ══ */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="receipt-outline" size={30} color={C.border} />
            </View>
            <Text style={s.emptyTitle}>No orders found</Text>
            <Text style={s.emptySubtitle}>
              {searchQuery ? "Try a different search term" : "No orders in this category yet"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <OrderCard
            item={item}
            index={index}
            selected={selectedIds.includes(String(item.id || item._id))}
            onToggleSelect={() => {
              const id = String(item.id || item._id);
              setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
            }}
            onUpdateStatus={(code) => updateStatus(item.id || item._id, code)}
            onHandleCancel={(action) => handleCancelRequest(item.id || item._id, action)}
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

  // Hero
  hero: {
    paddingTop:        Platform.OS === "ios" ? 62 : 46,
    paddingBottom:     22,
    paddingHorizontal: 20,
    overflow:          "hidden",
  },
  heroNav:     { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  menuBtn:     { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  heroEyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.60)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  heroTitle:   { fontSize: 20, fontWeight: "900", fontFamily: F.display, color: "#FFF", letterSpacing: 0.1 },
  heroPill:    { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  heroPillTxt: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.88)" },
  exportBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
  exportBtnTxt:{ fontSize: 12, fontWeight: "800", color: C.primary },

  // Controls
  controls:     { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  searchWrap:   { flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 12, marginBottom: 12 },
  searchInput:  { flex: 1, fontSize: 14, color: C.ink, fontFamily: F.body, fontWeight: "500" },

  // Tabs
  tabsScroll:   { paddingBottom: 12, gap: 8 },
  tabChip:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  tabChipActive:{ backgroundColor: C.primaryLight, borderColor: C.primary },
  tabLabel:     { fontSize: 12.5, fontWeight: "700", color: C.muted },
  tabLabelActive:{ color: C.primary, fontWeight: "900" },
  tabBadge:     { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  tabBadgeActive:{ backgroundColor: C.primary + "30" },
  tabBadgeTxt:  { fontSize: 10.5, fontWeight: "800", color: C.muted },
  tabBadgeTxtActive:{ color: C.primary },

  // Bulk
  bulkRow:           { flexDirection: "row", gap: 10, marginBottom: 4 },
  bulkBtnArchive:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.dangerLight, borderWidth: 1.5, borderColor: C.danger, borderRadius: 14, paddingVertical: 11 },
  bulkBtnArchiveTxt: { fontSize: 12, fontWeight: "800", color: C.danger },
  bulkBtnRestore:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.greenLight, borderWidth: 1.5, borderColor: C.green, borderRadius: 14, paddingVertical: 11 },
  bulkBtnRestoreTxt: { fontSize: 12, fontWeight: "800", color: C.green },

  // Selection
  selectRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectToggleBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  selectToggleTxt:   { fontSize: 12, fontWeight: "800", color: C.primary },
  selectedCountTxt:  { fontSize: 12, fontWeight: "700", color: C.muted },

  // List
  listContent:  { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 48 },

  // Empty
  emptyWrap:    { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  emptyTitle:   { fontSize: 16, fontWeight: "900", color: C.inkMid, fontFamily: F.display },
  emptySubtitle:{ fontSize: 13, color: C.muted, fontWeight: "600", textAlign: "center" },
});

export default Orders;