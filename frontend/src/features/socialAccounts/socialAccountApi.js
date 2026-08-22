import axiosInstance from "../../services/axiosInstance";

export const getSocialAccountsAPI = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.append("search", params.search);
  if (params.status && params.status !== "All") queryParams.append("status", params.status);

  const queryString = queryParams.toString();
  const url = `/social-accounts${queryString ? `?${queryString}` : ""}`;

  const response = await axiosInstance.get(url);
  return response.data;
};

export const getSocialAccountByIdAPI = async (id) => {
  const response = await axiosInstance.get(`/social-accounts/${id}`);
  return response.data;
};

export const createSocialAccountAPI = async (data) => {
  const response = await axiosInstance.post("/social-accounts", data);
  return response.data;
};

export const updateSocialAccountAPI = async ({ id, data }) => {
  const response = await axiosInstance.put(`/social-accounts/${id}`, data);
  return response.data;
};

export const deleteSocialAccountAPI = async (id) => {
  const response = await axiosInstance.delete(`/social-accounts/${id}`);
  return response.data;
};
