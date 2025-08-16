/**
 * Debug script for 401 authentication issues
 * Add this to your browser console when getting 401 errors
 */

function debugAuth() {
  console.log("🔍 === AUTHENTICATION DEBUG ===");

  // Check localStorage tokens
  const authToken = localStorage.getItem("authToken");
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  console.log("📱 LocalStorage inspection:");
  console.log(
    "  authToken:",
    authToken ? `Present (${authToken.substring(0, 20)}...)` : "Missing ❌"
  );
  console.log(
    "  token:",
    token ? `Present (${token.substring(0, 20)}...)` : "Missing ❌"
  );
  console.log("  user data:", userData ? "Present ✅" : "Missing ❌");

  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      console.log(
        "  user.token:",
        parsed.token
          ? `Present (${parsed.token.substring(0, 20)}...)`
          : "Missing ❌"
      );
      console.log("  user.role:", parsed.role || "Not specified");
      console.log("  user.department:", parsed.department || "Not specified");
    } catch (e) {
      console.log("  user data parse error:", e.message);
    }
  }

  // Check which token would be used
  const finalToken =
    authToken || token || (userData ? JSON.parse(userData).token : null);
  console.log(
    "🎯 Token that would be used:",
    finalToken ? `${finalToken.substring(0, 20)}...` : "None available"
  );

  // Test token validity
  if (finalToken) {
    console.log("🧪 Testing token with API call...");

    fetch("http://142.93.177.150:4000/api/students?limit=1", {
      headers: {
        Authorization: `Bearer ${finalToken}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        console.log("📡 API Response status:", response.status);
        if (response.status === 401) {
          console.log("❌ Token is invalid or expired");
          console.log("💡 Suggestion: Please logout and login again");
        } else if (response.ok) {
          console.log("✅ Token is valid!");
        } else {
          console.log("⚠️ Other error:", response.status);
        }
        return response.text();
      })
      .then((text) => {
        console.log("📄 Response body:", text.substring(0, 200));
      })
      .catch((error) => {
        console.log("❌ Network error:", error.message);
        console.log("💡 Check if backend is running on http://142.93.177.150:4000");
      });
  } else {
    console.log("❌ No token available for testing");
    console.log("💡 Please login to get a valid token");
  }
}

// Make it available globally
window.debugAuth = debugAuth;

console.log(
  "🔧 Debug function loaded. Run debugAuth() to diagnose authentication issues."
);

export default debugAuth;
