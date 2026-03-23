import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";

import baseURL from "../../assets/common/baseurl";

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
  green:        "#22C55E",
  greenLight:   "#DCFCE7",
  amber:        "#F59E0B",
  amberLight:   "#FEF3C7",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD STRENGTH
// ─────────────────────────────────────────────────────────────────────────────
function getStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: C.border, bars: 0 };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: "Weak",   color: C.danger, bars: 1 };
  if (score <= 2) return { score, label: "Fair",   color: C.amber,  bars: 2 };
  if (score <= 3) return { score, label: "Good",   color: C.gold,   bars: 3 };
  if (score <= 4) return { score, label: "Strong", color: C.green,  bars: 4 };
  return              { score, label: "Excellent", color: C.green,  bars: 5 };
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 460, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 15, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD FIELD
// ─────────────────────────────────────────────────────────────────────────────
const PasswordField = ({ icon, label, value, onChange, showStrength, error }) => {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused]  = useState(false);
  const strength = showStrength ? getStrength(value) : null;
  const borderColor = focused ? C.primary : error ? C.danger : C.border;

  return (
    <View style={pf.wrap}>
      {/* Label row */}
      <View style={pf.labelRow}>
        <Ionicons name={icon} size={12} color={error ? C.danger : C.muted} />
        <Text style={[pf.label, error && { color: C.danger }]}>{label}</Text>
        {strength && value.length > 0 && (
          <Text style={[pf.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        )}
      </View>

      {/* Input */}
      <View style={[pf.inputWrap, { borderColor }, focused && pf.inputWrapFocused, error && !focused && { borderColor: C.danger }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          style={pf.input}
          placeholder="••••••••"
          placeholderTextColor={C.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          style={pf.eyeBtn}
        >
          <Ionicons
            name={visible ? "eye" : "eye-off-outline"}
            size={18}
            color={focused ? C.primary : error ? C.danger : C.muted}
          />
        </TouchableOpacity>
      </View>

      {/* Strength bars */}
      {strength && value.length > 0 && (
        <View style={pf.barsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                pf.bar,
                { backgroundColor: i <= strength.bars ? strength.color : C.border },
              ]}
            />
          ))}
        </View>
      )}
      {!!error && <Text style={pf.errorTxt}>{error}</Text>}
    </View>
  );
};

