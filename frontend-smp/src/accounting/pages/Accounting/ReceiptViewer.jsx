import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ReceiptViewer = () => {
  const { receiptNumber } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReceipt();
  }, [receiptNumber]);

  const fetchReceipt = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `https://erpbackend.tarstech.in/api/payments/receipt/${receiptNumber}`,
        { headers }
      );
      setReceipt(response.data);
    } catch (err) {
      console.error("Error fetching receipt:", err);
      setError("Receipt not found or server error");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    if (!receipt) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receipt.receiptNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
          }
          .receipt-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .receipt-details {
            margin: 20px 0;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
          }
          .receipt-amount {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background: #f0f0f0;
            border: 1px solid #ddd;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <h1>NAGARJUNA INSTITUTE</h1>
          <h2>Payment Receipt</h2>
          <p>Receipt No: ${receipt.receiptNumber}</p>
        </div>
        
        <div class="receipt-details">
          <div class="receipt-row">
            <span><strong>Date:</strong></span>
            <span>${new Date(receipt.paymentDate).toLocaleDateString()}</span>
          </div>
          
          ${
            receipt.student
              ? `
          <div class="receipt-row">
            <span><strong>Student Name:</strong></span>
            <span>${receipt.student.name}</span>
          </div>
          <div class="receipt-row">
            <span><strong>Student ID:</strong></span>
            <span>${receipt.student.studentId}</span>
          </div>
          `
              : ""
          }
          
          <div class="receipt-row">
            <span><strong>Payment Method:</strong></span>
            <span>${receipt.paymentMethod}</span>
          </div>
          
          ${
            receipt.description
              ? `
          <div class="receipt-row">
            <span><strong>Description:</strong></span>
            <span>${receipt.description}</span>
          </div>
          `
              : ""
          }
          
          ${
            receipt.transactionId
              ? `
          <div class="receipt-row">
            <span><strong>Transaction ID:</strong></span>
            <span>${receipt.transactionId}</span>
          </div>
          `
              : ""
          }
          
          ${
            receipt.collectedBy
              ? `
          <div class="receipt-row">
            <span><strong>Collected By:</strong></span>
            <span>${receipt.collectedBy}</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="receipt-amount">
          <div>Amount Paid</div>
          <div>₹${receipt.amount.toLocaleString()}</div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
          <p>This is a computer generated receipt.</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Receipt Not Found
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/accounting/receipts")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Receipts
          </button>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No receipt data available</p>
          <button
            onClick={() => navigate("/accounting/receipts")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Receipts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 text-center">
          <h1 className="text-3xl font-bold">NAGARJUNA INSTITUTE</h1>
          <h2 className="text-xl mt-2">
            Institute of Engineering, Technology & Management
          </h2>
          <p className="text-blue-100 mt-2">Payment Receipt</p>
          <div className="mt-4 bg-white/10 rounded-lg p-3 inline-block">
            <p className="text-lg font-semibold">
              Receipt No: {receipt.receiptNumber}
            </p>
          </div>
        </div>

        {/* Receipt Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-600">Date:</span>
                <span>
                  {new Date(receipt.paymentDate).toLocaleDateString()}
                </span>
              </div>

              {receipt.student && (
                <>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-600">
                      Student Name:
                    </span>
                    <span>{receipt.student.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-600">
                      Student ID:
                    </span>
                    <span>{receipt.student.studentId}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-600">
                  Payment Method:
                </span>
                <span>{receipt.paymentMethod}</span>
              </div>
            </div>

            <div className="space-y-4">
              {receipt.description && (
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-600">
                    Description:
                  </span>
                  <span>{receipt.description}</span>
                </div>
              )}

              {receipt.transactionId && (
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-600">
                    Transaction ID:
                  </span>
                  <span>{receipt.transactionId}</span>
                </div>
              )}

              {receipt.collectedBy && (
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-600">
                    Collected By:
                  </span>
                  <span>{receipt.collectedBy}</span>
                </div>
              )}

              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-600">Status:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  {receipt.status || "Completed"}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6 text-center mb-6">
            <p className="text-lg text-green-700 mb-2">Amount Paid</p>
            <p className="text-4xl font-bold text-green-800">
              ₹{receipt.amount.toLocaleString()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={printReceipt}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Receipt
            </button>

            <button
              onClick={() => navigate("/accounting/receipts")}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Receipts
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-600">
          <p>This is a computer generated receipt.</p>
          <p>Generated on: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ReceiptViewer;
