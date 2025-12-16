import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AddPayment() {
  const [formData, setFormData] = useState({
    studentId: "",
    amount: "",
    paymentMethod: "Bank Transfer",
    description: "",
    transactionId: "",
    utr: "",
    collectedBy: "",
    remarks: "",
    feeHead: "",
    academicYear: "2025-26",
    paymentType: "specific", // 'specific', 'multiple', 'annual', 'transport', 'hostel', 'library', 'lab', 'sports', 'development', 'salary', 'miscellaneous'
    selectedFeeHeads: [], // Array of selected fee head IDs for multiple payments
    // Manual fee entry fields
    manualFeeHeadName: "",
    manualFeeAmount: "",
    manualFeeDescription: "",
    manualFeeCategory: "",
    // Transport fee fields
    transportRoute: "",
    transportDuration: "",
    // Hostel fee fields
    hostelBlock: "",
    roomNumber: "",
    hostelFeeType: "",
    // Library fee fields
    libraryFeeType: "",
    libraryDetails: "",
    // Lab fee fields
    labType: "",
    labDuration: "",
    // Sports fee fields
    sportsActivity: "",
    sportsFeeType: "",
    // Miscellaneous fee fields
    miscellaneousPurpose: "",
    // Salary payment fields
    employeeName: "",
    employeeId: "",
    salaryType: "monthly", // 'monthly' or 'annual'
    salaryMonth: "",
    salaryYear: new Date().getFullYear().toString(),
    // TFWS field
    tfws: false,
    // Fee Name and Categories
    feeName: "",
    customFeeName: "",
    selectedFeeCategories: [], // Array of selected fee categories with amounts
  });

  const [students, setStudents] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentSearchTimeout, setStudentSearchTimeout] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    firstName: "",
    lastName: "",
    className: "",
    branch: "",
    year: "",
    semester: "1",
  });

  // Fee categories data
  const feeCategories = {
    admission: [
      { id: 'tuition_fees', name: 'Tuition fees', amount: 0 },
      { id: 'caution_money', name: 'Caution money', amount: 0 },
      { id: 'development_fund', name: 'Development fund', amount: 0 },
      { id: 'admission_form', name: 'Admission form', amount: 0 },
      { id: 'hostel_bus_fees', name: 'Hostel fees/Bus fees', amount: 0 },
      { id: 'misc_other_fees', name: 'Misc. fees/other fees', amount: 0 },
      { id: 'university_student_fees', name: 'University student fees', amount: 0 }
    ],
    exam: [
      { id: 'exam_fee', name: 'Exam Fee', amount: 0 },
      { id: 'practical_fee', name: 'Practical Fee', amount: 0 },
      { id: 'late_fee', name: 'Late Fee', amount: 0 },
      { id: 'revaluation_fee', name: 'Revaluation Fee', amount: 0 },
      { id: 'certificate_fee', name: 'Certificate Fee', amount: 0 },
      { id: 'misc_exam_fee', name: 'Miscellaneous Exam Fee', amount: 0 }
    ]
  };

  // Add new student to backend
  const handleAddStudent = async () => {
    if (!newStudentData.firstName || !newStudentData.lastName) {
      setError("First name and last name are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Prepare student data for backend
      const studentData = {
        firstName: newStudentData.firstName,
        middleName: "", // Required field, set to empty
        lastName: newStudentData.lastName,
        program: newStudentData.className || "B.Tech", // Default if not provided
        department: newStudentData.branch || "Computer Science", // Default if not provided
        currentSemester: parseInt(newStudentData.semester) || 1,
        enrollmentYear: newStudentData.year || new Date().getFullYear().toString(),
        academicStatus: "Active"
      };

      const response = await axios.post(
        "https://backenderp.tarstech.in/api/students",
        studentData,
        { headers }
      );

      if (response.data.success && response.data.data) {
        const newStudent = response.data.data;
        
        // Add to local students list
        setStudents(prev => [newStudent, ...prev]);
        setSelectedStudent(newStudent);
        setFormData(prev => ({ ...prev, studentId: newStudent._id }));
        
        // Close modal and reset form
        setShowAddStudentModal(false);
        setNewStudentData({ 
          firstName: '', 
          lastName: '', 
          mobileNumber: '',
          className: '', 
          branch: '', 
          year: '', 
          semester: '1'
        });
        
        setSuccess("Student added successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error("Failed to add student");
      }
    } catch (err) {
      console.error("Error adding student:", err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        "Failed to add student. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Load initial students when dropdown opens (all students already loaded, just open dropdown)
  const handleDropdownOpen = () => {
    setIsDropdownOpen(true);
  };

  useEffect(() => {
    fetchFeeHeads();
    fetchRecentPayments();
    // Load all students upfront for instant filtering
    fetchStudents("", 1, 2000); // Load up to 2000 students to get all 1061
  }, []);

  // Update selectedStudent when studentId changes
  useEffect(() => {
    if (formData.studentId && students.length > 0) {
      const student = students.find((s) => s._id === formData.studentId);
      setSelectedStudent(student || null);
    } else {
      setSelectedStudent(null);
    }
  }, [formData.studentId, students]);

  // Helper function to get student gender
  const getStudentGender = (student) => {
    if (!student) return null;
    return student.gender || student.sex || null;
  };

  // Handle fee category selection
  const handleFeeCategoryChange = (categoryId, isChecked) => {
    setFormData(prev => {
      let selectedCategories = [...prev.selectedFeeCategories];
      
      if (isChecked) {
        // Add category if checked
        const categoryData = feeCategories[prev.feeName]?.find(cat => cat.id === categoryId);
        if (categoryData) {
          selectedCategories.push({
            ...categoryData,
            amount: categoryData.amount || 0
          });
        }
      } else {
        // Remove category if unchecked
        selectedCategories = selectedCategories.filter(cat => cat.id !== categoryId);
      }
      
      // Calculate total amount
      const totalAmount = selectedCategories.reduce((sum, cat) => sum + (parseFloat(cat.amount) || 0), 0);
      
      return {
        ...prev,
        selectedFeeCategories: selectedCategories,
        amount: totalAmount.toString()
      };
    });
  };

  // Handle fee category amount change
  const handleFeeCategoryAmountChange = (categoryId, amount) => {
    setFormData(prev => {
      const selectedCategories = prev.selectedFeeCategories.map(cat => 
        cat.id === categoryId ? { ...cat, amount: parseFloat(amount) || 0 } : cat
      );
      
      // Calculate total amount
      const totalAmount = selectedCategories.reduce((sum, cat) => sum + (parseFloat(cat.amount) || 0), 0);
      
      return {
        ...prev,
        selectedFeeCategories: selectedCategories,
        amount: totalAmount.toString()
      };
    });
  };

  // Handle student selection from dropdown
  const handleStudentSelect = (student) => {
    setFormData((prev) => ({
      ...prev,
      studentId: student._id,
    }));
    setIsDropdownOpen(false);
    setStudentSearchTerm("");
  };

  // Generate academic years for selection
  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];

    // Generate 5 years: current-2 to current+2
    for (let i = -2; i <= 2; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      const yearCode = `${startYear.toString().slice(-2)}-${endYear
        .toString()
        .slice(-2)}`;
      years.push({
        value: yearCode,
        label: `${startYear}-${endYear}`,
        isCurrent: i === 0,
      });
    }

    return years;
  };

  const academicYears = generateAcademicYears();

  const fetchStudents = async (searchTerm = "", page = 1, limit = 1061) => {
    setLoadingStudents(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchTerm && searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      // Fetch students with search and pagination
      const response = await axios.get(
        `https://backenderp.tarstech.in/api/students?${params.toString()}`,
        { headers }
      );

      // Handle different response formats
      let studentData = [];
      let totalCount = 0;

      if (Array.isArray(response.data)) {
        studentData = response.data;
        totalCount = response.data.length;
      } else if (response.data && Array.isArray(response.data.data)) {
        studentData = response.data.data;
        totalCount = response.data.total || response.data.data.length;
      } else if (response.data && Array.isArray(response.data.students)) {
        studentData = response.data.students;
        totalCount = response.data.total || response.data.students.length;
      }

      console.log(
        `Fetched ${studentData.length} students (page ${page}, search: "${searchTerm}")`
      );

      // Sort students by name in ascending order
      const sortedStudents = studentData.sort((a, b) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`
          .toLowerCase()
          .trim();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`
          .toLowerCase()
          .trim();
        return nameA.localeCompare(nameB);
      });

      // If this is the first page and no search term, store all students
      // If there's a search term, replace the current list
      if (page === 1) {
        setStudents(sortedStudents);
      } else {
        // For pagination, append to existing list
        setStudents((prev) => [...prev, ...sortedStudents]);
      }

      // Store total count for pagination
      setStudents((prev) =>
        prev.map((student) => ({ ...student, totalCount }))
      );

      setLoadingStudents(false);
      console.log("Students loaded successfully:", sortedStudents.length);
    } catch (err) {
      console.error("Error fetching students:", err);
      setStudents([]);
      setLoadingStudents(false);

      // Provide more detailed error messages
      let errorMessage = "Failed to load students. ";

      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 500) {
          errorMessage +=
            "The server encountered an error. Please contact the system administrator or try again later.";
        } else if (err.response.status === 404) {
          errorMessage += "Student data endpoint not found. Please check the backend configuration.";
        } else if (err.response.status === 401 || err.response.status === 403) {
          errorMessage += "You do not have permission to access student data. Please log in again.";
        } else {
          errorMessage += `Server error (${err.response.status}): ${err.response.data?.message || err.message}`;
        }
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage += "Cannot connect to the server. Please check your internet connection and ensure the backend server is running.";
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage += `Error: ${err.message}`;
      }

      setError(errorMessage);

      // Optional: Show a user-friendly toast/notification instead of just console error
      // You can add a toast library if needed
    }
  };

  const fetchFeeHeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        "https://backenderp.tarstech.in/api/fee-heads",
        {
          headers,
        }
      );
      const feeHeadsData = Array.isArray(response.data) ? response.data : [];
      console.log("Fetched fee heads:", feeHeadsData);
      // Remove duplicates based on title and sort in ascending order
      const uniqueFeeHeads = feeHeadsData.filter(
        (head, index, self) =>
          index ===
          self.findIndex(
            (h) => h.head?.toLowerCase() === head.head?.toLowerCase()
          )
      );
      const sortedFeeHeads = uniqueFeeHeads.sort((a, b) =>
        a.head.toLowerCase().localeCompare(b.head.toLowerCase())
      );
      setFeeHeads(sortedFeeHeads);
    } catch (err) {
      console.error("Error fetching fee heads:", err);
      // Set empty array instead of using mock data
      setFeeHeads([]);
      setError(
        "Failed to load fee heads. Please ensure fee heads are properly configured."
      );
    }
  };

  const fetchRecentPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        "https://backenderp.tarstech.in/api/payments?limit=50",
        { headers }
      );
      setRecentPayments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching recent payments:", err);
      // Set empty array instead of using mock data
      setRecentPayments([]);
    }
  };

  const checkForDuplicatePayment = () => {
    const currentTime = new Date();
    const fiveMinutesAgo = new Date(currentTime.getTime() - 5 * 60 * 1000);

    const possibleDuplicate = recentPayments.find((payment) => {
      const paymentTime = new Date(payment.date || payment.createdAt);
      return (
        payment.studentId === formData.studentId &&
        payment.amount === parseFloat(formData.amount) &&
        payment.paymentMethod === formData.paymentMethod &&
        paymentTime >= fiveMinutesAgo
      );
    });

    return possibleDuplicate;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Clear selected fee heads when changing payment type
      ...(name === "paymentType" && { selectedFeeHeads: [] }),
      // Clear selected fee categories when changing fee name
      ...(name === "feeName" && { selectedFeeCategories: [], amount: "" }),
    }));

    // Fetch pending fees when student is selected
    if (name === "studentId" && value) {
      // fetchPendingFees(value); // Removed fee calculation logic
    } else if (name === "studentId" && !value) {
      // setPendingFees([]); // Removed fee calculation logic
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Only validate student ID for non-salary payments
      if (formData.paymentType !== "salary" && !formData.studentId) {
        setError("Please select a student");
        setLoading(false);
        return;
      }

      // Check for duplicate payment
      const duplicatePayment = checkForDuplicatePayment();
      if (duplicatePayment) {
        setError(
          "⚠️ Duplicate Payment Detected! A similar payment for this student with same amount and method was made within last 5 minutes. Please verify before proceeding."
        );
        setLoading(false);
        return;
      }

      const paymentData = {
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        description:
          formData.description ||
          `${
            formData.paymentType === "salary"
              ? "Salary"
              : formData.paymentType === "multiple"
              ? "Multiple Fee"
              : formData.paymentType === "annual"
              ? "Annual Fee"
              : formData.paymentType === "transport"
              ? "Transport Fee"
              : formData.paymentType === "hostel"
              ? "Hostel Fee"
              : formData.paymentType === "library"
              ? "Library Fee"
              : formData.paymentType === "lab"
              ? "Lab Fee"
              : formData.paymentType === "sports"
              ? "Sports Fee"
              : formData.paymentType === "development"
              ? "Development Fee"
              : formData.paymentType === "miscellaneous"
              ? "Miscellaneous Fee"
              : "Fee"
          } Payment`,
        transactionId: formData.transactionId || "",
        collectedBy: formData.collectedBy || "",
        remarks: formData.remarks || "",
        type: formData.paymentType === "salary" ? "salary" : "student",
        paymentType: formData.paymentType,
        academicYear: formData.academicYear,
      };

      // Add UTR for digital payment methods
      if (
        ["Online", "Bank Transfer", "Card", "UPI"].includes(formData.paymentMethod)
      ) {
        console.log("🔍 UTR Debug - Payment Method:", formData.paymentMethod);
        console.log("🔍 UTR Debug - formData.utr value:", formData.utr);
        console.log("🔍 UTR Debug - formData.utr type:", typeof formData.utr);

        if (!formData.utr || formData.utr.trim() === "") {
          setError(
            "UTR number is required for digital payment methods (Online, Bank Transfer, Card, UPI)"
          );
          setLoading(false);
          return;
        }
        paymentData.utr = formData.utr.trim();
        console.log("🔍 UTR Debug - paymentData.utr (to be sent):", paymentData.utr);
      }

      // Add type-specific data
      if (formData.paymentType === "salary") {
        paymentData.employeeName = formData.employeeName;
        paymentData.employeeId = formData.employeeId;
        paymentData.salaryType = formData.salaryType;
        paymentData.salaryYear = formData.salaryYear;
        if (formData.salaryType === "monthly" && formData.salaryMonth) {
          paymentData.salaryMonth = formData.salaryMonth;
        }
      } else {
        paymentData.studentId = formData.studentId;
        if (formData.feeHead) {
          paymentData.feeHead = formData.feeHead;
        }
        // Add multiple fee heads for multiple payment type
        if (
          formData.paymentType === "multiple" &&
          formData.selectedFeeHeads.length > 0
        ) {
          paymentData.multipleFeeHeads = formData.selectedFeeHeads;
        }
      }

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      console.log("📤 Sending payment data to API:", JSON.stringify(paymentData, null, 2));

      const response = await axios.post(
        "https://backenderp.tarstech.in/api/payments",
        paymentData,
        { headers }
      );

      console.log("📥 API Response:", response.data);

      if (response.data) {
        let paymentTypeText = "";
        let successMessage = "";

        if (formData.paymentType === "salary") {
          paymentTypeText = `${formData.salaryType} salary for ${
            formData.salaryType === "monthly"
              ? `${getMonthName(formData.salaryMonth)} ${formData.salaryYear}`
              : formData.salaryYear
          }`;
          successMessage = `Salary payment of ₹${formData.amount} for ${formData.employeeName} (${paymentTypeText}) recorded successfully! Receipt: ${response.data.payment.receiptNumber}`;
        } else {
          if (formData.paymentType === "multiple") {
            paymentTypeText = `(${formData.selectedFeeHeads.length} fee heads)`;
          } else {
            const paymentTypeMap = {
              annual: "(Annual Payment)",
              transport: "(Transport Fees)",
              hostel: "(Hostel Fees)",
              library: "(Library Fees)",
              lab: "(Lab Fees)",
              sports: "(Sports Fees)",
              development: "(Development Fees)",
              miscellaneous: "(Miscellaneous Fees)",
              specific: "",
            };
            paymentTypeText = paymentTypeMap[formData.paymentType] || "";
          }
          successMessage = `Student fee payment of ₹${formData.amount} ${paymentTypeText} recorded successfully! Receipt: ${response.data.payment.receiptNumber}`;
        }

        // Store receipt data
        let receipt = {
          receiptNumber: response.data.payment.receiptNumber,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          amount: formData.amount,
          paymentMethod: formData.paymentMethod,
          description:
            formData.description ||
            `${formData.feeName === "admission" ? "Admission" : formData.feeName === "exam" ? "Exam" : "Fee"} Payment`,
          transactionId: formData.transactionId,
          collectedBy: formData.collectedBy,
          remarks: formData.remarks,
          paymentType: formData.paymentType,
          academicYear: formData.academicYear,
          feeName: formData.feeName,
          selectedFeeCategories: formData.selectedFeeCategories,
        };

        // Add UTR for digital payment methods
        if (["Online", "Bank Transfer", "Card", "UPI"].includes(formData.paymentMethod)) {
          receipt.utr = formData.utr;
        }

        if (formData.paymentType === "salary") {
          receipt.employeeName = formData.employeeName;
          receipt.employeeId = formData.employeeId;
          receipt.salaryType = formData.salaryType;
          receipt.salaryYear = formData.salaryYear;
          if (formData.salaryType === "monthly") {
            receipt.salaryMonth = formData.salaryMonth;
            receipt.salaryMonthName = getMonthName(formData.salaryMonth);
          }
        } else {
          const selectedStudent = students.find(
            (s) => s._id === formData.studentId
          );
          const selectedFeeHead = feeHeads.find(
            (f) => f._id === formData.feeHead
          );
          receipt.student = selectedStudent;
          receipt.feeHead = selectedFeeHead;

          // Set appropriate fee head name based on payment type
          if (!selectedFeeHead) {
            // Create a descriptive fee head based on payment type
            const paymentTypeDescriptions = {
              multiple: "Multiple Fee Heads Payment",
              annual: `Annual Fees (${formData.academicYear})`,
              transport: formData.transportRoute
                ? `Transport Fees - ${formData.transportRoute} (${
                    formData.transportDuration || "Route"
                  })`
                : "Transport Fees",
              hostel: formData.hostelBlock
                ? `Hostel Fees - Block ${formData.hostelBlock}${
                    formData.roomNumber ? ", Room " + formData.roomNumber : ""
                  }${
                    formData.hostelFeeType
                      ? " (" + formData.hostelFeeType + ")"
                      : ""
                  }`
                : "Hostel Fees",
              library: formData.libraryFeeType
                ? `Library Fees - ${formData.libraryFeeType}${
                    formData.libraryDetails
                      ? " (" + formData.libraryDetails + ")"
                      : ""
                  }`
                : "Library Fees",
              lab: formData.labType
                ? `Laboratory Fees - ${formData.labType} Lab${
                    formData.labDuration
                      ? " (" + formData.labDuration + ")"
                      : ""
                  }`
                : "Laboratory Fees",
              sports: formData.sportsActivity
                ? `Sports Fees - ${formData.sportsActivity}${
                    formData.sportsFeeType
                      ? " (" + formData.sportsFeeType + ")"
                      : ""
                  }`
                : "Sports Fees",
              development: "Development Fees - Infrastructure Development",
              miscellaneous:
                formData.miscellaneousPurpose || "Miscellaneous Fees",
            };

            receipt.feeHead = {
              title:
                paymentTypeDescriptions[formData.paymentType] ||
                "General Fee Payment",
              amount: parseInt(formData.amount),
            };
          }

          // Add detailed fee type information to receipt
          receipt.feeTypeDetails = {};
          if (formData.paymentType === "specific") {
            // For manual fee entry
            receipt.feeTypeDetails = {
              manualFeeHeadName: formData.manualFeeHeadName,
              manualFeeAmount: formData.manualFeeAmount,
              manualFeeDescription: formData.manualFeeDescription,
              manualFeeCategory: formData.manualFeeCategory,
              category: formData.manualFeeCategory || "Specific Fee Payment",
            };
          } else if (formData.paymentType === "transport") {
            receipt.feeTypeDetails = {
              route: formData.transportRoute,
              duration: formData.transportDuration,
              category: "Transport Services",
            };
          } else if (formData.paymentType === "hostel") {
            receipt.feeTypeDetails = {
              block: formData.hostelBlock,
              roomNumber: formData.roomNumber,
              feeType: formData.hostelFeeType,
              category: "Hostel Services",
            };
          } else if (formData.paymentType === "library") {
            receipt.feeTypeDetails = {
              feeType: formData.libraryFeeType,
              details: formData.libraryDetails,
              category: "Library Services",
            };
          } else if (formData.paymentType === "lab") {
            receipt.feeTypeDetails = {
              labType: formData.labType,
              duration: formData.labDuration,
              category: "Laboratory Services",
            };
          } else if (formData.paymentType === "sports") {
            receipt.feeTypeDetails = {
              activity: formData.sportsActivity,
              feeType: formData.sportsFeeType,
              category: "Sports Services",
            };
          } else if (formData.paymentType === "development") {
            receipt.feeTypeDetails = {
              category: "Infrastructure Development",
              purpose: "Building and facility development",
            };
          } else if (formData.paymentType === "miscellaneous") {
            receipt.feeTypeDetails = {
              purpose: formData.miscellaneousPurpose,
              category: "Miscellaneous Services",
            };
          }

          // Add fee breakdown for better receipt display
          if (
            formData.paymentType === "multiple" &&
            formData.selectedFeeHeads.length > 0
          ) {
            // For multiple fee payment, add the selected fee heads data
            const selectedFeesData = formData.selectedFeeHeads
              .map((feeHeadId) => {
                // Removed pending fees logic - using fee heads directly
                const feeHead = feeHeads.find((head) => head._id === feeHeadId);
                if (feeHead) {
                  return {
                    feeHead: feeHead.name,
                    feeHeadId: feeHead._id,
                    totalAmount: 0, // Will be set by user input
                    paidAmount: 0,
                    currentPayment: 0, // Will be set by user input
                    balance: 0,
                  };
                }
                return null;
              })
              .filter(Boolean);
            receipt.multipleFees = selectedFeesData;
          } else if (
            formData.paymentType === "specific" &&
            false // Disabled pending fees logic
          ) {
            // Removed pending fees allocation logic
            // For specific payment, use the entered amount directly
          }
        }

        // Ensure fee head information is always available for receipt display
        if (!receipt.multipleFees && !receipt.feeHead) {
          receipt.feeHead = {
            title: `${receipt.paymentType.charAt(0).toUpperCase() + receipt.paymentType.slice(1)} Fee Payment`,
            amount: parseInt(formData.amount),
          };
        }

        setReceiptData(receipt);
        setShowReceipt(true);
        setSuccess(
          `Student fee payment of ₹${formData.amount} ${paymentTypeText} recorded successfully! Receipt: ${response.data.payment.receiptNumber}`
        );

        // Refresh data
        fetchRecentPayments();
        // if (formData.studentId) {
        //   fetchPendingFees(formData.studentId); // Removed fee calculation logic
        // }

        // Reset form
        setFormData({
          studentId: "",
          amount: "",
          paymentMethod: "Bank Transfer",
          description: "",
          transactionId: "",
          collectedBy: "",
          remarks: "",
          feeHead: "",
          semester: "",
          academicYear: "2025-26",
          paymentType: "specific",
          selectedFeeHeads: [],
          // Manual fee entry fields
          manualFeeHeadName: "",
          manualFeeAmount: "",
          manualFeeDescription: "",
          manualFeeCategory: "",
          // Transport fee fields
          transportRoute: "",
          transportDuration: "",
          // Hostel fee fields
          hostelBlock: "",
          roomNumber: "",
          hostelFeeType: "",
          // Library fee fields
          libraryFeeType: "",
          libraryDetails: "",
          // Lab fee fields
          labType: "",
          labDuration: "",
          // Sports fee fields
          sportsActivity: "",
          sportsFeeType: "",
          // Miscellaneous fee fields
          miscellaneousPurpose: "",
          // Salary payment fields
          employeeName: "",
          employeeId: "",
          salaryType: "monthly",
          salaryMonth: "",
          salaryYear: new Date().getFullYear().toString(),
        });
        // setPendingFees([]); // Removed fee calculation logic
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      studentId: "",
      amount: "",
      paymentMethod: "Bank Transfer", // Always set a default payment method
      description: "",
      transactionId: "",
      utr: "",
      collectedBy: "",
      remarks: "",
      feeHead: "",
      semester: "",
      academicYear: "2025-26",
      paymentType: "specific",
      selectedFeeHeads: [],
      // Manual fee entry fields
      manualFeeHeadName: "",
      manualFeeAmount: "",
      manualFeeDescription: "",
      manualFeeCategory: "",
      // Transport fee fields
      transportRoute: "",
      transportDuration: "",
      // Hostel fee fields
      hostelBlock: "",
      roomNumber: "",
      hostelFeeType: "",
      // Library fee fields
      libraryFeeType: "",
      libraryDetails: "",
      // Lab fee fields
      labType: "",
      labDuration: "",
      // Sports fee fields
      sportsActivity: "",
      sportsFeeType: "",
      // Miscellaneous fee fields
      miscellaneousPurpose: "",
      // Salary payment fields
      employeeName: "",
      employeeId: "",
      salaryType: "monthly",
      salaryMonth: "",
      salaryYear: new Date().getFullYear().toString(),
      // TFWS field
      tfws: false,
      // Fee Name and Categories
      feeName: "",
      customFeeName: "",
      selectedFeeCategories: [],
    });
    setError("");
    setSuccess("");
    // setPendingFees([]); // Removed fee calculation logic
    setSelectedStudent(null);
  };

  const filteredStudents = students.filter((student) => {
    if (!studentSearchTerm) return true;
    const searchLower = studentSearchTerm.toLowerCase();
    return (
      student.firstName?.toLowerCase().includes(searchLower) ||
      student.lastName?.toLowerCase().includes(searchLower) ||
      student.studentId?.toLowerCase().includes(searchLower) ||
      (typeof student.department === "object"
        ? student.department?.name?.toLowerCase().includes(searchLower)
        : student.department?.toLowerCase().includes(searchLower))
    );
  });

  // Receipt Modal Component
  const ReceiptModal = () => {
    if (!showReceipt || !receiptData) return null;

    const printReceipt = () => {
      // Function to generate single receipt with label
      const generateReceipt = (label) => `
            <div class="receipt-container">
              <div class="receipt-header-box">
                <div class="duplicate-label">${label}</div>
                <div class="institute-header-simple">
                  <div class="logo-left">
                    <img src="/logo1.png" alt="Logo" />
                  </div>
                  <div class="header-text">
                    <div class="society-name-simple">Maitrey Educational Society's</div>
                    <div class="institute-name-simple">NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY & MANAGEMENT</div>
                    <div class="institute-address-simple">Village Satnavri, Amravati Road, Nagpur - 440023</div>
                  </div>
                  <div class="logo-right">
                    <img src="/logo.png" alt="Logo" />
                  </div>
                </div>
              </div>

              <div class="receipt-info-header">
                <div class="receipt-info-left">
                  <div class="info-item"><span class="label">Rec. No.:</span> <span class="value">${receiptData.receiptNumber}</span></div>
                  <div class="info-item"><span class="label">Class:</span> <span class="value">${receiptData.student?.program || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Category:</span> <span class="value">${receiptData.student?.caste || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Name:</span> <span class="value">${receiptData.student?.firstName} ${receiptData.student?.lastName}</span></div>
                </div>
                <div class="receipt-info-center">
                </div>
                <div class="receipt-info-right">
                  <div class="info-item"><span class="label">Date:</span> <span class="value">${receiptData.date}</span></div>
                  <div class="info-item"><span class="label">Adm. No.:</span> <span class="value">${receiptData.student?.admissionNumber || receiptData.student?.studentId}</span></div>
                  <div class="info-item"><span class="label">Student Id.:</span> <span class="value">${receiptData.student?.studentId}</span></div>
                  <div class="info-item"><span class="label">Fee Type:</span> <span class="value">${receiptData.paymentType.toUpperCase()}</span></div>
                </div>
              </div>
              
              <div class="received-section">
                <div class="received-label">Received the following:</div>
                <div class="amount-label">(₹)Amount</div>
              </div>
              
              <div class="fee-details-table">
                <table>
                  <tbody>
                    ${
                      receiptData.selectedFeeCategories && receiptData.selectedFeeCategories.length > 0
                        ? receiptData.selectedFeeCategories
                            .map(
                              (category, index) => `
                        <tr>
                          <td class="fee-name">${category.name}</td>
                          <td class="fee-amount">${parseFloat(category.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      `
                            )
                            .join("")
                        : receiptData.multipleFees && receiptData.multipleFees.length > 0
                        ? receiptData.multipleFees
                            .map(
                              (fee, index) => `
                        <tr>
                          <td class="fee-name">${fee.feeHead}</td>
                          <td class="fee-amount">${fee.currentPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      `
                            )
                            .join("")
                        : `
                        <tr>
                          <td class="fee-name">${receiptData.feeHead?.title || receiptData.description || 'Fee Payment'}</td>
                          <td class="fee-amount">${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      `
                    }
                  </tbody>
                </table>
              </div>
              
              <div class="logo-section">
                <img src="/logo.png" alt="NIETM Logo" class="center-logo" />
              </div>
              
              <div class="total-section">
                <div class="total-label">Total :</div>
                <div class="total-amount">₹ ${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              
              <div class="amount-in-words">
                <span class="words-label">In words:</span> ${numberToWords(parseInt(receiptData.amount))} Only
              </div>
              
              <div class="payment-details-footer">
                <div class="payment-info">Med : ${receiptData.description || 'N/A'}</div>
                ${receiptData.paymentMethod === 'UPI' || receiptData.paymentMethod === 'Online' ? `
                <div class="payment-info">UPI Amount : ${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bank Info = Transaction ID : ${receiptData.transactionId || 'N/A'}, Date : ${receiptData.date}</div>
                <div class="payment-info">Bank Name : ${receiptData.bankName || 'N/A'}, Location : ${receiptData.bankLocation || 'N/A'}</div>
                ` : ''}
                <div class="payment-info">Remarks : ${receiptData.remarks || receiptData.description || 'Payment Received'}</div>
              </div>
              
              <div class="footer-signature">
                <div class="cashier-info">O1-${receiptData.collectedBy || 'Cashier'}/${receiptData.date}</div>
                <div class="cashier-name">${receiptData.collectedBy || 'Cashier Name'}</div>
                <div class="signature-label">RECEIVER'S SIGNATURE</div>
              </div>
              
              <div class="page-number">Page 1 of 1</div>
            </div>
      `;

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fee Payment Receipt - ${receiptData.receiptNumber}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 5px; 
              background: white;
              line-height: 1.4;
              color: #000;
              font-size: 9px;
            }
            .receipts-wrapper {
              display: flex;
              flex-direction: row;
              gap: 8px;
              width: 100%;
              justify-content: space-between;
              height: 100%;
            }
            .receipt-container {
              width: 49%;
              border: 1px solid #000;
              background: white;
              padding: 12px;
              page-break-inside: avoid;
              min-height: 650px;
              height: auto;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .receipt-header-box {
              border: 1px solid #000;
              padding: 10px;
              margin-bottom: 12px;
              position: relative;
            }
            .duplicate-label {
              position: absolute;
              top: 3px;
              right: 8px;
              font-weight: bold;
              font-size: 10px;
              text-transform: uppercase;
              margin-bottom: 10px;
            }
            .institute-header-simple {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 5px;
            }
            .logo-left, .logo-right {
              width: 35px;
              height: 35px;
              flex-shrink: 0;
            }
            .logo-left img, .logo-right img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .header-text {
              flex: 1;
              text-align: center;
              padding: 8px 0;
            }
            .society-name-simple {
              font-size: 8px;
              margin-bottom: 1px;
            }
            .institute-name-simple {
              font-weight: bold;
              font-size: 10px;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .institute-address-simple {
              font-size: 8px;
            }
            .receipt-type-label {
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              font-size: 11px;
              margin-bottom: 10px;
              padding: 6px;
              background: #f0f0f0;
              border: 1px solid #000;
            }
            .info-item {
              display: flex;
              gap: 5px;
              margin-bottom: 4px;
            }
            .label {
              font-weight: bold;
              min-width: 70px;
            }
            .value {
              flex: 1;
            }
            .received-section {
              display: flex;
              justify-content: space-between;
              border: 1px solid #000;
              border-bottom: none;
              padding: 8px 10px;
              background: #f0f0f0;
              font-weight: bold;
              font-size: 10px;
              min-height: 35px;
              align-items: center;
            }
            .fee-details-table {
              border: 1px solid #000;
              margin-bottom: 0;
            }
            .fee-details-table table {
              width: 100%;
              border-collapse: collapse;
            }
            .fee-details-table td {
              padding: 8px 10px;
              border-bottom: 1px solid #ddd;
              font-size: 9px;
              line-height: 1.6;
            }
            .fee-details-table td.fee-name {
              text-transform: uppercase;
            }
            .fee-details-table td.fee-amount {
              text-align: right;
              font-weight: bold;
            }
            .logo-section {
              text-align: center;
              padding: 40px 0;
              border-left: 1px solid #000;
              border-right: 1px solid #000;
              display: flex;
              justify-content: center;
              align-items: center;
              flex-grow: 1;
            }
            .center-logo {
              width: 60px;
              height: 60px;
              opacity: 0.3;
              display: block;
              margin: 0 auto;
            }
            .total-section {
              display: flex;
              justify-content: space-between;
              border: 2px solid #000;
              border-top: 2px solid #000;
              padding: 6px 8px;
              font-weight: bold;
              font-size: 10px;
            }
            .amount-in-words {
              border: 1px solid #000;
              border-top: none;
              padding: 6px 8px;
              font-size: 8px;
            }
            .words-label {
              font-weight: bold;
            }
            .payment-details-footer {
              border: 1px solid #000;
              border-top: none;
              padding: 8px;
              font-size: 7px;
              line-height: 1.6;
            }
            .payment-info {
              margin-bottom: 4px;
            }
            .footer-signature {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border: 1px solid #000;
              border-top: none;
              padding: 15px;
              font-size: 7px;
              min-height: 80px;
            }
            .cashier-info {
              font-size: 7px;
            }
            .cashier-name {
              font-weight: bold;
            }
            .signature-label {
              font-weight: bold;
              text-align: right;
            }
            .page-number {
              text-align: right;
              font-size: 7px;
              margin-top: 6px;
            }
            @media print {
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .receipt-container {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipts-wrapper">
            ${generateReceipt("ORIGINAL")}
            ${generateReceipt("DUPLICATE")}
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

    // Convert number to words function
    const numberToWords = (num) => {
      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
      ];
      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
      ];
      const teens = [
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];

      if (num === 0) return "Zero";
      if (num < 0) return "Negative " + numberToWords(-num);

      let result = "";

      if (num >= 10000000) {
        result += numberToWords(Math.floor(num / 10000000)) + " Crore ";
        num %= 10000000;
      }

      if (num >= 100000) {
        result += numberToWords(Math.floor(num / 100000)) + " Lakh ";
        num %= 100000;
      }

      if (num >= 1000) {
        result += numberToWords(Math.floor(num / 1000)) + " Thousand ";
        num %= 1000;
      }

      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + " Hundred ";
        num %= 100;
      }

      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + " ";
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + " ";
        num = 0;
      }

      if (num > 0) {
        result += ones[num] + " ";
      }

      return result.trim();
    };

    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto border-2 border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center">
              <span className="mr-3 text-3xl">🧾</span>
              Official Payment Receipt
            </h2>
            <button
              onClick={() => setShowReceipt(false)}
              className="text-white hover:text-gray-200 transition-colors duration-200"
            >
              <span className="text-3xl">×</span>
            </button>
          </div>

          <div className="p-4" id="receipt-content">
            {/* Professional Receipt Preview - Matching Print Version */}
            <div
              className="bg-white"
              dangerouslySetInnerHTML={{
                __html: `
                  <style>
                    @page {
                      size: A4 landscape;
                      margin: 5mm;
                    }
                    * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                    }
                    body { 
                      font-family: 'Times New Roman', serif; 
                      margin: 0; 
                      padding: 15px; 
                      background: #f8f9fa;
                      line-height: 1.5;
                      color: #2d3748;
                      font-size: 12px;
                      font-weight: 400;
                    }
                    .receipts-wrapper {
                      display: flex;
                      justify-content: center;
                      width: 100%;
                      height: 100%;
                    }
                    .receipt-container {
                      width: 95%;
                      max-width: 900px;
                      border: 2px solid #2d3748;
                      background: white;
                      padding: 20px;
                      margin: 20px auto;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      page-break-inside: avoid;
                      min-height: 600px;
                      height: auto;
                    }
                    .receipt-header-box {
                      border: 2px solid #2d3748;
                      padding: 10px;
                      margin-bottom: 10px;
                      position: relative;
                      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                    }
                    .duplicate-label {
                      position: absolute;
                      top: 5px;
                      right: 10px;
                      font-weight: bold;
                      font-size: 12px;
                      text-transform: uppercase;
                      color: #dc3545;
                      margin-bottom: 15px;
                    }
                    .institute-header-simple {
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      gap: 8px;
                    }
                    .logo-left, .logo-right {
                      width: 40px;
                      height: 40px;
                      flex-shrink: 0;
                    }
                    .logo-left img, .logo-right img {
                      width: 100%;
                      height: 100%;
                      object-fit: contain;
                    }
                    .header-text {
                      flex: 1;
                      text-align: center;
                      padding: 12px 0;
                    }
                    .society-name-simple {
                      font-size: 11px;
                      margin-bottom: 2px;
                      color: #6c757d;
                    }
                    .institute-name-simple {
                      font-weight: bold;
                      font-size: 14px;
                      text-transform: uppercase;
                      margin-bottom: 4px;
                      color: #1a202c;
                      letter-spacing: 0.5px;
                    }
                    .institute-address-simple {
                      font-size: 11px;
                      color: #6c757d;
                    }
                    .receipt-type-label {
                      font-weight: bold;
                      text-align: center;
                      text-transform: uppercase;
                      font-size: 11px;
                      margin-bottom: 8px;
                      padding: 3px 8px;
                      border: 2px solid #000;
                      border-bottom: 1px solid #000;
                      color: #000;
                      background: white;
                    }
                    .receipt-info-table {
                      width: 100%;
                      border: 2px solid #000;
                      border-collapse: collapse;
                      margin-bottom: 10px;
                      font-size: 10px;
                      background: white;
                    }
                    .receipt-info-table td {
                      border: 1px solid #000;
                      padding: 4px 8px;
                      vertical-align: top;
                    }
                    .receipt-info-table .label-cell {
                      font-weight: bold;
                      width: 20%;
                      color: #000;
                    }
                    .receipt-info-table .value-cell {
                      width: 30%;
                      color: #000;
                    }
                    .received-section {
                      display: flex;
                      justify-content: space-between;
                      border: 2px solid #2d3748;
                      border-bottom: none;
                      padding: 4px 8px;
                      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
                      font-weight: bold;
                      font-size: 11px;
                      color: #1a202c;
                    }
                    .fee-details-table {
                      border: 2px solid #000;
                      margin-bottom: 0;
                    }
                    .fee-details-table table {
                      width: 100%;
                      border-collapse: collapse;
                    }
                    .fee-details-table td {
                      padding: 6px 10px;
                      border-bottom: 1px solid #dee2e6;
                      font-size: 11px;
                    }
                    .fee-details-table td.fee-name {
                      text-transform: uppercase;
                      font-weight: bold;
                      color: #000;
                    }
                    .fee-details-table td.fee-amount {
                      text-align: right;
                      font-weight: bold;
                      color: #000;
                    }
                    .logo-section {
                      text-align: center;
                      padding: 30px 0;
                      border-left: 2px solid #000;
                      border-right: 2px solid #000;
                      background: #f8f9fa;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    }
                    .center-logo {
                      width: 70px;
                      height: 70px;
                      opacity: 0.4;
                      display: block;
                      margin: 0 auto;
                    }
                    .total-section {
                      display: flex;
                      justify-content: space-between;
                      border: 2px solid #2d3748;
                      border-top: 3px solid #1a202c;
                      padding: 4px 8px;
                      font-weight: bold;
                      font-size: 12px;
                      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                      color: #1a202c;
                    }
                    .amount-in-words {
                      border: 2px solid #000;
                      border-top: none;
                      padding: 5px 8px;
                      font-size: 10px;
                      background: #f8f9fa;
                      color: #000;
                    }
                    .words-label {
                      font-weight: bold;
                    }
                    .payment-details-footer {
                      border: 2px solid #2d3748;
                      border-top: none;
                      padding: 10px;
                      font-size: 10px;
                      line-height: 1.5;
                      background: #f7fafc;
                      color: #2d3748;
                    }
                    .payment-info {
                      margin-bottom: 3px;
                    }
                    .footer-signature {
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-end;
                      border: 2px solid #2d3748;
                      border-top: none;
                      padding: 15px;
                      font-size: 10px;
                      min-height: 60px;
                      background: #f7fafc;
                      color: #2d3748;
                    }
                    .cashier-info {
                      font-size: 9px;
                    }
                    .cashier-name {
                      font-weight: bold;
                    }
                    .signature-label {
                      font-weight: bold;
                      text-align: right;
                    }
                    .page-number {
                      text-align: right;
                      font-size: 9px;
                      margin-top: 5px;
                      color: #6c757d;
                    }
                    @media print {
                      @page {
                        size: A4 landscape;
                        margin: 10mm;
                      }
                      body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                      }
                      .receipt-container {
                        page-break-inside: avoid;
                      }
                    }
                  </style>
                  <div class="receipts-wrapper">
                    ${(() => {
                      const generateReceipt = (label) => `
                        <div class="receipt-container">
                          <div class="receipt-header-box">
                            <div class="duplicate-label">${label}</div>
                            <div class="institute-header-simple">
                              <div class="logo-left">
                                <img src="/logo1.png" alt="Logo" />
                              </div>
                              <div class="header-text">
                                <div class="society-name-simple">Maitrey Educational Society's</div>
                                <div class="institute-name-simple">NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY & MANAGEMENT</div>
                                <div class="institute-address-simple">Village Satnavri, Amravati Road, Nagpur - 440023</div>
                              </div>
                              <div class="logo-right">
                                <img src="/logo.png" alt="Logo" />
                              </div>
                            </div>
                          </div>

                          <table class="receipt-info-table">
                            <tr>
                              <td class="label-cell">Rec. No.</td>
                              <td class="value-cell">: ${receiptData.receiptNumber}</td>
                              <td class="label-cell">Date</td>
                              <td class="value-cell">: ${receiptData.date}</td>
                            </tr>
                            <tr>
                              <td class="label-cell">Class</td>
                              <td class="value-cell">: ${receiptData.student?.program || 'N/A'}</td>
                              <td class="label-cell">Adm. No.</td>
                              <td class="value-cell">: ${receiptData.student?.admissionNumber || receiptData.student?.studentId}</td>
                            </tr>
                            <tr>
                              <td class="label-cell">Category</td>
                              <td class="value-cell">: ${receiptData.student?.caste || receiptData.student?.casteCategory || 'N/A'}</td>
                              <td class="label-cell">Student Id.</td>
                              <td class="value-cell">: ${receiptData.student?.studentId}</td>
                            </tr>
                            <tr>
                              <td class="label-cell">Name</td>
                              <td class="value-cell" colspan="3">: ${receiptData.student?.firstName} ${receiptData.student?.lastName}</td>
                            </tr>
                            <tr>
                              <td class="label-cell">Roll No</td>
                              <td class="value-cell">: ${receiptData.student?.rollNumber || 'N/A'}</td>
                              <td class="label-cell">Section</td>
                              <td class="value-cell">: ${receiptData.student?.section || 'N/A'}</td>
                            </tr>
                          </table>
                          
                          <div class="received-section">
                            <div class="received-label">Received the following:</div>
                            <div class="amount-label">(₹)Amount</div>
                          </div>
                          
                          <div class="fee-details-table">
                            <table>
                              <tbody>
                                ${
                                  receiptData.selectedFeeCategories && receiptData.selectedFeeCategories.length > 0
                                    ? receiptData.selectedFeeCategories
                                        .map(
                                          (category, index) => `
                                <tr>
                                  <td class="fee-name">${category.name}</td>
                                  <td class="fee-amount">${parseFloat(category.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              `
                                        )
                                        .join("")
                                    : receiptData.multipleFees && receiptData.multipleFees.length > 0
                                    ? receiptData.multipleFees
                                        .map(
                                          (fee, index) => `
                                <tr>
                                  <td class="fee-name">${fee.feeHead}</td>
                                  <td class="fee-amount">${fee.currentPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              `
                                        )
                                        .join("")
                                    : `
                                <tr>
                                  <td class="fee-name">${receiptData.feeHead?.title || receiptData.description || 'Fee Payment'}</td>
                                  <td class="fee-amount">${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              `
                                }
                              </tbody>
                            </table>
                                                   </div>
                          
                          <div class="logo-section">
                            <img src="/logo.png" alt="NIETM Logo" class="center-logo" />
                          </div>
                          
                          <div class="total-section">
                            <div class="total-label">Total :</div>
                            <div class="total-amount">₹ ${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                          
                          <div class="amount-in-words">
                            <span class="words-label">In words:</span> ${numberToWords(parseInt(receiptData.amount))} Only
                          </div>
                          
                          <div class="payment-details-footer">
                            <div class="payment-info">Med : ${receiptData.description || 'N/A'}</div>
                            ${receiptData.paymentMethod === 'UPI' || receiptData.paymentMethod === 'Online' ? `
                            <div class="payment-info">UPI Amount : ${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bank Info = Transaction ID : ${receiptData.transactionId || 'N/A'}, Date : ${receiptData.date}</div>
                            <div class="payment-info">Bank Name : ${receiptData.bankName || 'N/A'}, Location : ${receiptData.bankLocation || 'N/A'}</div>
                            ` : ''}
                            <div class="payment-info">Remarks : ${receiptData.remarks || receiptData.description || 'Payment Received'}</div>
                          </div>
                          
                          <div class="footer-signature">
                            <div class="cashier-info">O1-${receiptData.collectedBy || 'Cashier'}/${receiptData.date}</div>
                            <div class="cashier-name">${receiptData.collectedBy || 'Cashier Name'}</div>
                            <div class="signature-label">RECEIVER'S SIGNATURE</div>
                          </div>
                          
                          <div class="page-number">Page 1 of 1</div>
                        </div>

                        
                      `;
                      return generateReceipt("ORIGINAL");
                    })()}
                  </div>
                `,
              }}
            />
          </div>

          {/* Modal Actions */}
          <div className=" gap-3 border-t border-gray-200 pt-20 pb-6 px-6 flex justify-end space-x-8 bg-gradient-to-r from-gray-50 to-gray-100">
            <button
              onClick={printReceipt}
              className="w-32 px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center justify-center font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 text-sm"
            >
              <span className="mr-2 text-2xl">🖨️</span>
              Print Receipt
            </button>
            <button
              onClick={() => setShowReceipt(false)}
              className="w-30 px-8 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 flex items-center justify-center font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 text-lg"
            >
              <span className="mr-2 text-2xl">✕</span>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <ReceiptModal />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Professional Header */}
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-bold mb-4 flex items-center gradient-text">
                  <span className="bg-white text-blue-600 rounded-xl p-4 mr-5 shadow-primary">
                    💳
                  </span>
                  Professional Fee Management
                </h1>
                <p className="text-blue-100 text-xl font-medium">
                  Advanced payment processing with intelligent receipt
                  generation
                </p>
                <div className="flex items-center mt-4 text-blue-200">
                  <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 mr-4 flex items-center">
                    <span className="mr-2">📅</span>
                    <span>Academic Year: {formData.academicYear}</span>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 mr-4 flex items-center">
                    <span className="mr-2">👥</span>
                    <span>
                      {loadingStudents ? "Loading..." : `${students.length} Students`}
                    </span>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 flex items-center">
                    <span className="mr-2">💰</span>
                    <span>{feeHeads.length} Fee Categories</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-center">
                <div className="bg-white bg-opacity-20 rounded-2xl p-8 mb-3 animate-pulse">
                  <span className="text-7xl">🏫</span>
                </div>
                <span className="text-base font-semibold text-blue-200">
                  NIETM Payment Portal
                </span>
                <span className="text-sm text-blue-300">
                  Secure • Fast • Reliable
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Success/Error Messages with Animation */}
          {success && (
            <div className="mb-8 p-6 message-success rounded-xl shadow-success animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 gradient-success rounded-full flex items-center justify-center animate-bounce">
                    <span className="text-white text-xl font-bold">✓</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-bold text-green-800 mb-2 flex items-center gap-2">
                    <span>🎉</span>
                    Payment Successful!
                  </h3>
                  <p className="text-green-700 text-lg font-medium">
                    {success}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-green-600">
                    <div className="flex items-center gap-1">
                      <span className="animate-pulse">🧾</span>
                      <span>Receipt Generated</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="animate-pulse">💾</span>
                      <span>Data Saved</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="animate-pulse">📧</span>
                      <span>Notification Sent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 p-6 message-error rounded-xl shadow-warning animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 gradient-warning rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">⚠</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-bold text-red-800 mb-2 flex items-center gap-2">
                    <span>🚨</span>
                    Payment Error
                  </h3>
                  <p className="text-red-700 text-lg font-medium">{error}</p>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-red-600">
                      <span className="mr-4">
                        🔍 Check details and try again
                      </span>
                      <span>📞 Contact support if issue persists</span>
                    </div>
                    <button
                      onClick={() => setError("")}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors duration-200"
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Type Selection */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">💳</span>
                  Payment Type
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="specific"
                      checked={formData.paymentType === "specific"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "specific"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="font-medium">Specific Fee</div>
                      <div className="text-sm text-gray-500">
                        Pay for specific fee head
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="multiple"
                      checked={formData.paymentType === "multiple"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "multiple"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">📊</div>
                      <div className="font-medium">Multiple Fees</div>
                      <div className="text-sm text-gray-500">
                        Pay for multiple fee heads
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="annual"
                      checked={formData.paymentType === "annual"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "annual"
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">📅</div>
                      <div className="font-medium">Annual Fees</div>
                      <div className="text-sm text-gray-500">
                        Pay yearly fees
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="transport"
                      checked={formData.paymentType === "transport"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "transport"
                          ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">🚌</div>
                      <div className="font-medium">Transport Fees</div>
                      <div className="text-sm text-gray-500">
                        Bus/transport fees
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="hostel"
                      checked={formData.paymentType === "hostel"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "hostel"
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">🏠</div>
                      <div className="font-medium">Hostel Fees</div>
                      <div className="text-sm text-gray-500">
                        Accommodation fees
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="library"
                      checked={formData.paymentType === "library"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "library"
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">📖</div>
                      <div className="font-medium">Library Fees</div>
                      <div className="text-sm text-gray-500">
                        Library services
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="lab"
                      checked={formData.paymentType === "lab"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "lab"
                          ? "border-pink-500 bg-pink-50 text-pink-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">🔬</div>
                      <div className="font-medium">Lab Fees</div>
                      <div className="text-sm text-gray-500">
                        Laboratory usage
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="sports"
                      checked={formData.paymentType === "sports"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "sports"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">⚽</div>
                      <div className="font-medium">Sports Fees</div>
                      <div className="text-sm text-gray-500">
                        Sports facilities
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="development"
                      checked={formData.paymentType === "development"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "development"
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">🏗️</div>
                      <div className="font-medium">Development Fees</div>
                      <div className="text-sm text-gray-500">
                        Infrastructure development
                      </div>
                    </div>
                  </label>

                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="miscellaneous"
                      checked={formData.paymentType === "miscellaneous"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition ${
                        formData.paymentType === "miscellaneous"
                          ? "border-gray-500 bg-gray-50 text-gray-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-2xl mb-2">📋</div>
                      <div className="font-medium">Miscellaneous</div>
                      <div className="text-sm text-gray-500">Other fees</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Academic Year Selection */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">📅</span>
                  Academic Year
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {academicYears.map((year) => (
                    <label key={year.value} className="relative">
                      <input
                        type="radio"
                        name="academicYear"
                        value={year.value}
                        checked={formData.academicYear === year.value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div
                        className={`p-3 border-2 rounded-lg cursor-pointer text-center transition ${
                          formData.academicYear === year.value
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-300 hover:border-gray-400"
                        } ${year.isCurrent ? "ring-2 ring-orange-200" : ""}`}
                      >
                        <div className="font-medium">{year.label}</div>
                        {year.isCurrent && (
                          <div className="text-xs text-orange-600">Current</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Student Selection - Only for Student Payments */}
              {(formData.paymentType === "specific" ||
                formData.paymentType === "multiple" ||
                formData.paymentType === "annual" ||
                formData.paymentType === "transport" ||
                formData.paymentType === "hostel" ||
                formData.paymentType === "library" ||
                formData.paymentType === "lab" ||
                formData.paymentType === "sports" ||
                formData.paymentType === "development" ||
                formData.paymentType === "miscellaneous") && (
                <div className="border-b border-gray-200 pb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-2xl mr-3">👤</span>
                    Student Information
                    <div className="ml-auto flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600 font-medium">
                        {students.length} students loaded
                      </span>
                    </div>
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="relative">
                        <label className="block text-sm font-bold text-gray-800 mb-4 flex items-center">
                          <span className="mr-2 text-lg">🎓</span>
                          Select Student *
                          <button
                            type="button"
                            onClick={fetchStudents}
                            disabled={loadingStudents}
                            className="ml-3 px-3 py-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400 bg-blue-50 hover:bg-blue-100 rounded-full transition-all duration-200 flex items-center text-sm font-medium"
                            title="Refresh student list"
                          >
                            {loadingStudents ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                            ) : (
                              <span className="mr-2">🔄</span>
                            )}
                            Refresh
                          </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowAddStudentModal(true)}
                                    className="ml-2 px-3 py-1 text-white bg-green-600 hover:bg-green-700 rounded-full transition-all duration-200 flex items-center text-sm font-medium"
                                    title="Add new student"
                                  >
                                    <span className="mr-2">＋</span>
                                    Add Student
                                  </button>
                        </label>

                        {/* Enhanced Custom Searchable Select */}
                        <div className="relative group">
                          <div
                            className={`w-full pl-14 pr-12 py-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] shadow-lg hover:shadow-xl ${
                              isDropdownOpen
                                ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/20"
                                : "border-gray-300 hover:border-blue-400 bg-white"
                            }`}
                            onClick={() => !loadingStudents && setIsDropdownOpen(!isDropdownOpen)}
                          >
                            <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500">
                              <span className="text-2xl">🎓</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className={`text-lg font-medium ${selectedStudent ? "text-gray-900" : "text-gray-500"}`}>
                                {selectedStudent
                                  ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
                                  : (loadingStudents
                                    ? "Loading students..."
                                    : "Click to select a student"
                                  )
                                }
                              </span>
                              <div className="flex items-center space-x-2">
                                {selectedStudent && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                                    ✓ Selected
                                  </span>
                                )}
                                <div className={`transform transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}>
                                  <span className="text-xl text-gray-500">▼</span>
                                </div>
                              </div>
                            </div>

                            {selectedStudent && (
                              <div className="mt-2 text-sm text-gray-600 flex items-center space-x-4">
                                <span className="flex items-center">
                                  <span className="mr-1">🆔</span>
                                  {selectedStudent.studentId}
                                </span>
                                <span className="flex items-center">
                                  <span className="mr-1">📚</span>
                                  Sem {typeof selectedStudent.currentSemester === "object"
                                    ? (selectedStudent.currentSemester?.number || selectedStudent.currentSemester?.name || "N/A")
                                    : (selectedStudent.currentSemester || selectedStudent.semester?.number || "N/A")
                                  }
                                </span>
                                <span className="flex items-center">
                                  <span className="mr-1">🏛️</span>
                                  {typeof selectedStudent.department === "object"
                                    ? selectedStudent.department?.name || "N/A"
                                    : selectedStudent.department || "N/A"
                                  }
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Enhanced Dropdown */}
                          {isDropdownOpen && !loadingStudents && (
                            <div className="absolute z-50 w-full mt-3 bg-white border-2 border-gray-300 rounded-2xl shadow-2xl max-h-96 overflow-hidden animate-fadeIn">
                              {/* Enhanced Search Input */}
                              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="🔍 Search by name, ID, department, or semester..."
                                    value={studentSearchTerm}
                                    onChange={(e) => {
                                      setStudentSearchTerm(e.target.value);
                                      handleStudentSearch(e.target.value);
                                      e.stopPropagation();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full pl-12 pr-12 py-3 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-base font-medium transition-all duration-200 bg-white shadow-sm"
                                    autoFocus
                                  />
                                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <span className="text-lg">🔍</span>
                                  </div>
                                  {studentSearchTerm && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        setStudentSearchTerm("");
                                        e.stopPropagation();
                                      }}
                                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                                      title="Clear search"
                                    >
                                      <span className="text-lg">✕</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Enhanced Options List */}
                              <div className="max-h-72 overflow-y-auto">
                                {filteredStudents.length > 0 ? (
                                  filteredStudents.map((student, index) => (
                                    <div
                                      key={student._id}
                                      className={`px-5 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-all duration-200 transform hover:scale-[1.01] ${
                                        formData.studentId === student._id ? "bg-green-50 border-green-200" : ""
                                      }`}
                                      onClick={() => handleStudentSelect(student)}
                                      style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-3 mb-2">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                            </div>
                                            <div>
                                              <div className="font-bold text-gray-900 text-base">
                                                {student.firstName} {student.lastName}
                                              </div>
                                              <div className="text-sm text-gray-600">
                                                🆔 {student.studentId}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                                            <span className="flex items-center bg-blue-100 px-2 py-1 rounded-full">
                                              <span className="mr-1">📚</span>
                                                Sem {typeof student.currentSemester === "object"
                                                  ? (student.currentSemester?.number || student.currentSemester?.name || "N/A")
                                                  : (student.currentSemester || student.semester?.number || "N/A")
                                                }
                                            </span>
                                            <span className="flex items-center bg-green-100 px-2 py-1 rounded-full">
                                              <span className="mr-1">🏛️</span>
                                              {typeof student.department === "object"
                                                ? student.department?.name || "N/A"
                                                : student.department || "N/A"
                                              }
                                            </span>
                                            <span className="flex items-center bg-purple-100 px-2 py-1 rounded-full text-xs">
                                              {student.caste || student.casteCategory || 'N/A'}
                                            </span>
                                          </div>
                                        </div>
                                        {formData.studentId === student._id && (
                                          <div className="text-green-600 ml-4">
                                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                              <span className="text-white text-sm font-bold">✓</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-6 py-12 text-center text-gray-500">
                                    <div className="text-4xl mb-4">🔍</div>
                                    <div className="font-bold text-lg mb-2">
                                      {studentSearchTerm
                                        ? "No students found"
                                        : "No students available"
                                      }
                                    </div>
                                    <div className="text-sm mb-4">
                                      {studentSearchTerm
                                        ? "Try adjusting your search terms"
                                        : "Please refresh the student list"
                                      }
                                    </div>
                                    {studentSearchTerm && (
                                      <button
                                        type="button"
                                        onClick={() => setStudentSearchTerm("")}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium"
                                      >
                                        Clear Search
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Enhanced Footer */}
                              <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200 text-sm text-gray-600 text-center">
                                <div className="flex items-center justify-center space-x-4">
                                  <span className="flex items-center">
                                    <span className="mr-1">📊</span>
                                    {studentSearchTerm
                                      ? `Found ${filteredStudents.length} student${filteredStudents.length === 1 ? '' : 's'}`
                                      : `${students.length} students loaded`
                                    }
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span className="flex items-center text-blue-600 font-medium">
                                    <span className="mr-1">⚡</span>
                                    Instant search active
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Click outside to close */}
                        {isDropdownOpen && (
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsDropdownOpen(false)}
                          />
                        )}
                      </div>

                      {/* Add Student Modal (placed outside receipt template) */}
                      {showAddStudentModal && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4"
                          onClick={() => setShowAddStudentModal(false)}
                        >
                          <div
                            className="bg-white rounded-2xl p-6 w-full max-w-xl mx-auto shadow-2xl ring-1 ring-gray-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-start justify-between">
                              <h3 className="text-xl font-semibold">Add New Student</h3>
                              <button
                                type="button"
                                onClick={() => setShowAddStudentModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Close"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                <input
                                  type="text"
                                  placeholder="Enter first name"
                                  value={newStudentData.firstName}
                                  onChange={(e) => setNewStudentData({ ...newStudentData, firstName: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                <input
                                  type="text"
                                  placeholder="Enter last name"
                                  value={newStudentData.lastName}
                                  onChange={(e) => setNewStudentData({ ...newStudentData, lastName: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                <input
                                  type="text"
                                  placeholder="B.Tech / M.Com / etc."
                                  value={newStudentData.className}
                                  onChange={(e) => setNewStudentData({ ...newStudentData, className: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                <input
                                  type="text"
                                  placeholder="Computer Science"
                                  value={newStudentData.branch}
                                  onChange={(e) => setNewStudentData({ ...newStudentData, branch: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 2025"
                                  value={newStudentData.year}
                                  onChange={(e) => setNewStudentData({ ...newStudentData, year: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newStudentData.semester}
                                  onChange={(e) => setNewStudentData({ ...newStudentData, semester: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                            </div>

                            <div className="mt-6 flex justify-end items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => setShowAddStudentModal(false)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleAddStudent}
                                disabled={loading || !newStudentData.firstName || !newStudentData.lastName}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loading ? "Adding..." : "Add Student"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Caste Category and TFWS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
                            <span className="mr-2">🏛️</span>
                            Caste Category
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="caste"
                              value={formData.caste || ""}
                              onChange={handleInputChange}
                              list="caste-suggestions"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-base font-medium transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                              placeholder="Select or enter caste category"
                            />
                            <datalist id="caste-suggestions" style={{background:"white"}}>
                              <option value="Open" />
                              <option value="OBC" />
                              <option value="SC" />
                              <option value="ST" />
                              <option value="SBC" />
                              <option value="VJNT" />
                              <option value="NT" />
                              <option value="Other" />
                            </datalist>
                          </div>
                        </div>

                        <div className="flex items-end">
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className={`relative w-6 h-6 border-2 rounded-lg transition-all duration-200 ${
                              formData.tfws
                                ? "border-green-500 bg-green-500"
                                : "border-gray-300 group-hover:border-blue-400"
                            }`}>
                              <input
                                type="checkbox"
                                name="tfws"
                                checked={formData.tfws || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setFormData((prev) => ({
                                    ...prev,
                                    tfws: checked,
                                  }));
                                }}
                                className="sr-only"
                              />
                              {formData.tfws && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">✓</span>
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-gray-800">
                                <span className="mr-2">🎓</span>
                                Tuition Fee Waiver Scheme (TFWS)
                              </span>
                              <p className="text-xs text-gray-600 mt-1">
                                Check if eligible for TFWS
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Student Profile Card */}
                    <div className="lg:col-span-1">
                      {selectedStudent && (
                        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-blue-200 shadow-xl animate-fadeIn">
                          <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
                              {selectedStudent.firstName.charAt(0)}{selectedStudent.lastName.charAt(0)}
                            </div>
                            <h4 className="font-bold text-blue-900 text-xl mb-2">
                              {selectedStudent.firstName} {selectedStudent.lastName}
                            </h4>
                            <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-bold rounded-full">
                              <span className="mr-1">🆔</span>
                              {selectedStudent.studentId}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-blue-300 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="flex items-center">
                                <span className="mr-3 text-blue-600 text-lg">🏛️</span>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Department</div>
                                  <div className="font-bold text-blue-800 text-base">
                                    {typeof selectedStudent.department === "object"
                                      ? selectedStudent.department?.name || "N/A"
                                      : selectedStudent.department || "N/A"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-green-300 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="flex items-center">
                                <span className="mr-3 text-green-600 text-lg">📚</span>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Program</div>
                                  <div className="font-bold text-green-800 text-base">
                                    {typeof selectedStudent.program === "object"
                                      ? selectedStudent.program?.name || "N/A"
                                      : selectedStudent.program || "N/A"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-purple-300 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="flex items-center">
                                <span className="mr-3 text-purple-600 text-lg">📈</span>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Semester</div>
                                    <div className="font-bold text-purple-800 text-base">
                                    Semester {typeof selectedStudent.currentSemester === "object"
                                      ? (selectedStudent.currentSemester?.number || selectedStudent.currentSemester?.name || "N/A")
                                      : (selectedStudent.currentSemester || selectedStudent.semester?.number || "N/A")
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-pink-300 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="flex items-center">
                                <span className="mr-3 text-pink-600 text-lg">🚻</span>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Gender</div>
                                  <div className="font-bold text-pink-800 text-base">
                                    {getStudentGender(selectedStudent)
                                      ? getStudentGender(selectedStudent).charAt(0).toUpperCase() + getStudentGender(selectedStudent).slice(1)
                                      : (selectedStudent?.gender || selectedStudent?.sex || 'N/A')}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-yellow-300 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="flex items-center">
                                <span className="mr-3 text-yellow-600 text-lg">🧾</span>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Caste</div>
                                  <div className="font-bold text-yellow-800 text-base">
                                    {selectedStudent?.caste || selectedStudent?.casteCategory || formData.caste || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {selectedStudent.email && (
                              <div className="bg-white p-4 rounded-xl border border-red-300 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex items-center">
                                  <span className="mr-3 text-red-600 text-lg">📧</span>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</div>
                                    <div className="font-bold text-red-800 text-base break-all">
                                      {selectedStudent.email}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}


                    </div>
                  </div>

                  {/* Pending Fees Section - Only for Specific Payment */}
                  {selectedStudent &&
                    formData.paymentType === "specific" &&
                    false && ( // Disabled pending fees section
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <span className="text-xl mr-2">⏰</span>
                          Pending Fees
                        </h4>

                        {console.log('Pending Fees:', selectedStudent.department.name, feeHeads)}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[]
                            .filter(fee => feeHeads.some(head => head._id === fee.feeHeadId))
                            .map((fee, index) => (
                              <div
                                key={index}
                                className="bg-white p-3 rounded-lg border border-yellow-300"
                              >
                                <div className="text-sm">
                                  <p className="font-medium text-gray-900">
                                    {fee.feeHead}
                                  </p>
                                  <p className="text-red-600 font-semibold">
                                    Pending: ₹{fee.pendingAmount}
                                  </p>
                                  <p className="text-gray-600">
                                    Total: ₹{fee.totalAmount}
                                  </p>
                                  {fee.paidAmount > 0 && (
                                    <p className="text-green-600">
                                      Paid: ₹{fee.paidAmount}
                                    </p>
                                  )}
                                  {fee.dueDate && (
                                    <p className="text-orange-600 text-xs">
                                      Due:{" "}
                                      {new Date(
                                        fee.dueDate
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      feeHead: fee.feeHeadId,
                                      amount: fee.pendingAmount.toString(),
                                      manualFeeHeadName: fee.feeHead,
                                      manualFeeAmount: fee.pendingAmount.toString(),
                                      feeName: fee.feeHead,
                                      paymentType: "specific",
                                    }));
                                  }}
                                  className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
                                >
                                  Quick Fill
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                            <span className="font-medium">💡 Tip:</span> Click
                            "Quick Fill" to automatically set the fee head and
                            pending amount in the payment form.
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Multiple Fee Heads Selection - Only for Multiple Payment */}
                  {selectedStudent && formData.paymentType === "multiple" && false && ( // Disabled multiple fee heads section
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="text-xl mr-2">📊</span>
                        Select Multiple Fee Heads
                      </h4>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        {false ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              {[].map((fee, index) => (
                                <label key={index} className="relative">
                                  <input
                                    type="checkbox"
                                    checked={formData.selectedFeeHeads.includes(
                                      fee.feeHeadId
                                    )}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const updatedFeeHeads = checked
                                        ? [
                                            ...formData.selectedFeeHeads,
                                            fee.feeHeadId,
                                          ]
                                        : formData.selectedFeeHeads.filter(
                                            (id) => id !== fee.feeHeadId
                                          );

                                      // Show visual feedback for selection
                                      if (checked) {
                                        setSuccess(
                                          `✅ Added ${
                                            fee.feeHead
                                          } (₹${fee.pendingAmount.toLocaleString()}) to payment`
                                        );
                                        setTimeout(() => setSuccess(""), 2000);
                                      } else {
                                        setSuccess(
                                          `❌ Removed ${fee.feeHead} from payment`
                                        );
                                        setTimeout(() => setSuccess(""), 1500);
                                      }

                                      // Auto-calculate total and adjust payment type
                                      const totalAmount =
                                        updatedFeeHeads.reduce((sum, id) => {
                                          const pendingFee = [].find(
                                            (f) => f.feeHeadId === id
                                          );
                                          return (
                                            sum +
                                            (pendingFee
                                              ? pendingFee.pendingAmount
                                              : 0)
                                          );
                                        }, 0);

                                      setFormData((prev) => ({
                                        ...prev,
                                        selectedFeeHeads: updatedFeeHeads,
                                        amount:
                                          updatedFeeHeads.length > 0
                                            ? totalAmount.toString()
                                            : prev.amount,
                                        feeHead:
                                          updatedFeeHeads.length === 1
                                            ? updatedFeeHeads[0]
                                            : "",
                                      }));
                                    }}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`p-4 border-2 rounded-xl cursor-pointer text-center transition-all duration-300 transform hover:scale-[1.02] ${
                                      formData.selectedFeeHeads.includes(
                                        fee.feeHeadId
                                      )
                                        ? "border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg shadow-green-200/50"
                                        : "border-gray-300 hover:border-green-400 bg-white hover:shadow-md"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="text-sm flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <p className="font-semibold text-gray-900">
                                            {fee.feeHead}
                                          </p>
                                          {formData.selectedFeeHeads.includes(
                                            fee.feeHeadId
                                          ) && (
                                            <span className="animate-bounce">
                                              <svg
                                                className="w-4 h-4 text-green-600"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-red-600 font-bold text-base">
                                          ₹{fee.pendingAmount.toLocaleString()}
                                        </p>
                                        <p className="text-gray-600">
                                          Total: ₹{fee.totalAmount}
                                        </p>
                                        {fee.paidAmount > 0 && (
                                          <p className="text-green-600">
                                            Paid: ₹{fee.paidAmount}
                                          </p>
                                        )}
                                        {fee.dueDate && (
                                          <p className="text-orange-600 text-xs">
                                            Due:{" "}
                                            {new Date(
                                              fee.dueDate
                                            ).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <div
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ml-2 ${
                                          formData.selectedFeeHeads.includes(
                                            fee.feeHeadId
                                          )
                                            ? "border-green-500 bg-green-500"
                                            : "border-gray-300"
                                        }`}
                                      >
                                        {formData.selectedFeeHeads.includes(
                                          fee.feeHeadId
                                        ) && (
                                          <span className="text-white text-xs">
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>

                            {/* Enhanced Multiple Fee Summary with Animation */}
                            {formData.selectedFeeHeads.length > 0 && (
                              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 animate-fadeIn shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                  <h5 className="font-bold text-green-900 text-lg flex items-center gap-2">
                                    <span className="animate-pulse">💰</span>
                                    Payment Summary
                                  </h5>
                                  <span className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                    {formData.selectedFeeHeads.length} fee head
                                    {formData.selectedFeeHeads.length > 1
                                      ? "s"
                                      : ""}{" "}
                                    selected
                                  </span>
                                </div>
                                <div className="space-y-3 mb-4">
                                  {formData.selectedFeeHeads.map(
                                    (feeHeadId, index) => {
                                      const fee = [].find(
                                        (f) => f.feeHeadId === feeHeadId
                                      );
                                      return fee ? (
                                        <div
                                          key={feeHeadId}
                                          className="flex justify-between items-center bg-white rounded-lg p-3 shadow-sm border border-green-200 animate-slideIn"
                                          style={{
                                            animationDelay: `${index * 100}ms`,
                                          }}
                                        >
                                          <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                              {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-800">
                                              {fee.feeHead}
                                            </span>
                                          </div>
                                          <span className="font-bold text-green-900 text-lg">
                                            ₹
                                            {fee.pendingAmount.toLocaleString()}
                                          </span>
                                        </div>
                                      ) : null;
                                    }
                                  )}
                                </div>
                                <div className="border-t-2 border-green-400 pt-4 bg-green-200 rounded-lg p-4">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-green-900 text-xl flex items-center gap-2">
                                      <span>💳</span>
                                      Total Payment:
                                    </span>
                                    <span className="font-bold text-green-900 text-2xl animate-pulse">
                                      ₹
                                      {formData.selectedFeeHeads
                                        .reduce((total, feeHeadId) => {
                                          const fee = [].find(
                                            (f) => f.feeHeadId === feeHeadId
                                          );
                                          return (
                                            total +
                                            (fee ? fee.pendingAmount : 0)
                                          );
                                        }, 0)
                                        .toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-3 flex justify-between">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        selectedFeeHeads: [].map(
                                          (f) => f.feeHeadId
                                        ),
                                      }));
                                    }}
                                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                                  >
                                    Select All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fee = [].find(
                                        (f) => f.feeHeadId === formData.selectedFeeHeads[0]
                                      );
                                      if (fee) {
                                        setFormData((prev) => ({
                                          ...prev,
                                          amount: fee.pendingAmount.toString(),
                                          feeHead: fee.feeHeadId,
                                          manualFeeHeadName: fee.feeHead,
                                          manualFeeAmount: fee.pendingAmount.toString(),
                                          paymentType: "specific",
                                        }));
                                      }
                                    }}
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                                  >
                                    Auto-Fill Amount
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        selectedFeeHeads: [],
                                      }));
                                    }}
                                    className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition"
                                  >
                                    Clear Selection
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <span className="text-xl mr-2">✅</span>
                            <p className="font-medium text-green-700">
                              No pending fees found for this student!
                            </p>
                          </div>
                        )}

                        <div className="mt-3 text-sm text-green-700 bg-green-100 p-2 rounded">
                          <span className="font-medium">💡 Tip:</span> Select
                          multiple fee heads to pay in a single transaction. Use
                          "Auto-Fill Amount" to automatically calculate the
                          total amount for selected fees.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No Pending Fees Message - Only for Specific Payment */}
                  {selectedStudent &&
                    formData.paymentType === "specific" &&
                    false && ( // Disabled no pending fees message
                      <div className="mt-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center text-green-700">
                            <span className="text-xl mr-2">✅</span>
                            <p className="font-medium">
                              No pending fees found for this student!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Annual Fees Section */}
              {formData.paymentType === "annual" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">📅</span>
                    Annual Fee Payment
                  </h3>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-orange-700">
                        <span className="text-lg font-semibold">
                          Annual Fee Payment for Academic Year{" "}
                          {formData.academicYear}
                        </span>
                        <p className="text-sm mt-2">
                          This includes all annual fees such as admission fees,
                          annual development charges, etc.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transport Fees Section */}
              {formData.paymentType === "transport" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">🚌</span>
                    Transport Fees
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Route/Stop
                        </label>
                        <input
                          type="text"
                          name="transportRoute"
                          value={formData.transportRoute || ""}
                          onChange={handleInputChange}
                          placeholder="Enter route or stop name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration
                        </label>
                        <select
                          name="transportDuration"
                          value={formData.transportDuration || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                        >
                          <option value="">Select Duration</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="half-yearly">Half Yearly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hostel Fees Section */}
              {formData.paymentType === "hostel" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">🏠</span>
                    Hostel Fees
                  </h3>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hostel Block
                        </label>
                        <input
                          type="text"
                          name="hostelBlock"
                          value={formData.hostelBlock || ""}
                          onChange={handleInputChange}
                          placeholder="Enter hostel block"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Room Number
                        </label>
                        <input
                          type="text"
                          name="roomNumber"
                          value={formData.roomNumber || ""}
                          onChange={handleInputChange}
                          placeholder="Enter room number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fee Type
                        </label>
                        <select
                          name="hostelFeeType"
                          value={formData.hostelFeeType || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select Fee Type</option>
                          <option value="accommodation">
                            Accommodation Fees
                          </option>
                          <option value="mess">Mess Fees</option>
                          <option value="security">Security Deposit</option>
                          <option value="maintenance">Maintenance Fees</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Library Fees Section */}
              {formData.paymentType === "library" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">📖</span>
                    Library Fees
                  </h3>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fee Type
                        </label>
                        <select
                          name="libraryFeeType"
                          value={formData.libraryFeeType || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="">Select Library Fee Type</option>
                          <option value="annual">Annual Library Fee</option>
                          <option value="fine">Library Fine</option>
                          <option value="lost-book">Lost Book Charges</option>
                          <option value="membership">Library Membership</option>
                          <option value="deposit">Book Deposit</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Details
                        </label>
                        <input
                          type="text"
                          name="libraryDetails"
                          value={formData.libraryDetails || ""}
                          onChange={handleInputChange}
                          placeholder="Book name, fine details, etc."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lab Fees Section */}
              {formData.paymentType === "lab" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">🔬</span>
                    Laboratory Fees
                  </h3>
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Laboratory
                        </label>
                        <select
                          name="labType"
                          value={formData.labType || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Select Laboratory</option>
                          <option value="computer">Computer Lab</option>
                          <option value="physics">Physics Lab</option>
                          <option value="chemistry">Chemistry Lab</option>
                          <option value="biology">Biology Lab</option>
                          <option value="engineering">Engineering Lab</option>
                          <option value="language">Language Lab</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration
                        </label>
                        <select
                          name="labDuration"
                          value={formData.labDuration || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Select Duration</option>
                          <option value="semester">Per Semester</option>
                          <option value="annual">Annual</option>
                          <option value="practical">
                            Per Practical Session
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sports Fees Section */}
              {formData.paymentType === "sports" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">⚽</span>
                    Sports Fees
                  </h3>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sports Activity
                        </label>
                        <select
                          name="sportsActivity"
                          value={formData.sportsActivity || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">Select Sports Activity</option>
                          <option value="general">General Sports Fee</option>
                          <option value="cricket">Cricket</option>
                          <option value="football">Football</option>
                          <option value="basketball">Basketball</option>
                          <option value="tennis">Tennis</option>
                          <option value="swimming">Swimming</option>
                          <option value="athletics">Athletics</option>
                          <option value="gym">Gymnasium</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fee Type
                        </label>
                        <select
                          name="sportsFeeType"
                          value={formData.sportsFeeType || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">Select Fee Type</option>
                          <option value="annual">Annual Sports Fee</option>
                          <option value="tournament">Tournament Fee</option>
                          <option value="equipment">Equipment Fee</option>
                          <option value="coaching">Coaching Fee</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Development Fees Section */}
              {formData.paymentType === "development" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">🏗️</span>
                    Development Fees
                  </h3>
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-cyan-700">
                        <span className="text-lg font-semibold">
                          Infrastructure Development Fee
                        </span>
                        <p className="text-sm mt-2">
                          This fee contributes to the development and
                          maintenance of college infrastructure, including new
                          buildings, equipment, and facility upgrades.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Miscellaneous Fees Section */}
              {formData.paymentType === "miscellaneous" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">📋</span>
                    Miscellaneous Fees
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fee Purpose
                      </label>
                      <input
                        type="text"
                        name="miscellaneousPurpose"
                        value={formData.miscellaneousPurpose || ""}
                        onChange={handleInputChange}
                        placeholder="Enter the purpose of payment"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Please specify the purpose of this miscellaneous payment
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fee Information - Only for Specific Payment */}
              {/* {formData.paymentType === "specific" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">💰</span>
                    Fee Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fee Name *
                      </label>
                      <input
                        type="text"
                        name="manualFeeHeadName"
                        value={formData.manualFeeHeadName || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Tuition Fee, Lab Fee, etc."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (₹) *
                      </label>
                      <input
                        type="number"
                        name="manualFeeAmount"
                        value={formData.manualFeeAmount || ""}
                        onChange={(e) => {
                          handleInputChange(e);
                          setFormData((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }));
                        }}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount"
                        required
                      />
                    </div>
                  </div>
                </div>
              )} */}

              {/* Payment Details */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">💳</span>
                  Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Name
                    </label>
                    <select
                      name="feeName"
                      value={formData.feeName || ""}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Fee Name</option>
                      <option value="admission">Admission</option>
                      <option value="exam">Exam</option>
                      <option value="other">Other</option>
                    </select>
                    {formData.feeName === "other" && (
                      <div className="mt-2">
                        <input
                          type="text"
                          name="customFeeName"
                          value={formData.customFeeName || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter custom fee name"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fee Categories Section */}
                  {(formData.feeName === "admission" || formData.feeName === "exam") && (
                    <div className="md:col-span-2 mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Fee Categories
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {feeCategories[formData.feeName]?.map((category) => (
                            <div key={category.id} className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id={category.id}
                                checked={formData.selectedFeeCategories.some(cat => cat.id === category.id)}
                                onChange={(e) => handleFeeCategoryChange(category.id, e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor={category.id} className="text-sm font-medium text-gray-700 flex-1">
                                {category.name}
                              </label>
                              {formData.selectedFeeCategories.some(cat => cat.id === category.id) && (
                                <input
                                  type="number"
                                  value={formData.selectedFeeCategories.find(cat => cat.id === category.id)?.amount || 0}
                                  onChange={(e) => handleFeeCategoryAmountChange(category.id, e.target.value)}
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Amount"
                                  min="0"
                                  step="0.01"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        {formData.selectedFeeCategories.length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-800">
                                Total Selected Categories: {formData.selectedFeeCategories.length}
                              </span>
                              <span className="text-sm font-bold text-blue-900">
                                Total Amount: ₹{formData.selectedFeeCategories.reduce((sum, cat) => sum + (parseFloat(cat.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="Online">🖥️ Online</option>
                      <option value="Bank Transfer">🏦 Bank Transfer</option>
                      <option value="Card">💳 Card</option>
                      <option value="UPI">📱 UPI</option>
                    </select>
                  </div>

                  {/* UTR - Show if payment method requires it */}
                  {['Online', 'Bank Transfer', 'Card', 'UPI'].includes(formData.paymentMethod) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        UTR (Unique Transaction Reference) *
                      </label>
                      <input
                        type="text"
                        name="utr"
                        value={formData.utr}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter UTR number"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Collected By
                    </label>
                    <input
                      type="text"
                      name="collectedBy"
                      value={formData.collectedBy}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Cashier name"
                    />
                  </div>



                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any additional notes"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition flex items-center"
                >
                  <span className="mr-2">🔄</span>
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.studentId ||
                    !formData.amount ||
                    (formData.paymentType === "multiple" &&
                      formData.selectedFeeHeads.length === 0)
                  }
                  className={`px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform flex items-center justify-center ${
                    loading ||
                    !formData.studentId ||
                    !formData.amount ||
                    (formData.paymentType === "multiple" &&
                      formData.selectedFeeHeads.length === 0)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "gradient-primary text-white hover:scale-105 shadow-primary hover:shadow-xl"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                        <span>Processing Payment...</span>
                        <div className="ml-3 flex space-x-1">
                          <div
                            className="w-2 h-2 bg-white rounded-full animate-bounce"
                            style={{ animationDelay: "0s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-white rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-white rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="mr-3 text-2xl">�</span>
                      <span>
                        Process{" "}
                        {formData.paymentType === "semester"
                          ? "Semester"
                          : formData.paymentType === "multiple"
                          ? "Multiple Fee"
                          : "Student"}{" "}
                        Payment
                      </span>
                      <span className="ml-3 text-xl">→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎓</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {students.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Available Fee Heads
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {feeHeads.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
              <span className="text-xl mr-2">💡</span>
              Quick Guide
            </h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>
                <span className="font-medium">1.</span> Choose payment type
                (Specific Fee, Multiple Fees, Annual Fees, or Other Fee Types)
              </p>
              <p>
                <span className="font-medium">2.</span> Select the student from
                the dropdown list
              </p>
              <p>
                <span className="font-medium">3.</span> For semester payment:
                select semester and use "Pay All" button
              </p>
              <p>
                <span className="font-medium">4.</span> For multiple fees:
                select multiple fee heads using checkboxes and use "Auto-Fill
                Amount"
              </p>
              <p>
                <span className="font-medium">5.</span> For specific payment:
                review pending fees and use Quick Fill
              </p>
              <p>
                <span className="font-medium">6.</span> Enter payment details
                and click "Record Payment"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <ReceiptModal
          receiptData={receiptData}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
}
