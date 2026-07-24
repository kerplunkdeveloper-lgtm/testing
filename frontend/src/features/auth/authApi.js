import axiosInstance from "../../services/axiosInstance.js";

export const loginAPI = async (userData) => {
  const response = await axiosInstance.post(
    "/auth/login",
    userData
  );

  return response.data;
};

export const logoutAPI = async () => {
  const response = await axiosInstance.post(
    "/auth/logout"
  );

  return response.data;
};

export const impersonateAPI = async (userId) => {
  const response = await axiosInstance.post(
    "/auth/impersonate",
    { userId }
  );

  return response.data;
};