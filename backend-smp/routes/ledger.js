import express from "express";
const router = express.Router();
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";
import DeletedReceipt from "../models/DeletedReceipt.js";

// GET: Test endpoint to check deleted receipts directly
router.get("/deleted-receipts-test", async (req, res) => {
  try {
    const deletedReceipts = await DeletedReceipt.find({}).lean();
    console.log(`🧪 Test query: Found ${deletedReceipts.length} deleted receipts`);
    res.json({
      count: deletedReceipts.length,
      data: deletedReceipts
    });
  } catch (err) {
    console.error("Test query error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET: Unified ledger (payments + expenses)
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching ledger data...");
    
    // Fetch all payments with student info, department, semester, and fee head info
    const payments = await Payment.find({})
      .populate({
        path: "studentId",
        select: "studentId firstName lastName department semester",
        populate: [
          {
            path: "department",
            select: "name"
          },
          {
            path: "semester", 
            select: "name number"
          }
        ]
      })
      .populate("feeHead", "title")
      .lean();
    // Fetch all expenses (no person info by default)
    const expenses = await Expense.find({}).lean();

    // Fetch all deleted receipts
    const deletedReceipts = await DeletedReceipt.find({}).lean();
    
    console.log(`📊 Ledger query results:`);
    console.log(`   - Payments: ${payments.length}`);
    console.log(`   - Expenses: ${expenses.length}`);
    console.log(`   - Deleted Receipts: ${deletedReceipts.length}`);
    
    if (deletedReceipts.length > 0) {
      console.log("✅ Sample deleted receipt:", JSON.stringify(deletedReceipts[0], null, 2));
    } else {
      console.log("⚠️ No deleted receipts found in database");
    }

    // Debug log to see the structure of payments data
    if (payments.length > 0) {
      console.log('Sample payment data:', JSON.stringify(payments[0], null, 2));
    }

    // Map payments to ledger format (with person info and fee head)
    const paymentEntries = payments.map((p) => ({
      type: "Payment",
      date: p.paymentDate || p.createdAt,
      amount: p.amount,
      description: p.description || "Student Payment",
      reference: p.paymentMethod === "Cash" ? "" : p.transactionId || p.paymentId || p.receiptNumber || "",
      utr: p.utr || "",
      method: p.paymentMethod || "",
      personName: p.studentId
        ? `${p.studentId.firstName} ${p.studentId.lastName}`.trim()
        : "",
      personId: p.studentId ? p.studentId.studentId : "",
      personType: "Student",
      feeHead: p.feeHead ? p.feeHead.title : "",
      course: p.studentId && p.studentId.department && p.studentId.semester
        ? `${p.studentId.department.name} - ${p.studentId.semester.name || 'Sem ' + (p.studentId.semester.number || '')}`
        : p.studentId && p.studentId.department && p.semester
        ? `${p.studentId.department.name} - Sem ${p.semester}`
        : p.semester ? `Semester ${p.semester}` : "",
      receiptNumber: p.receiptNumber || "",
      remarks: p.remarks || "",
    }));

    // Map expenses to ledger format (no person info)
    const expenseEntries = expenses.map((e) => ({
      type: "Expense",
      date: e.date || e.createdAt,
      amount: -Math.abs(e.amount), // Expenses are negative
      description: e.title || "Expense",
      reference: "",
      method: "",
      personName: "",
      personId: "",
      personType: "",
      feeHead: "",
      course: "",
      receiptNumber: "",
      remarks: e.remarks || "",
    }));

    // Map deleted receipts to ledger format
    const deletedEntries = deletedReceipts.map((d) => ({
      type: "Deleted",
      date: d.paymentDate || d.deletedAt,
      amount: d.amount,
      description: d.description || "Deleted Receipt",
      reference: d.paymentMethod === "Cash" ? "" : d.deletedReceiptId || "",
      utr: d.utr || "",
      method: d.paymentMethod || "",
      personName: d.recipientName || "",
      personId: d.studentId || "",
      personType: d.type === "student" ? "Student" : "Faculty",
      feeHead: "",
      course: "",
      receiptNumber: d.receiptNumber || "",
      remarks: d.description || "",
      deletedAt: d.deletedAt,
      deletedBy: d.deletedBy,
    }));

    // Combine and sort by date descending
    const ledger = [...paymentEntries, ...expenseEntries, ...deletedEntries].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    console.log(`📤 Sending ledger response with ${ledger.length} total entries`);
    console.log(`   - Including ${deletedEntries.length} deleted entries`);

    res.json(ledger);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Log a deleted receipt
router.post("/log-deletion", async (req, res) => {
  try {
    console.log("📥 Received deletion log request:", req.body);
    
    const {
      deletedReceiptId,
      receiptNumber,
      type,
      amount,
      recipientName,
      studentId,
      description,
      paymentMethod,
      paymentDate,
      deletedAt,
      deletedBy,
      utr,
    } = req.body;

    // Create new deleted receipt entry
    const deletedReceipt = new DeletedReceipt({
      deletedReceiptId,
      receiptNumber,
      type,
      amount,
      recipientName,
      studentId,
      description,
      paymentMethod,
      utr: utr || '',
      paymentDate,
      deletedAt,
      deletedBy,
    });

    await deletedReceipt.save();
    
    console.log("✅ Deletion logged to database successfully:", deletedReceipt._id);

    res.status(201).json({
      message: "Deletion logged successfully",
      deletedReceipt,
    });
  } catch (err) {
    console.error("❌ Error logging deletion:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

