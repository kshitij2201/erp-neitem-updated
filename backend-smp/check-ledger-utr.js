import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
import Payment from './models/Payment.js';

const checkLedgerUTR = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get recent payments exactly how ledger API does
    const payments = await Payment.find({})
      .sort({ paymentDate: -1 })
      .limit(10)
      .lean();

    console.log(`📊 Found ${payments.length} payments for ledger:`);

    payments.forEach((payment, index) => {
      console.log(`\n--- Payment ${index + 1} ---`);
      console.log(`Receipt: ${payment.receiptNumber}`);
      console.log(`Method: ${payment.paymentMethod}`);
      console.log(`UTR in DB: "${payment.utr}"`);
      console.log(`UTR type: ${typeof payment.utr}`);
      console.log(`UTR length: ${payment.utr ? payment.utr.length : 'N/A'}`);
      console.log(`Date: ${payment.paymentDate}`);
      
      // Transform exactly like ledger API does
      const transformed = {
        type: 'Payment',
        date: payment.paymentDate,
        personName: payment.studentName || 'Unknown',
        course: '',
        description: payment.description || 'Fee payment',
        reference: payment.receiptNumber,
        method: payment.paymentMethod,
        feeHead: '',
        remarks: payment.remarks || '',
        amount: payment.amount,
        receiptNumber: payment.receiptNumber,
        utr: payment.utr || '',
        status: payment.status,
        transactionId: payment.transactionId || ''
      };
      
      console.log(`Transformed UTR: "${transformed.utr}"`);
      console.log(`Would show in ledger: ${payment.paymentMethod !== "Cash" ? transformed.utr || "-" : transformed.reference || "-"}`);
    });

    // Check if any payments have proper UTR
    const paymentsWithUTR = payments.filter(p => p.utr && p.utr.trim() !== '');
    const digitalPayments = payments.filter(p => ['UPI', 'Card', 'Bank Transfer', 'Online'].includes(p.paymentMethod));
    const digitalWithUTR = digitalPayments.filter(p => p.utr && p.utr.trim() !== '');

    console.log(`\n📊 Summary:`);
    console.log(`Total payments: ${payments.length}`);
    console.log(`Payments with UTR: ${paymentsWithUTR.length}`);
    console.log(`Digital payments: ${digitalPayments.length}`);
    console.log(`Digital payments with UTR: ${digitalWithUTR.length}`);

    if (digitalPayments.length > 0 && digitalWithUTR.length === 0) {
      console.log(`\n⚠️ WARNING: All digital payments are missing UTR!`);
      console.log(`This explains why ledger shows empty UTR fields.`);
    }

    await mongoose.disconnect();
    console.log('✅ Ledger UTR check completed');

  } catch (error) {
    console.error('❌ Error checking ledger UTR:', error);
    process.exit(1);
  }
};

checkLedgerUTR();