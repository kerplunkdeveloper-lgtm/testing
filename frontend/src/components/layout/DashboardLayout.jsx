import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import useSocket from "../../hooks/useSocket.jsx";
import { exitImpersonation } from "../../features/auth/authSlice";
import { apiSlice } from "../../features/api/apiSlice";
import HorizontalSidebar from "./HorizontalSidebar";
import { useTheme } from "../../context/ThemeContext";

const DashboardLayout = ({ role }) => {
  const { sidebarLayout } = useTheme();
  useSocket();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatPage =
    location.pathname.endsWith("/chat") || location.pathname.includes("/chat");
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 1024,
  );
  const { user, originalAdminUser } = useSelector((state) => state.auth);
  const mainContainerRef = useRef(null);

  // Reset scroll position to top when navigating to a new page
  useEffect(() => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const handleSwitchBack = () => {
    dispatch(exitImpersonation());
    dispatch(apiSlice.util.resetApiState());
    toast.success("Returned to Admin account");
    navigate("/admin");
  };

  return (
    <div className="h-screen overflow-hidden theme-bg-main relative">
      {/* Glassmorphic Background Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20 blur-[80px] pointer-events-none z-0 dark:from-indigo-500/10 dark:to-[#3b82f6]/5" />
      <div className="fixed bottom-[20%] left-[-5%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-pink-400/10 to-purple-500/15 blur-[60px] pointer-events-none z-0 dark:from-purple-500/5 dark:to-blue-500/5" />
      
      {/* SIDEBAR */}
      {sidebarLayout === "vertical" && (
        <Sidebar
          role={role}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      )}
      {sidebarLayout === "horizontal" && sidebarOpen && (
        <div className="lg:hidden">
          <Sidebar
            role={role}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
      )}

      {/* RIGHT SIDE / MAIN CONTENT */}
      <div
        className={`flex-1 h-screen flex flex-col relative z-10 transition-all duration-300 ease-in-out ${
          sidebarLayout === "vertical" && sidebarOpen ? "lg:ml-60 xl:ml-52" : "lg:ml-0"
        }`}
      >
        {/* IMPERSONATION BANNER */}
        {originalAdminUser && (
          <div className="bg-blue-500 dark:bg-[#3b82f6]  px-4 py-2 text-[0.625rem] flex items-center justify-between gap-5 shadow-md z-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-red-500   animate-pulse" />
              <span className="dark:text-black">
                Viewing as{" "}
                <strong className="text-yellow-400 dark:text-black font-bold">
                  {user?.name}
                </strong>{" "}
                <span className="font-medium text-yellow-400 dark:text-black">
                  {" "}
                  ({role})
                </span>{" "}
                in Original account:{" "}
                <strong className="text-yellow-400 dark:text-black font-bold">
                  {originalAdminUser.name}
                </strong>
                .
              </span>
            </div>
            <button
              onClick={handleSwitchBack}
              className=" bg-yellow-500 dark:bg-black text-white dark:text-white  font-bold cursor-pointer  px-3 py-1 rounded text-xs uppercase tracking-wider transition-all"
            >
              Switch Back
            </button>
          </div>
        )}

        {/* NAVBAR */}
        <Navbar setSidebarOpen={setSidebarOpen} />

        {/* HORIZONTAL SIDEBAR */}
        {sidebarLayout === "horizontal" && (
          <div className="hidden lg:block sticky top-0 z-40 bg-white pb-2 shrink-0">
            <HorizontalSidebar role={role} />
          </div>
        )}

        {/* SCROLLABLE CONTENT */}
        <main
          ref={mainContainerRef}
          className={`flex-1 ${isChatPage ? "overflow-hidden p-0" : "overflow-y-auto "} theme-bg-main`}
        >
          <div
            className={
              isChatPage
                ? "h-full theme-bg-card"
                : `min-h-full ${
                    sidebarLayout === "horizontal" ? "max-w-8xl mt-15" : "max-w-8xl"
                  } mx-auto w-full dark:shadow-none p-2 sm:p-3 md:p-2`
            }
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
