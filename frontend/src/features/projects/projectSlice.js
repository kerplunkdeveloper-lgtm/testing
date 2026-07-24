import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import toast from "react-hot-toast";

import {
  getProjectsAPI,
  createProjectAPI,
  updateProjectAPI,
  deleteProjectAPI,
  assignProjectAPI,
} from "./projectApi";



// ==========================================
// ASSIGN PROJECT
// ==========================================

export const assignProject =
  createAsyncThunk(
    "projects/assignProject",

    async (
      { id, assignedTo },
      thunkAPI
    ) => {

      try {

        return await assignProjectAPI({
          id,
          assignedTo,
        });

      } catch (err) {

        return thunkAPI.rejectWithValue(
          err.response.data.message
        );
      }
    }
  );



// ==========================================
// GET PROJECTS
// ==========================================

export const getProjects =
  createAsyncThunk(
    "projects/getProjects",

    async (_, thunkAPI) => {

      try {

        return await getProjectsAPI();

      } catch (err) {

        return thunkAPI.rejectWithValue(
          err.response.data.message
        );
      }
    }
  );



// ==========================================
// CREATE PROJECT
// ==========================================

export const createProject =
  createAsyncThunk(
    "projects/createProject",

    async (
      projectData,
      thunkAPI
    ) => {

      try {

        return await createProjectAPI(
          projectData
        );

      } catch (err) {

        return thunkAPI.rejectWithValue(
          err.response.data.message
        );
      }
    }
  );



// ==========================================
// UPDATE PROJECT
// ==========================================

export const updateProject =
  createAsyncThunk(
    "projects/updateProject",

    async (
      { id, data },
      thunkAPI
    ) => {

      try {

        return await updateProjectAPI({
          id,
          data,
        });

      } catch (err) {

        return thunkAPI.rejectWithValue(
          err.response.data.message
        );
      }
    }
  );



// ==========================================
// DELETE PROJECT
// ==========================================

export const deleteProject =
  createAsyncThunk(
    "projects/deleteProject",

    async (id, thunkAPI) => {

      try {

        await deleteProjectAPI(id);

        return id;

      } catch (err) {

        return thunkAPI.rejectWithValue(
          err.response.data.message
        );
      }
    }
  );



// ==========================================
// SLICE
// ==========================================

const projectSlice =
  createSlice({

    name: "projects",

    initialState: {

      projects: [],

      loading: false,

      error: null,
    },

    reducers: {},

    extraReducers: (builder) => {

      builder



        // GET PROJECTS

        .addCase(
          getProjects.pending,

          (state) => {

            state.loading = true;
          }
        )

        .addCase(
          getProjects.fulfilled,

          (
            state,
            action
          ) => {

            state.loading = false;

            state.projects =
              action.payload.data;
          }
        )

        .addCase(
          getProjects.rejected,

          (
            state,
            action
          ) => {

            state.loading = false;

            state.error =
              action.payload;
          }
        )



        // CREATE PROJECT

        .addCase(
          createProject.fulfilled,

          (
            state,
            action
          ) => {

            state.projects.unshift(
              action.payload.data
            );

            toast.success(
              "Project created successfully"
            );
          }
        )



        // UPDATE PROJECT

        .addCase(
          updateProject.fulfilled,

          (
            state,
            action
          ) => {

            state.projects =
              state.projects.map(
                (project) =>

                  project._id ===
                  action.payload.data._id

                    ? action.payload.data

                    : project
              );

            toast.success(
              "Project updated successfully"
            );
          }
        )



        // DELETE PROJECT

        .addCase(
          deleteProject.fulfilled,

          (
            state,
            action
          ) => {

            state.projects =
              state.projects.filter(
                (project) =>
                  project._id !==
                  action.payload
              );

            toast.success(
              "Project deleted successfully"
            );
          }
        )



        // ASSIGN PROJECT

        .addCase(
          assignProject.fulfilled,

          (
            state,
            action
          ) => {

            state.projects =
              state.projects.map(
                (project) =>

                  project._id ===
                  action.payload.data._id

                    ? action.payload.data

                    : project
              );

            toast.success(
              "Project assigned successfully"
            );
          }
        );
    },
  });

export default
  projectSlice.reducer;