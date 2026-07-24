import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getEventsAPI,
  createEventAPI,
  updateEventAPI,
  deleteEventAPI,
} from "./eventApi";

// ASYNC THUNKS
export const getEvents = createAsyncThunk(
  "events/getAll",
  async (_, thunkAPI) => {
    try {
      return await getEventsAPI();
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createEvent = createAsyncThunk(
  "events/create",
  async (eventData, thunkAPI) => {
    try {
      return await createEventAPI(eventData);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateEvent = createAsyncThunk(
  "events/update",
  async ({ id, eventData }, thunkAPI) => {
    try {
      return await updateEventAPI(id, eventData);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteEvent = createAsyncThunk(
  "events/delete",
  async (id, thunkAPI) => {
    try {
      return await deleteEventAPI(id);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const eventSlice = createSlice({
  name: "events",
  initialState: {
    events: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearEventError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // GET EVENTS
      .addCase(getEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(getEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.data;
      })
      .addCase(getEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // CREATE EVENT
      .addCase(createEvent.fulfilled, (state, action) => {
        state.events.push(action.payload.data);
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.error = action.payload;
      })
      // UPDATE EVENT
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.events = state.events.map((event) =>
          event._id === action.payload.data._id ? action.payload.data : event
        );
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.error = action.payload;
      })
      // DELETE EVENT
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(
          (event) => event._id !== action.meta.arg
        );
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearEventError } = eventSlice.actions;
export default eventSlice.reducer;
