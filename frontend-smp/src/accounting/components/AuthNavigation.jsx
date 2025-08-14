import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AuthNavigation = () => {
  const navigate = useNavigate();
  const { isAuthenticated, faculty, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/accounting/login");
    window.location.reload(); // Force refresh to clear any cached state
  };

  if (isAuthenticated && faculty) {
    return (
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-700">
          Welcome,{" "}
          <span className="font-medium">
            {faculty.firstName} {faculty.lastName}
          </span>
          {faculty.designation && (
            <span className="text-xs text-gray-500 block">
              {faculty.designation}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        to="/accounting/login"
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
      >
        Faculty Login
      </Link>
    </div>
  );
};

export default AuthNavigation;
