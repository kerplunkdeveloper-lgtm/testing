import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import App from "./App";
import "./index.css";
import { store } from "./app/store";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 1800,
            style: {
              background: 'transparent',
              boxShadow: 'none',
              padding: 0,
            },
            className: "flex items-center gap-3 !bg-white/95 dark:!bg-[#0f172a]/95 backdrop-blur-xl !border !border-slate-200/60 dark:!border-slate-805/80 !border-l-[4px] !border-l-[var(--accent-color)] dark:!border-l-[var(--accent-color-dark)] !shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/50 !rounded-2xl !text-slate-800 dark:!text-slate-100 !text-[13px] !font-black tracking-wide !px-5 !py-4 transition-all",
            success: {
              className: "flex items-center gap-3 !bg-[var(--accent-light-bg-subtle)] dark:!bg-[var(--accent-dark-bg-subtle)] backdrop-blur-xl !border !border-[var(--accent-color)]/20 dark:!border-[var(--accent-color-dark)]/20 !border-l-[4px] !border-l-[var(--accent-color)] dark:!border-l-[var(--accent-color-dark)] !shadow-2xl shadow-[var(--accent-color)]/10 dark:shadow-[var(--accent-color-dark)]/10 !rounded-2xl !text-[var(--accent-color)] dark:!text-[var(--accent-color-dark)] !text-[13px] !font-black tracking-wide !px-5 !py-4 transition-all",
              iconTheme: {
                primary: 'var(--accent-color)',
                secondary: '#ffffff',
              },
            },
            error: {
              className: "flex items-center gap-3 !bg-rose-50/95 dark:!bg-[#4c0519]/95 backdrop-blur-xl !border !border-rose-200/60 dark:!border-rose-800/60 !border-l-[4px] !border-l-rose-500 dark:!border-l-rose-400 !shadow-2xl shadow-rose-500/20 dark:shadow-rose-900/50 !rounded-2xl !text-rose-800 dark:!text-rose-400 !text-[13px] !font-black tracking-wide !px-5 !py-4 transition-all",
              iconTheme: {
                primary: '#f43f5e',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
);