import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = 'http://localhost:4000';
const API_FEES = `${API_BASE}/api/fees`;
const API_EXAM_FEES = `${API_BASE}/api/exam-fees`;

const streams = ['B.Tech', 'MBA'];

const admissionFeeHeads = [
  'Tuition fees/Scholarship fees',
  'Caution money',
  'Development fund',
  'Admission form',
  'Hostel fees/Bus fees',
  'Misc. fees/other fees',
  'University student fees'
];

const examFeeHeads = [
  'Examination fees',
  'Degree fee',
  'Enrollment fee',
  'Im-migration fee',
  'Xerox copy of assessed answer sheet for revaluations',
  'Challenge to valuation',
  'University students fee',
  'Late fee',
  'Processing charges',
  'Other fee'
];

const batchOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const semesterOptions = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

// Hardcoded branch options
const branchOptions = {
  'B.Tech': ['CS', 'CSE&AIML', 'Civil', 'Mechanical', 'Electrical'],
  'MBA': ['MBA']
};

// Mapping from display format to database format
const batchToDbFormat = {
  '1st Year': '2022-2026',
  '2nd Year': '2021-2025',
  '3rd Year': '2020-2024',
  '4th Year': '2019-2023'
};

export default function FeeHeads() {
  const [selectedStream, setSelectedStream] = useState('B.Tech');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [fees, setFees] = useState([]);
  const [editFee, setEditFee] = useState({ head: '', amount: '' });
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState('simple'); // 'simple' or 'detailed'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentView, setCurrentView] = useState('fees'); // 'fees', 'exam-fees', or 'dashboard'
  const [admissionTotal, setAdmissionTotal] = useState(0);
  const [examTotal, setExamTotal] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [admissionData, setAdmissionData] = useState([]);
  const [examData, setExamData] = useState([]);
  
  // Exam fees state
  const [selectedSemester, setSelectedSemester] = useState('');
  const [examFees, setExamFees] = useState([]);
  const [examEditFee, setExamEditFee] = useState({ head: '', amount: '' });
  const [showExamModal, setShowExamModal] = useState(false);
  const [isExamSaving, setIsExamSaving] = useState(false);

  useEffect(() => {
    if (selectedStream && selectedBranch && selectedBatch) {
      fetchFees();
    } else {
      setFees([]);
    }
  }, [selectedStream, selectedBranch, selectedBatch]);

  useEffect(() => {
    if (selectedStream && selectedBranch && selectedSemester && currentView === 'exam-fees') {
      fetchExamFees();
    } else {
      setExamFees([]);
    }
  }, [selectedStream, selectedBranch, selectedSemester, currentView]);

  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchDashboardTotals();
    }
  }, [currentView]);

  const fetchDashboardTotals = async () => {
    setDashboardLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Use hardcoded branches for each stream
      const streamBranches = {};
      streams.forEach(stream => {
        streamBranches[stream] = branchOptions[stream] || [];
      });
      
      // Fetch admission fees data for all combinations
      const admissionPromises = [];
      streams.forEach(stream => {
        const branches = streamBranches[stream] || [];
        branches.forEach(branch => {
          batchOptions.forEach(batch => {
            const dbBatch = batchToDbFormat[batch] || batch;
            admissionPromises.push(
              axios.get(`${API_FEES}?stream=${encodeURIComponent(stream)}&branch=${encodeURIComponent(branch)}&batch=${encodeURIComponent(dbBatch)}`, { headers })
                .then(res => ({ stream, branch, batch, fees: res.data }))
                .catch(() => ({ stream, branch, batch, fees: [] }))
            );
          });
        });
      });

      const admissionResults = await Promise.all(admissionPromises);
      
      // Process admission data
      const admissionMap = {};
      let totalAdmission = 0;
      
      admissionResults.forEach(({ stream, branch, batch, fees }) => {
        const key = `${stream}-${branch}`;
        if (!admissionMap[key]) {
          admissionMap[key] = { stream, branch, years: { '1st Year': 0, '2nd Year': 0, '3rd Year': 0, '4th Year': 0 } };
        }
        
        // Map batches to years
        let year = batch;
        
        if (year) {
          const yearTotal = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
          admissionMap[key].years[year] = yearTotal;
          totalAdmission += yearTotal;
        }
      });

      const admissionTableData = Object.values(admissionMap).map(item => ({
        ...item,
        total: Object.values(item.years).reduce((sum, val) => sum + val, 0)
      }));

      setAdmissionData(admissionTableData);
      setAdmissionTotal(totalAdmission);

      // Fetch exam fees data for all combinations
      const examPromises = [];
      streams.forEach(stream => {
        const branches = streamBranches[stream] || [];
        branches.forEach(branch => {
          ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].forEach(semester => {
            examPromises.push(
              axios.get(`${API_EXAM_FEES}?stream=${encodeURIComponent(stream)}&branch=${encodeURIComponent(branch)}&semester=${encodeURIComponent(semester)}`, { headers })
                .then(res => ({ stream, branch, semester, fees: res.data }))
                .catch(() => ({ stream, branch, semester, fees: [] }))
            );
          });
        });
      });

      const examResults = await Promise.all(examPromises);
      
      // Process exam data - keep semester-wise
      const examMap = {};
      let totalExam = 0;
      
      examResults.forEach(({ stream, branch, semester, fees }) => {
        const key = `${stream}-${branch}`;
        if (!examMap[key]) {
          examMap[key] = { 
            stream, 
            branch, 
            semesters: { 
              'Semester 1': 0, 
              'Semester 2': 0, 
              'Semester 3': 0, 
              'Semester 4': 0,
              'Semester 5': 0,
              'Semester 6': 0,
              'Semester 7': 0,
              'Semester 8': 0
            } 
          };
        }
        
        const semesterTotal = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
        examMap[key].semesters[semester] = semesterTotal;
        totalExam += semesterTotal;
      });

      const examTableData = Object.values(examMap).map(item => ({
        ...item,
        total: Object.values(item.semesters).reduce((sum, val) => sum + val, 0)
      }));

      setExamData(examTableData);
      setExamTotal(totalExam);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setDashboardLoading(false);
  };

  const fetchFees = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const dbBatch = batchToDbFormat[selectedBatch] || selectedBatch;
      const params = { stream: selectedStream, branch: selectedBranch, batch: dbBatch };
      const res = await axios.get(API_FEES, { params, headers });
      setFees(res.data);
    } catch (error) {
      console.error("Failed to fetch fees:", error);
    }
  };

  const handleEdit = (head, amount) => {
    setEditFee({ head, amount: amount.toString() });
    setShowModal(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const dbBatch = batchToDbFormat[selectedBatch] || selectedBatch;
      const payload = {
        stream: selectedStream,
        branch: selectedBranch,
        batch: dbBatch,
        head: editFee.head,
        amount: Number(editFee.amount)
      };
      await axios.put(`${API_FEES}/update`, payload, { headers });
      alert('Fee updated successfully');
      setShowModal(false);
      fetchFees();
    } catch (error) {
      alert('Failed to update fee');
      console.error("Failed to update fee:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchExamFees = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = { stream: selectedStream, branch: selectedBranch, semester: selectedSemester };
      const res = await axios.get(API_EXAM_FEES, { params, headers });
      setExamFees(res.data);
    } catch (error) {
      console.error("Failed to fetch exam fees:", error);
    }
  };

  const handleExamEdit = (head, amount) => {
    setExamEditFee({ head, amount: amount.toString() });
    setShowExamModal(true);
  };

  const handleExamSave = async () => {
    setIsExamSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        stream: selectedStream,
        branch: selectedBranch,
        semester: selectedSemester,
        head: examEditFee.head,
        amount: Number(examEditFee.amount)
      };
      await axios.put(`${API_EXAM_FEES}/update`, payload, { headers });
      alert('Exam fee updated successfully');
      setShowExamModal(false);
      fetchExamFees();
    } catch (error) {
      alert('Failed to update exam fee');
      console.error("Failed to update exam fee:", error);
    } finally {
      setIsExamSaving(false);
    }
  };

  const getExamAmount = (head) => {
    const fee = examFees.find(f => f.head === head);
    return fee ? fee.amount : 0;
  };

  const examTotalAmount = examFees.reduce((sum, f) => sum + Number(f.amount), 0);

  const getAmount = (head) => {
    const fee = fees.find(f => f.head === head);
    return fee ? fee.amount : 0;
  };

  const total = fees.reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Fees Management
        </h1>

        {/* View Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow p-1 flex flex-wrap">
            <button
              onClick={() => {
                setCurrentView('fees');
                setSelectedBatch('');
                setSelectedSemester('');
              }}
              className={`px-4 py-2 rounded-md font-medium transition text-sm md:text-base ${currentView === 'fees' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Admission Fees
            </button>
            <button
              onClick={() => {
                setCurrentView('exam-fees');
                setSelectedBatch('');
                setSelectedSemester('');
              }}
              className={`px-4 py-2 rounded-md font-medium transition text-sm md:text-base ${currentView === 'exam-fees' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Exam Fees
            </button>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setSelectedBatch('');
                setSelectedSemester('');
              }}
              className={`px-4 py-2 rounded-md font-medium transition text-sm md:text-base ${currentView === 'dashboard' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Dashboard
            </button>
          </div>
        </div>

        {currentView === 'fees' && <>
        {/* Stream Selection Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Stream</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">Stream</label>
              <select
                value={selectedStream}
                onChange={(e) => {
                  setSelectedStream(e.target.value);
                  setSelectedBranch('');
                  setSelectedBatch('');
                }}
                className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-lg transition-colors bg-white"
              >
                <option value="">-- Select Stream --</option>
                {streams.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Advanced Options Toggle */}
            <div className="flex items-center space-x-3">
              <label className="text-lg font-semibold text-gray-700">Advanced Options</label>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showAdvanced ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAdvanced ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 ${showAdvanced ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-2">Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={!selectedStream}
                    className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-lg transition-colors bg-white disabled:bg-gray-100"
                  >
                    <option value="">
                      -- Select Branch --
                    </option>
                    {(branchOptions[selectedStream] || []).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-2">Batch</label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-lg transition-colors bg-white"
                  >
                    <option value="">-- Select Batch --</option>
                    {batchOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fees Display */}
        {selectedStream && selectedBranch && selectedBatch && (
          <div className="space-y-6">
            {viewMode === 'detailed' && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  Fees Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{admissionFeeHeads.length}</div>
                    <div className="text-gray-600">Fee Heads</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">₹{total.toLocaleString()}</div>
                    <div className="text-gray-600">Total Amount</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedStream}</div>
                    <div className="text-gray-600">Stream</div>
                  </div>
                </div>
                <div className="text-center text-gray-600">
                  Branch: {selectedBranch} | Batch: {selectedBatch}
                </div>
              </div>
            )}

            {/* Fees Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="text-2xl">📋</span>
                  Fee Heads Overview
                </h3>
                <p className="text-gray-600 text-base mt-1">
                  {selectedStream} - {selectedBranch} - {selectedBatch}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-4 text-left text-gray-700 text-lg font-semibold border-b border-gray-200">
                        Fee Head
                      </th>
                      <th className="p-4 text-right text-gray-700 text-lg font-semibold border-b border-gray-200">
                        Amount (₹)
                      </th>
                      <th className="p-4 text-center text-gray-700 text-lg font-semibold border-b border-gray-200">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissionFeeHeads.map((head, idx) => (
                      <tr
                        key={head}
                        className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-25"
                        }`}
                      >
                        <td className="p-4 text-gray-900 text-lg font-medium flex items-center gap-3">
                          {viewMode === 'detailed' && (
                            <span className="text-2xl">
                              {head === 'Tuition fees' ? '🎓' :
                               head === 'Caution money' ? '💰' :
                               head === 'Development fund' ? '🏗️' :
                               head === 'Admission form' ? '📄' :
                               head === 'Hostel fees/Bus fees' ? '🏠' :
                               head === 'Misc. fees/other fees' ? '📋' :
                               '🏛️'}
                            </span>
                          )}
                          {head}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-lg font-semibold text-green-700">
                            ₹{Number(getAmount(head)).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleEdit(head, getAmount(head))}
                            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-md shadow-sm hover:shadow-md transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15.232 5.232l3.536 3.536M9 11l6 6M3 17v4h4l11-11a2.828 2.828 0 00-4-4L3 17z"
                              />
                            </svg>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="p-4 text-left">
                        <span className="text-lg font-bold text-gray-800">TOTAL</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xl font-bold text-green-700">
                          ₹{total.toLocaleString()}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Edit {editFee.head}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    value={editFee.amount}
                    onChange={(e) => setEditFee({ ...editFee, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-lg transition-colors bg-white"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </>}

        {currentView === 'exam-fees' && <>
        {/* Exam Fees Stream Selection Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Stream for Exam Fees</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">Stream</label>
              <select
                value={selectedStream}
                onChange={(e) => {
                  setSelectedStream(e.target.value);
                  setSelectedBranch('');
                  setSelectedSemester('');
                }}
                className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-lg transition-colors bg-white"
              >
                <option value="">-- Select Stream --</option>
                {streams.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Advanced Options Toggle */}
            <div className="flex items-center space-x-3">
              <label className="text-lg font-semibold text-gray-700">Advanced Options</label>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showAdvanced ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAdvanced ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 ${showAdvanced ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-2">Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={!selectedStream}
                    className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-lg transition-colors bg-white disabled:bg-gray-100"
                  >
                    <option value="">
                      -- Select Branch --
                    </option>
                    {(branchOptions[selectedStream] || []).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-2">Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    disabled={!selectedStream || !selectedBranch}
                    className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-lg transition-colors bg-white disabled:bg-gray-100"
                  >
                    <option value="">-- Select Semester --</option>
                    {semesterOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exam Fees Display */}
        {selectedStream && selectedBranch && selectedSemester && (
          <div className="space-y-6">
            {viewMode === 'detailed' && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  Exam Fees Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{examFeeHeads.length}</div>
                    <div className="text-gray-600">Fee Heads</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">₹{examTotalAmount.toLocaleString()}</div>
                    <div className="text-gray-600">Total Amount</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedStream}</div>
                    <div className="text-gray-600">Stream</div>
                  </div>
                </div>
                <div className="text-center text-gray-600">
                  Branch: {selectedBranch} | Semester: {selectedSemester}
                </div>
              </div>
            )}

            {/* Exam Fees Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  Exam Fee Heads Overview
                </h3>
                <p className="text-gray-600 text-base mt-1">
                  {selectedStream} - {selectedBranch} - {selectedSemester}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-4 text-left text-gray-700 text-lg font-semibold border-b border-gray-200">
                        Fee Head
                      </th>
                      <th className="p-4 text-right text-gray-700 text-lg font-semibold border-b border-gray-200">
                        Amount (₹)
                      </th>
                      <th className="p-4 text-center text-gray-700 text-lg font-semibold border-b border-gray-200">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {examFeeHeads.map((head, idx) => (
                      <tr
                        key={head}
                        className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-25"
                        }`}
                      >
                        <td className="p-4 text-gray-900 text-lg font-medium flex items-center gap-3">
                          {viewMode === 'detailed' && (
                            <span className="text-2xl">
                              {head === 'Examination fees' ? '📝' :
                               head === 'Degree fee' ? '🎓' :
                               head === 'Enrollment fee' ? '📋' :
                               head === 'Im-migration fee' ? '✈️' :
                               head === 'Xerox copy of assessed answer sheet for revaluations' ? '📄' :
                               head === 'Challenge to valuation' ? '⚖️' :
                               head === 'University students fee' ? '🏛️' :
                               head === 'Late fee' ? '⏰' :
                               head === 'Processing charges' ? '⚙️' :
                               '📋'}
                            </span>
                          )}
                          {head}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-lg font-semibold text-green-700">
                            ₹{Number(getExamAmount(head)).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleExamEdit(head, getExamAmount(head))}
                            className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-md shadow-sm hover:shadow-md transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15.232 5.232l3.536 3.536M9 11l6 6M3 17v4h4l11-11a2.828 2.828 0 00-4-4L3 17z"
                              />
                            </svg>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="p-4 text-left">
                        <span className="text-lg font-bold text-gray-800">TOTAL</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xl font-bold text-green-700">
                          ₹{examTotalAmount.toLocaleString()}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Exam Edit Modal */}
        {showExamModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Edit {examEditFee.head} - {selectedSemester}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    value={examEditFee.amount}
                    onChange={(e) => setExamEditFee({ ...examEditFee, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none text-lg transition-colors bg-white"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleExamSave}
                    disabled={isExamSaving}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExamSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setShowExamModal(false)}
                    disabled={isExamSaving}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </>}

        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {dashboardLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading dashboard...</p>
              </div>
            ) : (
              <>
                {/* Admission Fees Table */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="text-2xl">📚</span>
                      Admission Fees Overview
                    </h3>
                    <p className="text-gray-600 text-base mt-1">
                      Fee breakdown by stream, branch, and academic year
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stream</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                          <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">1st</th>
                          <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">2nd</th>
                          <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">3rd</th>
                          <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">4th year</th>
                          <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {admissionData.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.stream}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.branch}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{row.years['1st Year']?.toLocaleString() || '0'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{row.years['2nd Year']?.toLocaleString() || '0'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{row.years['3rd Year']?.toLocaleString() || '0'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{row.years['4th Year']?.toLocaleString() || '0'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-blue-600">₹{row.total.toLocaleString()}</td>
                          </tr>
                        ))}
                        {admissionData.length > 0 && (
                          <tr className="bg-blue-50 font-bold">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan="6">Grand Total</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-600">₹{admissionTotal.toLocaleString()}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Exam Fees Table */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      Exam Fees Overview
                    </h3>
                    <p className="text-gray-600 text-base mt-1">
                      Exam fee breakdown by stream, branch, and semester
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stream</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sem 1</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sem 2</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sem 3</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sem 4</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sem 5</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sem 6</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sem 7</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sem 8</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {examData.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.stream}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.branch}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{(row.semesters?.['Semester 1'] || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{(row.semesters?.['Semester 2'] || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{(row.semesters?.['Semester 3'] || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{(row.semesters?.['Semester 4'] || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{(row.semesters?.['Semester 5'] || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{(row.semesters?.['Semester 6'] || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{(row.semesters?.['Semester 7'] || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">₹{(row.semesters?.['Semester 8'] || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-semibold text-green-600">₹{(row.total || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {examData.length > 0 && (
                          <tr className="bg-green-50 font-bold">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" colSpan="10">Grand Total</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-green-600">₹{examTotal.toLocaleString()}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setCurrentView('fees')}>
                      <h3 className="font-medium">Update Admission Fees</h3>
                      <p className="text-sm text-gray-600">Modify fees for new batches</p>
                    </div>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setCurrentView('exam-fees')}>
                      <h3 className="font-medium">Update Exam Fees</h3>
                      <p className="text-sm text-gray-600">Modify fees for different semesters</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
