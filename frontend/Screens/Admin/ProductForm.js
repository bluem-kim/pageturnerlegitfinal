import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
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
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";

import baseURL from "../../assets/common/baseurl";

const MAX_TOTAL_IMAGES = 20;
const MAX_UPLOAD_BATCH = 1;

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
  blue:         "#3B82F6",
  blueLight:    "#DBEAFE",
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
// ANIMATED INPUT FIELD
// ─────────────────────────────────────────────────────────────────────────────
const InputField = ({ icon, label, placeholder, value, onChange, keyboardType, multiline, height, error }) => {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = anim.interpolate({ inputRange: [0, 1], outputRange: [error ? C.danger : C.border, C.primary] });
  const bgColor     = anim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.white] });

  return (
    <View style={inp.container}>
      {!!label && <Text style={[inp.label, error && { color: C.danger }]}>{label}</Text>}
      <Animated.View style={[inp.wrap, { borderColor, backgroundColor: bgColor }, multiline && { height: height || 96, alignItems: "flex-start" }, error && !focused && { borderColor: C.danger }]}>
        {!!icon && (
          <View style={[inp.iconBox, focused && inp.iconBoxFocus, multiline && { marginTop: 10 }]}>
            <Ionicons name={icon} size={15} color={focused ? C.primary : error ? C.danger : C.muted} />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          keyboardType={keyboardType || "default"}
          autoCapitalize="none"
          multiline={multiline}
          style={[inp.input, multiline && { paddingTop: 12, textAlignVertical: "top" }]}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </Animated.View>
      {!!error && <Text style={inp.errorTxt}>{error}</Text>}
    </View>
  );
};

const inp = StyleSheet.create({
  container:    { marginBottom: 14 },
  label:        { fontSize: 11, fontWeight: "700", color: C.inkMid, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginLeft: 2 },
  wrap:         { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1.5, minHeight: 54, paddingHorizontal: 8, gap: 6 },
  iconBox:      { width: 34, height: 34, borderRadius: 10, backgroundColor: C.overlay, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconBoxFocus: { backgroundColor: C.primaryLight },
  input:        { flex: 1, fontSize: 14.5, color: C.ink, fontFamily: F.body, fontWeight: "500", paddingVertical: 0 },
  errorTxt:     { fontSize: 10, color: C.danger, fontWeight: "700", marginTop: 4, marginLeft: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle }) => (
  <View style={sh.row}>
    <LinearGradient colors={[C.primary, C.primaryDark]} style={sh.iconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={icon} size={14} color="#FFF" />
    </LinearGradient>
    <View>
      <Text style={sh.title}>{title}</Text>
      {!!subtitle && <Text style={sh.subtitle}>{subtitle}</Text>}
    </View>
  </View>
);

const sh = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  iconBox:  { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 14, fontWeight: "900", color: C.ink, fontFamily: F.display },
  subtitle: { fontSize: 11, color: C.muted, fontWeight: "600", marginTop: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE THUMBNAIL CARD
// ─────────────────────────────────────────────────────────────────────────────
const ThumbCard = ({ uri, onRemove, onReplace }) => (
  <View style={tc.wrap}>
    <Image source={{ uri }} style={tc.img} />
    <View style={tc.overlay}>
      <TouchableOpacity style={tc.replaceBtn} onPress={onReplace} activeOpacity={0.8}>
        <Ionicons name="swap-horizontal" size={13} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity style={tc.removeBtn} onPress={onRemove} activeOpacity={0.8}>
        <Ionicons name="close" size={13} color="#FFF" />
      </TouchableOpacity>
    </View>
  </View>
);

const tc = StyleSheet.create({
  wrap:       { marginRight: 10, position: "relative" },
  img:        { width: 90, height: 90, borderRadius: 14, backgroundColor: C.border },
  overlay:    { position: "absolute", top: 5, right: 5, flexDirection: "column", gap: 5 },
  replaceBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" },
  removeBtn:  { width: 26, height: 26, borderRadius: 8, backgroundColor: C.danger, alignItems: "center", justifyContent: "center" },
});

// ─────────────────────────────────────────────────────────────────────────────
// GENRE CHIP
// ─────────────────────────────────────────────────────────────────────────────
const GenreChip = ({ label, active, onPress, accentColor }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  const color = accentColor || C.primary;

  return (
    <TouchableOpacity onPressIn={onIn} onPressOut={onOut} onPress={onPress} activeOpacity={1}>
      <Animated.View style={[
        gc.chip,
        active && { backgroundColor: color + "18", borderColor: color },
        { transform: [{ scale }] },
      ]}>
        {active && <Ionicons name="checkmark-circle" size={13} color={color} />}
        <Text style={[gc.txt, active && { color, fontWeight: "800" }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const gc = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8, backgroundColor: C.white },
  txt:  { fontSize: 13, fontWeight: "600", color: C.inkMid },
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT FORM
// ─────────────────────────────────────────────────────────────────────────────
const ProductForm = ({ route, navigation }) => {
  const item = route.params?.item || null;

  // ── State (unchanged) ──
  const [name,          setName]          = useState(item?.name || "");
  const [author,        setAuthor]        = useState(item?.author || item?.brand || "");
  const [price,         setPrice]         = useState(item?.price ? String(item.price) : "");
  const [countInStock,  setCountInStock]  = useState(item?.countInStock !== undefined ? String(item.countInStock) : "");
  const [lowStockThreshold, setLowStockThreshold] = useState(item?.lowStockThreshold !== undefined ? String(item.lowStockThreshold) : "5");
  const [description,   setDescription]  = useState(item?.description || "");
  const [existingImages,setExistingImages]= useState(() => {
    if (Array.isArray(item?.images) && item.images.length) return item.images;
    if (item?.image) return [item.image];
    return [];
  });
  const [pickedImages,  setPickedImages]  = useState([]);

  const initialSubGenres = useMemo(() => {
    if (Array.isArray(item?.subGenres) && item.subGenres.length)
      return item.subGenres.map((g) => g?.id || g?._id || g).filter(Boolean).slice(0, 3);
    if (!item?.category) return [];
    const fallback = item.category.id || item.category._id || item.category;
    return fallback ? [fallback] : [];
  }, [item]);

  const initialMainGenreId = useMemo(() => {
    if (item?.genre) return item.genre.id || item.genre._id || item.genre;
    if (item?.category?.parent) return item.category.parent.id || item.category.parent._id || item.category.parent;
    return "";
  }, [item]);

  const [mainGenre,  setMainGenre]  = useState(initialMainGenreId);
  const [subGenres,  setSubGenres]  = useState(initialSubGenres);
  const [categories, setCategories] = useState([]);

  // Validation state
  const [errors, setErrors] = useState({});

  const mainGenres = useMemo(
    () => categories.filter((c) => !subGenres.includes(c.id || c._id)),
    [categories, subGenres]
  );
  const availableSubGenres = useMemo(
    () => categories.filter((c) => (c.id || c._id) !== mainGenre),
    [categories, mainGenre]
  );

  // ── Backend (all unchanged) ──
  useEffect(() => {
    axios.get(`${baseURL}categories?includeSubgenres=1`)
      .then((res) => setCategories(res.data || []))
      .catch(() => Toast.show({ type: "error", text1: "Failed to load genres", topOffset: 60 }));
  }, []);

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") { Toast.show({ type: "error", text1: "Permission denied", text2: "Allow photo access to upload images", topOffset: 60 }); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, allowsMultipleSelection: true, selectionLimit: 8, quality: 0.6 });
      if (result.canceled || !result.assets?.length) return;
      const totalNow = existingImages.length + pickedImages.length;
      const remainingSlots = MAX_TOTAL_IMAGES - totalNow;
      if (remainingSlots <= 0) { Toast.show({ type: "error", text1: "Image limit reached", text2: `Maximum ${MAX_TOTAL_IMAGES} images per product`, topOffset: 60 }); return; }
      const toAdd = result.assets.slice(0, remainingSlots);
      setPickedImages((prev) => [...prev, ...toAdd]);
      if (toAdd.length < result.assets.length) Toast.show({ type: "error", text1: "Some images were skipped", text2: `Maximum ${MAX_TOTAL_IMAGES} images per product`, topOffset: 60 });
    } catch { Toast.show({ type: "error", text1: "Image selection failed", topOffset: 60 }); }
  };

  const pickSingleImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") { Toast.show({ type: "error", text1: "Permission denied", text2: "Allow photo access to update images", topOffset: 60 }); return null; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0];
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") { Toast.show({ type: "error", text1: "Permission denied", text2: "Allow camera access to capture images", topOffset: 60 }); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      if (result.canceled || !result.assets?.length) return;
      const totalNow = existingImages.length + pickedImages.length;
      if (totalNow >= MAX_TOTAL_IMAGES) { Toast.show({ type: "error", text1: "Image limit reached", text2: `Maximum ${MAX_TOTAL_IMAGES} images per product`, topOffset: 60 }); return; }
      setPickedImages((prev) => [...prev, ...result.assets]);
    } catch { Toast.show({ type: "error", text1: "Camera capture failed", topOffset: 60 }); }
  };

  const removeExistingImage = (index) => setExistingImages((prev) => prev.filter((_, i) => i !== index));
  const removePickedImage   = (index) => setPickedImages((prev) => prev.filter((_, i) => i !== index));

  const replaceExistingImage = async (index) => {
    try {
      const replacement = await pickSingleImage();
      if (!replacement) return;
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
      setPickedImages((prev) => [...prev, replacement]);
      Toast.show({ type: "success", text1: "Image replaced", topOffset: 60 });
    } catch { Toast.show({ type: "error", text1: "Replace failed", topOffset: 60 }); }
  };

  const replacePickedImage = async (index) => {
    try {
      const replacement = await pickSingleImage();
      if (!replacement) return;
      setPickedImages((prev) => prev.map((img, i) => (i === index ? replacement : img)));
      Toast.show({ type: "success", text1: "Image replaced", topOffset: 60 });
    } catch { Toast.show({ type: "error", text1: "Replace failed", topOffset: 60 }); }
  };

  const save = async () => {
    const newErrors = {};
    if (!name.trim())    newErrors.name = "Title is required";
    if (!author.trim())  newErrors.author = "Author is required";
    if (!price.trim())   newErrors.price = "Price is required";
    if (!mainGenre)      newErrors.mainGenre = "Please select a main genre";
    if (!description.trim()) newErrors.description = "Description is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Toast.show({ type: "error", text1: "Validation failed", text2: "Please fill in all required fields", topOffset: 60 });
      return;
    }

    if (subGenres.length > 3) { Toast.show({ type: "error", text1: "Too many sub genres", text2: "Maximum of 3 sub genres only", topOffset: 60 }); return; }
    try {
      const token = await AsyncStorage.getItem("jwt");
      const sendMultipart = async (url, formData) => {
        const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        const raw = await response.text();
        let parsed = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { message: raw || "Invalid server response" }; }
        if (!response.ok) throw new Error(parsed?.message || `Upload failed (${response.status})`);
        return parsed;
      };
      const makePayload = (existingImagesValue, imagesBatch = []) => {
        const payload = new FormData();
        payload.append("name", name); payload.append("author", author); payload.append("brand", author);
        payload.append("description", description); payload.append("genre", mainGenre);
        payload.append("subGenres", JSON.stringify(subGenres)); payload.append("category", subGenres[0] || mainGenre);
        payload.append("price", String(Number(price))); 
        payload.append("countInStock", String(Number(countInStock || 0)));
        payload.append("lowStockThreshold", String(Number(lowStockThreshold || 0)));
        payload.append("isFeatured", "false"); payload.append("existingImages", JSON.stringify(existingImagesValue));
        imagesBatch.forEach((asset, index) => {
          payload.append("images", { uri: asset.uri, name: asset.fileName || `product-${Date.now()}-${index}.jpg`, type: asset.mimeType || "image/jpeg" });
        });
        return payload;
      };
      let currentExistingImages = [...existingImages];
      let uploadedProductId = item?.id || item?._id || null;
      const pendingImages = [...pickedImages];
      if (uploadedProductId) {
        if (!pendingImages.length) { await sendMultipart(`${baseURL}products/${uploadedProductId}`, makePayload(currentExistingImages, [])); }
        else { for (let i = 0; i < pendingImages.length; i += MAX_UPLOAD_BATCH) { const batch = pendingImages.slice(i, i + MAX_UPLOAD_BATCH); const response = await sendMultipart(`${baseURL}products/${uploadedProductId}`, makePayload(currentExistingImages, batch)); currentExistingImages = response?.images || currentExistingImages; } }
        Toast.show({ type: "success", text1: "Product updated", topOffset: 60 });
      } else {
        const firstBatch = pendingImages.slice(0, MAX_UPLOAD_BATCH);
        const createResponse = await sendMultipart(`${baseURL}products`, makePayload(currentExistingImages, firstBatch));
        uploadedProductId = createResponse?.id || createResponse?._id;
        currentExistingImages = createResponse?.images || currentExistingImages;
        for (let i = MAX_UPLOAD_BATCH; i < pendingImages.length; i += MAX_UPLOAD_BATCH) { const batch = pendingImages.slice(i, i + MAX_UPLOAD_BATCH); const response = await sendMultipart(`${baseURL}products/${uploadedProductId}`, makePayload(currentExistingImages, batch)); currentExistingImages = response?.images || currentExistingImages; }
        Toast.show({ type: "success", text1: "Product created", topOffset: 60 });
        navigation.goBack();
      }
    } catch (error) { Toast.show({ type: "error", text1: "Save failed", text2: error?.message || "Upload failed", topOffset: 60 }); }
  };

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  const totalImages = existingImages.length + pickedImages.length;

  return (
    <View style={s.screen}>

      {/* ══ HERO HEADER ══ */}
      <LinearGradient
        colors={[C.primaryDeep, C.primaryDark, C.primary, C.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.1 }}
        style={s.hero}
      >
        <FloatingOrb size={140} color="rgba(255,255,255,0.07)" style={{ top: -45, right: -35 }} delay={0} />
        <FloatingOrb size={70}  color="rgba(255,255,255,0.09)" style={{ bottom: 0, left: -20 }}  delay={900} />

        <FadeUp delay={0}>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>{item ? "Editing" : "New Product"}</Text>
              <Text style={s.heroTitle}>{item ? item.name : "Add Product"}</Text>
            </View>
            <TouchableOpacity style={s.menuBtn} onPress={openDrawer} activeOpacity={0.8}>
              <Ionicons name="menu" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </FadeUp>
      </LinearGradient>

      {/* ══ SCROLL FORM ══ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── IMAGES SECTION ── */}
        <FadeUp delay={60} style={s.card}>
          <SectionHeader icon="images-outline" title="Product Images" subtitle={`${totalImages} / ${MAX_TOTAL_IMAGES} images added`} />

          {/* Image strip */}
          {totalImages > 0 && (
            <FlatList
              horizontal
              data={[
                ...existingImages.map((uri, index) => ({ type: "existing", uri, index })),
                ...pickedImages.map((asset, index) => ({ type: "picked", uri: asset.uri, index })),
              ]}
              keyExtractor={(img, idx) => `${img.type}-${img.uri}-${idx}`}
              contentContainerStyle={s.imageStrip}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: img }) => (
                <ThumbCard
                  uri={img.uri}
                  onRemove={() => img.type === "existing" ? removeExistingImage(img.index) : removePickedImage(img.index)}
                  onReplace={() => img.type === "existing" ? replaceExistingImage(img.index) : replacePickedImage(img.index)}
                />
              )}
            />
          )}

          {/* Add image buttons */}
          <View style={s.imagePickerRow}>
            <TouchableOpacity style={s.imagePickerBtn} onPress={pickImage} activeOpacity={0.8}>
              <LinearGradient colors={[C.primaryLight, C.primaryLight]} style={s.imagePickerBtnInner}>
                <Ionicons name="images-outline" size={18} color={C.primary} />
                <Text style={s.imagePickerBtnTxt}>Gallery</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={s.imagePickerBtn} onPress={takePhoto} activeOpacity={0.8}>
              <LinearGradient colors={[C.primaryLight, C.primaryLight]} style={s.imagePickerBtnInner}>
                <Ionicons name="camera-outline" size={18} color={C.primary} />
                <Text style={s.imagePickerBtnTxt}>Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </FadeUp>

        {/* ── BOOK DETAILS ── */}
        <FadeUp delay={120} style={s.card}>
          <SectionHeader icon="book-outline" title="Book Details" />
          <InputField icon="text-outline"       label="Title"         placeholder="Book title"        value={name}         onChange={(v) => { setName(v); setErrors(p => ({ ...p, name: null })); }} error={errors.name} />
          <InputField icon="person-outline"     label="Author"        placeholder="Author name"       value={author}       onChange={(v) => { setAuthor(v); setErrors(p => ({ ...p, author: null })); }} error={errors.author} />
          <InputField icon="document-text-outline" label="Description" placeholder="Write a short description…" value={description} onChange={(v) => { setDescription(v); setErrors(p => ({ ...p, description: null })); }} multiline height={100} error={errors.description} />
        </FadeUp>

        {/* ── PRICING & STOCK ── */}
        <FadeUp delay={180} style={s.card}>
          <SectionHeader icon="pricetag-outline" title="Pricing & Stock" />
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <InputField icon="cash-outline"    label="Price (₱)"    placeholder="0.00"  value={price}        onChange={(v) => { setPrice(v); setErrors(p => ({ ...p, price: null })); }} keyboardType="decimal-pad" error={errors.price} />
            </View>
            <View style={{ flex: 1 }}>
              <InputField icon="layers-outline"  label="Stock"         placeholder="0"     value={countInStock} onChange={setCountInStock}  keyboardType="numeric" />
            </View>
          </View>
          <InputField 
            icon="notifications-outline"  
            label="Low Stock Alert Threshold" 
            placeholder="5"     
            value={lowStockThreshold} 
            onChange={setLowStockThreshold}  
            keyboardType="numeric" 
          />
          <Text style={s.hintTxt}>Admins will be notified when stock falls below this number.</Text>
        </FadeUp>

        {/* ── MAIN GENRE ── */}
        <FadeUp delay={240} style={s.card}>
          <SectionHeader icon="bookmark-outline" title="Main Genre" subtitle="Select exactly one" />
          <View style={s.chipWrap}>
            {mainGenres.map((c) => {
              const id = c.id || c._id;
              return (
                <GenreChip
                  key={id}
                  label={c.name}
                  active={mainGenre === id}
                  accentColor={mainGenre === id ? C.primary : errors.mainGenre ? C.danger : C.primary}
                  onPress={() => { setMainGenre(id); setSubGenres((prev) => prev.filter((x) => x !== id)); setErrors(p => ({ ...p, mainGenre: null })); }}
                />
              );
            })}
          </View>
          {!!errors.mainGenre && <Text style={s.errorTxtSmall}>{errors.mainGenre}</Text>}
        </FadeUp>

        {/* ── SUB GENRES ── */}
        <FadeUp delay={300} style={s.card}>
          <SectionHeader icon="bookmarks-outline" title="Sub Genres" subtitle={`Optional · ${subGenres.length}/3 selected`} />
          <View style={s.chipWrap}>
            {availableSubGenres.map((c) => {
              const id = c.id || c._id;
              const active = subGenres.includes(id);
              return (
                <GenreChip
                  key={id}
                  label={c.name}
                  active={active}
                  accentColor={C.primaryDark}
                  onPress={() => {
                    setSubGenres((prev) => {
                      if (prev.includes(id)) return prev.filter((x) => x !== id);
                      if (prev.length >= 3) { Toast.show({ type: "error", text1: "Maximum reached", text2: "You can select up to 3 sub genres", topOffset: 60 }); return prev; }
                      return [...prev, id];
                    });
                  }}
                />
              );
            })}
          </View>
        </FadeUp>

        {/* ── SAVE BUTTON ── */}
        <FadeUp delay={360} style={s.saveWrap}>
          <TouchableOpacity onPress={save} activeOpacity={0.86} style={s.saveBtn}>
            <LinearGradient
              colors={[C.primaryGlow, C.primary, C.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.saveBtnGradient}
            >
              <Ionicons name={item ? "checkmark-done-outline" : "add-circle-outline"} size={20} color="#FFF" />
              <Text style={s.saveBtnTxt}>{item ? "Update Product" : "Create Product"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </FadeUp>

      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    paddingTop:        Platform.OS === "ios" ? 62 : 46,
    paddingBottom:     26,
    paddingHorizontal: 20,
    overflow:          "hidden",
  },
  heroNav:     { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:     { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  menuBtn:     { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  heroEyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.62)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  heroTitle:   { fontSize: 20, fontWeight: "900", fontFamily: F.display, color: "#FFF", letterSpacing: 0.1 },

  // Scroll
  scroll: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40 },

  // Section cards
  card: {
    backgroundColor: C.white,
    borderRadius:    24,
    borderWidth:     1,
    borderColor:     C.border,
    padding:         18,
    marginBottom:    14,
    shadowColor:     C.primaryDark,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.08,
    shadowRadius:    14,
    elevation:       4,
  },

  // Images
  imageStrip:       { paddingBottom: 14 },
  imagePickerRow:   { flexDirection: "row", gap: 12 },
  imagePickerBtn:   { flex: 1, borderRadius: 14, overflow: "hidden", borderWidth: 1.5, borderColor: C.border },
  imagePickerBtnInner:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  imagePickerBtnTxt:{ fontSize: 13, fontWeight: "800", color: C.primary },

  // Two-column row for price + stock
  twoCol: { flexDirection: "row", gap: 12 },
  hintTxt: { fontSize: 11, color: C.muted, fontWeight: "500", marginTop: -8, marginBottom: 10, marginLeft: 2 },

  // Genre chips
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },

  errorTxtSmall: { fontSize: 10, color: C.danger, fontWeight: "700", marginTop: 4, marginLeft: 2 },

  // Save button
  saveWrap:         { marginBottom: 8 },
  saveBtn:          { borderRadius: 20, overflow: "hidden", shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.40, shadowRadius: 14, elevation: 8 },
  saveBtnGradient:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  saveBtnTxt:       { fontSize: 16, fontWeight: "900", color: "#FFF", letterSpacing: 0.3 },
});

export default ProductForm;