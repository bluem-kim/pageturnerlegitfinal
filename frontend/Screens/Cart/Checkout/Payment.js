import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import EasyButton from "../../../Shared/StyledComponents/EasyButton";

const methods = ["Cash on Delivery", "Bank Transfer", "Card Payment"];

const Payment = ({ route, navigation }) => {
  const order = route.params?.order;
  const [selected, setSelected] = useState(methods[0]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose payment method</Text>

      {methods.map((m) => (
        <TouchableOpacity
          key={m}
          style={[styles.row, selected === m && styles.rowActive]}
          onPress={() => setSelected(m)}
        >
          <View style={[styles.dot, selected === m && styles.dotActive]} />
          <Text style={selected === m ? styles.rowTextActive : styles.rowText}>{m}</Text>
        </TouchableOpacity>
      ))}

      <EasyButton
        secondary
        large
        onPress={() => navigation.navigate("Confirm", { order: { ...order, paymentMethod: selected } })}
      >
        <Text style={styles.btn}>Continue</Text>
      </EasyButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "white" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowActive: {
    borderColor: "#1f8a70",
    backgroundColor: "#eaf8f3",
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#333",
    marginRight: 8,
  },
  dotActive: { backgroundColor: "#1f8a70" },
  rowText: { color: "#222" },
  rowTextActive: { color: "#1f8a70", fontWeight: "700" },
  btn: { color: "white", fontWeight: "700" },
});

export default Payment;