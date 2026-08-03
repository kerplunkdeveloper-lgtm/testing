import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import stickyNoteService from "./stickyNoteService";

const initialState = {
  stickyNotes: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

// Get user sticky notes
export const getStickyNotes = createAsyncThunk(
  "stickyNotes/getAll",
  async (_, thunkAPI) => {
    try {
      return await stickyNoteService.getStickyNotes();
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create new sticky note
export const createStickyNote = createAsyncThunk(
  "stickyNotes/create",
  async (stickyNoteData, thunkAPI) => {
    try {
      return await stickyNoteService.createStickyNote(stickyNoteData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update sticky note
export const updateStickyNote = createAsyncThunk(
  "stickyNotes/update",
  async ({ id, stickyNoteData }, thunkAPI) => {
    try {
      return await stickyNoteService.updateStickyNote(id, stickyNoteData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete sticky note
export const deleteStickyNote = createAsyncThunk(
  "stickyNotes/delete",
  async (id, thunkAPI) => {
    try {
      return await stickyNoteService.deleteStickyNote(id);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const stickyNoteSlice = createSlice({
  name: "stickyNotes",
  initialState,
  reducers: {
    reset: (state) => {
      state.stickyNotes = [];
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
    clearStickyNoteError: (state) => {
      state.isError = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getStickyNotes.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getStickyNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.stickyNotes = action.payload;
      })
      .addCase(getStickyNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createStickyNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createStickyNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.stickyNotes.unshift(action.payload);
      })
      .addCase(createStickyNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(updateStickyNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateStickyNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.stickyNotes = state.stickyNotes.map((note) =>
          note._id === action.payload._id ? action.payload : note
        );
      })
      .addCase(updateStickyNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(deleteStickyNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteStickyNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.stickyNotes = state.stickyNotes.filter(
          (note) => note._id !== action.payload.id
        );
      })
      .addCase(deleteStickyNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase("auth/logoutUser/fulfilled", (state) => {
        state.stickyNotes = [];
        state.isError = false;
        state.isSuccess = false;
        state.isLoading = false;
        state.message = "";
      });
  },
});

export const { reset, clearStickyNoteError } = stickyNoteSlice.actions;
export default stickyNoteSlice.reducer;
