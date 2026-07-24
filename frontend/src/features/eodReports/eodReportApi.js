import axiosInstance from "../../services/axiosInstance";

// GET EOD REPORTS
export const getEodReportsAPI = async () => {
  const response = await axiosInstance.get("/eod-reports");
  return response.data;
};

// CREATE EOD REPORT
export const createEodReportAPI = async (reportData) => {
  const response = await axiosInstance.post("/eod-reports", reportData);
  return response.data;
};

// UPDATE EOD REPORT
export const updateEodReportAPI = async ({ id, data }) => {
  const response = await axiosInstance.put(`/eod-reports/${id}`, data);
  return response.data;
};

// DELETE EOD REPORT
export const deleteEodReportAPI = async (id) => {
  const response = await axiosInstance.delete(`/eod-reports/${id}`);
  return response.data;
};
