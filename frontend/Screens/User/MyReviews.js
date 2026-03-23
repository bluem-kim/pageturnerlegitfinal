import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { archiveMyReview, fetchMyReviews } from "../../Redux/Actions/reviewActions";

const { width: SW } = Dimensions.get("window");

const FALLBACK =
  "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

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
  star:         "#F5A623",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const Stars = ({ rating = 0, size = 13 }) => (
  <View style={{ flexDirection: "row", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Ionicons
        key={i}
        name={i <= Math.round(rating) ? "star" : "star-outline"}
        size={size}
        color={C.star}
      />
    ))}
  </View>
);

// Staggered fade+slide-up
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 460, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 16, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
};

// Avatar initials
const AVATAR_COLORS = ["#F4821F", "#B85E0E", "#F5C842", "#22A36B", "#3B82F6"];

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW CARD
// ─────────────────────────────────────────────────────────────────────────────
const ReviewCard = ({ item, index, onEdit, onArchive }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 14 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1.0,  useNativeDriver: true, damping: 14 }).start();

  const rating   = item.review?.rating || 0;
  const comment  = item.review?.comment || "";
  const isArchived = Boolean(item.review?.isArchived);
  const hasImages = Array.isArray(item.review?.images) && item.review.images.length > 0;
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initial = (item.productName || "?")[0].toUpperCase();

  // Rating color
  const ratingColor = rating >= 4 ? C.primary : rating >= 3 ? C.gold : C.danger;

  return (
    <FadeUp delay={index * 90}>
      <Animated.View style={[card.shadow, { transform: [{ scale }] }, isArchived && { opacity: 0.6 }]}>
        <View style={card.container}>
          {/* ── HEADER ROW ── */}
          <View style={card.header}>
            {/* Book cover */}
            <View style={card.coverWrap}>
              <Image
                source={{ uri: item.productImage || FALLBACK }}
                style={card.cover}
                resizeMode="cover"
              />
              {/* Corner accent */}
              <View style={[card.coverCorner, { backgroundColor: avatarColor }]} />
            </View>

            {/* Book info */}
            <View style={card.info}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={card.productName} numberOfLines={2}>
                  {item.productName}
                </Text>
                {isArchived && (
                  <View style={card.archivedBadge}>
                    <Text style={card.archivedBadgeTxt}>HIDDEN</Text>
                  </View>
                )}
              </View>

              <View style={card.starsRow}>
                <Stars rating={rating} size={12} />
                <View style={[card.ratingBadge, { backgroundColor: C.primaryLight }]}>
                  <Text style={[card.ratingBadgeTxt, { color: ratingColor }]}>
                    {rating}/5
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── COMMENT ── */}
          {comment ? (
            <View style={card.commentBox}>
              <Ionicons name="chatbubble-ellipses" size={13} color={C.primary} style={{ marginTop: 1 }} />
              <Text style={card.commentTxt} numberOfLines={3}>{comment}</Text>
            </View>
          ) : (
            <View style={card.commentBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.muted} style={{ marginTop: 1 }} />
              <Text style={[card.commentTxt, { color: C.muted, fontStyle: "italic" }]}>No comment written.</Text>
            </View>
          )}

          {/* ── REVIEW IMAGES ── */}
          {hasImages && (
            <View style={card.imgRow}>
              {item.review.images.slice(0, 4).map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={card.reviewImg} resizeMode="cover" />
              ))}
              {item.review.images.length > 4 && (
                <View style={card.moreImgs}>
                  <Text style={card.moreImgsTxt}>+{item.review.images.length - 4}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── DIVIDER ── */}
          <View style={card.divider} />

          {/* ── ACTION BUTTONS ── */}
          <View style={card.actions}>
            {!isArchived && (
              <TouchableOpacity
                style={card.editBtn}
                onPress={onEdit}
                onPressIn={onIn}
                onPressOut={onOut}
                activeOpacity={0.85}
              >
                <Ionicons name="pencil" size={14} color={C.primary} />
                <Text style={card.editBtnTxt}>Edit</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={card.archiveBtn}
              onPress={onArchive}
              activeOpacity={0.85}
            >
              <Ionicons name={isArchived ? "eye-outline" : "eye-off-outline"} size={14} color={C.muted} />
              <Text style={card.archiveBtnTxt}>{isArchived ? "Restore" : "Hide"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </FadeUp>
  );
};

const card = StyleSheet.create({
  shadow: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: "#C05010",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12,
    elevation: 5, backgroundColor: C.white,
  },
  container: {
    borderRadius: 20, overflow: "hidden",
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
  },

  header: {
    flexDirection: "row", alignItems: "flex-start",
    padding: 14, paddingBottom: 10, gap: 12,
  },

  coverWrap: {
    width: 64, height: 84, borderRadius: 12, overflow: "hidden",
    backgroundColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3,
  },
  cover:       { width: "100%", height: "100%" },
  coverCorner: { position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderTopLeftRadius: 10 },

  info:        { flex: 1, gap: 6, paddingTop: 2 },
  productName: { fontSize: 14, fontWeight: "900", color: C.ink, fontFamily: F.serif, lineHeight: 20 },
  starsRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  ratingBadgeTxt: { fontSize: 11, fontWeight: "900", fontFamily: F.serif },

  archivedBadge: {
    backgroundColor: C.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  archivedBadgeTxt: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "900",
  },

  commentBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    paddingHorizontal: 14, paddingBottom: 12,
  },
  commentTxt: { flex: 1, fontSize: 13, color: C.ink, lineHeight: 19, fontWeight: "500" },

  imgRow: {
    flexDirection: "row", gap: 6,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  reviewImg: { width: 56, height: 56, borderRadius: 10 },
  moreImgs: {
    width: 56, height: 56, borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  moreImgsTxt: { fontSize: 13, fontWeight: "900", color: C.primary },

  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 14 },

  actions: {
    flexDirection: "row", gap: 10,
    padding: 12, paddingTop: 10,
  },
  editBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: C.primary,
    backgroundColor: C.primaryLight,
    paddingVertical: 10, borderRadius: 14,
  },
  editBtnTxt:   { fontSize: 13, fontWeight: "800", color: C.primary },

  archiveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  archiveBtnTxt: { fontSize: 13, fontWeight: "800", color: C.muted, marginLeft: 6 },
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
const EmptyState = () => (
  <FadeUp delay={0} style={empty.wrap}>
    <LinearGradient
      colors={[C.primaryLight, C.bg]}
      style={empty.circle}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={44} color={C.primary} />
    </LinearGradient>
    <Text style={empty.title}>No reviews yet</Text>
    <Text style={empty.body}>Books you review will appear here.</Text>
  </FadeUp>
);

const empty = StyleSheet.create({
  wrap:   { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14 },
  circle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title:  { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  body:   { fontSize: 14, color: C.muted, textAlign: "center", fontWeight: "500" },
});

// ─────────────────────────────────────────────────────────────────────────────
// MY REVIEWS
// ─────────────────────────────────────────────────────────────────────────────
const MyReviews = ({ navigation }) => {
  const dispatch = useDispatch();
  const { myReviews: reviews, loading, error } = useSelector((state) => state.reviews);

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") {
      navigation.openDrawer();
      return;
    }
    navigation?.getParent?.()?.openDrawer?.();
  };

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchMyReviews());
    }, [dispatch])
  );

  useEffect(() => {
    if (!error) return;
    Toast.show({ type: "error", text1: "Failed to load reviews", text2: error, topOffset: 60 });
  }, [error]);

  const handleEdit = (item) => {
    navigation.navigate("Profile", {
      screen: "Review Product",
      params: {
        orderId: item.review?.order,
        product: {
          id: item.productId,
          name: item.productName,
          image: item.productImage,
          reviews: [{
            user: item.review?.user,
            rating: item.review?.rating,
            comment: item.review?.comment,
            images: item.review?.images || [],
            order: item.review?.order,
          }],
        },
      },
    });
  };

  const handleArchive = (item) => {
    const isArchived = Boolean(item.review?.isArchived);
    const action = isArchived ? "Restore" : "Hide";
    Alert.alert(
      `${action} Review`,
      `Are you sure you want to ${action.toLowerCase()} this review from the public product page?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: action, 
          style: isArchived ? "default" : "destructive",
          onPress: () => dispatch(archiveMyReview({ productId: item.productId, isArchived: !isArchived })) 
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingTxt}>Loading your reviews…</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* ── HEADER BLOCK ── */}
      <FadeUp delay={0} style={s.headerBlock}>
        <View style={s.headerLeft}>
          <TouchableOpacity style={s.drawerBtn} onPress={openDrawer} activeOpacity={0.8}>
            <Ionicons name="menu" size={28} color={C.primary} />
          </TouchableOpacity>
          <View style={s.accentBar} />
          <View>
            <Text style={s.pageTitle}>My Reviews</Text>
            <Text style={s.pageSubtitle}>
              {reviews.length > 0
                ? `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"} written`
                : "Share your reading experience"}
            </Text>
          </View>
        </View>
        {reviews.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeTxt}>{reviews.length}</Text>
          </View>
        )}
      </FadeUp>

      {/* ── SUMMARY STRIP ── */}
      {reviews.length > 0 && (
        <FadeUp delay={60}>
          <View style={s.summaryStrip}>
            {/* Average rating */}
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>
                {(reviews.reduce((acc, r) => acc + (r.review?.rating || 0), 0) / reviews.length).toFixed(1)}
              </Text>
              <Text style={s.summaryLbl}>Avg Rating</Text>
            </View>
            <View style={s.summaryDivider} />
            {/* 5-star count */}
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>
                {reviews.filter((r) => (r.review?.rating || 0) === 5).length}
              </Text>
              <Text style={s.summaryLbl}>5-Star</Text>
            </View>
            <View style={s.summaryDivider} />
            {/* With photos */}
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>
                {reviews.filter((r) => Array.isArray(r.review?.images) && r.review.images.length > 0).length}
              </Text>
              <Text style={s.summaryLbl}>With Photos</Text>
            </View>
          </View>
        </FadeUp>
      )}

      {/* ── LIST ── */}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item, index }) => (
          <ReviewCard
            item={item}
            index={index}
            onEdit={() => handleEdit(item)}
            onArchive={() => handleArchive(item)}
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
  screen:     { flex: 1, backgroundColor: C.bg },
  loadingWrap:{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: C.bg },
  loadingTxt: { fontSize: 14, color: C.muted, fontWeight: "600" },

  // Header
  headerBlock: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 34,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  drawerBtn:  { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  accentBar:  { width: 4, height: 42, borderRadius: 2, backgroundColor: C.primary },
  pageTitle:  { fontSize: 28, fontWeight: "900", fontFamily: F.serif, color: C.ink, letterSpacing: 0.2 },
  pageSubtitle: { fontSize: 13, color: C.muted, fontWeight: "600", marginTop: 2 },
  countBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primaryLight, borderWidth: 2, borderColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  countBadgeTxt: { fontSize: 16, fontWeight: "900", color: C.primary, fontFamily: F.serif },

  // Summary strip
  summaryStrip: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: C.white,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    paddingVertical: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryItem:    { flex: 1, alignItems: "center", gap: 3 },
  summaryVal:     { fontSize: 20, fontWeight: "900", fontFamily: F.serif, color: C.primary },
  summaryLbl:     { fontSize: 10, color: C.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  summaryDivider: { width: 1, height: 32, backgroundColor: C.border },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
});

export default MyReviews;