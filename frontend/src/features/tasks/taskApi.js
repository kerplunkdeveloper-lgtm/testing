import axiosInstance from "../../services/axiosInstance";

export const getTasksAPI = async () => {
  const response = await axiosInstance.get("/tasks");
  return response.data;
};

export const createTaskAPI = async (taskData) => {
  const response = await axiosInstance.post("/tasks", taskData);
  return response.data;
};

export const updateTaskAPI = async (id, taskData) => {
  const response = await axiosInstance.put(`/tasks/${id}`, taskData);
  return response.data;
};

export const deleteTaskAPI = async (id) => {
  const response = await axiosInstance.delete(`/tasks/${id}`);
  return response.data;
};
