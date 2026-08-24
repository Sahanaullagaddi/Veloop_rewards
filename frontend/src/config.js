const normalizeServiceUrl = (value, fallback) => {
	const serviceUrl = value || fallback;
	return /^https?:\/\//.test(serviceUrl) ? serviceUrl : `https://${serviceUrl}`;
};

export const API_URL = normalizeServiceUrl(import.meta.env.VITE_API_URL, 'http://localhost:5000');
export const SOCKET_URL = normalizeServiceUrl(import.meta.env.VITE_SOCKET_URL, API_URL);
