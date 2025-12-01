/**
 * Quick test to check if authentication is working for API calls
 * This can be run in the browser console to debug 401 errors
 */

const testAuth = async () => {
  console.log("🔍 Testing Authentication...");

  // Check if token exists
  const authToken = localStorage.getItem("authToken");
  const token = localStorage.getItem("token");

  console.log("📝 Tokens found:");
  console.log("  authToken:", authToken ? "Present ✅" : "Missing ❌");
  console.log("  token:", token ? "Present ✅" : "Missing ❌");

  const activeToken = authToken || token;

  if (!activeToken) {
    console.log("❌ No authentication token found. Please login again.");
    return;
  }

  // Test API call with authentication
  try {
    console.log("🚀 Testing API call with authentication...");

    const response = await fetch(
      "http://localhost:4000/api/students?limit=5",
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📡 Response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Authentication successful!");
      console.log("📊 Data received:", data);
    } else {
      const errorText = await response.text();
      console.log("❌ Authentication failed:");
      console.log("   Status:", response.status);
      console.log("   Error:", errorText);

      if (response.status === 401) {
        console.log(
          "💡 Suggestion: Token might be expired. Try logging in again."
        );
      }
    }
  } catch (error) {
    console.log("❌ Network error:", error.message);
    console.log(
      "💡 Suggestion: Check if the backend server is running on http://localhost:4000"
    );
  }
};

// Export for use in browser console
if (typeof window !== "undefined") {
  window.testAuth = testAuth;
  console.log("📋 Run testAuth() in console to test authentication");
}
