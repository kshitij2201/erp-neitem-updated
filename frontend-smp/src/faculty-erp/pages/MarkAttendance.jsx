import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  Search,
} from "lucide-react";
import axios from "axios";
import AttendanceBarChart from "../components/AttendanceBarChart";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const api = axios.create({
  baseURL: "https://backenderp.tarstech.in/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include JWT token
api.interceptors?.request?.use?.(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default function MarkAttendance() {
  // Suppress Canvas2D warnings globally
  React.useEffect(() => {
    // Override the native getContext method to set willReadFrequently by default
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      contextType,
      options = {}
    ) {
      if (contextType === "2d") {
        options.willReadFrequently = true;
      }
      return originalGetContext.call(this, contextType, options);
    };

    return () => {
      // Restore original method on cleanup
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    };
  }, []);

  // Function to get semester from subject
  const getSemester = (subject) => {
    if (subject.semester) return subject.semester;
    if (subject.year) return subject.year;
    // For minor subjects, extract from name like "Minor-I"
    const match = subject.name?.match(/Minor-([IVXLCDM]+)/i);
    if (match) {
      const roman = match[1].toUpperCase();
      const romanToNum = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8 };
      return romanToNum[roman] || roman;
    }
    return "N/A";
  };

  // Format date as DD/MM/YYYY or return "N/A"
  const formatDateDMY = (dateInput) => {
    if (!dateInput) return "N/A";
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return "N/A";
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Retry helper for axios requests: retries on network errors and timeouts
  const retryAxiosRequest = async (fn, retries = 2, delay = 1000) => {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        return await fn();
      } catch (err) {
        const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
        const isNetwork = !err.response;
        attempt += 1;
        if (attempt > retries || (!isTimeout && !isNetwork)) {
          throw err;
        }
        console.warn(`Request failed (attempt ${attempt}) - retrying in ${delay}ms`, err.message || err);
        // exponential backoff
        await new Promise((res) => setTimeout(res, delay * attempt));
      }
    }
  };

  const [subjects, setSubjects] = useState([]);
  const [expandedSubject, setExpandedSubject] = useState("");
  const [students, setStudents] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({});
  // Records for the selected date (today or selectedDate); used in edit/update flows
  const [todayRecords, setTodayRecords] = useState([]);
  const [studentNotes, setStudentNotes] = useState({});
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [loadingSubjectDetails, setLoadingSubjectDetails] = useState(false);
  const [studentMessage, setStudentMessage] = useState("");

  // Filter states
  const [queryType, setQueryType] = useState("day");
  const [queryDate, setQueryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [queryFrom, setQueryFrom] = useState("");
  const [queryTo, setQueryTo] = useState("");
  const [queryMonth, setQueryMonth] = useState(new Date().getMonth() + 1);
  const [queryYear, setQueryYear] = useState(new Date().getFullYear());
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filteredPage, setFilteredPage] = useState(1);
  const [filteredTotalPages, setFilteredTotalPages] = useState(1);
  const [entriesPerPage] = useState(10);
  const [attendanceMarkedToday, setAttendanceMarkedToday] = useState(false);
  const [checkingTodayAttendance, setCheckingTodayAttendance] = useState(false);
  const [todayClassAttendance, setTodayClassAttendance] = useState(null);
  const [monthlyClassAttendance, setMonthlyClassAttendance] = useState(null);
  const [monthlyAttendanceLoading, setMonthlyAttendanceLoading] =
    useState(false);
  const [editMode, setEditMode] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState({});
  const [loadingExistingAttendance, setLoadingExistingAttendance] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);

  const logsRef = useRef(null);

  // Load subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Load students and stats when subject is expanded or date changes
  useEffect(() => {
    if (expandedSubject) {
      fetchSubjectDetails(expandedSubject);
      fetchStudents(expandedSubject);
      checkTodayAttendance(expandedSubject);
      calculateMonthlyClassAttendance(expandedSubject);
    }
  }, [expandedSubject, selectedDate]);

  // Function to fetch subject details automatically
  const fetchSubjectDetails = async (subjectId) => {
    try {
      setLoadingSubjectDetails(true);
      const token = localStorage.getItem("authToken");

      const response = await api.get(
        `/faculty/markattendance/subject-details/${subjectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSubjectDetails(response.data.data);
      } else {
        console.error("Failed to load subject details:", response.data.message);
        setSubjectDetails(null);
      }
    } catch (err) {
      console.error("Error fetching subject details:", err);
      setSubjectDetails(null);
    } finally {
      setLoadingSubjectDetails(false);
    }
  };

  // Function to check if attendance is already marked for selected date
  const checkTodayAttendance = async (subjectId) => {
    try {
      setCheckingTodayAttendance(true);
      const userDataStr = localStorage.getItem("user");
      const userData = JSON.parse(userDataStr);
      const employeeId = userData.employeeId;

      const today = selectedDate;

      const params = {
        facultyId: employeeId,
        subjectId: subjectId,
        type: "day",
        date: today,
        page: 1,
        limit: 1000, // Get all students' attendance for selected date
      };

      const response = await api.get("/faculty/attendance/query", { params });

      if (
        response.data.success &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        const recs = response.data.data;
        setTodayRecords(recs);
        setAttendanceMarkedToday(true);
        setEditMode(true);

        // Store existing attendance records by student ID
        const attendanceMap = {};
        response.data.data.forEach(record => {
          // Try multiple ways to get student ID
          const studentId = record.studentId || record.student?._id || record.student;
          if (studentId) {
            attendanceMap[studentId] = {
              id: record._id,
              status: record.status,
              date: record.date
            };
          }
        });
        
        console.log("Existing attendance loaded:", attendanceMap);
        console.log("Total records:", response.data.data.length);
        setExistingAttendance(attendanceMap);

        // Calculate today's class attendance percentage
        const presentCount = recs.filter(
          (record) => record.status === "present"
        ).length;
        const totalCount = recs.length;
        const classPercentage =
          totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        setTodayClassAttendance(classPercentage);
      } else {
        setTodayRecords([]);
        setAttendanceMarkedToday(false);
        setEditMode(false);
        setExistingAttendance({});
        setTodayClassAttendance(null);
      }
    } catch (error) {
      console.error("Error checking today's attendance:", error);
      setAttendanceMarkedToday(false);
      setTodayClassAttendance(null);
    } finally {
      setCheckingTodayAttendance(false);
    }
  };

  const calculateMonthlyClassAttendance = async (subjectId) => {
    try {
      setMonthlyAttendanceLoading(true);
      const userDataStr = localStorage.getItem("user");
      const userData = JSON.parse(userDataStr);
      const employeeId = userData.employeeId;

      // Get current month's date range
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const startDate = firstDayOfMonth.toISOString().split("T")[0];
      const endDate = lastDayOfMonth.toISOString().split("T")[0];

      const params = {
        facultyId: employeeId,
        subjectId: subjectId,
        type: "range",
        from: startDate,
        to: endDate,
        page: 1,
        limit: 1000, // Get all records for the month
      };

      const response = await api.get("/faculty/attendance/query", { params });

      if (
        response.data.success &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        // Calculate monthly class attendance percentage
        const monthlyRecords = response.data.data;
        const presentCount = monthlyRecords.filter(
          (record) => record.status === "present"
        ).length;
        const totalCount = monthlyRecords.length;
        const monthlyPercentage =
          totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        setMonthlyClassAttendance(monthlyPercentage);
      } else {
        setMonthlyClassAttendance(null);
      }
    } catch (error) {
      console.error("Error calculating monthly attendance:", error);
      setMonthlyClassAttendance(null);
    } finally {
      setMonthlyAttendanceLoading(false);
    }
  };

  const handleFilterClick = async () => {
    setFilterLoading(true);
    setFilteredPage(1);

    // Get user data to get employeeId
    const userDataStr = localStorage.getItem("user");
    const userData = JSON.parse(userDataStr);
    const employeeId = userData.employeeId;

    // Get current enrolled students' IDs to filter attendance data
    // Only proceed if students are loaded
    if (!students || students.length === 0) {
      console.log("No students loaded for filtering");
      setFilteredAttendance([]);
      setFilteredTotalPages(1);
      setFilterLoading(false);
      return;
    }
    
    const currentStudentIds = students.map(student => student._id);
    console.log("Filtering attendance for students:", currentStudentIds); // Debug log

    // For week, month, and range queries, fetch all data without pagination limit
    const shouldFetchAll = queryType === "week" || queryType === "month" || queryType === "range" || queryType === "day";

    let params = {
      facultyId: employeeId,
      subjectId: expandedSubject,
      type: queryType,
      page: 1,
      limit: shouldFetchAll ? 10000 : entriesPerPage, // Use large limit for aggregate queries
      studentIds: currentStudentIds.join(','), // Add student IDs filter
    };
    if (queryType === "day") params.date = queryDate;
    if (queryType === "week") {
      // normalize week dates to YYYY-MM-DD if provided
      params.from = queryFrom ? new Date(queryFrom).toISOString().slice(0,10) : queryFrom;
      params.to = queryTo ? new Date(queryTo).toISOString().slice(0,10) : queryTo;
    }
    if (queryType === "month") {
      params.month = queryMonth;
      params.year = queryYear;
    }
    if (queryType === "range") {
      // validate range inputs
      if (!queryFrom || !queryTo) {
        alert("Please provide both From and To dates for Custom Range.");
        setFilterLoading(false);
        return;
      }
      if (new Date(queryFrom) > new Date(queryTo)) {
        alert("Start date cannot be after End date.");
        setFilterLoading(false);
        return;
      }
      params.from = new Date(queryFrom).toISOString().slice(0,10);
      params.to = new Date(queryTo).toISOString().slice(0,10);
    }

    // Remove the day filter limit override since we're handling it above now

    try {
      console.log("Sending attendance query with params:", params); // Debug log
      const res = await api.get("/faculty/attendance/query", { params });
      console.log("Attendance query response:", res.data); // Debug log

      if (res.data.success) {
        // Filter the results on frontend as backup to ensure only current students' data is shown
        let filteredData = (res.data.data || []).filter(log => 
          currentStudentIds.includes(log.studentId || log.student?._id)
        );

        // If week filter, aggregate data by student
        if (queryType === "week") {
          const aggregatedData = {};
          
          // Initialize all students with 0 counts
          students.forEach(student => {
            aggregatedData[student._id] = {
              student: student,
              studentId: student._id,
              presentCount: 0,
              totalDays: 0
            };
          });
          
          // Update counts from actual attendance records
          filteredData.forEach(log => {
            const studentId = log.studentId || log.student?._id;
            if (aggregatedData[studentId]) {
              if (log.status === "present") {
                aggregatedData[studentId].presentCount += 1;
              }
              aggregatedData[studentId].totalDays += 1;
            }
          });

          // Convert to array and add start/end dates
          filteredData = Object.values(aggregatedData).map(item => ({
            ...item,
            startDate: queryFrom,
            endDate: queryTo
          }));
        }

        // If month filter, aggregate data by student
        if (queryType === "month") {
          const aggregatedData = {};
          
          // Initialize all students with 0 counts
          students.forEach(student => {
            aggregatedData[student._id] = {
              student: student,
              studentId: student._id,
              presentCount: 0,
              totalDays: 0
            };
          });
          
          // Update counts from actual attendance records
          filteredData.forEach(log => {
            const studentId = log.studentId || log.student?._id;
            if (aggregatedData[studentId]) {
              if (log.status === "present") {
                aggregatedData[studentId].presentCount += 1;
              }
              aggregatedData[studentId].totalDays += 1;
            }
          });

          // Convert to array and add month/year
          filteredData = Object.values(aggregatedData).map(item => ({
            ...item,
            month: queryMonth,
            year: queryYear
          }));
        }

        // If day filter, aggregate data by student
        if (queryType === "day") {
          const aggregatedData = {};
          
          // Initialize all students with "Not Marked"
          students.forEach(student => {
            aggregatedData[student._id] = {
              student: student,
              studentId: student._id,
              status: "Not Marked",
              date: queryDate
            };
          });
          
          // Update status from actual attendance records
          filteredData.forEach(log => {
            const studentId = log.studentId || log.student?._id;
            if (aggregatedData[studentId]) {
              aggregatedData[studentId].status = log.status;
            }
          });
          
          // Convert to array
          filteredData = Object.values(aggregatedData);
        }

        setFilteredAttendance(filteredData);
        setFilteredTotalPages(res.data.pages || 1);

        if (queryType === "day") {
          setFilteredTotalPages(1);
        }

        if (filteredData.length === 0) {
          console.log("No attendance records found for the current enrolled students with selected filters.");
        }
      } else {
        setFilteredAttendance([]);
        setFilteredTotalPages(1);
        console.log("API returned success: false -", res.data.message);
      }
    } catch (e) {
      console.error("Error fetching filtered attendance:", e);
      setFilteredAttendance([]);
      setFilteredTotalPages(1);

      if (e.response?.status === 404) {
        console.log("Faculty or subject not found");
      } else if (e.response?.status === 500) {
        console.log(
          "Server error occurred:",
          e.response?.data?.message || e.message
        );
      } else {
        console.log("Network or other error:", e.message);
      }
    } finally {
      setFilterLoading(false);
    }
  };

  const handlePreviousPage = async () => {
    if (filteredPage > 1 && !filterLoading) {
      setFilterLoading(true);

      // Get user data to get employeeId
      const userDataStr = localStorage.getItem("user");
      const userData = JSON.parse(userDataStr);
      const employeeId = userData.employeeId;

      // Get current enrolled students' IDs to filter attendance data
      const currentStudentIds = students.map(student => student._id);

      let params = {
        facultyId: employeeId,
        subjectId: expandedSubject,
        type: queryType,
        page: filteredPage - 1,
        limit: entriesPerPage,
        studentIds: currentStudentIds.join(','), // Add student IDs filter
      };
      if (queryType === "day") params.date = queryDate;
      if (queryType === "week") {
        params.from = queryFrom ? new Date(queryFrom).toISOString().slice(0,10) : queryFrom;
        params.to = queryTo ? new Date(queryTo).toISOString().slice(0,10) : queryTo;
      }
      if (queryType === "month") {
        params.month = queryMonth;
        params.year = queryYear;
      }
      if (queryType === "range") {
        params.from = queryFrom ? new Date(queryFrom).toISOString().slice(0,10) : queryFrom;
        params.to = queryTo ? new Date(queryTo).toISOString().slice(0,10) : queryTo;
      }

      try {
        const res = await api.get("/faculty/attendance/query", { params });
        if (res.data.success) {
          // Filter the results on frontend as backup
          let filteredData = (res.data.data || []).filter(log => 
            currentStudentIds.includes(log.studentId || log.student?._id)
          );

          // If week filter, aggregate data by student
          if (queryType === "week") {
            const aggregatedData = {};
            
            // Initialize all enrolled students with zero counts
            currentStudentIds.forEach(studentId => {
              const student = students.find(s => s._id === studentId);
              aggregatedData[studentId] = {
                student: student,
                studentId: studentId,
                presentCount: 0,
                totalDays: 0
              };
            });
            
            // Update counts from actual attendance records
            filteredData.forEach(log => {
              const studentId = log.studentId || log.student?._id;
              if (aggregatedData[studentId]) {
                if (log.status === "present") {
                  aggregatedData[studentId].presentCount += 1;
                }
                aggregatedData[studentId].totalDays += 1;
              }
            });

            // Convert to array and add start/end dates
            filteredData = Object.values(aggregatedData).map(item => ({
              ...item,
              startDate: queryFrom,
              endDate: queryTo
            }));
          }

          // If month filter, aggregate data by student
          if (queryType === "month") {
            const aggregatedData = {};
            
            // Initialize all enrolled students with zero counts
            currentStudentIds.forEach(studentId => {
              const student = students.find(s => s._id === studentId);
              aggregatedData[studentId] = {
                student: student,
                studentId: studentId,
                presentCount: 0,
                totalDays: 0
              };
            });
            
            // Update counts from actual attendance records
            filteredData.forEach(log => {
              const studentId = log.studentId || log.student?._id;
              if (aggregatedData[studentId]) {
                if (log.status === "present") {
                  aggregatedData[studentId].presentCount += 1;
                }
                aggregatedData[studentId].totalDays += 1;
              }
            });

            // Convert to array and add month/year
            filteredData = Object.values(aggregatedData).map(item => ({
              ...item,
              month: queryMonth,
              year: queryYear
            }));
          }

          // If range filter, aggregate data by student
          if (queryType === "range") {
            const aggregatedData = {};
            
            // Initialize all enrolled students with zero counts
            currentStudentIds.forEach(studentId => {
              const student = students.find(s => s._id === studentId);
              aggregatedData[studentId] = {
                student: student,
                studentId: studentId,
                presentCount: 0,
                totalDays: 0
              };
            });
            
            // Update counts from actual attendance records
            filteredData.forEach(log => {
              const studentId = log.studentId || log.student?._id;
              if (aggregatedData[studentId]) {
                if (log.status === "present") {
                  aggregatedData[studentId].presentCount += 1;
                }
                aggregatedData[studentId].totalDays += 1;
              }
            });

            // Convert to array and add start/end dates
            filteredData = Object.values(aggregatedData).map(item => ({
              ...item,
              startDate: queryFrom,
              endDate: queryTo
            }));
          }

          setFilteredAttendance(filteredData);
          setFilteredPage(filteredPage - 1);
        }
      } catch (e) {
        console.error("Error fetching previous page:", e);
      } finally {
        setFilterLoading(false);
      }
    }
  };

  const handleNextPage = async () => {
    if (filteredPage < filteredTotalPages && !filterLoading) {
      setFilterLoading(true);

      // Get user data to get employeeId
      const userDataStr = localStorage.getItem("user");
      const userData = JSON.parse(userDataStr);
      const employeeId = userData.employeeId;

      // Get current enrolled students' IDs to filter attendance data
      const currentStudentIds = students.map(student => student._id);

      let params = {
        facultyId: employeeId,
        subjectId: expandedSubject,
        type: queryType,
        page: filteredPage + 1,
        limit: entriesPerPage,
        studentIds: currentStudentIds.join(','), // Add student IDs filter
      };
      if (queryType === "day") params.date = queryDate;
      if (queryType === "week") {
        params.from = queryFrom ? new Date(queryFrom).toISOString().slice(0,10) : queryFrom;
        params.to = queryTo ? new Date(queryTo).toISOString().slice(0,10) : queryTo;
      }
      if (queryType === "month") {
        params.month = queryMonth;
        params.year = queryYear;
      }
      if (queryType === "range") {
        params.from = queryFrom ? new Date(queryFrom).toISOString().slice(0,10) : queryFrom;
        params.to = queryTo ? new Date(queryTo).toISOString().slice(0,10) : queryTo;
      }

      try {
        const res = await api.get("/faculty/attendance/query", { params });
        if (res.data.success) {
          // Filter the results on frontend as backup
          let filteredData = (res.data.data || []).filter(log => 
            currentStudentIds.includes(log.studentId || log.student?._id)
          );

          // If week filter, aggregate data by student
          if (queryType === "week") {
            const aggregatedData = {};
            
            // Initialize all enrolled students with zero counts
            currentStudentIds.forEach(studentId => {
              const student = students.find(s => s._id === studentId);
              aggregatedData[studentId] = {
                student: student,
                studentId: studentId,
                presentCount: 0,
                totalDays: 0
              };
            });
            
            // Update counts from actual attendance records
            filteredData.forEach(log => {
              const studentId = log.studentId || log.student?._id;
              if (aggregatedData[studentId]) {
                if (log.status === "present") {
                  aggregatedData[studentId].presentCount += 1;
                }
                aggregatedData[studentId].totalDays += 1;
              }
            });

            // Convert to array and add start/end dates
            filteredData = Object.values(aggregatedData).map(item => ({
              ...item,
              startDate: queryFrom,
              endDate: queryTo
            }));
          }

          // If month filter, aggregate data by student
          if (queryType === "month") {
            const aggregatedData = {};
            
            // Initialize all enrolled students with zero counts
            currentStudentIds.forEach(studentId => {
              const student = students.find(s => s._id === studentId);
              aggregatedData[studentId] = {
                student: student,
                studentId: studentId,
                presentCount: 0,
                totalDays: 0
              };
            });
            
            // Update counts from actual attendance records
            filteredData.forEach(log => {
              const studentId = log.studentId || log.student?._id;
              if (aggregatedData[studentId]) {
                if (log.status === "present") {
                  aggregatedData[studentId].presentCount += 1;
                }
                aggregatedData[studentId].totalDays += 1;
              }
            });

            // Convert to array and add month/year
            filteredData = Object.values(aggregatedData).map(item => ({
              ...item,
              month: queryMonth,
              year: queryYear
            }));
          }

          // If range filter, aggregate data by student
          if (queryType === "range") {
            const aggregatedData = {};
            
            // Initialize all enrolled students with zero counts
            currentStudentIds.forEach(studentId => {
              const student = students.find(s => s._id === studentId);
              aggregatedData[studentId] = {
                student: student,
                studentId: studentId,
                presentCount: 0,
                totalDays: 0
              };
            });
            
            // Update counts from actual attendance records
            filteredData.forEach(log => {
              const studentId = log.studentId || log.student?._id;
              if (aggregatedData[studentId]) {
                if (log.status === "present") {
                  aggregatedData[studentId].presentCount += 1;
                }
                aggregatedData[studentId].totalDays += 1;
              }
            });

            // Convert to array and add start/end dates
            filteredData = Object.values(aggregatedData).map(item => ({
              ...item,
              startDate: queryFrom,
              endDate: queryTo
            }));
          }

          setFilteredAttendance(filteredData);
          setFilteredPage(filteredPage + 1);
        }
      } catch (e) {
        console.error("Error fetching next page:", e);
      } finally {
        setFilterLoading(false);
      }
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      // Get user data to get employeeId
      const userDataStr = localStorage.getItem("user");
      if (!userDataStr) {
        setError("User data not found. Please log in again.");
        return;
      }

      const userData = JSON.parse(userDataStr);
      const employeeId = userData.employeeId;

      if (!employeeId) {
        setError("Employee ID not found. Please log in again.");
        return;
      }

      const response = await api.get(`/faculty/subjects/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        console.log("Subjects data received:", response.data.data);
        // Log first subject to check structure
        if (response.data.data && response.data.data.length > 0) {
          console.log("First subject structure:", response.data.data[0]);
        }
        setSubjects(response.data.data || []);
      } else {
        setError("Failed to load subjects");
      }
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setError("Failed to load subjects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (subjectId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      // Use the new enhanced endpoint that filters students by subject criteria
      const response = await api.get(
        `/faculty/markattendance/students/${subjectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const studentsData = response.data.data || [];
        setStudents(studentsData);
        setStudentMessage(response.data.message || "");

        // Fetch attendance stats for each student
        fetchAttendanceStats(studentsData, subjectId);
      } else {
        setError("Failed to load students for this subject");
        setStudentMessage("");
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async (studentsData, subjectId) => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        console.warn("No auth token found; skipping attendance stats requests (will show zeros).");
        setAttendanceStats({});
        return;
      }

      const statsPromises = studentsData.map(async (student) => {
        try {
          // Get current month and year for monthly stats
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();

          // Fetch both monthly and overall stats
          const [monthlyResponse, overallResponse] = await Promise.all([
            api.get(
              `/student-attendance/${student._id}/${subjectId}/monthly?month=${month}&year=${year}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ),
            api.get(`/student-attendance/${student._id}/${subjectId}/overall`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          console.log(`Stats for student ${student._id}:`, {
            monthly: monthlyResponse.data,
            overall: overallResponse.data,
          });

          return {
            studentId: student._id,
            monthly: monthlyResponse.data?.data || monthlyResponse.data,
            overall: overallResponse.data?.data || overallResponse.data,
          };
        } catch (error) {
          console.error(
            `Error fetching stats for student ${student._id}:`,
            error.response?.status,
            error.response?.data || error.message
          );
          return {
            studentId: student._id,
            monthly: { percentage: 0, total: 0, present: 0, absent: 0 },
            overall: { percentage: 0, total: 0, present: 0, absent: 0 },
            error: true,
          };
        }
      });

      const results = await Promise.all(statsPromises);

      // Convert to object with studentId as key
      const statsObject = {};
      results.forEach((result) => {
        statsObject[result.studentId] = {
          monthly: result.monthly,
          overall: result.overall,
          error: result.error,
        };
      });

      setAttendanceStats(statsObject);
    } catch (error) {
      console.error("Error fetching attendance stats:", error.response?.status, error.response?.data || error.message);
      setAttendanceStats({});
    }
  };

  const markAttendance = async (status) => {
    if (selectedStudents.length === 0) {
      alert("Please select at least one student");
      return;
    }

    try {
      setIsUpdating(true);
      const token = localStorage.getItem("authToken");

      // Get user data to get employeeId
      const userDataStr = localStorage.getItem("user");
      const userData = JSON.parse(userDataStr);
      const facultyId = userData.employeeId;

      // If in edit mode, update only selected students
      if (editMode) {
        console.log("Batch marking in edit mode - updating only selected students");
        
        // Update only selected students
        const updatePromises = selectedStudents.map(async (studentId) => {
          const student = students.find((s) => s._id === studentId);
          if (!student) return null;
          
          // Check if student has existing attendance record
          const existingRecord = existingAttendance[studentId];
          
          if (existingRecord) {
            // Update existing record only if status changed
            if (existingRecord.status !== status) {
              const requestOptions = { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 };
              return retryAxiosRequest(() => api.put(`/attendance/${existingRecord.id}`, { status: status }, requestOptions), 2, 1000);
            }
          } else {
            // Create new record for students who don't have attendance yet
            const payload = {
              student: studentId,
              studentName: `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim(),
              subject: expandedSubject,
              faculty: facultyId,
              status: status,
              date: selectedDate,
              semester: student.semester?._id || student.semester,
              department: student.department?._id || student.department,
            };

            // Basic client-side validation to avoid 400s from malformed requests
            const required = ['student', 'subject', 'faculty', 'status', 'date'];
            const missing = required.filter((k) => !payload[k]);
            if (missing.length > 0) {
              console.error('Skipping create - missing attendance fields for student', studentId, missing, payload);
              // reject promise so outer Promise.all will fail and be handled by outer catch
              return Promise.reject({ message: `Missing required fields: ${missing.join(', ')}`, validation: true, payload });
            }

            console.log('Creating attendance (batch) for student', studentId, payload);
            const requestOptions = { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 };
            return retryAxiosRequest(() => api.post('/attendance', payload, requestOptions), 2, 1000);
          }
        });

        await Promise.all(updatePromises.filter(p => p)); // Filter out undefined promises

        // Count current present students
        const presentCount = Object.values(existingAttendance).filter(
          record => record.status === "present"
        ).length + (status === "present" ? selectedStudents.length : 0);
        
        const totalMarkedStudents = Object.keys(existingAttendance).length + 
          selectedStudents.filter(id => !existingAttendance[id]).length;
        
        const classAttendancePercent =
          totalMarkedStudents > 0
            ? Math.round((presentCount / totalMarkedStudents) * 100)
            : 0;

        alert(
          `Attendance updated successfully for ${selectedStudents.length} student(s) on ${new Date(selectedDate).toLocaleDateString()}!`
        );
        setSelectedStudents([]);
        setTodayClassAttendance(classAttendancePercent);
        
        // Reload attendance to update UI
        await checkTodayAttendance(expandedSubject);
        fetchAttendanceStats(students, expandedSubject);
        calculateMonthlyClassAttendance(expandedSubject);
        setChartRefreshTrigger(prev => prev + 1);
        
        setIsUpdating(false);
        return;
      }

      // Original batch marking logic for first-time marking
      // Only mark attendance for selected students
      const attendanceData = {
        subjectId: expandedSubject,
        facultyId: facultyId,
        selectedStudents: selectedStudents,
        status: status, // Pass the status to backend
        date: selectedDate,
      };

      // Make the request with a higher timeout and retry on network/timeouts
      const requestOptions = { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 };
      let response;
      try {
        response = await retryAxiosRequest(() => api.post("/faculty/markattendance", attendanceData, requestOptions), 2, 1000);
      } catch (reqErr) {
        console.error("Attendance mark request failed after retries:", reqErr.response?.status, reqErr.response?.data || reqErr.message);
        if (reqErr.code === 'ECONNABORTED' || (reqErr.message && reqErr.message.toLowerCase().includes('timeout'))) {
          alert("Request timed out. The server may be slow or unreachable. Please try again.");
        } else if (!reqErr.response) {
          alert("Network error while marking attendance. Check your connection and try again.");
        } else {
          alert(reqErr.response?.data?.message || "Failed to mark attendance. Please try again.");
        }

        setIsUpdating(false);
        return;
      }

      if (response.data.success) {
        alert(
          `Attendance marked successfully for ${selectedStudents.length} student(s) as ${status} on ${new Date(selectedDate).toLocaleDateString()}!`
        );
        setSelectedStudents([]);
        setAttendanceMarkedToday(true);
        
        // Reload attendance to enter edit mode
        await checkTodayAttendance(expandedSubject);
        fetchAttendanceStats(students, expandedSubject);
        calculateMonthlyClassAttendance(expandedSubject);
        setChartRefreshTrigger(prev => prev + 1);
        try {
          // Notify other parts of the app (e.g., Profile page) that attendance changed
          const eventDetail = {
            studentIds: selectedStudents,
            subjectId: expandedSubject,
            date: attendanceData.date,
          };
          window.dispatchEvent(new CustomEvent("attendanceMarked", { detail: eventDetail }));
        } catch (e) {
          console.warn("Could not dispatch attendanceMarked event:", e);
        }
      } else {
        // Check if attendance was already marked
        if (response.data.alreadyMarked) {
          alert(
            `Attendance has already been marked for ${new Date(selectedDate).toLocaleDateString()} for this subject!`
          );
          setAttendanceMarkedToday(true);
          // Reload to enter edit mode
          await checkTodayAttendance(expandedSubject);
        } else {
          alert(response.data.message || "Failed to mark attendance");
        }
      }
    } catch (err) {
      console.error("Error marking attendance:", err);
      console.error("Error marking attendance response:", err.response?.status, err.response?.data || err.message);

      // Timeout or network checks
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
      const isNetwork = !err.response;

      // Check if the error is due to attendance already marked
      if (err.response?.status === 400 && err.response?.data?.alreadyMarked) {
        alert(`Attendance has already been marked for ${new Date(selectedDate).toLocaleDateString()} for this subject!`);
        setAttendanceMarkedToday(true);
        // Reload to enter edit mode
        await checkTodayAttendance(expandedSubject);
      } else if (isTimeout) {
        alert("Request timed out. The server may be slow or unreachable. Please try again.");
      } else if (isNetwork) {
        alert("Network error while marking attendance. Please check your connection and try again.");
      } else {
        alert(err.response?.data?.message || "Failed to mark attendance. Please try again.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const markIndividualAttendance = async (studentId, status) => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem("authToken");
      const userDataStr = localStorage.getItem("user");
      const userData = JSON.parse(userDataStr);
      const facultyId = userData.employeeId;
      const today = selectedDate;

      const existing = existingAttendance[studentId];
      
      console.log("Marking attendance for student:", studentId);
      console.log("Existing record:", existing);
      console.log("Status:", status);

      if (existing) {
        // Update existing record
        console.log("Updating attendance record:", existing.id);
        const requestOptions = { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 };
        try {
          const response = await retryAxiosRequest(() => api.put(`/attendance/${existing.id}`, { status: status }, requestOptions), 2, 1000);
          console.log("Update response:", response.data);

          // Immediately update the existingAttendance state
          setExistingAttendance(prev => ({
            ...prev,
            [studentId]: {
              ...prev[studentId],
              status: status
            }
          }));

          alert(`Attendance updated to ${status} successfully!`);
        } catch (err) {
          console.error('Failed to update attendance record:', err.response?.status, err.response?.data || err.message);
          throw err;
        }
      } else {
        // Create new record - Need to get semester and department from student
        console.log("Creating new attendance record");
        const student = students.find(s => s._id === studentId);
        
        if (!student) {
          throw new Error("Student not found");
        }
        
        const payload = {
          student: studentId,
          studentName: `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim(),
          subject: expandedSubject,
          faculty: facultyId,
          status: status,
          date: today,
          semester: student.semester?._id || student.semester,
          department: student.department?._id || student.department,
        };

        // Basic validation before sending
        const required = ['student', 'subject', 'faculty', 'status', 'date'];
        const missing = required.filter(k => !payload[k]);
        if (missing.length > 0) {
          console.error('Attendance create validation failed for student', studentId, 'missing:', missing, payload);
          throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        console.log('Creating attendance for student', studentId, payload);
        let response;
        try {
          response = await retryAxiosRequest(() => api.post('/attendance', payload, { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }), 2, 1000);
        } catch (createErr) {
          console.error('Failed to create attendance for student', studentId, createErr.response?.status, createErr.response?.data || createErr.message);
          // Re-throw to be caught by outer catch and show user-friendly message
          throw createErr;
        }
        console.log("Create response:", response.data);
        
        // Add the new record to existingAttendance state
        setExistingAttendance(prev => ({
          ...prev,
          [studentId]: {
            id: response.data.attendance?._id || response.data._id,
            status: status,
            date: today
          }
        }));
        
        alert(`Attendance marked as ${status} successfully!`);
      }

      // Refresh attendance stats (but NOT the existingAttendance state - already updated above)
      await fetchAttendanceStats(students, expandedSubject);
      await calculateMonthlyClassAttendance(expandedSubject);
      setChartRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error marking individual attendance:", err);
      console.error("Error details:", err.response?.data || err.message);

      const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
      const isNetwork = !err.response;

      if (isTimeout) {
        alert("Request timed out while marking attendance. Please try again.");
      } else if (isNetwork) {
        alert("Network error while marking attendance. Check your connection.");
      } else {
        alert(`Failed to mark attendance: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s._id));
    }
  };

  // Edit a single student's attendance for today (uses PUT replace endpoint)
  const editSingleStudentAttendance = async (studentId, targetStatus) => {
    if (!attendanceMarkedToday) {
      return alert("Attendance not marked for today. Use mark attendance first.");
    }

    try {
      setIsUpdating(true);
      const token = localStorage.getItem("authToken");
      const userDataStr = localStorage.getItem("user");
      const userData = JSON.parse(userDataStr);
      const facultyId = userData.employeeId;
      const today = new Date().toISOString().split("T")[0];

      // Compute current present list from today's records
      const presentIds = (todayRecords || [])
        .filter(r => r.status === "present")
        .map(r => r.student?._id || r.student)
        .filter(Boolean)
        .map(String);

      let updatedPresent = [...presentIds];
      const idStr = String(studentId);
      if (targetStatus === "absent") {
        updatedPresent = updatedPresent.filter(id => id !== idStr);
      } else if (targetStatus === "present") {
        if (!updatedPresent.includes(idStr)) updatedPresent.push(idStr);
      }

      const attendanceData = {
        subjectId: expandedSubject,
        facultyId,
        selectedStudents: updatedPresent,
        date: today,
      };

      const res = await api.put(
        "/faculty/markattendance",
        attendanceData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        alert("Attendance updated successfully");
        // Refresh today's records and stats
        checkTodayAttendance(expandedSubject);
        fetchAttendanceStats(students, expandedSubject);
        calculateMonthlyClassAttendance(expandedSubject);
      } else {
        alert(res.data.message || "Failed to update attendance");
      }
    } catch (err) {
      console.error("Error editing single student attendance:", err);
      alert("Failed to update student attendance. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!logsRef.current) return;

    try {
      // Import xlsx library
      const XLSX = await import('xlsx');

      // Get subject details
      const currentSubject = subjects.find(s => s._id === expandedSubject);
      const subjectName = currentSubject?.name || "N/A";
      const departmentName = currentSubject?.department?.name || "N/A";

      // Create array of arrays for the sheet
      const rows = [];
      
      // Add professional header (3 rows)
      rows.push(["Maitrey Educational Society's"]);
      rows.push(["NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY & MANAGEMENT"]);
      rows.push(["Nagpur - 440023"]);
      rows.push([]); // Empty row
      
      // Add Subject and Department
      rows.push([`Subject: ${subjectName}`, `Department: ${departmentName}`]);
      rows.push([]); // Empty row

      let colWidths;

      if (queryType === "week" || queryType === "range") {
        // Build per-date columns for the selected range (week/custom range)
        // If from/to are not set, fall back to aggregated view
        if (!queryFrom || !queryTo) {
          // Fall back to previous aggregated layout (without Subject/Department/Semester columns)
          rows.push([
            'S.No',
            'Student Name',
            'Start Date',
            'End Date',
            'Present Days',
            'Section'
          ]);

          // Add data rows (fallback)
          filteredAttendance.forEach((log, idx) => {
            rows.push([
              idx + 1,
              log.student?.firstName && log.student?.lastName
                ? `${log.student.firstName} ${log.student.middleName || ""} ${log.student.lastName}`.trim()
                : log.student?.name || log.studentId || "Unknown Student",
              log.startDate ? new Date(log.startDate).toLocaleDateString() : "N/A",
              log.endDate ? new Date(log.endDate).toLocaleDateString() : "N/A",
              `${log.presentCount || 0} / ${log.totalDays || 0}`,
              subjects.find(s => s._id === expandedSubject)?.section || "N/A"
            ]);
          });

          colWidths = [
            { wch: 6 },  // S.No
            { wch: 25 }, // Student Name
            { wch: 12 }, // Start Date
            { wch: 12 }, // End Date
            { wch: 15 }, // Present Days
            { wch: 8 }   // Section
          ];
        } else {
          // Build date array from queryFrom to queryTo (inclusive)
          const start = new Date(queryFrom);
          const end = new Date(queryTo);
          const dates = [];
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
          }

          const dateLabels = dates.map(d => {
            const dd = ("0" + d.getDate()).slice(-2);
            const mm = ("0" + (d.getMonth() + 1)).slice(-2);
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
          });

          // Header: S.No + Student Name + each date + Present Days
          rows.push([
            'S.No',
            'Student Name',
            ...dateLabels,
            'Present Days'
          ]);

          // Fetch raw logs for the date range so we can show per-date P/A
          try {
            const userDataStr = localStorage.getItem('user');
            const userData = JSON.parse(userDataStr || '{}');
            const facultyId = userData.employeeId;

            const params = {
              facultyId,
              subjectId: expandedSubject,
              type: 'range',
              from: queryFrom ? new Date(queryFrom).toISOString().slice(0,10) : queryFrom,
              to: queryTo ? new Date(queryTo).toISOString().slice(0,10) : queryTo,
              page: 1,
              limit: 10000,
              studentIds: students.map(s => s._id).join(',')
            };

            const res = await api.get('/faculty/attendance/query', { params });
            const rawLogs = (res.data && res.data.success && Array.isArray(res.data.data)) ? res.data.data : [];

            // Map logs by studentId and date (YYYY-MM-DD)
            const logsByStudent = {};
            rawLogs.forEach(rec => {
              const sid = rec.studentId || rec.student?._id || rec.student;
              if (!sid) return;
              const dateKey = rec.date ? new Date(rec.date).toISOString().slice(0,10) : null;
              if (!dateKey) return;
              logsByStudent[sid] = logsByStudent[sid] || {};
              logsByStudent[sid][dateKey] = rec.status; // 'present' or 'absent'
            });

            // Add a row for each enrolled student (keeps student list order)
            const dateTotals = new Array(dates.length).fill(0);
            let totalPresentAll = 0;
            students.forEach((student, idx) => {
              const sid = student._id;
              const name = student.firstName && student.lastName
                ? `${student.firstName} ${student.middleName || ''} ${student.lastName}`.trim()
                : student.name || sid;

              const row = [idx + 1, name];
              let presentCount = 0;
              dates.forEach((d, di) => {
                const key = d.toISOString().slice(0,10);
                const status = logsByStudent[sid] && logsByStudent[sid][key];
                if (status === 'present') {
                  row.push('P');
                  presentCount++;
                  dateTotals[di] += 1;
                  totalPresentAll += 1;
                } else if (status === 'absent') {
                  row.push('A');
                } else {
                  row.push('-'); // Not marked
                }
              });

              // Only include Present Days summary for per-date exports
              row.push(`${presentCount} / ${dates.length}`);

              rows.push(row);
            });

            // Totals row aligned under date columns
            const totalsRow = ['', 'Totals', ...dateTotals.map(n => n), `${totalPresentAll} / ${dates.length * students.length}`];
            rows.push(totalsRow);

            // Column widths: S.No small, Student Name wider, each date slightly wider to fit markers
            colWidths = [
              { wch: 6 },  // S.No
              { wch: 28 }, // Student Name
              ...dates.map(() => ({ wch: 16 })), // each date
              { wch: 18 } // Present Days
            ];
          } catch (fetchErr) {
            console.error('Failed to fetch raw logs for range export, falling back to aggregated output', fetchErr);
            // Fallback to aggregated output (without Subject/Department/Semester columns)
            filteredAttendance.forEach(log => {
              rows.push([
                log.student?.firstName && log.student?.lastName
                  ? `${log.student.firstName} ${log.student.middleName || ""} ${log.student.lastName}`.trim()
                  : log.student?.name || log.studentId || "Unknown Student",
                log.startDate ? new Date(log.startDate).toLocaleDateString() : "N/A",
                log.endDate ? new Date(log.endDate).toLocaleDateString() : "N/A",
                `${log.presentCount || 0} / ${log.totalDays || 0}`,
                subjects.find(s => s._id === expandedSubject)?.section || "N/A"
              ]);
            });

            colWidths = [
              { wch: 25 }, // Student Name
              { wch: 12 }, // Start Date
              { wch: 12 }, // End Date
              { wch: 15 }, // Present Days
              { wch: 8 }   // Section
            ];
          }
        }
      } else if (queryType === "month") {
        // Month per-date export: build dates for selected month and show per-date Present/Absent/Not Marked
        if (!queryMonth || !queryYear) {
          // Fallback aggregated month layout (without Subject/Department/Semester per-row columns)
          rows.push([
            'S.No',
            'Student Name',
            'Month',
            'Present Days',
            'Section'
          ]);

          filteredAttendance.forEach((log, idx) => {
            rows.push([
              idx + 1,
              log.student?.firstName && log.student?.lastName
                ? `${log.student.firstName} ${log.student.middleName || ""} ${log.student.lastName}`.trim()
                : log.student?.name || log.studentId || "Unknown Student",
              log.month && log.year ? `${new Date(log.year, log.month - 1).toLocaleString("default", { month: "long" })} ${log.year}` : "N/A",
              `${log.presentCount || 0} / ${log.totalDays || 0}`,
              subjects.find(s => s._id === expandedSubject)?.section || "N/A"
            ]);
          });

          colWidths = [
            { wch: 6 },  // S.No
            { wch: 25 }, // Student Name
            { wch: 15 }, // Month
            { wch: 15 }, // Present Days
            { wch: 8 }   // Section
          ];
        } else {
          // Build date array for the month
          const start = new Date(queryYear, queryMonth - 1, 1);
          const end = new Date(queryYear, queryMonth, 0);
          const dates = [];
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
          }

          const dateLabels = dates.map(d => {
            const dd = ("0" + d.getDate()).slice(-2);
            const mm = ("0" + (d.getMonth() + 1)).slice(-2);
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
          });

          // Header: S.No + Student Name + each date + Present Days
          rows.push([
            'S.No',
            'Student Name',
            ...dateLabels,
            'Present Days'
          ]);

          // Fetch raw logs for the month (as a range)
          try {
            const userDataStr = localStorage.getItem('user');
            const userData = JSON.parse(userDataStr || '{}');
            const facultyId = userData.employeeId;

            const params = {
              facultyId,
              subjectId: expandedSubject,
              type: 'range',
              from: start.toISOString().slice(0,10),
              to: end.toISOString().slice(0,10),
              page: 1,
              limit: 10000,
              studentIds: students.map(s => s._id).join(',')
            };

            const res = await api.get('/faculty/attendance/query', { params });
            const rawLogs = (res.data && res.data.success && Array.isArray(res.data.data)) ? res.data.data : [];

            // Map logs by studentId and date (YYYY-MM-DD)
            const logsByStudent = {};
            rawLogs.forEach(rec => {
              const sid = rec.studentId || rec.student?._id || rec.student;
              if (!sid) return;
              const dateKey = rec.date ? new Date(rec.date).toISOString().slice(0,10) : null;
              if (!dateKey) return;
              logsByStudent[sid] = logsByStudent[sid] || {};
              logsByStudent[sid][dateKey] = rec.status; // 'present' or 'absent'
            });

            // Add a row for each enrolled student (keeps student list order)
            const dateTotals = new Array(dates.length).fill(0);
            let totalPresentAll = 0;
            students.forEach((student, idx) => {
              const sid = student._id;
              const name = student.firstName && student.lastName
                ? `${student.firstName} ${student.middleName || ''} ${student.lastName}`.trim()
                : student.name || sid;

              const row = [idx + 1, name];
              let presentCount = 0;
              dates.forEach((d, di) => {
                const key = d.toISOString().slice(0,10);
                const status = logsByStudent[sid] && logsByStudent[sid][key];
                if (status === 'present') {
                  row.push('P');
                  presentCount++;
                  dateTotals[di] += 1;
                  totalPresentAll += 1;
                } else if (status === 'absent') {
                  row.push('A');
                } else {
                  row.push('-'); // Not marked
                }
              });

              // Present Days summary
              row.push(`${presentCount} / ${dates.length}`);

              rows.push(row);
            });

            // Totals row (align under date columns)
            const totalsRow = ['', 'Totals', ...dateTotals.map(n => n), `${totalPresentAll} / ${dates.length * students.length}`];
            rows.push(totalsRow);

            // Column widths: S.No small, Student Name wider, each date slightly wider to fit markers
            colWidths = [
              { wch: 6 },  // S.No
              { wch: 28 }, // Student Name
              ...dates.map(() => ({ wch: 12 })), // each date
              { wch: 18 } // Present Days
            ];
          } catch (fetchErr) {
            console.error('Failed to fetch raw logs for month export, falling back to aggregated output', fetchErr);
            // Fallback aggregated month layout (without Subject/Department/Semester per-row columns)
            filteredAttendance.forEach(log => {
              rows.push([
                log.student?.firstName && log.student?.lastName
                  ? `${log.student.firstName} ${log.student.middleName || ""} ${log.student.lastName}`.trim()
                  : log.student?.name || log.studentId || "Unknown Student",
                log.month && log.year ? `${new Date(log.year, log.month - 1).toLocaleString("default", { month: "long" })} ${log.year}` : "N/A",
                `${log.presentCount || 0} / ${log.totalDays || 0}`,
                subjects.find(s => s._id === expandedSubject)?.section || "N/A"
              ]);
            });

            colWidths = [
              { wch: 25 }, // Student Name
              { wch: 15 }, // Month
              { wch: 15 }, // Present Days
              { wch: 8 }   // Section
            ];
          }
        }
      } else {
        // Default format for day
        // Add column headers (include S.No)
        rows.push([
          'S.No',
          'Student Name',
          'Date',
          'Status',
          'Subject',
          'Department',
          'Semester',
          'Section'
        ]);

        // Add data rows
        filteredAttendance.forEach((log, idx) => {
          rows.push([
            idx + 1,
            log.student?.firstName && log.student?.lastName
              ? `${log.student.firstName} ${log.student.middleName || ""} ${log.student.lastName}`.trim()
              : log.student?.name || log.studentId || "Unknown Student",
            log.date ? new Date(log.date).toLocaleDateString() : "N/A",
            (log.status === 'present') ? 'P' : (log.status === 'absent') ? 'A' : '-',
            subjects.find(s => s._id === expandedSubject)?.name || "N/A",
            subjects.find(s => s._id === expandedSubject)?.department?.name || "N/A",
            getSemester(subjects.find(s => s._id === expandedSubject)) || "N/A",
            subjects.find(s => s._id === expandedSubject)?.section || "N/A"
          ]);
        });

        colWidths = [
          { wch: 6 },  // S.No
          { wch: 25 }, // Student Name
          { wch: 12 }, // Date
          { wch: 10 }, // Status
          { wch: 20 }, // Subject
          { wch: 15 }, // Department
          { wch: 10 }, // Semester
          { wch: 8 }   // Section
        ];
      }

      // Create workbook and worksheet from array of arrays
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);

      const numCols = colWidths
        ? colWidths.length
        : rows.filter(r => Array.isArray(r)).reduce((max, r) => Math.max(max, r.length), 7);

      // Merge the main top header rows across all columns for a centered title (do NOT include the sheet header row)
      ws['!merges'] = ws['!merges'] || [];
      ws['!merges'].push(
        { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: numCols - 1 } }
      );

      // Helper to set a cell value and style
      const setCell = (r, c, value) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        ws[ref] = { t: 's', v: value };
      };

      // Apply simple styling where supported (font size, bold, center)
      const setCellStyle = (r, c, style) => {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        ws[cellRef].s = { ...(ws[cellRef].s || {}), ...style };
      };

      // Put header text into the first column of merged ranges (top-left of each merge)
      setCell(0, 0, "Maitrey Educational Society's");
      setCell(1, 0, 'NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY & MANAGEMENT');
      setCell(2, 0, 'Nagpur - 440023');
      // Include Semester in the merged header instead of repeating per-row
      const semesterLabel = getSemester(currentSubject) || 'N/A';
      setCell(4, 0, `Subject: ${subjectName} | Department: ${departmentName} | Semester: ${semesterLabel}`);

      // Apply bold and center styling to header rows
      setCellStyle(0, 0, { font: { sz: 12, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } });
      setCellStyle(1, 0, { font: { sz: 14, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } });
      setCellStyle(2, 0, { font: { sz: 11, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } });
      setCellStyle(4, 0, { font: { sz: 11, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } });

      // Ensure the top header rows are centered across all columns for visual centering on-sheet
      [0, 1, 2, 4].forEach(r => {
        for (let c = 0; c < numCols; c++) {
          setCellStyle(r, c, { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } });
        }
      });

      // Clear other cells in header rows to avoid duplicate visible text
      [0, 1, 2, 4].forEach((r) => {
        for (let c = 1; c < numCols; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          ws[ref] = { t: 's', v: '' };
        }
      });

      // Also set page margins so the centered header remains centered when printing
      ws['!margins'] = {
        left: 0.9,
        right: 0.5,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      };

      // Center column header row (if present)
      let headerRowIndex = rows.findIndex(r => Array.isArray(r) && (r.includes('Student Name') || r.includes('S.No') || r.includes('Date') || r.includes('Month')));
      if (headerRowIndex !== -1) {
        for (let c = 0; c < numCols; c++) {
          setCellStyle(headerRowIndex, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
        }
      }

      // Style the Totals row (if present) - bold and center
      const totalsRowIndex = rows.findIndex(r => Array.isArray(r) && r.includes('Totals'));
      if (totalsRowIndex !== -1) {
        for (let c = 0; c < numCols; c++) {
          setCellStyle(totalsRowIndex, c, { font: { bold: true }, alignment: { horizontal: 'center' } });
        }
      }

      // Set column widths
      ws['!cols'] = colWidths;

      // Ensure header prints centered on the page and looks balanced
      ws['!pageSetup'] = {
        orientation: 'portrait',
        paperSize: 9,
        fitToPage: true,
        horizontalCentered: true,
        verticalCentered: true
      };

      // Increase header row heights for better visual centering
      ws['!rows'] = ws['!rows'] || [];
      ws['!rows'][0] = { hpt: 18 }; // Title
      ws['!rows'][1] = { hpt: 22 }; // Institute name
      ws['!rows'][2] = { hpt: 14 }; // Address
      ws['!rows'][4] = { hpt: 14 }; // Subject/Department row

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

      // Generate filename with current date and filter type
      const fileName = `Attendance_Report_${queryType}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Write file and trigger download
      XLSX.writeFile(wb, fileName);

    } catch (err) {
      console.error("Excel export error:", err);
      alert("Excel export failed: " + (err.message || "Unknown error occurred"));
    }
  };

  const handleDownloadPDF = async () => {
    if (!logsRef.current) return;

    try {
      // Create a clean HTML table for PDF generation
      const cleanTableHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: white;">
          <h2 style="color: #333; margin-bottom: 20px;">Attendance Report</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Student</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Time</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAttendance.map(log => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    ${log.student?.firstName && log.student?.lastName
                      ? `${log.student.firstName} ${log.student.middleName || ""} ${log.student.lastName}`.trim()
                      : log.student?.name || log.studentId || "Unknown Student"}
                  </td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    ${log.date ? new Date(log.date).toLocaleDateString() : "N/A"}
                  </td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    ${log.createdAt
                      ? new Date(log.createdAt).toLocaleTimeString()
                      : log.markedAt
                      ? new Date(log.markedAt).toLocaleTimeString()
                      : "N/A"}
                  </td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    <span style="padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; ${log.status === "present" ? "background: #dcfce7; color: #166534;" : "background: #fee2e2; color: #991b1b;"}">
                      ${log.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Create a temporary container with clean HTML
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = cleanTableHTML;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        scale: 1.5,
        useCORS: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `Attendance_Report_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      console.error("PDF export error:", err);
      alert("PDF export failed: " + (err.message || "Unknown error occurred"));
    }
  };

  const handleDownloadStudentData = async (studentId, studentName) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/files/student-attendance/${studentId}/${expandedSubject}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${studentName}_attendance_report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to download student data");
      }
    } catch (error) {
      console.error("Error downloading student data:", error);
      alert("Error downloading student data");
    }
  };

  // Add this handler for note changes
  const handleNoteChange = (studentId, value) => {
    setStudentNotes((prev) => ({ ...prev, [studentId]: value }));
  };

  if (loading && !subjects.length && !students.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Attendance Management
              </h1>
              <p className="text-gray-600">
                Mark attendance, view analytics, and manage student records
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString()}</span>
              <Clock className="h-4 w-4 ml-2" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Select Subject
          </h2>

          {subjects.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No Subjects Found
              </h3>
              <p className="text-gray-500">
                You are not assigned to teach any subjects.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <div
                  key={subject._id}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                    expandedSubject === subject._id
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                  }`}
                  onClick={() => {
                    setExpandedSubject(
                      expandedSubject === subject._id ? "" : subject._id
                    );
                    setSelectedStudents([]);
                    setStudentMessage("");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {subject.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {subject.department?.name || "Department"} | Sem{" "}
                        {getSemester(subject)} | Section {subject.section || "A"}
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        expandedSubject === subject._id
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student List and Attendance Marking */}
        {expandedSubject && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 mt-">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 ml-23">
                  <Users className="h-6 w-6 text-green-600" />
                  Students & Attendance
                </h2>

                {/* Subject Details */}
                {loadingSubjectDetails ? (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-gray-600">
                      Loading subject details...
                    </span>
                  </div>
                ) : subjectDetails ? (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Department:</span>{" "}
                    {subjectDetails.department} |
                    <span className="font-medium"> Semester:</span>{" "}
                    {getSemester(subjects.find(s => s._id === expandedSubject))} |
                    <span className="font-medium"> Section:</span>{" "}
                    {subjectDetails.section}
                    {subjectDetails.totalStudents > 0 && (
                      <>
                        {" "}
                        | <span className="font-medium">
                          Total Students:
                        </span>{" "} 
                        {subjectDetails.totalStudents}
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Date Selector for Attendance */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Date for Attendance
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 font-medium"
                />
              </div>

              {/* Date Attendance Status */}
              {checkingTodayAttendance ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-blue-700 text-sm">
                    Checking attendance for {new Date(selectedDate).toLocaleDateString()}...
                  </span>
                </div>
              ) : attendanceMarkedToday ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-4 py-3  ">
                    {/* <CheckCircle className="h-5 w-5 text-blue-600" /> */}
                    <div>
                      {/* <span className="text-blue-800 font-semibold block">
                        📝 Edit Mode - Attendance exists for {new Date(selectedDate).toLocaleDateString()}
                      </span>
                      <span className="text-blue-600 text-xs">
                        You can update attendance for any student
                      </span> */}
                    </div>
                  </div>
                  {todayClassAttendance !== null && (
                    <div className="flex items-center gap-2 px-4 py-2  rounded-lg">
                      {/* <Users className="h-5 w-5 text-blue-600" /> */}
                      {/* <span className="text-blue-700 font-medium">
                        Class Attendance for {new Date(selectedDate).toLocaleDateString()}: {todayClassAttendance}%
                      </span> */}
                    </div>
                  )}
                  {monthlyAttendanceLoading ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      <span className="text-gray-700 text-sm">
                        Calculating monthly attendance...
                      </span>
                    </div>
                  ) : (
                    monthlyClassAttendance !== null && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg">
                        {/* <Calendar className="h-5 w-5 text-purple-600" /> */}
                        {/* <span className="text-purple-700 font-medium">
                          This Month's Class Attendance:{" "}
                          {monthlyClassAttendance}%
                        </span> */}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2    rounded-lg">
                  {/* <Clock className="h-5 w-5 text-yellow-600" /> */}
                  {/* <span className="text-yellow-700 font-medium">
                    Attendance not marked for {new Date(selectedDate).toLocaleDateString()}
                  </span> */}
                </div>
              )}

              {/* Batch Actions */}
              {students.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={selectAllStudents}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                  >
                    {selectedStudents.length === students.length
                      ? "✓ Deselect All"
                      : "Select All"}
                  </button>
                  {selectedStudents.length > 0 && (
                    <>
                      <button
                        onClick={() => markAttendance("present")}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                      >
                        {isUpdating ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        {editMode ? `Update to Present (${selectedStudents.length})` : `Mark Present (${selectedStudents.length})`}
                      </button>
                      <button
                        onClick={() => markAttendance("absent")}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                      >
                        {isUpdating ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {editMode ? `Update to Absent (${selectedStudents.length})` : `Mark Absent (${selectedStudents.length})`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedStudents.length === students.length &&
                          students.length > 0
                        }
                        onChange={selectAllStudents}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year/Sem/Section
                    </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status ({new Date(selectedDate).toLocaleDateString()})
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason/Note
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mark/Update
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => {
                    const stats = attendanceStats[student._id] || {};
                    return (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => toggleStudentSelection(student._id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              handleDownloadStudentData(
                                student._id,
                                `${student.firstName} ${student.lastName}`
                              )
                            }
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            title="Click to download attendance data"
                          >
                            {student.firstName} {student.lastName}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {student.department?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {student.year} / Sem {student.semester?.number || 'N/A'} / {student.section}
                        </td>
                        <td className="px-6 py-4">
                          {existingAttendance[student._id] ? (
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                existingAttendance[student._id].status === "present"
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {existingAttendance[student._id].status === "present" ? "✓ Present" : "✗ Absent"}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm italic">Not marked</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Optional reason/note"
                            value={studentNotes[student._id] || ""}
                            onChange={(e) =>
                              handleNoteChange(student._id, e.target.value)
                            }
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => markIndividualAttendance(student._id, "present")}
                              disabled={isUpdating}
                              className="p-2 rounded-lg transition-all bg-green-100 hover:bg-green-200 text-green-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                              title={existingAttendance[student._id] ? "Update to Present" : "Mark Present"}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => markIndividualAttendance(student._id, "absent")}
                              disabled={isUpdating}
                              className="p-2 rounded-lg transition-all bg-red-100 hover:bg-red-200 text-red-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                              title={existingAttendance[student._id] ? "Update to Absent" : "Mark Absent"}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {students.length === 0 && !loading && (
              <div className="p-8 text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Students Found
                </h3>
                {subjectDetails ? (
                  <p className="text-gray-500">
                    No students found for {subjectDetails.department} - Year{" "}
                    {subjectDetails.year}, Section {subjectDetails.section}
                  </p>
                ) : (
                  <p className="text-gray-500">
                    {studentMessage || "No students are enrolled in this subject."}
                  </p>
                )}
              </div>
            )}

            {loading && (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading students...</p>
              </div>
            )}
          </div>
        )}

        {/* Attendance Analytics */}
        {expandedSubject && students.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-purple-600" />
              Attendance Analytics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-green-800">
                      Present Today
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      {
                        students.filter((s) => {
                          const attendance = existingAttendance[s._id];
                          return attendance?.status === "present";
                        }).length
                      }
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-100 to-pink-100 rounded-xl p-4 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Absent Today
                    </h3>
                    <p className="text-2xl font-bold text-red-600">
                      {
                        students.filter((s) => {
                          const attendance = existingAttendance[s._id];
                          return attendance?.status === "absent";
                        }).length
                      }
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>

              {/* <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-orange-800">
                      Not Marked
                    </h3>
                    <p className="text-2xl font-bold text-orange-600">
                      {
                        students.filter((s) => {
                          const attendance = existingAttendance[s._id];
                          return !attendance;
                        }).length
                      }
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </div> */}

              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      Total Students
                    </h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {students.length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Analytics Chart */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6">
              {students.length > 0 && expandedSubject ? (
                <AttendanceBarChart
                  students={students}
                  subjectId={expandedSubject}
                  title="Monthly Attendance % by Student"
                  refreshTrigger={chartRefreshTrigger}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading attendance statistics...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendance Logs & Reports Section */}
        {expandedSubject && (
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Search className="h-6 w-6 text-purple-600" />
              Attendance Logs & Reports
            </h2>

            {/* Filters */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <label className="text-gray-700 font-medium">Filter by:</label>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={queryType}
                  onChange={(e) => setQueryType(e.target.value)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="range">Custom Range</option>
                </select>

                {queryType === "day" && (
                  <input
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={queryDate}
                    onChange={(e) => setQueryDate(e.target.value)}
                  />
                )}

                {queryType === "week" && (
                  <div className="flex gap-2 items-end">
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500">Start Date (DD/MM/YYYY)</label>
                      <input
                        type="date"
                        title="DD/MM/YYYY"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={queryFrom}
                        onChange={(e) => setQueryFrom(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500">End Date (DD/MM/YYYY)</label>
                      <input
                        type="date"
                        title="DD/MM/YYYY"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={queryTo}
                        onChange={(e) => setQueryTo(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {queryType === "month" && (
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={queryMonth}
                      onChange={(e) => setQueryMonth(Number(e.target.value))}
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString("default", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
                      value={queryYear}
                      onChange={(e) => setQueryYear(Number(e.target.value))}
                      min="2000"
                      max="2100"
                    />
                  </div>
                )}

                {queryType === "range" && (
                  <div className="flex gap-2 items-end">
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500">From (DD/MM/YYYY)</label>
                      <input
                        type="date"
                        title="DD/MM/YYYY"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={queryFrom}
                        onChange={(e) => setQueryFrom(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500">To (DD/MM/YYYY)</label>
                      <input
                        type="date"
                        title="DD/MM/YYYY"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={queryTo}
                        onChange={(e) => setQueryTo(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  onClick={handleFilterClick}
                  disabled={
                    filterLoading ||
                    !expandedSubject ||
                    !students ||
                    students.length === 0 ||
                    (queryType === "day" && !queryDate) ||
                    (queryType === "week" && (!queryFrom || !queryTo)) ||
                    (queryType === "month" && (!queryMonth || !queryYear)) ||
                    (queryType === "range" && (!queryFrom || !queryTo))
                  }
                >
                  <Filter className="h-4 w-4" />
                  {filterLoading ? "Filtering..." : "Filter"}
                </button>
              </div>
            </div>
            {/* Results Table */}
            <div className="overflow-x-auto" ref={logsRef}>
              {filteredAttendance.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      {queryType === "week" || queryType === "range" ? (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Start Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            End Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Present Days
                          </th>
                        </>
                      ) : queryType === "month" ? (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Month
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Present Days
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAttendance.map((log, index) => (
                      <tr
                        key={`${log._id || log.studentId || index}-${queryType === "week" ? log.startDate : log.date}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.student?.firstName && log.student?.lastName
                            ? `${log.student.firstName} ${
                                log.student.middleName || ""
                              } ${log.student.lastName}`.trim()
                            : log.student?.name ||
                              log.studentId ||
                              "Unknown Student"}
                        </td>
                        {queryType === "week" || queryType === "range" ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateDMY(log.startDate)}
                            </td> 
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateDMY(log.endDate)}
                            </td> 
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.presentCount || 0} / {log.totalDays || 0}
                            </td>
                          </>
                        ) : queryType === "month" ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.month && log.year ? `${new Date(log.year, log.month - 1).toLocaleString("default", { month: "long" })} ${log.year}` : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.presentCount || 0} / {log.totalDays || 0}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateDMY(log.date)}
                            </td>   
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  log.status === "present"
                                    ? "bg-green-100 text-green-800"
                                    : log.status === "absent"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    No Attendance Records Found
                  </h3>
                  <div className="text-gray-500 mb-4">
                    {filterLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                        <span>Loading attendance records...</span>
                      </div>
                    ) : (
                      <span>
                        No attendance records found for the currently enrolled students with the selected criteria.
                        Try marking attendance first or adjusting your filters.
                      </span>
                    )}
                  </div>
                  {!filterLoading && (
                    <button
                      onClick={() => {
                        console.log("Current filter params:", {
                          queryType,
                          queryDate,
                          queryMonth,
                          queryYear,
                          queryFrom,
                          queryTo,
                        });
                      }}
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Debug Filter Parameters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredAttendance.length > 0 && filteredTotalPages > 1 && queryType !== "week" && queryType !== "month" && queryType !== "range" && queryType !== "day" && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing page {filteredPage} of {filteredTotalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={filteredPage === 1 || filterLoading}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={
                      filteredPage === filteredTotalPages || filterLoading
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Download Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                onClick={handleDownloadReport}
              >
                <Download className="h-4 w-4" />
                Download Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
