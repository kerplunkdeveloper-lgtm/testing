import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import toast from "react-hot-toast";

import {
  getTemplatesAPI,
  createTemplateAPI,
  updateTemplateAPI,
  deleteTemplateAPI,
  toggleTemplateAPI,
} from "./templateApi";



// GET ALL
export const getTemplates =
  createAsyncThunk(
    "templates/getTemplates",

    async (_, thunkAPI) => {
      try {
        return await getTemplatesAPI();
      } catch (error) {
        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// CREATE
export const createTemplate =
  createAsyncThunk(
    "templates/createTemplate",

    async (templateData, thunkAPI) => {
      try {
        const response =
          await createTemplateAPI(
            templateData
          );

        toast.success(
          "Template Created"
        );

        return response;
      } catch (error) {
        toast.error(
          error.response.data.message
        );

        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// UPDATE
export const updateTemplate =
  createAsyncThunk(
    "templates/updateTemplate",

    async (
      { id, templateData },
      thunkAPI
    ) => {
      try {
        const response =
          await updateTemplateAPI(
            id,
            templateData
          );

        toast.success(
          "Template Updated"
        );

        return response;
      } catch (error) {
        toast.error(
          error.response.data.message
        );

        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// DELETE
export const deleteTemplate =
  createAsyncThunk(
    "templates/deleteTemplate",

    async (id, thunkAPI) => {
      try {
        await deleteTemplateAPI(id);

        toast.success(
          "Template Deleted"
        );

        return id;
      } catch (error) {
        toast.error(
          error.response.data.message
        );

        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



// TOGGLE
export const toggleTemplate =
  createAsyncThunk(
    "templates/toggleTemplate",

    async (id, thunkAPI) => {
      try {
        const response =
          await toggleTemplateAPI(id);

        return response;
      } catch (error) {
        return thunkAPI.rejectWithValue(
          error.response.data.message
        );
      }
    }
  );



const templateSlice = createSlice({
  name: "templates",

  initialState: {
    templates: [],
    loading: false,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder

      // GET
      .addCase(
        getTemplates.pending,
        (state) => {
          state.loading = true;
        }
      )

      .addCase(
        getTemplates.fulfilled,
        (state, action) => {
          state.loading = false;

          state.templates =
            action.payload.data;
        }
      )

      .addCase(
        getTemplates.rejected,
        (state) => {
          state.loading = false;
        }
      )



      // CREATE
      .addCase(
        createTemplate.fulfilled,
        (state, action) => {
          state.templates.unshift(
            action.payload.data
          );
        }
      )



      // UPDATE
      .addCase(
        updateTemplate.fulfilled,
        (state, action) => {
          state.templates =
            state.templates.map(
              (template) =>
                template._id ===
                action.payload.data._id
                  ? action.payload.data
                  : template
            );
        }
      )



      // DELETE
      .addCase(
        deleteTemplate.fulfilled,
        (state, action) => {
          state.templates =
            state.templates.filter(
              (template) =>
                template._id !==
                action.payload
            );
        }
      )



      // TOGGLE
      .addCase(
        toggleTemplate.fulfilled,
        (state, action) => {
          state.templates =
            state.templates.map(
              (template) =>
                template._id ===
                action.payload.data._id
                  ? action.payload.data
                  : template
            );
        }
      );
  },
});

export default templateSlice.reducer;