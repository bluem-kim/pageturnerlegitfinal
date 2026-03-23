import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import AuthGlobal from "../../Context/Store/AuthGlobal";
import { submitReview as submitReviewAction } from "../../Redux/Actions/reviewActions";

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
  star:         "#F5A623",
  starEmpty:    "#E5D8C8",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
const RATING_COLORS = ["", C.danger, "#F59E0B", C.gold, C.primary, "#22C55E"];

const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 440, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 15, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
};

// Section heading with left accent bar
const SectionHead = ({ title, subtitle }) => (
  <View style={sec.row}>
    <View style={sec.bar} />
    <View>
      <Text style={sec.title}>{title}</Text>
      {subtitle ? <Text style={sec.sub}>{subtitle}</Text> : null}
    </View>
  </View>
);
const sec = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  bar:   { width: 4, height: 24, borderRadius: 2, backgroundColor: C.primary },
  title: { fontSize: 16, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  sub:   { fontSize: 11, color: C.muted, fontWeight: "600", marginTop: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// STAR PICKER — large tappable stars with spring bounce
// ─────────────────────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => {
  const scales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  const tap = (r) => {
    onChange(r);
    // Bounce the tapped star
    Animated.sequence([
      Animated.spring(scales[r - 1], { toValue: 1.4, useNativeDriver: true, damping: 6, stiffness: 300 }),
      Animated.spring(scales[r - 1], { toValue: 1.0, useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();
  };

  const labelColor = RATING_COLORS[value] || C.primary;

  return (
    <View style={sp.wrap}>
      <View style={sp.starsRow}>
        {[1, 2, 3, 4, 5].map((r) => (
          <Animated.View key={r} style={{ transform: [{ scale: scales[r - 1] }] }}>
            <TouchableOpacity onPress={() => tap(r)} activeOpacity={0.8} hitSlop={6}>
              <Ionicons
                name={r <= value ? "star" : "star-outline"}
                size={38}
                color={r <= value ? C.star : C.starEmpty}
              />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
      <View style={[sp.labelPill, { backgroundColor: labelColor + "22", borderColor: labelColor }]}>
        <Text style={[sp.labelTxt, { color: labelColor }]}>{RATING_LABELS[value]}</Text>
        <Text style={[sp.ratingNum, { color: labelColor }]}>{value}/5</Text>
      </View>
    </View>
  );
};
const sp = StyleSheet.create({
  wrap:     { alignItems: "center", gap: 14 },
  starsRow: { flexDirection: "row", gap: 6 },
  labelPill: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 22, borderWidth: 1.5,
  },
  labelTxt:  { fontSize: 15, fontWeight: "800", fontFamily: F.serif },
  ratingNum: { fontSize: 13, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE THUMB with animated remove
// ─────────────────────────────────────────────────────────────────────────────
const ImageThumb = ({ uri, onRemove }) => {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  }, []);
  return (
    <Animated.View style={[thumb.wrap, { transform: [{ scale }] }]}>
      <Image source={{ uri }} style={thumb.img} resizeMode="cover" />
      <TouchableOpacity style={thumb.remove} onPress={onRemove} activeOpacity={0.85}>
        <Ionicons name="close" size={11} color="#FFF" />
      </TouchableOpacity>
      {/* Orange corner accent */}
      <View style={thumb.corner} />
    </Animated.View>
  );
};
const thumb = StyleSheet.create({
  wrap:   { marginRight: 10, position: "relative" },
  img:    { width: 80, height: 80, borderRadius: 14, borderWidth: 1.5, borderColor: C.border },
  remove: {
    position: "absolute", top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.danger,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.danger, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
  },
  corner: {
    position: "absolute", bottom: 0, left: 0,
    width: 16, height: 16,
    backgroundColor: C.primary, borderTopRightRadius: 10, borderBottomLeftRadius: 14,
    opacity: 0.85,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD IMAGE TILE
// ─────────────────────────────────────────────────────────────────────────────
const AddTile = ({ onPress, label, icon }) => (
  <TouchableOpacity style={at.tile} onPress={onPress} activeOpacity={0.8}>
    <View style={at.iconWrap}>
      <Ionicons name={icon} size={22} color={C.primary} />
    </View>
    <Text style={at.lbl}>{label}</Text>
  </TouchableOpacity>
);
const at = StyleSheet.create({
  tile: {
    width: 80, height: 80, borderRadius: 14,
    borderWidth: 2, borderColor: C.primary, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4,
    backgroundColor: C.primaryLight, marginRight: 10,
  },
  iconWrap: {},
  lbl: { fontSize: 9, fontWeight: "800", color: C.primary, textAlign: "center" },
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
const ReviewProduct = ({ route, navigation }) => {
  const dispatch    = useDispatch();
  const context     = useContext(AuthGlobal);
  const currentUserId = context?.stateUser?.user?.userId || context?.stateUser?.user?.id;
  const product = route.params?.product;
  const orderId = route.params?.orderId;

  const existingReview = useMemo(() => {
    const rev = Array.isArray(product?.reviews) ? product.reviews : [];
    return rev.find((r) => {
      const uid = r?.user?._id || r?.user?.id || r?.user;
      return String(uid) === String(currentUserId);
    });
  }, [product, currentUserId]);

  const [rating,         setRating]         = useState(existingReview?.rating || 5);
  const [comment,        setComment]        = useState(existingReview?.comment || "");
  const [existingImages, setExistingImages] = useState(existingReview?.images || []);
  const [newImages,      setNewImages]      = useState([]);
  const [saving,         setSaving]         = useState(false);

  // Validation state
  const [errors, setErrors] = useState({});

  const productId = useMemo(() => product?.id || product?._id || "", [product]);
  const isEditing = !!existingReview;
  const totalImages = existingImages.length + newImages.length;
  const canAddMore  = totalImages < 5;

  // ── Image pickers (unchanged logic) ──────────────────────────────────────
  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Toast.show({ type: "error", text1: "Permission denied", text2: "Allow photo access to upload review images", topOffset: 60 });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: false,
        allowsMultipleSelection: true, selectionLimit: 5, quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      setNewImages((prev) => [...prev, ...result.assets].slice(0, Math.max(0, 5 - existingImages.length)));
    } catch {
      Toast.show({ type: "error", text1: "Image selection failed", topOffset: 60 });
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Toast.show({ type: "error", text1: "Permission denied", text2: "Allow camera access to add review images", topOffset: 60 });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      setNewImages((prev) => [...prev, ...result.assets].slice(0, Math.max(0, 5 - existingImages.length)));
    } catch {
      Toast.show({ type: "error", text1: "Camera unavailable", topOffset: 60 });
    }
  };

  const removeExistingImage = (i) => setExistingImages((p) => p.filter((_, idx) => idx !== i));
  const removeNewImage      = (i) => setNewImages((p) => p.filter((_, idx) => idx !== i));

  // ── Submit (unchanged logic) ──────────────────────────────────────────────
  const submitReview = async () => {
    const newErrors = {};
    if (!rating)    newErrors.rating  = "Please select a rating";
    if (!comment.trim()) newErrors.comment = "Please write a comment";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Toast.show({ type: "error", text1: "Validation failed", text2: "Please fill in all required fields", topOffset: 60 });
      return;
    }

    if (!productId || !orderId) {
      Toast.show({ type: "error", text1: "Invalid review request", topOffset: 60 });
      return;
    }
    try {
      setSaving(true);
      await dispatch(submitReviewAction({ productId, orderId, rating, comment, existingImages, newImages }));
      Toast.show({ type: "success", text1: "Review submitted", topOffset: 60 });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: "error", text1: "Submit failed", text2: err?.message || "Please try again", topOffset: 60 });
    } finally {
      setSaving(false);
    }
  };

  // All image data for the horizontal list
  const allImages = [
    ...existingImages.map((uri, index) => ({ type: "existing", uri, index })),
    ...newImages.map((asset, index) => ({ type: "new", uri: asset.uri, index })),
  ];

  const productImage = product?.image || product?.images?.[0] || null;

  return (
    <View style={s.screen}>
      {/* ── FLOATING BACK ── */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color={C.ink} />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO PRODUCT STRIP ── */}
        <FadeUp delay={0}>
          <LinearGradient
            colors={[C.primaryLight, C.bg]}
            style={s.heroStrip}
          >
            {productImage ? (
              <View style={s.coverWrap}>
                <Image source={{ uri: productImage }} style={s.cover} resizeMode="cover" />
                <View style={s.coverCorner} />
              </View>
            ) : (
              <View style={[s.coverWrap, { backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="book" size={32} color={C.primary} />
              </View>
            )}
            <View style={s.heroInfo}>
              <View style={s.heroBadge}>
                <Text style={s.heroBadgeTxt}>{isEditing ? "Editing Review" : "New Review"}</Text>
              </View>
              <Text style={s.heroTitle} numberOfLines={2}>
                {product?.name || "Product"}
              </Text>
            </View>
          </LinearGradient>
        </FadeUp>

        {/* ── PAGE TITLE ── */}
        <FadeUp delay={60} style={s.pageTitleBlock}>
          <View style={s.titleRow}>
            <View style={s.titleBar} />
            <Text style={s.pageTitle}>
              {isEditing ? "Update Your Review" : "Write a Review"}
            </Text>
          </View>
          <Text style={s.pageSubtitle}>Your honest feedback helps other readers</Text>
        </FadeUp>

        {/* ── STAR RATING ── */}
        <FadeUp delay={120} style={[s.card, errors.rating && { borderColor: C.danger }]}>
          <SectionHead title="Your Rating" subtitle="Tap a star to rate" />
          <StarPicker value={rating} onChange={(v) => { setRating(v); setErrors(p => ({ ...p, rating: null })); }} />
          {!!errors.rating && <Text style={s.errorTxtSmall}>{errors.rating}</Text>}
        </FadeUp>

        {/* ── COMMENT ── */}
        <FadeUp delay={180} style={[s.card, errors.comment && { borderColor: C.danger }]}>
          <SectionHead
            title="Your Review"
            subtitle={`${comment.length} characters`}
          />
          <View style={s.textAreaWrap}>
            <TextInput
              value={comment}
              onChangeText={(v) => { setComment(v); setErrors(p => ({ ...p, comment: null })); }}
              placeholder="What did you think about this book? Share details that would help other readers…"
              placeholderTextColor={C.muted}
              style={[s.textArea, errors.comment && { borderColor: C.danger }]}
              multiline
              textAlignVertical="top"
            />
            {comment.length > 0 && (
              <TouchableOpacity style={s.clearComment} onPress={() => setComment("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
          {!!errors.comment && <Text style={s.errorTxtSmall}>{errors.comment}</Text>}
        </FadeUp>

        {/* ── PHOTOS ── */}
        <FadeUp delay={240} style={s.card}>
          <SectionHead
            title="Add Photos"
            subtitle={`${totalImages}/5 photos added`}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.imgRow}>
            {/* Add tiles — only shown when limit not reached */}
            {canAddMore && (
              <>
                <AddTile icon="images-outline"  label="Gallery" onPress={pickFromGallery} />
                <AddTile icon="camera-outline"  label="Camera"  onPress={takePhoto} />
              </>
            )}

            {/* Existing images */}
            {existingImages.map((uri, i) => (
              <ImageThumb key={`ex-${uri}-${i}`} uri={uri} onRemove={() => removeExistingImage(i)} />
            ))}

            {/* New images */}
            {newImages.map((asset, i) => (
              <ImageThumb key={`new-${asset.uri}-${i}`} uri={asset.uri} onRemove={() => removeNewImage(i)} />
            ))}
          </ScrollView>

          {totalImages >= 5 && (
            <View style={s.limitNote}>
              <Ionicons name="information-circle" size={14} color={C.primary} />
              <Text style={s.limitNoteTxt}>Maximum 5 photos reached</Text>
            </View>
          )}
        </FadeUp>

        {/* ── SPACER for sticky button ── */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── STICKY SUBMIT BAR ── */}
      <View style={s.stickyBar}>
        {/* Rating preview */}
        <View style={s.stickyRating}>
          <View style={{ flexDirection: "row", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((r) => (
              <Ionicons key={r} name={r <= rating ? "star" : "star-outline"} size={13} color={r <= rating ? C.star : C.starEmpty} />
            ))}
          </View>
          <Text style={s.stickyRatingLbl}>{RATING_LABELS[rating]}</Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, saving && s.submitBtnDisabled]}
          onPress={submitReview}
          disabled={saving}
          activeOpacity={0.86}
        >
          {saving ? (
            <>
              <Ionicons name="hourglass-outline" size={16} color="#FFF" />
              <Text style={s.submitTxt}>Submitting…</Text>
            </>
          ) : (
            <>
              <Ionicons name={isEditing ? "pencil" : "checkmark-circle"} size={16} color="#FFF" />
              <Text style={s.submitTxt}>{isEditing ? "Update Review" : "Submit Review"}</Text>
            </>
          )}
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
  scroll: { paddingBottom: 20 },

  // Back button
  backBtn: {
    position: "absolute", top: Platform.OS === "ios" ? 56 : 40, left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,250,246,0.95)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 4,
  },

  // Hero strip
  heroStrip: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingTop: Platform.OS === "ios" ? 110 : 94,
    paddingBottom: 24, paddingHorizontal: 20,
  },
  coverWrap: {
    width: 72, height: 96, borderRadius: 14, overflow: "hidden",
    backgroundColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  cover:       { width: "100%", height: "100%" },
  coverCorner: { position: "absolute", bottom: 0, right: 0, width: 18, height: 18, backgroundColor: C.primary, borderTopLeftRadius: 10 },
  heroInfo:    { flex: 1, gap: 6 },
  heroBadge:   { alignSelf: "flex-start", backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  heroBadgeTxt:{ color: "#FFF", fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  heroTitle:   { fontSize: 18, fontWeight: "900", fontFamily: F.serif, color: C.ink, lineHeight: 24 },

  // Page title
  pageTitleBlock: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  titleBar:       { width: 4, height: 26, borderRadius: 2, backgroundColor: C.primary },
  pageTitle:      { fontSize: 24, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  pageSubtitle:   { fontSize: 13, color: C.muted, fontWeight: "500", paddingLeft: 14 },

  // Cards
  card: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.white,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  errorTxtSmall: { fontSize: 10, color: C.danger, fontWeight: "700", marginTop: 4, marginLeft: 2 },

  // Comment textarea
  textAreaWrap: { position: "relative" },
  textArea: {
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    minHeight: 120, maxHeight: 200,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 36,
    fontSize: 14, color: C.ink, fontWeight: "500",
    lineHeight: 22,
  },
  clearComment: { position: "absolute", bottom: 12, right: 12 },

  // Image row
  imgRow: { paddingVertical: 4 },
  limitNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 12, backgroundColor: C.primaryLight,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  limitNoteTxt: { fontSize: 12, color: C.primary, fontWeight: "700" },

  // Sticky bar
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
  stickyRating: { gap: 4 },
  stickyRatingLbl: { fontSize: 11, color: C.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.42, shadowRadius: 10, elevation: 7,
  },
  submitBtnDisabled: { backgroundColor: C.muted, shadowOpacity: 0 },
  submitTxt: { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 0.3 },
});

export default ReviewProduct;