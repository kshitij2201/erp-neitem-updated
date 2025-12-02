import React, { useState } from 'react';

export default function ApiTester() {
  const [selectedApi, setSelectedApi] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiEndpoints = [
    { name: 'Account Stats Overview', url: 'https://erpbackend.tarstech.in/api/account/stats/overview' },
    { name: 'Account Expenses Total', url: 'https://erpbackend.tarstech.in/api/account/expenses/total' },
    { name: 'Faculty Salary Total', url: 'https://erpbackend.tarstech.in/api/faculty/salary/total' },
    { name: 'Analytics Overview', url: 'https://erpbackend.tarstech.in/api/analytics/overview' },
    { name: 'Revenue Breakdown', url: 'https://erpbackend.tarstech.in/api/revenue/breakdown' },
    { name: 'Store Items Count', url: 'https://erpbackend.tarstech.in/api/store/items/count' },
    { name: 'Maintenance Requests Count', url: 'https://erpbackend.tarstech.in/api/maintenance/requests/count' },
    { name: 'Purchases Total', url: 'https://erpbackend.tarstech.in/api/purchases/total' },
    { name: 'Tax Status', url: 'https://erpbackend.tarstech.in/api/tax/status' },
    { name: 'Faculty Tax Income', url: 'https://erpbackend.tarstech.in/api/faculty/tax/income' },
    { name: 'Faculty PF Status', url: 'https://erpbackend.tarstech.in/api/faculty/pf/status' },
    { name: 'Faculty Gratuity Status', url: 'https://erpbackend.tarstech.in/api/faculty/gratuity/status' },
    { name: 'Faculty Compliance Status', url: 'https://erpbackend.tarstech.in/api/faculty/compliance/status' },
  ];

  const testApi = async (url) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert('API URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            🔗 API Tester - ERP Dashboard Endpoints
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {apiEndpoints.map((api, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                <h3 className="font-semibold text-gray-800 mb-2">{api.name}</h3>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => testApi(api.url)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                    disabled={loading}
                  >
                    {loading && selectedApi === api.url ? 'Testing...' : 'Test API'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(api.url)}
                    className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-600 break-all">{api.url}</p>
              </div>
            ))}
          </div>

          {/* Response Display */}
          {(response || error) && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {error ? '❌ Error Response' : '✅ API Response'}
              </h2>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {response && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 How to Use:</h3>
            <ul className="text-blue-700 space-y-2">
              <li>• Click "Test API" button to call the endpoint and see the response</li>
              <li>• Click "Copy" to copy the API URL to clipboard</li>
              <li>• All endpoints are currently unprotected for testing</li>
              <li>• Response data will be displayed in JSON format below</li>
              <li>• Green responses indicate success, red indicates errors</li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => {
                apiEndpoints.forEach(api => testApi(api.url));
              }}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              disabled={loading}
            >
              Test All APIs
            </button>
            <button
              onClick={() => {
                setResponse(null);
                setError(null);
              }}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}