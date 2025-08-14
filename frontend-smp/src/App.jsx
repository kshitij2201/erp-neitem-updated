import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
// import FacultyDashboard from "./FacultyPage/FacultyDashboard";
import PrivateRoute from "./components/PrivateRoute";
import ERPPrivateRoute from "./components/ERPPrivateRoute";
import FacultyPrivateRoute from "./FacultyPage/PrivateRoute";
import RoleLogin from "./FacultyPage/RoleLogin";

// Import dashboards for each faculty role
import StudentManagementDashboard from "./FacultyPage/roles/admissionmanagment/StudentManagementDashboard";
import StudentManageDash from "./FacultyPage/roles/admissionmanagment/StudentManageDash";
// import AccountSectionDashboard from "./FacultyPage/roles/accountsection/AccountSectionDashboard";
import DocumentSectionDashboard from "./FacultyPage/roles/Documentmanagment/DocumentSectionDashboard";
import ScholarshipManageDash from "./FacultyPage/roles/Scholarshipmanagment/ScholarshipManageDash";

// Import bus management component
import BusManagement from "./erp/dashboard/admin/BusManagement";

// Import client components
import StudentLogin from "./client/components/StudentLogin";
import StudentDashboard from "./client/pages/StudentDashboard";
import HODDashboard from "./client/pages/HODDashboard";
import ClientDashboard from "./client/pages/Dashboard";
import UnifiedLogin from "./components/UnifiedLogin";

// Import ERP components
import ERPLogin from "./erp/Login";
import ERPSignup from "./erp/Signup";
import ERPRoleLogin from "./erp/RoleLogin";
import ERPAdminDashboard from "./erp/pages/AdminDashboard";
import ERPDriverDashboard from "./erp/pages/DriverDashboard";
import ERPConductorDashboard from "./erp/pages/ConductorDashboard";
import ERPStudentDashboard from "./erp/pages/StudentDashboard";
import ERPUserDashboard from "./erp/pages/UserDashboard";

// Import Library components
import LibraryWrapper from "./library/LibraryWrapper";

// Import Faculty ERP components
import FacultyERPWrapper from "./faculty-erp/FacultyERPWrapper";

// Import Accounting components
import AccountingWrapper from "./accounting/AccountingWrapper";

// import NotificationSystemDashboard from "./FacultyPage/roles/NotificationSystemDashboard";
// import LibraryDashboard from "./FacultyPage/roles/LibraryDashboard";
// import BusDashboard from "./FacultyPage/roles/BusDashboard";
// import HostelDashboard from "./FacultyPage/roles/HostelDashboard";

// Main App component with routing
import React from "react";
const App = () => {
  return (
    <Router>
      <Routes>
        {/* Unified login page at root */}
        <Route path="/" element={<UnifiedLogin />} />

        {/* Faculty login route */}
        <Route path="/faculty/rolelogin" element={<RoleLogin />} />

        {/* Super Admin login route */}
        <Route path="/super-admin-ved/login" element={<LoginForm />} />

        <Route
          path="/super-admin/*"
          element={
            <PrivateRoute>
              <SuperAdminDashboard />
            </PrivateRoute>
          }
        />

        <Route path="/dashboard/*" element={<StudentManageDash />} />

        {/* Client/Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/main/*" element={<ClientDashboard />} />
        <Route path="/hod" element={<HODDashboard />} />

        {/* Role-based faculty dashboards */}
        <Route
          path="/faculty/document-section"
          element={<DocumentSectionDashboard />}
        />
        <Route
          path="/faculty/scholarship/*"
          element={<ScholarshipManageDash />}
        />
        <Route path="/faculty/bus" element={<BusManagement />} />

        {/* ERP Bus Management System Routes */}
        <Route path="/erp/login" element={<ERPLogin />} />
        <Route path="/erp/signup" element={<ERPSignup />} />
        <Route path="/erp/admin-bus/login/*" element={<ERPRoleLogin />} />
        <Route
          path="/erp/admin/*"
          element={
            <ERPPrivateRoute roles={["admin"]}>
              <ERPAdminDashboard />
            </ERPPrivateRoute>
          }
        />
        <Route
          path="/erp/dashboard/conductor/*"
          element={
            <ERPPrivateRoute roles={["conductor"]}>
              <ERPConductorDashboard />
            </ERPPrivateRoute>
          }
        />
        <Route
          path="/erp/dashboard/driver/*"
          element={
            <ERPPrivateRoute roles={["driver"]}>
              <ERPDriverDashboard />
            </ERPPrivateRoute>
          }
        />
        <Route
          path="/erp/dashboard/student/*"
          element={
            <ERPPrivateRoute roles={["student"]}>
              <ERPStudentDashboard />
            </ERPPrivateRoute>
          }
        />
        <Route
          path="/erp/user"
          element={
            <ERPPrivateRoute roles={["student", "faculty"]}>
              <ERPUserDashboard />
            </ERPPrivateRoute>
          }
        />

        {/* Library Management System Routes */}
        <Route path="/library/*" element={<LibraryWrapper />} />

        {/* Faculty ERP Management System Routes */}
        <Route path="/faculty-erp/*" element={<FacultyERPWrapper />} />

        {/* Accounting Management System Routes */}
        <Route path="/accounting/*" element={<AccountingWrapper />} />

        {/* // <Route path="/faculty/notification-system" element={<NotificationSystemDashboard />} />
        // <Route path="/faculty/library" element={<LibraryDashboard />} />
        // <Route path="/faculty/bus" element={<BusDashboard />} />
        // <Route path="/faculty/hostel" element={<HostelDashboard />} /> */}
      </Routes>
    </Router>
  );
};

export default App;
