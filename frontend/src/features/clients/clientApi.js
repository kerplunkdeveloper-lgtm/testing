// features/clients/clientApi.js

import axiosInstance from "../../services/axiosInstance";



// GET CLIENTS
export const getClientsAPI = async () => {
  const response =
    await axiosInstance.get(
      "/clients"
    );

  return response.data;
};



// CREATE CLIENT
export const createClientAPI =
  async (data) => {
    const response =
      await axiosInstance.post(
        "/clients",
        data
      );

    return response.data;
  };



// UPDATE CLIENT
export const updateClientAPI =
  async (id, data) => {
    const response =
      await axiosInstance.put(
        `/clients/${id}`,
        data
      );

    return response.data;
  };



// DELETE CLIENT
export const deleteClientAPI =
  async (id) => {
    const response =
      await axiosInstance.delete(
        `/clients/${id}`
      );

    return response.data;
  };