import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import baseURL from "../../assets/common/baseurl";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { setCurrentUser } from "../../Context/Actions/Auth.actions";

const { width: SW } = Dimensions.get("window");

const FALLBACK_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

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
  inputBg:      "#FAF6F1",
  danger:       "#EF4444",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS  (unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseBirthday = (value) => {
  if (!value) return new Date();
  const p = new Date(value);
  return isNaN(p.getTime()) ? new Date() : p;
};

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 440, delay, useNativeDriver: true }),
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
// FIELD  — icon + label + input in one row
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({ icon, label, children, error }) => (
  <View style={f.row}>
    <View style={[f.iconWrap, error && { backgroundColor: C.dangerLight }]}>
      <Ionicons name={icon} size={16} color={error ? C.danger : C.primary} />
    </View>
    <View style={f.body}>
      <Text style={[f.label, error && { color: C.danger }]}>{label}</Text>
      {children}
      {!!error && <Text style={f.errorTxt}>{error}</Text>}
    </View>
  </View>
);

const f = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  iconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center", marginTop: 2 },
  body:    { flex: 1 },
  label:   { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  errorTxt: { fontSize: 10, color: C.danger, fontWeight: "700", marginTop: 4, marginLeft: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD  — grouped fields
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon, children, delay = 0 }) => (
  <FadeUp delay={delay} style={sc.wrap}>
    <View style={sc.header}>
      <View style={sc.bar} />
      <Ionicons name={icon} size={15} color={C.primary} />
      <Text style={sc.title}>{title}</Text>
    </View>
    <View style={sc.body}>{children}</View>
  </FadeUp>
);

