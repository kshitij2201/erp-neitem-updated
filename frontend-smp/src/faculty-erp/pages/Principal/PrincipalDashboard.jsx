import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Filter,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Calendar,
  Trash2,
} from "lucide-react";

export default function PrincipalDashboard() {
  const [graphFilter, setGraphFilter] = useState("Faculties"); // Graph filter: 'Faculties', 'Students'
  const [dashboardStats, setDashboardStats] = useState({
    totalFaculties: 0,
    totalStudents: 0,
    totalDepartments: 0,
    departmentWiseData: [],
    pendingApprovals: 0,
    pendingApprovalsBreakdown: {
      leaveApprovals: 0,
      odLeaveApprovals: 0,
      facultyApprovals: 0,
      handoverApprovals: 0,
    },
  });
  const [todos, setTodos] = useState([]);
  const [todoStats, setTodoStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });
  const [timetables, setTimetables] = useState({
    summary: {
      totalTimetables: 0,
      totalDepartments: 0,
      departmentBreakdown: [],
    },
    timetablesByDepartment: {},
    allTimetables: [],
  });
  const [showTimetables, setShowTimetables] = useState(false);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    priority: "Medium",
    category: "Administrative",
    assignedTo: "",
    assignedToRole: "faculty",
    department: "",
    dueDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // Fetch counts from all 3 endpoints and todos
    const fetchData = async () => {
      if (!isMounted) return;

      setLoading(true);
      setError(null);
      try {
        // Get auth token
        const token = localStorage.getItem("authToken");
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // Fetch counts from all 5 endpoints
        const [
          facultiesRes,
          studentsRes,
          departmentsRes,
          pendingApprovalsRes,
          timetablesRes,
        ] = await Promise.all([
          fetch("https://erpbackend:tarstech.in/api/superadmin/faculties/all", {
            headers,
          }),
          fetch("https://erpbackend:tarstech.in/api/superadmin/students/all", {
            headers,
          }),
          fetch(
            "https://erpbackend:tarstech.in/api/superadmin/departments/all",
            {
              headers,
            }
          ),
          fetch(
            "https://erpbackend:tarstech.in/api/dashboard/principal-pending-approvals",
            { headers }
          ),
          fetch(
            "https://erpbackend:tarstech.in/api/dashboard/principal-all-timetables",
            {
              headers,
            }
          ),
        ]);

        if (!isMounted) return;

        const [
          facultiesData,
          studentsData,
          departmentsData,
          pendingApprovalsData,
          timetablesData,
        ] = await Promise.all([
          facultiesRes.json(),
          studentsRes.json(),
          departmentsRes.json(),
          pendingApprovalsRes.json(),
          timetablesRes.json(),
        ]);

        console.log("Faculty data:", facultiesData);
        console.log("Student data:", studentsData);
        console.log("Department data:", departmentsData);
        console.log("Pending approvals data:", pendingApprovalsData);
        console.log("Timetables data:", timetablesData);

        // Try to fetch todos separately with error handling
        try {
          const todosRes = await fetch(
            "https://erpbackend:tarstech.in/api/dashboard/principal-todos-demo",
            { headers }
          );
          if (todosRes.ok && isMounted) {
            const todosData = await todosRes.json();
            console.log("Todos data:", todosData);
            setTodos(todosData.todos || []);
            setTodoStats(
              todosData.stats || {
                total: 0,
                pending: 0,
                inProgress: 0,
                completed: 0,
                overdue: 0,
              }
            );
          } else if (isMounted) {
            console.log("Todo endpoint not accessible, using empty state");
            setTodos([]);
            setTodoStats({
              total: 0,
              pending: 0,
              inProgress: 0,
              completed: 0,
              overdue: 0,
            });
          }
        } catch (todoError) {
          console.log("Todo fetch error:", todoError);
          if (isMounted) {
            setTodos([]);
            setTodoStats({
              total: 0,
              pending: 0,
              inProgress: 0,
              completed: 0,
              overdue: 0,
            });
          }
        }

        // Get department names from departments data
        const allDepartments = departmentsData.departmentList || [];

        // Create real department-wise data by merging faculty and student data
        // then deduplicate/merge entries with the same department name (summing counts)
        const departmentWiseDataRaw = allDepartments.map((dept) => {
          const facultyCount =
            facultiesData.departmentWise?.find((f) => f.name === dept.name)
              ?.count || 0;
          const studentCount =
            studentsData.departmentWise?.find((s) => s.name === dept.name)
              ?.count || 0;

          return {
            name: dept.name,
            Faculties: facultyCount,
            Students: studentCount,
          };
        });

        // Reduce to unique departments by name, summing Faculties and Students
        const departmentWiseData = Object.values(
          departmentWiseDataRaw.reduce((acc, curr) => {
            const key = String(curr.name).trim();
            if (!acc[key]) {
              acc[key] = { ...curr };
            } else {
              acc[key].Faculties =
                (acc[key].Faculties || 0) + (curr.Faculties || 0);
              acc[key].Students =
                (acc[key].Students || 0) + (curr.Students || 0);
            }
            return acc;
          }, {})
        );

        // Set the counts only if component is still mounted
        if (isMounted) {
          setDashboardStats({
            totalFaculties: facultiesData.total || 0,
            totalStudents: studentsData.total || 0,
            totalDepartments: departmentsData.total || 0,
            departmentWiseData,
            pendingApprovals: pendingApprovalsData.totalPendingApprovals || 0,
            pendingApprovalsBreakdown: pendingApprovalsData.breakdown || {
              leaveApprovals: 0,
              odLeaveApprovals: 0,
              facultyApprovals: 0,
              handoverApprovals: 0,
            },
          });

          // Set timetables data
          setTimetables({
            summary: timetablesData.summary || {
              totalTimetables: 0,
              totalDepartments: 0,
              departmentBreakdown: [],
            },
            timetablesByDepartment: timetablesData.timetablesByDepartment || {},
            allTimetables: timetablesData.allTimetables || [],
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        if (isMounted) {
          setError(err.message || "Error fetching data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - runs only once

  // Extract data from the dashboard stats
  const {
    totalFaculties,
    totalStudents,
    totalDepartments,
    departmentWiseData,
    pendingApprovals,
    pendingApprovalsBreakdown,
  } = dashboardStats;
  const newHires = 5; // Mock data
  const budgetUtilization = 75; // Mock data

  // Todo management functions
  const handleAddTodo = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "https://erpbackend:tarstech.in/api/dashboard/principal-todos-demo",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newTodo),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTodos([result.todo, ...todos]);
        setTodoStats((prev) => ({
          ...prev,
          total: prev.total + 1,
          pending: prev.pending + 1,
        }));
        setNewTodo({
          title: "",
          description: "",
          priority: "Medium",
          category: "Administrative",
          assignedTo: "",
          assignedToRole: "faculty",
          department: "",
          dueDate: "",
        });
        setShowAddTodo(false);
      }
    } catch (err) {
      console.error("Error adding todo:", err);
    }
  };

  const handleUpdateTodo = async (id, status) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://erpbackend:tarstech.in/api/dashboard/principal-todos-demo/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTodos(todos.map((todo) => (todo._id === id ? result.todo : todo)));
        // Refresh stats
        const oldTodo = todos.find((t) => t._id === id);
        if (oldTodo) {
          setTodoStats((prev) => ({
            ...prev,
            [oldTodo.status.toLowerCase().replace(" ", "")]:
              prev[oldTodo.status.toLowerCase().replace(" ", "")] - 1,
            [status.toLowerCase().replace(" ", "")]:
              prev[status.toLowerCase().replace(" ", "")] + 1,
          }));
        }
      }
    } catch (err) {
      console.error("Error updating todo:", err);
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://erpbackend:tarstech.in/api/dashboard/principal-todos-demo/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const deletedTodo = todos.find((t) => t._id === id);
        setTodos(todos.filter((todo) => todo._id !== id));
        if (deletedTodo) {
          setTodoStats((prev) => ({
            ...prev,
            total: prev.total - 1,
            [deletedTodo.status.toLowerCase().replace(" ", "")]:
              prev[deletedTodo.status.toLowerCase().replace(" ", "")] - 1,
          }));
        }
      }
    } catch (err) {
      console.error("Error deleting todo:", err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Urgent":
        return "text-red-600 bg-red-100";
      case "High":
        return "text-orange-600 bg-orange-100";
      case "Medium":
        return "text-yellow-600 bg-yellow-100";
      case "Low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "text-green-600 bg-green-100";
      case "In Progress":
        return "text-blue-600 bg-blue-100";
      case "Pending":
        return "text-gray-600 bg-gray-100";
      case "Cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Colors for Charts
  const COLORS = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED"];

  // Use real department-wise data for charts - memoized to prevent infinite loops
  const barChartData = useMemo(() => departmentWiseData, [departmentWiseData]);

  // Pie Chart Data (dynamic based on graphFilter) - memoized
  const pieChartData = useMemo(
    () =>
      departmentWiseData.map((dept, index) => ({
        name: dept.name,
        value: graphFilter === "Faculties" ? dept.Faculties : dept.Students,
        fill: COLORS[index % COLORS.length],
      })),
    [departmentWiseData, graphFilter]
  );

  // Custom Tooltip for Bar Chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.fill }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Pie Chart
  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">
            {payload[0].name}
          </p>
          <p className="text-sm" style={{ color: payload[0].fill }}>
            {graphFilter}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Principal Dashboard
            </h1>
          </div>
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64 xs:h-72 sm:h-80 bg-gray-200 rounded"></div>
              <div className="h-64 xs:h-72 sm:h-80 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Principal Dashboard
            </h1>
          </div>
          <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-md mb-4">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Principal Dashboard
          </h1>
        </div>

        {/* Total Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Total Faculties
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-2">
              {totalFaculties.toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Active faculty members
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Total Students
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">
              {totalStudents.toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Enrolled students
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              New Hires
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-2">
              {newHires.toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Recent additions
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Departments
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-2">
              {totalDepartments.toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Active departments
            </p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Pending Approvals
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-2">
              {pendingApprovals.toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Requires your attention
            </p>
            {/* Breakdown details */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Leave Applications:</span>
                <span className="font-medium">
                  {pendingApprovalsBreakdown.leaveApprovals}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>OD Applications:</span>
                <span className="font-medium">
                  {pendingApprovalsBreakdown.odLeaveApprovals}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Faculty Approvals:</span>
                <span className="font-medium">
                  {pendingApprovalsBreakdown.facultyApprovals}
                </span>
              </div>
              {pendingApprovalsBreakdown.handoverApprovals > 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Handover Requests:</span>
                  <span className="font-medium">
                    {pendingApprovalsBreakdown.handoverApprovals}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Budget Utilization
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-2">
              {budgetUtilization}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Graph Section */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-0">
              Department-wise Distribution
            </h2>
            <div className="flex items-center space-x-3">
              <Filter size={16} className="text-gray-600" />
              <select
                value={graphFilter}
                onChange={(e) => setGraphFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 w-full sm:w-auto"
              >
                <option value="Faculties">Faculties</option>
                <option value="Students">Students</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bar Chart */}
            <div className="h-64 xs:h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 20, right: 10, left: -10, bottom: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#4B5563" }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                    interval={0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#4B5563" }}
                    width={30}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "#F3F4F6" }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey={graphFilter}
                    fill={graphFilter === "Faculties" ? "#2563EB" : "#059669"}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Pie Chart */}
            <div className="h-64 xs:h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={window.innerWidth < 640 ? 60 : 80}
                    innerRadius={window.innerWidth < 640 ? 30 : 40}
                    label={{ fontSize: 10, fill: "#4B5563" }}
                    animationDuration={800}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Todo List Section */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-0">
              Daily Tasks Management
            </h2>
            <button
              onClick={() => setShowAddTodo(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
            >
              <Plus size={16} />
              <span>Add Task</span>
            </button>
          </div>

          {/* Todo Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-900">
                {todoStats.total}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-yellow-600">
                {todoStats.pending}
              </div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-600">
                {todoStats.inProgress}
              </div>
              <div className="text-sm text-blue-600">In Progress</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-green-600">
                {todoStats.completed}
              </div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-red-600">
                {todoStats.overdue}
              </div>
              <div className="text-sm text-red-600">Overdue</div>
            </div>
          </div>

          {/* Add Todo Form */}
          {showAddTodo && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">
                Add New Task
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTodo.title}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, title: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTodo.priority}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, priority: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newTodo.category}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, category: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Administrative">Administrative</option>
                    <option value="Academic">Academic</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Review">Review</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={newTodo.assignedTo}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, assignedTo: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Employee ID or Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={newTodo.department}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, department: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departmentWiseData.map((dept) => (
                      <option key={dept.name} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTodo.dueDate}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, dueDate: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTodo.description}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, description: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                    placeholder="Enter task description"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => setShowAddTodo(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTodo}
                  disabled={
                    !newTodo.title ||
                    !newTodo.assignedTo ||
                    !newTodo.department ||
                    !newTodo.dueDate
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
                >
                  Add Task
                </button>
              </div>
            </div>
          )}

          {/* Todo List */}
          <div className="space-y-3">
            {todos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No tasks yet. Add your first task to get started!</p>
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {todo.title}
                          </h4>
                          {todo.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {todo.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                todo.priority
                              )}`}
                            >
                              {todo.priority}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                todo.status
                              )}`}
                            >
                              {todo.status}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                              {todo.category}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">
                              {todo.department}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Assigned to: {todo.assignedTo}</span>
                            <span className="flex items-center">
                              <Calendar size={12} className="mr-1" />
                              Due: {new Date(todo.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                      {todo.status !== "Completed" && (
                        <>
                          <button
                            onClick={() =>
                              handleUpdateTodo(todo._id, "In Progress")
                            }
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Mark as In Progress"
                          >
                            <Clock size={16} />
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateTodo(todo._id, "Completed")
                            }
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Mark as Completed"
                          >
                            <Check size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteTodo(todo._id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete Task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timetables Section */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-0">
              All Department Timetables
            </h2>
            <button
              onClick={() => setShowTimetables(!showTimetables)}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
            >
              <Calendar size={16} />
              <span>{showTimetables ? "Hide" : "View"} Timetables</span>
            </button>
          </div>

          {/* Timetables Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {timetables.summary.totalTimetables}
              </div>
              <div className="text-sm text-indigo-600">Total Timetables</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {timetables.summary.totalDepartments}
              </div>
              <div className="text-sm text-purple-600">Departments</div>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-pink-600">
                {timetables.summary.departmentBreakdown.reduce(
                  (acc, dept) => acc + dept.semesters,
                  0
                )}
              </div>
              <div className="text-sm text-pink-600">Total Semesters</div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {timetables.summary.departmentBreakdown.map((dept, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {dept.department}
                </h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Timetables:</span>
                    <span className="font-medium text-indigo-600">
                      {dept.count}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Semesters:</span>
                    <span className="font-medium text-purple-600">
                      {dept.semesters}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sections:</span>
                    <span className="font-medium text-pink-600">
                      {dept.sections}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Timetables View */}
          {showTimetables && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Detailed Timetables by Department
              </h3>
              {Object.keys(timetables.timetablesByDepartment).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>No timetables found</p>
                </div>
              ) : (
                Object.keys(timetables.timetablesByDepartment).map(
                  (department) => (
                    <div
                      key={department}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Calendar size={18} className="mr-2 text-indigo-600" />
                        {department}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {timetables.timetablesByDepartment[department].map(
                          (timetable) => (
                            <div
                              key={timetable._id}
                              className="bg-gray-50 border border-gray-200 rounded p-3"
                            >
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                    Semester:
                                  </span>
                                  <span className="font-medium">
                                    {timetable.semester}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                    Section:
                                  </span>
                                  <span className="font-medium">
                                    {timetable.section}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Year:</span>
                                  <span className="font-medium">
                                    {timetable.year}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                    Created:
                                  </span>
                                  <span className="font-medium text-xs">
                                    {new Date(
                                      timetable.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                    Modified:
                                  </span>
                                  <span className="font-medium text-xs">
                                    {new Date(
                                      timetable.lastModified
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
