import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "../features/users/userSlice";

const ThemeContext = createContext();

// Helper: apply preferences object to localStorage + state setters
const applyPrefs = (prefs, setters) => {
  const {
    setThemeState,
    setAccentColorState,
    setSoundEnabledState,
    setFontFamilyState,
    setSidebarLayoutState,
  } = setters;

  if (prefs.themePreference) {
    setThemeState(prefs.themePreference);
    localStorage.setItem("theme", prefs.themePreference);
  }
  if (prefs.accentColor) {
    setAccentColorState(prefs.accentColor);
    localStorage.setItem("accentColor", prefs.accentColor);
  }
  if (prefs.soundEnabled !== undefined) {
    setSoundEnabledState(prefs.soundEnabled);
    localStorage.setItem("soundEnabled", prefs.soundEnabled ? "true" : "false");
  }
  if (prefs.fontFamily) {
    setFontFamilyState(prefs.fontFamily);
    localStorage.setItem("fontFamily", prefs.fontFamily);
  }
  if (prefs.sidebarLayout) {
    setSidebarLayoutState(prefs.sidebarLayout);
    localStorage.setItem("sidebarLayout", prefs.sidebarLayout);
  }
};

export const ThemeProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user, originalAdminUser } = useSelector((s) => s.auth);

  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [accentColor, setAccentColorState] = useState(() => {
    return localStorage.getItem("accentColor") || "emerald";
  });

  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem("soundEnabled");
    return saved !== null ? saved === "true" : true;
  });

  const [fontFamily, setFontFamilyState] = useState(() => {
    return localStorage.getItem("fontFamily") || "inter";
  });

  const [sidebarLayout, setSidebarLayoutState] = useState(() => {
    return localStorage.getItem("sidebarLayout") || "vertical";
  });

  const setters = {
    setThemeState,
    setAccentColorState,
    setSoundEnabledState,
    setFontFamilyState,
    setSidebarLayoutState,
  };

  // Track previous user ID to detect user switches
  const prevUserIdRef = useRef(null);
  // Track whether we were in impersonation mode previously
  const wasImpersonatingRef = useRef(!!originalAdminUser);

  // Sync theme when user changes (login, impersonate, exit impersonation)
  useEffect(() => {
    if (!user) return;

    const currentUserId = user._id || user.id;
    const prevUserId = prevUserIdRef.current;
    const isImpersonating = !!originalAdminUser;
    const wasImpersonating = wasImpersonatingRef.current;

    const userChanged = prevUserId !== currentUserId;
    const exitedImpersonation = wasImpersonating && !isImpersonating;

    // Apply user's own preferences when:
    // 1. User just logged in (new user, no previous)
    // 2. Switched to a different user (impersonation)
    // 3. Exiting impersonation → restore original admin's preferences
    if (!prevUserId || userChanged || exitedImpersonation) {
      applyPrefs(
        {
          themePreference: user.themePreference,
          accentColor: user.accentColor,
          soundEnabled: user.soundEnabled,
          fontFamily: user.fontFamily,
          sidebarLayout: user.sidebarLayout,
        },
        setters,
      );
    }

    prevUserIdRef.current = currentUserId;
    wasImpersonatingRef.current = isImpersonating;
  }, [user, originalAdminUser]);

  // Save preferences back to the CURRENTLY ACTIVE user's account
  const updateUserPreferences = (preferences) => {
    if (user) {
      dispatch(updateUser({ id: "me", userData: preferences }));
    }
  };

  const setTheme = (newTheme) => {
    localStorage.setItem("theme", newTheme);
    setThemeState(newTheme);
    updateUserPreferences({ themePreference: newTheme });
  };

  const setAccentColor = (newAccent) => {
    localStorage.setItem("accentColor", newAccent);
    setAccentColorState(newAccent);
    updateUserPreferences({ accentColor: newAccent });
  };

  const setSoundEnabled = (enabled) => {
    localStorage.setItem("soundEnabled", enabled ? "true" : "false");
    setSoundEnabledState(enabled);
    updateUserPreferences({ soundEnabled: enabled });
  };

  const setFontFamily = (newFont) => {
    localStorage.setItem("fontFamily", newFont);
    setFontFamilyState(newFont);
    updateUserPreferences({ fontFamily: newFont });
  };

  const setSidebarLayout = (newLayout) => {
    localStorage.setItem("sidebarLayout", newLayout);
    setSidebarLayoutState(newLayout);
    updateUserPreferences({ sidebarLayout: newLayout });
  };

  // Apply dark/light class to <html>
  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      root.classList.remove("dark");

      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "light") {
        // Already removed
      } else {
        // System preference
        const isSystemDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        if (isSystemDark) {
          root.classList.add("dark");
        }
      }
    };

    applyTheme();

    // Listen for system theme changes if theme is set to 'system'
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // Apply accent attribute on root html node
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-accent", accentColor);
  }, [accentColor]);

  // Apply font family attribute on root html node
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-font", fontFamily);
    // Also add class for immediate tailwind matching if configured
    root.className = root.className.replace(/\bfont-\S+/g, "");
    if (fontFamily === "inter") root.classList.add("font-inter");
    if (fontFamily === "roboto") root.classList.add("font-roboto");
    if (fontFamily === "outfit") root.classList.add("font-outfit");
  }, [fontFamily]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        soundEnabled,
        setSoundEnabled,
        fontFamily,
        setFontFamily,
        sidebarLayout,
        setSidebarLayout,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
