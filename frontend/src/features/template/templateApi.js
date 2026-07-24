import axiosInstance from "../../services/axiosInstance";



// GET ALL
export const getTemplatesAPI = async () => {
  const response = await axiosInstance.get(
    "/templates"
  );

  return response.data;
};



// CREATE
export const createTemplateAPI = async (
  templateData
) => {
  const response = await axiosInstance.post(
    "/templates",
    templateData
  );

  return response.data;
};



// UPDATE
export const updateTemplateAPI = async (
  id,
  templateData
) => {
  const response = await axiosInstance.put(
    `/templates/${id}`,
    templateData
  );

  return response.data;
};



// DELETE
export const deleteTemplateAPI = async (
  id
) => {
  const response = await axiosInstance.delete(
    `/templates/${id}`
  );

  return response.data;
};



// TOGGLE STATUS
export const toggleTemplateAPI =
  async (id) => {

    const response =
      await axiosInstance.patch(
        `/templates/${id}/toggle`
      );

    return response.data;
  };