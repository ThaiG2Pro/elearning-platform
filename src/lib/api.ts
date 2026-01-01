import axios from 'axios';
import { AuthUtils } from './auth';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include JWT if available
api.interceptors.request.use((config) => {
    // Add JWT from localStorage using AuthUtils
    const token = AuthUtils.getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
