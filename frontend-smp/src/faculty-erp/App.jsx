import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Menu, X } from "lucide-react";
import StaffSidebar from "./components/layout/StaffSidebar";
import FacultySidebar from "./components/layout/FacultySidebar";
import Login from "./Login";
import { rolePermissionsAndRoutes } from "./components/layout/rolePermissionsAndRoutes";
import FilesPage from "./pages/FilesPage";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        // On mobile, close sidebar
        setIsSidebarOpen(false);
      }
      // On desktop, let user control sidebar state manually
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("authToken");

    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const validRoles = rolePermissionsAndRoutes.map((r) => r.role);
        const userRole = validRoles.includes(parsedUser.type)
          ? parsedUser.role
          : "teaching";

        console.log(parsedUser.role);
        console.log(validRoles);
        console.log(userRole);
        setUserData({ ...parsedUser, role: userRole, token: savedToken });
        setIsAuthenticated(true);

        if (
          location.pathname === "/faculty-erp/login" ||
          location.pathname === "/faculty-erp" ||
          location.pathname === "/faculty-erp/"
        ) {
          if (userRole === "principal") {
            navigate("/faculty-erp/principal-dashboard");
          } else if (userRole === "HOD" || userRole === "hod") {
            navigate("/faculty-erp/hod-dashboard");
          } else if (userRole === "cc") {
            navigate("/faculty-erp/cc-dashboard");
          } else {
            navigate("/faculty-erp/dashboard");
          }
        } else if (
          userRole === "cc" &&
          location.pathname === "/faculty-erp/dashboard"
        ) {
          // Redirect CC users from generic /dashboard to /cc-dashboard to avoid conflicts
          navigate("/faculty-erp/cc-dashboard");
        }
      } catch (error) {
        localStorage.clear();
        setIsAuthenticated(false);
        setUserData(null);
        navigate("/faculty-erp/login");
      }
    } else {
      if (!["/faculty-erp/login"].includes(location.pathname)) {
        navigate("/faculty-erp/login");
      }
    }
  }, [location.pathname, navigate]);

  const handleMenuClick = (item) => {
    if (item?.action === "logout") {
      localStorage.clear();
      setIsAuthenticated(false);
      setUserData(null);
      navigate("/faculty-erp/login");
    }
    // Close sidebar on mobile when any menu item is clicked or close button is pressed
    if (window.innerWidth < 1024 || item?.action === "close") {
      setIsSidebarOpen(false);
    }
  };

  const handleLogin = (user) => {
    const validRoles = rolePermissionsAndRoutes.map((r) => r.role);
    const role = validRoles.includes(user.role) ? user.role : "teaching";
    const validatedUser = { ...user, role };
    localStorage.setItem("user", JSON.stringify(validatedUser));
    localStorage.setItem("authToken", user.token);
    setUserData(validatedUser);
    setIsAuthenticated(true);

    if (role === "principal") {
      navigate("/faculty-erp/principal-dashboard");
    } else if (role === "HOD" || role === "hod") {
      navigate("/faculty-erp/hod-dashboard");
    } else if (role === "cc") {
      navigate("/faculty-erp/cc-dashboard");
    } else {
      navigate("/faculty-erp/dashboard");
    }
  };

  return (
    <div className="flex h-screen w-full">
      {isAuthenticated && userData && (
        <>
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar Container */}
          <div
            className={`${
              isSidebarOpen ? "lg:w-80" : "lg:w-0"
            } transition-all duration-300 ease-in-out`}
          >
            {userData.type === "facultymanagement" ? (
              <FacultySidebar
                isOpen={isSidebarOpen}
                handleMenuClick={handleMenuClick}
                userData={userData}
              />
            ) : (
              <StaffSidebar
                isOpen={isSidebarOpen}
                handleMenuClick={handleMenuClick}
                userData={userData}
              />
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-md shadow-lg hover:bg-indigo-700 transition-colors duration-200"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop Menu Button */}
          <button
            className={`hidden lg:block fixed top-4 z-50 p-2 bg-indigo-600 text-white rounded-md shadow-lg hover:bg-indigo-700 transition-all duration-200 ${
              isSidebarOpen ? "left-[336px]" : "left-4"
            }`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${
          isAuthenticated && userData && isSidebarOpen
            ? "lg:ml-0" // No margin needed as sidebar is in layout flow
            : "lg:ml-0"
        }`}
      >
        <Routes>
          {/* Redirect legacy or external /cc-dashboard to faculty-erp route */}
          <Route
            path="/cc-dashboard"
            element={<Navigate to="/faculty-erp/cc-dashboard" />}
          />
          <Route
            path="/"
            element={
              <Navigate
                to={
                  isAuthenticated
                    ? userData?.role === "principal"
                      ? "principal-dashboard"
                      : userData?.role === "HOD" || userData?.role === "hod"
                      ? "hod-dashboard"
                      : "faculty-erp/dashboard"
                    : "login"
                }
              />
            }
          />
          <Route
            path={isAuthenticated ? "" : "login"}
            element={
              isAuthenticated ? (
                <>
                  <Navigate
                    to={
                      userData?.role === "principal"
                        ? "faculty-erp/principal-dashboard"
                        : userData?.role === "HOD" || userData?.role === "hod"
                        ? "faculty-erp/hod-dashboard"
                        : userData?.role === "cc"
                        ? "faculty-erp/cc-dashboard"
                        : "faculty-erp/dashboard"
                    }
                  />
                </>
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          {rolePermissionsAndRoutes.map((role) =>
            role.routes.map((route, index) => (
              <>
                <Route
                  key={`${role.role}-${index}`}
                  path={route.path}
                  element={route.element(
                    isAuthenticated,
                    userData?.role,
                    userData
                  )}
                />
              </>
            ))
          )}
          <Route path="dashboard/files" element={<FilesPage />} />
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center h-full">
                <h1 className="text-2xl font-bold text-gray-800">
                  Page Not Found
                </h1>
              </div>
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default App;
