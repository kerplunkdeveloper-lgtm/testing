import axiosInstance from "../../services/axiosInstance.js";







// GET ALL USERS
export const getUsersAPI = async () => {

  const response = await axiosInstance.get('/users');

  return response.data;
};


// GET SINGLE USER
export const getUserAPI = async (id) => {

  const response = await axiosInstance.get(`/users/${id}`);

  return response.data;
};


// CREATE USER
export const createUserAPI = async (userData) => {

  const response = await axiosInstance.post('/users', userData);

  return response.data;
};


// UPDATE USER
export const updateUserAPI = async (id, userData) => {

  const response = await axiosInstance.put(`/users/${id}`, userData);

  return response.data;
};


// DELETE USER
export const deleteUserAPI = async (id) => {

  const response = await axiosInstance.delete(`/users/${id}`);

  return response.data;
};

// RELIEVE USER
export const relieveUserAPI = async (id, reason = "") => {

  const response = await axiosInstance.put(`/users/${id}/relieve`, { reason });

  return response.data;
};

// REACTIVATE USER
export const reactivateUserAPI = async (id) => {

  const response = await axiosInstance.put(`/users/${id}/reactivate`);

  return response.data;
};