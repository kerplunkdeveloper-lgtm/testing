import axiosInstance from "../../services/axiosInstance";

export const getSMTasks = async (params = {}) => {
  const response = await axiosInstance.get("/sm-tasks", { params });
  return response.data;
};

export const getSMTaskById = async (id) => {
  const response = await axiosInstance.get(`/sm-tasks/${id}`);
  return response.data;
};

export const createSMTask = async (taskData) => {
  const response = await axiosInstance.post("/sm-tasks", taskData);
  return response.data;
};

export const updateSMTask = async (id, taskData) => {
  const response = await axiosInstance.put(`/sm-tasks/${id}`, taskData);
  return response.data;
};

export const deleteSMTask = async (id) => {
  const response = await axiosInstance.delete(`/sm-tasks/${id}`);
  return response.data;
};

export const toggleSubtask = async (taskId, subtaskId) => {
  const response = await axiosInstance.patch(`/sm-tasks/${taskId}/subtasks/${subtaskId}`);
  return response.data;
};

export const clearAllSMTasks = async () => {
  const response = await axiosInstance.delete("/sm-tasks/clear-all");
  return response.data;
};
