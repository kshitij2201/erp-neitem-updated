import React, { useState, useEffect } from "react";
// Use ExcelJS browser-friendly build to avoid CJS resolution issues with Vite
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || "https://backenderp.tarstech.in";

const Receipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [receiptsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    totalPages: 0,
    totalReceipts: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editReceipt, setEditReceipt] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    status: "",
    remarks: "",
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showExportForm, setShowExportForm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormData, setExportFormData] = useState({
    stream: '',
    department: '',
    year: '',
    semester: '',
    feeTypes: []
  });
  const [semesters, setSemesters] = useState([]);
  const [semestersLoading, setSemestersLoading] = useState(false);

  useEffect(() => {
    fetchReceipts();
    fetchSemesters();
  }, [currentPage]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (showReceiptModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showReceiptModal]);

  // Close export form when pressing ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showExportForm) {
        setShowExportForm(false);
      }
    };

    if (showExportForm) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showExportForm]);

  const fetchSemesters = async () => {
    try {
      setSemestersLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch(`${API_URL}/api/superadmin/semesters`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Filter semesters where _id is "68e4bbaa006a2091da093713" as per user requirement
      const filteredSemesters = Array.isArray(data) ? data.filter(sem => sem._id === "68e4bbaa006a2091da093713") : [];
      setSemesters(filteredSemesters);
    } catch (err) {
      console.error("Fetch semesters error:", err);
      setSemesters([]);
    } finally {
      setSemestersLoading(false);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(""); // Clear previous errors

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("type", typeFilter);
      params.append("page", currentPage);
      params.append("limit", receiptsPerPage);

      console.log("Fetching receipts with params:", params.toString());
      const response = await fetch(
        `${API_URL}/api/receipts?${params}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received data:", data);

      // Ensure receipts is an array and has proper structure
      const receiptsArray = Array.isArray(data.receipts) ? data.receipts : [];

      // Log any receipts with potential issues
      const invalidReceipts = receiptsArray.filter(
        (r) => !r || typeof r !== "object" || !r._id
      );
      if (invalidReceipts.length > 0) {
        console.warn("Found receipts with invalid structure:", invalidReceipts);
      }

      // Remove duplicate receipts based on _id and receiptNumber
      const uniqueReceipts = [];
      const seenIds = new Set();
      const seenReceiptNumbers = new Set();
      
      receiptsArray.forEach((receipt) => {
        if (receipt && receipt._id) {
          // Use both _id and receiptNumber to identify duplicates
          const uniqueKey = receipt.receiptNumber || receipt._id;
          
          if (!seenIds.has(receipt._id) && !seenReceiptNumbers.has(uniqueKey)) {
            seenIds.add(receipt._id);
            if (receipt.receiptNumber) {
              seenReceiptNumbers.add(receipt.receiptNumber);
            }
            uniqueReceipts.push(receipt);
          }
        }
      });

      console.log(`📊 Total receipts: ${receiptsArray.length}, Unique receipts: ${uniqueReceipts.length}, Duplicates removed: ${receiptsArray.length - uniqueReceipts.length}`);
      
      if (uniqueReceipts.length > 0) {
        console.log("Sample receipt:", uniqueReceipts[0]);
      }

      setReceipts(uniqueReceipts);
      setPagination(
        data.pagination || {
          totalPages: 0,
          totalReceipts: 0,
          hasNext: false,
          hasPrev: false,
        }
      );
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Error fetching receipts: " + err.message);
      setReceipts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchReceipts();
  };

  const handleViewReceipt = async (receipt) => {
    try {
      setError(""); // Clear any previous errors

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (receipt.type === "student") {
        // Fetch full payment details with student info
        const paymentResponse = await fetch(
          `${API_URL}/api/receipts/student/${receipt._id}`,
          { headers }
        );
        if (!paymentResponse.ok) {
          throw new Error("Failed to fetch payment details");
        }
        const paymentData = await paymentResponse.json();

        // Create receipt data and show modal
        const formattedReceipt = {
          receiptNumber:
            paymentData.receiptNumber || `NIETM${paymentData._id.slice(-8)}`,
          date: new Date(paymentData.paymentDate).toLocaleDateString(),
          time: new Date(paymentData.paymentDate).toLocaleTimeString(),
          academicYear: paymentData.academicYear || "2025-26",
          paymentMethod: paymentData.paymentMethod,
          transactionId: paymentData.transactionId,
          utr: paymentData.utr || "",
          amount: paymentData.amount,
          description: paymentData.description || "Fee Payment",
          bankName: paymentData.bankName || "N/A",
          bankLocation: paymentData.bankLocation || "N/A",
          student: {
            firstName: paymentData.studentId?.firstName || "N/A",
            lastName: paymentData.studentId?.lastName || "",
            studentId: paymentData.studentId?.studentId || "N/A",
            admissionNumber: paymentData.studentId?.admissionNumber || paymentData.studentId?.studentId || "N/A",
            department: paymentData.studentId?.department || "N/A",
            program: paymentData.studentId?.program || "N/A",
            caste: paymentData.studentId?.casteCategory || "N/A",
            rollNumber: paymentData.studentId?.rollNo || "N/A",
            section: paymentData.studentId?.section || "N/A"
          },
          feeHead: paymentData.feeHead?.title || "General Fee",
          paymentType: "specific",
          collectedBy: paymentData.collectedBy || "Cashier",
          remarks: paymentData.remarks || "",
        };
        
        setReceiptData(formattedReceipt);
        setShowReceiptModal(true);
      } else if (receipt.type === "salary") {
        // For salary receipts, fetch salary details and generate salary slip
        await handleViewSalarySlip(receipt);
      } else {
        throw new Error("Unknown receipt type");
      }
    } catch (err) {
      console.error("Error in handleViewReceipt:", err);
      setError("Error fetching receipt details: " + err.message);
    }
  };

  const handleViewSalarySlip = async (receipt) => {
    try {
      setLoading(true);
      console.log("Viewing salary slip for receipt:", receipt);

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Extract employee name from receipt
      const employeeName = receipt.recipientName;
      if (!employeeName) {
        throw new Error("Employee name not found in receipt");
      }

      // Fetch faculty data to get complete employee information
      const facultyRes = await fetch(
        `${API_URL}/api/faculty`,
        {
          headers,
        }
      );
      if (!facultyRes.ok) {
        throw new Error("Failed to fetch faculty data");
      }
      const facultyData = await facultyRes.json();

      // Find faculty member by name
      let facultyMember = facultyData.find(
        (f) =>
          f.personalInfo?.fullName === employeeName ||
          f.fullName === employeeName ||
          `${f.personalInfo?.firstName || f.firstName || ""} ${
            f.personalInfo?.lastName || f.lastName || ""
          }`.trim() === employeeName
      );

      if (!facultyMember) {
        throw new Error(`Faculty member "${employeeName}" not found`);
      }

      // Fetch salary record details
      const salaryRes = await fetch(
        `${API_URL}/api/faculty/salary`,
        {
          headers,
        }
      );
      if (!salaryRes.ok) {
        throw new Error("Failed to fetch salary records");
      }
      const salaryRecords = await salaryRes.json();

      // Find the salary record that matches this receipt
      // We can match by employee name and amount, or use the receipt ID if it's stored
      const salaryRecord = salaryRecords.find(
        (record) =>
          (record.employeeName === employeeName ||
            record.name === employeeName) &&
          Math.abs(
            parseFloat(record.grossSalary || record.amount || 0) -
              parseFloat(receipt.amount || 0)
          ) < 1
      );

      if (!salaryRecord) {
        throw new Error(
          `No salary record found for ${employeeName} with amount ₹${receipt.amount}`
        );
      }

      // Create salary slip object similar to the one in IncomeTax.jsx
      const slip = {
        faculty: facultyMember,
        month: getMonthFromReceipt(receipt),
        year: getYearFromReceipt(receipt),
        basicSalary: parseFloat(salaryRecord.basicSalary || 0),
        allowances: {
          hra: parseFloat(salaryRecord.allowances?.hra || 0),
          da: parseFloat(salaryRecord.allowances?.da || 0),
          medical: parseFloat(salaryRecord.allowances?.medicalAllowance || 0),
          transport: parseFloat(
            salaryRecord.allowances?.transportAllowance || 0
          ),
          cla: parseFloat(salaryRecord.allowances?.claAllowance || 0),
          others: parseFloat(salaryRecord.allowances?.otherAllowances || 0),
        },
        deductions: {
          pf: parseFloat(
            salaryRecord.deductions?.epf || salaryRecord.deductions?.pf || 0
          ),
          esi: parseFloat(salaryRecord.deductions?.esi || 0),
          professionalTax: parseFloat(
            salaryRecord.deductions?.professionalTax || 0
          ),
          tds: parseFloat(salaryRecord.deductions?.tds || 0),
          incomeTax: parseFloat(salaryRecord.deductions?.incomeTax || 0),
          others: parseFloat(salaryRecord.deductions?.otherDeductions || 0),
        },
        grossSalary: parseFloat(
          salaryRecord.grossSalary || salaryRecord.amount || 0
        ),
        totalDeductions: parseFloat(salaryRecord.totalDeductions || 0),
        netSalary: parseFloat(salaryRecord.netSalary || 0),
        salaryStatus: salaryRecord.status || "Calculated",
        paymentId: salaryRecord._id,
        paymentDate: salaryRecord.paymentDate || receipt.paymentDate,
        generatedOn: new Date().toLocaleDateString(),
        salaryType: salaryRecord.salaryType || "Calculated Salary",
        hraRate: salaryRecord.hraRate || "15%",
        city: salaryRecord.city || "N/A",
      };

      // Generate and display the salary slip
      printSalarySlipAuto(slip);
    } catch (err) {
      console.error("Error viewing salary slip:", err);
      setError("Error viewing salary slip: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to extract month/year from receipt
  const getMonthFromReceipt = (receipt) => {
    // Try to extract month from receipt date or description
    if (receipt.paymentDate) {
      const date = new Date(receipt.paymentDate);
      const monthNames = [
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
      return monthNames[date.getMonth()];
    }
    return "Unknown";
  };

  const getYearFromReceipt = (receipt) => {
    // Try to extract year from receipt date
    if (receipt.paymentDate) {
      const date = new Date(receipt.paymentDate);
      return date.getFullYear();
    }
    return new Date().getFullYear();
  };

  // Import the salary slip function from IncomeTax.jsx
  const printSalarySlipAuto = (slip) => {
    if (!slip) return;

    // Get faculty name safely
    let facultyName = "Unknown Employee";
    if (slip.faculty) {
      if (slip.faculty.personalInfo?.fullName) {
        facultyName = slip.faculty.personalInfo.fullName;
      } else if (slip.faculty.firstName || slip.faculty.lastName) {
        const firstName = slip.faculty.firstName || "";
        const lastName = slip.faculty.lastName || "";
        facultyName = `${firstName} ${lastName}`.trim();
      } else if (slip.faculty.fullName) {
        facultyName = slip.faculty.fullName;
      }
    }

    // Get employee details safely
    const employeeId =
      slip.faculty?.personalInfo?.employeeId ||
      slip.faculty?.employeeId ||
      "N/A";
    const department =
      slip.faculty?.personalInfo?.department ||
      slip.faculty?.department ||
      "N/A";
    const designation =
      slip.faculty?.personalInfo?.designation ||
      slip.faculty?.employmentInfo?.designation ||
      "N/A";
    const joiningDate =
      slip.faculty?.personalInfo?.joiningDate ||
      slip.faculty?.employmentInfo?.joiningDate ||
      "N/A";

    const printWindow = window.open("", "_blank");
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Slip - ${facultyName}</title>
          <style>
            body { 
              font-family: 'Times New Roman', serif; 
              margin: 0; 
              padding: 10px; 
              background: white;
              line-height: 1.2;
              color: #000;
            }
            .slip-container {
              width: 148mm;
              height: 210mm;
              max-width: none;
              margin: 0 auto 5mm auto;
              border: 1px solid #000;
              background: white;
              page-break-inside: avoid;
              transform: scale(1);
              transform-origin: top left;
            }
            .header-border {
              height: 2px;
              background: linear-gradient(90deg, #1e40af, #3b82f6, #1e40af);
            }
            .institute-header {
              padding: 8px;
              text-align: center;
              border-bottom: 1px solid #000;
            }
            .logos-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .logo {
              width: 60px;
              height: 60px;
              object-fit: contain;
            }
            .institute-info {
              flex: 1;
              text-align: center;
              padding: 0 10px;
            }
            .society-name {
              font-size: 12px;
              color: #666;
              margin-bottom: 2px;
              text-transform: lowercase;
            }
            .institute-name {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
              letter-spacing: 1px;
              margin-bottom: 3px;
            }
            .institute-subtitle {
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 2px;
            }
            .institute-affiliation {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 2px;
              font-style: italic;
            }
            .institute-address {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 2px;
            }
            .institute-contact {
              font-size: 10px;
              color: #6b7280;
            }
            .slip-title {
              background: #1e40af;
              color: white;
              padding: 8px;
              margin: 0;
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .slip-details {
              padding: 16px;
            }
            .slip-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
              border-bottom: 1px dotted #ddd;
              padding-bottom: 1px;
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
              font-size: 16px;
            }
            .emp-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 12px;
              font-size: 12px;
            }
            .salary-table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
              font-size: 12px;
            }
            .salary-table th,
            .salary-table td {
              border: 1px solid #d1d5db;
              padding: 6px;
              text-align: left;
            }
            .salary-table th {
              background: #f3f4f6;
              font-weight: bold;
            }
            .total-row {
              background: #e5f3ff;
              font-weight: bold;
            }
            .net-salary {
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              border-radius: 8px;
            }
            .net-amount {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .amount-label {
              font-size: 14px;
              opacity: 0.9;
            }
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 50px;
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
            }
            .signature-box {
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 8px;
              margin-top: 40px;
            }
            .footer {
              background: #f9fafb;
              padding: 15px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
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
              body { background: white; margin: 0; padding: 3mm; }
              .slip-container { border: 1px solid #000; margin-bottom: 3mm; }
              @page { size: A5; margin: 3mm; }
            }
          </style>
        </head>
        <body>
          <div class="watermark">NIETM</div>
          <div class="slip-container">
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
            
            <div class="slip-title">EMPLOYEE SALARY SLIP</div>
            
            <div class="slip-details">
              <div class="slip-info">
                <div>
                  <div class="info-row">
                    <span class="info-label">Slip No:</span>
                    <span>SAL-${
                      slip._id?.slice(-8) ||
                      new Date().getTime().toString().slice(-8)
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Pay Period:</span>
                    <span>${slip.month} ${slip.year}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Generated:</span>
                    <span>${new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
                <div>
                  <div class="info-row">
                    <span class="info-label">Pay Date:</span>
                    <span>${
                      slip.generatedOn || new Date().toLocaleDateString()
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Academic Year:</span>
                    <span>2025-26</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span>${slip.salaryStatus}</span>
                  </div>
                </div>
              </div>
              
              <div class="section-title">👤 EMPLOYEE INFORMATION</div>
              <div class="emp-info">
                <div>
                  <div class="info-row">
                    <span class="info-label">Employee Name:</span>
                    <span>${facultyName}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Employee ID:</span>
                    <span>${employeeId}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Department:</span>
                    <span>${department}</span>
                  </div>
                </div>
                <div>
                  <div class="info-row">
                    <span class="info-label">Designation:</span>
                    <span>${designation}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Joining Date:</span>
                    <span>${
                      joiningDate !== "N/A"
                        ? new Date(joiningDate).toLocaleDateString()
                        : "N/A"
                    }</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Payment ID:</span>
                    <span>${slip.paymentId || "N/A"}</span>
                  </div>
                </div>
              </div>
              
              <div class="section-title">💰 SALARY BREAKDOWN</div>
              <table class="salary-table">
                <thead> 
                  <tr style="background: #f3f4f6;">
                    <th>Earnings</th>
                    <th style="text-align: right;">Amount (₹)</th>
                    <th>Deductions</th>
                    <th style="text-align: right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background: white;">
                    <td>Basic Salary</td>
                    <td style="text-align: right; color: #2563eb; font-weight: bold;">₹${(
                      slip.basicSalary || 0
                    ).toLocaleString()}</td>
                    <td>Provident Fund</td>
                    <td style="text-align: right; color: #dc2626; font-weight: bold;">₹${(
                      slip.deductions?.pf || 0
                    ).toLocaleString()}</td>
                  </tr>
                  <tr style="background: #f9fafb;">
                    <td>HRA</td>
                    <td style="text-align: right; color: #2563eb; font-weight: bold;">₹${(
                      slip.allowances?.hra || 0
                    ).toLocaleString()}</td>
                    <td>ESI</td>
                    <td style="text-align: right; color: #dc2626; font-weight: bold;">₹${(
                      slip.deductions?.esi || 0
                    ).toLocaleString()}</td>
                  </tr>
                  <tr style="background: white;">
                    <td>DA</td>
                    <td style="text-align: right; color: #2563eb; font-weight: bold;">₹${(
                      slip.allowances?.da || 0
                    ).toLocaleString()}</td>
                    <td>Professional Tax</td>
                    <td style="text-align: right; color: #dc2626; font-weight: bold;">₹${(
                      slip.deductions?.professionalTax || 0
                    ).toLocaleString()}</td>
                  </tr>
                  <tr style="background: #f9fafb;">
                    <td>Medical Allowance</td>
                    <td style="text-align: right; color: #2563eb; font-weight: bold;">₹${(
                      slip.allowances?.medical || 0
                    ).toLocaleString()}</td>
                    <td>TDS</td>
                    <td style="text-align: right; color: #dc2626; font-weight: bold;">₹${(
                      slip.deductions?.tds || 0
                    ).toLocaleString()}</td>
                  </tr>
                  <tr style="background: white;">
                    <td>Transport Allowance</td>
                    <td style="text-align: right; color: #2563eb; font-weight: bold;">₹${(
                      slip.allowances?.transport || 0
                    ).toLocaleString()}</td>
                    <td>Income Tax</td>
                    <td style="text-align: right; color: #dc2626; font-weight: bold;">₹${(
                      slip.deductions?.incomeTax || 0
                    ).toLocaleString()}</td>
                  </tr>
                  <tr style="background: #f9fafb;">
                    <td>CLA</td>
                    <td style="text-align: right; color: #2563eb; font-weight: bold;">₹${(
                      slip.allowances?.cla || 0
                    ).toLocaleString()}</td>
                    <td>Other Deductions</td>
                    <td style="text-align: right; color: #dc2626; font-weight: bold;">₹${(
                      slip.deductions?.others || 0
                    ).toLocaleString()}</td>
                  </tr>
                  <tr style="background: white;">
                    <td>Other Allowances</td>
                    <td style="text-align: right; color: #2563eb; font-weight: bold;">₹${(
                      slip.allowances?.others || 0
                    ).toLocaleString()}</td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr class="total-row">
                    <td><strong>Gross Salary</strong></td>
                    <td style="text-align: right;"><strong>₹${(
                      slip.grossSalary || 0
                    ).toLocaleString()}</strong></td>
                    <td><strong>Total Deductions</strong></td>
                    <td style="text-align: right;"><strong>₹${(
                      slip.totalDeductions || 0
                    ).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
              
              <div class="net-salary">
                <div class="net-amount">₹${(
                  slip.netSalary || 0
                ).toLocaleString()}</div>
                <div class="amount-label">Net Salary Amount</div>
              </div>
              
              <div class="signature-section">
                <div>
                  <div style="font-weight: bold; margin-bottom: 5px;">Cashier</div>
                  <div class="signature-box">_________________</div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <strong>Thank you for your dedicated service!</strong><br>
              This is a system-generated salary slip. For any discrepancies, please contact HR Department.<br>
              Generated on ${new Date().toLocaleString()} | NAGARJUNA Institute of Engineering, Technology & Management
            </div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(() => window.print(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      Completed: "bg-green-100 text-green-800",
      Pending: "bg-yellow-100 text-yellow-800",
      Failed: "bg-red-100 text-red-800",
      Refunded: "bg-gray-100 text-gray-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const getTypeBadge = (type) => {
    const typeColors = {
      student: "bg-blue-100 text-blue-800",
      salary: "bg-purple-100 text-purple-800",
    };
    return typeColors[type] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Pagination
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleEditReceipt = async (receipt) => {
    // First verify the receipt exists on the backend
    try {
      setError("");

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const checkResponse = await fetch(
        `${API_URL}/api/receipts/${
          receipt.type === "student" ? "student" : "salary"
        }/${receipt._id}`,
        { headers }
      );

      if (!checkResponse.ok) {
        if (checkResponse.status === 404) {
          // Receipt doesn't exist on backend, remove it from frontend
          console.warn(
            `Receipt ${receipt._id} not found on server, removing from display`
          );
          setReceipts((prev) => prev.filter((r) => r._id !== receipt._id));
          setError(
            `Receipt ${
              receipt.receiptNumber || receipt._id
            } no longer exists on the server and has been removed from the display. Please refresh to see current data.`
          );
          return;
        } else {
          throw new Error(
            `Server error (${checkResponse.status}): Unable to verify receipt`
          );
        }
      }

      // Receipt exists, proceed with edit
      setEditReceipt(receipt);
      setEditForm({
        amount: receipt.amount || "",
        status: receipt.status || "",
        remarks: receipt.remarks || "",
      });
      setEditModalOpen(true);
    } catch (err) {
      console.error("Error verifying receipt:", err);
      setError("Error verifying receipt: " + err.message);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFormSave = async () => {
    if (!editReceipt || !editReceipt._id) {
      setError("Cannot update receipt: Invalid receipt data");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("Attempting to edit receipt with ID:", editReceipt._id);

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // First, verify the receipt exists by trying to fetch it
      const checkResponse = await fetch(
        `${API_URL}/api/receipts/${
          editReceipt.type === "student" ? "student" : "salary"
        }/${editReceipt._id}`,
        { headers }
      );
      if (!checkResponse.ok) {
        const errorDetails = await checkResponse.text();
        console.error("Receipt validation failed:", {
          id: editReceipt._id,
          status: checkResponse.status,
          error: errorDetails,
        });

        if (checkResponse.status === 404) {
          // Receipt doesn't exist on backend, remove it from frontend and close modal
          console.warn(
            `Receipt ${editReceipt._id} not found on server, removing from display`
          );
          setReceipts((prev) => prev.filter((r) => r._id !== editReceipt._id));
          setEditModalOpen(false);
          setEditReceipt(null);
          setError(
            `Receipt ${
              editReceipt.receiptNumber || editReceipt._id
            } no longer exists on the server and has been removed from the display.`
          );
          return;
        } else {
          throw new Error(
            `Server error (${checkResponse.status}): ${errorDetails}`
          );
        }
      }

      // If receipt exists, proceed with update
      const lastEditedBy = window.currentUser?.name || "Unknown User";
      const response = await fetch(
        `${API_URL}/api/receipts/${
          editReceipt.type === "student" ? "student" : "salary"
        }/${editReceipt._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            amount: Number(editForm.amount),
            status: editForm.status,
            remarks: editForm.remarks,
            lastEditedBy,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Receipt update error:", errorText);
        throw new Error("Failed to update receipt: " + errorText);
      }

      const updated = await response.json();
      setReceipts((prev) =>
        prev.map((r) => (r._id === updated._id ? updated : r))
      );
      setEditModalOpen(false);
      setEditReceipt(null);

      console.log("Receipt updated successfully:", updated._id);
    } catch (err) {
      console.error("Edit form save error:", err);
      setError("Error updating receipt: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const newFeeTypes = checked 
        ? [...exportFormData.feeTypes, value]
        : exportFormData.feeTypes.filter(type => type !== value);
      
      // Reset year and semester when fee type changes
      setExportFormData(prev => ({
        ...prev,
        feeTypes: newFeeTypes,
        year: '',
        semester: ''
      }));
    } else {
      setExportFormData(prev => ({
        ...prev,
        [name]: value,
        // Reset department when stream changes
        ...(name === 'stream' && { department: '' })
      }));
    }
  };

  const handleExportDownload = async () => {
    // Validation based on fee type
    const isExamFee = exportFormData.feeTypes.includes('Exam');
    const isAdmissionFee = exportFormData.feeTypes.includes('Admission');
    const isAllDepartments = exportFormData.department === 'All';
    
    if (!exportFormData.stream || !exportFormData.department || exportFormData.feeTypes.length === 0) {
      alert('Please fill all fields and select at least one fee type.');
      return;
    }
    
    // If Exam fee is selected, require semester
    if (isExamFee && !exportFormData.semester) {
      alert('Please select a semester for Exam fees.');
      return;
    }
    
    // If Admission fee is selected, require year
    if (isAdmissionFee && !exportFormData.year) {
      alert('Please select a year for Admission fees.');
      return;
    }

    try {
      setExportLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Step 1: Fetch all semesters from semesters database
      console.log('Fetching semesters data...');
      const semestersResponse = await fetch(`${API_URL}/api/superadmin/semesters`, { headers });
      if (!semestersResponse.ok) {
        throw new Error('Failed to fetch semesters data');
      }
      const semestersData = await semestersResponse.json();
      const semesters = Array.isArray(semestersData) ? semestersData : semestersData.data || [];
      
      console.log('Semesters fetched:', semesters.length);

      console.log(exportFormData);
      // Step 2: Determine which semester numbers to filter based on year or semester dropdown
      let targetSemesterNumbers = [];
      
      // If Exam fee is selected, use semester dropdown value
      if (exportFormData.feeTypes.includes('Exam') && exportFormData.semester) {
        targetSemesterNumbers = [parseInt(exportFormData.semester)];
      }
      // If Admission fee is selected, use year dropdown to determine both semesters
      else if (exportFormData.feeTypes.includes('Admission') && exportFormData.year) {
        if (exportFormData.year.toLowerCase() === '1st year') targetSemesterNumbers = [1, 2];
        else if (exportFormData.year.toLowerCase() === '2nd year') targetSemesterNumbers = [3, 4];
        else if (exportFormData.year.toLowerCase() === '3rd year') targetSemesterNumbers = [5, 6];
        else if (exportFormData.year.toLowerCase() === '4th year') targetSemesterNumbers = [7, 8];
      }

      console.log(`Looking for semester numbers: ${targetSemesterNumbers.join(', ')}`);

      // Step 3: Find the semester _ids that match the target semester numbers
      const targetSemesters = semesters.filter(sem => 
        targetSemesterNumbers.includes(sem.semesterNumber) || 
        targetSemesterNumbers.includes(sem.number) ||
        targetSemesterNumbers.includes(sem.semester)
      );

      if (targetSemesters.length === 0) {
        throw new Error(`No semesters found for ${exportFormData.year} year (semesters ${targetSemesterNumbers.join(', ')})`);
      }

      const targetSemesterIds = targetSemesters.map(sem => sem._id);
      console.log(`Target semester _ids: ${targetSemesterIds.join(', ')}`);

      // Check if "All" departments is selected
      if (isAllDepartments) {
        await exportAllDepartments(exportFormData.stream, targetSemesterIds, targetSemesterNumbers, headers);
        return;
      }

      // Step 4: Fetch all students
      console.log('Fetching students data...');
      const studentsResponse = await fetch(`${API_URL}/api/students`, { headers });
      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch students data');
      }
      const studentsDataRaw = await studentsResponse.json();
      const allStudents = Array.isArray(studentsDataRaw) ? studentsDataRaw : 
                         studentsDataRaw.data || studentsDataRaw.students || [];
      
      console.log('Total students fetched:', allStudents.length);

      // Step 5: Fetch fee summaries from feesummeries collection (for Admission fees)
      console.log('Fetching fee summaries data...');
      const feeSummariesResponse = await fetch(`${API_URL}/api/fees/summaries`, { headers });
      if (!feeSummariesResponse.ok) {
        throw new Error('Failed to fetch fee summaries data');
      }
      const feeSummariesDataRaw = await feeSummariesResponse.json();
      const allFeeSummaries = Array.isArray(feeSummariesDataRaw) ? feeSummariesDataRaw : 
                              feeSummariesDataRaw.data || feeSummariesDataRaw.summaries || [];
      
      console.log('Total fee summaries fetched:', allFeeSummaries.length);

      // Step 5.1: Fetch exam fees from examfees collection (if Exam fee type selected)
      let allExamFees = [];
      if (exportFormData.feeTypes.includes('Exam')) {
        console.log('Fetching exam fees data...');
        const examFeesResponse = await fetch(`${API_URL}/api/exam-fees`, { headers });
        if (!examFeesResponse.ok) {
          console.warn('Failed to fetch exam fees data');
        } else {
          const examFeesDataRaw = await examFeesResponse.json();
          allExamFees = Array.isArray(examFeesDataRaw) ? examFeesDataRaw : 
                        examFeesDataRaw.data || examFeesDataRaw.examFees || [];
          console.log('Total exam fees fetched:', allExamFees.length);
        }
      }

      // Step 6: Create maps for fee lookup
      const feeSummaryMap = {};
      allFeeSummaries.forEach(summary => {
        const studentId = summary.studentId?._id || summary.studentId;
        if (studentId) {
          feeSummaryMap[studentId] = summary;
        }
      });

      const examFeeMap = {};
      allExamFees.forEach(examFee => {
        const studentId = examFee.student?._id || examFee.student || examFee.studentId;
        if (studentId) {
          examFeeMap[studentId] = examFee;
        }
      });

      // Step 7: Filter students based on stream, department, and semester _id match
      const filteredStudents = allStudents.filter(student => {
        // Check stream
        const studentStream = student.stream?.name || student.stream || '';
        const streamMatch = studentStream.toLowerCase() === exportFormData.stream.toLowerCase();

        // Check department - normalize for special characters like &
        const studentDept = student.department?.name || student.department || '';
        const normalizeDept = (dept) => dept.toLowerCase().replace(/\s+/g, '').replace(/[&]/g, '');
        const deptMatch = normalizeDept(studentDept) === normalizeDept(exportFormData.department);

        // Check if semester _id matches any of the target semester IDs
        const studentSemesterId = typeof student.semester === 'object' ? student.semester._id : student.semester;
        // Convert both to strings for comparison
        const semesterMatch = targetSemesterIds.some(targetId => 
          String(targetId) === String(studentSemesterId)
        );

        return streamMatch && deptMatch && semesterMatch;
      });

      console.log(`Filtered students count: ${filteredStudents.length}`);
      console.log(`Sample filtered student semesters:`, filteredStudents.slice(0, 5).map(s => ({
        name: s.firstName,
        semester: s.semester?.number || s.semester?.semesterNumber || 'unknown',
        semesterId: typeof s.semester === 'object' ? s.semester._id : s.semester
      })));

      if (filteredStudents.length === 0) {
        alert(`No students found matching the criteria:\n- Stream: ${exportFormData.stream}\n- Department: ${exportFormData.department}\n- Year: ${exportFormData.year} (Semesters ${targetSemesterNumbers.join(', ')})`);
        setExportLoading(false);
        return;
      }

      // Step 8: Prepare data for export with fee data based on selected fee type
      const exportData = filteredStudents.map((student, index) => {
        let totalFee = 0;
        let paidFee = 0;
        let pendingFee = 0;

        // If Admission fee type is selected, use feesummeries data
        if (exportFormData.feeTypes.includes('Admission')) {
          const feeSummary = feeSummaryMap[student._id] || {};
          totalFee = feeSummary.totalFees || 0;
          paidFee = feeSummary.paidFees || 0;
          pendingFee = feeSummary.pendingFees || 0;
        }
        
        // If Exam fee type is selected, use examfees data
        if (exportFormData.feeTypes.includes('Exam')) {
          const examFee = examFeeMap[student._id] || {};
          totalFee = examFee.totalAmount || examFee.amount || 0;
          paidFee = examFee.paidAmount || 0;
          pendingFee = examFee.pendingAmount || (totalFee - paidFee) || 0;
        }
        
        return {
          'Sr.': index + 1,
          'Student ID': student.studentId || student._id || '',
          'Name of Students': `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim(),
          'Regular / CAP': student.admissionType || 'Regular',
          'Category': student.casteCategory || 'OPEN',
          'Stream': student.stream?.name || student.stream || '',
          'Department': student.department?.name || student.department || '',
          'Semester': student.semester?.number || 'N/A',
          'Total Fee': totalFee,
          'Paid Fee': paidFee,
          'Pending Fee': pendingFee,
          'Receipt No.': student.receiptNumber || ''
        };
      });

      // Step 9: Create Professional Excel Workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Fee Summary');

      // Set column widths
      worksheet.columns = [
        { key: 'sr', width: 8 },
        { key: 'studentId', width: 15 },
        { key: 'name', width: 30 },
        { key: 'admissionType', width: 15 },
        { key: 'category', width: 12 },
        { key: 'stream', width: 15 },
        { key: 'department', width: 20 },
        { key: 'semester', width: 12 },
        { key: 'totalFee', width: 15 },
        { key: 'paidFee', width: 15 },
        { key: 'pendingFee', width: 15 },
        { key: 'receiptNo', width: 18 }
      ];

      // Add Institute Header (Merged)
      worksheet.mergeCells('A1:L1');
      const titleRow1 = worksheet.getCell('A1');
      titleRow1.value = 'NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY AND MANAGEMENT';
      titleRow1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF000000' } };
      titleRow1.alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      worksheet.getRow(1).height = 25;

      // Add Address (Merged)
      worksheet.mergeCells('A2:L2');
      const titleRow2 = worksheet.getCell('A2');
      titleRow2.value = 'Village Satnavri, Amravati Road, Nagpur - 440023';
      titleRow2.font = { name: 'Arial', size: 11, italic: true };
      titleRow2.alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      worksheet.getRow(2).height = 20;

      // Add Report Title (Merged)
      worksheet.mergeCells('A3:L3');
      const titleRow3 = worksheet.getCell('A3');
      titleRow3.value = `Fee Summary Report - ${exportFormData.stream} - ${exportFormData.department}, ${exportFormData.year}, Session 2025-26`;
      titleRow3.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF0066CC' } };
      titleRow3.alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow3.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F8FF' }
      };
      worksheet.getRow(3).height = 22;

      // Add empty row
      worksheet.addRow([]);

      // Add Table Headers (Row 5)
      const headerRow = worksheet.addRow([
        'Sr.',
        'Student ID',
        'Name of Students',
        'Regular/CAP',
        'Category',
        'Stream',
        'Department',
        'Semester',
        'Total Fee (₹)',
        'Paid Fee (₹)',
        'Pending Fee (₹)',
        'Receipt No.'
      ]);

      // Style header row
      headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Add data rows
      let totalFeeSum = 0;
      let paidFeeSum = 0;
      let pendingFeeSum = 0;

      exportData.forEach((data, index) => {
        const row = worksheet.addRow([
          data['Sr.'],
          data['Student ID'],
          data['Name of Students'],
          data['Regular / CAP'],
          data['Category'],
          data['Stream'],
          data['Department'],
          data['Semester'],
          data['Total Fee'],
          data['Paid Fee'],
          data['Pending Fee'],
          data['Receipt No.']
        ]);

        // Accumulate totals
        totalFeeSum += data['Total Fee'];
        paidFeeSum += data['Paid Fee'];
        pendingFeeSum += data['Pending Fee'];

        // Style data rows with alternating colors
        const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';
        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 3 ? 'left' : 'center' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
          };

          // Format currency columns
          if (colNumber === 9 || colNumber === 10 || colNumber === 11) {
            cell.numFmt = '₹#,##0.00';
          }
        });
      });

      // Add Total Row
      const totalRow = worksheet.addRow([
        '', '', '', '', '', '', '', 'TOTAL:',
        totalFeeSum,
        paidFeeSum,
        pendingFeeSum,
        ''
      ]);

      totalRow.font = { name: 'Arial', size: 12, bold: true };
      totalRow.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD966' }
        };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        // Format currency columns in total row
        if (colNumber === 9 || colNumber === 10 || colNumber === 11) {
          cell.numFmt = '₹#,##0.00';
        }
      });

      // Add footer note
      worksheet.addRow([]);
      const footerRow = worksheet.addRow(['', `Generated on: ${new Date().toLocaleString('en-IN')}`, '', '', '', '', '', '', '', '', '', `Total Students: ${filteredStudents.length}`]);
      footerRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
      worksheet.mergeCells(footerRow.number, 2, footerRow.number, 6);
      worksheet.mergeCells(footerRow.number, 9, footerRow.number, 12);
      footerRow.getCell(12).alignment = { horizontal: 'right' };

      // Generate Excel file and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Fee_Summary_${exportFormData.stream}_${exportFormData.department}_${exportFormData.year}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);

      console.log('✅ Excel exported successfully!');
      setShowExportForm(false);
      setExportFormData({ stream: '', department: '', year: '', semester: '', feeTypes: [] });
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Export all departments in separate sheets
  const exportAllDepartments = async (stream, targetSemesterIds, targetSemesterNumbers, headers) => {
    try {
      // Define departments based on stream
      const departments = stream === 'B.Tech'
        ? ['CS', 'Electrical', 'Mechancial', 'Civil', 'CSE&AIML']
        : stream === 'MBA'
        ? ['MBA']
        : [];

      if (departments.length === 0) {
        alert('No departments found for the selected stream.');
        setExportLoading(false);
        return;
      }

      // Step 1: Fetch all students
      console.log('Fetching all students data...');
      const studentsResponse = await fetch(`${API_URL}/api/students`, { headers });
      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch students data');
      }
      const studentsDataRaw = await studentsResponse.json();
      const allStudents = Array.isArray(studentsDataRaw) ? studentsDataRaw :
                         studentsDataRaw.data || studentsDataRaw.students || [];
      
      console.log('Total students fetched:', allStudents.length);

      // Step 2: Fetch fee summaries
      console.log('Fetching fee summaries data...');
      const feeSummariesResponse = await fetch(`${API_URL}/api/fees/summaries`, { headers });
      if (!feeSummariesResponse.ok) {
        throw new Error('Failed to fetch fee summaries data');
      }
      const feeSummariesDataRaw = await feeSummariesResponse.json();
      const allFeeSummaries = Array.isArray(feeSummariesDataRaw) ? feeSummariesDataRaw :
                              feeSummariesDataRaw.data || feeSummariesDataRaw.summaries || [];
      
      console.log('Total fee summaries fetched:', allFeeSummaries.length);

      // Step 3: Fetch exam fees if needed
      let allExamFees = [];
      if (exportFormData.feeTypes.includes('Exam')) {
        console.log('Fetching exam fees data...');
        const examFeesResponse = await fetch(`${API_URL}/api/exam-fees`, { headers });
        if (!examFeesResponse.ok) {
          console.warn('Failed to fetch exam fees data');
        } else {
          const examFeesDataRaw = await examFeesResponse.json();
          allExamFees = Array.isArray(examFeesDataRaw) ? examFeesDataRaw :
                        examFeesDataRaw.data || examFeesDataRaw.examFees || [];
          console.log('Total exam fees fetched:', allExamFees.length);
        }
      }

      // Step 4: Create maps for fee lookup
      const feeSummaryMap = {};
      allFeeSummaries.forEach(summary => {
        const studentId = summary.studentId?._id || summary.studentId;
        if (studentId) {
          feeSummaryMap[studentId] = summary;
        }
      });

      const examFeeMap = {};
      allExamFees.forEach(examFee => {
        const studentId = examFee.student?._id || examFee.student || examFee.studentId;
        if (studentId) {
          examFeeMap[studentId] = examFee;
        }
      });

      // Step 5: Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'NIETM';
      workbook.created = new Date();

      // Step 6: Process each department
      for (const department of departments) {
        console.log(`Processing department: ${department}`);

        // Filter students for this department
        const departmentStudents = allStudents.filter(student => {
          const studentStream = student.stream?.name || student.stream || '';
          const studentDept = student.department?.name || student.department || '';
          const studentSemesterId = typeof student.semester === 'object' ? student.semester._id : student.semester;
          
          // Normalize department names for comparison (handle special characters)
          const normalizeDept = (dept) => dept.toLowerCase().replace(/\s+/g, '').replace(/[&]/g, '');
          
          const streamMatch = studentStream.toLowerCase() === stream.toLowerCase();
          const deptMatch = normalizeDept(studentDept) === normalizeDept(department);
          const semesterMatch = targetSemesterIds.some(targetId => 
            String(targetId) === String(studentSemesterId)
          );

          return streamMatch && deptMatch && semesterMatch;
        });

        console.log(`Students in ${department}: ${departmentStudents.length}`);

        if (departmentStudents.length === 0) {
          console.log(`No students found for ${department}, skipping...`);
          continue;
        }

        // Prepare data for this department
        const exportData = departmentStudents.map((student, index) => {
          let totalFee = 0;
          let paidFee = 0;
          let pendingFee = 0;

          if (exportFormData.feeTypes.includes('Admission')) {
            const feeSummary = feeSummaryMap[student._id] || {};
            totalFee = feeSummary.totalFees || 0;
            paidFee = feeSummary.paidFees || 0;
            pendingFee = feeSummary.pendingFees || 0;
          }
          
          if (exportFormData.feeTypes.includes('Exam')) {
            const examFee = examFeeMap[student._id] || {};
            totalFee = examFee.totalAmount || examFee.amount || 0;
            paidFee = examFee.paidAmount || 0;
            pendingFee = examFee.pendingAmount || (totalFee - paidFee) || 0;
          }
          
          return {
            'Sr.': index + 1,
            'Student ID': student.studentId || student._id || '',
            'Name of Students': `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim(),
            'Regular / CAP': student.admissionType || 'Regular',
            'Category': student.casteCategory || 'OPEN',
            'Stream': student.stream?.name || student.stream || '',
            'Department': student.department?.name || student.department || '',
            'Semester': student.semester?.number || 'N/A',
            'Total Fee': totalFee,
            'Paid Fee': paidFee,
            'Pending Fee': pendingFee,
            'Receipt No.': student.receiptNumber || ''
          };
        });

        // Create worksheet for this department
        const worksheet = workbook.addWorksheet(department, {
          pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        // Add header rows
        worksheet.mergeCells('A1:L1');
        const titleRow = worksheet.getCell('A1');
        titleRow.value = 'NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY AND MANAGEMENT';
        titleRow.font = { size: 14, bold: true };
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('A2:L2');
        const addressRow = worksheet.getCell('A2');
        addressRow.value = 'VILLAGE SATNAWARI, AMBAVATI ROAD, NAGPUR';
        addressRow.font = { size: 11 };
        addressRow.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('A3:L3');
        const sessionRow = worksheet.getCell('A3');
        sessionRow.value = `${stream} - ${department} Department, ${exportFormData.year || `Semesters ${targetSemesterNumbers.join(', ')}`}, Session 2025-26`;
        sessionRow.font = { size: 12, bold: true };
        sessionRow.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.addRow([]);

        // Add data headers
        const headerRow = worksheet.addRow(Object.keys(exportData[0] || {}));
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add data rows
        exportData.forEach(row => {
          worksheet.addRow(Object.values(row));
        });

        // Set column widths
        worksheet.columns.forEach((column, index) => {
          column.width = index === 2 ? 25 : 15;
        });

        // Add borders to all cells
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        });
      }

      // Generate and download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stream}-All-Departments-${exportFormData.year || 'Multi-Semester'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      console.log('✅ Excel exported successfully!');
      alert(`Successfully exported ${departments.length} department sheets!`);
      setShowExportForm(false);
      setExportFormData({ stream: '', department: '', year: '', semester: '', feeTypes: [] });
    } catch (error) {
      console.error('Export all departments error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteReceipt = async (receipt) => {
    if (!receipt._id) {
      setError("Cannot delete receipt: Invalid receipt ID");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete receipt ${
          receipt.receiptNumber || receipt._id
        }?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // First verify the receipt exists on the backend (optional - we can still log deletion even if receipt is gone)
      const token = localStorage.getItem("token");
      const checkResponse = await fetch(
        `${API_URL}/api/receipts/${
          receipt.type === "student" ? "student" : "salary"
        }/${receipt._id}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      
      let receiptExists = checkResponse.ok;
      if (!receiptExists) {
        console.warn(`Receipt ${receipt._id} not found on server (status: ${checkResponse.status}), but will still log deletion`);
      }

      // Fetch full payment details BEFORE deletion to ensure we have UTR
      const paymentResponse = await fetch(`${API_URL}/api/payments/${receipt._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      let fullPayment = null;
      if (paymentResponse.ok) {
        fullPayment = await paymentResponse.json();
        console.log("📄 Full payment details:", fullPayment);
      } else {
        console.warn("⚠️ Could not fetch payment details, using receipt data for logging");
      }

      // If receipt doesn't exist on server but we have payment details, still try to delete
      if (!receiptExists && !fullPayment) {
        console.warn("⚠️ Receipt not found and no payment details available, logging deletion with available data only");
      }

      // Attempt deletion only if receipt exists
      if (receiptExists) {
        const response = await fetch(
          `${API_URL}/api/receipts/${
            receipt.type === "student" ? "student" : "salary"
          }/${receipt._id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Receipt ${receipt._id} already deleted on server`);
            receiptExists = false; // Mark as doesn't exist for UI update
          } else {
            const errorText = await response.text();
            console.error("Receipt delete error:", errorText);
            throw new Error("Failed to delete receipt: " + errorText);
          }
        } else {
          console.log("✅ Receipt deleted from backend, now logging to ledger...");
        }
      } else {
        console.log("ℹ️ Receipt not found on server, skipping deletion but logging to ledger...");
      }

      // Always log the deletion to the ledger (even if receipt doesn't exist on server)
      console.log("🗑️ Deleting receipt:", receipt);
      console.log("🗑️ Receipt UTR:", receipt.utr);
      console.log("🗑️ Receipt transactionId:", receipt.transactionId);
      console.log("🗑️ Receipt paymentMethod:", receipt.paymentMethod);
      
      // Use UTR from full payment data, with fallback logic
      const utr = fullPayment ? (fullPayment.utr || (['Online', 'Bank Transfer', 'Card', 'UPI'].includes(fullPayment.paymentMethod) ? fullPayment.transactionId : "") || fullPayment.paymentId || "") : (receipt.utr || (['Online', 'Bank Transfer', 'Card', 'UPI'].includes(receipt.paymentMethod) ? receipt.transactionId : "") || receipt.paymentId || "");
      
      console.log("Calculated UTR:", utr);
      
      const deletionPayload = {
        deletedReceiptId: receipt._id,
        receiptNumber: receipt.receiptNumber || "N/A",
        type: receipt.type || "student",
        amount: receipt.amount || 0,
        recipientName: receipt.recipientName || "Unknown",
        studentId: receipt.studentId || "",
        description: receipt.description || "Deleted Receipt",
        paymentMethod: receipt.paymentMethod || "N/A",
        paymentDate: receipt.paymentDate || new Date().toISOString(),
        deletedAt: new Date().toISOString(),
        deletedBy: localStorage.getItem("userEmail") || localStorage.getItem("userName") || "Admin",
        utr: utr,
        transactionId: fullPayment?.transactionId || receipt.transactionId || "",
        remarks: receipt.remarks || "",
        collectedBy: receipt.collectedBy || "",
        department: receipt.department || "",
        feeHead: receipt.feeHead || "",
        semester: receipt.semester || null
      };
      
      console.log("📤 Deletion payload UTR:", deletionPayload.utr);

      console.log("📤 Sending deletion log to backend:", deletionPayload);
      console.log("🔑 Token available:", token ? "YES" : "NO");

      try {
        const deletionLogResponse = await fetch(
          `https://backenderp.tarstech.in/api/ledger/log-deletion`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(deletionPayload),
          }
        );

        console.log("📥 Deletion log response status:", deletionLogResponse.status);

        if (deletionLogResponse.ok) {
          const logResult = await deletionLogResponse.json();
          console.log("✅ Deletion logged to ledger successfully:", logResult);
        } else {
          const errorText = await deletionLogResponse.text();
          console.error("❌ Failed to log deletion to ledger:", deletionLogResponse.status, errorText);
        }
      } catch (logError) {
        console.error("❌ Error logging deletion to ledger:", logError);
      }

      // Remove the receipt from the local state (always do this since we're "deleting" it)
      setReceipts((prev) => prev.filter((r) => r._id !== receipt._id));
      console.log("Receipt deleted successfully:", receipt._id);
      alert(`Receipt ${receipt.receiptNumber || receipt._id} has been deleted and logged in the ledger.`);
    } catch (err) {
      setError("Error deleting receipt: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateAllReceipts = async () => {
    try {
      setLoading(true);
      setError("");

      const validReceipts = [];
      const invalidCount = receipts.length;

      // Check each receipt individually
      for (const receipt of receipts) {
        if (!receipt._id) continue;

        try {
          const token = localStorage.getItem("token");
          const checkResponse = await fetch(
            `${API_URL}/api/receipts/${
              receipt.type === "student" ? "student" : "salary"
            }/${receipt._id}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          if (checkResponse.ok) {
            validReceipts.push(receipt);
          } else {
            console.warn(`Invalid receipt found and removed: ${receipt._id}`);
          }
        } catch (err) {
          console.warn(`Error checking receipt ${receipt._id}:`, err);
        }
      }

      const removedCount = invalidCount - validReceipts.length;
      setReceipts(validReceipts);

      if (removedCount > 0) {
        setError(
          `Validation complete: ${removedCount} invalid receipt(s) removed from display. ${validReceipts.length} valid receipts remaining.`
        );
      } else {
        setError("All receipts are valid and exist on the server.");
      }
    } catch (err) {
      setError("Error validating receipts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Professional export functionality with actual student data
  const handleExportClick = async (type) => {
    console.log('Export clicked:', type);
    setShowExportDropdown(false);
    setExportLoading(true);
    
    try {
      if (type === 'current') {
        // Export current page receipts as before
        const filteredReceipts = receipts.filter(r => r && r._id);
        if (filteredReceipts.length === 0) {
          alert('No receipts found on current page to export.');
          return;
        }
        const csvData = buildReceiptOverviewRows(filteredReceipts);
        downloadReceiptCsvInstant(csvData, 'receipts-current-page');
      } else {
        // Fetch actual student data for professional department-wise export
        await fetchAndExportStudentData(type);
      }
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Fetch student data and export professionally by department
  const fetchAndExportStudentData = async (type) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Try multiple endpoints to fetch student data
      let allStudents = [];
      const endpoints = [
        `${API_URL}/api/students`,
        `${API_URL}/api/accounting/students`,
        `${API_URL}/api/student`,
        `${API_URL}/api/students/all`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint, { headers });
          
          if (response.ok) {
            const responseData = await response.json();
            console.log(`Response from ${endpoint}:`, responseData);
            
            // Handle different response formats
            if (Array.isArray(responseData)) {
              allStudents = responseData;
            } else if (responseData.students && Array.isArray(responseData.students)) {
              allStudents = responseData.students;
            } else if (responseData.data && Array.isArray(responseData.data)) {
              allStudents = responseData.data;
            }
            
            if (allStudents.length > 0) {
              console.log(`✅ Successfully fetched ${allStudents.length} students from ${endpoint}`);
              break;
            }
          }
        } catch (err) {
          console.log(`❌ Failed to fetch from ${endpoint}:`, err.message);
          continue;
        }
      }
      
      if (allStudents.length === 0) {
        throw new Error('No student data found from any endpoint');
      }
      
      // Filter by program
      const programFilter = type === 'btech' ? 'B.Tech' : 'MBA';
      const filteredStudents = allStudents.filter(student => {
        const program = student.program || student.stream?.name || student.stream || '';
        return program.toLowerCase().includes(programFilter.toLowerCase()) ||
               program.toLowerCase().includes(programFilter.replace('.', '').toLowerCase());
      });
      
      if (filteredStudents.length === 0) {
        alert(`No ${programFilter} students found in database.`);
        return;
      }
      
      // Group by department
      const studentsByDepartment = {};
      filteredStudents.forEach(student => {
        const dept = student.department?.name || student.department || 'Unknown Department';
        if (!studentsByDepartment[dept]) {
          studentsByDepartment[dept] = [];
        }
        studentsByDepartment[dept].push(student);
      });
      
      // Build professional CSV data
      const csvData = buildProfessionalStudentExport(studentsByDepartment, programFilter);
      downloadProfessionalCsv(csvData, `${programFilter.toLowerCase().replace('.', '')}-students-departmentwise`);
      
      console.log(`✅ Exported ${filteredStudents.length} ${programFilter} students from ${Object.keys(studentsByDepartment).length} departments`);
      
    } catch (error) {
      console.error('Student data fetch error:', error);
      throw error;
    }
  };
  
  const buildReceiptOverviewRows = (receiptList) => {
    return receiptList.map((receipt) => {
      const receiptNumber = receipt.receiptNumber || receipt.paymentId || 'N/A';
      const recipientName = receipt.recipientName || 'Unknown';
      const studentId = receipt.studentId || 'N/A';
      const amount = (receipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const paymentMethod = receipt.paymentMethod || 'N/A';
      const status = receipt.status || 'Unknown';
      const type = receipt.type === 'student' ? 'Student Fee' : 'Salary';
      const paymentDate = receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString('en-IN') : 'N/A';
      const description = receipt.description || 'No description';
      const transactionId = receipt.transactionId || 'N/A';
      const utr = receipt.utr || 'N/A';
      const collectedBy = receipt.collectedBy || 'N/A';
      
      return {
        receiptNumber,
        recipientName,
        studentId,
        amount,
        paymentMethod,
        status,
        type,
        paymentDate,
        description,
        transactionId,
        utr,
        collectedBy
      };
    });
  };
  
  // Build professional export data with department-wise grouping
  const buildProfessionalStudentExport = (studentsByDepartment, program) => {
    const rows = [];
    
    // Professional header with proper spacing
    rows.push([
      'NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY AND MANAGEMENT',
      '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]);
    rows.push([
      'VILLAGE SATNAVARI, AMRAVATI ROAD, NAGPUR', 
      '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]);
    rows.push([
      `${program} I Y. Session 2025-26`,
      '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']); // Empty row
    
    // Sort departments alphabetically
    const sortedDepts = Object.keys(studentsByDepartment).sort();
    let globalSrNo = 1;
    
    sortedDepts.forEach(department => {
      const students = studentsByDepartment[department];
      
      // Department header with professional formatting
      rows.push([
        `${department.toUpperCase()} DEPARTMENT`,
        '', '', '', '', '', '', '', '', '', '', '', '', '', ''
      ]);
      
      // Professional column headers
      rows.push([
        'Sr.',
        'Name of Students', 
        'Regis P/CAP',
        'Category',
        'Tuition Fee',
        'Other Fee', 
        'Admission Form',
        'Uni Students Fee',
        'Total Fee',
        'Date',
        'Receipt No.',
        'Tuition Fee',
        'Other Fee',
        'Admission Form',
        'Balance Total Fee'
      ]);
      
      // Student data with proper alignment
      students.forEach((student) => {
        const name = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student';
        const category = student.casteCategory || student.caste || student.category || 'OPEN';
        
        // Professional fee structure
        const tuitionFee = 3100;
        const otherFee = 100; 
        const admissionFee = 300;
        const uniStudentsFee = 300;
        const totalFee = tuitionFee + otherFee + admissionFee;
        
        // Format date professionally
        const currentDate = new Date().toLocaleDateString('en-GB');
        const receiptNo = `28642${globalSrNo.toString().padStart(3, '0')}`;
        
        rows.push([
          globalSrNo,
          name,
          category,
          category,
          tuitionFee,
          otherFee,
          admissionFee,
          uniStudentsFee,
          totalFee,
          currentDate,
          receiptNo,
          0, // Paid tuition fee
          0, // Paid other fee  
          0, // Paid admission fee
          totalFee // Balance (full amount pending)
        ]);
        
        globalSrNo++;
      });
      
      // Department summary row
      const deptTotal = students.length * 3500;
      rows.push([
        '', 
        `Total ${department} Students: ${students.length}`,
        '', '', '', '', '', '',
        deptTotal,
        '', '', '', '', '',
        deptTotal
      ]);
      
      // Empty row after each department 
      rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    });
    
    // Grand total row
    const totalStudents = Object.values(studentsByDepartment).reduce((sum, dept) => sum + dept.length, 0);
    const grandTotal = totalStudents * 3500;
    
    rows.push([
      '',
      `GRAND TOTAL ${program} STUDENTS: ${totalStudents}`,
      '', '', '', '', '', '',
      grandTotal,
      '', '', '', '', '',
      grandTotal
    ]);
    
    return rows;
  };

  // Download professional CSV with proper formatting
  const downloadProfessionalCsv = (rows, filename) => {
    const csvLines = rows.map(row => {
      return row.map(cell => {
        const str = String(cell || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',');
    });
    
    const csvBlob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadReceiptCsvInstant = (rows, filename) => {
    const headers = [
      'Receipt Number',
      'Recipient Name', 
      'Student ID',
      'Amount (₹)',
      'Payment Method',
      'Status',
      'Type',
      'Payment Date',
      'Description',
      'Transaction ID',
      'UTR',
      'Collected By'
    ];
    
    const csvLines = [headers.join(',')];
    
    rows.forEach((r) => {
      const escape = (v) => {
        if (v === null || v === undefined) return '';
        const str = String(v);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      
      csvLines.push([
        escape(r.receiptNumber),
        escape(r.recipientName),
        escape(r.studentId),
        escape(r.amount),
        escape(r.paymentMethod),
        escape(r.status),
        escape(r.type),
        escape(r.paymentDate),
        escape(r.description),
        escape(r.transactionId),
        escape(r.utr),
        escape(r.collectedBy)
      ].join(','));
    });
    
    const csvBlob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Silent auto-validation that runs in background
  const autoValidateReceipts = async (receiptsToCheck) => {
    if (!receiptsToCheck || receiptsToCheck.length === 0) return;

    try {
      const validReceipts = [];
      let removedCount = 0;

      // Check a few receipts at a time to avoid overwhelming the server
      const batchSize = 3;
      for (let i = 0; i < receiptsToCheck.length; i += batchSize) {
        const batch = receiptsToCheck.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (receipt) => {
            try {
              const token = localStorage.getItem("token");
              const checkResponse = await fetch(
                `${API_URL}/api/receipts/${
                  receipt.type === "student" ? "student" : "salary"
                }/${receipt._id}`,
                {
                  method: "HEAD", // Use HEAD instead of GET to avoid downloading data
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                }
              );
              if (checkResponse.ok) {
                validReceipts.push(receipt);
              } else {
                console.log(
                  `🧹 Auto-cleanup: Removed invalid receipt ${receipt._id}`
                );
                removedCount++;
              }
            } catch (err) {
              // Silently handle network errors - keep receipt to be safe
              validReceipts.push(receipt);
            }
          })
        );

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Only update if we found invalid receipts
      if (removedCount > 0) {
        setReceipts(validReceipts);
      }
    } catch (err) {
      console.warn("Auto-validation failed:", err);
      // Fail silently for auto-validation
    }
  };

  const printReceipt = () => {
    if (!receiptData) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptData.receiptNumber}</title>
        <style>
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
            justify-content: center;
            gap: 8px;
            width: 100%;
            height: 100vh;
            align-items: flex-start;
          }
          .receipt-container {
            width: 49%;
            max-width: 500px;
            border: 1px solid #000;
            background: white;
            padding: 12px;
            margin: 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            page-break-inside: avoid;
            min-height: 650px;
            height: auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .receipt-header-box {
            border: 1px solid #2d3748;
            padding: 6px;
            margin-bottom: 6px;
            position: relative;
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          }
          .duplicate-label {
            position: absolute;
            top: 2px;
            right: 6px;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            color: #dc3545;
            margin-bottom: 15px;
          }
          .institute-header-simple {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 0 10px;
          }
          .logo-left {
            width: 50px;
            height: 50px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo-left img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          .logo-right {
            width: 35px;
            height: 35px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo-right img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          .header-text {
            flex: 1;
            text-align: center;
            padding: 4px 0;
          }
          .society-name-simple {
            font-size: 8px;
            margin-bottom: 1px;
            color: #6c757d;
          }
          .institute-name-simple {
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            margin-bottom: 2px;
            color: #1a202c;
            letter-spacing: 0.3px;
          }
          .institute-address-simple {
            font-size: 8px;
            color: #6c757d;
          }
          .receipt-type-label {
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            font-size: 9px;
            margin-bottom: 4px;
            padding: 2px 4px;
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
            font-size: 12px;
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
            padding: 8px 8px;
            background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
            font-weight: bold;
            font-size: 14px;
            color: #1a202c;
            min-height: 35px;
            align-items: center;
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
            font-size: 13px;
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
            padding: 12px 0;
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
            font-size: 14px;
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            color: #1a202c;
          }
          .amount-in-words {
            border: 2px solid #000;
            border-top: none;
            padding: 5px 8px;
            font-size: 12px;
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
            font-size: 12px;
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
            padding: 10px;
            font-size: 12px;
            min-height: 40px;
            background: #f7fafc;
            color: #2d3748;
          }
          .cashier-info {
            font-size: 11px;
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
            font-size: 11px;
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
              font-size: 8px;
            }
            .receipt-container {
              page-break-inside: avoid;
              height: auto;
              max-height: none;
              overflow: visible;
            }
            .receipts-wrapper {
              height: auto;
              gap: 5px;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipts-wrapper">
          <!-- ORIGINAL RECEIPT -->
          <div class="receipt-container">
            <div class="receipt-header-box">
              <div class="duplicate-label">ORIGINAL</div>
              <div class="institute-header-simple">
                <div class="logo-left">
                  <img src="/logo1.png" alt="Logo" />
                </div>
                <div class="header-text">
                  <div class="society-name-simple">Maitrey Educational Society's</div>
                  <div class="institute-name-simple">NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY & MANAGEMENT</div>
                  <div class="institute-address-simple">Nagpur - 440023</div>
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
                <td class="label-cell">Name</td>
                <td class="value-cell" colspan="3">: ${receiptData.student?.firstName} ${receiptData.student?.lastName}</td>
              </tr>
              <tr>
                <td class="label-cell">Roll No</td>
                <td class="value-cell">: ${receiptData.student?.rollNumber || 'N/A'}</td>
                <td class="label-cell">Student Id.</td>
                <td class="value-cell">: ${receiptData.student?.studentId}</td>
              </tr>
            </table>
            
            <div class="received-section">
              <div class="received-label">Received the following:</div>
              <div class="amount-label">(₹)Amount</div>
            </div>
            
            <div class="fee-details-table">
              <table>
                <tbody>
                  ${receiptData.multipleFees && receiptData.multipleFees.length > 0
                    ? receiptData.multipleFees.map(fee => 
                        `<tr>
                          <td class="fee-name">${fee.feeHead}</td>
                          <td class="fee-amount">${fee.currentPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>`
                      ).join('')
                    : `<tr>
                        <td class="fee-name">${receiptData.feeHead?.title || receiptData.description || 'Fee Payment'}</td>
                        <td class="fee-amount">${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>`
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
              ${receiptData.paymentMethod === 'UPI' || receiptData.paymentMethod === 'Online' 
                ? `<div class="payment-info">UPI Amount : ₹${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | TID: ${receiptData.transactionId || 'N/A'} | ${receiptData.bankName || 'N/A'}</div>`
                : ''
              }
              <div class="payment-info">Remarks : ${receiptData.remarks || receiptData.description || 'Payment Received'}</div>
            </div>
            
            <div class="footer-signature">
              <div class="cashier-info">O1-${receiptData.collectedBy || 'Cashier'}/${receiptData.date}</div>
              <div class="cashier-name">${receiptData.collectedBy || 'Cashier Name'}</div>
              <div class="signature-label">RECEIVER'S SIGNATURE</div>
            </div>
          </div>

          <!-- DUPLICATE RECEIPT -->
          <div class="receipt-container">
            <div class="receipt-header-box">
              <div class="duplicate-label">DUPLICATE</div>
              <div class="institute-header-simple">
                <div class="logo-left">
                  <img src="/logo1.png" alt="Logo" />
                </div>
                <div class="header-text">
                  <div class="society-name-simple">Maitrey Educational Society's</div>
                  <div class="institute-name-simple">NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY & MANAGEMENT</div>
                  <div class="institute-address-simple">Nagpur - 440023</div>
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
                <td class="label-cell">Name</td>
                <td class="value-cell" colspan="3">: ${receiptData.student?.firstName} ${receiptData.student?.lastName}</td>
              </tr>
              <tr>
                <td class="label-cell">Roll No</td>
                <td class="value-cell">: ${receiptData.student?.rollNumber || 'N/A'}</td>
                <td class="label-cell">Student Id.</td>
                <td class="value-cell">: ${receiptData.student?.studentId}</td>
              </tr>
            </table>
            
            <div class="received-section">
              <div class="received-label">Received the following:</div>
              <div class="amount-label">(₹)Amount</div>
            </div>
            
            <div class="fee-details-table">
              <table>
                <tbody>
                  ${receiptData.multipleFees && receiptData.multipleFees.length > 0
                    ? receiptData.multipleFees.map(fee => 
                        `<tr>
                          <td class="fee-name">${fee.feeHead}</td>
                          <td class="fee-amount">${fee.currentPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>`
                      ).join('')
                    : `<tr>
                        <td class="fee-name">${receiptData.feeHead?.title || receiptData.description || 'Fee Payment'}</td>
                        <td class="fee-amount">${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>`
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
              ${receiptData.paymentMethod === 'UPI' || receiptData.paymentMethod === 'Online' 
                ? `<div class="payment-info">UPI Amount : ₹${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | TID: ${receiptData.transactionId || 'N/A'} | ${receiptData.bankName || 'N/A'}</div>`
                : ''
              }
              <div class="payment-info">Remarks : ${receiptData.remarks || receiptData.description || 'Payment Received'}</div>
            </div>
            
            <div class="footer-signature">
              <div class="cashier-info">O1-${receiptData.collectedBy || 'Cashier'}/${receiptData.date}</div>
              <div class="cashier-name">${receiptData.collectedBy || 'Cashier Name'}</div>
              <div class="signature-label">RECEIVER'S SIGNATURE</div>
            </div>
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Receipt Management
            </h1>
            
            {/* Export Overview Button */}
            <button
              onClick={() => setShowExportForm(true)}
              disabled={exportLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center space-x-2 transition-colors duration-200 disabled:opacity-50"
              title="Export student data with filters"
            >
              <span>{exportLoading ? '🔄 Exporting...' : '📊 Export Overview'}</span>
            </button>
          </div>

          {/* Search and Filters */}
          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div>
              <input
                type="text"
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="student">Student Fees</option>
                <option value="salary">Salary</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  fetchReceipts();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                title="Refresh data from server"
              >
                🔄 Refresh
              </button>
              <button
                type="button"
                onClick={validateAllReceipts}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                title="Remove invalid receipts that don't exist on server"
              >
                🧹 Validate All
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Receipts Table */}
        <div className="p-6">
          {receipts.filter((r) => r && typeof r === "object" && r._id)
            .length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-xl mb-2">📄</div>
              <p className="text-gray-500">No receipts found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                        Receipt Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receipts
                      .filter(
                        (receipt) =>
                          receipt && typeof receipt === "object" && receipt._id
                      )
                      .map((receipt) => (
                        <tr key={receipt._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {receipt.receiptNumber ||
                                  receipt.paymentId ||
                                  "N/A"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {receipt.description || "No description"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {receipt.recipientName || "Unknown"}
                            </div>
                            {receipt.studentId && (
                              <div className="text-sm text-gray-500">
                                ID: {receipt.studentId}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ₹{(receipt.amount || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {receipt.paymentMethod || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(
                                receipt.type
                              )}`}
                            >
                              {receipt.type === "student"
                                ? "Student Fee"
                                : "Salary"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                                receipt.status
                              )}`}
                            >
                              {receipt.status || "Unknown"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {receipt.paymentDate
                              ? formatDate(receipt.paymentDate)
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleViewReceipt(receipt)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View Receipt
                            </button>
                            <button
                              onClick={() => handleEditReceipt(receipt)}
                              className="text-yellow-600 hover:text-yellow-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteReceipt(receipt)}
                              className="text-red-600 hover:text-red-900 mr-3"
                            >
                              Delete
                            </button>
                            {receipt.receiptNumber && (
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    receipt.receiptNumber
                                  )
                                }
                                className="text-gray-600 hover:text-gray-900"
                                title="Copy Receipt Number"
                              >
                                📋
                              </button>
                            )}
                            {receipt.lastEditedBy && (
                              <div className="text-xs text-gray-500 mt-1">
                                Last Edited By:{" "}
                                <span className="font-bold text-blue-700">
                                  {receipt.lastEditedBy}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                  <div className="flex justify-between flex-1 sm:hidden">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">
                          {(currentPage - 1) * receiptsPerPage + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(
                            currentPage * receiptsPerPage,
                            pagination.totalReceipts
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {pagination.totalReceipts}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={!pagination.hasPrev}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ←
                        </button>
                        {[...Array(pagination.totalPages)].map((_, index) => (
                          <button
                            key={index + 1}
                            onClick={() => paginate(index + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === index + 1
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={!pagination.hasNext}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          →
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Export Form Modal */}
      {showExportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6 text-blue-700 text-center">
              Export Student Overview
            </h2>
            
            <div className="space-y-4">
              {/* Stream Dropdown */}
              <div>
                <label className="block text-sm font-bold mb-2">Stream</label>
                <select
                  name="stream"
                  value={exportFormData.stream}
                  onChange={handleExportFormChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Stream</option>
                  <option value="B.Tech">BTech</option>
                  <option value="MBA">MBA</option>
                </select>
              </div>

              {/* Department Dropdown */}
              <div>
                <label className="block text-sm font-bold mb-2">Department</label>
                <select
                  name="department"
                  value={exportFormData.department}
                  onChange={handleExportFormChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!exportFormData.stream}
                >
                  <option value="">Select Department</option>
                  <option value="All">All Departments</option>
                  {exportFormData.stream === 'B.Tech' && (
                    <>
                      <option value="CS">CS</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Mechancial">Mechanical</option>
                      <option value="Civil">Civil</option>
                      <option value="CSE&AIML">CSE&AIML</option>
                    </>
                  )}
                  {exportFormData.stream === 'MBA' && (
                    <option value="MBA">MBA</option>
                  )}
                </select>
              </div>

              {/* Year Dropdown - Show when Admission fee is selected */}
              {exportFormData.feeTypes.includes('Admission') && (
                <div>
                  <label className="block text-sm font-bold mb-2">Year</label>
                  <select
                    name="year"
                    value={exportFormData.year}
                    onChange={handleExportFormChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year (1st Sem)</option>
                    <option value="2nd Year">2nd Year (3rd Sem)</option>
                    <option value="3rd Year">3rd Year (5th Sem)</option>
                    <option value="4th Year">4th Year (7th Sem)</option>
                  </select>
                </div>
              )}

              {/* Semester Dropdown - Show when Exam fee is selected */}
              {exportFormData.feeTypes.includes('Exam') && (
                <div>
                  <label className="block text-sm font-bold mb-2">Semester</label>
                  <select
                    name="semester"
                    value={exportFormData.semester}
                    onChange={handleExportFormChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Semester</option>
                    <option value="1">1st Sem</option>
                    <option value="2">2nd Sem</option>
                    <option value="3">3rd Sem</option>
                    <option value="4">4th Sem</option>
                    <option value="5">5th Sem</option>
                    <option value="6">6th Sem</option>
                    <option value="7">7th Sem</option>
                    <option value="8">8th Sem</option>
                  </select>
                </div>
              )}

              {/* Fee Type Checkboxes */}
              <div>
                <label className="block text-sm font-bold mb-2">Fee Types</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="Admission"
                      checked={exportFormData.feeTypes.includes('Admission')}
                      onChange={handleExportFormChange}
                      className="mr-2"
                    />
                    Admission
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="Exam"
                      checked={exportFormData.feeTypes.includes('Exam')}
                      onChange={handleExportFormChange}
                      className="mr-2"
                    />
                    Exam
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowExportForm(false);
                  setExportFormData({ stream: '', department: '', year: '', semester: '', feeTypes: [] });
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={exportLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleExportDownload}
                disabled={exportLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {exportLoading ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-gray-100 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto border-2 border-gray-200">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-3 text-3xl">🧾</span>
                Official Payment Receipt
              </h2>
              <button
                onClick={() => setShowReceiptModal(false)}
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
                        width: 90%;
                        max-width: 650px;
                        border: 2px solid #2d3748;
                        background: white;
                        padding: 10px;
                        margin: 10px auto;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        page-break-inside: avoid;
                        min-height: 745px;
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
                        font-size: 14px;
                        text-transform: uppercase;
                        color: #dc3545;
                        margin-bottom: 15px;
                      }
                      .institute-header-simple {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 15px;
                        padding: 0 10px;
                      }
                      .logo-left {
                        width: 50px;
                        height: 50px;
                        flex-shrink: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      }
                      .logo-left img {
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                      }
                      .logo-right {
                        width: 35px;
                        height: 35px;
                        flex-shrink: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      }
                      .logo-right img {
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                      }
                      .header-text {
                        flex: 1;
                        text-align: center;
                        padding: 8px 0;
                      }
                      .society-name-simple {
                        font-size: 13px;
                        margin-bottom: 2px;
                        color: #6c757d;
                      }
                      .institute-name-simple {
                        font-weight: bold;
                        font-size: 16px;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                        color: #1a202c;
                        letter-spacing: 0.5px;
                      }
                      .institute-address-simple {
                        font-size: 13px;
                        color: #6c757d;
                      }
                      .receipt-type-label {
                        font-weight: bold;
                        text-align: center;
                        text-transform: uppercase;
                        font-size: 13px;
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
                        font-size: 12px;
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
                        padding: 8px 8px;
                        background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
                        font-weight: bold;
                        font-size: 14px;
                        color: #1a202c;
                        min-height: 35px;
                        align-items: center;
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
                        font-size: 13px;
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
                        padding: 12px 0;
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
                        font-size: 14px;
                        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                        color: #1a202c;
                      }
                      .amount-in-words {
                        border: 2px solid #000;
                        border-top: none;
                        padding: 5px 8px;
                        font-size: 12px;
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
                        font-size: 12px;
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
                        padding: 10px;
                        font-size: 12px;
                        min-height: 40px;
                        background: #f7fafc;
                        color: #2d3748;
                      }
                      .cashier-info {
                        font-size: 11px;
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
                        font-size: 11px;
                        margin-top: 5px;
                        color: #6c757d;
                      }
                      @media print {
                        @page {
                          size: A4;
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
                      <div class="receipt-container">
                        <div class="receipt-header-box">
                          <div class="duplicate-label">ORIGINAL</div>
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
                            <td class="value-cell">: ${receiptData.student?.caste || 'N/A'}</td>
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
                              ${receiptData.multipleFees && receiptData.multipleFees.length > 0
                                ? receiptData.multipleFees.map(fee => 
                                    `<tr>
                                      <td class="fee-name">${fee.feeHead}</td>
                                      <td class="fee-amount">${fee.currentPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>`
                                  ).join('')
                                : `<tr>
                                    <td class="fee-name">${receiptData.feeHead?.title || receiptData.description || 'Fee Payment'}</td>
                                    <td class="fee-amount">${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  </tr>`
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
                          ${receiptData.paymentMethod === 'UPI' || receiptData.paymentMethod === 'Online' 
                            ? `<div class="payment-info">UPI Amount : ${parseInt(receiptData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bank Info = Transaction ID : ${receiptData.transactionId || 'N/A'}, Date : ${receiptData.date}</div>
                               <div class="payment-info">Bank Name : ${receiptData.bankName || 'N/A'}, Location : ${receiptData.bankLocation || 'N/A'}</div>`
                            : ''
                          }
                          <div class="payment-info">Remarks : ${receiptData.remarks || receiptData.description || 'Payment Received'}</div>
                        </div>

                        <div class="footer-signature">
                          <div class="cashier-info">O1-${receiptData.collectedBy || 'Cashier'}/${receiptData.date}</div>
                          <div class="cashier-name">${receiptData.collectedBy || 'Cashier Name'}</div>
                          <div class="signature-label">RECEIVER'S SIGNATURE</div>
                        </div>

                        <div class="page-number">Page 1 of 1</div>
                      </div>
                    </div>
                  `
                }}
              />
            </div>            {/* Modal Actions */}
            <div className=" gap-3 border-t border-gray-200 pt-20 pb-6 px-6 flex justify-end space-x-8 bg-gradient-to-r from-gray-50 to-gray-100">
              <button
                onClick={printReceipt}
                className="w-32 px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center justify-center font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 text-sm"
              >
                <span className="mr-2 text-2xl">🖨️</span>
                Print Receipt
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-30 px-8 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 flex items-center justify-center font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 text-lg"
              >
                <span className="mr-2 text-2xl">✕</span>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to convert number to words
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  let words = '';
  
  // Handle thousands
  if (Math.floor(num / 1000) > 0) {
    words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  
  // Handle hundreds
  if (Math.floor(num / 100) > 0) {
    words += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  
  // Handle tens and ones
  if (num >= 10 && num < 20) {
    words += teens[num - 10] + ' ';
  } else {
    if (Math.floor(num / 10) > 0) {
      words += tens[Math.floor(num / 10)] + ' ';
    }
    if (num % 10 > 0) {
      words += ones[num % 10] + ' ';
    }
  }
  
  return words.trim() + ' Only';
};

export default Receipts;
