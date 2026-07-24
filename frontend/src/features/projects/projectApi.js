import axiosInstance from "../../services/axiosInstance";



// GET PROJECTS
export const getProjectsAPI =
  async () => {

    const response =
      await axiosInstance.get(
        "/projects"
      );

    return response.data;
  };



// CREATE PROJECT
export const createProjectAPI =
  async (projectData) => {

    const response =
      await axiosInstance.post(
        "/projects",
        projectData
      );

    return response.data;
  };



// UPDATE PROJECT
export const updateProjectAPI =
  async ({
    id,
    data,
  }) => {

    const response =
      await axiosInstance.put(
        `/projects/${id}`,
        data
      );

    return response.data;
  };



// DELETE PROJECT
export const deleteProjectAPI =
  async (id) => {

    const response =
      await axiosInstance.delete(
        `/projects/${id}`
      );

    return response.data;
  };

// ASSIGN PROJECT
export const assignProjectAPI =
  async ({ id, assignedTo }) => {
    const response = await axiosInstance.put(
      `/projects/${id}/assign`,
      { assignedTo }
    );
    return response.data;
  };