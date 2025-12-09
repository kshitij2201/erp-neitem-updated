import { Link } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const [showExportModal, setShowExportModal] = useState(false);
  const [feeType, setFeeType] = useState("admission");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    stream: "",
    department: "",
    year: ""
  });

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let response;
      if (feeType === "admission") {
        response = await axios.get("/api/fees/summaries", { headers });
      } else if (feeType === "exam") {
        response = await axios.get("/api/exam-fees", { headers });
      }

      const data = response.data;

      // Filter data based on inputs
      let filteredData;
      if (feeType === "admission") {
        filteredData = data.filter(item => {
          const student = item.studentId;
          if (!student) return false;
          
          // Match stream from populated data or direct field
          const studentStream = student.stream?.name || item.stream || "";
          const streamMatch = !exportFilters.stream || 
            studentStream.toLowerCase().includes(exportFilters.stream.toLowerCase()) ||
            studentStream.toLowerCase().replace(/\s+/g, '').includes(exportFilters.stream.toLowerCase().replace(/\s+/g, ''));
          
          // Match department from populated data or direct field
          const studentDept = student.department?.name || item.department || "";
          const deptMatch = !exportFilters.department || 
            studentDept.toLowerCase().includes(exportFilters.department.toLowerCase()) ||
            studentDept.toLowerCase().replace(/\s+/g, '').includes(exportFilters.department.toLowerCase().replace(/\s+/g, ''));
          
          return streamMatch && deptMatch;
        });
      } else if (feeType === "exam") {
        filteredData = data.filter(item => {
          const streamMatch = !exportFilters.stream || item.stream.toLowerCase().includes(exportFilters.stream.toLowerCase());
          const deptMatch = !exportFilters.department || item.branch.toLowerCase().includes(exportFilters.department.toLowerCase());
          return streamMatch && deptMatch;
        });
      }

      // Prepare data for Excel
      let excelData;
      if (feeType === "admission") {
        excelData = filteredData.map((item, index) => {
          const student = item.studentId;
          const studentName = item.studentName || 
            `${student?.firstName || ''} ${student?.middleName || ''} ${student?.lastName || ''}`.trim();
          const studentId = student?.studentId || item.studentId || "";
          const department = student?.department?.name || item.department || "";
          const stream = student?.stream?.name || item.stream || "";
          const semester = student?.semester?.number || "";
          
          return {
            'Sr. No.': index + 1,
            'Student Name': studentName,
            'Student ID': studentId,
            'Department': department,
            'Semester': semester ? `Semester ${semester}` : 'N/A',
            'Fee Type': 'Admission',
            'Amount': 0,
            'Payment Date': 'N/A',
            'Status': 'Pending',
            'Total Fees': item.totalFees || 0,
            'Paid Fees': item.paidFees || 0,
            'Pending Fees': item.pendingFees || 0
          };
        });
      } else if (feeType === "exam") {
        excelData = filteredData.map((item, index) => ({
          'Sr. No.': index + 1,
          'Stream': item.stream || "",
          'Branch': item.branch || "",
          'Semester': item.semester || "",
          'Head': item.head || "",
          'Amount': item.amount || 0,
        }));
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const maxWidth = 30;
      const wscols = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.min(Math.max(key.length, 10), maxWidth)
      }));
      ws['!cols'] = wscols;
      
      XLSX.utils.book_append_sheet(wb, ws, feeType === "admission" ? "Admission Fees" : "Exam Fees");

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const streamName = exportFilters.stream ? `-${exportFilters.stream.replace(/\./g, '')}` : '';
      const deptName = exportFilters.department ? `-${exportFilters.department}` : '';
      const filename = `${feeType}_fees${streamName}${deptName}_${timestamp}.xlsx`;
      
      // Download the file
      XLSX.writeFile(wb, filename);

      setShowExportModal(false);
      alert(`Successfully exported ${filteredData.length} records to ${filename}`);
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export data: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setExportLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <span className="text-4xl">📊</span>
            Reports & Analytics
          </h1>
          <p className="text-gray-600">Generate comprehensive financial and operational reports</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Monthly Report"
            value="Current Month"
            icon="📅"
            color="from-blue-500 to-indigo-600"
          />
          <StatCard
            title="Financial Summary"
            value="₹45,00,000"
            icon="💰"
            color="from-green-500 to-emerald-600"
          />
          <StatCard
            title="Student Reports"
            value="1,250 Active"
            icon="👨‍🎓"
            color="from-purple-500 to-violet-600"
          />
          <StatCard
            title="Faculty Reports"
            value="85 Members"
            icon="👨‍🏫"
            color="from-orange-500 to-red-600"
          />
        </div>

        {/* Report Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Financial Reports */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <span className="text-2xl">💼</span>
              Financial Reports
            </h2>
            <div className="space-y-4">
              <ReportItem
                title="Fee Collection Report"
                description="Student fee collection summary and pending amounts"
                link="/accounting/payments"
                icon="💳"
              />
              <ReportItem
                title="Expense Analysis"
                description="Department wise expense breakdown and analysis"
                link="/accounting/expenses"
                icon="💸"
              />
              <ReportItem
                title="Faculty Salary Report"
                description="Monthly salary, tax, and compliance reports"
                link="/faculty/salary"
                icon="💰"
              />
              <ReportItem
                title="Tax Reports"
                description="Income tax, PF, and other tax-related reports"
                link="/faculty/incometax"
                icon="📋"
              />
            </div>
          </div>

          {/* Operational Reports */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <span className="text-2xl">⚙️</span>
              Operational Reports
            </h2>
            <div className="space-y-4">
              <ReportItem
                title="Student Summary"
                description="Student enrollment, fee status, and academic reports"
                link="/students/details"
                icon="👨‍🎓"
              />
              <ReportItem
                title="Insurance Reports"
                description="Student insurance policies and claim reports"
                link="/students/insurance"
                icon="🏥"
              />
              <ReportItem
                title="Scholarship Reports"
                description="Scholarship disbursement and eligibility reports"
                link="/students/scholarship"
                icon="🎓"
              />
              <ReportItem
                title="Audit Reports"
                description="Financial audit trails and compliance reports"
                link="/accounting/audit"
                icon="🔍"
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickAction
              title="Generate Monthly Report"
              description="Create comprehensive monthly financial report"
              icon="📊"
            />
            <QuickAction
              title="Export Data"
              description="Export financial data to Excel/PDF format"
              icon="📤"
              onClick={() => setShowExportModal(true)}
            />
            <QuickAction
              title="Schedule Reports"
              description="Set up automated report generation"
              icon="⏰"
            />
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Export Fee Data</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="admission">Admission Fee</option>
                  <option value="exam">Exam Fee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stream</label>
                <select
                  value={exportFilters.stream}
                  onChange={(e) => setExportFilters({ ...exportFilters, stream: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Streams</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="MBA">MBA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={exportFilters.department}
                  onChange={(e) => setExportFilters({ ...exportFilters, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!exportFilters.stream}
                >
                  <option value="">All Departments</option>
                  {exportFilters.stream === 'B.Tech' && (
                    <>
                      <option value="CS">CS</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Civil">Civil</option>
                      <option value="CSE&AIML">CSE&AIML</option>
                    </>
                  )}
                  {exportFilters.stream === 'MBA' && (
                    <option value="MBA">MBA</option>
                  )}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {exportLoading ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-xl`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-3xl">{icon}</div>
      </div>
      <div className="text-sm opacity-80 font-medium">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function ReportItem({ title, description, link, icon }) {
  return (
    <Link
      to={link}
      className="block p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        <div className="text-2xl group-hover:scale-110 transition-transform">{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          <div className="text-xs text-blue-500 mt-2 group-hover:text-blue-700">
            Generate Report →
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickAction({ title, description, icon, onClick }) {
  return (
    <div className="bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors cursor-pointer group" onClick={onClick}>
      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm opacity-80">{description}</p>
    </div>
  );
}
