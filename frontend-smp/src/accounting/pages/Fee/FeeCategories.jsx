import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = 'http://localhost:4000';

export default function FeeCategories() {
  const [activeTab, setActiveTab] = useState('admission'); // 'admission' or 'exam'
  const [admissionFees, setAdmissionFees] = useState([]);
  const [examFees, setExamFees] = useState([]);

  // Admission fee categories from the receipt
  const admissionCategories = [
    { id: 1, name: "Tuition Fees", key: "tuitionFees" },
    { id: 2, name: "Caution Money", key: "cautionMoney" },
    { id: 3, name: "Development Fund", key: "developmentFund" },
    { id: 4, name: "Admission Form", key: "admissionForm" },
    { id: 5, name: "Hostel Fees / Bus Fees", key: "hostelBusFees" },
    { id: 6, name: "Misc Fees / Other Fees", key: "miscFees" },
    { id: 7, name: "University Students Fees", key: "universityFees" },
  ];

  // Exam fee categories from the receipt
  const examCategories = [
    { id: 1, name: "Examination Fees", key: "examinationFees" },
    { id: 2, name: "Degree Fee", key: "degreeFee" },
    { id: 3, name: "Enrollment Fee", key: "enrollmentFee" },
    { id: 4, name: "Im-migration Fee", key: "immigrationFee" },
    { id: 5, name: "Xerox Copy of Assessed Answer sheet for Revaluations", key: "xeroxFee" },
    { id: 6, name: "Challenge to Valuation", key: "challengeFee" },
    { id: 7, name: "University Students Fee", key: "universityStudentFee" },
    { id: 8, name: "Processing Charges", key: "processingCharges" },
    { id: 9, name: "Other Fee", key: "otherFee" },
  ];

  const [admissionForm, setAdmissionForm] = useState({
    tuitionFees: "",
    cautionMoney: "",
    developmentFund: "",
    admissionForm: "",
    hostelBusFees: "",
    miscFees: "",
    universityFees: "",
  });

  const [examForm, setExamForm] = useState({
    examinationFees: "",
    degreeFee: "",
    enrollmentFee: "",
    immigrationFee: "",
    xeroxFee: "",
    challengeFee: "",
    universityStudentFee: "",
    processingCharges: "",
    otherFee: "",
  });

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${API_BASE}/api/fee-categories`, { headers });
      
      // Separate admission and exam fees
      const admission = response.data.filter(f => f.category === 'admission');
      const exam = response.data.filter(f => f.category === 'exam');
      
      setAdmissionFees(admission);
      setExamFees(exam);
    } catch (error) {
      console.error("Failed to fetch fees:", error);
    }
  };

  const handleAdmissionChange = (key, value) => {
    setAdmissionForm(prev => ({ ...prev, [key]: value }));
  };

  const handleExamChange = (key, value) => {
    setExamForm(prev => ({ ...prev, [key]: value }));
  };

  const handleAdmissionSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Only submit non-empty values
      const entries = Object.entries(admissionForm)
        .filter(([_, value]) => value !== "" && parseFloat(value) > 0)
        .map(([key, value]) => ({
          key,
          amount: parseFloat(value),
          category: 'admission'
        }));

      if (entries.length === 0) {
        alert("Please enter at least one amount");
        return;
      }

      await axios.post(`${API_BASE}/api/fee-categories/bulk`, { entries }, { headers });
      
      // Reset form and refresh
      setAdmissionForm({
        tuitionFees: "",
        cautionMoney: "",
        developmentFund: "",
        admissionForm: "",
        hostelBusFees: "",
        miscFees: "",
        universityFees: "",
      });
      
      fetchFees();
      alert("Admission fees saved successfully!");
    } catch (error) {
      console.error("Failed to save admission fees:", error);
      alert("Failed to save admission fees");
    }
  };

  const handleExamSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Only submit non-empty values
      const entries = Object.entries(examForm)
        .filter(([_, value]) => value !== "" && parseFloat(value) > 0)
        .map(([key, value]) => ({
          key,
          amount: parseFloat(value),
          category: 'exam'
        }));

      if (entries.length === 0) {
        alert("Please enter at least one amount");
        return;
      }

      await axios.post(`${API_BASE}/api/fee-categories/bulk`, { entries }, { headers });
      
      // Reset form and refresh
      setExamForm({
        examinationFees: "",
        degreeFee: "",
        enrollmentFee: "",
        immigrationFee: "",
        xeroxFee: "",
        challengeFee: "",
        universityStudentFee: "",
        processingCharges: "",
        otherFee: "",
      });
      
      fetchFees();
      alert("Exam fees saved successfully!");
    } catch (error) {
      console.error("Failed to save exam fees:", error);
      alert("Failed to save exam fees");
    }
  };

  const calculateTotal = (form) => {
    return Object.values(form)
      .filter(v => v !== "")
      .reduce((sum, val) => sum + parseFloat(val || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Fee Categories Management
        </h1>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('admission')}
            className={`flex-1 py-3 px-6 rounded-md font-semibold text-lg transition-all ${
              activeTab === 'admission'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📚 Admission Fees
          </button>
          <button
            onClick={() => setActiveTab('exam')}
            className={`flex-1 py-3 px-6 rounded-md font-semibold text-lg transition-all ${
              activeTab === 'exam'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 Exam Fees
          </button>
        </div>

        {/* Admission Fees Section */}
        {activeTab === 'admission' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-blue-600 p-4 rounded-xl shadow-md">
                <span className="text-3xl">🎓</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Admission Fee Structure</h2>
                <p className="text-gray-600">Configure fees for new admissions</p>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📋</span>
                <h3 className="text-xl font-bold text-blue-900">Fee Particulars</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-4 text-left text-gray-700 font-semibold border-b">Sr. No.</th>
                      <th className="p-4 text-left text-gray-700 font-semibold border-b">Particulars</th>
                      <th className="p-4 text-center text-gray-700 font-semibold border-b w-48">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissionCategories.map((category) => (
                      <tr key={category.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-gray-800 font-medium">{category.id}</td>
                        <td className="p-4 text-gray-800">{category.name}</td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={admissionForm[category.key]}
                            onChange={(e) => handleAdmissionChange(category.key, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="0"
                            min="0"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-100 font-bold">
                      <td colSpan="2" className="p-4 text-right text-gray-800 text-lg">TOTAL</td>
                      <td className="p-4 text-center text-blue-900 text-xl">
                        ₹{calculateTotal(admissionForm).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleAdmissionSubmit}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-lg rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  💾 Save Admission Fees
                </button>
              </div>
            </div>

            {/* Current Admission Fees Display */}
            {admissionFees.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Current Admission Fee Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {admissionFees.map((fee) => (
                    <div key={fee._id} className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">{fee.name}</div>
                      <div className="text-xl font-bold text-blue-700">₹{fee.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exam Fees Section */}
        {activeTab === 'exam' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-green-600 p-4 rounded-xl shadow-md">
                <span className="text-3xl">📝</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Examination Fee Structure</h2>
                <p className="text-gray-600">Configure fees for examinations and related services</p>
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📋</span>
                <h3 className="text-xl font-bold text-green-900">Fee Particulars</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-4 text-left text-gray-700 font-semibold border-b">Sr. No.</th>
                      <th className="p-4 text-left text-gray-700 font-semibold border-b">Particulars</th>
                      <th className="p-4 text-center text-gray-700 font-semibold border-b w-48">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examCategories.map((category) => (
                      <tr key={category.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-gray-800 font-medium">{category.id}</td>
                        <td className="p-4 text-gray-800">{category.name}</td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={examForm[category.key]}
                            onChange={(e) => handleExamChange(category.key, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-center focus:ring-2 focus:ring-green-500 focus:outline-none"
                            placeholder="0"
                            min="0"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-green-100 font-bold">
                      <td colSpan="2" className="p-4 text-right text-gray-800 text-lg">TOTAL</td>
                      <td className="p-4 text-center text-green-900 text-xl">
                        ₹{calculateTotal(examForm).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleExamSubmit}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-lg rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  💾 Save Exam Fees
                </button>
              </div>
            </div>

            {/* Current Exam Fees Display */}
            {examFees.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Current Exam Fee Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {examFees.map((fee) => (
                    <div key={fee._id} className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">{fee.name}</div>
                      <div className="text-xl font-bold text-green-700">₹{fee.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
