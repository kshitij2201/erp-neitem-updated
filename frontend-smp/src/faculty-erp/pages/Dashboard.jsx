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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const quickStats = getQuickStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Beautiful Hero Section */}
      <div className="relative bg-white border-b border-gray-200 overflow-hidden">
        {/* Sophisticated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-40"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full -translate-y-40 translate-x-40"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-200/30 to-pink-200/30 rounded-full translate-y-32 -translate-x-32"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full opacity-60"></div>
        <div className="absolute top-32 left-40 w-1 h-1 bg-indigo-400 rounded-full opacity-40"></div>
        <div className="absolute bottom-20 right-20 w-3 h-3 bg-purple-400 rounded-full opacity-50"></div>
        <div className="absolute bottom-32 right-40 w-2 h-2 bg-pink-400 rounded-full opacity-60"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Enhanced Left Content */}
            <div className="text-gray-900 space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-sm font-semibold shadow-sm border border-blue-200/50">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mr-3"></div>
                  Welcome back, {getRoleDisplayName()}
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  {getGreetingMessage().split(",")[0]}
                </h1>
                <h2 className="text-2xl lg:text-3xl font-semibold text-gray-700">
                  {userData?.firstName || "User"}!
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                  Your personalized dashboard is ready. Stay organized, track
                  progress, and manage tasks efficiently with our beautiful
                  interface.
                </p>
              </div>

              {/* Enhanced Quick Stats in Hero */}
              <div className="grid grid-cols-3 gap-6">
                <div className="group bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {todos.filter((t) => t.completed).length}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">
                        Completed
                      </p>
                    </div>
                  </div>
                </div>
                <div className="group bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <Clock size={24} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {todos.filter((t) => !t.completed).length}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">
                        Pending
                      </p>
                    </div>
                  </div>
                </div>
                <div className="group bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <Target size={24} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {quickStats.length}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">Stats</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={onLogout}
                  className="group px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all duration-300 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <LogOut
                    size={20}
                    className="group-hover:rotate-12 transition-transform duration-300"
                  />
                  Logout
                </button>
                <button className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  <Target
                    size={20}
                    className="group-hover:scale-110 transition-transform duration-300"
                  />
                  View Tasks
                </button>
                <button className="group px-8 py-4 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-gray-300 hover:border-gray-400">
                  <Plus
                    size={20}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                  Quick Add
                </button>
              </div>
            </div>

            {/* Enhanced Right Content - Beautiful Dashboard Preview */}
            <div className="relative">
              <div className="relative bg-white rounded-3xl border border-gray-200 shadow-2xl p-10 transform hover:scale-105 transition-transform duration-500">
                {/* Beautiful Mock Dashboard Cards */}
                <div className="space-y-6">
                  <div className="group bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                          <User size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="w-24 h-5 bg-gradient-to-r from-gray-300 to-gray-200 rounded mb-2"></div>
                          <div className="w-20 h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded"></div>
                        </div>
                      </div>
                      <div className="w-14 h-7 bg-gradient-to-r from-green-400 to-green-500 rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  <div className="group bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100/50 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                          <Calendar size={20} className="text-green-600" />
                        </div>
                        <div>
                          <div className="w-28 h-5 bg-gradient-to-r from-gray-300 to-gray-200 rounded mb-2"></div>
                          <div className="w-24 h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded"></div>
                        </div>
                      </div>
                      <div className="w-14 h-7 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  <div className="group bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100/50 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                          <Target size={20} className="text-purple-600" />
                        </div>
                        <div>
                          <div className="w-20 h-5 bg-gradient-to-r from-gray-300 to-gray-200 rounded mb-2"></div>
                          <div className="w-22 h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded"></div>
                        </div>
                      </div>
                      <div className="w-14 h-7 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Progress Indicator */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center transform hover:rotate-12 transition-transform duration-300">
                  <TrendingUp size={24} className="text-white" />
                </div>

                {/* Decorative corner elements */}
                <div className="absolute top-4 left-4 w-3 h-3 bg-blue-400 rounded-full opacity-60"></div>
                <div className="absolute bottom-4 right-4 w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
              </div>

              {/* Floating decorative elements */}
              <div className="absolute -top-8 -left-8 w-6 h-6 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-70 animate-pulse"></div>
              <div
                className="absolute -bottom-6 -right-6 w-4 h-4 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-70 animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Professional Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Profile and Quick Actions */}
          <div className="xl:col-span-1 space-y-8">
            {/* Enhanced User Profile Card */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-200 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
              {/* Sophisticated background decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/60 to-indigo-100/60 rounded-full -translate-y-20 translate-x-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/60 to-pink-100/60 rounded-full translate-y-16 -translate-x-16"></div>
              <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-r from-blue-50/30 to-purple-50/30 rounded-full -translate-x-1/2 -translate-y-1/2"></div>

              {/* Decorative elements */}
              <div className="absolute top-6 left-6 w-2 h-2 bg-blue-400 rounded-full opacity-60"></div>
              <div className="absolute top-8 left-12 w-1 h-1 bg-indigo-400 rounded-full opacity-40"></div>
              <div className="absolute bottom-6 right-6 w-3 h-3 bg-purple-400 rounded-full opacity-50"></div>
              <div className="absolute bottom-8 right-12 w-2 h-2 bg-pink-400 rounded-full opacity-60"></div>

              <div className="relative">
                {/* Enhanced Profile Picture */}
                <div className="flex justify-center mb-8">
                  <div className="relative group">
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                      {userData?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    {/* Animated ring */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 -m-2"></div>
                  </div>
                </div>

                {/* Enhanced User Information */}
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {userData?.firstName || "Not Available"}
                    </h3>
                    <p className="text-gray-600 font-medium">
                      {userData?.email || "Not Available"}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-6 py-3 rounded-full font-semibold shadow-lg border border-blue-200/50">
                      {getRoleDisplayName()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-6">
                    <div className="text-center group">
                      <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                        {userData?.department || "CS"}
                      </p>
                      <p className="text-sm text-gray-500 font-medium">
                        Department
                      </p>
                    </div>
                    <div className="text-center group">
                      <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                        Active
                      </p>
                      <p className="text-sm text-gray-500 font-medium">
                        Status
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Quick Actions */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-200 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
              {/* Sophisticated background decoration */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-blue-100/60 to-purple-100/60 rounded-full -translate-y-18 translate-x-18"></div>
              <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-green-100/60 to-blue-100/60 rounded-full translate-y-14 -translate-x-14"></div>
              <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-gradient-to-r from-indigo-50/40 to-purple-50/40 rounded-full -translate-x-1/2 -translate-y-1/2"></div>

              {/* Decorative elements */}
              <div className="absolute top-8 left-8 w-2 h-2 bg-blue-400 rounded-full opacity-60"></div>
              <div className="absolute bottom-8 right-8 w-3 h-3 bg-green-400 rounded-full opacity-50"></div>

              <div className="relative">
                <div className="flex items-center gap-5 mb-8">
                  <div className="p-4 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-2xl shadow-xl transform group-hover:scale-110 transition-all duration-300">
                    <Activity className="text-white" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Quick Actions
                    </h3>
                    <p className="text-gray-600 text-sm font-medium">
                      Access common features
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <button className="group w-full relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50 border-2 border-blue-200/60 rounded-2xl p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-600/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-5">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-all duration-300">
                        <FileText className="text-white" size={22} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors text-lg">
                          View Profile
                        </p>
                        <p className="text-sm text-gray-600 group-hover:text-blue-700 transition-colors">
                          Update information
                        </p>
                      </div>
                    </div>
                  </button>

                  <button className="group w-full relative overflow-hidden bg-gradient-to-br from-green-50 via-green-100 to-emerald-50 border-2 border-green-200/60 rounded-2xl p-6 hover:shadow-xl hover:border-green-300 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-600/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-5">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-all duration-300">
                        <Calendar className="text-white" size={22} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 group-hover:text-green-900 transition-colors text-lg">
                          View Schedule
                        </p>
                        <p className="text-sm text-gray-600 group-hover:text-green-700 transition-colors">
                          Check calendar
                        </p>
                      </div>
                    </div>
                  </button>

                  <button className="group w-full relative overflow-hidden bg-gradient-to-br from-purple-50 via-purple-100 to-pink-50 border-2 border-purple-200/60 rounded-2xl p-6 hover:shadow-xl hover:border-purple-300 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-600/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-5">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg group-hover:scale-110 transition-all duration-300">
                        <Activity className="text-white" size={22} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 group-hover:text-purple-900 transition-colors text-lg">
                          Recent Activity
                        </p>
                        <p className="text-sm text-gray-600 group-hover:text-purple-700 transition-colors">
                          View activity log
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats and Todo */}
          <div className="xl:col-span-2 space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickStats.map((stat, index) => {
                const Icon = stat.icon;
                const gradients = {
                  blue: "from-blue-500 to-blue-600",
                  green: "from-green-500 to-green-600",
                  purple: "from-purple-500 to-purple-600",
                  orange: "from-orange-500 to-orange-600",
                };
                const bgColors = {
                  blue: "bg-blue-50 border-blue-200",
                  green: "bg-green-50 border-green-200",
                  purple: "bg-purple-50 border-purple-200",
                  orange: "bg-orange-50 border-orange-200",
                };
                const textColors = {
                  blue: "text-blue-600",
                  green: "text-green-600",
                  purple: "text-purple-600",
                  orange: "text-orange-600",
                };

                return (
                  <div
                    key={index}
                    className={`relative overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border-2 ${
                      bgColors[stat.color]
                    } group`}
                  >
                    <div className="relative p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-lg bg-white shadow-sm`}>
                          <Icon size={24} className={textColors[stat.color]} />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">
                          {stat.label}
                        </p>
                        <div
                          className={`h-1 bg-gradient-to-r ${
                            gradients[stat.color]
                          } rounded-full`}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Todo Management Section */}
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 relative overflow-hidden">
              {/* Subtle background pattern */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-12 translate-x-12 opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-50 rounded-full translate-y-10 -translate-x-10 opacity-50"></div>

              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg shadow-sm">
                      <Target className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        My Todo List
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Stay organized and productive
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium shadow-sm">
                      {todos.filter((todo) => !todo.completed).length} pending
                    </span>
                    {todos.length > 0 && (
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {Math.round(
                            (todos.filter((todo) => todo.completed).length /
                              todos.length) *
                              100
                          )}
                          %
                        </div>
                        <div className="text-xs text-gray-500">Complete</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {todos.length > 0 && (
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${
                            (todos.filter((todo) => todo.completed).length /
                              todos.length) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Add Todo Form */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-100">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addTodo()}
                        placeholder="What needs to be done today?"
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white shadow-sm"
                      />
                      <Plus
                        className="absolute left-3 top-3.5 text-gray-400"
                        size={20}
                      />
                    </div>
                    <button
                      onClick={addTodo}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 shadow-sm font-medium"
                    >
                      <Plus size={20} />
                      <span className="hidden sm:inline">Add Task</span>
                    </button>
                  </div>
                </div>

                {/* Todo List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {todos.length === 0 ? (
                    <div className="text-center py-12">
                      <Target
                        className="text-gray-400 mx-auto mb-4"
                        size={48}
                      />
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
                              onKeyPress={(e) =>
                                e.key === "Enter" && saveEdit()
                              }
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
