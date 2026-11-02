import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import BhramananthuProductDetail from "../components/BhramananthuProductDetail";

const Customerdashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user.isInitialLoad) return;
    if (user.isAuthenticated && user.role) {
      const role = user.role.toUpperCase();
      if (role === "SUPER_ADMIN") {
        navigate("/super-admin-dashboard", { replace: true });
      } else if (role === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "STAFF") {
        navigate("/staff-dashboard", { replace: true });
      }
    }
  }, [user.isInitialLoad, user.isAuthenticated, user.role, navigate]);

  if (user.isInitialLoad) {
    return <Loader />;
  }

  return <BhramananthuProductDetail />;
};

export default Customerdashboard;
