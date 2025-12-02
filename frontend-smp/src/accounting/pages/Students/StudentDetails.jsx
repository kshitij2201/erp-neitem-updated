import { useEffect, useState } from "react";
import axios from "axios";

export default function StudentDetails() {
  const [allStudents, setAllStudents] = useState([]); // Store all students for pagination
  const [students, setStudents] = useState([]); // Current page students
  const [feeData, setFeeData] = useState({});
  const [insuranceData, setInsuranceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [financialSummary, setFinancialSummary] = useState({
    totalFeesCollected: 0,
    pendingFees: 0,
    totalExpenses: 0,
    totalRevenue: 0,
    netBalanceStudentFees: 0,
    pendingCollection: 0,
    facultySalaries: 0,
  });
  const studentsPerPage = 10;
  const [totalStudents, setTotalStudents] = useState(0);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleExportClick = async (type) => {
    console.log('Export clicked:', type);
    setShowExportDropdown(false);
    
    // Show loading feedback
    setToastMessage('🔄 Fetching student data...');
    setShowToast(true);
    setExportLoading(true);
    
    try {
      let studentList = [];
      
      if (type === 'current') {
        // Use current page students
        studentList = students;
      } else {
        // Use cached allStudents and filter by stream for better performance
        const streamFilter = type === 'btech' ? 'B.Tech' : 'MBA';
        studentList = allStudents.filter(s => {
          const stream = s.stream?.name || s.stream || '';
          return stream.toLowerCase().includes(streamFilter.toLowerCase());
        });
      }
      
      // Update toast message
      setToastMessage('🔄 Fetching fee data...');
      
      // Export with real fee data like student box click
      await openExcelView(studentList, type === 'current' ? null : (type === 'btech' ? 'B.Tech' : 'MBA'));
      
      // Success message
      setToastMessage('✅ Export completed with real fee data!');
      setTimeout(() => setShowToast(false), 2000);
      
    } catch (error) {
      console.error('Export error:', error);
      setToastMessage('❌ Export failed.');
      setTimeout(() => setShowToast(false), 2000);
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate pagination values
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = Math.min(startIndex + studentsPerPage, totalStudents);
  const totalPages = Math.ceil(totalStudents / studentsPerPage);

  // Fetch financial summary on component mount
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown) {
        const dropdown = event.target.closest('.absolute.top-full');
        const button = event.target.closest('button');
        const isExportButton = button && button.textContent.includes('Export Overview');
        
        if (!dropdown && !isExportButton) {
          setShowExportDropdown(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  useEffect(() => {
    fetchFinancialSummary();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Reduced to 300ms for faster response
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Update students when search or page changes
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setError("");
      try {
        // Get authentication token
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch all students for fast search and navigation
        const res = await axios.get(
          "https://backenderp.tarstech.in/api/students/public",
          {
            params: { 
              search: debouncedSearchTerm,
              limit: 50000, // Get all students
              page: 1
            }
          }
        );
        
        console.log('API Response:', res.data);
        
        // Parse all students response
        let allStudentList = [];
        
        if (res.data) {
          if (Array.isArray(res.data.data)) {
            allStudentList = res.data.data;
          } else if (Array.isArray(res.data.students)) {
            allStudentList = res.data.students;
          } else if (Array.isArray(res.data)) {
            allStudentList = res.data;
          }
        }
        
        console.log('Parsed students:', allStudentList.length);
        console.log('Search term used:', debouncedSearchTerm);
        
        // Store all students and calculate pagination
        setAllStudents(allStudentList);
        setTotalStudents(allStudentList.length);
        
        // Calculate current page students
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = Math.min(startIndex + studentsPerPage, allStudentList.length);
        const currentPageStudents = allStudentList.slice(startIndex, endIndex);
        setStudents(currentPageStudents);
        
        // Start background fee data fetching for better user experience
        if (allStudentList.length > 0) {
          setTimeout(() => prefetchFeeDataInBackground(allStudentList), 500);
        }
        
      } catch (err) {
        console.error("API call failed:", err);
        if (err.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
        } else if (err.response?.status === 500) {
          setError("Server error. Please try again later.");
        } else if (err.code === "NETWORK_ERROR" || !err.response) {
          setError(
            "Cannot connect to server. Please check if the backend server is running on https://backenderp.tarstech.in"
          );
        } else {
          setError(
            "Failed to load student data. Please check your backend server."
          );
        }
        setAllStudents([]);
        setStudents([]);
        setTotalStudents(0);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [debouncedSearchTerm, currentPage]);

  const handleStudentClick = async (student) => {
    setSelectedStudent(student);
    
    // Fetch fee data for the selected student if not already available
    if (!feeData[student._id]) {
      await fetchFeeHeads([student]);
    }

    // Fetch insurance data for the selected student if not already available
    if (!insuranceData[student._id]) {
      await fetchInsurancePolicies([student]);
    }
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
  };

  const fetchInsurancePolicies = async (studentList) => {
    if (!studentList || studentList.length === 0) return;
    
    const insuranceMap = {};
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Process in batches to avoid overwhelming the API (reduced batch size)
    const batchSize = 5;
    for (let i = 0; i < studentList.length; i += batchSize) {
      const batch = studentList.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (student) => {
          try {
            const res = await axios.get(
              `https://backenderp.tarstech.in/api/insurance/student/${student._id}`,
              { headers }
            );
            insuranceMap[student._id] = res.data || [];
          } catch (err) {
            console.error(`Error fetching insurance for student ${student._id}:`, err);
            insuranceMap[student._id] = [];
          }
        })
      );
    }
    setInsuranceData(prev => ({ ...prev, ...insuranceMap }));
  };

  const fetchFeeHeads = async (studentList) => {
    if (!studentList || studentList.length === 0) return;

    const feesMap = {};
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Mapping from display format to database format (same as FeeHeads.jsx)
    const batchToDbFormat = {
      '1st Year': '2022-2026',
      '2nd Year': '2021-2025',
      '3rd Year': '2020-2024',
      '4th Year': '2019-2023'
    };

    // Normalize branch names to match database format
    const normalizeBranch = (branch) => {
      if (!branch) return branch;
      
      // Convert to lowercase and normalize spaces
      const normalized = branch.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Special handling for CSE & AIML
      if (normalized === 'cse & aiml') {
        return 'CSE&AIML';
      }
      
      // Handle specific branch mappings to match FeeHeads.jsx format
      const branchMappings = {
        'computer science and engineering': 'CS',
        'computer science and engineering (artificial intelligence and machine learning)': 'CSE&AIML',
        'computer science and engineering artificial intelligence and machine learning': 'CSE&AIML',
        'cse & aiml': 'CSE&AIML',
        'cse and aiml': 'CSE&AIML',
        'cse aiml': 'CSE&AIML',
        'civil engineering': 'Civil',
        'electrical engineering': 'Electrical',
        'mechanical engineering': 'Mechanical',
        'cs': 'CS',
        'cse&aiml': 'CSE&AIML',
        'civil': 'Civil',
        'mechanical': 'Mechanical',
        'mechnical': 'Mechanical', // Handle misspelling
        'electrical': 'Electrical',
        'mechancial': 'Mechanical', // Handle old misspelling
        'mba': 'MBA'
      };
      
      // Return mapped value or the original branch if not in mapping
      return branchMappings[normalized] || branch;
    };

    // Process in larger batches for better performance when all data is needed
    const batchSize = 15;
    for (let i = 0; i < studentList.length; i += batchSize) {
      const batch = studentList.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (student) => {
        try {
          // Get student details
          const studentStream = student.stream?.name || student.stream || 'B.Tech';
          const studentDepartment = student.department?.name || student.department || 'CS';
          const currentSemester = student.currentSemester || 1;

          // Calculate batch based on current semester
          let yearDisplay = '1st Year'; // default
          if (currentSemester >= 7) yearDisplay = '4th Year';
          else if (currentSemester >= 5) yearDisplay = '3rd Year';
          else if (currentSemester >= 3) yearDisplay = '2nd Year';
          else yearDisplay = '1st Year';

          const studentBatch = batchToDbFormat[yearDisplay];

          // Normalize branch name to match database format
          const branch = normalizeBranch(studentDepartment);

          console.log(`Debug: studentDepartment="${studentDepartment}", normalized="${studentDepartment.toLowerCase().replace(/\s+/g, ' ').trim()}", branch="${branch}"`);

          console.log(`Fetching fees for student ${student.firstName} ${student.lastName}: Stream=${studentStream}, Department=${studentDepartment}, Normalized Branch=${branch}, Batch=${studentBatch}, Semester=${currentSemester}, Year=${yearDisplay}`);

          // Fetch department-specific fee heads from FeeHeads API
          const feeRes = await axios.get(
            `http://localhost:4000/api/fees?stream=${encodeURIComponent(studentStream)}&branch=${encodeURIComponent(branch)}&batch=${encodeURIComponent(studentBatch)}`,
            { headers }
          );
          const departmentFees = feeRes.data;

          console.log(`API Response for fees:`, departmentFees);
          console.log(`Number of fee heads returned: ${departmentFees.length}`);
          if (departmentFees.length > 0) {
            console.log(`Fee head names:`, departmentFees.map(f => f.head));
          }

          // Calculate total fees as sum of department-specific fee heads
          const total = departmentFees.reduce((sum, f) => sum + Number(f.amount), 0);

          // Fetch all payments for the student
          const paymentsRes = await axios.get(
            `https://backenderp.tarstech.in/api/payments/student/${student._id}`,
            { headers }
          );
          const payments = paymentsRes.data;
          console.log(`Payments for student ${student.firstName} ${student.lastName} (${student._id}):`, payments);

          // Calculate total paid as sum of all amount
          const paid = payments.reduce((sum, p) => sum + p.amount, 0);
          console.log(`Total paid for student ${student.firstName} ${student.lastName}: ₹${paid}`);
          
          // Apply caste/gender-based fee waiver logic
          let adjustedTotal = total;
          const studentCaste = student.casteCategory?.toUpperCase() || '';
          const studentGender = student.gender?.toLowerCase() || '';
          
          // Check if student is eligible for tuition fee waiver
          const isReservedCaste = ['SC', 'ST', 'NT', 'SBC', 'VJNT'].includes(studentCaste);
          const isGirl = studentGender === 'female' || studentGender === 'f';
          
          if (isReservedCaste || isGirl) {
            // Find tuition fee amount to subtract (professional way - exact match)
            let tuitionFeeAmount = 0;
            
            // Look for exact "Tuition fees" head in department fees
            const tuitionFee = departmentFees.find(fee => 
              fee.head?.toLowerCase().trim() === 'tuition fees'
            );
            
            if (tuitionFee) {
              tuitionFeeAmount = Number(tuitionFee.amount);
              adjustedTotal = total - tuitionFeeAmount;
              console.log(`Applied fee waiver for ${isReservedCaste ? 'reserved caste (' + studentCaste + ')' : 'female student'}: Subtracted tuition fee ₹${tuitionFeeAmount}, Adjusted total: ₹${adjustedTotal}`);
            } else {
              console.log(`No tuition fees found for waiver calculation for ${student.firstName} ${student.lastName}`);
            }
          }
          
          const pending = adjustedTotal - paid;

          feesMap[student._id] = {
            total: adjustedTotal,
            paid,
            pending,
            heads: departmentFees,
            payments: payments,
            originalTotal: total, // Keep original total for reference
            isFeeWaiverApplied: adjustedTotal < total,
            waiverReason: isReservedCaste ? `Reserved caste (${studentCaste})` : isGirl ? 'Female student' : null
          };
        } catch (err) {
          console.error(
            `Error fetching fee data for student ${student._id}:`,
            err
          );
          // Provide fallback data instead of failing completely
          feesMap[student._id] = {
            total: 0,
            paid: 0,
            pending: 0,
            heads: [],
            payments: [],
          };
        }
        })
      );
    }
    setFeeData(prev => ({ ...prev, ...feesMap }));
  };

  const fetchFinancialSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get("https://backenderp.tarstech.in/api/accounts/financial-summary", { headers });

      setFinancialSummary(response.data);
    } catch (err) {
      console.error("Error fetching financial summary:", err);
      // Fallback to zero values
      setFinancialSummary({
        totalFeesCollected: 0,
        pendingFees: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        netBalanceStudentFees: 0,
        pendingCollection: 0,
        facultySalaries: 0,
      });
    }
  };



  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setError("");
      try {
        // Get authentication token
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch students with server-side pagination
        const res = await axios.get(
          "https://backenderp.tarstech.in/api/students/public",
          {
            params: { 
              search: debouncedSearchTerm,
              limit: studentsPerPage, // Only fetch current page
              page: currentPage
            }
          }
        );
        
        console.log('API Response:', res.data);
        
        // Parse paginated response
        let studentList = [];
        let totalCount = 0;
        
        if (res.data) {
          if (Array.isArray(res.data.data)) {
            studentList = res.data.data;
            totalCount = res.data.total || res.data.totalCount || studentList.length;
          } else if (Array.isArray(res.data.students)) {
            studentList = res.data.students;
            totalCount = res.data.total || res.data.totalCount || studentList.length;
          } else if (Array.isArray(res.data)) {
            studentList = res.data;
            totalCount = studentList.length;
          }
        }
        
        console.log('Parsed students:', studentList.length, 'Total:', totalCount);
        console.log('Search term used:', debouncedSearchTerm);
        setStudents(studentList);
        setTotalStudents(totalCount);
        
        // Remove background fee fetching - only load when needed
        // setTimeout(() => prefetchAllFeeData(), 1000); // REMOVED
      } catch (err) {
        console.error("API call failed:", err);
        if (err.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
        } else if (err.response?.status === 500) {
          setError("Server error. Please try again later.");
        } else if (err.code === "NETWORK_ERROR" || !err.response) {
          setError(
            "Cannot connect to server. Please check if the backend server is running on https://backenderp.tarstech.in"
          );
        } else {
          setError(
            "Failed to load student data. Please check your backend server."
          );
        }
        setAllStudents([]);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [debouncedSearchTerm, currentPage]);

  // Helper functions for calculations (moved outside of render)
  const calculateInsuranceStats = (insurancePolicies) => {
    if (!insurancePolicies.length) return null;

    return {
      totalPolicies: insurancePolicies.length,
      activePolicies: insurancePolicies.filter((p) => p.status === "Active")
        .length,
      totalCoverage: insurancePolicies.reduce(
        (sum, p) => sum + (p.coverageAmount || 0),
        0
      ),
      totalPremium: insurancePolicies.reduce(
        (sum, p) => sum + (p.premiumAmount || 0),
        0
      ),
    };
  };

  const getInsuranceStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Expired":
        return "bg-red-100 text-red-800";
      case "Cancelled":
        return "bg-gray-100 text-gray-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      case "Partial":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Quick overview builder for instant export (no API calls)
  const buildQuickOverviewRows = (studentList) => {
    return studentList.map((s) => {
      const name = `${s.firstName || ""} ${s.middleName ? s.middleName + " " : ""}${s.lastName || ""}`.trim();
      const stream = s.stream?.name || s.stream || "N/A";
      const department = s.department?.name || s.department || "N/A";
      const casteCategory = s.casteCategory || "N/A";
      const studentId = s.studentId || "N/A";
      const enrollmentNumber = s.enrollmentNumber || "N/A";
      const email = s.email || "N/A";
      const gender = s.gender || "N/A";
      const currentSemester = s.currentSemester || "N/A";
      
      // Use cached fee data if available, otherwise show "Not loaded"
      const fees = feeData[s._id];
      const total = fees ? Number(fees.total || 0) : "Not loaded";
      const paid = fees ? Number(fees.paid || 0) : "Not loaded";
      const pending = fees ? Number(fees.pending || 0) : "Not loaded";
      
      return { 
        name, 
        studentId, 
        enrollmentNumber, 
        email, 
        stream, 
        department, 
        casteCategory, 
        gender, 
        currentSemester, 
        total, 
        paid, 
        pending 
      };
    });
  };

  // Export current page's overview (open table view + CSV download) - ASYNC VERSION for detailed export
  const buildOverviewRows = async (studentList) => {
    // First ensure we have fee data for all students (like when clicking on student box)
    const studentsNeedingFeeData = studentList.filter(s => !feeData[s._id]);
    if (studentsNeedingFeeData.length > 0) {
      await fetchFeeHeads(studentsNeedingFeeData);
    }
    
    return studentList.map((s) => {
      const name = `${s.firstName || ""} ${s.middleName ? s.middleName + " " : ""}${s.lastName || ""}`.trim();
      const stream = s.stream?.name || s.stream || "N/A";
      const department = s.department?.name || s.department || "N/A";
      const casteCategory = s.casteCategory || "N/A";
      
      // Use the exact same fee data that appears when clicking on student box
      const fees = feeData[s._id] || {
        total: 0,
        paid: 0,
        pending: 0
      };
      
      const total = Number(fees.total || 0);
      const paid = Number(fees.paid || 0);
      const pending = Number(fees.pending || (total - paid) || 0);
      
      return { name, stream, department, casteCategory, total, paid, pending };
    });
  };

  const downloadCsv = (rows) => {
    const headers = ["Student Name", "Stream", "Department", "Caste Category", "Total Fees", "Paid Fees", "Pending Fees"];
    const csvLines = [headers.join(",")];
    rows.forEach((r) => {
      // Escape commas and quotes
      const escape = (v) => {
        if (v === null || v === undefined) return "";
        const str = String(v);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      csvLines.push([
        escape(r.name),
        escape(r.stream),
        escape(r.department),
        escape(r.casteCategory),
        escape(r.total),
        escape(r.paid),
        escape(r.pending),
      ].join(","));
    });

    const csvBlob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-overview-page-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Instant CSV download with enhanced student data
  const downloadCsvInstant = (rows, filename) => {
    const headers = [
      "Student Name", 
      "Student ID", 
      "Enrollment Number", 
      "Email", 
      "Stream", 
      "Department", 
      "Caste Category", 
      "Gender", 
      "Current Semester", 
      "Total Fees", 
      "Paid Fees", 
      "Pending Fees"
    ];
    const csvLines = [headers.join(",")];
    
    rows.forEach((r) => {
      // Escape commas and quotes
      const escape = (v) => {
        if (v === null || v === undefined) return "";
        const str = String(v);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      csvLines.push([
        escape(r.name),
        escape(r.studentId),
        escape(r.enrollmentNumber),
        escape(r.email),
        escape(r.stream),
        escape(r.department),
        escape(r.casteCategory),
        escape(r.gender),
        escape(r.currentSemester),
        escape(r.total),
        escape(r.paid),
        escape(r.pending),
      ].join(","));
    });

    const csvBlob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Fetch fee data for students who don't have it yet (fast version)
  const ensureFeeData = async (studentList) => {
    const studentsNeedingFeeData = studentList.filter(s => !feeData[s._id]);
    if (studentsNeedingFeeData.length > 0) {
      await fetchFeeHeads(studentsNeedingFeeData);
    }
  };

  // Background fee data prefetching for better performance
  const prefetchFeeDataInBackground = async (allStudentsList) => {
    console.log('Starting background fee data prefetch...');
    
    // Process in small batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < allStudentsList.length; i += batchSize) {
      const batch = allStudentsList.slice(i, i + batchSize);
      
      // Check which students need fee data
      const studentsNeedingFeeData = batch.filter(s => !feeData[s._id]);
      
      if (studentsNeedingFeeData.length > 0) {
        try {
          await fetchFeeHeads(studentsNeedingFeeData);
          console.log(`Prefetched fee data for batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allStudentsList.length/batchSize)}`);
          
          // Small delay to prevent overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Error prefetching fee data for batch:', error);
          // Continue with next batch even if this one fails
        }
      }
    }
    
    console.log('Background fee data prefetch completed');
  };

  const groupStudentsByDepartment = (studentList, targetStream) => {
    // Filter by stream first
    const filteredStudents = studentList.filter(s => {
      const stream = s.stream?.name || s.stream || '';
      return stream.toLowerCase().includes(targetStream.toLowerCase());
    });

    // Group by department
    const grouped = {};
    filteredStudents.forEach(s => {
      const dept = s.department?.name || s.department || 'Unknown';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(s);
    });

    // Sort departments and flatten into ordered list
    const deptOrder = ['CS', 'CSE&AIML', 'Civil', 'Mechanical', 'Electrical', 'MBA'];
    const sortedDepts = Object.keys(grouped).sort((a, b) => {
      const aIndex = deptOrder.findIndex(d => a.toLowerCase().includes(d.toLowerCase()));
      const bIndex = deptOrder.findIndex(d => b.toLowerCase().includes(d.toLowerCase()));
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return { grouped, sortedDepts };
  };

  const openExcelView = async (studentList, streamFilter = null) => {
    // Fetch real fee data exactly like when clicking on student box
    const missingFeeData = studentList.filter(s => !feeData[s._id]);
    if (missingFeeData.length > 0) {
      console.log(`Fetching fee data for ${missingFeeData.length} students...`);
      await fetchFeeHeads(missingFeeData);
    }
    
    let rows = [];
    let title = 'Student Overview';
    
    if (streamFilter) {
      const { grouped, sortedDepts } = groupStudentsByDepartment(allStudents, streamFilter);
      title = `${streamFilter} Students - Department Wise`;
      
      // Build rows department by department
      for (const dept of sortedDepts) {
        const deptStudents = grouped[dept];
        if (deptStudents.length > 0) {
          // Add department header row
          rows.push({ isDepartmentHeader: true, department: dept, count: deptStudents.length });
          // Add student rows with real fee data
          const deptRows = await buildOverviewRows(deptStudents);
          rows.push(...deptRows);
        }
      }
    } else {
      rows = await buildOverviewRows(studentList);
    }

    const htmlRows = rows.map(r => {
      if (r.isDepartmentHeader) {
        return `<tr style="background:#e5e7eb"><td colspan="7" style="padding:12px;border:1px solid #ddd;font-weight:bold;color:#374151">${r.department} Department (${r.count} students)</td></tr>`;
      }
      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd">${r.name}</td>
          <td style="padding:8px;border:1px solid #ddd">${r.stream}</td>
          <td style="padding:8px;border:1px solid #ddd">${r.department}</td>
          <td style="padding:8px;border:1px solid #ddd">${r.casteCategory}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.total}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.paid}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.pending}</td>
        </tr>`;
    }).join('\n');

    const dataRows = rows.filter(r => !r.isDepartmentHeader);

    const html = `
      <html>
        <head>
          <title>${title} - Excel View</title>
        </head>
        <body style="font-family: Arial, Helvetica, sans-serif; padding:20px">
          <h2>${title}</h2>
          <p>Showing ${dataRows.length} student(s)${streamFilter ? ` in ${streamFilter}` : ''}</p>
          <button id="downloadBtn" style="margin-bottom:12px;padding:8px 12px;background:#2563eb;color:#fff;border-radius:6px;border:none;cursor:pointer">Download CSV</button>
          <div style="overflow:auto">
            <table style="border-collapse:collapse;width:100%">
              <thead>
                <tr>
                  <th style="padding:8px;border:1px solid #ddd;background:#f3f4f6;text-align:left">Student Name</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#f3f4f6;text-align:left">Stream</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#f3f4f6;text-align:left">Department</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#f3f4f6;text-align:left">Caste Category</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#f3f4f6;text-align:right">Total Fees</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#f3f4f6;text-align:right">Paid Fees</th>
                  <th style="padding:8px;border:1px solid #ddd;background:#f3f4f6;text-align:right">Pending Fees</th>
                </tr>
              </thead>
              <tbody>
                ${htmlRows}
              </tbody>
            </table>
          </div>
          <script>
            const rows = ${JSON.stringify(dataRows)};
            function downloadCSVFromRows(r) {
              const headers = ["Student Name","Stream","Department","Caste Category","Total Fees","Paid Fees","Pending Fees"];
              const lines = [headers.join(',')];
              r.forEach(x=>{
                const esc = v => {
                  if (v===null||v===undefined) return '';
                  const s = String(v);
                  if (s.includes(',')||s.includes('"')||s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"';
                  return s;
                };
                lines.push([esc(x.name),esc(x.stream),esc(x.department),esc(x.casteCategory),esc(x.total),esc(x.paid),esc(x.pending)].join(','));
              });
              const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');a.href=url;a.download='student-overview-'+${streamFilter ? `'${streamFilter.toLowerCase()}-'` : `''`}+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
            }
            document.getElementById('downloadBtn').addEventListener('click',()=>downloadCSVFromRows(rows));
          </script>
        </body>
      </html>
    `;

    const newWin = window.open('', '_blank');
    if (newWin) {
      newWin.document.write(html);
      newWin.document.close();
    } else {
      // Fallback: directly download csv
      const dataRows = rows.filter(r => !r.isDepartmentHeader);
      downloadCsv(dataRows);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading student details...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-sm">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-800">{toastMessage}</span>
          </div>
        </div>
      )}
      
      {selectedStudent ? (
        // Detailed Student View
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center space-x-2"
            >
              ← Back to List
            </button>
            <h1 className="text-3xl font-bold">🧑 Student Details</h1>
          </div>

          <div className="bg-white rounded shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedStudent.firstName}{" "}
              {selectedStudent.middleName ? `${selectedStudent.middleName} ` : ""}
              {selectedStudent.lastName}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800 font-medium">
              <p>
                <strong>Student ID:</strong> {selectedStudent.studentId}
              </p>
              <p>
                <strong>Enrollment No:</strong> {selectedStudent.enrollmentNumber}
              </p>
              <p>
                <strong>Email:</strong> {selectedStudent.email}
              </p>
              <p>
                <strong>Mobile:</strong> {selectedStudent.mobileNumber || "N/A"}
              </p>
              <p>
                <strong>Father Name:</strong> {selectedStudent.fatherName || "N/A"}
              </p>
              <p>
                <strong>Department:</strong>{" "}
                {selectedStudent.department?.name || selectedStudent.department || "N/A"}
              </p>
              <p>
                <strong>Stream:</strong>{" "}
                {selectedStudent.stream?.name || selectedStudent.stream || "N/A"}
              </p>
              <p>
                <strong>Section:</strong> {selectedStudent.section || "N/A"}
              </p>
              <p>
                <strong>Current Semester:</strong>{" "}
                <span className="bg-blue-100 text-blue-900 px-2 py-1 rounded font-bold">
                  {selectedStudent.currentSemester}
                </span>
              </p>
              <p>
                <strong>Gender:</strong> {selectedStudent.gender || "N/A"}
              </p>
              <p>
                <strong>Caste Category:</strong>{" "}
                {selectedStudent.casteCategory || "N/A"}
              </p>
              <p>
                <strong>Admission Type:</strong>{" "}
                {selectedStudent.admissionType || "N/A"}
              </p>
              <p>
                <strong>Date of Birth:</strong>{" "}
                {selectedStudent.dateOfBirth
                  ? new Date(selectedStudent.dateOfBirth).toLocaleDateString()
                  : "N/A"}
              </p>
              <p>
                <strong>Address:</strong> {selectedStudent.address || "N/A"}
              </p>
              <p>
                <strong>Guardian Number:</strong>{" "}
                {selectedStudent.guardianNumber || "N/A"}
              </p>
              <p>
                <strong>Nationality:</strong> {selectedStudent.nationality || "N/A"}
              </p>
              <p>
                <strong>Academic Status:</strong>{" "}
                {selectedStudent.academicStatus || "Active"}
              </p>
              <p>
                <strong>Enrollment Year:</strong> {selectedStudent.enrollmentYear}
              </p>
            </div>

            {/* Fee Information */}
            {(() => {
              const fee = feeData[selectedStudent._id] || {
                total: 0,
                paid: 0,
                pending: 0,
                heads: [],
              };
              return (
                <>
                  {/* Fee Summary */}
                  <div className="bg-green-50 p-4 rounded-lg mt-6">
                    <p className="font-bold text-green-900 mb-2 text-lg">
                      Fee Summary:
                    </p>
                    <p className="font-bold">
                      <strong>Total Fees:</strong> ₹{fee.total}
                    </p>
                    <p className="font-bold">
                      <strong>Fees Paid:</strong>{" "}
                      <span className="text-green-700 font-bold">
                        ₹{fee.paid}
                      </span>
                    </p>
                    <p className="font-bold">
                      <strong>Pending Fees:</strong>{" "}
                      <span
                        className={`font-bold ${
                          fee.pending > 0 ? "text-red-700" : "text-green-800"
                        }`}
                      >
                        ₹{fee.pending}
                      </span>
                    </p>
                  </div>

                  {/* Applied Fee Heads */}
                  {fee.heads.length > 0 && (
                    <div className="mt-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="mb-3 p-3 bg-white rounded border border-blue-200">
                          <p className="text-sm text-gray-700">
                            <strong>Department:</strong> {selectedStudent.department?.name || selectedStudent.department || "N/A"} | 
                            <strong> Stream:</strong> {selectedStudent.stream?.name || selectedStudent.stream || "N/A"} | 
                            <strong> Year:</strong> {
                              (() => {
                                const currentSemester = selectedStudent.currentSemester || 1;
                                if (currentSemester >= 7) return '4th Year';
                                else if (currentSemester >= 5) return '3rd Year';
                                else if (currentSemester >= 3) return '2nd Year';
                                else return '1st Year';
                              })()
                            }
                          </p>
                        </div>
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center text-lg">
                          💰 Department Fee Heads
                          <span className="ml-2 bg-blue-200 text-blue-900 px-3 py-1 rounded-full text-sm font-bold">
                            {fee.heads.length} items
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {fee.heads.map((h, i) => (
                            <div
                              key={i}
                              className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-base">
                                    {h.head}
                                  </h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Department: {h.branch} | Year: {
                                      (() => {
                                        const currentSemester = selectedStudent.currentSemester || 1;
                                        if (currentSemester >= 7) return '4th Year';
                                        else if (currentSemester >= 5) return '3rd Year';
                                        else if (currentSemester >= 3) return '2nd Year';
                                        else return '1st Year';
                                      })()
                                    }
                                  </p>
                                </div>
                                <div className="text-right ml-3">
                                  <div className="font-bold text-xl text-green-700">
                                    ₹{Number(h.amount).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Fee Heads Summary */}
                        <div className="mt-4 pt-3 border-t border-blue-200">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-sm text-gray-700 font-bold">
                                Total Amount
                              </div>
                              <div className="font-bold text-xl text-blue-700">
                                ₹{fee.total}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-700 font-bold">
                                Amount Paid
                              </div>
                              <div className="font-bold text-xl text-green-700">
                                ₹{fee.paid}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-700 font-bold">
                                Balance Due
                              </div>
                              <div
                                className={`font-bold text-xl ${
                                  fee.pending > 0
                                    ? "text-red-700"
                                    : "text-green-700"
                                }`}
                              >
                                ₹{fee.pending}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Insurance Policies */}
            {(() => {
              const insurancePolicies = insuranceData[selectedStudent._id] || [];
              const insuranceStats = calculateInsuranceStats(insurancePolicies);

              return insuranceStats && (
                <div className="mt-6 space-y-2">
                  <h3 className="text-base font-semibold text-purple-800">
                    🛡️ Insurance Policies
                  </h3>

                  {/* Insurance Summary Card */}
                  <div className="grid grid-cols-4 gap-2 bg-purple-50 p-2 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-purple-600">
                        Total Policies
                      </p>
                      <p className="text-lg font-bold text-purple-800">
                        {insuranceStats.totalPolicies}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-purple-600">
                        Active Policies
                      </p>
                      <p className="text-lg font-bold text-purple-800">
                        {insuranceStats.activePolicies}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-purple-600">
                        Total Coverage
                      </p>
                      <p className="text-lg font-bold text-purple-800">
                        ₹{insuranceStats.totalCoverage.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-purple-600">Total Premium</p>
                      <p className="text-lg font-bold text-purple-800">
                        ₹{insuranceStats.totalPremium.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Insurance Policies Table */}
                  <div className="bg-white border border-purple-100 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-purple-50">
                        <tr>
                          <th className="p-3 text-left font-medium text-purple-800">
                            Policy Number
                          </th>
                          <th className="p-3 text-left font-medium text-purple-800">
                            Provider
                          </th>
                          <th className="p-3 text-left font-medium text-purple-800">
                            Type
                          </th>
                          <th className="p-3 text-right font-medium text-purple-800">
                            Coverage (₹)
                          </th>
                          <th className="p-3 text-right font-medium text-purple-800">
                            Premium (₹)
                          </th>
                          <th className="p-3 text-left font-medium text-purple-800">
                            Status
                          </th>
                          <th className="p-3 text-left font-medium text-purple-800">
                            Payment
                          </th>
                          <th className="p-3 text-left font-medium text-purple-800">
                            Valid Till
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100">
                        {insurancePolicies.map((policy, i) => (
                          <tr key={i} className="hover:bg-purple-50">
                            <td className="p-3 font-mono text-sm">
                              {policy.policyNumber}
                            </td>
                            <td className="p-3">
                              {policy.insuranceProvider}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                {policy.policyType}
                              </span>
                            </td>
                            <td className="p-3 text-right font-medium">
                              {policy.coverageAmount?.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {policy.premiumAmount?.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInsuranceStatusColor(
                                  policy.status
                                )}`}
                              >
                                {policy.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(
                                  policy.paymentStatus
                                )}`}
                              >
                                {policy.paymentStatus}
                              </span>
                            </td>
                            <td className="p-3 text-sm">
                              {new Date(policy.endDate).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        // Student List View
        <>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">🧑 Student Detail Records</h1>
              </div>
              <div className="flex items-center space-x-2 relative">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Export button clicked, current state:', showExportDropdown);
                    setShowExportDropdown(!showExportDropdown);
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center space-x-1"
                  title="Export student overview"
                >
                  <span>Export Overview</span>
                  <span className={`transform transition-transform ${showExportDropdown ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {showExportDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-[200px]">
                    <div
                      onMouseDown={() => handleExportClick('btech')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b border-gray-200 text-sm cursor-pointer select-none"
                    >
                      📥 B.Tech Students CSV (Instant)
                    </div>
                    <div
                      onMouseDown={() => handleExportClick('mba')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b border-gray-200 text-sm cursor-pointer select-none"
                    >
                      📥 MBA Students CSV (Instant)
                    </div>
                    <div
                      onMouseDown={() => handleExportClick('current')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm cursor-pointer select-none"
                    >
                      📥 Current Page CSV (Instant)
                    </div>
                  </div>
                )}
              </div>
            </div>            {/* Search Section */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Students
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, caste, stream, or department..."
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Search Results Count */}
            <div className="mt-2 text-sm text-gray-600">
              Found {totalStudents} student{totalStudents !== 1 ? "s" : ""} • Showing {startIndex + 1}-{endIndex} of {totalStudents}
            </div>

            {/* Stream-wise Student Count */}
            {allStudents.length > 0 && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold mb-2">
                  Stream-wise Student Count (Total)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(
                    allStudents.reduce((acc, student) => {
                      const stream =
                        student.stream?.name || student.stream || "Unknown";
                      if (!acc[stream]) acc[stream] = 0;
                      acc[stream] += 1;
                      return acc;
                    }, {})
                  ).map(([stream, count]) => (
                    <div key={stream} className="bg-blue-50 rounded p-3">
                      <div className="font-bold text-blue-700">{stream}</div>
                      <div className="text-sm text-gray-700">
                        Students: {count} • Page: {students.filter(s => (s.stream?.name || s.stream || "Unknown") === stream).length}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Student Cards in Grid - Show 10 per page */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.length === 0 ? (
              <div className="bg-white rounded shadow p-6 text-center col-span-full">
                <p className="text-gray-500">
                  {searchTerm
                    ? "No students match your search."
                    : "No students found."}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-gray-400 mt-2">
                    Try running:{" "}
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      cd backend && node seed-data.js
                    </code>
                  </p>
                )}
              </div>
            ) : (
              students.map((student) => (
                <div
                  key={student._id}
                  className="bg-white rounded shadow p-4 space-y-3 border-l-4 border-blue-400 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleStudentClick(student)}
                >
                  <h2 className="text-xl font-bold text-gray-900">
                    {student.firstName}{" "}
                    {student.middleName ? `${student.middleName} ` : ""}
                    {student.lastName}
                  </h2>

                  <div className="space-y-2 text-sm text-gray-800">
                    <p>
                      <strong>Student ID:</strong> {student.studentId}
                    </p>
                    <p>
                      <strong>Enrollment No:</strong> {student.enrollmentNumber}
                    </p>
                    <p>
                      <strong>Email:</strong> {student.email}
                    </p>
                    <p>
                      <strong>Department:</strong>{" "}
                      {student.department?.name || student.department || "N/A"}
                    </p>
                    <p>
                      <strong>Gender:</strong> {student.gender || "N/A"}
                    </p>
                    <p>
                      <strong>Caste Category:</strong>{" "}
                      {student.casteCategory || "N/A"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalStudents > studentsPerPage && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded font-medium ${
                  currentPage === 1
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                Previous
              </button>

              <span className="text-gray-700 font-medium">
                Page {currentPage} of {totalPages} ({totalStudents} total students)
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded font-medium ${
                  currentPage === totalPages
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
