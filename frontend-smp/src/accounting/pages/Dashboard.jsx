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
    totalFeePaidRaw: 0,
    totalAppliedFeeHeadsRaw: 0,
  });

  const [analyticsData, setAnalyticsData] = useState({});
  const [revenueData, setRevenueData] = useState({});
  const [operationalData, setOperationalData] = useState({
    departments: "Loading...",
    storeItems: "Loading...",
    maintenanceRequests: "Loading...",
  });

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
    setError(null);

    // small client-side cache to show quick results while refreshing in background
    const cacheKey = "dashboard_cache_v1";
    const cacheTTL = 15 * 1000; // 15 seconds

    // fetch with timeout
    const fetchWithTimeout = async (url, opts = {}, timeout = 10000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch(url, { signal: controller.signal, ...opts });
        clearTimeout(id);
        return res;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    const safeFetch = async (url, defaultValue = null, timeout = 10000) => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetchWithTimeout(url, { headers }, timeout);
        if (!response || !response.ok) {
          console.warn(`API ${url} returned ${response ? response.status : "no-response"}`);
          return defaultValue;
        }
        const result = await response.json();
        return result;
      } catch (error) {
        console.warn(`API ${url} failed:`, error?.message || error);
        return defaultValue;
      }
    };

    try {
      const apiBase = import.meta.env.DEV ? "/api" : "https://backenderp.tarstech.in/api";

      // Try to read fresh cache
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Date.now() - parsed.ts < cacheTTL) {
            // show cached UI immediately
            setData(parsed.data.data);
            setAnalyticsData(parsed.data.analyticsData || {});
            setRevenueData(parsed.data.revenueData || {});
            setOperationalData(parsed.data.operationalData || {});
            setCollectionRate(parsed.data.collectionRate || 0);
            // continue to refresh in background
          }
        }
      } catch (e) {
        // ignore cache errors
      }

      // Phase 1: critical fast fetches (financial summary + accounts overview + fee-heads + dashboard stats)
      setIsLoading(true);
      const [financialSummaryData, accountsData, feeHeadsData, dashboardStatsData] = await Promise.all([
        safeFetch(`${apiBase}/accounts/financial-summary`, { totalFeesCollected: 0 }),
        safeFetch(`${apiBase}/accounts/stats/overview`, { success: false }),
        safeFetch(`${apiBase}/fee-heads`, []),
        safeFetch(`${apiBase}/dashboard/stats`, {}),
      ]);

  const acct = accountsData?.success ? accountsData.data : (accountsData || { totalPaid: 0, totalBalance: 0, totalAccounts: 0, totalAmount: 0, totalExpenses: 0 });
  const fin = financialSummaryData || { totalFeesCollected: 0, pendingFees: 0, totalAppliedFeeHeads: 0, totalExpenses: 0 };

  // Calculate applied from fee-heads * student count (user requested behaviour)
  const feeHeadsArray = Array.isArray(feeHeadsData) ? feeHeadsData : (feeHeadsData?.data || []);
  const sumFeeHeads = feeHeadsArray.reduce((s, h) => s + (Number(h?.amount) || 0), 0);
  // student count: prefer dashboardStatsData.totalStudents, fallback to accounts totalAccounts
  const studentCount = (dashboardStatsData && dashboardStatsData.totalStudents) || acct.totalAccounts || 0;
  const totalAppliedFromFeeHeads = sumFeeHeads > 0 && studentCount > 0 ? (sumFeeHeads * studentCount) : 0;

  // Prefer the fee-heads * studentCount calculation if available per your request; otherwise fall back to backend financial summary
  const totalApplied = totalAppliedFromFeeHeads > 0 ? totalAppliedFromFeeHeads : (fin.totalAppliedFeeHeads || 0);
      const totalCollected = fin.totalFeesCollected || acct.totalPaid || 0;
      const pending = Math.max(0, totalApplied - totalCollected);
      const expenses = fin.totalExpenses || acct.totalExpenses || 0;
      const facultySalary = fin.facultySalaries || 0;

      const calcCollectionRate = totalApplied > 0 ? Number(((totalCollected / totalApplied) * 100).toFixed(1)) : 0;

      // update critical UI immediately
      setData((prev) => ({
        ...prev,
        totalFeePaid: totalCollected ? `₹${totalCollected.toLocaleString('en-IN')}` : "₹0",
        pendingFees: pending ? `₹${pending.toLocaleString('en-IN')}` : "₹0",
        totalAppliedFeeHeads: totalApplied ? `₹${totalApplied.toLocaleString('en-IN')}` : "₹0",
        totalExpenses: expenses ? `₹${expenses.toLocaleString('en-IN')}` : "₹0",
        facultySalary: facultySalary ? `₹${facultySalary.toLocaleString('en-IN')}` : "₹0",
        totalFeePaidRaw: totalCollected,
        totalAppliedFeeHeadsRaw: totalApplied,
      }));
      setCollectionRate(calcCollectionRate);
      setIsLoading(false);

      // Phase 2: background fetches for analytics and operational metrics (note: fee-heads and dashboard stats already fetched above)
      Promise.allSettled([
        safeFetch(`${apiBase}/accounts/revenue/breakdown`, {}),
        safeFetch(`${apiBase}/store/items/count`, {}),
        safeFetch(`${apiBase}/maintenance/requests/count`, {}),
      ]).then((results) => {
        try {
          const [revenueRes, storeItemsRes, maintenanceRes] = results;

          const revenueFetchedData = revenueRes.status === 'fulfilled' ? revenueRes.value : {};
          const storeItems = storeItemsRes.status === 'fulfilled' ? storeItemsRes.value : {};
          const maintenanceRequests = maintenanceRes.status === 'fulfilled' ? maintenanceRes.value : {};

          // update analytics/revenue and operational data
          setAnalyticsData({});
          setRevenueData(revenueFetchedData || {});
          setOperationalData({
            departments: dashboardStatsData?.departments || 0,
            storeItems: storeItems.count || 0,
            maintenanceRequests: maintenanceRequests.count || 0,
          });

          // cache combined results for short time
          try {
            const cache = {
              ts: Date.now(),
              data: {
                data: {
                  totalFeePaid: totalCollected ? `₹${totalCollected.toLocaleString('en-IN')}` : "₹0",
                  pendingFees: pending ? `₹${pending.toLocaleString('en-IN')}` : "₹0",
                  totalAppliedFeeHeads: totalApplied ? `₹${totalApplied.toLocaleString('en-IN')}` : "₹0",
                  totalExpenses: expenses ? `₹${expenses.toLocaleString('en-IN')}` : "₹0",
                  facultySalary: facultySalary ? `₹${facultySalary.toLocaleString('en-IN')}` : "₹0",
                  totalFeePaidRaw: totalCollected,
                  totalAppliedFeeHeadsRaw: totalApplied,
                },
                analyticsData: {},
                revenueData: revenueFetchedData || {},
                operationalData: {
                  departments: dashboardStats.departments || 0,
                  storeItems: storeItems.count || 0,
                  maintenanceRequests: maintenanceRequests.count || 0,
                },
                collectionRate: calcCollectionRate,
              }
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(cache));
          } catch (e) {
            // ignore cache write errors
          }
        } catch (e) {
          console.warn('Background dashboard update failed', e);
        }
      }).catch((e) => console.warn('Background fetch failed', e));

    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      setError("Failed to load dashboard data. Please check your connection.");
      // Set error state with real zeros, no fake data
      setData((prevData) => ({
        ...prevData,
        totalFeePaid: "₹0",
        pendingFees: "₹0",
        totalAppliedFeeHeads: "₹0",
        totalExpenses: "₹0",
        facultySalary: "₹0",
        totalFeePaidRaw: 0,
        totalAppliedFeeHeadsRaw: 0,
      }));
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
  // Safe numeric helpers to avoid render-time exceptions when data is missing
  const totalFeePaidRawNum = Number(data?.totalFeePaidRaw || 0);
  const totalAppliedFeeHeadsRawNum = Number(data?.totalAppliedFeeHeadsRaw || 0);
  const pendingRaw = (() => {
    try {
      if (typeof data?.pendingFees === 'string') {
        const cleaned = data.pendingFees.replace(/[₹,]/g, '');
        const n = Number(cleaned);
        if (!isNaN(n)) return n;
      }
      // fallback to computed difference
      return Math.max(0, totalAppliedFeeHeadsRawNum - totalFeePaidRawNum);
    } catch (e) {
      return Math.max(0, totalAppliedFeeHeadsRawNum - totalFeePaidRawNum);
    }
  })();

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
                <div className={`text-xl font-bold mt-1 ${pendingRaw > 0 ? "text-red-600" : "text-green-700"}`}>
                  {data.pendingFees ?? `₹${pendingRaw.toLocaleString('en-IN')}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">To Collect</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-100">
              <div className="text-sm text-gray-700">
                <strong>Collection Rate:</strong> {collectionRate}% collected
                ({totalFeePaidRawNum.toLocaleString('en-IN')} out of {totalAppliedFeeHeadsRawNum.toLocaleString('en-IN')})
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

        {/* Operational Metrics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">📊</span>
            Operational Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <OperationalCard
              title="Departments"
              value={operationalData.departments}
              unit="active"
              icon="🏢"
              color="bg-green-500"
            />
            <OperationalCard
              title="Store Items"
              value={operationalData.storeItems}
              unit="items"
              icon="📦"
              color="bg-amber-500"
            />
            <OperationalCard
              title="Maintenance Requests"
              value={operationalData.maintenanceRequests}
              unit="pending"
              icon="🔧"
              color="bg-red-500"
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
