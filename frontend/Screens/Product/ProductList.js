import React from "react";
import { View } from "react-native";

import ProductCard from "./ProductCard";

const ProductList = ({ item, navigation, onAdd }) => {
  return (
    <View style={{ width: "48%" }}>
      <View>
        <ProductCard
          item={item}
          onAdd={onAdd}
          onDetails={() => navigation.navigate("Product Detail", { item })}
        />
      </View>
    </View>
  );
};

export default ProductList;