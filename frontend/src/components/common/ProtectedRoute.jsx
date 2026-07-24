import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
  children,
  allowedRoles,
  requiredPermission
}) => {

  const { user, originalAdminUser, originalRole } = useSelector(
    (state) => state.auth
  );

  if (!user) {
    return <Navigate to="/" />;
  }

  const isPrimaryAdmin =
    user.role === "admin" ||
    originalRole === "admin" ||
    originalAdminUser?.role === "admin";

  if (!isPrimaryAdmin && allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} />;
  }

  // Strict permission check based only on current viewing user role
  if (user.role !== "admin" && requiredPermission) {
    if (requiredPermission === "manage_clients") {
      return children;
    }
    const perm = user.permissions?.[requiredPermission];
    if (perm !== true && !perm?.read) {
      return <Navigate to={`/${user.role}`} />;
    }
  }

  return children;
};

export default ProtectedRoute;