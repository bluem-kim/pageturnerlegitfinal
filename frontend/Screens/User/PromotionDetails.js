import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const PromotionDetails = (props) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromo = async () => {
      const id = props.route.params?.promotionId || props.route.params?.item?.id;
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${baseURL}promotions/${id}`);
        setItem(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPromo();
  }, [props.route.params?.promotionId, props.route.params?.item?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F4821F" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>Promotion not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => props.navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="megaphone-outline" size={80} color="#ccc" />
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.gradient}
          />
          <TouchableOpacity
            style={styles.floatingBackButton}
            onPress={() => props.navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.discountPercentage}% OFF</Text>
            </View>
          </View>

          <Text style={styles.description}>{item.description}</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#F4821F" />
            <Text style={styles.infoText}>Valid for a limited time!</Text>
          </View>

          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => props.navigation.navigate("HomeNavigator", { screen: "Home" })}
          >
            <Text style={styles.shopButtonText}>Shop Now</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  imageContainer: { width: "100%", height: 300, position: "relative" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { width: "100%", height: "100%", backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 100 },
  floatingBackButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20, marginTop: -20, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "bold", flex: 1, marginRight: 12 },
  discountBadge: { backgroundColor: "#F4821F", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  discountText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  description: { fontSize: 16, color: "#444", lineHeight: 24, marginBottom: 24 },
  divider: { height: 1, backgroundColor: "#eee", marginBottom: 24 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 30, gap: 10 },
  infoText: { fontSize: 15, color: "#666", fontWeight: "600" },
  shopButton: {
    backgroundColor: "#F4821F",
    flexDirection: "row",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  shopButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  errorText: { marginTop: 16, fontSize: 18, color: "#999" },
  backButton: { marginTop: 20, padding: 12, backgroundColor: "#F4821F", borderRadius: 8 },
  backButtonText: { color: "#fff", fontWeight: "bold" },
});

export default PromotionDetails;
