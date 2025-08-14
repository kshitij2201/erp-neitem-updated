import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import Breadcrumbs from "./components/Breadcrumbs";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Accounting/Expenses";
import StudentDetails from "./pages/Students/StudentDetails";
import FeeHeads from "./pages/Fee/FeeHeads";
import PaymentHistory from "./pages/Accounting/PaymentHistory";
import Scholarship from "./pages/Students/Scholarship";
import Insurance from "./pages/Students/Insurance";
import ADUIT from "./pages/Accounting/Audit";
import Salary from "./pages/Faculty/Salary";
import SalarySlip from "./pages/Faculty/SalarySlip";
import IncomeTax from "./pages/Faculty/IncomeTax";
import IncomeTaxSimple from "./pages/Faculty/IncomeTaxSimple";
import PFProfessionalTax from "./pages/Faculty/PFProfessionalTax";
import GratuityTax from "./pages/Faculty/GratuityTax";
import Compliance from "./pages/Faculty/Compliance";
import FacultyDashboard from "./pages/Faculty/FacultyDashboard";
import Receipts from "./pages/Accounting/Receipts";
import Reports from "./pages/Reports";
import Store from "./pages/Store";
import Maintenance from "./pages/Maintenance";
import PurchaseModule from "./pages/Purchase";
import AddPayment from "./pages/Accounting/AddPayment";
import Ledger from "./pages/Accounting/Ledger";
import RoleLogin from "./pages/Auth/RoleLogin";
import AccountSectionManagement from "./pages/Faculty/AccountSectionManagement";

// Main App component with authentication awareness
const AppContent = () => {
  const { isAuthenticated } = useAuth();

  // If not authenticated, show only login route
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<RoleLogin />} />
          <Route path="login" element={<RoleLogin />} />
          <Route path="*" element={<RoleLogin />} />
        </Routes>
      </div>
    );
  }

  // If authenticated, show full app with sidebar
  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-grow bg-gray-100 min-h-screen p-6">
        <Breadcrumbs />
        <Routes>
          {/* All Routes - No Authentication Required */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Student Routes */}
          <Route path="students/overview/*" element={<StudentDetails />} />
          <Route path="students/details/*" element={<StudentDetails />} />
          <Route path="students/insurance/*" element={<Insurance />} />
          <Route path="students/scholarship/*" element={<Scholarship />} />
          <Route path="students/*" element={<StudentDetails />} />
          
          {/* Accounting Routes */}
          <Route path="accounting/expenses" element={<Expenses />} />
          <Route path="accounting/payments" element={<PaymentHistory />} />
          <Route path="accounting/add-payment" element={<AddPayment />} />
          <Route path="accounting/receipts" element={<Receipts />} />
          <Route path="accounting/audit" element={<ADUIT />} />
          <Route path="accounting/ledger" element={<Ledger />} />
          <Route path="payments" element={<PaymentHistory />} />
          
          {/* Fee Routes */}
          <Route path="fee/heads" element={<FeeHeads />} />
          
          {/* Faculty Routes */}
          <Route path="faculty/salary" element={<Salary />} />
          <Route path="faculty/salary-slip" element={<SalarySlip />} />
          <Route path="faculty/incometax" element={<IncomeTax />} />
          <Route path="faculty/incometax-simple" element={<IncomeTaxSimple />} />
          <Route path="faculty/pfproftax" element={<PFProfessionalTax />} />
          <Route path="faculty/gratuitytax" element={<GratuityTax />} />
          <Route path="faculty/compliance" element={<Compliance />} />
          <Route path="faculty/dashboard" element={<FacultyDashboard />} />
          <Route path="faculty/account-section" element={<AccountSectionManagement />} />
          
          {/* Auth Routes - Redirect to dashboard if already authenticated */}
          <Route path="login" element={<Dashboard />} />
          
          {/* General Routes */}
          <Route path="reports" element={<Reports />} />
          <Route path="store" element={<Store />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="purchase/*" element={<PurchaseModule />} />
          <Route path="analytics" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
