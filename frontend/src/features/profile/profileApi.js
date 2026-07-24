import axiosInstance from "../../services/axiosInstance";


// GET PROFILE
export const getProfileAPI = async () => {

  const response = await axiosInstance.get(
    "/profile/me"
  );

  return response.data;
};


// CREATE PROFILE
export const createProfileAPI = async (formData) => {

  const response = await axiosInstance.post(
    "/profile/create",
    formData,
   
  );

  return response.data;
};


// UPDATE PROFILE
export const updateProfileAPI = async (formData) => {

  const response = await axiosInstance.put(
    "/profile/update",
    formData

  );

  return response.data;
};


// DELETE IMAGE
export const deleteProfileImageAPI = async () => {

  const response = await axiosInstance.delete(
    "/profile/delete-image"
  );

  return response.data;
};