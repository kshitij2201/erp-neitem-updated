import { useState, useEffect } from "react";
import axios from "axios";
import PaymentForm from "../../components/PaymentForm";

export default function FeePayment() {
  const [students, setStudents] = useState([]);
  const [feeData, setFeeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Get authentication token
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const localRes = await axios.get(
          "http://erpbackend.tarstech.in/api/students",
          {
            headers,
          }
        );
        const studentList = localRes.data;
        setStudents(studentList);
        await fetchFeeHeads(studentList);
      } catch (localErr) {
        console.error("Failed to fetch students:", localErr);
        if (localErr.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
        } else {
          setError(
            "Failed to load student data. Please check your backend server."
          );
        }
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchFeeHeads = async (studentList) => {
      const feesMap = {};
      await Promise.all(
        studentList.map(async (student) => {
          try {
            // Get authentication token
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const feeRes = await axios.get(
              `http://erpbackend.tarstech.in/api/fee-heads/applicable/${student._id}`,
              { headers }
            );
            const heads = feeRes.data;
            const total = heads.reduce((sum, h) => sum + h.amount, 0);
            const paid = student.feesPaid || 0;
            const scholarship = student.scholarshipAmount || 0;
            // Use stored pendingAmount instead of calculating it
            const pending = student.pendingAmount || 0;

            feesMap[student._id] = {
              total,
              paid,
              pending,
              scholarship,
              heads,
            };
          } catch (err) {
            // Use stored values as fallback
            const paid = student.feesPaid || 0;
            const scholarship = student.scholarshipAmount || 0;
            const pending = student.pendingAmount || 0;
            const total = paid + pending; // Estimate total from stored values
            
            feesMap[student._id] = {
              total,
              paid,
              pending,
              scholarship,
              heads: [],
            };
          }
        })
      );
      setFeeData(feesMap);
    };

    fetchStudents();
  }, []);

  const handlePaymentComplete = (payment, updatedStudent) => {
    setStudents((prev) =>
      prev.map((student) =>
        student._id === updatedStudent._id
          ? {
              ...student,
              feesPaid: updatedStudent.feesPaid,
              pendingAmount: updatedStudent.pendingAmount,
            }
          : student
      )
    );
    setFeeData((prev) => ({
      ...prev,
      [updatedStudent._id]: {
        ...prev[updatedStudent._id],
        paid: updatedStudent.feesPaid,
        pending: updatedStudent.pendingAmount,
      },
    }));
    setShowPaymentForm(false);
    setSelectedStudent(null);
  };

  if (loading) return <p>Loading student records…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  // Calculate overall totals
  const overallTotals = students.reduce(
    (totals, student) => {
      const fee = feeData[student._id] || { total: 0, paid: 0, pending: 0, scholarship: 0 };
      return {
        totalFees: totals.totalFees + fee.total,
        totalPaid: totals.totalPaid + fee.paid,
        totalPending: totals.totalPending + fee.pending,
        totalScholarship: totals.totalScholarship + fee.scholarship,
      };
    },
    { totalFees: 0, totalPaid: 0, totalPending: 0, totalScholarship: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h1 className="text-2xl font-bold">💳 Fee Payment Portal</h1>
        <p className="text-gray-600">
          Process student fee payments and manage payment records
        </p>
        <div className="mt-2 text-sm text-blue-700">
          💡 For comprehensive student overview including insurance details,
          visit{" "}
          <a
            href="/students/details"
            className="font-medium underline hover:text-blue-800"
          >
            Student Details & Overview
          </a>
        </div>
      </div>

      {/* Overall Fee Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Overall Fee Summary - All Students
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-gray-600 font-medium">Total Fees Applied</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              ₹{overallTotals.totalFees.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">From Fee Heads</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-gray-600 font-medium">Total Paid</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              ₹{overallTotals.totalPaid.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">By All Students</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm text-gray-600 font-medium">Total Scholarship</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              ₹{overallTotals.totalScholarship.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Applied</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-sm text-gray-600 font-medium">Total Pending</div>
            <div className={`text-2xl font-bold mt-1 ${
              overallTotals.totalPending > 0 ? "text-red-600" : "text-green-700"
            }`}>
              ₹{overallTotals.totalPending.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">To Collect</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">
            <strong>Collection Progress:</strong> {((overallTotals.totalPaid / overallTotals.totalFees) * 100).toFixed(1)}% of total fees collected
            ({overallTotals.totalPaid.toLocaleString('en-IN')} out of {overallTotals.totalFees.toLocaleString('en-IN')})
          </div>
        </div>
      </div>
      {students.length === 0 ? (
        <div className="bg-white rounded shadow p-6 text-center">
          <p className="text-gray-500">No students found.</p>
          <p className="text-sm text-gray-400 mt-2">
            Try running:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              cd backend && node seed-data.js
            </code>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {students.map((student) => {
            const fee = feeData[student._id] || {
              total: 0,
              paid: 0,
              pending: 0,
              scholarship: 0,
              heads: [],
            };

            return (
              <div key={student._id} className="bg-white rounded shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {student.firstName}{" "}
                      {student.middleName ? `${student.middleName} ` : ""}
                      {student.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      ID: {student.studentId}
                    </p>
                    <p className="text-sm text-gray-600">
                      Enrollment: {student.enrollmentNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Department:{" "}
                      {student.department?.name || student.department}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Caste: {student.casteCategory?.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: {student.academicStatus}
                    </p>
                  </div>
                </div>

                {/* Fee Summary */}
                <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Fees</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₹{fee.total}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="text-lg font-bold text-green-600">
                      ₹{fee.paid}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Scholarship</p>
                    <p className="text-lg font-bold text-yellow-600">
                      ₹{fee.scholarship}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p
                      className={`text-lg font-bold ${
                        fee.pending > 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      ₹{fee.pending}
                    </p>
                  </div>
                </div>

                {/* Fee Heads */}
                {fee.heads.length > 0 && (
                  <div className="mb-4">
                    <p className="font-medium text-gray-800 mb-2">Fee Heads:</p>
                    <ul className="list-disc list-inside text-gray-700">
                      {fee.heads.map((h, i) => (
                        <li key={i}>
                          {h.title} – ₹{h.amount}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => {
                    setSelectedStudent(student);
                    setShowPaymentForm(true);
                  }}
                >
                  Make Payment
                </button>
              </div>
            );
          })}
        </div>
      )}
      {showPaymentForm && selectedStudent && (
        <PaymentForm
          student={selectedStudent}
          onClose={() => setShowPaymentForm(false)}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
