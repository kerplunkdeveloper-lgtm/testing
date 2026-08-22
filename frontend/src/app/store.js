import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import userReducer from "../features/users/userSlice";
import profileReducer from "../features/profile/profileSlice";
import clientReducer from "../features/clients/clientslice";
import templateReducer from "../features/template/templateSlice";
import projectReducer from "../features/projects/projectSlice";
import eodReportReducer from "../features/eodReports/eodReportSlice";
import designerEodReportReducer from "../features/eodReports/designerEodReportSlice";
import taskReducer from "../features/tasks/taskSlice";
import notificationReducer from "../features/notifications/notificationSlice";
import chatReducer from "../features/chat/chatSlice";
import stickyNoteReducer from '../features/stickynotes/stickyNoteSlice';
import portfolioReducer from "../features/portfolio/portfolioSlice";
import socialAccountReducer from "../features/socialAccounts/socialAccountSlice";
import { apiSlice } from "../features/api/apiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    profile: profileReducer, 
    clients: clientReducer,
    templates: templateReducer,
    projects: projectReducer,
    eodReports: eodReportReducer,
    designerEodReports: designerEodReportReducer,
    tasks: taskReducer,
    notifications: notificationReducer,
    chat: chatReducer,
    portfolios: portfolioReducer,
    stickyNotes: stickyNoteReducer,
    socialAccounts: socialAccountReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(apiSlice.middleware),
});