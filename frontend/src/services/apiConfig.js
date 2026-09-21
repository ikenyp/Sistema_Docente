export const API_ROOT_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
export const API_BASE_URL = `${API_ROOT_URL}/api`;
