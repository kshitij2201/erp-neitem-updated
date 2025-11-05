import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaSignOutAlt, FaInfoCircle } from "react-icons/fa";
import { getCurrentUser, getToken } from "../services/authService";
import { getAllBuses } from "../services/busServices";
import axios from "axios";

// Import student components
import AllBuses from "../components/student/AllBuses";
import MyBus from "../components/student/MyBus";
import BusMonitor from "../components/student/BusMonitor";
import BusSchedule from "../components/student/BusSchedule";

const StudentDashboard = () => {
  const [user, setUser] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [busInfo, setBusInfo] = useState(null);
  const [allBuses, setAllBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("all-buses");
  const [isDesktop, setIsDesktop] = useState(false); // New state for desktop detection
  const navigate = useNavigate();

  // Debug screen size and sidebar visibility
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isDesktopSize = width >= 1280;

      setIsDesktop(isDesktopSize);

      console.log("=== SIDEBAR DEBUG INFO ===");
      console.log(`Screen size: ${width}px × ${height}px`);
      console.log(
        `Tailwind xl breakpoint (1280px): ${
          width >= 1280 ? "ACTIVE" : "INACTIVE"
        }`
      );
      console.log(
        `Tailwind lg breakpoint (1024px): ${
          width >= 1024 ? "ACTIVE" : "INACTIVE"
        }`
      );
      console.log(
        `Desktop sidebar should be visible: ${width >= 1280 ? "YES" : "NO"}`
      );
      console.log(`Mobile sidebar is open: ${isSidebarOpen ? "YES" : "NO"}`);
      console.log(`isDesktop state: ${isDesktopSize}`);

      // Check if sidebar element exists in DOM
      const desktopSidebar = document.querySelector(".desktop-sidebar-debug");
      const mobileSidebar = document.querySelector(".mobile-sidebar-debug");
      console.log("Desktop sidebar element found:", !!desktopSidebar);
      console.log("Mobile sidebar element found:", !!mobileSidebar);

      if (desktopSidebar) {
        const computedStyle = window.getComputedStyle(desktopSidebar);
        console.log("Desktop sidebar display:", computedStyle.display);
        console.log("Desktop sidebar visibility:", computedStyle.visibility);
        console.log("Desktop sidebar opacity:", computedStyle.opacity);
        console.log("Desktop sidebar classes:", desktopSidebar.className);
      }

      if (mobileSidebar) {
        const computedStyle = window.getComputedStyle(mobileSidebar);
        console.log("Mobile sidebar display:", computedStyle.display);
        console.log("Mobile sidebar transform:", computedStyle.transform);
        console.log("Mobile sidebar classes:", mobileSidebar.className);
      }

      console.log("=========================");
    };

    // Check on mount
    checkScreenSize();

    // Check on resize
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [isSidebarOpen]);

  // Fetch all buses
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const token = getToken();
        if (!token) {
          return;
        }

        console.log("Fetching buses from API...");
        const response = await getAllBuses();
        console.log("Buses response:", response.data);

        if (response.data && response.data.data && response.data.data.buses) {
          setAllBuses(response.data.data.buses);
        } else if (response.data && response.data.buses) {
          setAllBuses(response.data.buses);
        } else if (Array.isArray(response.data)) {
          setAllBuses(response.data);
        } else {
          console.log("No buses found in response");
          setAllBuses([]);
        }
      } catch (err) {
        console.error("Error fetching buses:", err);
        // Don't redirect on bus fetch error, just log it
        setError(
          "Failed to fetch bus information (API might not be available)"
        );
        setAllBuses([]);
      }
    };

    if (user) {
      fetchBuses();
      // Refresh buses every 30 seconds
      const interval = setInterval(fetchBuses, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    const studentData = JSON.parse(
      localStorage.getItem("studentData") || "null"
    );
    const token = getToken();

    console.log("Auth check:", { currentUser, studentData, token: !!token });

    // Check for authentication - token is required
    if (!token) {
      console.log("No token found, redirecting to login");
      navigate("/");
      return;
    }

    // For student login, prioritize studentData
    if (studentData) {
      console.log("Setting user data from studentData:", studentData);
      setUser(studentData);
      return;
    }

    // Check for regular user with student role
    if (currentUser && currentUser.role === "student") {
      console.log("Setting user data from currentUser:", currentUser);
      setUser(currentUser);
      return;
    }

    // If we reach here, no valid user data found
    console.log("No valid user data found, redirecting to login");
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        console.log("User data available:", user);

        // Try to fetch additional student data if we have an ID
        if (user._id || user.id) {
          try {
            const studentId = user._id || user.id;
            const studentResponse = await axios.get(
              `https://backenderp.tarstech.in/api/students/${studentId}`,
              {
                headers: {
                  Authorization: `Bearer ${getToken()}`,
                },
              }
            );

            if (studentResponse.data) {
              console.log("Additional student data:", studentResponse.data);
              setStudentData(studentResponse.data);

              // Check for assigned route
              if (studentResponse.data.routes || studentResponse.data.route) {
                const assignedRoute =
                  studentResponse.data.routes || studentResponse.data.route;
                console.log("Student assigned route:", assignedRoute);

                // Find bus for this route
                const assignedBus = allBuses.find((bus) => {
                  return (
                    bus.route &&
                    (bus.route.name === assignedRoute ||
                      bus.route === assignedRoute)
                  );
                });

                if (assignedBus) {
                  setBusInfo(assignedBus);
                  console.log("Found assigned bus:", assignedBus);
                } else {
                  console.log("No bus found for route:", assignedRoute);
                }
              }
            }
          } catch (err) {
            console.log(
              "Could not fetch additional student data:",
              err.message
            );
            // This is okay, we can still use the basic user data
          }
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
        setError("Failed to fetch student information");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, allBuses]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("studentData");
    navigate("/");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!user) {
    console.log("No user data, showing loading...");
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Loading...
      </div>
    );
  }

  console.log("Student Dashboard rendering with user:", user);
  // Temporarily commented out to allow all students access
  // if (!user.busService) return <div className="flex justify-center items-center h-screen text-red-400">You are not eligible for bus service.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-blue-900">
      {/* Mobile Sidebar Overlay */}
      {!isDesktop && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Top Navigation Bar */}
      <div
        className={`bg-white/10 backdrop-blur-md shadow-lg border-b border-white/20 ${
          isDesktop ? "pl-64" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center flex-1 min-w-0">
              {!isDesktop && (
                <button
                  onClick={toggleSidebar}
                  className="text-white hover:text-indigo-300 mr-2 sm:mr-4 p-1"
                >
                  <FaBars size={18} />
                </button>
              )}
              {isDesktop ? (
                <div className="flex items-center space-x-6 w-full">
                  <h1 className="text-white text-lg xl:text-xl font-bold mr-4 xl:mr-8 whitespace-nowrap">
                    College Bus Management
                  </h1>
                  <nav className="flex space-x-2 lg:space-x-4">
                    <button
                      onClick={() => setActiveSection("all-buses")}
                      className={`px-2 lg:px-4 py-2 rounded-lg text-sm lg:text-base font-medium transition-colors duration-200 whitespace-nowrap ${
                        activeSection === "all-buses"
                          ? "bg-indigo-600 text-white shadow-lg"
                          : "text-gray-200 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      All Buses
                    </button>

                    <button
                      onClick={() => setActiveSection("my-bus")}
                      className={`px-2 lg:px-4 py-2 rounded-lg text-sm lg:text-base font-medium transition-colors duration-200 whitespace-nowrap ${
                        activeSection === "my-bus"
                          ? "bg-indigo-600 text-white shadow-lg"
                          : "text-gray-200 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      My Buses
                    </button>

                    <button
                      onClick={() => setActiveSection("schedule")}
                      className={`px-2 lg:px-4 py-2 rounded-lg text-sm lg:text-base font-medium transition-colors duration-200 whitespace-nowrap ${
                        activeSection === "schedule"
                          ? "bg-indigo-600 text-white shadow-lg"
                          : "text-gray-200 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      Schedule
                    </button>
                  </nav>
                </div>
              ) : (
                <h1 className="text-white text-sm sm:text-lg font-bold truncate">
                  College Bus Management
                </h1>
              )}
            </div>

            {/* Mobile User Info */}
            {!isDesktop && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="bg-white/20 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                  Student
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700 transition-colors duration-200"
                >
                  <FaSignOutAlt className="mr-1 sm:mr-2" size={12} />
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {!isDesktop && (
        <div
          className={`mobile-sidebar-debug fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white/10 backdrop-blur-md shadow-lg border-r border-white/20 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-white/20">
            <h1 className="text-white text-lg font-bold">Bus Management</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-white hover:text-indigo-300 p-1"
            >
              <FaTimes size={18} />
            </button>
          </div>

          <nav className="mt-6 px-4 flex-1">
            <div className="space-y-3">
              <button
                onClick={() => {
                  setActiveSection("all-buses");
                  setIsSidebarOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeSection === "all-buses"
                    ? "bg-indigo-600 text-white shadow-lg transform scale-105"
                    : "text-gray-200 hover:bg-white/20 hover:text-white hover:transform hover:scale-105"
                }`}
              >
                All Buses
              </button>

              <button
                onClick={() => {
                  setActiveSection("my-bus");
                  setIsSidebarOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeSection === "my-bus"
                    ? "bg-indigo-600 text-white shadow-lg transform scale-105"
                    : "text-gray-200 hover:bg-white/20 hover:text-white hover:transform hover:scale-105"
                }`}
              >
                My Buses
              </button>

              <button
                onClick={() => {
                  setActiveSection("schedule");
                  setIsSidebarOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeSection === "schedule"
                    ? "bg-indigo-600 text-white shadow-lg transform scale-105"
                    : "text-gray-200 hover:bg-white/20 hover:text-white hover:transform hover:scale-105"
                }`}
              >
                Schedule
              </button>
            </div>
          </nav>

          {/* Mobile Logout Button */}
          <div className="absolute bottom-0 w-full p-4 border-t border-white/20 bg-white/5">
            <div className="mb-3">
              <span className="block bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-medium text-center">
                Student Portal
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <FaSignOutAlt className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`py-6 px-4 sm:px-6 lg:px-8 transition-all duration-200 ${
          isDesktop ? "pl-64" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 text-center drop-shadow-md">
            Welcome, {user?.name || user?.firstName || "Student"}
          </h2>

          {/* Page Content */}
          <div className="mt-6">
            {loading ? (
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading student information...</p>
              </div>
            ) : error ? (
              <div className="text-center text-red-400 bg-red-900/20 p-6 rounded-lg mb-6">
                <FaInfoCircle className="mx-auto mb-4" size={48} />
                <p>{error}</p>
                <p className="mt-2 text-sm text-gray-300">
                  You can still view the bus management system below
                </p>
              </div>
            ) : null}

            {/* Student Info Card - Show if we have user data */}
            {user && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Student Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                  <div>
                    <p>
                      <strong>Name:</strong> {user?.firstName || user?.name}{" "}
                      {user?.lastName || ""}
                    </p>
                    <p>
                      <strong>Student ID:</strong>{" "}
                      {user?.studentId || user?.id || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Email:</strong> {user?.email || "N/A"}
                    </p>
                    <p>
                      <strong>Department:</strong>{" "}
                      {user?.department?.name || user?.department || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Bus Information */}
                {busInfo && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <h4 className="text-lg font-semibold text-white mb-2">
                      Your Assigned Bus
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                      <div>
                        <p>
                          <strong>Bus Number:</strong> {busInfo.busNumber}
                        </p>
                        <p>
                          <strong>Route:</strong>{" "}
                          {busInfo.route?.name || busInfo.route}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Driver:</strong>{" "}
                          {busInfo.driver?.name || "N/A"}
                        </p>
                        <p>
                          <strong>Contact:</strong>{" "}
                          {busInfo.driver?.phoneNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bus Status */}
                <div className="mt-4 pt-4 border-t border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Bus Service Status
                  </h4>
                  <div className="flex items-center space-x-4">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Active Buses: {allBuses.length}
                    </span>
                    {busInfo ? (
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Bus Assigned
                      </span>
                    ) : (
                      <span className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        No Bus Assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Bus Management Content */}
            {activeSection === "all-buses" && <AllBuses />}
            {activeSection === "my-bus" && <MyBus />}
            {activeSection === "schedule" && <BusSchedule />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
