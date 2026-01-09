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
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError(null);

      // local holders for normalized data (used to compute stats reliably)
      let normalizedLeaves = [];
      let normalizedOdLeaves = [];

      // Fetch all leaves for management dashboard
      const leavesResponse = await fetch(
        "https://backenderp.tarstech.in/api/leave/management/all-leaves"
      );

      // Fetch all OD leaves for management dashboard
      const odLeavesResponse = await fetch(
        "https://backenderp.tarstech.in/api/leave/management/all-od-leaves"
      );

      // Fetch leave statistics
      const statsResponse = await fetch(
        "https://backenderp.tarstech.in/api/leave/management/statistics"
      );

      // Process leaves data with defensive parsing
      if (leavesResponse.ok) {
        try {
          const leavesBody = await leavesResponse.json();
          const leavesArray = Array.isArray(leavesBody)
            ? leavesBody
            : leavesBody.leaves || leavesBody.data || leavesBody.data?.leaves || [];

          normalizedLeaves = leavesArray.map((l) => {
            const statusNormalized = normalizeStatus(l.status || l.statusText || "");
            return {
              ...l,
              originalStatus: l.status || l.statusText || "",
              statusNormalized,
              statusDisplay: capitalize(statusNormalized) || (l.status || l.statusText || ""),
            };
          });

          console.log("Fetched leaves:", normalizedLeaves.length);
          setLeaves(normalizedLeaves);
        } catch (parseErr) {
          console.error("Failed to parse leaves response:", parseErr);
        }
      } else {
        console.error("Failed to fetch leaves:", await leavesResponse.text());
      }

      // Process OD leaves data with defensive parsing
      if (odLeavesResponse.ok) {
        try {
          const odBody = await odLeavesResponse.json();
          const odArray = Array.isArray(odBody)
            ? odBody
            : odBody.odLeaves || odBody.data || odBody.data?.odLeaves || [];

          normalizedOdLeaves = odArray.map((l) => {
            const statusNormalized = normalizeStatus(l.status || l.statusText || "");
            return {
              ...l,
              originalStatus: l.status || l.statusText || "",
              statusNormalized,
              statusDisplay: capitalize(statusNormalized) || (l.status || l.statusText || ""),
            };
          });

          console.log("Fetched OD leaves:", normalizedOdLeaves.length);
          setOdLeaves(normalizedOdLeaves);
        } catch (parseErr) {
          console.error("Failed to parse OD leaves response:", parseErr);
        }
      } else {
        console.error(
          "Failed to fetch OD leaves:",
          await odLeavesResponse.text()
        );
      }

      // Process statistics data
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        // keep employee-level stats if provided
        setEmployeeLeaveStats(statsData.employeeStats || []);

        // If we have fetched leave arrays, prefer deriving counts from them
        if (normalizedLeaves.length || normalizedOdLeaves.length) {
          calculateLeaveStats(
            normalizedLeaves,
            normalizedOdLeaves
          );
        } else if (statsData.summary) {
          // Fallback: use the summary numbers provided by the server
          const s = statsData.summary;
          console.log("Using stats summary from API:", s);
          setLeaveStats({
            totalLeaves: s.totalLeaves || 0,
            pendingLeaves: s.pendingLeaves || 0,
            approvedLeaves: s.approvedLeaves || 0,
            rejectedLeaves: s.rejectedLeaves || 0,
            totalODLeaves: s.totalODLeaves || 0,
            pendingODLeaves: s.pendingODLeaves || 0,
            approvedODLeaves: s.approvedODLeaves || 0,
            rejectedODLeaves: s.rejectedODLeaves || 0,
          });
        } else {
          // last resort: compute from what we have (may be empty)
          calculateLeaveStats(
            normalizedLeaves.length ? normalizedLeaves : leaves,
            normalizedOdLeaves.length ? normalizedOdLeaves : odLeaves
          );
        }
      } else {
        console.error(
          "Failed to fetch statistics:",
          await statsResponse.text()
        );
        // Calculate stats from fetched data if API fails
        calculateLeaveStats(
          normalizedLeaves.length ? normalizedLeaves : leaves,
          normalizedOdLeaves.length ? normalizedOdLeaves : odLeaves
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
      pendingLeaves: regularLeaves.filter((leave) => {
        const s = normalizeStatus(leave.status || leave.originalStatus || "");
        // pending includes everything not rejected and not principal-approved (this includes HOD-approved)
        return !isApprovedByPrincipal(leave) && s !== "rejected";
      }).length,
      approvedLeaves: regularLeaves.filter((leave) => isApprovedByPrincipal(leave)).length,
      rejectedLeaves: regularLeaves.filter((leave) => normalizeStatus(leave.status || leave.originalStatus || "") === "rejected").length,
      totalODLeaves: odLeaves.length,
      pendingODLeaves: odLeaves.filter((leave) => {
        const s = normalizeStatus(leave.status || leave.originalStatus || "");
        return !isApprovedByPrincipal(leave) && s !== "rejected";
      }).length,
      approvedODLeaves: odLeaves.filter((leave) => isApprovedByPrincipal(leave)).length,
      rejectedODLeaves: odLeaves.filter((leave) => normalizeStatus(leave.status || leave.originalStatus || "") === "rejected").length, 
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

  // CSV export helpers
  const objectToCsv = (items, columns) => {
    const header = columns.map((c) => c.label).join(",");
    const rows = items.map((item) =>
      columns
        .map((c) => {
          const v = typeof c.key === "function" ? c.key(item) : item[c.key];
          const cell = v === null || v === undefined ? "" : String(v);
          return `"${cell.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    return [header].concat(rows).join("\r\n");
  };

  const downloadCsv = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExport = () => {
    try {
      let items = [];
      let columns = [];
      let filename = `export-${selectedTab}-${new Date().toISOString().slice(0, 10)}.csv`;

      if (selectedTab === "leaves") {
        items = filteredLeaves;
        columns = [
          { label: "Employee Name", key: "employeeName" },
          { label: "Employee ID", key: "employeeId" },
          { label: "Department", key: "department" },
          { label: "Designation", key: "designation" },
          { label: "Leave Type", key: "leaveType" },
          { label: "Start Date", key: (r) => formatDate(r.startDate) },
          { label: "End Date", key: (r) => formatDate(r.endDate) },
          { label: "Days", key: "days" },
          { label: "Status", key: (r) => getDisplayStatus(r) },
          { label: "Approved By", key: "approvedBy" },
          { label: "Approved By Role", key: "approvedByRole" },
          { label: "Approved Date", key: "approvedDate" },
          { label: "Reason", key: "reason" },
          { label: "Comments", key: "comments" },
        ];
      } else if (selectedTab === "od-leaves") {
        items = filteredODLeaves;
        columns = [
          { label: "Employee Name", key: "employeeName" },
          { label: "Employee ID", key: "employeeId" },
          { label: "Department", key: "department" },
          { label: "Date", key: (r) => formatDate(r.date) },
          { label: "Purpose", key: "purpose" },
          { label: "Location", key: "location" },
          { label: "Status", key: (r) => getDisplayStatus(r) },
          { label: "Approved By", key: "approvedBy" },
          { label: "Approved By Role", key: "approvedByRole" },
          { label: "Approved Date", key: "approvedDate" },
          { label: "Comments", key: "comments" },
        ];
      } else if (selectedTab === "employee-stats") {
        items = employeeLeaveStats;
        columns = [
          { label: "Employee Name", key: "employeeName" },
          { label: "Employee ID", key: "employeeId" },
          { label: "Department", key: "department" },
          { label: "Total Leaves", key: "totalLeaves" },
          { label: "Used Leaves", key: "usedLeaves" },
          { label: "Pending Leaves", key: "pendingLeaves" },
          { label: "OD Leaves", key: "odLeaves" },
          { label: "Last Leave Date", key: "lastLeaveDate" },
        ];
      } else {
        // overview stats
        items = [leaveStats];
        columns = Object.keys(leaveStats).map((k) => ({ label: k, key: k }));
        filename = `leave-stats-${new Date().toISOString().slice(0, 10)}.csv`;
      }

      if (!items || items.length === 0) {
        alert("No data to export for the selected tab.");
        return;
      }

      const csv = objectToCsv(items, columns);
      downloadCsv(csv, filename);
      console.log(`Exported ${items.length} rows to ${filename}`);
      alert(`Exported ${items.length} rows to ${filename}`);
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed: " + (err.message || err));
    }
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
    const s = normalizeStatus(status);
    switch (s) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "hod-approved":
        return "text-amber-700 bg-amber-100"; // HOD-approved (awaiting principal)
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }; 

  const getStatusIcon = (status) => {
    const s = (status || "").toString().trim().toLowerCase();
    switch (s) {
      case "approved":
        return <CheckCircle size={16} />;
      case "hod-approved":
        return <User size={16} />; // HOD-approved icon
      case "pending":
        return <Clock size={16} />;
      case "rejected":
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  }; 

  // Normalize various status text variants into canonical statuses
  const normalizeStatus = (raw) => {
    const s = (raw || "").toString().trim().toLowerCase();
    if (!s) return "";
    // approved variants
    if (s.includes("approved") || /\bapproved\b/.test(s) || s.includes("accept")) return "approved";
    // rejected variants
    if (s.includes("reject") || s.includes("denied") || s.includes("declined")) return "rejected";
    // pending variants
    if (s.includes("pending") || s.includes("await") || s.includes("requested")) return "pending";
    // fallback to the raw normalized string
    return s;
  };

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // Returns true only if the leave is approved by the Principal
  const isApprovedByPrincipal = (leave) => {
    const s = normalizeStatus(leave.status || leave.originalStatus || "");
    // If status doesn't indicate approval, return false
    if (!s.includes("approved") && s !== "approved") return false;
    const role = (leave.approvedByRole || leave.approvedBy || "").toString().toLowerCase();
    if (role.includes("principal")) return true;
    // also support explicit 'principal approved' in status text
    const raw = (leave.status || leave.originalStatus || "").toString().toLowerCase();
    if (raw.includes("principal approved") || raw.includes("principal-approved") || raw.includes("principle approved")) return true;
    return false;
  };

  const isHodApproved = (leave) => {
    // HOD-approved: status indicates approval or approvedByRole contains hod, but not principal-approved
    if (isApprovedByPrincipal(leave)) return false;
    const s = normalizeStatus(leave.status || leave.originalStatus || "");
    if (s.includes("approved")) return true;
    const role = (leave.approvedByRole || "").toString().toLowerCase();
    if (role.includes("hod") || role.includes("head")) return true;
    const raw = (leave.status || leave.originalStatus || "").toString().toLowerCase();
    if (raw.includes("hod approved") || raw.includes("hod-approved") || raw.includes("hod-approved")) return true;
    return false;
  };

  const getStatusForUI = (leave) => {
    if (isApprovedByPrincipal(leave)) return "approved";
    if (isHodApproved(leave)) return "hod-approved";
    const s = normalizeStatus(leave.status || leave.originalStatus || "");
    if (s === "rejected") return "rejected";
    return "pending"; // Everything else treated as pending until principal approves
  };

  const getDisplayStatus = (leave) => {
    if (isApprovedByPrincipal(leave)) return "Approved";
    if (isHodApproved(leave)) return "HOD Approved (Awaiting Principal)";
    const s = normalizeStatus(leave.status || leave.originalStatus || "");
    if (s === "rejected") return "Rejected";
    if (s === "pending") return "Pending";
    if (s.includes("approved")) return "Pending (Principal approval)";
    return capitalize(s) || leave.originalStatus || "";
  };  

  const isPendingLeave = (leave) => {
    if (!leave) return false;
    const s = leave.statusNormalized || normalizeStatus(leave.status || leave.originalStatus || "");
    return s === "pending";
  }; 

  const monthOptions = [
    { value: "all", label: "All Month" },
    { value: "1", label: "Jan" },
    { value: "2", label: "Feb" },
    { value: "3", label: "Mar" },
    { value: "4", label: "Apr" },
    { value: "5", label: "May" },
    { value: "6", label: "Jun" },
    { value: "7", label: "Jul" },
    { value: "8", label: "Aug" },
    { value: "9", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
  ];

  const yearOptions = (() => {
    const years = new Set();
    leaves.forEach((l) => {
      const d = new Date(l.startDate || l.date);
      if (!isNaN(d)) years.add(d.getFullYear());
    });
    odLeaves.forEach((l) => {
      const d = new Date(l.date || l.startDate);
      if (!isNaN(d)) years.add(d.getFullYear());
    });
    const arr = Array.from(years).sort((a, b) => b - a);
    if (arr.length === 0) {
      const y = new Date().getFullYear();
      return [String(y), String(y - 1), String(y + 1)];
    }
    return arr.map(String);
  })();

  const filteredLeaves = leaves.filter((leave) => {
    const term = searchTerm.toString().toLowerCase();
    const matchesSearch =
      (leave.employeeName || "").toString().toLowerCase().includes(term) ||
      (leave.employeeId || "").toString().toLowerCase().includes(term) ||
      (leave.department || "").toString().toLowerCase().includes(term) ||
      (leave.leaveType || "").toString().toLowerCase().includes(term);

    const leaveStatus = leave.statusNormalized || (leave.status || "").toString().trim().toLowerCase();
    const filter = filterStatus ? filterStatus.toString().trim().toLowerCase() : "all";
    const matchesStatus = filter === "all" || leaveStatus === filter;

    // month/year filtering (use startDate for regular leaves)
    const dateStr = leave.startDate || leave.date || null;
    const d = dateStr ? new Date(dateStr) : null;
    const month = d && !isNaN(d) ? d.getMonth() + 1 : null;
    const year = d && !isNaN(d) ? d.getFullYear() : null;
    const matchesMonth = selectedMonth === "all" || (month && Number(selectedMonth) === month);
    const matchesYear = selectedYear === "all" || (year && Number(selectedYear) === year);

    return matchesSearch && matchesStatus && matchesMonth && matchesYear;
  });

  const filteredODLeaves = odLeaves.filter((leave) => {
    const term = searchTerm.toString().toLowerCase();
    const matchesSearch =
      (leave.employeeName || "").toString().toLowerCase().includes(term) ||
      (leave.employeeId || "").toString().toLowerCase().includes(term) ||
      (leave.department || "").toString().toLowerCase().includes(term) ||
      (leave.purpose || "").toString().toLowerCase().includes(term);

    const leaveStatus = leave.statusNormalized || (leave.status || "").toString().trim().toLowerCase();
    const filter = filterStatus ? filterStatus.toString().trim().toLowerCase() : "all";
    const matchesStatus = filter === "all" || leaveStatus === filter;

    // month/year filtering (use date for OD leaves)
    const dateStr = leave.date || leave.startDate || null;
    const d = dateStr ? new Date(dateStr) : null;
    const month = d && !isNaN(d) ? d.getMonth() + 1 : null;
    const year = d && !isNaN(d) ? d.getFullYear() : null;
    const matchesMonth = selectedMonth === "all" || (month && Number(selectedMonth) === month);
    const matchesYear = selectedYear === "all" || (year && Number(selectedYear) === year);

    return matchesSearch && matchesStatus && matchesMonth && matchesYear; 
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
            <button type="button" onClick={handleExport} className="flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700">
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

                <select
                  className="border rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ml-2"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  className="border rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ml-2"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                {/* <div className="text-sm text-gray-500 ml-3">
                  {filteredLeaves.length}/{leaves.length} shown
                </div> */}
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
                        {!isPendingLeave(leave) && leave.approvedBy ? (
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

                <select
                  className="border rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ml-2"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  className="border rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ml-2"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <div className="text-sm text-gray-500 ml-3">
                  {filteredODLeaves.length}/{odLeaves.length} shown
                </div>
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
                        {!isPendingLeave(leave) && leave.approvedBy ? (
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
