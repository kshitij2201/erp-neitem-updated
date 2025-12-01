import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  Briefcase,
  TrendingUp,
  BarChart3,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const navigate = useNavigate();
  
  // State for storing API data
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [streams, setStreams] = useState([]);

  // Derived data states
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalFaculties, setTotalFaculties] = useState(0);
  const [studentsByDept, setStudentsByDept] = useState({});
  const [facultiesByDept, setFacultiesByDept] = useState({});
  const [streamsByDept, setStreamsByDept] = useState({});
  const [studentsByStream, setStudentsByStream] = useState({});

  // New state for faculty role filter
  const [facultyRoleFilter, setFacultyRoleFilter] = useState("All");

  // Toggle states for detailed graphs
  const [showStudentGraph, setShowStudentGraph] = useState(false);
  const [showFacultyGraph, setShowFacultyGraph] = useState(false);
  const [showDeptGraph, setShowDeptGraph] = useState(false);
  const [showStreamGraph, setShowStreamGraph] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
          // No token found, redirect to login
          localStorage.removeItem('token');
          navigate('/');
          return;
        }

        // Create headers with authorization
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [
          studentsResponse,
          facultiesResponse,
          departmentsResponse,
          streamsResponse,
        ] = await Promise.all([
          fetch(
            "http://localhost:4000/api/superadmin/students",
            { headers }
          ),
          fetch(
            `http://localhost:4000/api/superadmin/faculties?role=${facultyRoleFilter}`,
            { headers }
          ),
          fetch(
            "http://localhost:4000/api/superadmin/departments",
            { headers }
          ),
          fetch(
            "http://localhost:4000/api/superadmin/streams",
            { headers }
          ),
        ]);

        // Check for authentication errors
        if (studentsResponse.status === 401 || facultiesResponse.status === 401 || 
            departmentsResponse.status === 401 || streamsResponse.status === 401) {
          // Token is invalid or expired, redirect to login
          localStorage.removeItem('token');
          navigate('/');
          return;
        }

        if (!studentsResponse.ok)
          throw new Error("Failed to fetch students data");
        if (!facultiesResponse.ok)
          throw new Error("Failed to fetch faculties data");
        if (!departmentsResponse.ok)
          throw new Error("Failed to fetch departments data");
        if (!streamsResponse.ok)
          throw new Error("Failed to fetch streams data");

        const studentsData = await studentsResponse.json();
        const facultiesData = await facultiesResponse.json();
        const departmentsData = await departmentsResponse.json();
        const streamsData = await streamsResponse.json();

        // Store data in state
        setStudents(studentsData);
        setFaculties(facultiesData);
        setDepartments(departmentsData);
        setStreams(streamsData);

        // Calculate derived data
        setTotalStudents(studentsData.length);
        setTotalFaculties(facultiesData.length);

        // Process students by department
        const studentsByDeptData = {};
        studentsData.forEach((student) => {
          const dept = student.department?.name || "Unknown";
          studentsByDeptData[dept] = (studentsByDeptData[dept] || 0) + 1;
        });
        setStudentsByDept(studentsByDeptData);

        // Process faculties by department
        const facultiesByDeptData = {};
        facultiesData.forEach((faculty) => {
          const dept = faculty.department?.name || "Unknown";
          facultiesByDeptData[dept] = (facultiesByDeptData[dept] || 0) + 1;
        });
        setFacultiesByDept(facultiesByDeptData);

        // Process streams by department (actually count departments per stream)
        const streamsByDeptData = {};
        departmentsData.forEach((department) => {
          const streamName = department.stream?.name || "Unknown";
          streamsByDeptData[streamName] = (streamsByDeptData[streamName] || 0) + 1;
        });
        setStreamsByDept(streamsByDeptData);

        // Process students by stream
        const studentsByStreamData = {};
        streamsData.forEach((stream) => {
          studentsByStreamData[stream.name] = 0;
        });
        studentsData.forEach((student) => {
          const streamName = student.stream?.name || "Unknown";
          if (studentsByStreamData.hasOwnProperty(streamName)) {
            studentsByStreamData[streamName] += 1;
          } else {
            studentsByStreamData[streamName] = 1;
          }
        });
        setStudentsByStream(studentsByStreamData);
      } catch (error) {
        console.error("Data fetching error:", error);
        
        // Handle authentication errors
        if (error.message.includes('authentication') || error.message.includes('token')) {
          localStorage.removeItem('token');
          navigate('/');
          return;
        }
        
        setError("An error occurred while fetching data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [facultyRoleFilter, navigate]); // Re-run effect when facultyRoleFilter or navigate changes

  // Function to close all graphs except the specified one
  const toggleGraph = (graphToToggle) => {
    setShowStudentGraph(
      graphToToggle === "student" ? !showStudentGraph : false
    );
    setShowFacultyGraph(
      graphToToggle === "faculty" ? !showFacultyGraph : false
    );
    setShowDeptGraph(graphToToggle === "dept" ? !showDeptGraph : false);
    setShowStreamGraph(graphToToggle === "stream" ? !showStreamGraph : false);
  };

  // Stats items with enhanced styling data
  const statItems = [
    {
      title: "Total Students",
      value: totalStudents,
      icon: <Users className="h-6 w-6" />,
      onClick: () => toggleGraph("student"),
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      trend: "+12%",
      description: "Active enrolled students"
    },
    {
      title: "Total Faculties",
      value: totalFaculties,
      icon: <Users className="h-6 w-6" />,
      onClick: () => toggleGraph("faculty"),
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      trend: "+5%",
      description: "Teaching & non-teaching staff"
    },
    {
      title: "Departments",
      value: departments.length,
      icon: <Briefcase className="h-6 w-6" />,
      onClick: () => toggleGraph("dept"),
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      trend: "stable",
      description: "Academic departments"
    },
    {
      title: "Streams",
      value: streams.length,
      icon: <GraduationCap className="h-6 w-6" />,
      onClick: () => toggleGraph("stream"),
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      trend: "+2%",
      description: "Available study streams"
    },
  ];

  // Enhanced chart options with better styling
  const getChartOptions = (title, color) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top", 
        labels: { 
          color: document.documentElement.classList.contains('dark') ? "#E5E7EB" : "#1F2937",
          font: { size: 12, weight: '500' },
          padding: 20
        } 
      },
      title: {
        display: true,
        text: title,
        color: document.documentElement.classList.contains('dark') ? "#F9FAFB" : "#111827",
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 20 }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          color: document.documentElement.classList.contains('dark') ? "#D1D5DB" : "#374151",
          font: { size: 11 }
        },
        grid: { 
          color: document.documentElement.classList.contains('dark') ? "#374151" : "#E5E7EB",
          lineWidth: 1
        },
      },
      x: { 
        ticks: { 
          color: document.documentElement.classList.contains('dark') ? "#D1D5DB" : "#374151",
          font: { size: 11 },
          maxRotation: 45
        }, 
        grid: { display: false } 
      },
    },
  });

  // Bar chart for Students by Department
  const studentDeptChartData = {
    labels: Object.keys(studentsByDept),
    datasets: [
      {
        label: "Students",
        data: Object.values(studentsByDept),
        backgroundColor: "#3B82F6",
        borderColor: "#2563EB",
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  // Bar chart for Faculties by Department
  const facultyDeptChartData = {
    labels: Object.keys(facultiesByDept),
    datasets: [
      {
        label: `Faculties (${facultyRoleFilter})`,
        data: Object.values(facultiesByDept),
        backgroundColor: "#8B5CF6",
        borderColor: "#7C3AED",
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  // Bar chart for Streams by Department
  const streamsByDeptChartData = {
    labels: Object.keys(streamsByDept),
    datasets: [
      {
        label: "Departments",
        data: Object.values(streamsByDept),
        backgroundColor: "#10B981",
        borderColor: "#059669",
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  // Bar chart for Students by Stream
  const studentsByStreamChartData = {
    labels: Object.keys(studentsByStream),
    datasets: [
      {
        label: "Students",
        data: Object.values(studentsByStream),
        backgroundColor: "#F59E0B",
        borderColor: "#D97706",
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  // Chart options for each chart
  const studentDeptChartOptions = getChartOptions("Students by Department", "#3B82F6");
  const facultyDeptChartOptions = getChartOptions(`Faculties by Department (${facultyRoleFilter})`, "#8B5CF6");
  const streamsByDeptChartOptions = getChartOptions("Departments by Stream", "#10B981");
  const studentsByStreamChartOptions = getChartOptions("Students by Stream", "#F59E0B");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center p-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-purple-500/20 border-b-purple-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Loading Dashboard</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Fetching your institution's data...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-3">
              Unable to Load Data
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-gray-800 dark:text-gray-100">
      <div className="space-y-6">
        
        {/* Enhanced Header Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Dashboard Overview
              </h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center text-sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Real-time insights into your institution's performance
              </p>
            </div>
            <div className="mt-3 sm:mt-0">
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Live Data
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {statItems.map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              onClick={stat.onClick}
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              
              {/* Card Content */}
              <div className="relative p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${stat.bgColor} transition-all duration-300 group-hover:scale-110`}>
                        <div className={stat.iconColor}>
                          {React.cloneElement(stat.icon, { className: "h-4 w-4" })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          stat.trend === 'stable' 
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' 
                            : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {stat.trend === 'stable' ? 'Stable' : stat.trend}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {stat.title}
                    </h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.description}
                    </p>
                  </div>
                </div>
                
                {/* Hover Indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Faculty Role Filter */}
        {showFacultyGraph && (
          <div className="mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-3 sm:mb-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    Faculty Analytics
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Filter faculty data by role to get detailed insights
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <label
                    htmlFor="facultyRole"
                    className="text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    Filter by Role:
                  </label>
                  <select
                    id="facultyRole"
                    value={facultyRoleFilter}
                    onChange={(e) => setFacultyRoleFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all duration-200 text-xs"
                  >
                    <option value="All">All Roles</option>
                    <option value="Teaching">Teaching Staff</option>
                    <option value="Non-Teaching">Non-Teaching Staff</option>
                    <option value="HOD">Head of Department</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Chart Sections */}
        <div className="space-y-6">
          {/* Students by Department Chart */}
          {showStudentGraph && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Students by Department</h3>
                    <p className="text-blue-100 text-xs">Distribution across academic departments</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-white/80" />
                </div>
              </div>
              <div className="p-4">
                <div style={{ height: '300px' }}>
                  <Bar data={studentDeptChartData} options={studentDeptChartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Faculty by Department Chart */}
          {showFacultyGraph && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Faculty Distribution</h3>
                    <p className="text-purple-100 text-xs">Staff allocation across departments ({facultyRoleFilter})</p>
                  </div>
                  <Users className="w-6 h-6 text-white/80" />
                </div>
              </div>
              <div className="p-4">
                <div style={{ height: '300px' }}>
                  <Bar data={facultyDeptChartData} options={facultyDeptChartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Departments by Stream Chart */}
          {showDeptGraph && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Departments by Stream</h3>
                    <p className="text-green-100 text-xs">Academic structure organization</p>
                  </div>
                  <Briefcase className="w-6 h-6 text-white/80" />
                </div>
              </div>
              <div className="p-4">
                <div style={{ height: '300px' }}>
                  <Bar data={streamsByDeptChartData} options={streamsByDeptChartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Students by Stream Chart */}
          {showStreamGraph && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Students by Stream</h3>
                    <p className="text-amber-100 text-xs">Enrollment across study programs</p>
                  </div>
                  <GraduationCap className="w-6 h-6 text-white/80" />
                </div>
              </div>
              <div className="p-4">
                <div style={{ height: '300px' }}>
                  <Bar data={studentsByStreamChartData} options={studentsByStreamChartOptions} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
