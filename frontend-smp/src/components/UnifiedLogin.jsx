import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UnifiedLogin = () => {
  const [loginType, setLoginType] = useState("student"); // "student" or "faculty"
  const [studentId, setStudentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const roleRedirectMap = {
    "Student Management": "/dashboard/summary",
    "Account Section Management": "/faculty/account-section",
    "Document Section Management": "/faculty/document-section",
    "Document Management": "/faculty/document-section",
    "Scholarship Management": "/faculty/scholarship",
    "Notification System Management": "/faculty/notification-system",
    "Library Management": "/faculty/library",
    "Bus Management": "/faculty/bus",
    "Hostel Management": "/faculty/hostel",
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!studentId.trim() || !password.trim()) {
      setError("Please enter both Student ID and Password");
      setLoading(false);
      return;
    }

    try {
      const API_URL =
        import.meta.env.REACT_APP_API_URL || "http://erpbackend.tarstech.in";

      const response = await axios.post(`${API_URL}/api/student/auth/login`, {
        studentId: studentId.trim(),
        password: password.trim(),
      });

      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem(
          "studentData",
          JSON.stringify(response.data.student)
        );
        navigate("/student/main");
      } else {
        setError(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Student login error:", error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === "ECONNREFUSED") {
        setError("Unable to connect to server. Please try again later.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!employeeId.trim() || !password.trim()) {
      setError("Please enter both Employee ID and Password");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        "http://erpbackend.tarstech.in/api/faculty/rolelogin",
        {
          employeeId: employeeId.trim(),
          password: password.trim(),
        }
      );

      const faculty = res.data.faculty;

      if (faculty.employmentStatus !== "Permanent Employee") {
        setError("Access denied: Only Permanent Employees can log in.");
        setLoading(false);
        return;
      }

      const redirectPath = roleRedirectMap[faculty.designation.trim()];

      if (!redirectPath) {
        setError(
          `Access denied: Your role "${faculty.designation}" does not have dashboard access.`
        );
        setLoading(false);
        return;
      }

      localStorage.setItem("facultyToken", res.data.token);
      localStorage.setItem("facultyData", JSON.stringify(faculty));
      console.log("Faculty Data:", faculty);
      console.log("Redirect Path:", redirectPath);

      navigate(redirectPath);
    } catch (error) {
      console.error("Faculty login error:", error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === "ECONNREFUSED") {
        setError("Unable to connect to server. Please try again later.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (loginType === "student") {
      handleStudentLogin(e);
    } else {
      handleFacultyLogin(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600">Access your dashboard</p>
        </div>

        {/* Login Type Selection */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginType("student");
              setError("");
              setStudentId("");
              setEmployeeId("");
              setPassword("");
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              loginType === "student"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Student Login
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginType("faculty");
              setError("");
              setStudentId("");
              setEmployeeId("");
              setPassword("");
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              loginType === "faculty"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Faculty Login
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="loginId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {loginType === "student" ? "Student ID" : "Employee ID"}
            </label>
            <input
              id="loginId"
              name="loginId"
              type="text"
              required
              value={loginType === "student" ? studentId : employeeId}
              onChange={(e) => {
                if (loginType === "student") {
                  setStudentId(e.target.value);
                } else {
                  setEmployeeId(e.target.value);
                }
              }}
              placeholder={
                loginType === "student"
                  ? "Enter your student ID"
                  : "Enter your employee ID"
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </div>
            ) : (
              `Sign in as ${loginType === "student" ? "Student" : "Faculty"}`
            )}
          </button>

          {/* Super Admin Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">System Administrator?</p>
            <button
              type="button"
              onClick={() => navigate("/super-admin-ved/login")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200 mr-4"
            >
              Super Admin Login
            </button>
          </div>

          {/* ERP Bus Management Link */}
          <div className="text-center pt-2">
            <p className="text-sm text-gray-600 mb-2">Other Systems?</p>
            <div className="flex justify-center space-x-2 flex-wrap gap-1">
              <button
                type="button"
                onClick={() => navigate("/erp/login")}
                className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors duration-200"
              >
                Bus Management
              </button>
              <span className="text-gray-400">|</span>
              <button
                type="button"
                onClick={() => navigate("/library")}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors duration-200"
              >
                Library System
              </button>
              <span className="text-gray-400">|</span>
              <button
                type="button"
                onClick={() => navigate("/faculty-erp/login")}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors duration-200"
              >
                Faculty ERP
              </button>
              <span className="text-gray-400">|</span>
              <button
                type="button"
                onClick={() => navigate("/accounting/login")}
                className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
              >
                Accounting
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnifiedLogin;
