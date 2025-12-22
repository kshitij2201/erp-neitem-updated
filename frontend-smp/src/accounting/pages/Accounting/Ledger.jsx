import React, { useEffect, useState } from "react";

// DCR export helper (PDF format based on DCR format from image)
function exportToDCR(
  data,
  dateFrom = "",
  dateTo = "",
  filename = "DCR_report.pdf"
) {
  // Create HTML content for PDF
  const htmlContent = generateDCRHTML(data, dateFrom, dateTo);

  // Create a new window for PDF generation
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Daily Cash Report</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            font-size: 12px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            font-weight: bold;
          }
          .institute-name { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          .subtitle { 
            font-size: 12px; 
            margin-bottom: 10px; 
          }
          .report-title { 
            font-size: 14px; 
            font-weight: bold; 
            margin: 10px 0; 
          }
          .date-range { 
            font-size: 12px; 
            margin-bottom: 20px; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 15px; 
          }
          th, td { 
            border: 1px solid #000; 
            padding: 4px; 
            text-align: left; 
            font-size: 10px;
          }
          th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-align: center;
          }
          .amount { 
            text-align: right; 
          }
          .total-row { 
            font-weight: bold; 
            background-color: #f9f9f9; 
          }
          .section-title { 
            font-weight: bold; 
            margin: 15px 0 10px 0; 
            font-size: 12px; 
          }
          .notes { 
            font-size: 10px; 
            margin-top: 20px; 
          }
          .footer { 
            margin-top: 20px; 
            font-size: 10px; 
          }
          @media print { 
            body { margin: 0; } 
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function generateDCRHTML(data, dateFrom, dateTo) {
  // Debug: Log what data we're receiving
  console.log("🔍 DCR Export - Total data entries:", data.length);
  console.log("🔍 DCR Export - Payment entries:", data.filter(e => e.type === "Payment").length);
  console.log("🔍 DCR Export - Expense entries:", data.filter(e => e.type === "Expense").length);
  console.log("🔍 DCR Export - Deleted entries:", data.filter(e => e.type === "Deleted").length);
  
  // Function to get academic session based on date
  const getAcademicSession = (date) => {
    const d = new Date(date);
    const month = d.getMonth(); // 0-11 (0 = January, 2 = March)
    const year = d.getFullYear();
    
    // Academic year changes in March (month index 2)
    // If month is January (0) or February (1), use previous year as start
    // If month is March (2) onwards, use current year as start
    let startYear, endYear;
    
    if (month < 2) {
      // January or February - belongs to session that started last year
      startYear = year - 1;
      endYear = year;
    } else {
      // March onwards - belongs to session starting this year
      startYear = year;
      endYear = year + 1;
    }
    
    return `${startYear}-${endYear}`;
  };

  // Calculate totals
  const totalReceipts = data
    .filter((e) => e.type === "Payment")
    .reduce(
      (sum, entry) =>
        typeof entry.amount === "number" && !isNaN(entry.amount)
          ? sum + entry.amount
          : sum,
      0
    );
  const totalPayments = data
    .filter((e) => e.type === "Expense")
    .reduce(
      (sum, entry) =>
        typeof entry.amount === "number" && !isNaN(entry.amount)
          ? sum + Math.abs(entry.amount)
          : sum,
      0
    );

  // Get ALL receipts data (including both Payment and Deleted types)
  const allReceipts = data
    .filter((e) => e.type === "Payment" || e.type === "Deleted")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get only payment receipts for total calculation
  const receipts = data
    .filter((e) => e.type === "Payment")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get deleted receipts data for separate summary table
  const deletedReceipts = data
    .filter((e) => e.type === "Deleted")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate fee head wise totals
  const feeHeadWise = {};
  receipts.forEach((entry) => {
    const feeHead = entry.feeHead || "Other";
    const amount =
      typeof entry.amount === "number" && !isNaN(entry.amount)
        ? entry.amount
        : 0;
    if (feeHeadWise[feeHead]) {
      feeHeadWise[feeHead] += amount;
    } else {
      feeHeadWise[feeHead] = amount;
    }
  });

  // Sort fee heads by total amount (descending)
  const sortedFeeHeads = Object.entries(feeHeadWise).sort(
    ([, a], [, b]) => b - a
  );

  // Calculate payment method wise totals
  const paymentMethodWise = {};
  receipts.forEach((entry) => {
    const method = entry.method || "Other";
    const amount =
      typeof entry.amount === "number" && !isNaN(entry.amount)
        ? entry.amount
        : 0;
    if (paymentMethodWise[method]) {
      paymentMethodWise[method] += amount;
    } else {
      paymentMethodWise[method] = amount;
    }
  });

  // Calculate specific amounts for cash and bank transfers
  const cashAmount = paymentMethodWise["Cash"] || 0;
  const bankTransferAmount =
    (paymentMethodWise["Bank Transfer"] || 0) +
    (paymentMethodWise["Online"] || 0) +
    (paymentMethodWise["UPI"] || 0) +
    (paymentMethodWise["NEFT"] || 0) +
    (paymentMethodWise["RTGS"] || 0);
  const chequeAmount = paymentMethodWise["Cheque"] || 0;
  const ddAmount = paymentMethodWise["DD"] || 0;

  let html = `
    <div class="header">
      <div class="institute-name">NAGARJUNA INSTITUTE OF ENGINEERING, TECHNOLOGY & MANAGEMENT</div>
      <div class="subtitle">(A premier Educational Society)</div>
      <div class="report-title">Daily Cash Report</div>
      <div class="date-range">Receipt Date: From ${
        dateFrom || new Date().toLocaleDateString()
      } To ${dateTo || new Date().toLocaleDateString()}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Receipt No.</th>
          <th>Session</th>
          <th>Student Name</th>
          <th>Course</th>
          <th>Fee Head</th>
          <th>Payment Mode</th>
          <th>Chq/DD No./UTR</th>
          <th>Remarks</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Add ALL receipts rows (including deleted ones marked with *)
  allReceipts.forEach((entry, index) => {
    const session = entry.date ? getAcademicSession(entry.date) : "2025-2026";
    const isDeleted = entry.type === "Deleted";
    const deletedMark = isDeleted ? "*" : "";
    
    html += `
      <tr ${isDeleted ? 'style="background-color: #ffe6e6; color: #cc0000;"' : ''}>
        <td>${deletedMark}${entry.receiptNumber || index + 1}${deletedMark}</td>
        <td>${session}</td>
        <td>${deletedMark}${entry.personName || ""}${deletedMark}</td>
        <td>${entry.course || ""}</td>
        <td>${entry.feeHead || ""}</td>
        <td>${entry.method || ""}</td>
        <td>${entry.type === "Payment" && entry.method !== "Cash" ? (entry.utr || "-") : (entry.reference || "-")}</td>
        <td>${entry.remarks || ""}${isDeleted ? " (DELETED)" : ""}</td>
        <td class="amount">${
          typeof entry.amount === "number" && !isNaN(entry.amount)
            ? deletedMark + entry.amount.toFixed(2) + deletedMark
            : "0.00"
        }</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <!-- Receipt-wise Deleted Entries Summary -->
    <div class="section-title">Receipt-wise Deleted Entries Summary</div>
    <table>
      <thead>
        <tr>
          <th>Sr No.</th>
          <th>Receipt No.</th>
          <th>Date</th>
          <th>Person</th>
          <th>Course</th>
          <th>Fee Head</th>
          <th>Amount</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${deletedReceipts.length === 0 ? `
          <tr>
            <td colspan="8" style="text-align: center; font-style: italic;">No deleted receipts found</td>
          </tr>
        ` : deletedReceipts.map((d, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${d.receiptNumber || "-"}</td>
            <td>${d.date ? new Date(d.date).toLocaleDateString() : "-"}</td>
            <td>${d.personName || "-"}</td>
            <td>${d.course || "-"}</td>
            <td>${d.feeHead || "-"}</td>
            <td class="amount">${typeof d.amount === "number" && !isNaN(d.amount) ? d.amount.toFixed(2) : "0.00"}</td>
            <td>${d.remarks || "-"}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <table>
      <tr class="total-row">
        <td colspan="8">Total Receipts as per ERP ${new Date().toLocaleDateString()}</td>
        <td class="amount">${totalReceipts.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="8">Bank Wise Total Fee Collection</td>
        <td class="amount">${totalReceipts.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="8">G3 Total Fee Collection</td>
        <td class="amount">${totalReceipts.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="8"><strong>Grand Total</strong></td>
        <td class="amount"><strong>${totalReceipts.toFixed(2)}</strong></td>
      </tr>
    </table>

    <div class="section-title">Fee Head Wise Summary</div>
    <table>
      <thead>
        <tr>
          <th>Sr No.</th>
          <th>Fee Head</th>
          <th>Total Collection</th>
        </tr>
      </thead>
      <tbody>
        ${sortedFeeHeads
          .map(
            ([feeHead, amount], index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${feeHead}</td>
            <td class="amount">${amount.toFixed(2)}</td>
          </tr>
        `
          )
          .join("")}
        <tr class="total-row">
          <td colspan="2"><strong>TOTAL</strong></td>
          <td class="amount"><strong>${totalReceipts.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">Payment Method Wise Summary</div>
    <table>
      <thead>
        <tr>
          <th>Sr No.</th>
          <th>Payment Method</th>
          <th>Total Collection</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Cash</td>
          <td class="amount">${cashAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Bank Transfer/Online</td>
          <td class="amount">${bankTransferAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>3</td>
          <td>Cheque</td>
          <td class="amount">${chequeAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>4</td>
          <td>Demand Draft</td>
          <td class="amount">${ddAmount.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2"><strong>TOTAL</strong></td>
          <td class="amount"><strong>${totalReceipts.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">Bank Account Wise Summary</div>
    <table>
      <thead>
        <tr>
          <th>Sr No.</th>
          <th>Bank Name</th>
          <th>Account No.</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>UNION BANK OF INDIA</td>
          <td>366001010036993</td>
          <td class="amount">${totalReceipts.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3"><strong>TOTAL</strong></td>
          <td class="amount"><strong>${totalReceipts.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="notes">
      <strong>Notes:</strong><br>
      1. If receive any balance after fees collection two total will be mismatch on Refundable report<br>
      2. Balance amount will be display in G3 Central amount report<br>
      3. If G3 Balance cancel receipt
    </div>

    <div class="footer">
      <strong>Print Date:</strong> ${new Date().toLocaleDateString()}
    </div>
  `;

  return html;
}

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [personFilter, setPersonFilter] = useState("All");
  const [feeHeads, setFeeHeads] = useState([]);
  const [feeHeadFilter, setFeeHeadFilter] = useState("All");

  useEffect(() => {
    setLoading(true);

    // Get authentication token
    const token = localStorage.getItem("token");
    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" };

    // Fetch receipts data (all entries) and fee heads in parallel
    Promise.all([
      // Fetch ALL receipts with very high limit to ensure we get everything
      fetch("https://backenderp.tarstech.in/api/receipts?limit=999999", { headers }).then(
        (res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }
      ),
      fetch("https://backenderp.tarstech.in/api/ledger", { headers }).then(
        (res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }
      ),
      fetch("https://backenderp.tarstech.in/api/fee-heads", { headers }).then(
        (res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }
      ),
    ])
      .then(([receiptsData, ledgerData, feeHeadsData]) => {
        console.log("📊 Receipts data received:", receiptsData);
        console.log("📊 Ledger data received:", ledgerData);
        
        // Extract receipts array from response
        const receiptsArray = Array.isArray(receiptsData.receipts) ? receiptsData.receipts : [];
        
        // Convert receipts to ledger format
        // Note: All receipts from /api/receipts are payments, so we set type as "Payment"
        const receiptEntries = receiptsArray.map(receipt => ({
          _id: receipt._id,
          type: "Payment", // Force all receipts to be Payment type for ledger
          date: receipt.paymentDate || receipt.date,
          receiptNumber: receipt.receiptNumber,
          personName: receipt.recipientName,
          course: receipt.department || "",
          description: receipt.description,
          reference: receipt.transactionId || "",
          utr: receipt.utr || "",
          method: receipt.paymentMethod,
          feeHead: receipt.feeHead,
          remarks: receipt.remarks,
          amount: receipt.amount,
          originalType: receipt.type // Keep original type (student/salary) for reference
        }));
        
        // Filter ledgerData to only include non-Payment entries (Expenses, Deleted)
        // This prevents duplicates since receiptEntries already has all Payment data
        const nonPaymentLedgerEntries = ledgerData.filter(entry => entry.type !== "Payment");
        
        // Combine receipts with non-payment ledger entries (expenses, deleted receipts)
        const combinedEntries = [...receiptEntries, ...nonPaymentLedgerEntries];
        
        console.log(`📊 Total entries: ${combinedEntries.length}`);
        console.log(`💰 Receipts from API: ${receiptEntries.length}`);
        console.log(`📋 Non-payment ledger entries: ${nonPaymentLedgerEntries.length}`);
        console.log(`📋 Total ledger data received: ${ledgerData.length}`);
        
        // Check for different entry types
        const paymentEntries = combinedEntries.filter(e => e.type === "Payment");
        const expenseEntries = combinedEntries.filter(e => e.type === "Expense");
        const deletedEntries = combinedEntries.filter(e => e.type === "Deleted");
        console.log(`💰 Payments: ${paymentEntries.length}`);
        console.log(`💸 Expenses: ${expenseEntries.length}`);
        console.log(`🗑️ Deleted: ${deletedEntries.length}`);
        
        if (paymentEntries.length > 0) {
          console.log("Sample payment entry:", paymentEntries[0]);
          console.log("Sample payment UTR:", paymentEntries[0].utr);
        }
        
        setEntries(combinedEntries);
        setFeeHeads(Array.isArray(feeHeadsData) ? feeHeadsData : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);

        // Handle authentication errors specifically
        if (err.message.includes("401")) {
          setError("Session expired. Please log in again.");
          // Clear the invalid token
          localStorage.removeItem("token");
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } else {
          setError("Failed to load data");
        }

        setLoading(false);
        // Set default values in case of error
        setFeeHeads([]);
      });
  }, []);

  // Get unique persons for dropdown
  const uniquePersons = [
    ...new Set(entries.filter((e) => e.personName).map((e) => e.personName)),
  ].sort();

  // Get unique courses for dropdown
  const uniqueCourses = [
    ...new Set(entries.filter((e) => e.course).map((e) => e.course)),
  ].sort();

  // Sorting
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // Available sort fields
  const sortFields = [
    { value: "date", label: "Date" },
    { value: "type", label: "Type" },
    { value: "personName", label: "Person" },
    { value: "course", label: "Course" },
    { value: "description", label: "Description" },
    { value: "reference", label: "Reference" },
    { value: "method", label: "Method" },
    { value: "amount", label: "Amount" },
    { value: "feeHead", label: "Fee Head" },
    { value: "receiptNumber", label: "Receipt Number" },
    { value: "remarks", label: "Remarks" },
  ];

  // Handle sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // Add course filter state
  const [courseFilter, setCourseFilter] = useState("All");

  // Filtering logic - Show all entries (payments, expenses, deleted receipts)
  const filteredEntries = entries.filter((entry) => {
    // Type filter (All, Payment, Expense, Deleted)
    if (typeFilter !== "All" && entry.type !== typeFilter) return false;
    
    // Person filter
    if (
      personFilter &&
      personFilter !== "All" &&
      entry.personName !== personFilter
    )
      return false;
    // Course filter
    if (courseFilter !== "All" && entry.course !== courseFilter) return false;
    // Fee Head filter
    if (feeHeadFilter !== "All" && entry.feeHead !== feeHeadFilter)
      return false;
    // Date range filter
    if (dateFrom && new Date(entry.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(entry.date) > new Date(dateTo)) return false;
    // Search filter
    if (search) {
      const s = search.toLowerCase();
      const referenceValue = entry.reference || "";
      if (
        !(entry.description && entry.description.toLowerCase().includes(s)) &&
        !(referenceValue && referenceValue.toLowerCase().includes(s)) &&
        !(entry.feeHead && entry.feeHead.toLowerCase().includes(s)) &&
        !(entry.course && entry.course.toLowerCase().includes(s)) &&
        !(
          entry.receiptNumber && entry.receiptNumber.toLowerCase().includes(s)
        ) &&
        !(entry.utr && entry.utr.toLowerCase().includes(s)) &&
        !(entry.remarks && entry.remarks.toLowerCase().includes(s))
      ) {
        return false;
      }
    }
    return true;
  });

  // Apply sorting
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    // Handle different data types
    if (sortBy === "date") {
      valA = new Date(valA || 0);
      valB = new Date(valB || 0);
    } else if (sortBy === "amount") {
      valA = typeof valA === "number" ? valA : 0;
      valB = typeof valB === "number" ? valB : 0;
    } else if (sortBy === "reference") {
      valA = (a.type === "Payment" && a.method !== "Cash" ? (a.utr || "-") : (a.reference || "-")).toString().toLowerCase();
      valB = (b.type === "Payment" && b.method !== "Cash" ? (b.utr || "-") : (b.reference || "-")).toString().toLowerCase();
    } else {
      valA = (valA || "").toString().toLowerCase();
      valB = (valB || "").toString().toLowerCase();
    }

    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const pageCount = Math.ceil(sortedEntries.length / pageSize);
  const pagedSortedEntries = sortedEntries.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Per-type totals
  const total = sortedEntries.reduce(
    (sum, entry) =>
      typeof entry.amount === "number" && !isNaN(entry.amount)
        ? sum + entry.amount
        : sum,
    0
  );
  const totalPayments = sortedEntries
    .filter((e) => e.type === "Payment")
    .reduce(
      (sum, entry) =>
        typeof entry.amount === "number" && !isNaN(entry.amount)
          ? sum + entry.amount
          : sum,
      0
    );
  const totalExpenses = sortedEntries
    .filter((e) => e.type === "Expense")
    .reduce(
      (sum, entry) =>
        typeof entry.amount === "number" && !isNaN(entry.amount)
          ? sum + entry.amount
          : sum,
      0
    );

  // Row details modal
  const [modalEntry, setModalEntry] = useState(null);

  // Print view
  function handlePrint() {
    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ledger Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            .summary { margin-bottom: 20px; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .amount { text-align: right; }
            .expense { background-color: #fef2f2; }
            .payment { background-color: #f0fdf4; }
            @media print { 
              body { margin: 0; } 
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Complete Ledger Report</h1>
          <div class="summary">
            <div><strong>Total: ${total.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
            })}</strong></div>
            <div style="color: green;">Payments: ${totalPayments.toLocaleString(
              "en-IN",
              { style: "currency", currency: "INR" }
            )}</div>
            <div style="color: red;">Expenses: ${totalExpenses.toLocaleString(
              "en-IN",
              { style: "currency", currency: "INR" }
            )}</div>
            <div>Generated on: ${new Date().toLocaleString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Receipt No</th>
                <th>Person</th>
                <th>Course</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Method</th>
                <th>Fee Head</th>
                <th>Remarks</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${sortedEntries
                .map(
                  (entry) => `
                <tr class="${entry.type === "Expense" ? "expense" : "payment"}">
                  <td>${
                    entry.date ? new Date(entry.date).toLocaleDateString() : ""
                  }</td>
                  <td>${entry.type}</td>
                  <td>${entry.receiptNumber || "-"}</td>
                  <td>${entry.personName || "-"}</td>
                  <td>${entry.course || "-"}</td>
                  <td>${entry.description}</td>
                  <td>${entry.type === "Payment" && entry.method !== "Cash" ? (entry.utr || "-") : (entry.reference || "-")}</td>
                  <td>${entry.method}</td>
                  <td>${entry.feeHead || "-"}</td>
                  <td>${entry.remarks || "-"}</td>
                  <td class="amount">${
                    typeof entry.amount === "number" && !isNaN(entry.amount)
                      ? entry.amount.toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })
                      : "-"
                  }</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-6">
        {/* College Header */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-4">
            <img src="/logo1.png" alt="College Logo" className="h-16 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-white">
                Nagarjuna Institute of Engineering and Technology
              </h1>
              <p className="text-gray-300">
                Deleted Receipts Audit Trail - Management Information System
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-white">Complete Ledger</h1>
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="mb-4">
            <p className="text-gray-300 text-sm">
              Complete ledger showing all payments, expenses, and deleted receipts with full audit trail.
              UTR numbers are displayed in the Reference column for digital payment methods (Online, Card, UPI, Bank Transfer). Cash payments show the reference number.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Type
              </label>
              <select
                className="border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Payment">Payments</option>
                <option value="Expense">Expenses</option>
                <option value="Deleted">Deleted Receipts</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Person
              </label>
              <select
                className="border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
              >
                <option value="All">All Persons</option>
                {uniquePersons.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Course
              </label>
              <select
                className="border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                <option value="All">All Courses</option>
                {uniqueCourses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fee Head
              </label>
              <select
                className="border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={feeHeadFilter}
                onChange={(e) => setFeeHeadFilter(e.target.value)}
              >
                <option value="All">All Fee Heads</option>
                {Array.isArray(feeHeads) &&
                  feeHeads.map((feeHead) => (
                    <option key={feeHead._id} value={feeHead.title}>
                      {feeHead.title}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                From
              </label>
              <input
                type="date"
                className="border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                To
              </label>
              <input
                type="date"
                className="border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Search
              </label>
              <input
                type="text"
                className="border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Description, Reference, Fee Head, Course, Receipt, or Remarks"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sort By
              </label>
              <select
                className="border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {sortFields.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Order
              </label>
              <select
                className="border border-gray-600 rounded px-2 py-1 bg-gray-700 text-white"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <button
              className="ml-auto bg-blue-700 text-white px-4 py-2 rounded shadow hover:bg-blue-800"
              onClick={() => exportToDCR(entries, dateFrom, dateTo)}
            >
              Export DCR (PDF)
            </button>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-4 justify-end font-semibold text-black">
          <div>
            Total Amount:{" "}
            {total.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
            })}
          </div>
          <div className="text-green-400">
            Payments: {totalPayments.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
            })}
          </div>
          <div className="text-orange-400">
            Expenses: {totalExpenses.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
            })}
          </div>
          <div className="text-red-400">
            Deleted: {filteredEntries.filter(e => e.type === "Deleted").length} entries
          </div>
          <button
            className="ml-4 bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-800 print:hidden"
            onClick={handlePrint}
          >
            Print
          </button>
        </div>
        {loading && <div className="text-gray-300">Loading...</div>}
        {error && <div className="text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800 border border-gray-600 rounded shadow print:bg-white">
              <thead>
                <tr>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("date")}
                  >
                    Date{" "}
                    {sortBy === "date" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("type")}
                  >
                    Type{" "}
                    {sortBy === "type" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("receiptNumber")}
                  >
                    Receipt No{" "}
                    {sortBy === "receiptNumber"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("personName")}
                  >
                    Person{" "}
                    {sortBy === "personName"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("course")}
                  >
                    Course{" "}
                    {sortBy === "course" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("description")}
                  >
                    Description{" "}
                    {sortBy === "description"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("reference")}
                  >
                    Reference{" "}
                    {sortBy === "reference"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("method")}
                  >
                    Method{" "}
                    {sortBy === "method" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("feeHead")}
                  >
                    Fee Head{" "}
                    {sortBy === "feeHead"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("remarks")}
                  >
                    Remarks{" "}
                    {sortBy === "remarks"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                  <th
                    className="px-4 py-2 border border-gray-600 text-right cursor-pointer hover:bg-gray-700 text-white bg-gray-800"
                    onClick={() => handleSort("amount")}
                  >
                    Amount{" "}
                    {sortBy === "amount" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedSortedEntries.map((entry, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-gray-700 ${
                      entry.type === "Deleted" ? "bg-red-900 bg-opacity-20" :
                      entry.type === "Expense" ? "bg-orange-900 bg-opacity-20" :
                      "bg-green-900 bg-opacity-10"
                    }`}
                    onClick={() => setModalEntry(entry)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.date
                        ? new Date(entry.date).toLocaleDateString()
                        : ""}
                    </td>
                    <td className={`px-4 py-2 border border-gray-600 ${
                      entry.type === "Deleted" ? "text-red-400 font-bold" :
                      entry.type === "Expense" ? "text-orange-400" :
                      "text-green-400"
                    }`}>
                      {entry.type === "Deleted" ? "🗑️ DELETED" : 
                       entry.type === "Expense" ? "💸 EXPENSE" : 
                       "💰 PAYMENT"}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.receiptNumber || "-"}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.personName || "-"}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.course || "-"}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.description}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.type === "Payment" && entry.method !== "Cash" ? (entry.utr || "-") : (entry.reference || "-")}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.method}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.feeHead || "-"}
                    </td>
                    <td className="px-4 py-2 border border-gray-600 text-white">
                      {entry.remarks || "-"}
                    </td>
                    <td
                      className={`px-4 py-2 border border-gray-600 text-right font-bold ${
                        entry.amount < 0 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {typeof entry.amount === "number" && !isNaN(entry.amount)
                        ? entry.amount.toLocaleString("en-IN", {
                            style: "currency",
                            currency: "INR",
                          })
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-2 print:hidden">
              <div className="text-gray-300">
                Page {page} of {pageCount}
              </div>
              <div>
                <button
                  className="px-2 py-1 border border-gray-600 rounded mr-2 text-white bg-gray-700 hover:bg-gray-600"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Prev
                </button>
                <button
                  className="px-2 py-1 border border-gray-600 rounded text-white bg-gray-700 hover:bg-gray-600"
                  disabled={page === pageCount || pageCount === 0}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Row details modal */}
        {modalEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
            <div className={`rounded shadow-lg p-6 min-w-[300px] max-w-[90vw] border ${
              modalEntry.type === "Deleted" 
                ? "bg-red-900 border-red-600" 
                : modalEntry.type === "Expense"
                ? "bg-orange-900 border-orange-600"
                : "bg-gray-800 border-gray-600"
            }`}>
              <h2 className="text-xl font-bold mb-2 text-white">
                {modalEntry.type === "Deleted" ? "🗑️ Deleted Entry Details" : 
                 modalEntry.type === "Expense" ? "💸 Expense Entry Details" :
                 "💰 Payment Entry Details"}
              </h2>
              
              {modalEntry.type === "Deleted" && (
                <div className="mb-4 p-3 bg-red-800 border border-red-600 rounded">
                  <div className="text-red-200 font-bold mb-1">⚠️ This entry was deleted</div>
                  {modalEntry.deletedAt && (
                    <div className="text-red-300 text-sm">
                      <b>Deleted At:</b> {new Date(modalEntry.deletedAt).toLocaleString()}
                    </div>
                  )}
                  {modalEntry.deletedBy && (
                    <div className="text-red-300 text-sm">
                      <b>Deleted By:</b> {modalEntry.deletedBy}
                    </div>
                  )}
                </div>
              )}
              
              <div className="mb-2 text-gray-300">
                <b className="text-white">Date:</b>{" "}
                {modalEntry.date
                  ? new Date(modalEntry.date).toLocaleString()
                  : "-"}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Type:</b> {modalEntry.type}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Receipt Number:</b>{" "}
                {modalEntry.receiptNumber || "-"}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Person:</b>{" "}
                {modalEntry.personName || "-"}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Course:</b> {modalEntry.course || "-"}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Description:</b>{" "}
                {modalEntry.description}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Reference:</b> {modalEntry.type === "Payment" && modalEntry.method !== "Cash" ? (modalEntry.utr || "-") : (modalEntry.reference || "-")}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Method:</b> {modalEntry.method}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Fee Head:</b>{" "}
                {modalEntry.feeHead || "-"}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Remarks:</b>{" "}
                {modalEntry.remarks || "-"}
              </div>
              <div className="mb-2 text-gray-300">
                <b className="text-white">Amount:</b>{" "}
                {typeof modalEntry.amount === "number" &&
                !isNaN(modalEntry.amount)
                  ? modalEntry.amount.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })
                  : "-"}
              </div>
              <button
                className={`mt-4 px-4 py-2 rounded ${
                  modalEntry.type === "Deleted"
                    ? "bg-red-700 hover:bg-red-800 text-white"
                    : modalEntry.type === "Expense"
                    ? "bg-orange-700 hover:bg-orange-800 text-white"
                    : "bg-blue-700 hover:bg-blue-800 text-white"
                }`}
                onClick={() => setModalEntry(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
