import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import Navbar from '../dashboard/common/Navbar';
import BusMonitoring from '../dashboard/admin/BusMonitoring';
import RouteManagement from '../dashboard/admin/RouteManagement';
import StudentManagement from '../dashboard/admin/StudentManagement';
import BusManagement from '../dashboard/admin/BusManagement';
import ConductorManagement from '../dashboard/admin/ConductorManagement';
import BusAssignment from '../dashboard/admin/BusAssignment';
import DriverManagement from '../dashboard/admin/DriverManagement';
import ScheduleManagement from '../dashboard/admin/ScheduleManagement';
import ProblemReports from '../dashboard/admin/ProblemReports';
import './AdminDashboard.css';

const AdminDashboard = () => {    
  const [activeTab, setActiveTab] = useState('bus-monitor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Sync activeTab with current route
  // useEffect(() => {
  //   const path = location.pathname.split('/').pop();
  //   if (path === 'admin' || path === '') {
  //     setActiveTab('bus-monitor');
  //   } else {
  //     setActiveTab(path);
  //   }
  // }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('faculty');
    navigate('/erp/admin-bus/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (collapsible for all screens) */}
      <div
        className={`bg-white shadow-lg w-64 z-50 h-full min-h-screen
          fixed inset-y-0 left-0 transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:inset-0 lg:transform lg:transition-none
          ${isSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-white text-lg font-bold">Admin Panel</h3>
          <button
            onClick={toggleSidebar}
            className="text-white"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            <Link
              to="/erp/admin/bus-monitor"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'bus-monitor' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('bus-monitor');
                setIsSidebarOpen(false);
              }}
            >
              Bus Monitor
            </Link>
            
            <Link
              to="/erp/admin/routes"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'routes' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('routes');
                setIsSidebarOpen(false);
              }}
            >
              Route Management
            </Link>
            
            <Link
              to="/erp/admin/driver-management"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'driver-management' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('driver-management');
                setIsSidebarOpen(false);
              }}
            >
              Driver Management
            </Link>
            
            <Link
              to="/erp/admin/conductor-management"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'conductor-management' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('conductor-management');
                setIsSidebarOpen(false);
              }}
            >
              Conductor Management
            </Link>
            
            <Link
              to="/erp/admin/student-management"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'student-management' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('student-management');
                setIsSidebarOpen(false);
              }}
            >
              Student Management
            </Link>
            
            <Link
              to="/erp/admin/buses"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'buses' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('buses');
                setIsSidebarOpen(false);
              }}
            >
              Bus Management
            </Link>
            
            <Link
              to="/erp/admin/bus-assignments"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'bus-assignments' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('bus-assignments');
                setIsSidebarOpen(false);
              }}
            >
              Bus Assignments
            </Link>
            
            {/* <Link
              to="users"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'users' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('users');
                setIsSidebarOpen(false);
              }}
            >
              User Management
            </Link> */}
            
            <Link
              to="/erp/admin/schedules"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'schedules' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('schedules');
                setIsSidebarOpen(false);
              }}
            >
              Schedule Management
            </Link>
            
            <Link
              to="/erp/admin/problem-reports"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === 'problem-reports' 
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
              onClick={() => {
                setActiveTab('problem-reports');
                setIsSidebarOpen(false);
              }}
            >
              Problem Reports
            </Link>
          </div>
        </nav>
        
        {/* Logout Button */}
        <div className="absolute bottom-0 w-full p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors duration-200"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaBars size={20} />
              </button>
              <h1 className="ml-4 lg:ml-0 text-xl font-semibold text-gray-900">
                College Bus Management - Admin
              </h1>
            </div>
            <div className="hidden lg:flex items-center space-x-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Admin
              </span>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 bg-gray-50">
          <Routes>
            <Route index element={<BusMonitoring />} />
            <Route path="bus-monitor" element={<BusMonitoring />} />
            <Route path="routes" element={<RouteManagement />} />
            <Route path="student-management" element={<StudentManagement />} />
            <Route path="buses" element={<BusManagement />} />
            <Route path="conductor-management" element={<ConductorManagement />} />
            <Route path="bus-assignments" element={<BusAssignment />} />
            <Route path="driver-management" element={<DriverManagement />} />
            <Route path="schedules" element={<ScheduleManagement />} />
            <Route path="problem-reports" element={<ProblemReports />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;