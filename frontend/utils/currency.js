const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPHP = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "PHP 0.00";

  try {
    return phpFormatter.format(numeric);
  } catch (error) {
    return `PHP ${numeric.toFixed(2)}`;
  }
};
