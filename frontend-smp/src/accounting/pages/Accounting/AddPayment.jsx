import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AddPayment() {
  const [formData, setFormData] = useState({
    studentId: "",
    amount: "",
    paymentMethod: "Bank Transfer",
    description: "",
    transactionId: "",
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
  });

  const [students, setStudents] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [pendingFees, setPendingFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    fetchStudents();
    fetchFeeHeads();
    fetchRecentPayments();
  }, []);

  // Helper function to get month name from month number
  const getMonthName = (monthNumber) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[parseInt(monthNumber) - 1] || "";
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

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        "https://erpbackend.tarstech.in/api/students",
        {
          headers,
        }
      );

      // Sort students by name in ascending order
      const sortedStudents = response.data.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setStudents(sortedStudents);
    } catch (err) {
      console.error("Error fetching students:", err);
      // Set empty array instead of using mock data
      setStudents([]);
      setError(
        "Failed to load students. Please ensure the backend server is running and students are properly configured."
      );
    }
  };

  const fetchFeeHeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        "https://erpbackend.tarstech.in/api/fee-heads",
        {
          headers,
        }
      );
      // Remove duplicates based on title and sort in ascending order
      const uniqueFeeHeads = response.data.filter(
        (head, index, self) =>
          index ===
          self.findIndex(
            (h) => h.title.toLowerCase() === head.title.toLowerCase()
          )
      );
      const sortedFeeHeads = uniqueFeeHeads.sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
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
        "https://erpbackend.tarstech.in/api/payments?limit=50",
        { headers }
      );
      setRecentPayments(response.data);
    } catch (err) {
      console.error("Error fetching recent payments:", err);
      // Set empty array instead of using mock data
      setRecentPayments([]);
    }
  };

  const fetchPendingFees = async (studentId) => {
    if (!studentId) {
      setPendingFees([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `https://erpbackend.tarstech.in/api/students/${studentId}/pending-fees?academicYear=${formData.academicYear}`,
        { headers }
      );
      setPendingFees(response.data || []);
    } catch (err) {
      console.error("Error fetching pending fees:", err);
      // Calculate pending fees manually without API dependency
      calculatePendingFees(studentId);
    }
  };

  const calculatePendingFees = async (studentId) => {
    try {
      // Get student's payment history
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const paymentsResponse = await axios.get(
        `https://erpbackend.tarstech.in/api/payments?studentId=${studentId}`,
        { headers }
      );
      const payments = paymentsResponse.data || [];

      // Calculate pending fees based on fee heads and payments
      const pendingFeesCalc = feeHeads
        .map((feeHead) => {
          const totalPaid = payments
            .filter((payment) => payment.feeHead === feeHead._id)
            .reduce((sum, payment) => sum + payment.amount, 0);

          const pendingAmount = feeHead.amount - totalPaid;

          if (pendingAmount > 0) {
            return {
              feeHead: feeHead.title,
              feeHeadId: feeHead._id,
              totalAmount: feeHead.amount,
              paidAmount: totalPaid,
              pendingAmount: pendingAmount,
              dueDate: feeHead.dueDate || null,
            };
          }
          return null;
        })
        .filter((fee) => fee !== null);

      setPendingFees(pendingFeesCalc);
    } catch (err) {
      console.error("Error calculating pending fees:", err);
      setPendingFees([]);
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
    }));

    // Fetch pending fees when student is selected
    if (name === "studentId" && value) {
      fetchPendingFees(value);
    } else if (name === "studentId" && !value) {
      setPendingFees([]);
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

      const response = await axios.post(
        "https://erpbackend.tarstech.in/api/payments",
        paymentData,
        { headers }
      );

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
            `${
              formData.paymentType === "semester"
                ? "Semester"
                : formData.paymentType === "salary"
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
          transactionId: formData.transactionId,
          collectedBy: formData.collectedBy,
          remarks: formData.remarks,
          paymentType: formData.paymentType,
          academicYear: formData.academicYear,
        };

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
                const pendingFee = pendingFees.find(
                  (f) => f.feeHeadId === feeHeadId
                );
                if (pendingFee) {
                  return {
                    feeHead: pendingFee.feeHead,
                    feeHeadId: pendingFee.feeHeadId,
                    totalAmount: pendingFee.totalAmount,
                    paidAmount: pendingFee.paidAmount,
                    currentPayment: pendingFee.pendingAmount,
                    balance: 0,
                  };
                }
                return null;
              })
              .filter(Boolean);
            receipt.multipleFees = selectedFeesData;
          } else if (
            formData.paymentType === "specific" &&
            pendingFees.length > 0
          ) {
            // For specific payment, check if multiple pending fees could be covered
            const totalAmount = parseInt(formData.amount);
            let remainingAmount = totalAmount;
            const paidFees = [];

            // Sort pending fees by amount (smallest first for better allocation)
            const sortedPendingFees = [...pendingFees].sort(
              (a, b) => a.pendingAmount - b.pendingAmount
            );

            for (const fee of sortedPendingFees) {
              if (remainingAmount >= fee.pendingAmount) {
                paidFees.push({
                  feeHead: fee.feeHead,
                  feeHeadId: fee.feeHeadId,
                  totalAmount: fee.totalAmount,
                  paidAmount: fee.paidAmount,
                  currentPayment: fee.pendingAmount,
                  balance: 0,
                });
                remainingAmount -= fee.pendingAmount;
              } else if (remainingAmount > 0) {
                paidFees.push({
                  feeHead: fee.feeHead,
                  feeHeadId: fee.feeHeadId,
                  totalAmount: fee.totalAmount,
                  paidAmount: fee.paidAmount,
                  currentPayment: remainingAmount,
                  balance: fee.pendingAmount - remainingAmount,
                });
                remainingAmount = 0;
                break;
              }
            }

            // If there are multiple fees or partial payment, use this breakdown
            if (paidFees.length > 0) {
              receipt.multipleFees = paidFees;
            }
          }
        }

        setReceiptData(receipt);
        setShowReceipt(true);
        setSuccess(
          `Student fee payment of ₹${formData.amount} ${paymentTypeText} recorded successfully! Receipt: ${response.data.payment.receiptNumber}`
        );

        // Refresh data
        fetchRecentPayments();
        if (formData.studentId) {
          fetchPendingFees(formData.studentId);
        }

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
        setPendingFees([]);
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
    setError("");
    setSuccess("");
    setPendingFees([]);
  };

  const selectedStudent = students.find((s) => s._id === formData.studentId);

  // Receipt Modal Component
  const ReceiptModal = () => {
    if (!showReceipt || !receiptData) return null;

    const printReceipt = () => {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fee Payment Receipt - ${receiptData.receiptNumber}</title>
          <style>
            body { 
              font-family: 'Times New Roman', serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
              line-height: 1.4;
              color: #000;
            }
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #000;
              background: white;
            }
            .header-border {
              height: 4px;
              background: linear-gradient(90deg, #1e40af, #3b82f6, #1e40af);
            }
            .institute-header {
              padding: 20px;
              text-align: center;
              border-bottom: 2px solid #000;
            }
            .logos-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 15px;
            }
            .logo {
              width: 70px;
              height: 70px;
              object-fit: contain;
            }
            .institute-info {
              flex: 1;
              text-align: center;
              padding: 0 20px;
            }
            .society-name {
              font-size: 10px;
              color: #666;
              margin-bottom: 5px;
              text-transform: lowercase;
            }
            .institute-name {
              font-size: 28px;
              font-weight: bold;
              color: #1e40af;
              letter-spacing: 3px;
              margin-bottom: 8px;
            }
            .institute-subtitle {
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 6px;
            }
            .institute-affiliation {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 4px;
              font-style: italic;
            }
            .institute-address {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .institute-contact {
              font-size: 10px;
              color: #6b7280;
            }
            .receipt-title {
              background: #1e40af;
              color: white;
              padding: 12px;
              margin: 0;
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .receipt-details {
              padding: 20px;
            }
            .receipt-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
              font-size: 12px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              border-bottom: 1px dotted #ddd;
              padding-bottom: 2px;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
            }
            .section-title {
              background: #f3f4f6;
              padding: 8px 15px;
              margin: 20px 0 10px 0;
              font-weight: bold;
              color: #1f2937;
              border-left: 4px solid #1e40af;
              font-size: 14px;
            }
            .student-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 15px;
              font-size: 12px;
            }
            .payment-summary {
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              border-radius: 8px;
            }
            .amount-paid {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .amount-label {
              font-size: 14px;
              opacity: 0.9;
            }
            .footer {
              background: #f9fafb;
              padding: 15px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              font-size: 10px;
              color: #6b7280;
            }
            .signature-section {
              display: flex;
              justify-content: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
            }
            .signature-box {
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 40px;
              width: 200px;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 120px;
              color: rgba(30, 64, 175, 0.05);
              font-weight: bold;
              pointer-events: none;
              z-index: 0;
            }
            @media print {
              body { background: white; }
              .receipt-container { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="watermark">NIETM</div>
          <div class="receipt-container">
            <div class="header-border"></div>
            
            <div class="institute-header">
              <div class="logos-row">
                <img src="/logo1.png" alt="NIETM Logo" class="logo" />
                <div class="institute-info">
                  <div class="society-name">maitrey education society</div>
                  <div class="institute-name">NAGARJUNA</div>
                  <div class="institute-subtitle">Institute of Engineering, Technology & Management</div>
                  <div class="institute-affiliation">(AICTE, DTE Approved & Affiliated to R.T.M. Nagpur University, Nagpur)</div>
                  <div class="institute-address">Village Satnavri, Amravati Road, Nagpur 440023</div>
                  <div class="institute-contact">📧 maitrey.ngp@gmail.com | 🌐 www.nietm.in | 📞 07118 322211, 12</div>
                </div>
                <img src="/logo.png" alt="NIETM Logo" class="logo" />
              </div>
            </div>
            
            <div class="receipt-title">FEE PAYMENT RECEIPT</div>
            
            <div style="text-align: center; margin: 10px 0; padding: 8px; background: #f0f9ff; border: 2px solid #2563eb; border-radius: 8px;">
              <div style="font-weight: bold; color: #2563eb; font-size: 14px;">
                ${
                  receiptData.paymentType === "specific"
                    ? "🎯 SPECIFIC FEE PAYMENT"
                    : receiptData.paymentType === "multiple"
                    ? "📊 MULTIPLE FEE HEADS PAYMENT"
                    : receiptData.paymentType === "annual"
                    ? "📅 ANNUAL FEE PAYMENT"
                    : receiptData.paymentType === "transport"
                    ? "🚌 TRANSPORT FEE PAYMENT"
                    : receiptData.paymentType === "hostel"
                    ? "🏠 HOSTEL FEE PAYMENT"
                    : receiptData.paymentType === "library"
                    ? "📖 LIBRARY FEE PAYMENT"
                    : receiptData.paymentType === "lab"
                    ? "🔬 LABORATORY FEE PAYMENT"
                    : receiptData.paymentType === "sports"
                    ? "⚽ SPORTS FEE PAYMENT"
                    : receiptData.paymentType === "development"
                    ? "🏗️ DEVELOPMENT FEE PAYMENT"
                    : receiptData.paymentType === "miscellaneous"
                    ? "📋 MISCELLANEOUS FEE PAYMENT"
                    : receiptData.paymentType === "salary"
                    ? "💰 SALARY PAYMENT"
                    : "💳 STUDENT FEE PAYMENT"
                }
              </div>
              <div style="font-size: 12px; color: #374151; margin-top: 4px;">
                Payment Type: ${receiptData.paymentType.toUpperCase()}
              </div>
            </div>
            
            <div class="receipt-details">
              <div class="receipt-info">
                <div>
                  <div class="info-row">
                    <span class="info-label">Receipt No:</span>
                    <span>${receiptData.receiptNumber}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span>${receiptData.date}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Time:</span>
                    <span>${receiptData.time}</span>
                  </div>
                </div>
                <div>
                  <div class="info-row">
                    <span class="info-label">Academic Year:</span>
                    <span>${receiptData.academicYear}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Payment Method:</span>
                    <span>${receiptData.paymentMethod}</span>
                  </div>
                  ${
                    receiptData.transactionId
                      ? `
                  <div class="info-row">
                    <span class="info-label">Transaction ID:</span>
                    <span>${receiptData.transactionId}</span>
                  </div>
                  `
                      : ""
                  }
                </div>
              </div>
              
              <div class="section-title">👤 STUDENT INFORMATION</div>
              <div class="student-info">
                <div>
                  <div class="info-row">
                    <span class="info-label">Student Name:</span>
                    <span>${receiptData.student?.firstName} ${
        receiptData.student?.lastName
      }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Student ID:</span>
                    <span>${receiptData.student?.studentId}</span>
                  </div>
                </div>
                <div>
                  <div class="info-row">
                    <span class="info-label">Department:</span>
                    <span>${
                      typeof receiptData.student?.department === "object"
                        ? receiptData.student?.department?.name || "N/A"
                        : receiptData.student?.department || "N/A"
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Program:</span>
                    <span>${
                      typeof receiptData.student?.program === "object"
                        ? receiptData.student?.program?.name || "N/A"
                        : receiptData.student?.program || "N/A"
                    }</span>
                  </div>
                </div>
              </div>
              
              <div class="section-title">� FEE HEAD DETAILS</div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 8px; text-align: left; border: 1px solid #d1d5db; font-weight: bold;">Fee Head</th>
                    <th style="padding: 8px; text-align: right; border: 1px solid #d1d5db; font-weight: bold;">Total Amount</th>
                    <th style="padding: 8px; text-align: right; border: 1px solid #d1d5db; font-weight: bold;">Previous Paid</th>
                    <th style="padding: 8px; text-align: right; border: 1px solid #d1d5db; font-weight: bold;">Current Payment</th>
                    <th style="padding: 8px; text-align: right; border: 1px solid #d1d5db; font-weight: bold;">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    receiptData.multipleFees &&
                    receiptData.multipleFees.length > 0
                      ? receiptData.multipleFees
                          .map(
                            (fee, index) => `
                    <tr style="background: ${
                      index % 2 === 0 ? "white" : "#f9fafb"
                    };">
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${
                        fee.feeHead
                      }</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right;">₹${fee.totalAmount.toLocaleString()}</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #059669;">₹${fee.paidAmount.toLocaleString()}</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #2563eb; font-weight: bold;">₹${fee.currentPayment.toLocaleString()}</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #dc2626;">₹${fee.balance.toLocaleString()}</td>
                    </tr>
                  `
                          )
                          .join("")
                      : receiptData.feeHead
                      ? `
                    <tr style="background: white;">
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${
                        receiptData.feeHead.title
                      }</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right;">₹${
                        receiptData.feeHead.amount
                          ? receiptData.feeHead.amount.toLocaleString()
                          : "N/A"
                      }</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #059669;">₹${(receiptData
                        .feeHead.amount
                        ? receiptData.feeHead.amount -
                          parseInt(receiptData.amount)
                        : 0
                      ).toLocaleString()}</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #2563eb; font-weight: bold;">₹${parseInt(
                        receiptData.amount
                      ).toLocaleString()}</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #dc2626;">₹${(receiptData
                        .feeHead.amount
                        ? Math.max(
                            0,
                            receiptData.feeHead.amount -
                              parseInt(receiptData.amount)
                          )
                        : 0
                      ).toLocaleString()}</td>
                    </tr>
                  `
                      : `
                    <tr style="background: white;">
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${
                        receiptData.feeHead.title
                      }</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right;">₹${
                        receiptData.feeHead.amount
                          ? receiptData.feeHead.amount.toLocaleString()
                          : "N/A"
                      }</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #059669;">₹${(receiptData
                        .feeHead.amount
                        ? Math.max(
                            0,
                            receiptData.feeHead.amount -
                              parseInt(receiptData.amount)
                          )
                        : 0
                      ).toLocaleString()}</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #2563eb; font-weight: bold;">₹${parseInt(
                        receiptData.amount
                      ).toLocaleString()}</td>
                      <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; color: #dc2626;">₹${(receiptData
                        .feeHead.amount
                        ? Math.max(
                            0,
                            receiptData.feeHead.amount -
                              parseInt(receiptData.amount)
                          )
                        : 0
                      ).toLocaleString()}</td>
                    </tr>
                  `
                  }
                </tbody>
                <tfoot>
                  <tr style="background: #dbeafe; font-weight: bold;">
                    <td style="padding: 8px; border: 1px solid #d1d5db;">TOTAL PAYMENT</td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">-</td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">-</td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; color: #1e40af; font-size: 14px;">₹${parseInt(
                      receiptData.amount
                    ).toLocaleString()}</td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">-</td>
                  </tr>
                </tfoot>
              </table>
              
              <div class="section-title">�💳 PAYMENT DETAILS</div>
              <div class="student-info">
                <div>
                  <div class="info-row">
                    <span class="info-label">Payment Type:</span>
                    <span style="text-transform: capitalize; font-weight: bold; color: #2563eb;">${
                      receiptData.paymentType
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Fee Category:</span>
                    <span style="font-weight: bold; color: #059669;">
                      ${
                        receiptData.paymentType === "specific"
                          ? "Specific Fee Payment"
                          : receiptData.paymentType === "multiple"
                          ? "Multiple Fee Heads Payment"
                          : receiptData.paymentType === "annual"
                          ? "Annual Fee Payment"
                          : receiptData.paymentType === "transport"
                          ? "Transport Fee Payment"
                          : receiptData.paymentType === "hostel"
                          ? "Hostel Fee Payment"
                          : receiptData.paymentType === "library"
                          ? "Library Fee Payment"
                          : receiptData.paymentType === "lab"
                          ? "Laboratory Fee Payment"
                          : receiptData.paymentType === "sports"
                          ? "Sports Fee Payment"
                          : receiptData.paymentType === "development"
                          ? "Development Fee Payment"
                          : receiptData.paymentType === "miscellaneous"
                          ? "Miscellaneous Fee Payment"
                          : receiptData.paymentType === "salary"
                          ? "Salary Payment"
                          : "Student Fee Payment"
                      }
                    </span>
                  </div>
                  ${
                    receiptData.paymentType === "transport"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Transport Details:</span>
                    <span style="color: #f59e0b;">🚌 Bus/Transport Fees</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    receiptData.paymentType === "hostel"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Hostel Details:</span>
                    <span style="color: #6366f1;">🏠 Accommodation Fees</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    receiptData.paymentType === "library"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Library Details:</span>
                    <span style="color: #14b8a6;">📖 Library Services</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    receiptData.paymentType === "lab"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Lab Details:</span>
                    <span style="color: #ec4899;">🔬 Laboratory Usage</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    receiptData.paymentType === "sports"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Sports Details:</span>
                    <span style="color: #10b981;">⚽ Sports Facilities</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    receiptData.paymentType === "development"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Development Details:</span>
                    <span style="color: #06b6d4;">🏗️ Infrastructure Development</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    receiptData.paymentType === "annual"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Annual Details:</span>
                    <span style="color: #f59e0b;">📅 Yearly Fee Payment</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    receiptData.paymentType === "multiple" &&
                    receiptData.multipleFees
                      ? `
                  <div class="info-row">
                    <span class="info-label">Multiple Fees:</span>
                    <span style="color: #059669;">📊 ${receiptData.multipleFees.length} Fee Head(s)</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.category
                      ? `
                  <div class="info-row">
                    <span class="info-label">Service Category:</span>
                    <span style="font-weight: bold; color: #1e40af;">${receiptData.feeTypeDetails.category}</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.manualFeeHeadName
                      ? `
                  <div class="info-row">
                    <span class="info-label">Fee Head:</span>
                    <span style="color: #059669; font-weight: bold;">💰 ${receiptData.feeTypeDetails.manualFeeHeadName}</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.manualFeeDescription
                      ? `
                  <div class="info-row">
                    <span class="info-label">Fee Details:</span>
                    <span style="color: #374151; font-weight: bold;">📝 ${receiptData.feeTypeDetails.manualFeeDescription}</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.labType
                      ? `
                  <div class="info-row">
                    <span class="info-label">Laboratory Type:</span>
                    <span style="color: #ec4899; font-weight: bold;">🔬 ${
                      receiptData.feeTypeDetails.labType
                        .charAt(0)
                        .toUpperCase() +
                      receiptData.feeTypeDetails.labType.slice(1)
                    } Lab</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.route
                      ? `
                  <div class="info-row">
                    <span class="info-label">Transport Route:</span>
                    <span style="color: #f59e0b; font-weight: bold;">🚌 ${receiptData.feeTypeDetails.route}</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.block
                      ? `
                  <div class="info-row">
                    <span class="info-label">Hostel Details:</span>
                    <span style="color: #6366f1; font-weight: bold;">🏠 Block ${
                      receiptData.feeTypeDetails.block
                    }${
                          receiptData.feeTypeDetails.roomNumber
                            ? ", Room " + receiptData.feeTypeDetails.roomNumber
                            : ""
                        }</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.feeType &&
                    receiptData.paymentType === "library"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Library Service:</span>
                    <span style="color: #14b8a6; font-weight: bold;">📖 ${
                      receiptData.feeTypeDetails.feeType
                        .charAt(0)
                        .toUpperCase() +
                      receiptData.feeTypeDetails.feeType
                        .slice(1)
                        .replace("-", " ")
                    }</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.activity
                      ? `
                  <div class="info-row">
                    <span class="info-label">Sports Activity:</span>
                    <span style="color: #10b981; font-weight: bold;">⚽ ${
                      receiptData.feeTypeDetails.activity
                        .charAt(0)
                        .toUpperCase() +
                      receiptData.feeTypeDetails.activity.slice(1)
                    }</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.purpose &&
                    receiptData.paymentType === "miscellaneous"
                      ? `
                  <div class="info-row">
                    <span class="info-label">Payment Purpose:</span>
                    <span style="color: #6b7280; font-weight: bold;">📋 ${receiptData.feeTypeDetails.purpose}</span>
                  </div>
                  `
                      : ""
                  }
                  
                  ${
                    receiptData.feeTypeDetails &&
                    receiptData.feeTypeDetails.duration
                      ? `
                  <div class="info-row">
                    <span class="info-label">Duration/Period:</span>
                    <span style="color: #8b5cf6; font-weight: bold;">⏱️ ${
                      receiptData.feeTypeDetails.duration
                        .charAt(0)
                        .toUpperCase() +
                      receiptData.feeTypeDetails.duration
                        .slice(1)
                        .replace("-", " ")
                    }</span>
                  </div>
                  `
                      : ""
                  }
                  
                  <div class="info-row">
                    <span class="info-label">Description:</span>
                    <span>${receiptData.description}</span>
                  </div>
                </div>
                <div>
                  ${
                    receiptData.collectedBy
                      ? `
                  <div class="info-row">
                    <span class="info-label">Collected By:</span>
                    <span>${receiptData.collectedBy}</span>
                  </div>
                  `
                      : ""
                  }
                  ${
                    receiptData.remarks
                      ? `
                  <div class="info-row">
                    <span class="info-label">Remarks:</span>
                    <span>${receiptData.remarks}</span>
                  </div>
                  `
                      : ""
                  }
                  <div class="info-row">
                    <span class="info-label">Payment Status:</span>
                    <span style="color: #059669; font-weight: bold;">PAID</span>
                  </div>
                </div>
              </div>
              
              <div class="payment-summary">
                <div class="amount-label">TOTAL AMOUNT PAID</div>
                <div class="amount-paid">₹${parseInt(
                  receiptData.amount
                ).toLocaleString()}</div>
                <div class="amount-label">Amount in Words: ${numberToWords(
                  parseInt(receiptData.amount)
                )} Rupees Only</div>
              </div>
              
              <div class="signature-section">
                <div style="text-align: center;">
                  <div class="signature-box">Cashier Signature</div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Note:</strong> This is a computer-generated receipt and is valid without signature.</p>
              <p>Please retain this receipt for your records. For any queries, contact the accounts department.</p>
              <p>Generated on ${receiptData.date} at ${
        receiptData.time
      } | Document ID: NIETM-FEE-${receiptData.receiptNumber}</p>
            </div>
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              🧾 Official Payment Receipt
            </h2>
            <button
              onClick={() => setShowReceipt(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          <div className="p-6 space-y-6" id="receipt-content">
            {/* Professional Receipt Preview */}
            <div className="border-2 border-gray-300 bg-white">
              {/* Header Border */}
              <div className="h-1 bg-gradient-to-r from-blue-800 via-blue-600 to-blue-800"></div>

              {/* Institute Header */}
              <div className="p-6 border-b-2 border-gray-900">
                <div className="flex items-center justify-between gap-6 mb-4">
                  <img
                    src="/logo1.png"
                    alt="NIETM Logo"
                    className="w-16 h-16 object-contain"
                  />
                  <div className="flex-1 text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      maitrey education society
                    </div>
                    <h3 className="text-3xl font-bold text-blue-900 mb-1 tracking-widest">
                      NAGARJUNA
                    </h3>
                    <div className="text-lg font-semibold text-gray-700 mb-1">
                      Institute of Engineering, Technology & Management
                    </div>
                    <div className="text-xs text-gray-600 mb-1 italic">
                      (AICTE, DTE Approved & Affiliated to R.T.M. Nagpur
                      University, Nagpur)
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      Village Satnavri, Amravati Road, Nagpur 440023
                    </div>
                    <div className="text-xs text-gray-600">
                      📧 maitrey.ngp@gmail.com | 🌐 www.nietm.in | 📞 07118
                      322211, 12
                    </div>
                  </div>
                  <img
                    src="/logo.png"
                    alt="NIETM Logo"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>

              {/* Receipt Title */}
              <div className="bg-blue-900 text-white py-3 text-center">
                <h4 className="text-xl font-bold tracking-wider">
                  FEE PAYMENT RECEIPT
                </h4>
              </div>

              {/* Fee Type Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 py-3 text-center">
                <div className="font-bold text-blue-800 text-lg">
                  {receiptData.paymentType === "specific"
                    ? "🎯 SPECIFIC FEE PAYMENT"
                    : receiptData.paymentType === "multiple"
                    ? "📊 MULTIPLE FEE HEADS PAYMENT"
                    : receiptData.paymentType === "annual"
                    ? "📅 ANNUAL FEE PAYMENT"
                    : receiptData.paymentType === "transport"
                    ? "🚌 TRANSPORT FEE PAYMENT"
                    : receiptData.paymentType === "hostel"
                    ? "🏠 HOSTEL FEE PAYMENT"
                    : receiptData.paymentType === "library"
                    ? "📖 LIBRARY FEE PAYMENT"
                    : receiptData.paymentType === "lab"
                    ? "🔬 LABORATORY FEE PAYMENT"
                    : receiptData.paymentType === "sports"
                    ? "⚽ SPORTS FEE PAYMENT"
                    : receiptData.paymentType === "development"
                    ? "🏗️ DEVELOPMENT FEE PAYMENT"
                    : receiptData.paymentType === "miscellaneous"
                    ? "📋 MISCELLANEOUS FEE PAYMENT"
                    : receiptData.paymentType === "salary"
                    ? "💰 SALARY PAYMENT"
                    : "💳 STUDENT FEE PAYMENT"}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Payment Type:{" "}
                  <span className="font-semibold uppercase">
                    {receiptData.paymentType}
                  </span>
                </div>
              </div>

              {/* Receipt Content */}
              <div className="p-6">
                {/* Receipt Details */}
                <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                      <span className="font-semibold text-gray-700">
                        Receipt No:
                      </span>
                      <span className="font-mono">
                        {receiptData.receiptNumber}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                      <span className="font-semibold text-gray-700">Date:</span>
                      <span>{receiptData.date}</span>
                    </div>
                    <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                      <span className="font-semibold text-gray-700">Time:</span>
                      <span>{receiptData.time}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                      <span className="font-semibold text-gray-700">
                        Academic Year:
                      </span>
                      <span>{receiptData.academicYear}</span>
                    </div>
                    <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                      <span className="font-semibold text-gray-700">
                        Payment Method:
                      </span>
                      <span>{receiptData.paymentMethod}</span>
                    </div>
                    {receiptData.transactionId && (
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                        <span className="font-semibold text-gray-700">
                          Transaction ID:
                        </span>
                        <span className="font-mono">
                          {receiptData.transactionId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Information */}
                <div className="mb-6">
                  <div className="bg-gray-100 px-4 py-2 border-l-4 border-blue-600 mb-3">
                    <h5 className="font-bold text-gray-900">
                      👤 STUDENT INFORMATION
                    </h5>
                  </div>
                  <div className="grid grid-cols-2 gap-8 text-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                        <span className="font-semibold text-gray-700">
                          Student Name:
                        </span>
                        <span>
                          {receiptData.student?.firstName}{" "}
                          {receiptData.student?.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                        <span className="font-semibold text-gray-700">
                          Student ID:
                        </span>
                        <span className="font-mono">
                          {receiptData.student?.studentId}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                        <span className="font-semibold text-gray-700">
                          Department:
                        </span>
                        <span>
                          {typeof receiptData.student?.department === "object"
                            ? receiptData.student?.department?.name || "N/A"
                            : receiptData.student?.department || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                        <span className="font-semibold text-gray-700">
                          Program:
                        </span>
                        <span>
                          {typeof receiptData.student?.program === "object"
                            ? receiptData.student?.program?.name || "N/A"
                            : receiptData.student?.program || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fee Head Details */}
                <div className="mb-6">
                  <div className="bg-gray-100 px-4 py-2 border-l-4 border-blue-600 mb-3">
                    <h5 className="font-bold text-gray-900">
                      💰 FEE HEAD DETAILS
                    </h5>
                  </div>

                  {/* Fee Head Breakdown Table */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">
                            Fee Head
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b">
                            Total Amount
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b">
                            Previous Paid
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b">
                            Current Payment
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptData.multipleFees &&
                        receiptData.multipleFees.length > 0 ? (
                          // Show multiple fee heads breakdown
                          receiptData.multipleFees.map((fee, index) => (
                            <tr
                              key={index}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-4 py-3 border-b border-gray-200 font-medium">
                                {fee.feeHead}
                              </td>
                              <td className="px-4 py-3 border-b border-gray-200 text-right">
                                ₹{fee.totalAmount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 border-b border-gray-200 text-right text-green-600">
                                ₹{fee.paidAmount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 border-b border-gray-200 text-right text-blue-600 font-semibold">
                                ₹{fee.currentPayment.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 border-b border-gray-200 text-right text-red-600">
                                ₹{fee.balance.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : receiptData.feeHead ? (
                          // Show specific fee head details
                          <tr className="bg-white">
                            <td className="px-4 py-3 border-b border-gray-200 font-medium">
                              {receiptData.feeHead.title}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 text-right">
                              ₹
                              {receiptData.feeHead.amount
                                ? receiptData.feeHead.amount.toLocaleString()
                                : "N/A"}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 text-right text-green-600">
                              ₹
                              {(receiptData.feeHead.amount
                                ? Math.max(
                                    0,
                                    receiptData.feeHead.amount -
                                      parseInt(receiptData.amount)
                                  )
                                : 0
                              ).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 text-right text-blue-600 font-semibold">
                              ₹{parseInt(receiptData.amount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 text-right text-red-600">
                              ₹
                              {(receiptData.feeHead.amount
                                ? Math.max(
                                    0,
                                    receiptData.feeHead.amount -
                                      parseInt(receiptData.amount)
                                  )
                                : 0
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ) : (
                          // Show general payment
                          <tr className="bg-white">
                            <td className="px-4 py-3 border-b border-gray-200 font-medium">
                              {receiptData.feeHead.title}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 text-right">
                              ₹
                              {receiptData.feeHead.amount
                                ? receiptData.feeHead.amount.toLocaleString()
                                : "N/A"}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 text-right text-green-600">
                              ₹
                              {(receiptData.feeHead.amount
                                ? Math.max(
                                    0,
                                    receiptData.feeHead.amount -
                                      parseInt(receiptData.amount)
                                  )
                                : 0
                              ).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 text-right text-blue-600 font-semibold">
                              ₹{parseInt(receiptData.amount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 border-b border-gray-200 text-right text-red-600">
                              ₹
                              {(receiptData.feeHead.amount
                                ? Math.max(
                                    0,
                                    receiptData.feeHead.amount -
                                      parseInt(receiptData.amount)
                                  )
                                : 0
                              ).toLocaleString()}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-blue-100">
                        <tr>
                          <td className="px-4 py-3 font-bold text-gray-800">
                            TOTAL PAYMENT
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            -
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            -
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-800 text-lg">
                            ₹{parseInt(receiptData.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            -
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="mb-6">
                  <div className="bg-gray-100 px-4 py-2 border-l-4 border-blue-600 mb-3">
                    <h5 className="font-bold text-gray-900">
                      💳 PAYMENT DETAILS
                    </h5>
                  </div>
                  <div className="grid grid-cols-2 gap-8 text-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                        <span className="font-semibold text-gray-700">
                          Payment Type:
                        </span>
                        <span className="capitalize font-bold text-blue-600">
                          {receiptData.paymentType}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                        <span className="font-semibold text-gray-700">
                          Fee Category:
                        </span>
                        <span className="font-bold text-green-600">
                          {receiptData.paymentType === "specific"
                            ? "Specific Fee Payment"
                            : receiptData.paymentType === "multiple"
                            ? "Multiple Fee Heads Payment"
                            : receiptData.paymentType === "annual"
                            ? "Annual Fee Payment"
                            : receiptData.paymentType === "transport"
                            ? "Transport Fee Payment"
                            : receiptData.paymentType === "hostel"
                            ? "Hostel Fee Payment"
                            : receiptData.paymentType === "library"
                            ? "Library Fee Payment"
                            : receiptData.paymentType === "lab"
                            ? "Laboratory Fee Payment"
                            : receiptData.paymentType === "sports"
                            ? "Sports Fee Payment"
                            : receiptData.paymentType === "development"
                            ? "Development Fee Payment"
                            : receiptData.paymentType === "miscellaneous"
                            ? "Miscellaneous Fee Payment"
                            : receiptData.paymentType === "salary"
                            ? "Salary Payment"
                            : "Student Fee Payment"}
                        </span>
                      </div>
                      {/* Additional Fee Type Details */}
                      {receiptData.paymentType === "transport" && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Transport Details:
                          </span>
                          <span className="text-orange-600">
                            🚌 Bus/Transport Fees
                          </span>
                        </div>
                      )}
                      {receiptData.paymentType === "hostel" && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Hostel Details:
                          </span>
                          <span className="text-indigo-600">
                            🏠 Accommodation Fees
                          </span>
                        </div>
                      )}
                      {receiptData.paymentType === "library" && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Library Details:
                          </span>
                          <span className="text-teal-600">
                            📖 Library Services
                          </span>
                        </div>
                      )}
                      {receiptData.paymentType === "lab" && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Lab Details:
                          </span>
                          <span className="text-pink-600">
                            🔬 Laboratory Usage
                          </span>
                        </div>
                      )}
                      {receiptData.paymentType === "sports" && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Sports Details:
                          </span>
                          <span className="text-emerald-600">
                            ⚽ Sports Facilities
                          </span>
                        </div>
                      )}
                      {receiptData.paymentType === "development" && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Development Details:
                          </span>
                          <span className="text-cyan-600">
                            🏗️ Infrastructure Development
                          </span>
                        </div>
                      )}
                      {receiptData.paymentType === "annual" && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Annual Details:
                          </span>
                          <span className="text-orange-600">
                            📅 Yearly Fee Payment
                          </span>
                        </div>
                      )}
                      {receiptData.paymentType === "multiple" &&
                        receiptData.multipleFees && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Multiple Fees:
                            </span>
                            <span className="text-green-600">
                              📊 {receiptData.multipleFees.length} Fee Head(s)
                            </span>
                          </div>
                        )}
                      {receiptData.feeHead && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Primary Fee Head:
                          </span>
                          <span>{receiptData.feeHead.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                        <span className="font-semibold text-gray-700">
                          Description:
                        </span>
                        <span>{receiptData.description}</span>
                      </div>

                      {/* Detailed Fee Type Information */}
                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.category && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Service Category:
                            </span>
                            <span className="font-bold text-blue-600">
                              {receiptData.feeTypeDetails.category}
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.manualFeeHeadName && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Fee Head:
                            </span>
                            <span className="text-green-600 font-bold">
                              💰 {receiptData.feeTypeDetails.manualFeeHeadName}
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.manualFeeDescription && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Fee Details:
                            </span>
                            <span className="text-gray-700 font-bold">
                              📝{" "}
                              {receiptData.feeTypeDetails.manualFeeDescription}
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.labType && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Laboratory Type:
                            </span>
                            <span className="text-pink-600 font-bold">
                              🔬{" "}
                              {receiptData.feeTypeDetails.labType
                                .charAt(0)
                                .toUpperCase() +
                                receiptData.feeTypeDetails.labType.slice(
                                  1
                                )}{" "}
                              Lab
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.route && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Transport Route:
                            </span>
                            <span className="text-yellow-600 font-bold">
                              🚌 {receiptData.feeTypeDetails.route}
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.block && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Hostel Details:
                            </span>
                            <span className="text-indigo-600 font-bold">
                              🏠 Block {receiptData.feeTypeDetails.block}
                              {receiptData.feeTypeDetails.roomNumber
                                ? ", Room " +
                                  receiptData.feeTypeDetails.roomNumber
                                : ""}
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.feeType &&
                        receiptData.paymentType === "library" && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Library Service:
                            </span>
                            <span className="text-teal-600 font-bold">
                              📖{" "}
                              {receiptData.feeTypeDetails.feeType
                                .charAt(0)
                                .toUpperCase() +
                                receiptData.feeTypeDetails.feeType
                                  .slice(1)
                                  .replace("-", " ")}
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.activity && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Sports Activity:
                            </span>
                            <span className="text-green-600 font-bold">
                              ⚽{" "}
                              {receiptData.feeTypeDetails.activity
                                .charAt(0)
                                .toUpperCase() +
                                receiptData.feeTypeDetails.activity.slice(1)}
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.purpose &&
                        receiptData.paymentType === "miscellaneous" && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Payment Purpose:
                            </span>
                            <span className="text-gray-600 font-bold">
                              📋 {receiptData.feeTypeDetails.purpose}
                            </span>
                          </div>
                        )}

                      {receiptData.feeTypeDetails &&
                        receiptData.feeTypeDetails.duration && (
                          <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                            <span className="font-semibold text-gray-700">
                              Duration/Period:
                            </span>
                            <span className="text-purple-600 font-bold">
                              ⏱️{" "}
                              {receiptData.feeTypeDetails.duration
                                .charAt(0)
                                .toUpperCase() +
                                receiptData.feeTypeDetails.duration
                                  .slice(1)
                                  .replace("-", " ")}
                            </span>
                          </div>
                        )}
                      {receiptData.collectedBy && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Collected By:
                          </span>
                          <span>{receiptData.collectedBy}</span>
                        </div>
                      )}
                      {receiptData.remarks && (
                        <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                          <span className="font-semibold text-gray-700">
                            Remarks:
                          </span>
                          <span>{receiptData.remarks}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount Section */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg text-center mb-6">
                  <div className="text-sm opacity-90 mb-2">
                    TOTAL AMOUNT PAID
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    ₹{parseInt(receiptData.amount).toLocaleString()}
                  </div>
                  <div className="text-sm opacity-90">
                    Amount in Words:{" "}
                    {(() => {
                      const num = parseInt(receiptData.amount);
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
                      if (num < 0) return "Negative";

                      let result = "";
                      let tempNum = num;

                      if (tempNum >= 10000000) {
                        result +=
                          ones[Math.floor(tempNum / 10000000)] + " Crore ";
                        tempNum %= 10000000;
                      }

                      if (tempNum >= 100000) {
                        const lakhDigit = Math.floor(tempNum / 100000);
                        if (lakhDigit < 10) {
                          result += ones[lakhDigit] + " Lakh ";
                        }
                        tempNum %= 100000;
                      }

                      if (tempNum >= 1000) {
                        const thousandDigit = Math.floor(tempNum / 1000);
                        if (thousandDigit < 10) {
                          result += ones[thousandDigit] + " Thousand ";
                        } else if (thousandDigit < 20) {
                          result += teens[thousandDigit - 10] + " Thousand ";
                        } else {
                          result +=
                            tens[Math.floor(thousandDigit / 10)] +
                            " " +
                            ones[thousandDigit % 10] +
                            " Thousand ";
                        }
                        tempNum %= 1000;
                      }

                      if (tempNum >= 100) {
                        result += ones[Math.floor(tempNum / 100)] + " Hundred ";
                        tempNum %= 100;
                      }

                      if (tempNum >= 20) {
                        result += tens[Math.floor(tempNum / 10)] + " ";
                        tempNum %= 10;
                      } else if (tempNum >= 10) {
                        result += teens[tempNum - 10] + " ";
                        tempNum = 0;
                      }

                      if (tempNum > 0) {
                        result += ones[tempNum] + " ";
                      }

                      return result.trim();
                    })()}{" "}
                    Rupees Only
                  </div>
                </div>

                {/* Signature Section */}
                <div className="flex justify-center text-center text-sm border-t border-gray-300 pt-6">
                  <div className="w-64">
                    <div className="h-12"></div>
                    <div className="border-t border-gray-800 pt-2 font-medium">
                      Cashier Signature
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-center text-xs text-gray-600">
                <p className="font-medium mb-1">
                  📝 This is a computer-generated receipt and is valid without
                  signature.
                </p>
                <p className="mb-1">
                  Please retain this receipt for your records. For any queries,
                  contact the accounts department.
                </p>
                <p>
                  Generated on {receiptData.date} at {receiptData.time} |
                  Document ID: NIETM-FEE-{receiptData.receiptNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="border-t border-gray-200 p-4 flex justify-end space-x-3">
            <button
              onClick={printReceipt}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <span className="mr-2">🖨️</span>
              Print Receipt
            </button>
            <button
              onClick={() => setShowReceipt(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
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
                    <span>{students.length} Students</span>
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
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-xl mr-2">👤</span>
                    Student Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="relative">
                      <label className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                        <span className="mr-2">👤</span>
                        Select Student *
                      </label>
                      <div className="relative">
                        <select
                          name="studentId"
                          value={formData.studentId}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-medium transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                        >
                          <option value="">-- Select Student --</option>
                          {students.map((student) => (
                            <option key={student._id} value={student._id}>
                              {student.firstName} {student.lastName} (
                              {student.studentId})
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <span className="text-xl">🎓</span>
                        </div>
                      </div>
                    </div>

                    {selectedStudent && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 animate-fadeIn shadow-md">
                        <h4 className="font-bold text-blue-900 mb-4 text-lg flex items-center">
                          <span className="mr-2">📋</span>
                          Student Profile
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center bg-white rounded-lg p-3 shadow-sm">
                            <span className="mr-3 text-blue-600">🏛️</span>
                            <span className="font-medium text-gray-700 min-w-[80px]">
                              Department:
                            </span>
                            <span className="text-blue-800 font-semibold">
                              {typeof selectedStudent.department === "object"
                                ? selectedStudent.department?.name || "N/A"
                                : selectedStudent.department || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center bg-white rounded-lg p-3 shadow-sm">
                            <span className="mr-3 text-green-600">📚</span>
                            <span className="font-medium text-gray-700 min-w-[80px]">
                              Program:
                            </span>
                            <span className="text-green-800 font-semibold">
                              {typeof selectedStudent.program === "object"
                                ? selectedStudent.program?.name || "N/A"
                                : selectedStudent.program || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center bg-white rounded-lg p-3 shadow-sm">
                            <span className="mr-3 text-purple-600">📈</span>
                            <span className="font-medium text-gray-700 min-w-[80px]">
                              Semester:
                            </span>
                            <span className="text-purple-800 font-semibold">
                              {selectedStudent.currentSemester}
                            </span>
                          </div>
                          {selectedStudent.email && (
                            <div className="flex items-center bg-white rounded-lg p-3 shadow-sm">
                              <span className="mr-3 text-red-600">📧</span>
                              <span className="font-medium text-gray-700 min-w-[80px]">
                                Email:
                              </span>
                              <span className="text-red-800 font-semibold">
                                {selectedStudent.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pending Fees Section - Only for Specific Payment */}
                  {selectedStudent &&
                    formData.paymentType === "specific" &&
                    pendingFees.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <span className="text-xl mr-2">⏰</span>
                          Pending Fees
                        </h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingFees.map((fee, index) => (
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
                  {selectedStudent && formData.paymentType === "multiple" && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="text-xl mr-2">📊</span>
                        Select Multiple Fee Heads
                      </h4>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        {pendingFees.length > 0 ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              {pendingFees.map((fee, index) => (
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
                                          const pendingFee = pendingFees.find(
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
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
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
                                      const fee = pendingFees.find(
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
                                          <span className="font-bold text-green-700 text-lg">
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
                                          const fee = pendingFees.find(
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
                                        selectedFeeHeads: pendingFees.map(
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
                                      const totalAmount =
                                        formData.selectedFeeHeads.reduce(
                                          (total, feeHeadId) => {
                                            const fee = pendingFees.find(
                                              (f) => f.feeHeadId === feeHeadId
                                            );
                                            return (
                                              total +
                                              (fee ? fee.pendingAmount : 0)
                                            );
                                          },
                                          0
                                        );
                                      setFormData((prev) => ({
                                        ...prev,
                                        amount: totalAmount.toString(),
                                        description: `Multiple Fee Payment - ${formData.selectedFeeHeads.length} fee heads`,
                                      }));
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
                    pendingFees.length === 0 && (
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
              {formData.paymentType === "specific" && (
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
              )}

              {/* Payment Details */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">💳</span>
                  Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      min="0"
                      step="0.01"
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
                      <option value="Online">� Online</option>
                      <option value="Bank Transfer">🏦 Bank Transfer</option>
                      <option value="Card">� Card</option>
                      <option value="UPI">📱 UPI</option>
                    </select>
                  </div>

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
    </>
  );
}