const sc = StyleSheet.create({
  wrap:   { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  bar:    { width: 4, height: 18, borderRadius: 2, backgroundColor: C.primary },
  title:  { fontSize: 14, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  body:   { padding: 12, paddingBottom: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// TEXT INPUT STYLE  (shared)
// ─────────────────────────────────────────────────────────────────────────────
const inputStyle = {
  backgroundColor: C.inputBg,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: C.border,
  paddingHorizontal: 14,
  height: 44,
  fontSize: 14,
  color: C.ink,
  fontWeight: "500",
};

// ─────────────────────────────────────────────────────────────────────────────
// EDIT PROFILE
// ─────────────────────────────────────────────────────────────────────────────
const EditProfile = ({ navigation }) => {
  const context = useContext(AuthGlobal);
  const profile = context?.stateUser?.userProfile || {};

  const [name,               setName]               = useState(profile.name || "");
  const [email,              setEmail]              = useState(profile.email || "");
  const [phone,              setPhone]              = useState(profile.phone || "");
  const [birthday,           setBirthday]           = useState(profile.birthday || "");
  const [address,            setAddress]            = useState(profile.address || "");
  const [avatar,             setAvatar]             = useState(profile.avatar || "");
  const [pickedAvatar,       setPickedAvatar]       = useState(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [loading,            setLoading]            = useState(false);

  // Validation state
  const [errors, setErrors] = useState({});

  // Avatar ring pulse on press
  const avatarPulse = useRef(new Animated.Value(1)).current;
  const pulseAvatar = () => {
    Animated.sequence([
      Animated.spring(avatarPulse, { toValue: 0.93, useNativeDriver: true, damping: 10 }),
      Animated.spring(avatarPulse, { toValue: 1.0,  useNativeDriver: true, damping: 10 }),
    ]).start();
  };

  // ── Load profile (unchanged) ──────────────────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("jwt");
        const res = await axios.get(`${baseURL}users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setName(res.data?.name || "");
        setEmail(res.data?.email || "");
        setPhone(res.data?.phone || "");
        setBirthday(res.data?.birthday || "");
        setAddress(res.data?.address || "");
        setAvatar(res.data?.avatar || "");
      } catch (_) {}
    };
    loadProfile();
  }, []);

  // ── Image pickers (unchanged) ──────────────────────────────────────────────
  const chooseFromGallery = async () => {
    pulseAvatar();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Toast.show({ type: "error", text1: "Permission denied", text2: "Allow photo access to update avatar", topOffset: 60 });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setPickedAvatar(asset);
    setAvatar(asset.uri);
  };

  const takePhoto = async () => {
    pulseAvatar();
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Toast.show({ type: "error", text1: "Permission denied", text2: "Allow camera access to take profile photo", topOffset: 60 });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setPickedAvatar(asset);
      setAvatar(asset.uri);
    } catch (_) {
      Toast.show({ type: "error", text1: "Camera unavailable", text2: "Use Upload Photo when camera is not available", topOffset: 60 });
    }
  };

  // ── Save (unchanged) ──────────────────────────────────────────────────────
  const save = async () => {
    const cleanName    = String(name || "").trim();
    const cleanEmail   = String(email || "").toLowerCase().trim();
    const cleanPhone   = String(phone || "").trim();
    const cleanBirthday = String(birthday || "").trim();
    const cleanAddress = String(address || "").trim();

    const newErrors = {};
    if (!cleanName)    newErrors.name    = "Name is required";
    if (!cleanEmail)   newErrors.email   = "Email is required";
    if (!cleanPhone)   newErrors.phone   = "Phone is required";
    if (!cleanBirthday) newErrors.birthday = "Birthday is required";
    if (!cleanAddress) newErrors.address  = "Address is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Toast.show({ type: "error", text1: "Validation failed", text2: "Please fill in all required fields", topOffset: 60 });
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("jwt");
      let responseData;

      if (pickedAvatar?.uri) {
        const payload = new FormData();
        payload.append("name", cleanName);
        payload.append("email", cleanEmail);
        payload.append("phone", cleanPhone);
        payload.append("birthday", cleanBirthday);
        payload.append("address", cleanAddress);
        payload.append("avatar", {
          uri: pickedAvatar.uri,
          name: pickedAvatar.fileName || `avatar-${Date.now()}.jpg`,
          type: pickedAvatar.mimeType || "image/jpeg",
        });
        const response = await fetch(`${baseURL}users/profile`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: payload,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Please try again");
        responseData = data;
      } else {
        const res = await axios.post(
          `${baseURL}users/profile`,
          { name: cleanName, email: cleanEmail, phone: cleanPhone, birthday: cleanBirthday, address: cleanAddress, avatar },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        responseData = res.data;
      }

      const updatedProfile = {
        userId:   responseData.id,
        name:     responseData.name,
        email:    responseData.email,
        phone:    responseData.phone,
        birthday: responseData.birthday,
        address:  responseData.address,
        avatar:   responseData.avatar,
        isAdmin:  responseData.isAdmin,
      };

      await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      context.dispatch(setCurrentUser(context.stateUser.user, updatedProfile));
      Toast.show({ type: "success", text1: "Profile updated", topOffset: 60 });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: "error", text1: "Update failed", text2: err?.response?.data?.message || err?.message || "Please try again", topOffset: 60 });
    } finally {
      setLoading(false);
    }
  };

  // ── Birthday picker (unchanged) ───────────────────────────────────────────
  const onBirthdayChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowBirthdayPicker(false);
    if (event?.type === "dismissed" || !selectedDate) return;
    setBirthday(formatDate(selectedDate));
  };

  return (
    <View style={s.screen}>
      {/* ── FLOATING BACK BUTTON ── */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color={C.ink} />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO AVATAR SECTION ── */}
        <FadeUp delay={0}>
          <LinearGradient
            colors={[C.primaryLight, C.bg]}
            style={s.heroGrad}
          >
            {/* Large avatar with ring */}
            <Animated.View style={[s.avatarRingOuter, { transform: [{ scale: avatarPulse }] }]}>
              <LinearGradient
                colors={[C.primary, C.gold, C.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.avatarRing}
              >
                <Image
                  source={{ uri: avatar || FALLBACK_AVATAR }}
                  style={s.avatar}
                />
              </LinearGradient>
            </Animated.View>

            {/* Change photo badge */}
            <View style={s.changeBadge}>
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>

            {/* Name display */}
            <Text style={s.heroName}>{name || "Your Name"}</Text>
            <Text style={s.heroEmail}>{email || "your@email.com"}</Text>

            {/* Photo action buttons */}
            <View style={s.photoActions}>
              <TouchableOpacity style={s.photoBtn} onPress={chooseFromGallery} activeOpacity={0.82}>
                <Ionicons name="images-outline" size={15} color={C.primary} />
                <Text style={s.photoBtnTxt}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.photoBtn} onPress={takePhoto} activeOpacity={0.82}>
                <Ionicons name="camera-outline" size={15} color={C.primary} />
                <Text style={s.photoBtnTxt}>Camera</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </FadeUp>

        {/* ── PAGE TITLE ── */}
        <FadeUp delay={60} style={s.titleBlock}>
          <View style={s.titleRow}>
            <View style={s.titleBar} />
            <Text style={s.pageTitle}>Edit Profile</Text>
          </View>
          <Text style={s.pageSubtitle}>Keep your information up to date</Text>
        </FadeUp>

        {/* ── BASIC INFO CARD ── */}
        <SectionCard title="Basic Info" icon="person-outline" delay={120}>
          <Field icon="person" label="Full Name" error={errors.name}>
            <TextInput
              value={name}
              onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: null })); }}
              placeholder="Your full name"
              placeholderTextColor={C.muted}
              style={[inputStyle, errors.name && { borderColor: C.danger }]}
            />
          </Field>
          <Field icon="mail" label="Email Address" error={errors.email}>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: null })); }}
              placeholder="your@email.com"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[inputStyle, errors.email && { borderColor: C.danger }]}
            />
          </Field>
        </SectionCard>

        {/* ── CONTACT CARD ── */}
        <SectionCard title="Contact & Personal" icon="call-outline" delay={180}>
          <Field icon="call" label="Phone Number" error={errors.phone}>
            <TextInput
              value={phone}
              onChangeText={(v) => { setPhone(v); setErrors(p => ({ ...p, phone: null })); }}
              placeholder="+63 900 000 0000"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              style={[inputStyle, errors.phone && { borderColor: C.danger }]}
            />
          </Field>

          <Field icon="gift" label="Birthday" error={errors.birthday}>
            <TouchableOpacity
              style={[inputStyle, s.dateTouchable, errors.birthday && { borderColor: C.danger }]}
              onPress={() => setShowBirthdayPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={birthday ? s.dateValue : s.datePlaceholder}>
                {birthday || "Select your birthday"}
              </Text>
              <Ionicons name="calendar-outline" size={16} color={C.muted} />
            </TouchableOpacity>

            {showBirthdayPicker && (
              <View style={s.pickerWrap}>
                <DateTimePicker
                  value={parseBirthday(birthday)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={onBirthdayChange}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={s.doneBtn}
                    onPress={() => setShowBirthdayPicker(false)}
                  >
                    <Text style={s.doneBtnTxt}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Field>
        </SectionCard>

        {/* ── ADDRESS CARD ── */}
        <SectionCard title="Delivery Address" icon="location-outline" delay={240}>
          <Field icon="home" label="Full Address" error={errors.address}>
            <TextInput
              value={address}
              onChangeText={(v) => { setAddress(v); setErrors(p => ({ ...p, address: null })); }}
              placeholder="Street, City, Province, ZIP"
              placeholderTextColor={C.muted}
              multiline
              textAlignVertical="top"
              style={[inputStyle, { height: 90, paddingTop: 12 }, errors.address && { borderColor: C.danger }]}
            />
          </Field>
        </SectionCard>

        {/* ── SPACER for sticky button ── */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── STICKY SAVE BAR ── */}
      <View style={s.stickyBar}>
        <View style={s.stickyInfo}>
          <Text style={s.stickyLabel}>Editing as</Text>
          <Text style={s.stickyName} numberOfLines={1}>{name || "—"}</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, loading && s.saveBtnDisabled]}
          onPress={save}
          disabled={loading}
          activeOpacity={0.86}
        >
          {loading ? (
            <>
              <Ionicons name="hourglass-outline" size={16} color="#FFF" />
              <Text style={s.saveBtnTxt}>Saving…</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
              <Text style={s.saveBtnTxt}>Save Profile</Text>
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
  scroll: { paddingHorizontal: 12, paddingBottom: 20 },

  // Back button
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,250,246,0.95)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 4,
  },

  // Hero avatar section
  heroGrad: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 110 : 94,
    paddingBottom: 28,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  avatarRingOuter: { position: "relative", marginBottom: 14 },
  avatarRing: {
    width: 116, height: 116, borderRadius: 58,
    padding: 3, alignItems: "center", justifyContent: "center",
  },
  avatar: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: C.border,
  },
  changeBadge: {
    position: "absolute",
    // relative to avatarRingOuter — we position with marginTop trick
    // instead since Animated.View wrapper makes absolute tricky
    marginTop: -34, marginLeft: 80,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: C.white,
    zIndex: 2,
  },
  heroName:  { fontSize: 22, fontWeight: "900", fontFamily: F.serif, color: C.ink, marginBottom: 3 },
  heroEmail: { fontSize: 13, color: C.muted, fontWeight: "600", marginBottom: 18 },

  photoActions: { flexDirection: "row", gap: 12 },
  photoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.primary,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  photoBtnTxt: { fontSize: 13, fontWeight: "800", color: C.primary },

  // Page title
  titleBlock:   { paddingHorizontal: 4, paddingBottom: 12 },
  titleRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  titleBar:     { width: 4, height: 26, borderRadius: 2, backgroundColor: C.primary },
  pageTitle:    { fontSize: 24, fontWeight: "900", fontFamily: F.serif, color: C.ink },
  pageSubtitle: { fontSize: 13, color: C.muted, fontWeight: "500", paddingLeft: 14 },

  // Date touchable
  dateTouchable: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 44,
  },
  dateValue:      { fontSize: 14, color: C.ink, fontWeight: "500" },
  datePlaceholder:{ fontSize: 14, color: C.muted },

  // Birthday picker
  pickerWrap: {
    marginTop: 6,
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
  },
  doneBtn: {
    alignSelf: "flex-end",
    margin: 10,
    backgroundColor: C.primary,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 12,
  },
  doneBtnTxt: { color: "#FFF", fontWeight: "800", fontSize: 13 },

  // Sticky save bar
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
  stickyInfo:  { gap: 2, flex: 1, marginRight: 16 },
  stickyLabel: { fontSize: 10, color: C.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  stickyName:  { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.serif },

  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.42, shadowRadius: 10, elevation: 7,
  },
  saveBtnDisabled: { backgroundColor: C.muted, shadowOpacity: 0 },
  saveBtnTxt:      { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 0.3 },
});

export default EditProfile;