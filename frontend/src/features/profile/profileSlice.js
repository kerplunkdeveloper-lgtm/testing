import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import toast from "react-hot-toast";

import {
  getProfileAPI,
  createProfileAPI,
  updateProfileAPI,
  deleteProfileImageAPI,
} from "./profileApi";



// GET PROFILE
export const getProfile =
  createAsyncThunk(
    "profile/getProfile",

    async (_, thunkAPI) => {

      try {

        return await getProfileAPI();

      } catch (error) {

        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// CREATE PROFILE
export const createProfile =
  createAsyncThunk(
    "profile/createProfile",

    async (formData, thunkAPI) => {

      try {

        return await createProfileAPI(formData);

      } catch (error) {

        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// UPDATE PROFILE
export const updateProfile =
  createAsyncThunk(
    "profile/updateProfile",

    async (formData, thunkAPI) => {

      try {

        return await updateProfileAPI(formData);

      } catch (error) {

        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// DELETE IMAGE
export const deleteProfileImage =
  createAsyncThunk(
    "profile/deleteProfileImage",

    async (_, thunkAPI) => {

      try {

        return await deleteProfileImageAPI();

      } catch (error) {

        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



const profileSlice = createSlice({

  name: "profile",

  initialState: {
    profile: null,
    loading: false,
    error: null,
  },

  reducers: {
    optimisticProfileUpdate: (state, action) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      } else {
        state.profile = action.payload;
      }
    },
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
    },
  },

  extraReducers: (builder) => {

    builder

      // GET
      .addCase(getProfile.pending, (state) => {
        state.loading = true;
      })

      .addCase(getProfile.fulfilled, (state, action) => {

        state.loading = false;

        state.profile =
          action.payload.profile;
      })

      .addCase(getProfile.rejected, (state, action) => {

        state.loading = false;

        state.error = action.payload;

        toast.error(action.payload);
      })



      // CREATE
      .addCase(createProfile.pending, (state) => {
        state.loading = true;
      })

      .addCase(createProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
      })

      .addCase(createProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })

      // UPDATE
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload.profile;
      })

      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })



      // DELETE IMAGE
      .addCase(deleteProfileImage.fulfilled, (state) => {

        if (state.profile) {

          state.profile.profileImage = {
            public_id: "",
            url: "",
          };
        }

        toast.success("Image deleted");
      });
  },
});

export const { optimisticProfileUpdate, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;