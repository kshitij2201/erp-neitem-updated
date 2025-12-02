import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ExamFees = () => {
  const [stream, setStream] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [newAmount, setNewAmount] = useState('');

  const streams = ['B.Tech', 'MBA'];

  const branches = {
    'B.Tech': [
      'Computer Science & Engineering (CSE)',
      'CSE – Artificial Intelligence & Machine Learning (CSE-AIML)',
      'Electrical Engineering (EE)',
      'Mechanical Engineering (ME)',
      'Civil Engineering (CE)',
      'CSE – Cyber Security (CSE-CS)'
    ],
    'MBA': [
      'Marketing Management',
      'Finance Management',
      'Human Resource (HR)',
      'Business Analytics'
    ]
  };

  const semesters = [
    'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
    'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'
  ];

  const feeHeads = [
    'Exam Form Fee', 'Late Fee', 'Internal Exam Fee',
    'Practical Exam Fee', 'External Exam Fee'
  ];

  useEffect(() => {
    if (stream && branch && semester) {
      fetchFees();
    } else {
      setFees([]);
    }
  }, [stream, branch, semester]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/exam-fees?stream=${encodeURIComponent(stream)}&branch=${encodeURIComponent(branch)}&semester=${encodeURIComponent(semester)}`);
      setFees(response.data);
    } catch (error) {
      console.error('Error fetching fees:', error);
      setFees([]);
    }
    setLoading(false);
  };

  const handleEdit = (fee) => {
    setEditingFee(fee);
    setNewAmount(fee.amount.toString());
  };

  const handleSave = async () => {
    try {
      await axios.put('/api/exam-fees/update', {
        stream,
        branch,
        semester,
        head: editingFee.head,
        amount: parseFloat(newAmount)
      });
      setEditingFee(null);
      fetchFees();
    } catch (error) {
      console.error('Error updating fee:', error);
    }
  };

  const total = fees.reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Exam Fees Management</h1>

      {/* Selection Card */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Select Criteria</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">Stream</label>
            <select
              value={stream}
              onChange={(e) => {
                setStream(e.target.value);
                setBranch('');
                setSemester('');
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            >
              <option value="">Select Stream</option>
              {streams.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">Branch</label>
            <select
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setSemester('');
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 disabled:bg-gray-100"
              disabled={!stream}
            >
              <option value="">Select Branch</option>
              {stream && branches[stream].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 disabled:bg-gray-100"
              disabled={!branch}
            >
              <option value="">Select Semester</option>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading exam fees...</p>
        </div>
      )}

      {/* Fees Table */}
      {fees.length > 0 && !loading && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Exam Fees for {stream} - {branch} - {semester}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee Head</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fees.map((fee, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fee.head}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{fee.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(fee)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total Exam Fee</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{total.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!loading && stream && branch && semester && fees.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No exam fees found</h3>
          <p className="text-gray-500">Exam fees will appear here once they are configured for the selected criteria.</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingFee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setEditingFee(null)}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit {editingFee.head}</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingFee(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamFees;