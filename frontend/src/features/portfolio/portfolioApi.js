import axiosInstance from "../../services/axiosInstance";

// GET all portfolios
export const getPortfoliosAPI = async () => {
  const response = await axiosInstance.get("/portfolios");
  return response.data;
};

// CREATE portfolio
export const createPortfolioAPI = async (data) => {
  const response = await axiosInstance.post("/portfolios", data);
  return response.data;
};

// UPDATE portfolio (name, color, isFavorite)
export const updatePortfolioAPI = async ({ id, data }) => {
  const response = await axiosInstance.put(`/portfolios/${id}`, data);
  return response.data;
};

// DELETE portfolio
export const deletePortfolioAPI = async (id) => {
  const response = await axiosInstance.delete(`/portfolios/${id}`);
  return response.data;
};

// ADD projects to a portfolio (batch)
export const addProjectsToPortfolioAPI = async ({ id, projectIds }) => {
  const response = await axiosInstance.put(`/portfolios/${id}/projects`, {
    projectIds,
  });
  return response.data;
};

// REMOVE a single project from a portfolio
export const removeProjectFromPortfolioAPI = async ({ id, projectId }) => {
  const response = await axiosInstance.delete(
    `/portfolios/${id}/projects/${projectId}`
  );
  return response.data;
};
