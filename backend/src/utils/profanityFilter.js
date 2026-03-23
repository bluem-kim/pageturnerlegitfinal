const leoProfanity = require("leo-profanity");

leoProfanity.loadDictionary("en");

// Extend package coverage with common Tagalog profanity variants.
const TAGALOG_BAD_WORDS = [
  "putangina",
  "putang ina",
  "tangina",
  "taena",
  "gago",
  "ulol",
  "tarantado",
  "punyeta",
  "pakyu",
  "bwisit",
  "hinayupak",
  "hayop ka",
  "leche",
  "burat",
  "kantot",
];

leoProfanity.add(TAGALOG_BAD_WORDS);

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const containsTagalogProfanity = (value) => {
  const normalized = normalizeText(value);
  const spaced = normalized.replace(/[^a-z0-9]+/g, " ").trim();
  const squashed = normalized.replace(/[^a-z0-9]+/g, "");

  return TAGALOG_BAD_WORDS.some((word) => {
    const normalizedWord = normalizeText(word);
    const targetSpaced = normalizedWord.replace(/[^a-z0-9]+/g, " ").trim();
    const targetSquashed = normalizedWord.replace(/[^a-z0-9]+/g, "");

    if (!targetSpaced && !targetSquashed) return false;

    return (
      (targetSpaced && spaced.includes(targetSpaced)) ||
      (targetSquashed && squashed.includes(targetSquashed))
    );
  });
};

const hasProfanity = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;

  return leoProfanity.check(text) || containsTagalogProfanity(text);
};

module.exports = {
  hasProfanity,
};
