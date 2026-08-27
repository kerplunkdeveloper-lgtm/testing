import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("originalRole");
    localStorage.removeItem("originalAdminUser");
    localStorage.removeItem("originalAdminToken");
    window.location.href = "/";
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Task", "Project", "Notification", "Goal"],
  endpoints: (builder) => ({
    // ==========================================
    // GOALS ENDPOINTS
    // ==========================================
    getGoals: builder.query({
      query: () => "/goals",
      providesTags: ["Goal"],
      transformResponse: (response) => response.data,
    }),
    createGoal: builder.mutation({
      query: (goalData) => ({
        url: "/goals",
        method: "POST",
        body: goalData,
      }),
      invalidatesTags: ["Goal"],
    }),
    updateGoal: builder.mutation({
      query: ({ id, goalData }) => ({
        url: `/goals/${id}`,
        method: "PUT",
        body: goalData,
      }),
      invalidatesTags: ["Goal"],
    }),
    deleteGoal: builder.mutation({
      query: (id) => ({
        url: `/goals/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Goal"],
    }),

    // ==========================================
    // TASKS ENDPOINTS
    // ==========================================
    getTasks: builder.query({
      query: () => "/tasks",
      providesTags: ["Task"],
      transformResponse: (response) => response.data,
    }),
    createTask: builder.mutation({
      query: (taskData) => ({
        url: "/tasks",
        method: "POST",
        body: taskData,
      }),
      invalidatesTags: ["Task"],
    }),
    updateTask: builder.mutation({
      query: ({ id, taskData }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body: taskData,
      }),
      invalidatesTags: ["Task"],
      async onQueryStarted({ id, taskData }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getTasks", undefined, (draft) => {
            const task = draft.find((t) => t._id === id);
            if (task) {
              Object.assign(task, taskData);
              if (taskData.status && taskData.status !== "In Progress") {
                task.actualStartTime = null;
              }
            }
          })
        );
        try {
          const { data: updatedTaskResponse } = await queryFulfilled;
          dispatch(
            apiSlice.util.updateQueryData("getTasks", undefined, (draft) => {
              const index = draft.findIndex((t) => t._id === id);
              if (index !== -1 && updatedTaskResponse?.data) {
                draft[index] = updatedTaskResponse.data;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),
    deleteTask: builder.mutation({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Task"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getTasks", undefined, (draft) => {
            const index = draft.findIndex((t) => t._id === id);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // ==========================================
    // PROJECTS ENDPOINTS
    // ==========================================
    getProjects: builder.query({
      query: () => "/projects",
      providesTags: ["Project"],
      transformResponse: (response) => response.data,
    }),
    createProject: builder.mutation({
      query: (projectData) => ({
        url: "/projects",
        method: "POST",
        body: projectData,
      }),
      invalidatesTags: ["Project"],
    }),
    updateProject: builder.mutation({
      query: ({ id, data }) => ({
        url: `/projects/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Project"],
    }),
    deleteProject: builder.mutation({
      query: (id) => ({
        url: `/projects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Project"],
    }),
    assignProject: builder.mutation({
      query: ({ id, assignedTo }) => ({
        url: `/projects/${id}/assign`,
        method: "PUT",
        body: { assignedTo },
      }),
      invalidatesTags: ["Project"],
    }),

    // ==========================================
    // NOTIFICATIONS ENDPOINTS
    // ==========================================
    getNotifications: builder.query({
      query: () => "/notifications",
      providesTags: ["Notification"],
      transformResponse: (response) => {
        const notifications = response?.data || [];
        return notifications.filter(n => n.type !== 'message_received');
      },
    }),
    markAsRead: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PUT",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getNotifications', undefined, (draft) => {
            const notification = draft.find(n => n._id === id);
            if (notification) {
              notification.isRead = true;
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["Notification"],
    }),
    markAllAsRead: builder.mutation({
      query: () => ({
        url: "/notifications/read-all",
        method: "PUT",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getNotifications', undefined, (draft) => {
            draft.forEach((n) => {
              n.isRead = true;
            });
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["Notification"],
    }),
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getNotifications', undefined, (draft) => {
            const index = draft.findIndex(n => n._id === id);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["Notification"],
    }),

    // ==========================================
    // USER ENDPOINTS
    // ==========================================
    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Task"],
    }),
  }),
});

export const {
  // Task hooks
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,

  // Project hooks
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAssignProjectMutation,

  // Notification hooks
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,

  // User hooks
  useUpdateUserMutation,

  // Goal hooks
  useGetGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,


} = apiSlice;

