import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AddPayment() {
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    paymentMethod: 'Bank Transfer',
    description: '',
    transactionId: '',
    collectedBy: '',
    remarks: '',
    feeHead: '',
    semester: '',
    academicYear: '2025-26',
    paymentType: 'specific',
    selectedFeeHeads: [],
    employeeName: '',
    employeeId: '',
    salaryType: 'monthly',
    salaryMonth: '',
    salaryYear: new Date().getFullYear().toString()
  });

  const [students, setStudents] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchFeeHeads();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get('/api/students');
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };
//hello
  const fetchFeeHeads = async () => {
    try {
      const response = await axios.get('/api/accounting/fee-heads');
      setFeeHeads(response.data);
    } catch (error) {
      console.error('Error fetching fee heads:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearForm = () => {
    setFormData({
      studentId: '',
      amount: '',
      paymentMethod: 'Bank Transfer',
      description: '',
      transactionId: '',
      collectedBy: '',
      remarks: '',
      feeHead: '',
      semester: '',
      academicYear: '2025-26',
      paymentType: 'specific',
      selectedFeeHeads: [],
      employeeName: '',
      employeeId: '',
      salaryType: 'monthly',
      salaryMonth: '',
      salaryYear: new Date().getFullYear().toString()
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/accounting/payments', formData);
      setSuccess('Payment added successfully!');
      clearForm();
    } catch (error) {
      setError(error.response?.data?.message || 'Error adding payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Add Payment</h1>
            <p className="text-gray-600 mt-2">Record a new payment for students or salary</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {/* Main Form */}
          <div className="bg-white rounded-lg shadow-sm">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Payment Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="specific"
                      checked={formData.paymentType === 'specific'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Specific Fee
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="semester"
                      checked={formData.paymentType === 'semester'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Semester
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="salary"
                      checked={formData.paymentType === 'salary'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Salary
                  </label>
                </div>
              </div>

              {/* Student Selection - Only for Student Payments */}
              {formData.paymentType !== 'salary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Student *
                    </label>
                    <select
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Select Student --</option>
                      {students.map(student => (
                        <option key={student._id} value={student._id}>
                          {student.firstName} {student.lastName} ({student.studentId})
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.paymentType === 'semester' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Semester *
                      </label>
                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Select Semester --</option>
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.paymentType === 'specific' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fee Head *
                      </label>
                      <select
                        name="feeHead"
                        value={formData.feeHead}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Select Fee Head --</option>
                        {feeHeads.map(feeHead => (
                          <option key={feeHead._id} value={feeHead._id}>
                            {feeHead.title} - ₹{feeHead.amount}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Salary Payment Fields */}
              {formData.paymentType === 'salary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee Name *
                    </label>
                    <input
                      type="text"
                      name="employeeName"
                      value={formData.employeeName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter employee name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter employee ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary Type
                    </label>
                    <select
                      name="salaryType"
                      value={formData.salaryType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>

                  {formData.salaryType === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Month
                      </label>
                      <select
                        name="salaryMonth"
                        value={formData.salaryMonth}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Select Month --</option>
                        {Array.from({length: 12}, (_, i) => (
                          <option key={i+1} value={i+1}>
                            {new Date(0, i).toLocaleString('en', {month: 'long'})}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      name="salaryYear"
                      value={formData.salaryYear}
                      onChange={handleInputChange}
                      min="2020"
                      max="2030"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
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
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online Payment">Online Payment</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Demand Draft">Demand Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter transaction ID"
                  />
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
                    placeholder="Enter collector name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter payment description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional remarks"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Add Payment'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}
