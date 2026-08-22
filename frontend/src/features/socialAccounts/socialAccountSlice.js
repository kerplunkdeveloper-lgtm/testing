import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import {
  getSocialAccountsAPI,
  getSocialAccountByIdAPI,
  createSocialAccountAPI,
  updateSocialAccountAPI,
  deleteSocialAccountAPI,
} from "./socialAccountApi";

// ============================================
// ASYNC THUNKS
// ============================================

export const getSocialAccounts = createAsyncThunk(
  "socialAccounts/getSocialAccounts",
  async (params, thunkAPI) => {
    try {
      return await getSocialAccountsAPI(params);
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to fetch social accounts";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createSocialAccount = createAsyncThunk(
  "socialAccounts/createSocialAccount",
  async (data, thunkAPI) => {
    try {
      const res = await createSocialAccountAPI(data);
      toast.success(res.message || "Social media account added successfully");
      return res.data;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to create social account";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateSocialAccount = createAsyncThunk(
  "socialAccounts/updateSocialAccount",
  async ({ id, data }, thunkAPI) => {
    try {
      const res = await updateSocialAccountAPI({ id, data });
      toast.success(res.message || "Social media account updated successfully");
      return res.data;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to update social account";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteSocialAccount = createAsyncThunk(
  "socialAccounts/deleteSocialAccount",
  async (id, thunkAPI) => {
    try {
      const res = await deleteSocialAccountAPI(id);
      toast.success(res.message || "Social media account deleted successfully");
      return id;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to delete social account";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  socialAccounts: [],
  selectedAccount: null,
  isLoading: false,
  isSubmitting: false,
  isError: false,
  errorMessage: "",
};

// ============================================
// SLICE
// ============================================

const socialAccountSlice = createSlice({
  name: "socialAccounts",
  initialState,
  reducers: {
    setSelectedAccount: (state, action) => {
      state.selectedAccount = action.payload;
    },
    clearSelectedAccount: (state) => {
      state.selectedAccount = null;
    },
    clearError: (state) => {
      state.isError = false;
      state.errorMessage = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // GET ACCOUNTS
      .addCase(getSocialAccounts.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getSocialAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.socialAccounts = action.payload.data || [];
      })
      .addCase(getSocialAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload;
      })

      // CREATE ACCOUNT
      .addCase(createSocialAccount.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(createSocialAccount.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.socialAccounts.unshift(action.payload);
      })
      .addCase(createSocialAccount.rejected, (state) => {
        state.isSubmitting = false;
      })

      // UPDATE ACCOUNT
      .addCase(updateSocialAccount.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(updateSocialAccount.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.socialAccounts.findIndex(
          (item) => item._id === action.payload._id
        );
        if (index !== -1) {
          state.socialAccounts[index] = action.payload;
        }
        if (state.selectedAccount?._id === action.payload._id) {
          state.selectedAccount = action.payload;
        }
      })
      .addCase(updateSocialAccount.rejected, (state) => {
        state.isSubmitting = false;
      })

      // DELETE ACCOUNT
      .addCase(deleteSocialAccount.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(deleteSocialAccount.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.socialAccounts = state.socialAccounts.filter(
          (item) => item._id !== action.payload
        );
        if (state.selectedAccount?._id === action.payload) {
          state.selectedAccount = null;
        }
      })
      .addCase(deleteSocialAccount.rejected, (state) => {
        state.isSubmitting = false;
      });
  },
});

export const { setSelectedAccount, clearSelectedAccount, clearError } =
  socialAccountSlice.actions;

export default socialAccountSlice.reducer;
