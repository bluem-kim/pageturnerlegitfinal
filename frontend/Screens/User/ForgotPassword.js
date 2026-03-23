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
import axios from "axios";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import baseURL from "../../assets/common/baseurl";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#FFF8F2",
  white:        "#FFFFFF",
  ink:          "#1A0F00",
  primary:      "#F4821F",
  primaryDark:  "#C45C00",
  primaryLight: "#FEF0E3",
  muted:        "#B08060",
  border:       "#F0E4D4",
  surface:      "#FDF6EE",
  danger:       "#EF4444",
  dangerLight:  "#FEE2E2",
  green:        "#22C55E",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif",      default: "serif" }),
  body:    Platform.select({ ios: "Avenir",  android: "sans-serif", default: "sans-serif" }),
};

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

const ForgotPassword = ({ navigation }) => {
  const [email,              setEmail]              = useState("");
  const [otp,                setOtp]                = useState("");
  const [newPassword,        setNewPassword]        = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [step,               setStep]               = useState(1); // 1: email, 2: reset
  const [showOtpModal,       setShowOtpModal]       = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [errors,             setErrors]             = useState({});

  // Requirements check
  const reqs = [
    { met: newPassword.length >= 6, label: "At least 6 characters" },
    { met: /[A-Z]/.test(newPassword), label: "One uppercase letter" },
    { met: /[0-9]/.test(newPassword), label: "One number" },
    { met: newPassword === confirmNewPassword && confirmNewPassword.length > 0, label: "Passwords match" },
  ];

  const handleRequestOTP = async () => {
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${baseURL}users/forgot-password/request-otp`, { email: email.trim() });
      setShowOtpModal(true);
      Toast.show({ type: "success", text1: "OTP Sent", text2: "Check your email for the code", topOffset: 60 });
    } catch (err) {
      Toast.show({ type: "error", text1: "Error", text2: err?.response?.data?.message || "User not found", topOffset: 60 });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      setErrors({ otp: "Enter 6-digit code" });
      return;
    }
    setShowOtpModal(false);
    setStep(2);
  };

  const handleResetPassword = async () => {
    const newErrors = {};
    if (!newPassword.trim()) newErrors.newPassword = "Required";
    if (!confirmNewPassword.trim()) newErrors.confirmNewPassword = "Required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!reqs.every(r => r.met)) {
      Toast.show({ type: "error", text1: "Requirements not met", topOffset: 60 });
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${baseURL}users/forgot-password/reset`, {
        email: email.trim(),
        otp,
        newPassword,
        confirmNewPassword
      });
      Toast.show({ type: "success", text1: "Success", text2: "Password reset successfully", topOffset: 60 });
      navigation.navigate("Login");
    } catch (err) {
      Toast.show({ type: "error", text1: "Reset failed", text2: err?.response?.data?.message || "Please try again", topOffset: 60 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[C.primary, C.primaryDark]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Forgot Password</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <FadeUp delay={100} style={s.card}>
            <Text style={s.title}>Reset via Email</Text>
            <Text style={s.sub}>Enter your email address and we'll send you an OTP to reset your password.</Text>
            
            <View style={s.inputWrap}>
              <View style={[s.iconBox, errors.email && { backgroundColor: C.dangerLight }]}>
                <Ionicons name="mail-outline" size={18} color={errors.email ? C.danger : C.primary} />
              </View>
              <TextInput
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors({}); }}
                placeholder="you@example.com"
                placeholderTextColor={C.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[s.input, errors.email && { borderColor: C.danger }]}
              />
            </View>
            {!!errors.email && <Text style={s.errorTxt}>{errors.email}</Text>}

            <TouchableOpacity style={s.primaryBtn} onPress={handleRequestOTP} disabled={loading}>
              <Text style={s.primaryBtnTxt}>{loading ? "Sending..." : "Send OTP"}</Text>
            </TouchableOpacity>
          </FadeUp>
        ) : (
          <FadeUp delay={100} style={s.card}>
            <Text style={s.title}>New Password</Text>
            <Text style={s.sub}>Create a strong new password for your account.</Text>

            <View style={s.inputWrap}>
              <View style={[s.iconBox, errors.newPassword && { backgroundColor: C.dangerLight }]}>
                <Ionicons name="lock-closed-outline" size={18} color={errors.newPassword ? C.danger : C.primary} />
              </View>
              <TextInput
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); setErrors({}); }}
                placeholder="New Password"
                placeholderTextColor={C.muted}
                secureTextEntry
                style={[s.input, errors.newPassword && { borderColor: C.danger }]}
              />
            </View>

            <View style={s.inputWrap}>
              <View style={[s.iconBox, errors.confirmNewPassword && { backgroundColor: C.dangerLight }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={errors.confirmNewPassword ? C.danger : C.primary} />
              </View>
              <TextInput
                value={confirmNewPassword}
                onChangeText={(v) => { setConfirmNewPassword(v); setErrors({}); }}
                placeholder="Confirm Password"
                placeholderTextColor={C.muted}
                secureTextEntry
                style={[s.input, errors.confirmNewPassword && { borderColor: C.danger }]}
              />
            </View>

            <View style={s.reqsCard}>
              <Text style={s.reqsTitle}>Requirements</Text>
              {reqs.map((r, i) => (
                <View key={i} style={s.reqRow}>
                  <Ionicons name={r.met ? "checkmark-circle" : "ellipse-outline"} size={14} color={r.met ? C.green : C.muted} />
                  <Text style={[s.reqTxt, r.met && { color: C.green }]}>{r.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={handleResetPassword} disabled={loading}>
              <Text style={s.primaryBtnTxt}>{loading ? "Resetting..." : "Reset Password"}</Text>
            </TouchableOpacity>
          </FadeUp>
        )}
      </ScrollView>

      {/* OTP MODAL */}
      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Verify OTP</Text>
              <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                <Ionicons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={s.modalSub}>Enter the 6-digit code sent to your email.</Text>
              <TextInput
                value={otp}
                onChangeText={(v) => { setOtp(v); setErrors({}); }}
                placeholder="000000"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                maxLength={6}
                style={s.otpInput}
                autoFocus
              />
              {!!errors.otp && <Text style={s.errorTxtCenter}>{errors.otp}</Text>}
              
              <TouchableOpacity style={[s.primaryBtn, { marginTop: 20 }]} onPress={handleVerifyOTP}>
                <Text style={s.primaryBtnTxt}>Verify & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },
  header: { height: 120, justifyContent: "center", alignItems: "center", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { position: "absolute", left: 20, top: 50, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "900", marginTop: 20, fontFamily: F.serif },
  content: { padding: 20 },
  card: { backgroundColor: "#FFF", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  title: { fontSize: 22, fontWeight: "900", color: C.ink, fontFamily: F.serif, marginBottom: 8 },
  sub: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 24 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, height: 50, borderBottomWidth: 1.5, borderBottomColor: C.border, fontSize: 16, color: C.ink, fontWeight: "600" },
  primaryBtn: { backgroundColor: C.primary, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryBtnTxt: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  errorTxt: { color: C.danger, fontSize: 12, fontWeight: "700", marginBottom: 16, marginLeft: 56 },
  errorTxtCenter: { color: C.danger, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 8 },
  
  reqsCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 24 },
  reqsTitle: { fontSize: 12, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  reqTxt: { fontSize: 13, color: C.muted, fontWeight: "500" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 24, overflow: "hidden" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: "900", color: C.ink, fontFamily: F.serif },
  modalBody: { padding: 24 },
  modalSub: { fontSize: 14, color: C.muted, textAlign: "center", marginBottom: 20 },
  otpInput: { fontSize: 32, fontWeight: "900", letterSpacing: 12, textAlign: "center", color: C.primary, borderBottomWidth: 2, borderBottomColor: C.primary, paddingBottom: 8, width: "80%", alignSelf: "center" },
});

export default ForgotPassword;
