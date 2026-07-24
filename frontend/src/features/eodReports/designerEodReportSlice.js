import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import {
  getDesignerEodReportsAPI,
  createDesignerEodReportAPI,
  updateDesignerEodReportAPI,
  deleteDesignerEodReportAPI,
} from "./designerEodReportApi";

// ==========================================
// GET DESIGNER EOD REPORTS
// ==========================================
export const getDesignerEodReports = createAsyncThunk(
  "designerEodReports/getDesignerEodReports",
  async (params, thunkAPI) => {
    try {
      return await getDesignerEodReportsAPI(params);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to load designer reports");
    }
  }
);

// ==========================================
// CREATE DESIGNER EOD REPORT
// ==========================================
export const createDesignerEodReport = createAsyncThunk(
  "designerEodReports/createDesignerEodReport",
  async (reportData, thunkAPI) => {
    try {
      return await createDesignerEodReportAPI(reportData);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to submit designer report");
    }
  }
);

// ==========================================
// UPDATE DESIGNER EOD REPORT
// ==========================================
export const updateDesignerEodReport = createAsyncThunk(
  "designerEodReports/updateDesignerEodReport",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateDesignerEodReportAPI({ id, data });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to update designer report");
    }
  }
);

// ==========================================
// DELETE DESIGNER EOD REPORT
// ==========================================
export const deleteDesignerEodReport = createAsyncThunk(
  "designerEodReports/deleteDesignerEodReport",
  async (payload, thunkAPI) => {
    const id = typeof payload === "string" ? payload : payload.id;
    const silent = typeof payload === "string" ? false : !!payload.silent;
    try {
      await deleteDesignerEodReportAPI(id);
      return { id, silent };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to delete designer report");
    }
  }
);

const designerEodReportSlice = createSlice({
  name: "designerEodReports",
  initialState: {
    designerEodReports: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // GET DESIGNER EOD REPORTS
      .addCase(getDesignerEodReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDesignerEodReports.fulfilled, (state, action) => {
        state.loading = false;
        state.designerEodReports = action.payload.data;
      })
      .addCase(getDesignerEodReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // CREATE DESIGNER EOD REPORT
      .addCase(createDesignerEodReport.fulfilled, (state, action) => {
        const exists = state.designerEodReports.some(
          (report) => report._id === action.payload.data._id
        );
        if (exists) {
          state.designerEodReports = state.designerEodReports.map((report) =>
            report._id === action.payload.data._id ? action.payload.data : report
          );
        } else {
          state.designerEodReports.unshift(action.payload.data);
        }
        toast.success(action.payload.message || "EOD Report saved successfully");
      })

      // UPDATE DESIGNER EOD REPORT
      .addCase(updateDesignerEodReport.fulfilled, (state, action) => {
        state.designerEodReports = state.designerEodReports.map((report) =>
          report._id === action.payload.data._id ? action.payload.data : report
        );
        toast.success("Designer EOD Report updated successfully");
      })

      // DELETE DESIGNER EOD REPORT
      .addCase(deleteDesignerEodReport.fulfilled, (state, action) => {
        const { id, silent } = action.payload;
        state.designerEodReports = state.designerEodReports.filter(
          (report) => report._id !== id
        );
        if (!silent) {
          toast.success("Designer EOD Report deleted successfully");
        }
      });
  },
});

export default designerEodReportSlice.reducer;
