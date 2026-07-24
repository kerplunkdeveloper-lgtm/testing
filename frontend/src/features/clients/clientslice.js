// features/clients/clientSlice.js

import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import toast from "react-hot-toast";

import {
  getClientsAPI,
  createClientAPI,
  updateClientAPI,
  deleteClientAPI,
} from "./clientApi";



// ============================================
// GET CLIENTS
// ============================================

export const getClients =
  createAsyncThunk(
    "clients/getClients",
    async (_, thunkAPI) => {
      try {
        return await getClientsAPI();
      } catch (error) {
        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// ============================================
// CREATE CLIENT
// ============================================

export const createClient =
  createAsyncThunk(
    "clients/createClient",
    async (data, thunkAPI) => {
      try {
        return await createClientAPI(
          data
        );
      } catch (error) {
        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// ============================================
// UPDATE CLIENT
// ============================================

export const updateClient =
  createAsyncThunk(
    "clients/updateClient",
    async (
      { id, data },
      thunkAPI
    ) => {
      try {
        return await updateClientAPI(
          id,
          data
        );
      } catch (error) {
        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// ============================================
// DELETE CLIENT
// ============================================

export const deleteClient =
  createAsyncThunk(
    "clients/deleteClient",
    async (id, thunkAPI) => {
      try {
        return await deleteClientAPI(
          id
        );
      } catch (error) {
        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



const clientSlice = createSlice({
  name: "clients",

  initialState: {
    clients: [],
    loading: false,
    error: null,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder

      // GET CLIENTS
      .addCase(
        getClients.pending,
        (state) => {
          state.loading = true;
        }
      )

      .addCase(
        getClients.fulfilled,
        (state, action) => {
          state.loading = false;
          state.clients =
            action.payload.data;
        }
      )

      .addCase(
        getClients.rejected,
        (state, action) => {
          state.loading = false;
          state.error =
            action.payload;

          toast.error(action.payload);
        }
      )



      // CREATE CLIENT
      .addCase(
        createClient.fulfilled,
        (state, action) => {
          state.clients.unshift(
            action.payload.data
          );

          toast.success(
            "Client Created"
          );
        }
      )



      // UPDATE CLIENT
      .addCase(
        updateClient.fulfilled,
        (state, action) => {
          state.clients =
            state.clients.map(
              (client) =>
                client._id ===
                action.payload.data._id
                  ? action.payload.data
                  : client
            );

          toast.success(
            "Client Updated"
          );
        }
      )



      // DELETE CLIENT
      .addCase(
        deleteClient.fulfilled,
        (state, action) => {
          state.clients =
            state.clients.filter(
              (client) =>
                client._id !==
                action.meta.arg
            );

          toast.success(
            "Client Deleted"
          );
        }
      );
  },
});

export default clientSlice.reducer;