const pf = StyleSheet.create({
  wrap:       { marginBottom: 16 },
  labelRow:   { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 7 },
  label:      { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.9, flex: 1 },
  strengthLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  inputWrap:  {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, height: 50,
  },
  inputWrapFocused: { backgroundColor: C.white, borderColor: C.primary },
  input:      { flex: 1, fontSize: 16, color: C.ink, fontWeight: "500", letterSpacing: 1 },
  eyeBtn:     { paddingLeft: 8 },
  barsRow:    { flexDirection: "row", gap: 4, marginTop: 7 },
  bar:        { flex: 1, height: 4, borderRadius: 2 },
  errorTxt:   { fontSize: 10, color: C.danger, fontWeight: "700", marginTop: 4, marginLeft: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT ROW
// ─────────────────────────────────────────────────────────────────────────────
const Req = ({ met, label }) => (
  <View style={rq.row}>
    <View style={[rq.dot, met && rq.dotMet]}>
      <Ionicons name={met ? "checkmark" : "remove"} size={9} color={met ? "#FFF" : C.muted} />
    </View>
    <Text style={[rq.txt, met && rq.txtMet]}>{label}</Text>
  </View>
);

const rq = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 },
  dot:    { width: 16, height: 16, borderRadius: 8, backgroundColor: C.border, alignItems: "center", justifyContent: "center" },
  dotMet: { backgroundColor: C.green },
  txt:    { fontSize: 12, color: C.muted, fontWeight: "500" },
  txtMet: { color: C.green, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
const ChangePassword = ({ navigation }) => {
  const [oldPassword,        setOldPassword]        = useState("");
  const [newPassword,        setNewPassword]        = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp,                setOtp]                = useState("");
  const [showOtpInput,       setShowOtpInput]       = useState(false);
  const [loading,            setLoading]            = useState(false);

  // Validation state
  const [errors, setErrors] = useState({});

  // Hero lock animation
  const lockScale = useRef(new Animated.Value(0)).current;
  const lockOp    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(lockOp,    { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(lockScale, { toValue: 1, damping: 12, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  // ── OTP Request ──────────────────────────────────────────────────────────
  const requestOTP = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("jwt");
      await axios.post(`${baseURL}users/request-password-otp`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setShowOtpInput(true);
      Toast.show({ type: "success", text1: "OTP Sent", text2: "Check your email for the verification code", topOffset: 60 });
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to send OTP", text2: err?.response?.data?.message || "Please try again", topOffset: 60 });
    } finally {
      setLoading(false);
    }
  };

  // ── Submit (unchanged logic) ──────────────────────────────────────────────
  const submit = async () => {
    const newErrors = {};
    if (!oldPassword.trim())        newErrors.oldPassword = "Old password is required";
    if (!newPassword.trim())        newErrors.newPassword = "New password is required";
    if (!confirmNewPassword.trim()) newErrors.confirmNewPassword = "Confirmation is required";
    if (showOtpInput && !otp.trim()) newErrors.otp = "OTP is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Toast.show({ type: "error", text1: "Validation failed", text2: "Please fill in all required fields", topOffset: 60 });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({ type: "error", text1: "Weak password", text2: "New password must be at least 6 characters", topOffset: 60 });
      return;
    }

    if (!reqs.every(r => r.met)) {
      Toast.show({ type: "error", text1: "Requirements not met", text2: "Please follow all password requirements", topOffset: 60 });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Toast.show({ type: "error", text1: "Mismatch", text2: "New password confirmation does not match", topOffset: 60 });
      return;
    }

    // If requirements are met but OTP is not yet requested/shown
    if (!showOtpInput) {
      await requestOTP();
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("jwt");
      await axios.post(
        `${baseURL}users/change-password`,
        { oldPassword, newPassword, confirmNewPassword, otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOldPassword(""); setNewPassword(""); setConfirmNewPassword(""); setOtp(""); setShowOtpInput(false);
      Toast.show({ type: "success", text1: "Password changed", topOffset: 60 });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: "error", text1: "Change failed", text2: err?.response?.data?.message || "Please try again", topOffset: 60 });
    } finally {
      setLoading(false);
    }
  };

  // Requirements
  const reqs = [
    { met: newPassword.length >= 6,        label: "At least 6 characters" },
    { met: /[A-Z]/.test(newPassword),      label: "One uppercase letter" },
    { met: /[0-9]/.test(newPassword),      label: "One number" },
    { met: newPassword === confirmNewPassword && confirmNewPassword.length > 0, label: "Passwords match" },
  ];
  const allMet = reqs.every((r) => r.met);

  return (
    <View style={s.screen}>
      {/* ── FLOATING BACK + MENU ── */}
      <View style={s.floatNav}>
        <TouchableOpacity style={s.floatBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <TouchableOpacity style={s.floatBtn} onPress={openDrawer} activeOpacity={0.8}>
          <Ionicons name="menu" size={20} color={C.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO ── */}
        <Animated.View style={[s.heroWrap, { opacity: lockOp }]}>
          <LinearGradient
            colors={[C.primaryLight, "#FFF9F2", C.bg]}
            locations={[0, 0.5, 1]}
            style={s.heroGrad}
          >
            {/* Decorative rings */}
            <View style={s.ringOuter} />
            <View style={s.ringInner} />

            {/* Lock icon */}
            <Animated.View style={[s.lockCircle, { transform: [{ scale: lockScale }] }]}>
              <LinearGradient
                colors={[C.primary, C.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.lockGrad}
              >
                <Ionicons name="lock-closed" size={36} color="#FFF" />
              </LinearGradient>
            </Animated.View>

            <Text style={s.heroTitle}>Change Password</Text>
            <Text style={s.heroSub}>Keep your account secure with a strong password</Text>
          </LinearGradient>
        </Animated.View>

        {/* ── CURRENT PASSWORD ── */}
        <FadeUp delay={60} style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardBar} />
            <View style={s.cardIconWrap}>
              <Ionicons name="key-outline" size={14} color={C.primary} />
            </View>
            <Text style={s.cardTitle}>Current Password</Text>
          </View>
          <View style={s.cardBody}>
            <PasswordField
              icon="lock-closed-outline"
              label="Old Password"
              value={oldPassword}
              onChange={(v) => { setOldPassword(v); setErrors(p => ({ ...p, oldPassword: null })); }}
              error={errors.oldPassword}
            />
          </View>
        </FadeUp>

        {/* ── NEW PASSWORD ── */}
        <FadeUp delay={120} style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardBar} />
            <View style={s.cardIconWrap}>
              <Ionicons name="shield-outline" size={14} color={C.primary} />
            </View>
            <Text style={s.cardTitle}>New Password</Text>
          </View>
          <View style={s.cardBody}>
            <PasswordField
              icon="lock-open-outline"
              label="New Password"
              value={newPassword}
              onChange={(v) => { setNewPassword(v); setErrors(p => ({ ...p, newPassword: null })); }}
              showStrength
              error={errors.newPassword}
            />
            <PasswordField
              icon="checkmark-circle-outline"
              label="Confirm New Password"
              value={confirmNewPassword}
              onChange={(v) => { setConfirmNewPassword(v); setErrors(p => ({ ...p, confirmNewPassword: null })); }}
              error={errors.confirmNewPassword}
            />

            {/* Requirements */}
            <View style={s.reqsCard}>
              <Text style={s.reqsTitle}>Password Requirements</Text>
              {reqs.map((r, i) => <Req key={i} met={r.met} label={r.label} />)}
            </View>
          </View>
        </FadeUp>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── OTP MODAL ── */}
      <Modal
        visible={showOtpInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtpInput(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={[s.cardBar, { backgroundColor: C.amber }]} />
              <View style={[s.cardIconWrap, { backgroundColor: C.amberLight }]}>
                <Ionicons name="mail-unread-outline" size={18} color={C.amber} />
              </View>
              <Text style={s.modalTitle}>Verify OTP</Text>
              <TouchableOpacity onPress={() => setShowOtpInput(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              <Text style={s.modalSub}>Enter the 6-digit code sent to your email to confirm the password change.</Text>
              
              <View style={pf.wrap}>
                <View style={[pf.inputWrap, errors.otp && { borderColor: C.danger }, { marginTop: 10 }]}>
                  <TextInput
                    value={otp}
                    onChangeText={(v) => { setOtp(v); setErrors(p => ({ ...p, otp: null })); }}
                    placeholder="000000"
                    placeholderTextColor={C.muted}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[pf.input, { letterSpacing: 8, textAlign: "center", fontSize: 24 }]}
                    autoFocus
                  />
                </View>
                {!!errors.otp && <Text style={pf.errorTxt}>{errors.otp}</Text>}
              </View>

              <TouchableOpacity
                style={[s.submitBtn, { width: "100%", marginTop: 10 }, loading && s.submitBtnDisabled, { backgroundColor: C.amber }]}
                onPress={submit}
                disabled={loading}
                activeOpacity={0.86}
              >
                {loading ? (
                  <>
                    <Ionicons name="hourglass-outline" size={16} color="#FFF" />
                    <Text style={s.submitTxt}>Verifying…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                    <Text style={s.submitTxt}>Confirm & Update</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── STICKY SUBMIT BAR ── */}
      <View style={s.stickyBar}>
        <View style={s.stickyInfo}>
          <Ionicons
            name={allMet ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={allMet ? C.green : C.border}
          />
          <Text style={[s.stickyLabel, allMet && { color: C.green }]}>
            {allMet ? "Ready to update" : "Complete all fields"}
          </Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, loading && s.submitBtnDisabled, showOtpInput && { backgroundColor: C.amber }]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.86}
        >
          {loading ? (
            <>
              <Ionicons name="hourglass-outline" size={16} color="#FFF" />
              <Text style={s.submitTxt}>{showOtpInput ? "Verifying…" : "Updating…"}</Text>
            </>
          ) : (
            <>
              <Ionicons name={showOtpInput ? "checkmark-circle" : "lock-closed"} size={15} color="#FFF" />
              <Text style={s.submitTxt}>{showOtpInput ? "Confirm & Update" : "Update Password"}</Text>
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

  // Nav
  floatNav: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    left: 16, right: 16, zIndex: 20,
    flexDirection: "row", justifyContent: "space-between",
  },
  floatBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 4,
  },

  // Hero
  heroWrap:  {},
  heroGrad:  {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 118 : 104,
    paddingBottom: 32,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  ringOuter: {
    position: "absolute", width: 240, height: 240, borderRadius: 120,
    borderWidth: 1, borderColor: C.primary, opacity: 0.12,
    top: 60,
  },
  ringInner: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    borderWidth: 1, borderColor: C.primary, opacity: 0.18,
    top: 100,
  },
  lockCircle: { marginBottom: 20 },
  lockGrad:   {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.42, shadowRadius: 16, elevation: 10,
  },
  heroTitle: { fontSize: 26, fontWeight: "900", fontFamily: F.serif, color: C.ink, letterSpacing: 0.2, textAlign: "center" },
  heroSub:   { fontSize: 13, color: C.muted, fontWeight: "500", marginTop: 6, textAlign: "center", lineHeight: 19 },

  // Cards
  card: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.white,
    borderRadius: 22, borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  cardBar:    { width: 4, height: 18, borderRadius: 2, backgroundColor: C.primary },
  cardIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  cardTitle:  { fontSize: 14, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  cardBody:   { padding: 16 },

  // Requirements
  reqsCard: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginTop: 4,
  },
  reqsTitle: { fontSize: 11, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: C.white, borderRadius: 24, width: "100%", overflow: "hidden" },
  modalHeader:  { flexDirection: "row", alignItems: "center", gap: 10, padding: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:   { flex: 1, fontSize: 16, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  modalClose:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  modalBody:    { padding: 20 },
  modalSub:     { fontSize: 13, color: C.muted, fontWeight: "500", textAlign: "center", lineHeight: 18, marginBottom: 10 },

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
  stickyInfo:  { flexDirection: "row", alignItems: "center", gap: 8 },
  stickyLabel: { fontSize: 13, color: C.muted, fontWeight: "700" },

  submitBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.42, shadowRadius: 10, elevation: 7,
  },
  submitBtnDisabled: { backgroundColor: C.muted, shadowOpacity: 0 },
  submitTxt: { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 0.3 },
});

export default ChangePassword;