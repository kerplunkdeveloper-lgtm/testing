import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import {
  loginAPI,
  logoutAPI,
  impersonateAPI,
} from "./authApi";

const userFromStorage = localStorage.getItem("user")
  ? JSON.parse(localStorage.getItem("user"))
  : null;

const originalRoleFromStorage = localStorage.getItem("originalRole") || null;
const originalAdminUserFromStorage = localStorage.getItem("originalAdminUser")
  ? JSON.parse(localStorage.getItem("originalAdminUser"))
  : null;
const originalAdminTokenFromStorage = localStorage.getItem("originalAdminToken") || null;

const initialState = {
  user: userFromStorage,
  token: localStorage.getItem("token") || null,
  originalRole: originalRoleFromStorage,
  originalAdminUser: originalAdminUserFromStorage,
  originalAdminToken: originalAdminTokenFromStorage,
  loading: false,
  error: null,
};

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (userData, thunkAPI) => {
    try {
      return await loginAPI(userData);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response.data.message
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, thunkAPI) => {
    try {
      return await logoutAPI();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response.data.message
      );
    }
  }
);

export const impersonateUser = createAsyncThunk(
  "auth/impersonateUser",
  async (userId, thunkAPI) => {
    try {
      return await impersonateAPI(userId);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response.data.message
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    switchViewingRole: (state, action) => {
      const targetRole = action.payload;
      if (!state.originalRole && state.user && state.user.role === "admin") {
        state.originalRole = "admin";
        localStorage.setItem("originalRole", "admin");
      }
      if (state.user) {
        state.user.role = targetRole;
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
    resetViewingRole: (state) => {
      if (state.originalRole && state.user) {
        state.user.role = state.originalRole;
        state.originalRole = null;
        localStorage.setItem("user", JSON.stringify(state.user));
        localStorage.removeItem("originalRole");
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    exitImpersonation: (state) => {
      if (state.originalAdminUser) {
        state.user = state.originalAdminUser;
        state.token = state.originalAdminToken;
        state.originalAdminUser = null;
        state.originalAdminToken = null;

        localStorage.setItem("user", JSON.stringify(state.user));
        localStorage.setItem("token", state.token);
        localStorage.removeItem("originalAdminUser");
        localStorage.removeItem("originalAdminToken");
      }
    }
  },

  extraReducers: (builder) => {
    builder

      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data.user;
        state.token = action.payload.token;
        state.error = null;

        localStorage.setItem(
          "user",
          JSON.stringify(action.payload.data.user)
        );

        localStorage.setItem(
          "token",
          action.payload.token
        );
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // LOGOUT
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.originalRole = null;
        state.originalAdminUser = null;
        state.originalAdminToken = null;
        state.error = null;

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("originalRole");
        localStorage.removeItem("originalAdminUser");
        localStorage.removeItem("originalAdminToken");
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.originalRole = null;
        state.originalAdminUser = null;
        state.originalAdminToken = null;
        state.error = null;

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("originalRole");
        localStorage.removeItem("originalAdminUser");
        localStorage.removeItem("originalAdminToken");
      })

      // IMPERSONATE
      .addCase(impersonateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(impersonateUser.fulfilled, (state, action) => {
        state.loading = false;

        // Backup admin credentials if not already backed up
        if (!state.originalAdminUser && state.user && state.user.role === "admin") {
          state.originalAdminUser = state.user;
          state.originalAdminToken = state.token;
          localStorage.setItem("originalAdminUser", JSON.stringify(state.user));
          localStorage.setItem("originalAdminToken", state.token);
        }

        state.user = action.payload.data.user;
        state.token = action.payload.token;
        state.error = null;

        localStorage.setItem(
          "user",
          JSON.stringify(action.payload.data.user)
        );

        localStorage.setItem(
          "token",
          action.payload.token
        );
      })
      .addCase(impersonateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Sync auth user when user is updated in userSlice
      .addCase('users/updateUser/fulfilled', (state, action) => {
        const updatedUser = action.payload.data;
        if (state.user && (state.user._id === updatedUser._id || state.user.id === updatedUser._id)) {
          // Update current user
          state.user = {
            ...state.user,
            ...updatedUser
          };
          localStorage.setItem("user", JSON.stringify(state.user));
        }
      });
  },
});

export const { switchViewingRole, resetViewingRole, exitImpersonation, clearError } = authSlice.actions;

export default authSlice.reducer;