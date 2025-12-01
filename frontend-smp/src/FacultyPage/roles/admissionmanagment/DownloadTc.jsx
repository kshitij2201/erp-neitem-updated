import React, { useState, useEffect } from 'react';
import { Download, FileText, Search, User } from 'lucide-react';
import axios from 'axios';

const DownloadTc = () => {
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [manualEntry, setManualEntry] = useState(false);
    const [tcData, setTcData] = useState({
        serialNo: '1673',
        registerNo: '1:08',
        instituteName: 'Nagarjuna Institute of Engineering, Technology & Management',
        studentName: '',
        motherName: '',
        category: '',
        caste: '',
        nationality: 'Indian',
        placeOfBirth: '',
        dobFigures: '',
        dobWords: '',
        lastSchool: 'N/A',
        dateOfAdmission: '',
        progress: 'Satisfactory',
        conduct: 'Good',
        dateOfLeaving: '',
        standard: 'B.Tech',
        reason: 'term completion',
        remarks: '',
        sealNo: '',
        enrollmentNo: 'N/A'
    });

    // Authentication helper function
    const getAuthHeaders = () => {
        const token = localStorage.getItem("facultyToken");
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    };

    // Fetch students data
    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                "http://localhost:4000/api/superadmin/students",
                { headers: getAuthHeaders() }
            );
            setStudents(response.data);
            setFilteredStudents(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError('Failed to fetch students data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // Filter students based on search term
    useEffect(() => {
        if (!searchTerm) {
            setFilteredStudents(students);
        } else {
            const filtered = students.filter(student =>
                student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.enrollmentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredStudents(filtered);
        }
    }, [searchTerm, students]);

    // Handle student selection
    const handleStudentSelect = (student) => {
        setSelectedStudent(student);

        // Convert date to required format
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB');
        };

        // Convert date to words
        const dateToWords = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            const months = [
                'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
            ];
            const day = date.getDate();
            const month = months[date.getMonth()];
            const year = date.getFullYear();

            const dayWords = {
                1: 'FIRST', 2: 'SECOND', 3: 'THIRD', 4: 'FOURTH', 5: 'FIFTH',
                6: 'SIXTH', 7: 'SEVENTH', 8: 'EIGHTH', 9: 'NINTH', 10: 'TENTH',
                11: 'ELEVENTH', 12: 'TWELFTH', 13: 'THIRTEENTH', 14: 'FOURTEENTH', 15: 'FIFTEENTH',
                16: 'SIXTEENTH', 17: 'SEVENTEENTH', 18: 'EIGHTEENTH', 19: 'NINETEENTH', 20: 'TWENTIETH',
                21: 'TWENTY-FIRST', 22: 'TWENTY-SECOND', 23: 'TWENTY-THIRD', 24: 'TWENTY-FOURTH', 25: 'TWENTY-FIFTH',
                26: 'TWENTY-SIXTH', 27: 'TWENTY-SEVENTH', 28: 'TWENTY-EIGHTH', 29: 'TWENTY-NINTH', 30: 'THIRTIETH', 31: 'THIRTY-FIRST'
            };

            const yearWords = {
                2020: 'TWO THOUSAND TWENTY', 2021: 'TWO THOUSAND TWENTY-ONE', 2022: 'TWO THOUSAND TWENTY-TWO',
                2023: 'TWO THOUSAND TWENTY-THREE', 2024: 'TWO THOUSAND TWENTY-FOUR', 2025: 'TWO THOUSAND TWENTY-FIVE'
            };

            return `${dayWords[day]} ${month} ${yearWords[year] || year}`;
        };

        setTcData({
            ...tcData,
            studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
            motherName: student.motherName || 'N/A',
            category: student.casteCategory || 'N/A',
            caste: student.caste || 'N/A',
            placeOfBirth: student.placeOfBirth || 'N/A',
            dobFigures: formatDate(student.dateOfBirth),
            dobWords: dateToWords(student.dateOfBirth),
            dateOfAdmission: formatDate(student.createdAt),
            dateOfLeaving: new Date().toLocaleDateString('en-GB'),
            enrollmentNo: student.enrollmentNumber || 'N/A'
        });
    };

    // Generate and download TC PDF
    const handleDownloadTC = () => {
        if (!manualEntry && !selectedStudent) {
            alert('Please select a student first');
            return;
        }

        if (manualEntry && !tcData.studentName.trim()) {
            alert('Please enter student name');
            return;
        }

        // Create a new window for printing
        const printWindow = window.open('', '_blank');

        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transfer Certificate - ${tcData.studentName}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              margin: 0;
              padding: 20mm;
              line-height: 1.3;
              background: white;
              width: 210mm;
              min-height: 297mm;
              box-sizing: border-box;
            }
            .certificate {
              width: 100%;
              height: calc(297mm - 40mm);
              margin: 0;
              border: 2px solid #000;
              padding: 16px;
              position: relative;
              page-break-inside: avoid;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .header {
              text-align: center;
              margin-bottom: 16px;
              border-bottom: 2px solid #000;
              padding-bottom: 12px;
              position: relative;
              min-height: 90px;
              flex-shrink: 0;
            }
            .logo-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              position: absolute;
              width: 100%;
              top: 0;
              z-index: 1;
            }
            .header-content {
              padding-top: 10px;
              position: relative;
              z-index: 2;
            }
            .institute-name {
              font-size: 22px;
              font-weight: bold;
              margin: 8px 0;
            }
            .institute-details {
              font-size: 11px;
              margin: 3px 0;
            }
            .title {
              font-size: 18px;
              font-weight: bold;
              margin: 12px 0;
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
            }
            .subtitle {
              font-size: 10px;
              font-style: italic;
              margin: 8px 0;
            }
            .content {
              margin: 16px 0;
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .field {
              margin: 8px 0;
              display: flex;
              align-items: flex-start;
              line-height: 1.2;
            }
            .field-number {
              font-weight: bold;
              width: 30px;
              flex-shrink: 0;
            }
            .field-label {
              font-weight: bold;
              width: 200px;
              flex-shrink: 0;
            }
            .field-value {
              flex: 1;
            }
            .footer {
              margin-top: 25px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-shrink: 0;
            }
            .signature {
              text-align: center;
            }
            .certification {
              font-size: 10px;
              text-align: center;
              margin: 15px 0;
              font-style: italic;
            }
            @media print {
              body { 
                margin: 0;
                padding: 20mm;
                font-size: 12px;
                width: 210mm;
                height: 297mm;
              }
              .certificate {
                width: 100%;
                height: calc(297mm - 40mm);
                padding: 16px;
                page-break-inside: avoid;
              }
              .field {
                margin: 6px 0;
              }
              .footer {
                margin-top: 20px;
              }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <div class="logo-section">
                <img src="/logo.png" alt="Institute Logo" style="height: 90px;" />
                <img src="/logo1.png" alt="NAAC Logo" style="height: 90px;" />
              </div>
              <div class="header-content">
                <div style="font-size: 10px; margin-bottom: 5px;">maitrey education society</div>
                <div class="institute-name">NAGARJUNA</div>
                <div style="font-size: 16px; margin: 5px 0;">Institute of Engineering, Technology & Management</div>
                <div class="institute-details">(AICTE, DTE Approved & Affiliated to R.T.M. Nagpur University, Nagpur)</div>
                <div class="institute-details">Village Satnavri, Amravati Road, Nagpur 440023</div>
                <div class="institute-details">Email: maitrey.ngp@gmail.com | Website: www.nietm.in | Phone: 07118 322211, 12</div>
              </div>
            </div>
            
            
            <div class="title">TRANSFER CERTIFICATE</div>
            
            <div class="subtitle">(See rule 17 & 32 in chapter II section 1)</div>
            <div style="font-size: 9px; margin-bottom: 6px;">
              (No change of any entry in this certificate shall be made except by the authority issuing it and any infringement of this<br>
              requirement is liable to involve the imposition of penalty such as that of rustication)
            </div>
            
            <div style="display: flex; justify-content: space-between; margin: 6px 0;">
              <div>Serial No. ${tcData.serialNo}</div>
              <div>Register No. ${tcData.registerNo}</div>
            </div>
            
            <div class="content">
              <div class="field">
                <span class="field-number">1.</span>
                <span class="field-label">Name of the Institute:</span>
                <span class="field-value">${tcData.instituteName}</span>
              </div>
              
              <div class="field">
                <span class="field-number">2.</span>
                <span class="field-label">Name of the Pupil in Full:</span>
                <span class="field-value">${tcData.studentName.toUpperCase()}</span>
              </div>
              
              <div class="field">
                <span class="field-number">3.</span>
                <span class="field-label">Mother's Name:</span>
                <span class="field-value">${tcData.motherName.toUpperCase()}</span>
              </div>
              
              <div class="field">
                <span class="field-number">4.</span>
                <span class="field-label">Race & Caste:</span>
                <span class="field-value">Category: ${tcData.category} &nbsp;&nbsp;&nbsp; Caste: ${tcData.caste}</span>
              </div>
              
              <div class="field">
                <span class="field-number">5.</span>
                <span class="field-label">Nationality:</span>
                <span class="field-value">${tcData.nationality}</span>
              </div>
              
              <div class="field">
                <span class="field-number">6.</span>
                <span class="field-label">Place of Birth:</span>
                <span class="field-value">${tcData.placeOfBirth}</span>
              </div>
              
              <div class="field">
                <span class="field-number">7.</span>
                <span class="field-label">Date of Birth:</span>
                <span class="field-value">
                  a) In Figures: ${tcData.dobFigures}<br>
                  b) In Words: ${tcData.dobWords}
                </span>
              </div>
              
              <div class="field">
                <span class="field-number">8.</span>
                <span class="field-label">Last School/College Attended:</span>
                <span class="field-value">${tcData.lastSchool}</span>
              </div>
              
              <div class="field">
                <span class="field-number">9.</span>
                <span class="field-label">Date of Admission:</span>
                <span class="field-value">${tcData.dateOfAdmission}</span>
              </div>
              
              <div class="field">
                <span class="field-number">10.</span>
                <span class="field-label">Progress:</span>
                <span class="field-value">${tcData.progress}</span>
              </div>
              
              <div class="field">
                <span class="field-number">11.</span>
                <span class="field-label">Conduct:</span>
                <span class="field-value">${tcData.conduct}</span>
              </div>
              
              <div class="field">
                <span class="field-number">12.</span>
                <span class="field-label">Date of Leaving Institution:</span>
                <span class="field-value">${tcData.dateOfLeaving}</span>
              </div>
              
              <div class="field">
                <span class="field-number">13.</span>
                <span class="field-label">Standard in which Studying & Since When:</span>
                <span class="field-value">${tcData.standard}</span>
              </div>
              
              <div class="field">
                <span class="field-number">14.</span>
                <span class="field-label">Reason for Leaving Institution:</span>
                <span class="field-value">${tcData.reason}</span>
              </div>
              
              <div class="field">
                <span class="field-number">15.</span>
                <span class="field-label">Remarks:</span>
                <span class="field-value">${tcData.remarks || 'N/A'}</span>
              </div>
            </div>
            
            <div style="margin: 6px 0; display: flex; justify-content: space-between;">
              <div>Seal No.: ${tcData.sealNo || '_______'}</div>
              <div>Enrollment No.: ${tcData.enrollmentNo}</div>
            </div>
            
            <div class="certification">
              Certified that the above information is in accordance with the Institute Register.
            </div>
            
            <div class="footer">
              <div>Date: ${tcData.dateOfLeaving}</div>
              <div class="signature">Clerk</div>
              <div class="signature">Principal</div>
            </div>
          </div>
          
          <div class="no-print" style="text-align: center; margin: 20px;">
            <button onclick="window.print();" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Print / Save as PDF
            </button>
            <button onclick="window.close();" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
      </html>
    `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading students data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={fetchStudents}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <FileText className="text-blue-600 mr-3" size={32} />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">Transfer Certificate Generator</h1>
                                <p className="text-gray-600 mt-1">Generate and download student transfer certificates</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-6">
                            {/* Manual Entry Toggle */}
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-gray-600">Manual Entry:</span>
                                <button
                                    onClick={() => {
                                        setManualEntry(!manualEntry);
                                        setSelectedStudent(null);
                                        // Reset TC data when switching modes
                                        setTcData({
                                            serialNo: '1673',
                                            registerNo: '1:08',
                                            instituteName: 'Nagarjuna Institute of Engineering, Technology & Management',
                                            studentName: '',
                                            motherName: '',
                                            category: '',
                                            caste: '',
                                            nationality: 'Indian',
                                            placeOfBirth: '',
                                            dobFigures: '',
                                            dobWords: '',
                                            lastSchool: 'N/A',
                                            dateOfAdmission: '',
                                            progress: 'Satisfactory',
                                            conduct: 'Good',
                                            dateOfLeaving: new Date().toLocaleDateString('en-GB'),
                                            standard: 'B.Tech',
                                            reason: 'term completion',
                                            remarks: '',
                                            sealNo: '',
                                            enrollmentNo: 'N/A'
                                        });
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${manualEntry ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${manualEntry ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                                <span className={`text-sm font-medium ${manualEntry ? 'text-blue-600' : 'text-gray-500'
                                    }`}>
                                    {manualEntry ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            {/* Student Count */}
                            {!manualEntry && (
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Total Students</div>
                                    <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`grid grid-cols-1 gap-6 ${manualEntry ? '' : 'lg:grid-cols-3'}`}>
                    {/* Student Selection Panel - Only show when not in manual entry mode */}
                    {!manualEntry && (
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Student</h2>

                                {/* Search Bar */}
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, enrollment no..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Students List */}
                                <div className="max-h-96 overflow-y-auto space-y-2">
                                    {filteredStudents.map((student) => (
                                        <div
                                            key={student._id}
                                            onClick={() => handleStudentSelect(student)}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedStudent?._id === student._id
                                                    ? 'bg-blue-100 border-2 border-blue-500'
                                                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <User className="text-gray-400 mr-2" size={16} />
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-800">
                                                        {student.firstName} {student.lastName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {student.enrollmentNumber || 'No enrollment number'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {student.department?.name} - Sem {student.semester?.number}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {filteredStudents.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        <User size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>No students found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Manual Entry Info Panel */}
                    {manualEntry && (
                        <div className="mb-6">
                            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                                <div className="flex items-center">
                                    <div className="bg-green-100 rounded-full p-2 mr-4">
                                        <FileText className="text-green-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-green-800">Manual Entry Mode</h3>
                                        <p className="text-green-600 mt-1">
                                            You can now create a Transfer Certificate by manually entering all student details below.
                                            This is useful for students whose data is not in the system.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TC Details Panel */}
                    <div className={manualEntry ? 'w-full' : 'lg:col-span-2'}>
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-800">Transfer Certificate Details</h2>
                                <button
                                    onClick={handleDownloadTC}
                                    disabled={!manualEntry && !selectedStudent}
                                    className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${(manualEntry || selectedStudent)
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    <Download className="mr-2" size={20} />
                                    Generate TC
                                </button>
                            </div>

                            {(selectedStudent || manualEntry) ? (
                                <div className="space-y-4">
                                    {/* TC Form Fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Serial No.</label>
                                            <input
                                                type="text"
                                                value={tcData.serialNo}
                                                onChange={(e) => setTcData({ ...tcData, serialNo: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Register No.</label>
                                            <input
                                                type="text"
                                                value={tcData.registerNo}
                                                onChange={(e) => setTcData({ ...tcData, registerNo: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                                        <input
                                            type="text"
                                            value={tcData.studentName}
                                            onChange={(e) => setTcData({ ...tcData, studentName: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter full name of the student"
                                            required
                                        />
                                    </div>

                                    {/* Date fields for manual entry */}
                                    {manualEntry && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    value={tcData.dobFigures ? new Date(tcData.dobFigures.split('/').reverse().join('-')).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => {
                                                        const date = new Date(e.target.value);
                                                        const formatDate = (date) => date.toLocaleDateString('en-GB');
                                                        const dateToWords = (date) => {
                                                            const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
                                                            const dayWords = {
                                                                1: 'FIRST', 2: 'SECOND', 3: 'THIRD', 4: 'FOURTH', 5: 'FIFTH', 6: 'SIXTH', 7: 'SEVENTH', 8: 'EIGHTH', 9: 'NINTH', 10: 'TENTH',
                                                                11: 'ELEVENTH', 12: 'TWELFTH', 13: 'THIRTEENTH', 14: 'FOURTEENTH', 15: 'FIFTEENTH', 16: 'SIXTEENTH', 17: 'SEVENTEENTH', 18: 'EIGHTEENTH', 19: 'NINETEENTH', 20: 'TWENTIETH',
                                                                21: 'TWENTY-FIRST', 22: 'TWENTY-SECOND', 23: 'TWENTY-THIRD', 24: 'TWENTY-FOURTH', 25: 'TWENTY-FIFTH', 26: 'TWENTY-SIXTH', 27: 'TWENTY-SEVENTH', 28: 'TWENTY-EIGHTH', 29: 'TWENTY-NINTH', 30: 'THIRTIETH', 31: 'THIRTY-FIRST'
                                                            };
                                                            const yearWords = { 2020: 'TWO THOUSAND TWENTY', 2021: 'TWO THOUSAND TWENTY-ONE', 2022: 'TWO THOUSAND TWENTY-TWO', 2023: 'TWO THOUSAND TWENTY-THREE', 2024: 'TWO THOUSAND TWENTY-FOUR', 2025: 'TWO THOUSAND TWENTY-FIVE' };
                                                            const day = date.getDate(); const month = months[date.getMonth()]; const year = date.getFullYear();
                                                            return `${dayWords[day]} ${month} ${yearWords[year] || year}`;
                                                        };
                                                        setTcData({ ...tcData, dobFigures: formatDate(date), dobWords: dateToWords(date) });
                                                    }}
                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Admission</label>
                                                <input
                                                    type="date"
                                                    value={tcData.dateOfAdmission ? new Date(tcData.dateOfAdmission.split('/').reverse().join('-')).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => {
                                                        const date = new Date(e.target.value);
                                                        setTcData({ ...tcData, dateOfAdmission: date.toLocaleDateString('en-GB') });
                                                    }}
                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                                            <input
                                                type="text"
                                                value={tcData.motherName}
                                                onChange={(e) => setTcData({ ...tcData, motherName: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
                                            <input
                                                type="text"
                                                value={tcData.placeOfBirth}
                                                onChange={(e) => setTcData({ ...tcData, placeOfBirth: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                            <select
                                                value={tcData.category}
                                                onChange={(e) => setTcData({ ...tcData, category: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="SC">SC</option>
                                                <option value="ST">ST</option>
                                                <option value="OBC">OBC</option>
                                                <option value="General">General</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
                                            <select
                                                value={tcData.progress}
                                                onChange={(e) => setTcData({ ...tcData, progress: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="Satisfactory">Satisfactory</option>
                                                <option value="Good">Good</option>
                                                <option value="Excellent">Excellent</option>
                                                <option value="Average">Average</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Conduct</label>
                                            <select
                                                value={tcData.conduct}
                                                onChange={(e) => setTcData({ ...tcData, conduct: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="Good">Good</option>
                                                <option value="Very Good">Very Good</option>
                                                <option value="Excellent">Excellent</option>
                                                <option value="Satisfactory">Satisfactory</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                                            <input
                                                type="text"
                                                value={tcData.reason}
                                                onChange={(e) => setTcData({ ...tcData, reason: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                        <textarea
                                            value={tcData.remarks}
                                            onChange={(e) => setTcData({ ...tcData, remarks: e.target.value })}
                                            rows={3}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter any additional remarks..."
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <FileText size={64} className="mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium mb-2">
                                        {manualEntry ? 'Manual Entry Mode' : 'No Student Selected'}
                                    </h3>
                                    <p>
                                        {manualEntry
                                            ? 'Fill in the student details above to generate a Transfer Certificate'
                                            : 'Please select a student from the list or enable Manual Entry mode'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadTc;