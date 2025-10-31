import { useState, useEffect } from "react";
import {
  User,
  Calendar,
  Info,
  Check,
  X,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  Users,
  Eye,
  Building,
} from "lucide-react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const ApproveLeaveByPrincipal = ({ userData }) => {
  const navigate = useNavigate();
  const [department, setDepartment] = useState("All Departments");
  const [viewMode, setViewMode] = useState("pending"); // "pending" or "all"
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [decision, setDecision] = useState({
    leaveId: "",
    decision: "Approved",
    comment: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [loading, setLoading] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const departments = [
    "All Departments",
    "Computer Science",
    "Mechanical",
    "Electronics",
    "Civil",
    "Data Science",
    "Information Technology",
    "Electrical",
  ];

  // Filter leaves based on search term
  useEffect(() => {
    const filtered = leaves.filter((leave) => {
      const matchesSearch =
        searchTerm === "" ||
        leave.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.leaveType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.reason?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });

    setFilteredLeaves(filtered);
  }, [leaves, searchTerm]);

  const fetchLeaves = async (isRefresh = false) => {
    if (!userData?.token) {
      setMessage("Authentication token missing. Please log in.");
      setMessageType("error");
      console.error("No token provided in userData");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      // Use the general leave API endpoint to get data from Leave collection only
      const response = await axios.get(
        `http://167.172.216.231:4000/api/leave/all`,
        {
          headers: {
            Authorization: `Bearer ${userData.token}`,
          },
        }
      );

      // Filter by selected department and view mode
      const allLeaves = Array.isArray(response.data) ? response.data : [];

      // First filter out OD leaves - they should only appear in ApproveODLeave component
      const regularLeavesOnly = allLeaves.filter(
        (leave) =>
          (leave.leaveCategory === "Regular" ||
            (!leave.leaveCategory && leave.leaveCategory !== "OD")) &&
          leave.leaveCategory !== "OD" // Explicitly exclude OD leaves
      );

      let filteredByStatus;
      if (viewMode === "pending") {
        // Only show requests that are actually pending principal approval
        filteredByStatus = regularLeavesOnly.filter(
          (leave) =>
            leave.status === "HOD Approved" ||
            (leave.status === "Pending" && leave.type !== "Faculty")
        );
      } else {
        // Show all regular requests (including processed ones, but no OD leaves)
        filteredByStatus = regularLeavesOnly.filter(
          (leave) =>
            leave.status === "HOD Approved" ||
            leave.status === "Principal Approved" ||
            leave.status === "Principal Rejected" ||
            (leave.status === "Pending" && leave.type !== "Faculty")
        );
      }

      const departmentFiltered =
        department === "All Departments"
          ? filteredByStatus
          : filteredByStatus.filter((leave) => leave.department === department);

      setLeaves(departmentFiltered);

      console.log(
        "Principal - Regular leaves only (no OD):",
        departmentFiltered
      );
      console.log("Principal filtering breakdown:", {
        totalLeaves: allLeaves.length,
        regularLeavesOnly: regularLeavesOnly.length,
        odLeavesExcluded: allLeaves.filter((l) => l.leaveCategory === "OD")
          .length,
        finalFiltered: departmentFiltered.length,
        viewMode,
        department,
      });

      if (departmentFiltered.length === 0) {
        setMessage(
          `No ${
            viewMode === "pending" ? "pending" : ""
          } regular leave requests for ${
            department === "All Departments" ? "any department" : department
          }.`
        );
        setMessageType("info");
      } else {
        setMessage("");
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Error fetching leave requests";
      setMessage(errorMsg);
      setMessageType("error");
      console.error("Fetch error:", {
        message: errorMsg,
        status: error.response?.status,
        data: error.response?.data,
      });
      if (error.response?.status === 401 || error.response?.status === 403) {
        setTimeout(() => navigate("/login"), 2000);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [department, viewMode, userData?.token, navigate]);

  const handleDecision = async (e) => {
    e.preventDefault();
    if (!decision.leaveId) {
      setMessage("Please select a leave request to review");
      setMessageType("error");
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(decision.leaveId)) {
      setMessage("Invalid leave ID format");
      setMessageType("error");
      console.error("Invalid leaveId:", decision.leaveId);
      return;
    }

    try {
      setLoading(true);
      const decoded = userData?.token ? jwtDecode(userData.token) : {};
      const principalEmployeeId = decoded.employeeId || userData?.employeeId;
      console.log("Principal Employee ID:", principalEmployeeId);
      console.log("PUT request payload:", {
        principalEmployeeId,
        decision: decision.decision,
        comment: decision.comment,
      });

      if (!principalEmployeeId) {
        throw new Error("Principal employee ID missing");
      }

      const response = await axios.put(
        `http://167.172.216.231:4000/api/leave/principal/${decision.leaveId}`,
        {
          principalEmployeeId,
          decision: decision.decision,
          comment: decision.comment,
        },
        {
          headers: {
            Authorization: `Bearer ${userData.token}`,
          },
        }
      );

      setMessage(response.data.message || "Decision recorded successfully");
      setMessageType("success");
      setDecision({ leaveId: "", decision: "Approved", comment: "" });
      setShowDecisionModal(false);
      setSelectedLeave(null);

      // Refresh leaves
      await fetchLeaves(true);

      // Clear message after 5 seconds
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Error processing decision";
      setMessage(errorMsg);
      setMessageType("error");
      console.error("Decision error:", {
        message: errorMsg,
        status: error.response?.status,
        data: error.response?.data,
      });
      if (error.response?.status === 401 || error.response?.status === 403) {
        setTimeout(() => navigate("/login"), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const openDecisionModal = (leave) => {
    setSelectedLeave(leave);
    setDecision({ leaveId: leave._id, decision: "Approved", comment: "" });
    setShowDecisionModal(true);
  };

  const closeDecisionModal = () => {
    setShowDecisionModal(false);
    setSelectedLeave(null);
    setDecision({ leaveId: "", decision: "Approved", comment: "" });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "HOD Approved":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "Principal Approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Principal Rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (leave) => {
    if (leave.status === "HOD Approved") {
      return "Pending Principal Approval";
    } else if (leave.status === "Pending" && leave.type !== "Faculty") {
      return "Pending Principal Approval (Direct)";
    } else if (leave.status === "Principal Approved") {
      return "Approved by Principal";
    } else if (leave.status === "Principal Rejected") {
      return "Rejected by Principal";
    }
    return leave.status;
  };

  const getStatusColor = (leave) => {
    if (
      leave.status === "HOD Approved" ||
      (leave.status === "Pending" && leave.type !== "Faculty")
    ) {
      return "text-yellow-600 bg-yellow-50";
    }
    if (leave.status === "Principal Approved")
      return "text-green-600 bg-green-50";
    if (leave.status === "Principal Rejected") return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  const canApproveReject = (leave) => {
    return (
      leave.status === "HOD Approved" ||
      (leave.status === "Pending" && leave.type !== "Faculty")
    );
  };

  // Statistics
  const pendingCount = leaves.filter((leave) => canApproveReject(leave)).length;
  const approvedCount = leaves.filter(
    (leave) => leave.status === "Principal Approved"
  ).length;
  const rejectedCount = leaves.filter(
    (leave) => leave.status === "Principal Rejected"
  ).length;
  const totalHandled = approvedCount + rejectedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Principal's Leave Approval Dashboard
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span className="font-medium">Role:</span>
                    <span className="ml-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      Principal
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="font-medium">Date:</span>
                    <span className="ml-1">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center text-xs text-gray-400">
                    <span>💡 Tip: Press Ctrl+R to refresh</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                {/* Quick Action Counter */}
                {pendingCount > 0 && (
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium border border-orange-200">
                    <TrendingUp className="h-4 w-4 inline mr-1" />
                    {pendingCount} pending action{pendingCount !== 1 ? "s" : ""}
                  </div>
                )}

                <button
                  onClick={() => fetchLeaves(true)}
                  disabled={isRefreshing}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global Messages */}
        {message && (
          <div
            className={`mb-6 border-l-4 p-4 rounded-r-lg ${
              messageType === "error"
                ? "bg-red-50 border-red-400"
                : messageType === "success"
                ? "bg-green-50 border-green-400"
                : "bg-blue-50 border-blue-400"
            }`}
          >
            <div className="flex items-center">
              {messageType === "error" ? (
                <XCircle className="h-5 w-5 text-red-400 mr-2" />
              ) : messageType === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
              )}
              <p
                className={`font-medium ${
                  messageType === "error"
                    ? "text-red-700"
                    : messageType === "success"
                    ? "text-green-700"
                    : "text-blue-700"
                }`}
              >
                {message}
              </p>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Department Filter */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-gray-600" />
                  Department Filter
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setDepartment(dept)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        department === dept
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      disabled={loading || isRefreshing}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode Toggle */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Filter className="h-5 w-5 mr-2 text-gray-600" />
                  View Mode
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setViewMode("pending")}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      viewMode === "pending"
                        ? "bg-yellow-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={loading || isRefreshing}
                  >
                    <Clock className="h-4 w-4 inline mr-2" />
                    Pending Actions Only
                  </button>
                  <button
                    onClick={() => setViewMode("all")}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      viewMode === "all"
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={loading || isRefreshing}
                  >
                    <Eye className="h-4 w-4 inline mr-2" />
                    All Requests & History
                  </button>
                </div>
              </div>

              {/* Search */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Search className="h-5 w-5 mr-2 text-gray-600" />
                  Search
                </h3>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, or leave type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {approvedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rejectedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Handled
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalHandled}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Requests Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {viewMode === "pending"
                ? "Pending Regular Leave Requests Requiring Principal Approval"
                : "All Regular Leave Requests"}{" "}
              - {department}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredLeaves.length} regular leave request
              {filteredLeaves.length !== 1 ? "s" : ""} found (OD leaves
              excluded)
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading requests...</span>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No regular leave requests found
                </h3>
                <p className="text-gray-600">
                  {searchTerm || department !== "All Departments"
                    ? "Try adjusting your search criteria or filters."
                    : `No ${
                        viewMode === "pending" ? "pending" : ""
                      } regular leave requests ${
                        viewMode === "pending"
                          ? "requiring principal approval"
                          : ""
                      } for ${department}. OD leave requests are handled in a separate component.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeaves.map((leave) => (
                  <div
                    key={leave._id}
                    className={`border rounded-lg p-6 transition-all duration-200 hover:shadow-md ${
                      canApproveReject(leave)
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                      <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                        <div className="flex-shrink-0">
                          {getStatusIcon(leave.status)}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {leave.firstName} ({leave.employeeId})
                          </h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span className="px-2 py-1 bg-gray-100 rounded-full">
                              {leave.department}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 rounded-full">
                              {leave.type}
                            </span>
                          </div>
                        </div>
                        {canApproveReject(leave) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Action Required
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {canApproveReject(leave) ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openDecisionModal(leave)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            leave
                          )}`}
                        >
                          {getStatusIcon(leave.status)}
                          <span className="ml-2">{getStatusText(leave)}</span>
                        </div>
                      )}
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center mb-2">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-700">
                              Duration
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 ml-6">
                            {new Date(leave.startDate).toLocaleDateString()} -{" "}
                            {new Date(leave.endDate).toLocaleDateString()}
                            <span className="text-gray-600 ml-2">
                              ({leave.leaveDays} days)
                            </span>
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center mb-2">
                            <Info className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-700">
                              Leave Type
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 ml-6">
                            {leave.leaveType}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center mb-2">
                            <FileText className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-700">
                              Reason
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 ml-6 bg-gray-50 p-3 rounded-lg">
                            {leave.reason || "No reason provided"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Workflow Indicator */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="font-medium text-gray-500">
                          Workflow:
                        </span>

                        {leave.type === "Faculty" ? (
                          <>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 rounded-full bg-green-400"></div>
                              <span className="text-green-600">
                                HOD Approved
                              </span>
                            </div>
                            <span className="text-gray-300">→</span>
                            <div className="flex items-center space-x-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  leave.status === "Principal Approved"
                                    ? "bg-green-400"
                                    : leave.status === "Principal Rejected"
                                    ? "bg-red-400"
                                    : "bg-yellow-400"
                                }`}
                              ></div>
                              <span
                                className={
                                  leave.status === "Principal Approved"
                                    ? "text-green-600"
                                    : leave.status === "Principal Rejected"
                                    ? "text-red-600"
                                    : "text-yellow-600"
                                }
                              >
                                Principal Review
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                leave.status === "Principal Approved"
                                  ? "bg-green-400"
                                  : leave.status === "Principal Rejected"
                                  ? "bg-red-400"
                                  : "bg-yellow-400"
                              }`}
                            ></div>
                            <span
                              className={
                                leave.status === "Principal Approved"
                                  ? "text-green-600"
                                  : leave.status === "Principal Rejected"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }
                            >
                              Principal Review (Direct)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decision Modal */}
        {showDecisionModal && selectedLeave && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
              role="dialog"
              aria-modal="true"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <User className="h-6 w-6 text-blue-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Review Leave Request
                  </h3>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Employee:</strong> {selectedLeave.firstName} (
                    {selectedLeave.employeeId})
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Leave Type:</strong> {selectedLeave.leaveType}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Duration:</strong> {selectedLeave.leaveDays} days
                  </p>
                </div>

                <form onSubmit={handleDecision} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decision
                    </label>
                    <select
                      value={decision.decision}
                      onChange={(e) =>
                        setDecision({ ...decision, decision: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    >
                      <option value="Approved">Approve</option>
                      <option value="Rejected">Reject</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment (Optional)
                    </label>
                    <textarea
                      value={decision.comment}
                      onChange={(e) =>
                        setDecision({ ...decision, comment: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="3"
                      placeholder="Enter any comments..."
                      disabled={loading}
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeDecisionModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        decision.decision === "Approved"
                          ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                          : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                      }`}
                      disabled={loading}
                    >
                      {loading
                        ? "Processing..."
                        : `${
                            decision.decision === "Approved"
                              ? "Approve"
                              : "Reject"
                          } Request`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApproveLeaveByPrincipal;
