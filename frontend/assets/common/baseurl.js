const envBaseUrl = process.env.EXPO_PUBLIC_BASE_API_URL;
const fallbackBaseUrl = "http://10.14.163.14:4000/api/v1/";

const normalizedBaseUrl = (envBaseUrl || fallbackBaseUrl).trim();
const baseURL = normalizedBaseUrl.endsWith("/")
	? normalizedBaseUrl
	: `${normalizedBaseUrl}/`;

export default baseURL;
