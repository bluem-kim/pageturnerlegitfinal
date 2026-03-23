export const SHIPPING_FEES = {
  luzon: 50,
  visayas: 70,
  mindanao: 100,
  overseas: 200,
};

export const SHIPPING_REGION_OPTIONS = [
  { label: "Luzon", value: "luzon" },
  { label: "Visayas", value: "visayas" },
  { label: "Mindanao", value: "mindanao" },
  { label: "Overseas", value: "overseas" },
];

export const getShippingFee = (region) => {
  const key = String(region || "").toLowerCase();
  return SHIPPING_FEES[key] || 0;
};
