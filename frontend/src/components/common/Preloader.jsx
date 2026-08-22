import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const Preloader = () => {
  const { user, loading } = useSelector((state) => state.auth);
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Show preloader on initial page load for a brief moment or while auth is loading
    let timer;
    if (!loading) {
      timer = setTimeout(() => {
        setShow(false);
      }, 1200); // Minimum time to show the beautiful loader
    } else {
      setShow(true);
    }

    return () => clearTimeout(timer);
  }, [loading]);

  if (!show && !loading) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white dark:bg-[#020710] transition-colors duration-300">
      {/* Container for the loader animation */}
      <div className="relative w-24 h-24 flex items-center justify-center mb-8">
        {/* Subtle static ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-100 dark:border-slate-800/50"></div>

        {/* Animated accent rings */}
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[var(--accent-color)] border-r-[var(--accent-color)] animate-[spin_1s_cubic-bezier(0.55,0.085,0.68,0.53)_infinite]"></div>
        <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-b-[var(--accent-color)] border-l-[var(--accent-color)] animate-[spin_1.5s_cubic-bezier(0.55,0.085,0.68,0.53)_infinite_reverse] opacity-70"></div>

        {/* Center Logo/Icon */}
        <div className="absolute flex items-center justify-center bg-[var(--accent-light-bg-subtle)] dark:bg-[var(--accent-dark-bg-subtle)] w-12 h-12 rounded-full shadow-lg shadow-[var(--accent-color)]/10 dark:shadow-[var(--accent-color-dark)]/10">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            style={{ color: "var(--accent-color)" }}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>

      {/* Email / Status Text */}
      <div className="flex flex-col items-center overflow-hidden">
        <h2 className="text-[18px] md:text-[25px] font-black tracking-wide text-slate-800 dark:text-slate-900 animate-pulse transition-colors duration-300">
          {user?.email || "Loading Workspace..."}
        </h2>
        <div className="flex items-center gap-2 mt-3">
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></span>
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></span>
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></span>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
