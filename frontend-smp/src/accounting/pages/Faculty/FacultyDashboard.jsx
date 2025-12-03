import React, { useState, useEffect } from "react";

const FacultyDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFY, setSelectedFY] = useState("2024-2025");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchStatusData();
  }, [selectedFY]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://backenderp.tarstech.in/api/faculty/dashboard/data?financialYear=${selectedFY}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Error fetching dashboard data: " + error.message);
      // Set fallback data on error
      setDashboardData({
        summary: {
          totalEmployees: 0,
          totalSalaryPaid: 0,
          employeesWithPF: 0,
          employeesWithIncomeTax: 0,
          fullyCompliantEmployees: 0,
          pendingPayments: 0,
          complianceRate: 0,
        },
        facultyData: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusData = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found");
        return;
      }

      const response = await fetch(
        `https://backenderp.tarstech.in/api/faculty/dashboard/status?financialYear=${selectedFY}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatusData(data);
    } catch (error) {
      console.error("Error fetching status data:", error);
      setError("Error fetching status data: " + error.message);
      setStatusData({
        totalPaid: 0,
        pf: { totalEmployeePF: 0, totalEmployerPF: 0, records: 0 },
        incomeTax: { totalLiability: 0, records: 0 },
        compliance: { totalEmployees: 0, pfCompliant: 0 },
      });
    }
  };

  const handleEmployeeClick = async (employeeName) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/faculty/employee/${encodeURIComponent(
          employeeName
        )}/profile?financialYear=${selectedFY}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const profile = await response.json();
        setSelectedEmployee(profile);
        setShowEmployeeModal(true);
      }
    } catch (err) {
      setError("Error fetching employee profile: " + err.message);
    }
  };

  const handleAutoGeneratePF = async (employeeName) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/faculty/employee/${encodeURIComponent(
          employeeName
        )}/auto-generate-pf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            financialYear: selectedFY,
            ptState: "Karnataka",
          }),
        }
      );

      if (response.ok) {
        alert("PF record generated successfully!");
        fetchDashboardData();
        fetchStatusData();
      } else {
        const errorData = await response.json();
        alert("Error: " + errorData.error);
      }
    } catch (err) {
      alert("Error generating PF record: " + err.message);
    }
  };

  const handleBulkGeneratePF = async () => {
    if (
      window.confirm(
        "This will generate PF records for all employees with salary data. Continue?"
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "https://backenderp.tarstech.in/api/faculty/bulk-operations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              operation: "generate-all-pf",
              financialYear: selectedFY,
              ptState: "Karnataka",
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const successCount = result.results.filter(
            (r) => r.status === "created"
          ).length;
          const skipCount = result.results.filter(
            (r) => r.status === "skipped"
          ).length;
          const errorCount = result.results.filter(
            (r) => r.status === "error"
          ).length;

          alert(
            `Bulk PF generation completed!\n${successCount} created, ${skipCount} skipped, ${errorCount} errors`
          );
          fetchDashboardData();
          fetchStatusData();
        } else {
          const errorData = await response.json();
          alert("Error: " + errorData.error);
        }
      } catch (err) {
        alert("Error in bulk operation: " + err.message);
      }
    }
  };

  const getComplianceColor = (isCompliant) => {
    return isCompliant
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getComplianceText = (employee) => {
    if (employee.hasCompleteData) return "Fully Compliant";
    if (employee.pf && employee.incomeTax) return "Complete";
    if (employee.pf || employee.incomeTax) return "Partial";
    return "Pending";
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Faculty Management Dashboard 👨‍🏫
        </h1>
        <p className="text-gray-600">
          Comprehensive view of salary, PF, and income tax management
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Financial Year:
            </label>
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkGeneratePF}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Bulk Generate PF
            </button>
            <button
              onClick={() => window.open("/faculty/salary", "_blank")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage Salaries
            </button>
            <button
              onClick={() =>
                window.open("/faculty/pf-professional-tax", "_blank")
              }
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Manage PF
            </button>
            <button
              onClick={() => window.open("/faculty/income-tax", "_blank")}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Manage Income Tax
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {statusData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Salary Paid
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(statusData.totalPaid || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-green-500">💰</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  PF Contributions
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹
                  {(
                    (statusData.pf?.totalEmployeePF || 0) +
                    (statusData.pf?.totalEmployerPF || 0)
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {statusData.pf?.records || 0} employees
                </p>
              </div>
              <div className="text-blue-500">🏦</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Income Tax</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹
                  {(statusData.incomeTax?.totalLiability || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {statusData.incomeTax?.records || 0} records
                </p>
              </div>
              <div className="text-red-500">📋</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Compliance Rate
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {(statusData.compliance?.totalEmployees || 0) > 0
                    ? Math.round(
                        ((statusData.compliance?.pfCompliant || 0) /
                          (statusData.compliance?.totalEmployees || 1)) *
                          100
                      )
                    : 0}
                  %
                </p>
                <p className="text-xs text-gray-500">
                  {statusData.compliance?.pfCompliant || 0}/
                  {statusData.compliance?.totalEmployees || 0}
                </p>
              </div>
              <div className="text-purple-500">✅</div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              📊 Faculty Overview
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-700">Total Employees:</span>
                <span className="font-semibold text-blue-900">
                  {dashboardData.summary?.totalEmployees || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Total Salary Paid:</span>
                <span className="font-semibold text-blue-900">
                  ₹
                  {(
                    dashboardData.summary?.totalSalaryPaid || 0
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Avg Salary:</span>
                <span className="font-semibold text-blue-900">
                  ₹
                  {dashboardData.summary?.totalEmployees > 0
                    ? Math.round(
                        (dashboardData.summary.totalSalaryPaid || 0) /
                          dashboardData.summary.totalEmployees
                      ).toLocaleString()
                    : 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">
              🏦 PF Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-green-700">Employees with PF:</span>
                <span className="font-semibold text-green-900">
                  {dashboardData.summary?.employeesWithPF || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Coverage:</span>
                <span className="font-semibold text-green-900">
                  {dashboardData.summary?.totalEmployees > 0
                    ? Math.round(
                        ((dashboardData.summary.employeesWithPF || 0) /
                          dashboardData.summary.totalEmployees) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Pending PF:</span>
                <span className="font-semibold text-green-900">
                  {(dashboardData.summary?.totalEmployees || 0) -
                    (dashboardData.summary?.employeesWithPF || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-sm border border-orange-200 p-6">
            <h3 className="text-lg font-semibold text-orange-900 mb-4">
              📋 Tax Compliance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-orange-700">Income Tax Records:</span>
                <span className="font-semibold text-orange-900">
                  {dashboardData.summary?.employeesWithIncomeTax || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700">Fully Compliant:</span>
                <span className="font-semibold text-orange-900">
                  {dashboardData.summary?.fullyCompliantEmployees || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700">Compliance Rate:</span>
                <span className="font-semibold text-orange-900">
                  {dashboardData.summary?.totalEmployees > 0
                    ? Math.round(
                        ((dashboardData.summary.fullyCompliantEmployees || 0) /
                          dashboardData.summary.totalEmployees) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Employee List */}
      {dashboardData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Faculty Members
            </h3>
          </div>

          {dashboardData &&
          dashboardData.facultyData &&
          dashboardData.facultyData.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-500 text-xl mb-2">👨‍🏫</div>
              <p className="text-gray-500">No faculty data found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salary Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PF Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Income Tax
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compliance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData &&
                    dashboardData.facultyData &&
                    dashboardData.facultyData.map((employee, index) => (
                      <tr
                        key={employee.name || index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {employee.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Records: {employee.recordCount || 0}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              ₹{(employee.totalSalary || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              Avg: ₹
                              {employee.recordCount > 0
                                ? Math.round(
                                    (employee.totalSalary || 0) /
                                      employee.recordCount
                                  ).toLocaleString()
                                : "0"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {employee.pf ? (
                            <div>
                              <div className="text-sm font-medium text-green-600">
                                ₹
                                {(
                                  employee.pf.totalPFContribution || 0
                                ).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                PF: {employee.pf.pfNumber}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-red-600">
                              Not Generated
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {employee.incomeTax ? (
                            <div>
                              <div className="text-sm font-medium text-red-600">
                                ₹
                                {(
                                  employee.incomeTax.totalTax || 0
                                ).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                FY: {employee.incomeTax.financialYear}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-orange-600">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getComplianceColor(
                              employee.hasCompleteData
                            )}`}
                          >
                            {getComplianceText(employee)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEmployeeClick(employee.name)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            {!employee.pf && (
                              <button
                                onClick={() =>
                                  handleAutoGeneratePF(employee.name)
                                }
                                className="text-green-600 hover:text-green-900"
                              >
                                Generate PF
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Employee Profile Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Employee Profile: {selectedEmployee.employeeName}
                </h2>
                <button
                  onClick={() => setShowEmployeeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Salary Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    💰 Salary Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Annual:</span>
                      <span className="font-semibold">
                        ₹{selectedEmployee.salary.totalAnnual.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Average:</span>
                      <span className="font-semibold">
                        ₹
                        {Math.round(
                          selectedEmployee.salary.monthlyAverage
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Records:</span>
                      <span className="font-semibold">
                        {selectedEmployee.salary.recordCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PF Information */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">
                    🏦 PF Information
                  </h3>
                  {selectedEmployee.pf ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>PF Number:</span>
                        <span className="font-semibold">
                          {selectedEmployee.pf.pfNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Employee PF:</span>
                        <span className="font-semibold">
                          ₹
                          {selectedEmployee.pf.employeePFContribution.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Employer PF:</span>
                        <span className="font-semibold">
                          ₹
                          {selectedEmployee.pf.employerPFContribution.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional Tax:</span>
                        <span className="font-semibold">
                          ₹
                          {selectedEmployee.pf.professionalTax.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No PF record found</p>
                  )}
                </div>

                {/* Income Tax Information */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-3">
                    📋 Income Tax
                  </h3>
                  {selectedEmployee.incomeTax ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>PAN:</span>
                        <span className="font-semibold">
                          {selectedEmployee.incomeTax.panNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gross Income:</span>
                        <span className="font-semibold">
                          ₹
                          {(
                            selectedEmployee.incomeTax.grossIncome || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax Liability:</span>
                        <span className="font-semibold">
                          ₹
                          {(
                            selectedEmployee.incomeTax.totalTax || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>TDS Deducted:</span>
                        <span className="font-semibold">
                          ₹
                          {(
                            selectedEmployee.incomeTax.tdsDeducted || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      No income tax record found
                    </p>
                  )}
                </div>
              </div>

              {/* Compliance Status */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  ✅ Compliance Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      selectedEmployee.compliance.hasSalaryData
                        ? "bg-green-100"
                        : "bg-red-100"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        selectedEmployee.compliance.hasSalaryData
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      Salary Data
                    </div>
                    <div
                      className={`text-xs ${
                        selectedEmployee.compliance.hasSalaryData
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedEmployee.compliance.hasSalaryData
                        ? "Available"
                        : "Missing"}
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      selectedEmployee.compliance.hasPFData
                        ? "bg-green-100"
                        : "bg-red-100"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        selectedEmployee.compliance.hasPFData
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      PF Record
                    </div>
                    <div
                      className={`text-xs ${
                        selectedEmployee.compliance.hasPFData
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedEmployee.compliance.hasPFData
                        ? "Generated"
                        : "Pending"}
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      selectedEmployee.compliance.hasIncomeTaxData
                        ? "bg-green-100"
                        : "bg-red-100"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        selectedEmployee.compliance.hasIncomeTaxData
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      Income Tax
                    </div>
                    <div
                      className={`text-xs ${
                        selectedEmployee.compliance.hasIncomeTaxData
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedEmployee.compliance.hasIncomeTaxData
                        ? "Filed"
                        : "Pending"}
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      selectedEmployee.compliance.isFullyCompliant
                        ? "bg-green-100"
                        : "bg-yellow-100"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        selectedEmployee.compliance.isFullyCompliant
                          ? "text-green-800"
                          : "text-yellow-800"
                      }`}
                    >
                      Overall
                    </div>
                    <div
                      className={`text-xs ${
                        selectedEmployee.compliance.isFullyCompliant
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {selectedEmployee.compliance.isFullyCompliant
                        ? "Compliant"
                        : "In Progress"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
