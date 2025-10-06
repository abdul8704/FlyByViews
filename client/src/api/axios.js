import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Token refresh management
let isRefreshing = false;
let failedQueue = [];

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.request.use(
    (config) => {
        config.withCredentials = true; // always send cookies with requests
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops by limiting to 1 retry per request
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        
        if (originalRequest._retryCount > 1) {
            console.warn("Too many retries, redirecting...");
            window.location.href = "/";
            return Promise.reject(error);
        }

        if (
            error.response &&
            error.response.status === 403 &&
            error.response.data.message == "Invalid or expired refresh token"
        ) {
            console.error("Unauthorized", error.response.data.message);
            window.location.href = "/";
        } else if (
            error.response &&
            error.response.status === 401 &&
            error.response.data.message === "Refresh token not found in cookies" &&
            !originalRequest._retry
        ) {
            console.error("Token expired", error.response.data.message);

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // hit refresh-token route which sets new cookie from server
                await axios.post(
                    `${BASE_URL}/auth/refresh-token`,
                    {},
                    { withCredentials: true }
                );

                processQueue(null); // no token needed in cookie-based approach
                return api(originalRequest);
            } catch (err) {
                processQueue(err);
                console.error("Refresh token failed", err);
                window.location.href = "/"; // redirect to login
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        } else {
            console.error("Error response", error.response);
        }

        return Promise.reject(error);
    }
);

export default api;