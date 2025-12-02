import { useState, useEffect } from "react";
import {
  Route,
  Routes,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Calendar,
  ClipboardList,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Palette,
  ChevronRight,
} from "lucide-react";

// Import custom styles
import "./SuperAdminDashboard.css";

// Import components
import CasteManager from "./CasteManager";
import DepartmentManager from "./DepartmentManager";
import SubjectManager from "./SubjectManager";
import EventCalendar from "./EventCalendar";
import RoleAssignmentManager from "./RoleAssignmentManager";
import SemesterManager from "./SemesterManager";
import StreamManager from "./StreamManager";
import Dashboard from "./Dashboard";

const SuperAdminDashboard = () => {
  // Check if current viewport is mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // Initialize sidebar - always open on desktop, closed on mobile
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-blue"
    );
    document.documentElement.classList.add(`theme-${theme}`);

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get(
          "http://erpbackend.tarstech.in/api/superadmin",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUser(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch user data");
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("token");
          navigate("/");
        }
      }
    };

    fetchUser();

    // Add event listener to handle resize and mobile detection
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // On desktop, always keep sidebar open
      // On mobile, keep current state or close if transitioning from desktop
      if (!mobile) {
        setIsOpen(true); // Always open on desktop
      } else if (!isMobile && mobile) {
        // Transitioning from desktop to mobile - close sidebar
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    // Clean up event listener
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [navigate, theme, isMobile]);

  const toggleSidebar = () => {
    // Only allow toggle on mobile devices
    if (isMobile) {
      setIsOpen(!isOpen);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Menu items with icons
  const menuItems = [
    {
      title: "Dashboard",
      icon: <Users size={20} />,
      href: "/super-admin/dashboard",
    },
    {
      title: "Manage Castes",
      icon: <Users size={20} />,
      href: "/super-admin/caste",
    },
    {
      title: "Manage Streams",
      icon: <Settings size={20} />,
      href: "/super-admin/stream",
    },

    {
      title: "Manage Departments",
      icon: <Briefcase size={20} />,
      href: "/super-admin/department",
    },
    {
      title: "Manage Subjects",
      icon: <BookOpen size={20} />,
      href: "/super-admin/subject",
    },
    {
      title: "Manage Semesters",
      icon: <GraduationCap size={20} />,
      href: "/super-admin/semester",
    },

    {
      title: "Academic Calendar",
      icon: <Calendar size={20} />,
      href: "/super-admin/calendar",
    },
    {
      title: "Assign Faculty Roles",
      icon: <ClipboardList size={20} />,
      href: "/super-admin/faculty-roles",
    },
  ];

  // Handle menu click (close sidebar on mobile only)
  const handleMenuClick = (item) => {
    // Auto-close sidebar on mobile when clicking menu items
    if (isMobile && isOpen) {
      setIsOpen(false);
    }

    if (item?.action === "logout") {
      // Show logout confirmation modal instead of logging out immediately
      setShowLogoutModal(true);
    }
  };

  // Handle logout confirmation
  const handleLogout = () => {
    // Clear the authentication token and redirect to the super admin login page
    localStorage.removeItem("token");
    localStorage.removeItem("theme");
    navigate("/super-admin-ved/login"); // Redirect to the super admin login page
  };

  // Check if menu item is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header - Only show toggle button on mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-gray-800 to-gray-700 text-white z-30 flex items-center justify-between px-4 shadow-lg border-b border-gray-600">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-600 transition-all duration-200 hover:scale-105"
              aria-label="Toggle sidebar"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold truncate mx-2 responsive-text-lg">
              Super Admin Dashboard
            </h2>

            {/* User avatar in header for mobile */}
            {user && (
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-medium text-sm shadow-md">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Semi-transparent overlay for mobile only */}
          {isOpen && isMobile && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 transition-opacity duration-300"
              onClick={toggleSidebar}
            />
          )}

          {/* Sidebar - Enhanced responsive design */}
          <div
            className={`${
              isMobile
                ? isOpen 
                  ? "translate-x-0" 
                  : "-translate-x-full"
                : "translate-x-0"
            } ${
              isMobile ? "fixed" : "relative"
            } z-30 h-screen transition-transform duration-300 ease-in-out bg-gradient-to-b from-gray-800 to-gray-900 text-white shadow-2xl ${
              isMobile ? "w-72 sm:w-80 max-w-sm" : "w-64"
            } border-r border-gray-700 flex-shrink-0`}
          >
            <div className="flex flex-col h-full">
              {/* Enhanced mobile header */}
              <div className="lg:hidden flex items-center justify-between p-4 bg-gray-800/50 border-b border-gray-600 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Settings size={16} className="text-white" />
                  </div>
                  <h2 className="font-bold text-lg">Admin Panel</h2>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg hover:bg-gray-600 transition-all duration-200 lg:hidden"
                  aria-label="Close sidebar"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Enhanced user info for mobile */}
              {user && (
                <div className="lg:hidden p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/50 border-b border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/20">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-gray-800"></div>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-semibold text-white text-base truncate">
                        {user.username}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span className="text-xs text-gray-300 bg-gray-700/50 px-2 py-1 rounded-full">
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Theme Selector */}
              <div className="px-4 py-4 bg-gray-800/30 border-b border-gray-600">
                <p className="text-sm font-medium mb-3 text-gray-200 flex items-center">
                  <Palette size={16} className="mr-2" />
                  Theme Preferences
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={`p-3 rounded-xl transition-all duration-200 border-2 ${
                      theme === "light" 
                        ? "bg-yellow-500/20 border-yellow-400 shadow-lg scale-105" 
                        : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                    }`}
                    aria-label="Light theme"
                  >
                    <Sun className="w-5 h-5 text-yellow-400" />
                  </button>
                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={`p-3 rounded-xl transition-all duration-200 border-2 ${
                      theme === "dark" 
                        ? "bg-gray-600/50 border-gray-400 shadow-lg scale-105" 
                        : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                    }`}
                    aria-label="Dark theme"
                  >
                    <Moon className="w-5 h-5 text-gray-200" />
                  </button>
                  <button
                    onClick={() => handleThemeChange("blue")}
                    className={`p-3 rounded-xl transition-all duration-200 border-2 ${
                      theme === "blue" 
                        ? "bg-blue-500/20 border-blue-400 shadow-lg scale-105" 
                        : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                    }`}
                    aria-label="Blue theme"
                  >
                    <Palette className="w-5 h-5 text-blue-400" />
                  </button>
                </div>
              </div>

              {/* Enhanced Sidebar Menu */}
              <nav className="flex-grow p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                <div className="mb-4">
                  <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3 px-2">
                    Navigation
                  </h3>
                </div>
                <ul className="space-y-2">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        to={item.href}
                        onClick={() => handleMenuClick(item)}
                        className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 focus-ring touch-target ${
                          isActive(item.href)
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-lg transform scale-[1.02]"
                            : "hover:bg-gray-700/70 hover:text-white hover:transform hover:scale-[1.01] text-gray-300 focus:bg-gray-700/50"
                        }`}
                        aria-current={isActive(item.href) ? "page" : undefined}
                      >
                        <div className={`p-1 rounded-lg ${
                          isActive(item.href) ? "bg-white/20" : "group-hover:bg-gray-600/50"
                        }`}>
                          {item.icon}
                        </div>
                        <span className="text-sm font-medium">{item.title}</span>
                        {isActive(item.href) && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                
                {/* Logout Button */}
                <div className="mt-8 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleMenuClick({ action: "logout" })}
                    className="group w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-600/80 transition-all duration-200 text-sm text-gray-300 hover:text-white hover:transform hover:scale-[1.01] focus-ring touch-target focus:bg-red-600/60"
                  >
                    <div className="p-1 rounded-lg group-hover:bg-red-500/30">
                      <LogOut size={20} />
                    </div>
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Enhanced Main Content */}
          <div className={`flex-1 min-w-0 bg-gray-50 dark:bg-gray-900 ${isMobile ? 'w-full' : ''}`}>
            <div className={`h-screen overflow-y-auto ${isMobile ? 'pt-16' : 'pt-0'}`}>
              <div className="p-4 sm:p-6 lg:p-8 min-h-full">
                {/* Enhanced User Welcome Card - Desktop Only */}
                {user && !isMobile && (
                  <div className="mb-8 mt-6">
                    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 dark:from-blue-700 dark:via-purple-700 dark:to-blue-800 theme-blue:from-blue-600 theme-blue:to-indigo-700 rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
                      <div className="flex items-stretch relative">
                        {/* Decorative background pattern */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white transform translate-x-48 -translate-y-48"></div>
                          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white transform -translate-x-32 translate-y-32"></div>
                        </div>
                        
                        {/* Left section with avatar */}
                        <div className="py-8 px-10 flex items-center relative z-10">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center text-blue-600 font-bold text-2xl shadow-2xl border-4 border-white/30 backdrop-blur-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-green-400 border-4 border-white shadow-lg animate-pulse"></div>
                          </div>
                        </div>

                        {/* Right content section */}
                        <div className="flex-grow bg-white/95 dark:bg-gray-800/95 theme-blue:bg-blue-50/95 backdrop-blur-sm flex justify-between items-center relative z-10 min-w-0">
                          <div className="flex flex-col p-6 lg:p-8 flex-1 min-w-0">
                            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 theme-blue:text-blue-500 font-semibold mb-2 flex items-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
                              Super Admin Dashboard
                            </div>
                            <div className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white theme-blue:text-blue-900 mb-2 truncate">
                              Welcome back, {user.username}!
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 theme-blue:text-blue-700 mb-4 line-clamp-2">
                              Manage your institution with powerful administrative tools
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="px-3 lg:px-4 py-1 lg:py-2 text-xs lg:text-sm font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300 theme-blue:from-blue-200 theme-blue:to-blue-100 theme-blue:text-blue-800 rounded-full shadow-md">
                                {user.role}
                              </div>
                              <div className="px-2 lg:px-3 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                                Online
                              </div>
                            </div>
                          </div>
                          
                          {/* Right decorative element */}
                          <div className="hidden xl:block p-6 lg:p-8 flex-shrink-0">
                            <div className="w-20 lg:w-24 h-20 lg:h-24 rounded-2xl bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 flex items-center justify-center shadow-lg hover-lift">
                              <Settings size={28} className="lg:w-8 lg:h-8 text-blue-600 dark:text-blue-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Error Message */}
              {error && (
                <div className="mb-8 p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 dark:from-red-900/50 dark:to-red-800/50 dark:text-red-100 theme-blue:from-red-50 theme-blue:to-red-100 theme-blue:text-red-800 rounded-lg shadow-md">
                  <div className="flex items-center">
                    <div className="p-1 rounded-full bg-red-200 dark:bg-red-800 mr-3">
                      <X size={16} className="text-red-600 dark:text-red-300" />
                    </div>
                    <p className="font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Enhanced Routes Container */}
              <div className="bg-white dark:bg-gray-800 theme-blue:bg-blue-50/50 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 theme-blue:border-blue-200 overflow-hidden">
                <div className="p-6 sm:p-8">
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/caste" element={<CasteManager />} />
                    <Route path="/stream" element={<StreamManager />} />
                    <Route path="/department" element={<DepartmentManager />} />
                    <Route path="/subject" element={<SubjectManager />} />
                    <Route path="/semester" element={<SemesterManager />} />
                    <Route path="/calendar" element={<EventCalendar />} />
                    <Route path="/faculty-roles" element={<RoleAssignmentManager />} />
                  </Routes>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Enhanced Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300 scale-100 border border-gray-200 dark:border-gray-700">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-t-2xl">
              <div className="flex items-center text-white">
                <div className="bg-white/20 p-3 rounded-full mr-4">
                  <LogOut size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Confirm Logout</h3>
                  <p className="text-red-100 text-sm">You're about to sign out</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-300 text-center mb-6 leading-relaxed">
                Are you sure you want to logout from your account? Any unsaved changes will be lost.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 font-medium hover:scale-[1.02]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg font-medium hover:scale-[1.02] hover:shadow-xl"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
