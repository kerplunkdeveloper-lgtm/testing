import React, { useState, useEffect } from "react";

import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

import { useDispatch, useSelector } from "react-redux";

import { loginUser, clearError } from "../../features/auth/authSlice";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import lightlogin from "../../assets/logo.png";
import loginleft from "../../assets/loginleft.png";

const Login = () => {
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const { user, loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    dispatch(loginUser(formData));
  };

  useEffect(() => {
    if (user?.role === "admin") {
      toast.success(" Admin Login ");
      navigate("/admin");
    }

    if (user?.role === "operationmanager") {
      toast.success(" Operation Manager Login  ");
      navigate("/operationmanager");
    }

    if (user?.role === "team") {
      toast.success(" Team Login");
      navigate("/team");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  return (
    <div className="min-h-screen theme-bg-main flex flex-col md:flex-row overflow-hidden">
      {/* TOP / LEFT SIDE IMAGE SECTION */}
      <div
        id="login-image-section"
        className="relative w-full h-[39vh] sm:h-[45vh] md:h-screen md:w-[55%] xl:w-[60%] overflow-hidden flex items-center justify-center shrink-0 z-0"
      >
        <img
          src={lightlogin}
          alt="Project Management Background"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        {/* Color Overlay */}
        <div
          className="absolute inset-0 opacity-45 z-10"
          style={{ background: "var(--color-brand-gradient, linear-gradient(to right, #1e3a8a, #3b82f6))" }}
        ></div>
      </div>

      {/* BOTTOM / RIGHT SIDE LOGIN FORM */}
      <div
        id="login-form-section"
        className="w-full md:w-[45%] xl:w-[40%] md:h-screen flex flex-col justify-center p-6 sm:p-12 md:px-10 lg:px-16 xl:px-24  relative rounded-t-[40px] md:rounded-none -mt-8 md:mt-0 z-10 backdrop-blur-xl"
      >
        <div className="w-full max-w-[490px] mx-auto relative z-10">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="mb-10 md:mb-12 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-black mb-3 text-slate-800 dark:text-white tracking-tight">
                Welcome Back
              </h2>
              <p className="text-[13px] md:text-[15px] font-medium theme-text-secondary">
                Login to continue managing your projects
              </p>
            </div>

            {/* EMAIL */}
            <div className="mb-5">
              <div className="flex items-center border theme-border rounded-2xl mt-2 px-5 py-4 bg-slate-50/50 dark:bg-black/20 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                <FaEnvelope className="theme-icon mr-3 text-xl" />
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  required
                  className="w-full !outline-none !bg-transparent !border-none !shadow-none !px-2 !py-2 text-[15px] theme-text-primary placeholder:text-slate-400 font-semibold"
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="mb-8">
              <div className="flex items-center border theme-border rounded-2xl mt-2 px-5 py-4 bg-slate-50/50 dark:bg-black/20 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                <FaLock className="theme-icon mr-3 text-xl" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder="Enter your password"
                  className="w-full !outline-none !bg-transparent !border-none !shadow-none !px-2 !py-2 text-[14px] theme-text-primary placeholder:text-slate-400 font-semibold"
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="theme-icon text-lg hover:text-blue-500 transition-colors ml-2 cursor-pointer"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="
    relative
    overflow-hidden

    w-full

    h-[55px]
    md:h-[55px]

    rounded-xl

    dashboard-btn-primary dark:dashboard-btn-primary 

    text-[13px]
    md:text-[14px]

    font-semibold

    shadow-lg
    shadow-blue-200/50

    hover:shadow-blue-300/60

    hover:scale-[1.01]
    active:scale-[0.98]

    transition-all
    duration-300

    disabled:opacity-70
    disabled:cursor-not-allowed
  "
            >
              {/* GLOW EFFECT */}
              <span
                className="
      absolute
      inset-0

      bg-gradient-to-r
      from-white/0
      via-white/20
      to-white/0

      -translate-x-full
      hover:translate-x-full

      transition-transform
      duration-1000
    "
              />

              {/* BUTTON TEXT */}
              <span className="relative z-10">
                {loading ? "Loading..." : "Login"}
              </span>
            </button>

            {/* FOOTER */}

            <p className="text-center mt-8 text-sm group">
              <span className="relative inline-flex items-center justify-center px-6 py-3 rounded-full">
                {/* Glowing Outer Border */}
                <span className="absolute inset-0 rounded-full border border-[var(--accent-color)] dark:border-[var(--accent-color-dark)] opacity-80 shadow-[0_0_15px_var(--accent-color)] dark:shadow-[0_0_15px_var(--accent-color-dark)] animate-pulse"></span>

                {/* Deep Background Glow */}
                <span className="absolute inset-0 rounded-full bg-[var(--accent-color)] dark:bg-[var(--accent-color-dark)] opacity-20 blur-xl animate-pulse"></span>

                {/* Content */}
                <span className="relative z-10 flex items-center gap-1.5 font-bold tracking-wide">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs">
                    Developed by
                  </span>
                  <span className="text-[var(--accent-color)] dark:text-[var(--accent-color-dark)] font-medium uppercase drop-shadow-[0_0_8px_var(--accent-color)] dark:drop-shadow-[0_0_8px_var(--accent-color-dark)]">
                    Kerplunk Media
                  </span>
                </span>
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
