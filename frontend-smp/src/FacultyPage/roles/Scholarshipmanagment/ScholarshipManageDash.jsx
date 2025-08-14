import React, { useState, useEffect } from "react";
import {
  User,
  Users,
  FileText,
  CheckSquare,
  MessageSquare,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  GraduationCap,
  ClipboardList,
  UserCheck,
  Settings,
  Home,
} from "lucide-react";
import { Route, Routes, Link, useNavigate, Navigate, useLocation } from "react-router-dom";

// Import components
import StudentPursuing from "./StudentPursuing";
import StudentRecords from "./StudentRecords";
import ActionSection from "./ActionSection";
import RemarkSection from "./RemarkSection";
import StudentPage from "./StudentPage";
import DashboardScholarship from "./DashboardScholarship";

const ScholarshipManageDash = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsOpen(!mobile); // Open on desktop, closed on mobile
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect to dashboard if user is at the root scholarship path
  useEffect(() => {
    if (location.pathname === '/faculty/scholarship' || location.pathname === '/faculty/scholarship/') {
      navigate('/faculty/scholarship/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const menuItems = [
    { 
      title: "Dashboard", 
      icon: <LayoutDashboard size={20} />, 
      href: "/faculty/scholarship/dashboard",
      description: "Overview & Analytics"
    },
    { 
      title: "Student Pursuing", 
      icon: <GraduationCap size={20} />, 
      href: "/faculty/scholarship/student-pursuing",
      description: "Active Scholarship Students"
    },
    { 
      title: "Student Records", 
      icon: <ClipboardList size={20} />, 
      href: "/faculty/scholarship/student-records",
      description: "Academic Records"
    },
    { 
      title: "Student Page", 
      icon: <Users size={20} />, 
      href: "/faculty/scholarship/student-page",
      description: "Student Directory"
    },
    { 
      title: "Action Center", 
      icon: <UserCheck size={20} />, 
      href: "/faculty/scholarship/action",
      description: "Approvals & Tasks"
    },
    { 
      title: "Remarks", 
      icon: <MessageSquare size={20} />, 
      href: "/faculty/scholarship/remark",
      description: "Comments & Notes"
    },
  ];

  const handleMenuClick = (item) => {
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setIsOpen(false);
    }
    if (item?.action === "logout") {
      setShowLogoutModal(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("faculty");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 shadow-sm">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center space-x-2">
          <GraduationCap size={24} className="text-indigo-600" />
          <h1 className="text-lg font-semibold text-gray-800">Scholarship Panel</h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-25 transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:transform-none
        `}
      >
        <div className="flex flex-col h-full">
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center space-x-3 p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <GraduationCap size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Scholarship</h2>
              <p className="text-indigo-100 text-sm">Management Panel</p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <GraduationCap size={24} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">Scholarship Panel</h2>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={index}>
                    <Link
                      to={item.href}
                      onClick={() => handleMenuClick(item)}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                        ${isActive 
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm" 
                          : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                        }
                      `}
                    >
                      <div className={`
                        p-2 rounded-lg transition-colors
                        ${isActive 
                          ? "bg-indigo-100 text-indigo-600" 
                          : "bg-gray-100 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                        }
                      `}>
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-sm">{item.title}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Logout Button */}
            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleMenuClick({ action: "logout" })}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                  <LogOut size={20} />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-medium text-sm">Logout</span>
                  <p className="text-xs text-gray-500 mt-0.5">Sign out of account</p>
                </div>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className={`
        min-h-screen transition-all duration-300 ease-in-out
        ${isMobile ? "pt-16" : "lg:ml-64"}
      `}>
        <div className="p-4 lg:p-6 xl:p-8">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="" element={<Navigate to="/faculty/scholarship/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardScholarship />} />
              <Route path="student-pursuing" element={<StudentPursuing />} />
              <Route path="student-records" element={<StudentRecords />} />
              <Route path="student-page" element={<StudentPage />} />
              <Route path="action" element={<ActionSection />} />
              <Route path="remark" element={<RemarkSection />} />
            </Routes>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-96 mx-4 transform transition-all duration-300 scale-100 animate-scaleIn">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <LogOut size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Confirm Logout</h3>
                <p className="text-gray-500 text-sm">You'll need to sign in again</p>
              </div>
            </div>

            <p className="text-gray-600 mb-8">
              Are you sure you want to logout from your scholarship management account?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipManageDash;
