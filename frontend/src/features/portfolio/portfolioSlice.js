import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import {
  getPortfoliosAPI,
  createPortfolioAPI,
  updatePortfolioAPI,
  deletePortfolioAPI,
  addProjectsToPortfolioAPI,
  removeProjectFromPortfolioAPI,
} from "./portfolioApi";

// GET all portfolios
export const getPortfolios = createAsyncThunk(
  "portfolios/getPortfolios",
  async (_, thunkAPI) => {
    try {
      return await getPortfoliosAPI();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// CREATE portfolio
export const createPortfolio = createAsyncThunk(
  "portfolios/createPortfolio",
  async (data, thunkAPI) => {
    try {
      return await createPortfolioAPI(data);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// UPDATE portfolio
export const updatePortfolio = createAsyncThunk(
  "portfolios/updatePortfolio",
  async ({ id, data }, thunkAPI) => {
    try {
      return await updatePortfolioAPI({ id, data });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// DELETE portfolio
export const deletePortfolio = createAsyncThunk(
  "portfolios/deletePortfolio",
  async (id, thunkAPI) => {
    try {
      await deletePortfolioAPI(id);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ADD projects to portfolio
export const addProjectsToPortfolio = createAsyncThunk(
  "portfolios/addProjects",
  async ({ id, projectIds }, thunkAPI) => {
    try {
      return await addProjectsToPortfolioAPI({ id, projectIds });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// REMOVE project from portfolio
export const removeProjectFromPortfolio = createAsyncThunk(
  "portfolios/removeProject",
  async ({ id, projectId }, thunkAPI) => {
    try {
      return await removeProjectFromPortfolioAPI({ id, projectId });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const portfolioSlice = createSlice({
  name: "portfolios",
  initialState: {
    portfolios: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // GET
      .addCase(getPortfolios.pending, (state) => { state.loading = true; })
      .addCase(getPortfolios.fulfilled, (state, action) => {
        state.loading = false;
        state.portfolios = action.payload.data;
      })
      .addCase(getPortfolios.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // CREATE
      .addCase(createPortfolio.fulfilled, (state, action) => {
        state.portfolios.unshift(action.payload.data);
        toast.success("Portfolio created");
      })
      .addCase(createPortfolio.rejected, (_, action) => {
        toast.error(action.payload || "Failed to create portfolio");
      })

      // UPDATE
      .addCase(updatePortfolio.fulfilled, (state, action) => {
        state.portfolios = state.portfolios.map((p) =>
          p._id === action.payload.data._id ? action.payload.data : p
        );
        toast.success("Portfolio updated");
      })
      .addCase(updatePortfolio.rejected, (_, action) => {
        toast.error(action.payload || "Failed to update portfolio");
      })

      // DELETE
      .addCase(deletePortfolio.fulfilled, (state, action) => {
        state.portfolios = state.portfolios.filter(
          (p) => p._id !== action.payload
        );
        toast.success("Portfolio deleted");
      })
      .addCase(deletePortfolio.rejected, (_, action) => {
        toast.error(action.payload || "Failed to delete portfolio");
      })

      // ADD PROJECTS
      .addCase(addProjectsToPortfolio.fulfilled, (state, action) => {
        state.portfolios = state.portfolios.map((p) =>
          p._id === action.payload.data._id ? action.payload.data : p
        );
        toast.success("Projects added to portfolio");
      })
      .addCase(addProjectsToPortfolio.rejected, (_, action) => {
        toast.error(action.payload || "Failed to add projects");
      })

      // REMOVE PROJECT
      .addCase(removeProjectFromPortfolio.fulfilled, (state, action) => {
        state.portfolios = state.portfolios.map((p) =>
          p._id === action.payload.data._id ? action.payload.data : p
        );
        toast.success("Project removed from portfolio");
      })
      .addCase(removeProjectFromPortfolio.rejected, (_, action) => {
        toast.error(action.payload || "Failed to remove project");
      });
  },
});

export default portfolioSlice.reducer;
