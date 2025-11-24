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

  // Calculate pagination values
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = Math.min(startIndex + studentsPerPage, totalStudents);
  const totalPages = Math.ceil(totalStudents / studentsPerPage);

  // Fetch financial summary on component mount
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

  // Update students when allStudents or currentPage changes
  useEffect(() => {
    const currentPageStudents = allStudents.slice(startIndex, endIndex);
    setStudents(currentPageStudents);
  }, [allStudents, currentPage, studentsPerPage]);

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

    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
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

    // Process in batches of 5 for faster initial load
    const batchSize = 5;
    for (let i = 0; i < studentList.length; i += batchSize) {
      const batch = studentList.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (student) => {
        try {
          // Fetch fee heads with semester matching
          const feeRes = await axios.get(
            `https://backenderp.tarstech.in/api/fee-heads/applicable/${student._id}`,
            {
              headers,
              params: {
                semester: student.currentSemester,
                stream: student.stream?.name || student.stream,
                department: student.department?.name || student.department,
              },
            }
          );
          const heads = feeRes.data;
          console.log(
            `Student ${student.firstName} ${student.lastName} (Sem ${student.currentSemester}): Total fee heads received: ${heads.length}`
          );

          // Filter fee heads that match student's current semester
          const applicableHeads = heads.filter((head) => {
            // Check if fee head is for student's current semester
            if (head.semester && student.currentSemester) {
              const matches = head.semester === student.currentSemester;
              if (!matches) {
                console.log(
                  `Fee head "${head.title}" (Sem ${head.semester}) filtered out for student in Sem ${student.currentSemester}`
                );
              }
              return matches;
            }
            // If no semester specified in fee head, apply to all
            console.log(
              `Fee head "${head.title}" has no semester - applying to all students`
            );
            return true;
          });

          console.log(
            `Student ${student.firstName}: Applicable fee heads after filtering: ${applicableHeads.length}`
          );

          const total = applicableHeads.reduce((sum, h) => sum + h.amount, 0);
          const paid = student.feesPaid || 0;
          const pending = total - paid;

          feesMap[student._id] = {
            total,
            paid,
            pending,
            heads: applicableHeads,
            semester: student.currentSemester,
            totalHeadsReceived: heads.length,
            applicableHeadsCount: applicableHeads.length,
          };
        } catch (err) {
          console.error(
            `Error fetching fee heads for student ${student._id}:`,
            err
          );
          // Provide fallback data instead of failing completely
          feesMap[student._id] = {
            total: 0,
            paid: student.feesPaid || 0,
            pending: 0,
            heads: [],
            semester: student.currentSemester,
            totalHeadsReceived: 0,
            applicableHeadsCount: 0,
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

        // Fetch all students for search (no pagination in API call)
        const res = await axios.get(
          "https://backenderp.tarstech.in/api/students/public",
          {
            params: { 
              search: debouncedSearchTerm,
              limit: 10000, // Get all students
              page: 1
            }
          }
        );
        
        console.log('API Response:', res.data);
        
        // Parse response - get all students
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
        setAllStudents(allStudentList);
        setTotalStudents(allStudentList.length);
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
  }, [debouncedSearchTerm]);

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
                  {/* Semester-based Fee Summary */}
                  <div className="bg-green-50 p-4 rounded-lg mt-6">
                    <p className="font-bold text-green-900 mb-2 text-lg">
                      Semester {selectedStudent.currentSemester} Fees:
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
                    {/* Debug Information */}
                    <div className="mt-2 text-xs text-gray-600 border-t pt-2">
                      <p>
                        Debug: Total fee heads received:{" "}
                        {fee.totalHeadsReceived || 0}
                      </p>
                      <p>
                        Debug: Applicable for this semester:{" "}
                        {fee.applicableHeadsCount || 0}
                      </p>
                      <p>
                        Debug: Filtered out:{" "}
                        {(fee.totalHeadsReceived || 0) -
                          (fee.applicableHeadsCount || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Applied Fee Heads */}
                  {fee.heads.length > 0 && (
                    <div className="mt-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center text-lg">
                          💰 Applied Fee Heads for Semester{" "}
                          {selectedStudent.currentSemester}
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
                                    {h.title}
                                  </h4>
                                  {h.description && (
                                    <p className="text-sm text-gray-700 mt-1 font-medium">
                                      {h.description}
                                    </p>
                                  )}
                                  {h.semester && (
                                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mt-2 font-bold">
                                      Semester {h.semester}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right ml-3">
                                  <div className="font-bold text-xl text-green-700">
                                    ₹{h.amount}
                                  </div>
                                  {h.dueDate && (
                                    <div className="text-sm text-gray-600 font-semibold">
                                      Due:{" "}
                                      {new Date(h.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
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
            <h1 className="text-3xl font-bold mb-4">🧑 Student Detail Records</h1>

            {/* Search Section */}
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
                  Stream-wise Student Count
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
                        Students: {count}
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
