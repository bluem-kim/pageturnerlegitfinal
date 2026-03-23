import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";

import EasyButton from "../../Shared/StyledComponents/EasyButton";
import baseURL from "../../assets/common/baseurl";

const ChangePassword = ({ navigation }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);

  // Requirements check
  const reqs = [
    { met: newPassword.length >= 6, label: "At least 6 characters" },
    { met: /[A-Z]/.test(newPassword), label: "One uppercase letter" },
    { met: /[0-9]/.test(newPassword), label: "One number" },
    { met: newPassword === confirmNewPassword && confirmNewPassword.length > 0, label: "Passwords match" },
  ];

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

  const submit = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      Toast.show({ type: "error", text1: "Missing fields", text2: "Please complete all password fields", topOffset: 60 });
      return;
    }

    if (!reqs.every((r) => r.met)) {
      Toast.show({ type: "error", text1: "Requirements not met", text2: "Follow all password requirements", topOffset: 60 });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Toast.show({ type: "error", text1: "Passwords do not match", text2: "Re-enter your new password", topOffset: 60 });
      return;
    }

    if (showOtpInput && !otp.trim()) {
      Toast.show({ type: "error", text1: "OTP required", text2: "Enter the code sent to your email", topOffset: 60 });
      return;
    }

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

      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setOtp("");
      setShowOtpInput(false);

      Toast.show({
        type: "success",
        text1: "Password changed",
        text2: "Your account password was updated",
        topOffset: 60,
      });

      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Change failed",
        text2: error?.response?.data?.message || "Please try again",
        topOffset: 60,
      });
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") {
      navigation.openDrawer();
      return;
    }
    navigation?.getParent?.()?.openDrawer?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.drawerBtn} onPress={openDrawer} activeOpacity={0.8}>
          <Ionicons name="menu" size={28} color="#18120C" />
        </TouchableOpacity>
        <Text style={styles.title}>Change Password</Text>
      </View>

      <TextInput
        style={styles.input}
        value={oldPassword}
        onChangeText={setOldPassword}
        placeholder="Old Password"
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="New Password"
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        value={confirmNewPassword}
        onChangeText={setConfirmNewPassword}
        placeholder="Re-enter New Password"
        secureTextEntry
      />

      <View style={styles.reqs}>
        <Text style={styles.reqsTitle}>Requirements:</Text>
        {reqs.map((r, i) => (
          <View key={i} style={styles.reqRow}>
            <Ionicons name={r.met ? "checkmark-circle" : "ellipse-outline"} size={14} color={r.met ? "green" : "#999"} />
            <Text style={[styles.reqTxt, r.met && { color: "green" }]}>{r.label}</Text>
          </View>
        ))}
      </View>

      {/* ── OTP MODAL ── */}
      <Modal
        visible={showOtpInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtpInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify OTP</Text>
              <TouchableOpacity onPress={() => setShowOtpInput(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.otpLabel}>Verification Code (OTP)</Text>
              <TextInput
                style={[styles.input, { textAlign: "center", letterSpacing: 10, fontSize: 24 }]}
                value={otp}
                onChangeText={setOtp}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Text style={styles.otpNote}>Check your email for the 6-digit code.</Text>

              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: "#F4821F" }]} 
                onPress={submit}
              >
                <Text style={styles.modalBtnTxt}>{loading ? "Verifying..." : "Confirm & Update"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EasyButton primary large onPress={submit}>
        <Text style={styles.btnText}>
          {loading ? "Processing..." : "Update Password"}
        </Text>
      </EasyButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  drawerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    height: 44,
  },
  btnText: {
    color: "white",
    fontWeight: "700",
  },
  reqs: { marginBottom: 15, paddingHorizontal: 5 },
  reqsTitle: { fontSize: 12, fontWeight: "700", color: "#666", marginBottom: 5 },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  reqTxt: { fontSize: 12, color: "#999" },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 20, width: "100%", overflow: "hidden" },
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15, borderBottomWidth: 1, borderBottomColor: "#EEE" },
  modalTitle:   { fontSize: 16, fontWeight: "800", color: "#333" },
  modalBody:    { padding: 20 },
  modalBtn:     { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 20 },
  modalBtnTxt:  { color: "#FFF", fontWeight: "700", fontSize: 14 },

  otpLabel: { fontSize: 13, fontWeight: "700", color: "#666", marginBottom: 8, textAlign: "center" },
  otpNote: { fontSize: 11, color: "#999", textAlign: "center", marginTop: 5 },
});

export default ChangePassword;
