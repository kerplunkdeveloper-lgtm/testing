import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import {
  getEodReportsAPI,
  createEodReportAPI,
  updateEodReportAPI,
  deleteEodReportAPI,
} from "./eodReportApi";

// ==========================================
// GET EOD REPORTS
// ==========================================
export const getEodReports = createAsyncThunk(
  "eodReports/getEodReports",
  async (_, thunkAPI) => {
    try {
      return await getEodReportsAPI();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data.message);
    }
  }
);

// ==========================================
// CREATE EOD REPORT
// ==========================================
export const createEodReport = createAsyncThunk(
  "eodReports/createEodReport",
  async (reportData, thunkAPI) => {
    try {
      return await createEodReportAPI(reportData);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data.message);
    }
  }
);

// ==========================================
// UPDATE EOD REPORT
// ==========================================
export const updateEodReport = createAsyncThunk(
  "eodReports/updateEodReport",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updateEodReportAPI({ id, data });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data.message);
    }
  }
);

// ==========================================
// DELETE EOD REPORT
// ==========================================
export const deleteEodReport = createAsyncThunk(
  "eodReports/deleteEodReport",
  async (payload, thunkAPI) => {
    const id = typeof payload === "string" ? payload : payload.id;
    const silent = typeof payload === "string" ? false : !!payload.silent;
    try {
      await deleteEodReportAPI(id);
      return { id, silent };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data.message);
    }
  }
);

const eodReportSlice = createSlice({
  name: "eodReports",
  initialState: {
    eodReports: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // GET EOD REPORTS
      .addCase(getEodReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(getEodReports.fulfilled, (state, action) => {
        state.loading = false;
        state.eodReports = action.payload.data;
      })
      .addCase(getEodReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // CREATE EOD REPORT
      .addCase(createEodReport.fulfilled, (state, action) => {
        state.eodReports.unshift(action.payload.data);
        toast.success("EOD Report submitted successfully");
      })

      // UPDATE EOD REPORT
      .addCase(updateEodReport.fulfilled, (state, action) => {
        state.eodReports = state.eodReports.map((report) =>
          report._id === action.payload.data._id ? action.payload.data : report
        );
        toast.success("EOD Report updated successfully");
      })

      // DELETE EOD REPORT
      .addCase(deleteEodReport.fulfilled, (state, action) => {
        const { id, silent } = action.payload;
        state.eodReports = state.eodReports.filter(
          (report) => report._id !== id
        );
        if (!silent) {
          toast.success("EOD Report deleted successfully");
        }
      });
  },
});

export default eodReportSlice.reducer;
