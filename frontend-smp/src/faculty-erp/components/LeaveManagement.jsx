import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Users,
  Filter,
  Search,
  Download,
  Eye,
} from "lucide-react";

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [odLeaves, setOdLeaves] = useState([]);
  const [leaveStats, setLeaveStats] = useState({
    totalLeaves: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    totalODLeaves: 0,
    pendingODLeaves: 0,
    approvedODLeaves: 0,
  });
  const [employeeLeaveStats, setEmployeeLeaveStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all leaves for management dashboard
      const leavesResponse = await fetch(
        "http://erpbackend.tarstech.in/api/leave/management/all-leaves"
      );

      // Fetch all OD leaves for management dashboard
      const odLeavesResponse = await fetch(
        "http://erpbackend.tarstech.in/api/leave/management/all-od-leaves"
      );

      // Fetch leave statistics
      const statsResponse = await fetch(
        "http://erpbackend.tarstech.in/api/leave/management/statistics"
      );

      // Process leaves data
      if (leavesResponse.ok) {
        const leavesData = await leavesResponse.json();
        setLeaves(leavesData.leaves || []);
      } else {
        console.error("Failed to fetch leaves:", await leavesResponse.text());
      }

      // Process OD leaves data
      if (odLeavesResponse.ok) {
        const odLeavesData = await odLeavesResponse.json();
        setOdLeaves(odLeavesData.odLeaves || []);
      } else {
        console.error(
          "Failed to fetch OD leaves:",
          await odLeavesResponse.text()
        );
      }

      // Process statistics data
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setLeaveStats(statsData.summary || {});
        setEmployeeLeaveStats(statsData.employeeStats || []);
      } else {
        console.error(
          "Failed to fetch statistics:",
          await statsResponse.text()
        );
        // Calculate stats from fetched data if API fails
        const leavesData = leavesResponse.ok
          ? await leavesResponse.json()
          : { leaves: [] };
        const odLeavesData = odLeavesResponse.ok
          ? await odLeavesResponse.json()
          : { odLeaves: [] };
        calculateLeaveStats(
          leavesData.leaves || [],
          odLeavesData.odLeaves || []
        );
      }
    } catch (error) {
      console.error("Error fetching leave data:", error);
      setError("Failed to fetch leave data from server. Using sample data.");
      // Use mock data for development when API fails
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaveStats = (regularLeaves, odLeaves) => {
    const stats = {
      totalLeaves: regularLeaves.length,
      pendingLeaves: regularLeaves.filter(
        (leave) => leave.status?.toLowerCase() === "pending"
      ).length,
      approvedLeaves: regularLeaves.filter(
        (leave) => leave.status?.toLowerCase() === "approved"
      ).length,
      rejectedLeaves: regularLeaves.filter(
        (leave) => leave.status?.toLowerCase() === "rejected"
      ).length,
      totalODLeaves: odLeaves.length,
      pendingODLeaves: odLeaves.filter(
        (leave) => leave.status?.toLowerCase() === "pending"
      ).length,
      approvedODLeaves: odLeaves.filter(
        (leave) => leave.status?.toLowerCase() === "approved"
      ).length,
      rejectedODLeaves: odLeaves.filter(
        (leave) => leave.status?.toLowerCase() === "rejected"
      ).length,
    };
    setLeaveStats(stats);
  };

  const loadMockData = () => {
    // Mock data for development/testing
    const mockLeaves = [
      {
        id: 1,
        employeeId: "NC001",
        employeeName: "Dr. John Smith",
        department: "Computer Science",
        designation: "Assistant Professor",
        leaveType: "Sick Leave",
        startDate: "2025-01-15",
        endDate: "2025-01-17",
        days: 3,
        status: "approved",
        reason: "Medical treatment",
        appliedDate: "2025-01-10",
        approvedBy: "Dr. Principal Kumar",
        approvedByRole: "Principal",
        approvedDate: "2025-01-11",
        comments: "Approved for medical reasons",
      },
      {
        id: 2,
        employeeId: "NC002",
        employeeName: "Prof. Sarah Johnson",
        department: "Mathematics",
        designation: "Associate Professor",
        leaveType: "Casual Leave",
        startDate: "2025-01-20",
        endDate: "2025-01-22",
        days: 3,
        status: "pending",
        reason: "Personal work",
        appliedDate: "2025-01-12",
        approvedBy: null,
        approvedByRole: null,
        approvedDate: null,
        comments: null,
      },
      {
        id: 3,
        employeeId: "NC003",
        employeeName: "Dr. Mike Wilson",
        department: "Physics",
        designation: "Professor",
        leaveType: "Annual Leave",
        startDate: "2025-02-01",
        endDate: "2025-02-07",
        days: 7,
        status: "approved",
        reason: "Family vacation",
        appliedDate: "2025-01-05",
        approvedBy: "Dr. HOD Physics",
        approvedByRole: "HOD",
        approvedDate: "2025-01-06",
        comments: "Annual leave approved",
      },
      {
        id: 4,
        employeeId: "NC004",
        employeeName: "Dr. Lisa Brown",
        department: "Chemistry",
        designation: "Assistant Professor",
        leaveType: "Emergency Leave",
        startDate: "2025-01-12",
        endDate: "2025-01-13",
        days: 2,
        status: "rejected",
        reason: "Family emergency",
        appliedDate: "2025-01-11",
        approvedBy: "Dr. Principal Kumar",
        approvedByRole: "Principal",
        approvedDate: "2025-01-11",
        comments: "Insufficient notice for emergency leave",
      },
      {
        id: 5,
        employeeId: "NC005",
        employeeName: "Prof. David Lee",
        department: "Computer Science",
        designation: "Associate Professor",
        leaveType: "Maternity Leave",
        startDate: "2025-03-01",
        endDate: "2025-05-30",
        days: 90,
        status: "approved",
        reason: "Maternity leave",
        appliedDate: "2025-01-15",
        approvedBy: "Dr. Principal Kumar",
        approvedByRole: "Principal",
        approvedDate: "2025-01-16",
        comments: "Maternity leave approved as per policy",
      },
    ];

    const mockODLeaves = [
      {
        id: 1,
        employeeId: "NC001",
        employeeName: "Dr. John Smith",
        department: "Computer Science",
        designation: "Assistant Professor",
        date: "2025-01-18",
        purpose: "IEEE Conference attendance",
        location: "Mumbai",
        status: "approved",
        appliedDate: "2025-01-10",
        approvedBy: "Dr. HOD CS",
        approvedByRole: "HOD",
        approvedDate: "2025-01-11",
        comments: "Conference will benefit department research",
      },
      {
        id: 2,
        employeeId: "NC004",
        employeeName: "Dr. Lisa Brown",
        department: "Chemistry",
        designation: "Assistant Professor",
        date: "2025-01-25",
        purpose: "Research Workshop",
        location: "Delhi",
        status: "pending",
        appliedDate: "2025-01-15",
        approvedBy: null,
        approvedByRole: null,
        approvedDate: null,
        comments: null,
      },
      {
        id: 3,
        employeeId: "NC003",
        employeeName: "Dr. Mike Wilson",
        department: "Physics",
        designation: "Professor",
        date: "2025-02-10",
        purpose: "Guest lecture at IIT Delhi",
        location: "Delhi",
        status: "rejected",
        appliedDate: "2025-02-01",
        approvedBy: "Dr. Principal Kumar",
        approvedByRole: "Principal",
        approvedDate: "2025-02-02",
        comments: "Schedule conflict with exam duties",
      },
    ];

    const mockEmployeeStats = [
      {
        employeeId: "NC001",
        employeeName: "Dr. John Smith",
        department: "Computer Science",
        totalLeaves: 8,
        usedLeaves: 5,
        pendingLeaves: 1,
        odLeaves: 2,
        lastLeaveDate: "2025-01-17",
      },
      {
        employeeId: "NC002",
        employeeName: "Prof. Sarah Johnson",
        department: "Mathematics",
        totalLeaves: 12,
        usedLeaves: 3,
        pendingLeaves: 1,
        odLeaves: 0,
        lastLeaveDate: "2024-12-20",
      },
      {
        employeeId: "NC003",
        employeeName: "Dr. Mike Wilson",
        department: "Physics",
        totalLeaves: 10,
        usedLeaves: 7,
        pendingLeaves: 0,
        odLeaves: 1,
        lastLeaveDate: "2025-02-07",
      },
    ];

    setLeaves(mockLeaves);
    setOdLeaves(mockODLeaves);
    setEmployeeLeaveStats(mockEmployeeStats);
    calculateLeaveStats(mockLeaves, mockODLeaves);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle size={16} />;
      case "pending":
        return <Clock size={16} />;
      case "rejected":
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const filteredLeaves = leaves.filter((leave) => {
    const matchesSearch =
      leave.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.leaveType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      leave.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const filteredODLeaves = odLeaves.filter((leave) => {
    const matchesSearch =
      leave.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      leave.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <p className="text-lg font-medium">Error Loading Leave Data</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchLeaveData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-purple-600" />
            Leave Management
          </h2>
          <div className="flex space-x-2">
            <button className="flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700">
              <Download size={16} className="mr-1" />
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "leaves", label: "Regular Leaves", icon: FileText },
            { id: "od-leaves", label: "OD Leaves", icon: Calendar },
            { id: "employee-stats", label: "Employee Stats", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                selectedTab === tab.id
                  ? "bg-purple-600 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {selectedTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Total Leaves
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {leaveStats.totalLeaves || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {leaveStats.pendingLeaves || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Approved</p>
                  <p className="text-2xl font-bold text-green-900">
                    {leaveStats.approvedLeaves || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-red-900">
                    {leaveStats.rejectedLeaves || 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">
                    OD Leaves
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {leaveStats.totalODLeaves || 0}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Regular Leaves Tab */}
        {selectedTab === "leaves" && (
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search by employee name, ID, or department..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500" />
                <select
                  className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Leaves Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved/Rejected By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User size={16} className="text-purple-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {leave.employeeName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {leave.employeeId} • {leave.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {leave.leaveType}
                        </div>
                        <div className="text-sm text-gray-500">
                          {leave.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(leave.startDate)} to{" "}
                          {formatDate(leave.endDate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {leave.days} days
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            leave.status
                          )}`}
                        >
                          {getStatusIcon(leave.status)}
                          <span className="ml-1 capitalize">
                            {leave.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {leave.status !== "pending" && leave.approvedBy ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {leave.approvedBy}
                            </div>
                            <div className="text-sm text-gray-500">
                              {leave.approvedByRole} • {leave.approvedDate}
                            </div>
                            {leave.comments && (
                              <div
                                className="text-xs text-gray-400 mt-1 max-w-xs truncate"
                                title={leave.comments}
                              >
                                {leave.comments}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            Pending approval
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          className="text-purple-600 hover:text-purple-900"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OD Leaves Tab */}
        {selectedTab === "od-leaves" && (
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search by employee name, ID, or department..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500" />
                <select
                  className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* OD Leaves Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved/Rejected By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredODLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User size={16} className="text-purple-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {leave.employeeName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {leave.employeeId} • {leave.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {leave.purpose}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(leave.date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {leave.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            leave.status
                          )}`}
                        >
                          {getStatusIcon(leave.status)}
                          <span className="ml-1 capitalize">
                            {leave.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {leave.status !== "pending" && leave.approvedBy ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {leave.approvedBy}
                            </div>
                            <div className="text-sm text-gray-500">
                              {leave.approvedByRole} • {leave.approvedDate}
                            </div>
                            {leave.comments && (
                              <div
                                className="text-xs text-gray-400 mt-1 max-w-xs truncate"
                                title={leave.comments}
                              >
                                {leave.comments}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            Pending approval
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          className="text-purple-600 hover:text-purple-900"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Employee Stats Tab */}
        {selectedTab === "employee-stats" && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {employeeLeaveStats.map((employee) => (
                <div
                  key={employee.employeeId}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User size={20} className="text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.employeeName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.employeeId} • {employee.department}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Leaves:</span>
                      <span className="font-medium">
                        {employee.totalLeaves || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Used Leaves:</span>
                      <span className="font-medium text-blue-600">
                        {employee.usedLeaves || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-medium text-green-600">
                        {Math.max(
                          0,
                          (employee.totalLeaves || 0) -
                            (employee.usedLeaves || 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-medium text-yellow-600">
                        {employee.pendingLeaves || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">OD Leaves:</span>
                      <span className="font-medium text-purple-600">
                        {employee.odLeaves || 0}
                      </span>
                    </div>
                    {employee.lastLeaveDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Last Leave:</span>
                        <span className="font-medium text-gray-800">
                          {employee.lastLeaveDate}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar for leave usage */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Leave Usage</span>
                      <span>
                        {(() => {
                          const totalLeaves = employee.totalLeaves || 0;
                          const usedLeaves = employee.usedLeaves || 0;
                          const percentage =
                            totalLeaves > 0
                              ? Math.round((usedLeaves / totalLeaves) * 100)
                              : 0;
                          return Math.min(percentage, 100);
                        })()}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(() => {
                            const totalLeaves = employee.totalLeaves || 0;
                            const usedLeaves = employee.usedLeaves || 0;
                            const percentage =
                              totalLeaves > 0
                                ? (usedLeaves / totalLeaves) * 100
                                : 0;
                            return Math.min(percentage, 100);
                          })()}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;
