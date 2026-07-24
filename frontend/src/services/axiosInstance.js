import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + "/api",
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server returns 401 and it is not a login request, clear credentials and redirect
    if (
      error.response &&
      error.response.status === 401 &&
      error.config &&
      !error.config.url.includes("/auth/login")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("originalRole");
      localStorage.removeItem("originalAdminUser");
      localStorage.removeItem("originalAdminToken");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;