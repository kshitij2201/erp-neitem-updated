import React from 'react';
import { Navigate } from 'react-router-dom';

// ERP Private Route component based on the original ERP logic
const ERPPrivateRoute = ({ children, roles }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const studentData = JSON.parse(localStorage.getItem('studentData') || 'null');

  // Must have a token
  if (!token) {
    return <Navigate to="/erp/login" replace />;
  }

  // For student routes specifically
  if (roles && roles.includes('student')) {
    // Accept if we have either studentData or user with student role
    if (studentData || (user && user.role === 'student')) {
      return children;
    }
    return <Navigate to="/erp/login" replace />;
  }

  // For other roles
  if (!user) {
    return <Navigate to="/erp/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/erp/login" replace />;
  }

  return children;
};

export default ERPPrivateRoute;
