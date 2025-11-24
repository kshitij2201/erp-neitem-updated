import mongoose from 'mongoose';
import Payment from './models/Payment.js';

async function checkPayments() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp');

    // Find recent payments to check UTR/transactionId storage
    const recentPayments = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(15)
      .select('paymentId receiptNumber paymentMethod transactionId utr amount studentId createdAt');

    console.log('Recent Payments (UTR/Transaction ID check):');
    console.log('Total payments found:', recentPayments.length);
    console.log('');

    recentPayments.forEach((p, i) => {
      console.log(`Payment ${i+1}:`);
      console.log('  Payment ID:', p.paymentId);
      console.log('  Receipt Number:', p.receiptNumber);
      console.log('  Payment Method:', p.paymentMethod);
      console.log('  Transaction ID:', p.transactionId || 'NOT SET');
      console.log('  UTR:', p.utr || 'NOT SET');
      console.log('  Amount:', p.amount);
      console.log('  Created:', new Date(p.createdAt).toLocaleString());
      console.log('');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkPayments();