const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const ENV_FILE_PATH = path.resolve(__dirname, "../../.env");
dotenv.config({ path: ENV_FILE_PATH, override: true });

const normalize = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

const readEnvFileMap = () => {
  try {
    const parsed = dotenv.parse(fs.readFileSync(ENV_FILE_PATH, "utf8"));
    const map = {};
    Object.keys(parsed).forEach((key) => {
      map[key] = normalize(parsed[key]);
    });
    return map;
  } catch (error) {
    return {};
  }
};

const parseCloudinaryUrl = (urlValue) => {
  const clean = normalize(urlValue);
  if (!clean) return {};

  try {
    const url = new URL(clean);
    if (url.protocol !== "cloudinary:") return {};

    return {
      cloudName: normalize(url.hostname),
      apiKey: normalize(url.username),
      apiSecret: normalize(url.password),
    };
  } catch (error) {
    return {};
  }
};

const pick = (sources, keys) => {
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      const value = normalize(src[key]);
      if (value) return value;
    }
  }
  return "";
};

const getCloudinaryEnv = () => {
  const envFile = readEnvFileMap();
  const sources = [process.env || {}, envFile];

  const cloudinaryUrl = pick(sources, ["CLOUDINARY_URL", "cloudinary_url"]);
  const urlParts = parseCloudinaryUrl(cloudinaryUrl);

  const cloudName =
    pick(sources, [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_NAME",
      "cloudinary_cloud_name",
      "cloudinary_name",
    ]) || urlParts.cloudName;

  const apiKey =
    pick(sources, [
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_KEY",
      "cloudinary_api_key",
      "cloudinary_key",
    ]) || urlParts.apiKey;

  const apiSecret =
    pick(sources, [
      "CLOUDINARY_API_SECRET",
      "CLOUDINARY_SECRET",
      "cloudinary_api_secret",
      "cloudinary_secret",
    ]) || urlParts.apiSecret;

  return { cloudinaryUrl, cloudName, apiKey, apiSecret };
};

const ensureCloudinaryConfigured = () => {
  const env = getCloudinaryEnv();

  cloudinary.config({
    cloud_name: env.cloudName,
    api_key: env.apiKey,
    api_secret: env.apiSecret,
  });

  const cfg = cloudinary.config();
  return {
    cloudNameSet: Boolean(cfg.cloud_name),
    apiKeySet: Boolean(cfg.api_key),
    apiSecretSet: Boolean(cfg.api_secret),
    cloudinaryUrl: Boolean(env.cloudinaryUrl),
  };
};

const buildConfigHint = (cfgState) =>
  `(cloud_name=${cfgState.cloudNameSet}, api_key=${cfgState.apiKeySet}, ` +
  `api_secret=${cfgState.apiSecretSet}, cloudinary_url=${cfgState.cloudinaryUrl})`;

const uploadImageBuffer = (buffer, folder = "pageturnerr/products") => {
  const cfgState = ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message} ${buildConfigHint(cfgState)}`));
          return;
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

const uploadImage = (source, folder = "pageturnerr/products") => {
  const cfgState = ensureCloudinaryConfigured();

  if (Buffer.isBuffer(source)) {
    return uploadImageBuffer(source, folder);
  }

  return cloudinary.uploader
    .upload(source, {
      folder,
      resource_type: "image",
    })
    .catch((error) => {
      throw new Error(`Cloudinary upload failed: ${error.message} ${buildConfigHint(cfgState)}`);
    });
};

module.exports = {
  cloudinary,
  uploadImageBuffer,
  uploadImage,
};
