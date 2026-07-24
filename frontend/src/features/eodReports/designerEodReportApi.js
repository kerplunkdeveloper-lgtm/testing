import axiosInstance from "../../services/axiosInstance";

// GET DESIGNER EOD REPORTS
export const getDesignerEodReportsAPI = async (params) => {
  const response = await axiosInstance.get("/designer-eod-reports", { params });
  return response.data;
};

// CREATE DESIGNER EOD REPORT
export const createDesignerEodReportAPI = async (reportData) => {
  const response = await axiosInstance.post("/designer-eod-reports", reportData);
  return response.data;
};

// UPDATE DESIGNER EOD REPORT
export const updateDesignerEodReportAPI = async ({ id, data }) => {
  const response = await axiosInstance.put(`/designer-eod-reports/${id}`, data);
  return response.data;
};

// DELETE DESIGNER EOD REPORT
export const deleteDesignerEodReportAPI = async (id) => {
  const response = await axiosInstance.delete(`/designer-eod-reports/${id}`);
  return response.data;
};
