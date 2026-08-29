const normalizeServiceUrl = (value, fallback) => {
	const serviceUrl = value || fallback;
	return /^https?:\/\//.test(serviceUrl) ? serviceUrl : `https://${serviceUrl}`;
};

const getFallbackUrl = () => {
	if (typeof window !== 'undefined' && window.location) {
		return `${window.location.protocol}//${window.location.hostname}:5000`;
	}
	return 'http://localhost:5000';
};

export const API_URL = normalizeServiceUrl(import.meta.env.VITE_API_URL, getFallbackUrl());
export const SOCKET_URL = normalizeServiceUrl(import.meta.env.VITE_SOCKET_URL, API_URL);
