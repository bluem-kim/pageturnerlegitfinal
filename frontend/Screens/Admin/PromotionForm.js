import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../utils/sessionStorage";
import Toast from "react-native-toast-message";

const PromotionForm = (props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [applyToShipping, setApplyToShipping] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (props.route.params?.item) {
      const p = props.route.params.item;
      setItem(p);
      setTitle(p.title);
      setDescription(p.description);
      setCouponCode(p.couponCode || "");
      setDiscountPercentage(String(p.discountPercentage || 0));
      setDiscountAmount(String(p.discountAmount || 0));
      setApplyToShipping(Boolean(p.applyToShipping));
      setImage(p.image);
    }
  }, [props.route.params?.item]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Title and Description are required",
      });
      return;
    }

    setLoading(true);
    const jwt = await getJwtToken();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("couponCode", couponCode.toUpperCase());
    formData.append("discountPercentage", discountPercentage);
    formData.append("discountAmount", discountAmount);
    formData.append("applyToShipping", String(applyToShipping));

    if (image && !image.startsWith("http")) {
      const filename = image.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append("image", { uri: image, name: filename, type });
    } else if (image) {
      formData.append("image", image);
    }

    try {
      if (item) {
        await axios.put(`${baseURL}promotions/${item.id}`, formData, {
          headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "multipart/form-data",
          },
        });
        Toast.show({ type: "success", text1: "Promotion updated" });
      } else {
        await axios.post(`${baseURL}promotions`, formData, {
          headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "multipart/form-data",
          },
        });
        Toast.show({ type: "success", text1: "Promotion created and notifications sent" });
      }
      props.navigation.navigate("Promotions");
    } catch (error) {
      console.error(error);
      Toast.show({ type: "error", text1: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => props.navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#18120C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{item ? "Edit Promotion" : "New Promotion"}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter promotion title"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter promotion details"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Coupon Code (Optional)</Text>
        <TextInput
          style={styles.input}
          value={couponCode}
          onChangeText={(val) => setCouponCode(val.toUpperCase())}
          placeholder="e.g. SUMMER50"
          autoCapitalize="characters"
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Discount (%)</Text>
            <TextInput
              style={styles.input}
              value={discountPercentage}
              onChangeText={setDiscountPercentage}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Discount (PHP)</Text>
            <TextInput
              style={styles.input}
              value={discountAmount}
              onChangeText={setDiscountAmount}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.checkboxRow} 
          onPress={() => setApplyToShipping(!applyToShipping)}
        >
          <Ionicons 
            name={applyToShipping ? "checkbox" : "square-outline"} 
            size={24} 
            color={applyToShipping ? "#F4821F" : "#ccc"} 
          />
          <Text style={styles.checkboxLabel}>Apply discount to shipping fee</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Image</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
              <Text style={styles.imagePlaceholderText}>Pick an image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{item ? "Update" : "Create & Notify Users"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee",
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  row: { flexDirection: "row", marginBottom: 10 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  imagePicker: {
    width: "100%",
    height: 200,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center" },
  imagePlaceholderText: { marginTop: 8, color: "#999" },
  button: {
    backgroundColor: "#F4821F",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { backgroundColor: "#ccc" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default PromotionForm;
