import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SystemStatus from "../components/SystemStatus";
import UnifiedAnalytics from "../components/UnifiedAnalytics";

export default function Dashboard() {
  const [data, setData] = useState({
    totalFeePaid: "Loading...",
    pendingFees: "Loading...",
    totalAppliedFeeHeads: "Loading...",
    totalExpenses: "Loading...",
    facultySalary: "Loading...",
    storeItems: "Loading...",
    maintenanceRequests: "Loading...",
    departmentPurchases: "Loading...",
    taxStatus: "Loading...",
    facultyIncomeTax: "Loading...",
    facultyPF: "Loading...",
    facultyGratuity: "Loading...",
    facultyCompliance: "Loading...",
    totalFeePaidRaw: 0,
    totalAppliedFeeHeadsRaw: 0,
  });

  const [analyticsData, setAnalyticsData] = useState({});
  const [revenueData, setRevenueData] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [collectionRate, setCollectionRate] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    // Safe API fetch function with error handling
    const safeFetch = async (url, defaultValue = null) => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(url, { headers });

        if (!response.ok) {
          console.warn(`API ${url} returned ${response.status}`);
          return defaultValue;
        }

        const result = await response.json();
        return result;
      } catch (error) {
        console.warn(`API ${url} failed:`, error.message);
        return defaultValue;
      }
    };

    try {
      // Fetch real financial data from database
      const [accountsResult, financialSummaryResult, revenueResult] = await Promise.allSettled([
        safeFetch("https://backenderp.tarstech.in/api/accounts/stats/overview", {}),
        safeFetch("https://backenderp.tarstech.in/api/accounts/financial-summary", {}),
        safeFetch("https://backenderp.tarstech.in/api/accounts/revenue/breakdown", {}),
      ]);

      const accountsData = accountsResult.status === "fulfilled" && accountsResult.value?.success 
        ? accountsResult.value.data 
        : { totalPaid: 0, totalBalance: 0, totalAccounts: 0, totalAmount: 0, totalExpenses: 0 };
      const financialSummaryData = financialSummaryResult.status === "fulfilled" 
        ? financialSummaryResult.value 
        : { totalFeesCollected: 0, pendingFees: 0, totalAppliedFeeHeads: 0, totalExpenses: 0 };
      const revenueFetchedData = revenueResult.status === "fulfilled" 
        ? revenueResult.value 
        : {};

      // Set analytics and revenue data
      setAnalyticsData({});
      setRevenueData(revenueFetchedData);

      // Calculate basic stats from available data
      const studentCount = accountsData.totalAccounts || 0;
      const facultyCount = 0; // Not fetching faculty anymore

      // Use financial summary data as primary source, fallback to accounts data
      const totalFeePaid = financialSummaryData.totalFeesCollected || accountsData.totalPaid || 0;
      const pendingFees = financialSummaryData.pendingFees || accountsData.totalBalance || 0;
      const totalAppliedFeeHeads = financialSummaryData.totalAppliedFeeHeads || 0;
      const totalExpenses = financialSummaryData.totalExpenses || accountsData.totalExpenses || 0;
      const facultySalary = financialSummaryData.facultySalaries || 0;

      console.log('Dashboard data received:', {
        accountsData,
        financialSummaryData,
        calculated: { totalFeePaid, pendingFees, totalAppliedFeeHeads, totalExpenses, facultySalary }
      });

      // Calculate collection rate
      const calculatedCollectionRate = totalAppliedFeeHeads > 0 ? 
        ((totalFeePaid / totalAppliedFeeHeads) * 100).toFixed(1) : 0;
      setCollectionRate(calculatedCollectionRate);

      setData((prevData) => ({
        ...prevData,
        totalFeePaid: totalFeePaid ? `₹${totalFeePaid.toLocaleString('en-IN')}` : "₹0",
        pendingFees: pendingFees ? `₹${pendingFees.toLocaleString('en-IN')}` : "₹0",
        totalAppliedFeeHeads: totalAppliedFeeHeads ? `₹${totalAppliedFeeHeads.toLocaleString('en-IN')}` : "₹0",
        totalExpenses: totalExpenses ? `₹${totalExpenses.toLocaleString('en-IN')}` : "₹0",
        facultySalary: facultySalary ? `₹${facultySalary.toLocaleString('en-IN')}` : "₹0",
        storeItems: "0 items",
        maintenanceRequests: "0 pending",
        departmentPurchases: "₹0",
        taxStatus: "Unknown",
        facultyIncomeTax: "Unknown",
        facultyPF: "Unknown",
        facultyGratuity: "Unknown",
        facultyCompliance: "Unknown",
        totalFeePaidRaw: totalFeePaid,
        totalAppliedFeeHeadsRaw: totalAppliedFeeHeads,
      }));
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      setError("Failed to load dashboard data. Please check your connection.");
      // Set error state
      setData((prevData) => ({
        ...prevData,
        totalFeePaid: "₹0",
        pendingFees: "₹0",
        totalAppliedFeeHeads: "₹0",
        totalExpenses: "₹0",
        facultySalary: "₹0",
        storeItems: "0 items",
        maintenanceRequests: "0 pending",
        departmentPurchases: "₹0",
        taxStatus: "Unknown",
        facultyIncomeTax: "Unknown",
        facultyPF: "Unknown",
        facultyGratuity: "Unknown",
        facultyCompliance: "Unknown",
        totalFeePaidRaw: 0,
        totalAppliedFeeHeadsRaw: 0,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (isLoading) {
    return <DashboardLoader />;
  }
  console.log(data);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>

        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-white/10 rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-ping"></div>
        </div>

        <div className="relative z-10 px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h1 className="text-4xl lg:text-6xl font-bold text-white mb-2 tracking-tight">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    Accounts
                  </span>
                  <span className="text-white"> Dashboard</span>
                </h1>
                <p className="text-xl text-blue-100 font-medium">
                  Complete Financial Management System
                </p>
                <p className="text-sm text-blue-200 mt-2">
                  📅 {formatTime(currentTime)}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <QuickActionButton
                  icon="📊"
                  label="Generate Report"
                  color="bg-green-500 hover:bg-green-600"
                />
                <QuickActionButton
                  icon="💰"
                  label="New Payment"
                  color="bg-purple-500 hover:bg-purple-600"
                />
                <button
                  onClick={fetchDashboardData}
                  disabled={isLoading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-3 group"
                >
                  <span className="text-lg group-hover:animate-spin">{isLoading ? "🔄" : "🔄"}</span>
                  <span>{isLoading ? "Refreshing..." : "Sync Data"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div>
                <h3 className="text-red-800 font-semibold">Connection Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button
                onClick={fetchDashboardData}
                className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* System Status with Modern Design */}
        {/* <div className="mb-8">
          <SystemStatus />
        </div> */}

        {/* Key Metrics Dashboard */}
        <div className="mb-8 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading dashboard data...</p>
              </div>
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">📈</span>
            Key Performance Metrics
          </h2>

          {/* Fee Collection Summary */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-xl">💰</span>
              Fee Collection Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                <div className="text-sm text-gray-600 font-medium">Total Fees Applied</div>
                <div className="text-xl font-bold text-blue-600 mt-1">
                  {data.totalAppliedFeeHeads}
                </div>
                <div className="text-xs text-gray-500 mt-1">From Fee Heads</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                <div className="text-sm text-gray-600 font-medium">Total Collected</div>
                <div className="text-xl font-bold text-green-600 mt-1">
                  {data.totalFeePaid}
                </div>
                <div className="text-xs text-gray-500 mt-1">Paid by Students</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border border-red-200 shadow-sm">
                <div className="text-sm text-gray-600 font-medium">Total Pending</div>
                <div className={`text-xl font-bold mt-1 ${
                  parseFloat(data.pendingFees.replace(/[₹,]/g, '')) > 0 ? "text-red-600" : "text-green-700"
                }`}>
                  {data.pendingFees}
                </div>
                <div className="text-xs text-gray-500 mt-1">To Collect</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-100">
              <div className="text-sm text-gray-700">
                <strong>Collection Rate:</strong> {collectionRate}% collected
                ({data.totalFeePaidRaw.toLocaleString('en-IN')} out of {data.totalAppliedFeeHeadsRaw.toLocaleString('en-IN')})
              </div>
            </div>
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <ModernStatCard
              title="Total Fee Collected"
              value={data.totalFeePaid}
              icon="💵"
              trend="+12.5%"
              trendDirection="up"
              color="from-emerald-500 to-teal-600"
              delay="0"
            />
            <ModernStatCard
              title="Pending Fees"
              value={data.pendingFees}
              icon="⏳"
              trend="-8.2%"
              trendDirection="down"
              color="from-amber-500 to-orange-600"
              delay="100"
            />
            <ModernStatCard
              title="Total Applied Fee Heads"
              value={data.totalAppliedFeeHeads}
              icon="💰"
              trend="+5.0%"
              trendDirection="up"
              color="from-cyan-500 to-teal-600"
              delay="200"
            />
            <ModernStatCard
              title="Total Expenses"
              value={data.totalExpenses}
              icon="💸"
              trend="+3.1%"
              trendDirection="up"
              color="from-red-500 to-pink-600"
              delay="300"
            />
            {/* <ModernStatCard
              title="Faculty Salary"
              value={data.facultySalary}
              icon="👥"
              trend="+5.7%"
              trendDirection="up"
              color="from-indigo-500 to-purple-600"
              delay="400"
            /> */}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mb-8">
          <UnifiedAnalytics analyticsData={analyticsData} revenueData={revenueData} />
        </div>

        {/* Secondary Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">🏢</span>
            Operational Overview
          </h2>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <OperationalCard
              title="Store Inventory"
              value={data.storeItems}
              unit="items"
              icon="📦"
              color="bg-blue-500"
            />
            <OperationalCard
              title="Maintenance"
              value={data.maintenanceRequests}
              unit="tickets"
              icon="🔧"
              color="bg-yellow-500"
            />
            <OperationalCard
              title="Purchases"
              value={data.departmentPurchases}
              unit=""
              icon="🛒"
              color="bg-green-500"
            />
            <OperationalCard
              title="Tax Status"
              value="Current"
              unit=""
              icon="📋"
              color="bg-purple-500"
              subtitle={data.taxStatus}
            />
          </div>
        </div>

        {/* Faculty Management Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">👨‍🏫</span>
            Faculty Management
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <ModernFacultyCard
              title="Salary Management"
              status={data.facultySalary}
              link="/faculty/salary"
              icon="💰"
              description="Monthly salary processing and records"
              color="from-green-400 to-emerald-600"
            />
            <ModernFacultyCard
              title="Income Tax"
              status={data.facultyIncomeTax}
              link="/faculty/incometax"
              icon="📊"
              description="Tax calculations and TDS management"
              color="from-blue-400 to-indigo-600"
            />
            <ModernFacultyCard
              title="PF & Professional Tax"
              status={data.facultyPF}
              link="/faculty/pfproftax"
              icon="🏦"
              description="Provident fund and tax deductions"
              color="from-purple-400 to-violet-600"
            />
            <ModernFacultyCard
              title="Gratuity Management"
              status={data.facultyGratuity}
              link="/faculty/gratuitytax"
              icon="🎁"
              description="Gratuity calculations and processing"
              color="from-orange-400 to-red-600"
            />
            <ModernFacultyCard
              title="Compliance Status"
              status={data.facultyCompliance}
              link="/faculty/compliance"
              icon="✅"
              description="Regulatory compliance tracking"
              color="from-teal-400 to-cyan-600"
            />
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            Quick Access
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <QuickLinkCard
              icon="👨‍🎓"
              label="Students"
              link="/students"
              color="bg-blue-500"
            />
            <QuickLinkCard
              icon="💳"
              label="Payments"
              link="/payments"
              color="bg-green-500"
            />
            <QuickLinkCard
              icon="📊"
              label="Reports"
              link="/reports"
              color="bg-purple-500"
            />
            <QuickLinkCard
              icon="🏪"
              label="Store"
              link="/store"
              color="bg-orange-500"
            />
            <QuickLinkCard
              icon="🔧"
              label="Maintenance"
              link="/maintenance"
              color="bg-red-500"
            />
            <QuickLinkCard
              icon="📈"
              label="Analytics"
              link="/analytics"
              color="bg-indigo-500"
            />
          </div>
        </div>

        {/* Login Section for Account Management */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-blue-100 shadow-lg">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Account Management Access
              </h3>
              <p className="text-gray-600 mb-6">
                Login with your faculty credentials to access specialized
                management dashboards
              </p>
              <Link
                to="/login"
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 text-lg"
              >
                <svg
                  className="w-6 h-6 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Faculty Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading Component
function DashboardLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <div className="text-2xl font-bold text-gray-700 mb-2">
          Loading Dashboard
        </div>
        <div className="text-gray-500">
          Preparing your financial overview...
        </div>
      </div>
    </div>
  );
}

// Quick Action Button Component
function QuickActionButton({
  icon,
  label,
  color = "bg-blue-500 hover:bg-blue-600",
}) {
  return (
    <button
      className={`${color} text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-3 group`}
    >
      <span className="text-lg group-hover:animate-bounce">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Modern Stat Card Component
function ModernStatCard({
  title,
  value,
  icon,
  trend,
  trendDirection,
  color,
  delay = "0",
}) {
  return (
    <div
      className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-xl transform transition-all duration-500 hover:scale-105 hover:shadow-2xl`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl opacity-80">{icon}</div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            trendDirection === "up"
              ? "bg-green-500/30 text-green-100"
              : "bg-red-500/30 text-red-100"
          }`}
        >
          {trendDirection === "up" ? "📈" : "📉"} {trend}
        </div>
      </div>
      <div className="mb-2">
        <div className="text-sm opacity-80 font-medium">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2">
        <div
          className="bg-white/60 h-2 rounded-full animate-pulse"
          style={{ width: "75%" }}
        ></div>
      </div>
    </div>
  );
}

// Operational Card Component
function OperationalCard({ title, value, unit, icon, color, subtitle }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">{value}</div>
          <div className="text-sm text-gray-500">{unit}</div>
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-700 mb-1">{title}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

// Modern Faculty Card Component
function ModernFacultyCard({ title, status, link, icon, description, color }) {
  return (
    <Link
      to={link}
      className="block bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:border-blue-200 transform hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-14 h-14 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-all duration-300 shadow-lg`}
        >
          {icon}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            Status
          </div>
          <div className="text-sm font-bold text-blue-600 mt-1">{status}</div>
        </div>
      </div>

      <div className="mb-3">
        <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-blue-500 font-semibold group-hover:text-blue-700 transition-colors">
          View Details →
        </span>
        <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full group-hover:w-12 transition-all duration-300"></div>
      </div>
    </Link>
  );
}

// Quick Link Card Component
function QuickLinkCard({ icon, label, link, color }) {
  return (
    <Link
      to={link}
      className={`${color} text-white rounded-xl p-4 text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105 group`}
    >
      <div className="text-2xl mb-2 group-hover:animate-bounce">{icon}</div>
      <div className="text-sm font-semibold">{label}</div>
    </Link>
  );
}
