import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatPHP } from "../../utils/currency";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = {
  bg: "#FFFAF6",
  white: "#FFFFFF",
  ink: "#18120C",
  primary: "#F4821F",
  primaryDark: "#B85E0E",
  primaryLight: "#FEF0E3",
  border: "#EDE5DC",
  surface: "#F7F2EC",
  muted: "#9A8A7A",
  green: "#22C55E",
  blue: "#3B82F6",
  amber: "#F59E0B",
  grey: "#9CA3AF",
};

const STATUS_MAP = {
  "1": { label: "Delivered", color: C.green, icon: "checkmark-circle", step: 3 },
  "2": { label: "Shipped", color: C.blue, icon: "bicycle", step: 2 },
  "3": { label: "Pending", color: C.amber, icon: "time", step: 1 },
  "0": { label: "Cancelled", color: C.grey, icon: "close-circle", step: 0 },
};

const ProgressStepper = ({ currentStep }) => {
  const steps = [
    { label: "Pending", icon: "time-outline" },
    { label: "Shipped", icon: "bicycle-outline" },
    { label: "Delivered", icon: "checkmark-circle-outline" },
  ];

  if (currentStep === 0) return null; // Don't show stepper for cancelled

  return (
    <View style={st.container}>
      {steps.map((step, idx) => {
        const isCompleted = currentStep > idx + 1;
        const isActive = currentStep === idx + 1;
        const isLast = idx === steps.length - 1;

        return (
          <React.Fragment key={idx}>
            <View style={st.stepWrapper}>
              <View style={[
                st.circle,
                isCompleted && st.circleCompleted,
                isActive && st.circleActive
              ]}>
                <Ionicons 
                  name={isCompleted ? "checkmark" : step.icon} 
                  size={16} 
                  color={isCompleted || isActive ? C.white : C.muted} 
                />
              </View>
              <Text style={[
                st.label,
                (isCompleted || isActive) && st.labelActive
              ]}>{step.label}</Text>
            </View>
            {!isLast && (
              <View style={[
                st.line,
                isCompleted && st.lineCompleted
              ]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const st = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: C.white,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepWrapper: { alignItems: "center", width: 70 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  circleActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  circleCompleted: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  line: {
    flex: 1,
    height: 3,
    backgroundColor: C.surface,
    marginTop: -25,
    marginHorizontal: -15,
    zIndex: -1,
  },
  lineCompleted: { backgroundColor: C.green },
  label: { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  labelActive: { color: C.ink },
});

const OrderDetail = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getOrder = async () => {
      try {
        const token = await AsyncStorage.getItem("jwt");
        const res = await axios.get(`${baseURL}orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(res.data);
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setLoading(false);
      }
    };
    getOrder();
  }, [orderId]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={s.center}>
        <Text>Order not found</Text>
      </View>
    );
  }

  const status = STATUS_MAP[String(order.status)] || STATUS_MAP["3"];
  const date = new Date(order.createdAt).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Progress Stepper */}
        <ProgressStepper currentStep={status.step} />

        {/* Status Card */}
        <View style={s.section}>
          <View style={[s.statusCard, { borderColor: status.color }]}>
            <Ionicons name={status.icon} size={32} color={status.color} />
            <View style={s.statusMeta}>
              <Text style={[s.statusLabel, { color: status.color }]}>{status.label}</Text>
              <Text style={s.dateText}>Placed on {date}</Text>
            </View>
          </View>
        </View>

        {/* Order ID */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Order ID</Text>
          <Text style={s.orderIdText}>#{String(orderId).toUpperCase()}</Text>
        </View>

        {/* Items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Items</Text>
          {order.orderItems.map((item, idx) => (
            <View key={idx} style={s.itemRow}>
              <Image
                source={{ uri: item.product?.image || "https://via.placeholder.com/150" }}
                style={s.itemImage}
              />
              <View style={s.itemMeta}>
                <Text style={s.itemName} numberOfLines={1}>{item.product?.name}</Text>
                <Text style={s.itemQty}>Qty: {item.quantity}</Text>
              </View>
              <Text style={s.itemPrice}>{formatPHP(item.product?.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Summary</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>{formatPHP(order.totalPrice + (order.discountAmount || 0) - (order.shippingFee || 0))}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Shipping Fee</Text>
            <Text style={s.summaryValue}>+ {formatPHP(order.shippingFee)}</Text>
          </View>
          {order.discountAmount > 0 && (
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: C.green }]}>Discount</Text>
              <Text style={[s.summaryValue, { color: C.green }]}>- {formatPHP(order.discountAmount)}</Text>
            </View>
          )}
          <View style={[s.summaryRow, s.totalRow]}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{formatPHP(order.totalPrice)}</Text>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Shipping Address</Text>
          <View style={s.addressCard}>
            <Ionicons name="location-outline" size={20} color={C.primary} />
            <View style={s.addressMeta}>
              <Text style={s.addressText}>{order.shippingAddress1}</Text>
              {order.shippingAddress2 ? <Text style={s.addressText}>{order.shippingAddress2}</Text> : null}
              <Text style={s.addressText}>{order.city}, {order.zip}</Text>
              <Text style={s.addressText}>{order.country}</Text>
              <Text style={s.phoneText}>{order.phone}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.ink, marginLeft: 16 },
  scroll: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: C.muted, textTransform: "uppercase", marginBottom: 12, letterSpacing: 1 },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  statusMeta: { marginLeft: 16 },
  statusLabel: { fontSize: 20, fontWeight: "900" },
  dateText: { fontSize: 13, color: C.muted, marginTop: 2 },
  orderIdText: { fontSize: 16, fontWeight: "700", color: C.ink },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemImage: { width: 50, height: 70, borderRadius: 8 },
  itemMeta: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 14, fontWeight: "700", color: C.ink },
  itemQty: { fontSize: 12, color: C.muted, marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: "800", color: C.ink },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: C.muted, fontWeight: "600" },
  summaryValue: { fontSize: 14, color: C.ink, fontWeight: "700" },
  totalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  totalLabel: { fontSize: 18, fontWeight: "900", color: C.ink },
  totalValue: { fontSize: 18, fontWeight: "900", color: C.primaryDark },
  addressCard: {
    flexDirection: "row",
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 16,
  },
  addressMeta: { marginLeft: 12, flex: 1 },
  addressText: { fontSize: 14, color: C.ink, marginBottom: 2, lineHeight: 20 },
  phoneText: { fontSize: 14, fontWeight: "700", color: C.ink, marginTop: 8 },
});

export default OrderDetail;
