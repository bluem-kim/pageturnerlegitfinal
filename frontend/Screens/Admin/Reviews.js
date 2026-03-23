import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
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

import { fetchAdminReviews, replyToReview } from "../../Redux/Actions/reviewActions";
import { exportReviewsPDF } from "../../utils/pdfExport";

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
  yellow:       "#EAB308",
  yellowLight:  "#FEF9C3",
};

const F = {
  display: Platform.select({ ios: "Georgia",  android: "serif",      default: "serif" }),
  body:    Platform.select({ ios: "Avenir",   android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString("en-PH");
};

const StarRow = ({ rating }) => {
  const stars = Math.round(Number(rating) || 0);
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= stars ? "star" : "star-outline"}
          size={13}
          color={i <= stars ? C.amber : C.border}
        />
      ))}
    </View>
  );
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
// REVIEW CARD
// ─────────────────────────────────────────────────────────────────────────────
const ReviewCard = ({ item, onToggleSelect, selected, index, onReply }) => {
  const scale = useRef(new Animated.Value(0.97)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 360, delay: index * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay: index * 45, damping: 16, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const isArchived = Boolean(item?.isArchived);
  const rating     = Number(item?.rating || 0);
  const ratingColor = rating >= 4 ? C.green : rating >= 3 ? C.amber : C.danger;
  const ratingBg    = rating >= 4 ? C.greenLight : rating >= 3 ? C.yellowLight : C.dangerLight;

  return (
    <Animated.View style={[rc.wrap, { opacity: op, transform: [{ scale }] }, isArchived && rc.wrapArchived]}>
      <View style={rc.body}>
        {/* Top row */}
        <View style={rc.topRow}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[rc.product, isArchived && { color: C.muted }]} numberOfLines={1}>
              {item.productName || "Unknown Product"}
            </Text>
            <View style={rc.reviewerRow}>
              <Ionicons name="person-circle-outline" size={14} color={C.muted} />
              <Text style={rc.reviewer}>{item.reviewerName || "Anonymous"}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 5 }}>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TouchableOpacity style={[rc.selectBtn, selected && rc.selectBtnOn]} onPress={onToggleSelect} activeOpacity={0.8}>
                <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? C.primary : C.muted} />
              </TouchableOpacity>
              <View style={[rc.ratingBadge, { backgroundColor: ratingBg }]}>
                <Ionicons name="star" size={11} color={ratingColor} />
                <Text style={[rc.ratingNum, { color: ratingColor }]}>{rating}/5</Text>
              </View>
            </View>
            {isArchived && (
              <View style={rc.archivedBadge}>
                <Text style={rc.archivedBadgeTxt}>Archived</Text>
              </View>
            )}
          </View>
        </View>

        {/* Star row */}
        <StarRow rating={rating} />

        {/* Comment */}
        <View style={rc.commentBox}>
          <Ionicons name="chatbubble-outline" size={13} color={C.muted} style={{ marginTop: 1 }} />
          <Text style={rc.comment} numberOfLines={3}>{item.comment || "No comment provided."}</Text>
        </View>

        {/* Admin Reply */}
        {item.reply && (
          <View style={rc.replyBox}>
            <View style={rc.replyHeader}>
              <Ionicons name="arrow-undo" size={12} color={C.primary} />
              <Text style={rc.replyTitle}>Admin Reply</Text>
            </View>
            <Text style={rc.replyComment}>{item.reply.comment}</Text>
          </View>
        )}

        {/* Actions Row */}
        <View style={rc.actionsRow}>
          <View style={rc.dateRow}>
            <Ionicons name="time-outline" size={12} color={C.muted} />
            <Text style={rc.date}>{formatDateTime(item.createdAt)}</Text>
          </View>
          {!isArchived && (
            <TouchableOpacity style={rc.replyBtn} onPress={() => onReply(item)} activeOpacity={0.7}>
              <Ionicons name="arrow-undo-outline" size={14} color={C.primary} />
              <Text style={rc.replyBtnTxt}>{item.reply ? "Edit Reply" : "Reply"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const rc = StyleSheet.create({
  wrap:           { flexDirection: "row", backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: "hidden", shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  wrapArchived:   { opacity: 0.70, backgroundColor: C.surface },
  body:           { flex: 1, padding: 14, gap: 9 },
  topRow:         { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  product:        { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.display, letterSpacing: 0.1 },
  reviewerRow:    { flexDirection: "row", alignItems: "center", gap: 4 },
  reviewer:       { fontSize: 12.5, color: C.muted, fontWeight: "600" },
  selectBtn:      { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  selectBtnOn:    { backgroundColor: C.primaryLight, borderColor: C.primary },
  ratingBadge:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  ratingNum:      { fontSize: 11.5, fontWeight: "900" },
  archivedBadge:  { backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.border },
  archivedBadgeTxt:{ fontSize: 10, color: C.muted, fontWeight: "700" },
  commentBox:     { flexDirection: "row", gap: 7, backgroundColor: C.surface, borderRadius: 12, padding: 10 },
  comment:        { flex: 1, fontSize: 13, color: C.inkMid, fontWeight: "500", lineHeight: 19 },
  dateRow:        { flexDirection: "row", alignItems: "center", gap: 5 },
  date:           { fontSize: 11, color: C.muted, fontWeight: "600" },
  actionsRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  replyBtn:       { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  replyBtnTxt:    { fontSize: 11, fontWeight: "800", color: C.primary },
  replyBox:       { marginTop: 4, padding: 10, backgroundColor: C.primaryLight + "50", borderRadius: 12, borderLeftWidth: 3, borderLeftColor: C.primary },
  replyHeader:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  replyTitle:     { fontSize: 11, fontWeight: "800", color: C.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  replyComment:   { fontSize: 13, color: C.inkMid, fontWeight: "500", lineHeight: 18 },
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Reviews = ({ navigation }) => {
  const dispatch = useDispatch();
  const { adminReviews: reviews, loadingAdmin: loading, errorAdmin } = useSelector((state) => state.reviews);
  const [refreshing,    setRefreshing]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [activeTab,     setActiveTab]     = useState("active");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState([]);
  const [replyingTo,    setReplyingTo]    = useState(null);
  const [replyComment,  setReplyComment]  = useState("");
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  // Search animated border
  const searchAnim = useRef(new Animated.Value(0)).current;
  const onSearchFocus = () => { setSearchFocused(true);  Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(); };
  const onSearchBlur  = () => { setSearchFocused(false); Animated.timing(searchAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(); };
  const searchBorder  = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });
  const searchBg      = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.white] });

  // ── Backend (all unchanged) ──
  const loadReviews = useCallback(async () => {
    const result = await dispatch(fetchAdminReviews());
    if (result?.type === "ADMIN_REVIEWS_FAIL") {
      Toast.show({ type: "error", text1: "Failed to load reviews", text2: result?.payload || "Please try again", topOffset: 60 });
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => { loadReviews(); return undefined; }, [loadReviews]));

  const onRefresh = async () => { setRefreshing(true); await loadReviews(); setRefreshing(false); };

  const handleReply = (item) => {
    setReplyingTo(item);
    setReplyComment(item.reply?.comment || "");
  };

  const submitReply = async () => {
    if (!replyComment.trim()) {
      Toast.show({ type: "error", text1: "Comment required", topOffset: 60 });
      return;
    }
    try {
      setIsSubmitting(true);
      await dispatch(replyToReview({
        productId: replyingTo.productId,
        reviewId: replyingTo.reviewId,
        comment: replyComment
      }));
      Toast.show({ type: "success", text1: "Reply saved", topOffset: 60 });
      setReplyingTo(null);
      setReplyComment("");
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to save reply", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const bulkArchiveSelected = async (isArchived) => {
    const targets = filtered.filter((item) => selectedIds.includes(`${item.productId}-${item.reviewId}`) && Boolean(item?.isArchived) !== Boolean(isArchived));
    if (!targets.length) { Toast.show({ type: "info", text1: "Select reviews first", topOffset: 60 }); return; }
    try {
      await dispatch(bulkArchiveAdminReviews({ isArchived, items: targets.map((item) => ({ productId: item.productId, reviewId: item.reviewId })) }));
      Toast.show({ type: "success", text1: isArchived ? "Selected reviews archived" : "Selected reviews restored", text2: `${targets.length} reviews processed`, topOffset: 60 });
      setSelectedIds([]);
    } catch (error) {
      Toast.show({ type: "error", text1: "Bulk update failed", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return (reviews || []).filter((item) => {
        const archived = Boolean(item?.isArchived);
        return activeTab === "archived" ? archived : !archived;
      });
    }

    const matches = (reviews || []).filter((item) => {
      const archived = Boolean(item?.isArchived);
      const matchesTab = activeTab === "archived" ? archived : !archived;
      if (!matchesTab) return false;

      return (
        String(item?.productName || "").toLowerCase().includes(q) ||
        String(item?.reviewerName || "").toLowerCase().includes(q) ||
        String(item?.comment || "").toLowerCase().includes(q) ||
        String(item?.rating || "").toLowerCase().includes(q)
      );
    });

    // Sort: items that START with the search query appear at the top
    return matches.sort((a, b) => {
      const aProd = String(a?.productName || "").toLowerCase();
      const bProd = String(b?.productName || "").toLowerCase();
      const aRev = String(a?.reviewerName || "").toLowerCase();
      const bRev = String(b?.reviewerName || "").toLowerCase();

      const aStarts = aProd.startsWith(q) || aRev.startsWith(q);
      const bStarts = bProd.startsWith(q) || bRev.startsWith(q);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [reviews, activeTab, searchQuery]);

  const visibleIds = useMemo(() => filtered.map((item) => `${item.productId}-${item.reviewId}`), [filtered]);
  const selectedVisibleCount = useMemo(() => selectedIds.filter((id) => visibleIds.includes(id)).length, [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  const activeCount   = (reviews || []).filter((i) => !i?.isArchived).length;
  const archivedCount = (reviews || []).filter((i) =>  i?.isArchived).length;
  const avgRating     = filtered.length
    ? (filtered.reduce((s, i) => s + Number(i?.rating || 0), 0) / filtered.length).toFixed(1)
    : "—";

  if (loading && !refreshing) {
    return (
      <View style={s.loadScreen}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadTxt}>Loading reviews…</Text>
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
        <FloatingOrb size={44}  color="rgba(255,200,80,0.18)"  style={{ top: 44, left: SW * 0.48 }} delay={1400} />

        <FadeUp delay={0}>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.menuBtn} onPress={openDrawer} activeOpacity={0.8}>
              <Ionicons name="menu" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>PageTurner</Text>
              <Text style={s.heroTitle}>Review Management</Text>
            </View>
          </View>

          {/* Hero stats pills */}
          <View style={s.heroPillRow}>
            <View style={s.heroPill}>
              <Ionicons name="star" size={12} color={C.amber} />
              <Text style={s.heroPillTxt}>{avgRating} avg rating</Text>
            </View>
            <View style={s.heroPill}>
              <Ionicons name="chatbubbles-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={s.heroPillTxt}>{(reviews || []).length} total reviews</Text>
            </View>
          </View>
        </FadeUp>
      </LinearGradient>

      {/* ══ LIST ══ */}
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item.reviewId || index}-${item.productId || ""}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}

        ListHeaderComponent={
          <View>
            {/* Error banner */}
            {!!errorAdmin && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={14} color={C.danger} />
                <Text style={s.errorTxt}>{errorAdmin}</Text>
              </View>
            )}

            {/* Search */}
            <FadeUp delay={60}>
              <Animated.View style={[s.searchWrap, { borderColor: searchBorder, backgroundColor: searchBg }]}>
                <Ionicons name="search-outline" size={16} color={searchFocused ? C.primary : C.muted} />
                <TextInput
                  style={s.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by product, reviewer, comment…"
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

            {/* Tabs */}
            <FadeUp delay={100} style={s.tabRow}>
              <TouchableOpacity style={[s.tab, activeTab === "active" && s.tabActive]} onPress={() => setActiveTab("active")} activeOpacity={0.8}>
                <Text style={[s.tabTxt, activeTab === "active" && s.tabTxtActive]}>Active</Text>
                <View style={[s.tabBadge, activeTab === "active" && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, activeTab === "active" && s.tabBadgeTxtActive]}>{activeCount}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, activeTab === "archived" && s.tabActive]} onPress={() => setActiveTab("archived")} activeOpacity={0.8}>
                <Text style={[s.tabTxt, activeTab === "archived" && s.tabTxtActive]}>Archived</Text>
                <View style={[s.tabBadge, activeTab === "archived" && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, activeTab === "archived" && s.tabBadgeTxtActive]}>{archivedCount}</Text>
                </View>
              </TouchableOpacity>
            </FadeUp>

            {/* Selection actions */}
            <FadeUp delay={115} style={s.selectRow}>
              <TouchableOpacity 
                style={s.exportBtn} 
                onPress={() => exportReviewsPDF(filtered)}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={15} color={C.primary} />
                <Text style={s.exportBtnTxt}>PDF</Text>
              </TouchableOpacity>
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
                {activeTab === "active" ? (
                  <TouchableOpacity style={s.bulkBtnArchive} onPress={() => bulkArchiveSelected(true)} activeOpacity={0.8}>
                    <Ionicons name="archive-outline" size={13} color={C.danger} />
                    <Text style={s.bulkBtnArchiveTxt}>Archive Selected</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.bulkBtnRestore} onPress={() => bulkArchiveSelected(false)} activeOpacity={0.8}>
                    <Ionicons name="refresh-outline" size={13} color={C.green} />
                    <Text style={s.bulkBtnRestoreTxt}>Restore Selected</Text>
                  </TouchableOpacity>
                )}
              </FadeUp>
            )}

            {/* Section divider */}
            <View style={s.sectionRow}>
              <View style={s.sectionLine} />
              <Text style={s.sectionTxt}>{activeTab === "archived" ? "Archived" : "Active"} Reviews</Text>
              <View style={s.sectionLine} />
            </View>
          </View>
        }

        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={30} color={C.border} />
            </View>
            <Text style={s.emptyTitle}>No reviews found</Text>
            <Text style={s.emptySubtitle}>
              {searchQuery ? "Try a different search term" : "No reviews in this category yet"}
            </Text>
          </View>
        }

        renderItem={({ item, index }) => (
          <ReviewCard
            item={item}
            index={index}
            selected={selectedIds.includes(`${item.productId}-${item.reviewId}`)}
            onToggleSelect={() => {
              const id = `${item.productId}-${item.reviewId}`;
              setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
            }}
            onReply={handleReply}
          />
        )}
      />

      {/* Reply Modal */}
      <Modal
        visible={!!replyingTo}
        transparent
        animationType="fade"
        onRequestClose={() => setReplyingTo(null)}
      >
        <View style={s.modalOverlay}>
          <Animated.View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{replyingTo?.reply ? "Edit Reply" : "Reply to Review"}</Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={C.ink} />
              </TouchableOpacity>
            </View>

            <View style={s.modalInfo}>
              <Text style={s.modalProduct}>{replyingTo?.productName}</Text>
              <Text style={s.modalReviewer}>Review by {replyingTo?.reviewerName}</Text>
              <Text style={s.modalComment} numberOfLines={3}>"{replyingTo?.comment}"</Text>
            </View>

            <TextInput
              style={s.modalInput}
              value={replyComment}
              onChangeText={setReplyComment}
              placeholder="Type your reply here..."
              placeholderTextColor={C.muted}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => setReplyingTo(null)}
                disabled={isSubmitting}
              >
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSubmit, isSubmitting && { opacity: 0.6 }]}
                onPress={submitReply}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={14} color="#FFF" />
                    <Text style={s.modalSubmitTxt}>Save Reply</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
  heroNav:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  menuBtn:      { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  heroEyebrow:  { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.60)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  heroTitle:    { fontSize: 21, fontWeight: "900", fontFamily: F.display, color: "#FFF", letterSpacing: 0.1 },
  heroPillRow:  { flexDirection: "row", gap: 8 },
  heroPill:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  heroPillTxt:  { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.88)" },

  // Error banner
  errorBanner:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: C.danger, borderRadius: 14, padding: 12, marginBottom: 12 },
  errorTxt:     { flex: 1, fontSize: 13, color: C.danger, fontWeight: "600" },

  // List
  listContent:  { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 },

  // Search
  searchWrap:   { flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 12, marginBottom: 12 },
  searchInput:  { flex: 1, fontSize: 14, color: C.ink, fontFamily: F.body, fontWeight: "500" },

  // Tabs
  tabRow:           { flexDirection: "row", backgroundColor: C.surface, borderRadius: 16, padding: 4, gap: 4, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  tab:              { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, borderRadius: 13 },
  tabActive:        { backgroundColor: C.white, shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3 },
  tabTxt:           { fontSize: 13, fontWeight: "700", color: C.muted },
  tabTxtActive:     { color: C.ink, fontWeight: "900" },
  tabBadge:         { backgroundColor: C.border, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeActive:   { backgroundColor: C.primaryLight },
  tabBadgeTxt:      { fontSize: 11, fontWeight: "800", color: C.muted },
  tabBadgeTxtActive:{ color: C.primary },

  // Bulk
  bulkRow:           { flexDirection: "row", gap: 10, marginBottom: 14 },
  bulkBtnArchive:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.dangerLight, borderWidth: 1.5, borderColor: C.danger, borderRadius: 14, paddingVertical: 11 },
  bulkBtnArchiveTxt: { fontSize: 12, fontWeight: "800", color: C.danger },
  bulkBtnRestore:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.greenLight, borderWidth: 1.5, borderColor: C.green, borderRadius: 14, paddingVertical: 11 },
  bulkBtnRestoreTxt: { fontSize: 12, fontWeight: "800", color: C.green },

  // Selection
  selectRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectToggleBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  selectToggleTxt:   { fontSize: 12, fontWeight: "800", color: C.primary },
  selectedCountTxt:  { fontSize: 12, fontWeight: "700", color: C.muted },
  exportBtn:         { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  exportBtnTxt:      { fontSize: 12, fontWeight: "800", color: C.primary },

  // Section divider
  sectionRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
  sectionTxt:  { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 1.2 },

  // Empty
  emptyWrap:    { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  emptyTitle:   { fontSize: 16, fontWeight: "900", color: C.inkMid, fontFamily: F.display },
  emptySubtitle: { fontSize: 13, color: C.muted, fontWeight: "500", textAlign: "center", lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(18,8,2,0.6)", justifyContent: "center", padding: 20 },
  modalCard:    { backgroundColor: C.white, borderRadius: 28, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 },
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: "900", color: C.ink, fontFamily: F.display },
  modalInfo:    { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 16, gap: 4 },
  modalProduct: { fontSize: 14, fontWeight: "800", color: C.inkMid },
  modalReviewer:{ fontSize: 12, color: C.muted, fontWeight: "600" },
  modalComment: { fontSize: 13, color: C.muted, fontStyle: "italic", marginTop: 4 },
  modalInput:   { height: 120, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, padding: 14, fontSize: 14, color: C.ink, fontWeight: "500" },
  modalFooter:  { flexDirection: "row", gap: 12, marginTop: 20 },
  modalCancel:  { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  modalCancelTxt:{ fontSize: 14, fontWeight: "800", color: C.muted },
  modalSubmit:  { flex: 2, height: 50, borderRadius: 14, backgroundColor: C.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  modalSubmitTxt:{ fontSize: 14, fontWeight: "900", color: "#FFF" },
});

export default Reviews;