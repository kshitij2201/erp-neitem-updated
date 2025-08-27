import React, { useEffect, useState } from "react";
import {
  fetchFacultyDistribution,
  fetchStudentDistribution,
} from "../utils/departmentUtils";
import {
  LogOut,
  Users,
  BookOpen,
  Calendar,
  Award,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  FileText,
  TrendingUp,
  User,
  Building,
  Mail,
  Star,
  Briefcase,
  Target,
  Plus,
  Check,
  X,
  Edit3,
  Trash2,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import LeaveManagement from "../components/LeaveManagement";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Dashboard({ userData, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [editingTodo, setEditingTodo] = useState(null);
  const [editText, setEditText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Sample quick stats based on role
  const getQuickStats = () => {
    const baseStats = [
      { label: "Profile Completion", value: "95%", icon: User, color: "blue" },
      { label: "This Month", value: "24 Days", icon: Calendar, color: "green" },
    ];

    if (userData?.role === "facultymanagement") {
      return [
        ...baseStats,
        { label: "Total Faculty", value: "120", icon: Users, color: "purple" },
        {
          label: "Active Departments",
          value: "8",
          icon: Building,
          color: "orange",
        },
      ];
    } else if (userData?.role === "faculty") {
      return [
        ...baseStats,
        { label: "Classes Today", value: "4", icon: BookOpen, color: "purple" },
        {
          label: "Student Attendance",
          value: "92%",
          icon: TrendingUp,
          color: "orange",
        },
      ];
    } else {
      return [
        ...baseStats,
        {
          label: "Tasks Completed",
          value: "18",
          icon: CheckCircle,
          color: "purple",
        },
        { label: "Pending Items", value: "3", icon: Clock, color: "orange" },
      ];
    }
  };

  // Load todos from localStorage
  useEffect(() => {
    const savedTodos = localStorage.getItem(
      `todos_${userData?.email || "user"}`
    );
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }

    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [userData?.email]);

  // Save todos to localStorage
  useEffect(() => {
    if (userData?.email) {
      localStorage.setItem(`todos_${userData.email}`, JSON.stringify(todos));
    }
  }, [todos, userData?.email]);

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo = {
        id: Date.now(),
        text: newTodo.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setTodos([...todos, todo]);
      setNewTodo("");
    }
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const startEdit = (todo) => {
    setEditingTodo(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      setTodos(
        todos.map((todo) =>
          todo.id === editingTodo ? { ...todo, text: editText.trim() } : todo
        )
      );
    }
    setEditingTodo(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingTodo(null);
    setEditText("");
  };

  const getRoleDisplayName = () => {
    switch (userData?.role) {
      case "facultymanagement":
        return "Faculty Management";
      case "faculty":
        return "Faculty";
      case "staff":
        return "Staff";
      default:
        return userData?.role || "User";
    }
  };

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    let greeting = "";

    if (hour < 12) greeting = "Good Morning";
    else if (hour < 17) greeting = "Good Afternoon";
    else greeting = "Good Evening";

    return `${greeting}, ${userData?.firstName || "User"}!`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const quickStats = getQuickStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getGreetingMessage()}
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome to your personalized dashboard
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-md"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {userData?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>

            {/* User Information */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="text-blue-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-semibold text-gray-900">
                      {userData?.firstName || "Not Available"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="text-green-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-semibold text-gray-900">
                      {userData?.email || "Not Available"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Star className="text-purple-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-semibold text-gray-900">
                      {getRoleDisplayName()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="text-orange-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-semibold text-gray-900">
                      {userData?.department || "Computer Science"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Status */}
            <div className="flex-shrink-0">
              <div className="bg-green-100 border border-green-200 rounded-lg p-4 text-center">
                <Briefcase className="text-green-600 mx-auto mb-2" size={24} />
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-bold text-green-700">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            const colorClasses = {
              blue: "bg-blue-100 text-blue-600 border-blue-200",
              green: "bg-green-100 text-green-600 border-green-200",
              purple: "bg-purple-100 text-purple-600 border-purple-200",
              orange: "bg-orange-100 text-orange-600 border-orange-200",
            };

            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg border ${
                      colorClasses[stat.color]
                    }`}
                  >
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Todo Management Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Target className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">My Todo List</h2>
            <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              {todos.filter((todo) => !todo.completed).length} pending
            </span>
          </div>

          {/* Add Todo Form */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
              placeholder="Add a new task..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <button
              onClick={addTodo}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 shadow-md"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          </div>

          {/* Todo List */}
          <div className="space-y-3">
            {todos.length === 0 ? (
              <div className="text-center py-12">
                <Target className="text-gray-400 mx-auto mb-4" size={48} />
                <p className="text-gray-500 text-lg">No tasks yet!</p>
                <p className="text-gray-400">
                  Add your first task to get started.
                </p>
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
                    todo.completed
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-300 hover:shadow-md"
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      todo.completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-blue-500"
                    }`}
                  >
                    {todo.completed && <Check size={16} />}
                  </button>

                  {/* Todo Text */}
                  <div className="flex-1">
                    {editingTodo === todo.id ? (
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <p
                        className={`${
                          todo.completed
                            ? "line-through text-gray-500"
                            : "text-gray-900"
                        } font-medium`}
                      >
                        {todo.text}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {editingTodo === todo.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(todo)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Todo Summary */}
          {todos.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
                <div className="flex gap-6">
                  <span>
                    <strong>{todos.length}</strong> total tasks
                  </span>
                  <span>
                    <strong>
                      {todos.filter((todo) => todo.completed).length}
                    </strong>{" "}
                    completed
                  </span>
                  <span>
                    <strong>
                      {todos.filter((todo) => !todo.completed).length}
                    </strong>{" "}
                    pending
                  </span>
                </div>
                {todos.length > 0 && (
                  <div className="text-right">
                    <span className="text-blue-600 font-medium">
                      {Math.round(
                        (todos.filter((todo) => todo.completed).length /
                          todos.length) *
                          100
                      )}
                      % Complete
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left">
              <FileText className="text-blue-600" size={24} />
              <div>
                <p className="font-medium text-gray-900">View Profile</p>
                <p className="text-sm text-gray-600">Update your information</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left">
              <Calendar className="text-green-600" size={24} />
              <div>
                <p className="font-medium text-gray-900">View Schedule</p>
                <p className="text-sm text-gray-600">Check your calendar</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left">
              <Activity className="text-purple-600" size={24} />
              <div>
                <p className="font-medium text-gray-900">Recent Activity</p>
                <p className="text-sm text-gray-600">View your activity log</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
