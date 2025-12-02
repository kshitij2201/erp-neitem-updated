// Utility functions for managing departments

// Department name corrections for common typos
const departmentCorrections = {
  "eletronic enigneering": "Electronics Engineering",
  "eletronic engineering": "Electronics Engineering",
  "electronic enigneering": "Electronics Engineering",
  "electronic engineering": "Electronics Engineering",
  electronics: "Electronics Engineering",
  "computer scince": "Computer Science Engineering",
  "computer science": "Computer Science Engineering",
  "civil enigneering": "Civil Engineering",
  civil: "Civil Engineering",
  "mechanical enigneering": "Mechanical Engineering",
  mechanical: "Mechanical Engineering",
  "electrical enigneering": "Electrical Engineering",
  electrical: "Electrical Engineering",
  "information tecnology": "Information Technology",
  "data scince": "Data Science",
  account: "Account Section",
};

// Function to correct department name
export const correctDepartmentName = (departmentName) => {
  if (!departmentName) return departmentName;

  const lowerDept = departmentName.toLowerCase().trim();
  const corrected = departmentCorrections[lowerDept];

  if (corrected) {
    console.log(
      `[DepartmentUtils] Corrected department: "${departmentName}" -> "${corrected}"`
    );
    return corrected;
  }

  return departmentName;
};

// Helper function to get auth token from various sources
const getAuthToken = () => {
  // Try multiple possible token storage keys
  const authToken = localStorage.getItem("authToken");
  const token = localStorage.getItem("token");

  // Also try to get from userData if stored
  const userData = localStorage.getItem("user");
  let userToken = null;
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      userToken = parsed.token;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  const finalToken = authToken || token || userToken;

  if (!finalToken) {
    console.warn(
      "[DepartmentUtils] No authentication token found. Please login again."
    );
  }

  return finalToken;
};

export const fetchDepartments = async () => {
  try {
    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL || "http://erpbackend.tarstech.in"
      }/api/superadmin/departments`
    );

    if (response.ok) {
      const data = await response.json();

      // Handle different response structures
      let departmentNames = [];
      if (Array.isArray(data)) {
        // Direct array response
        departmentNames = data.map((dept) => dept.name);
      } else if (data.value && Array.isArray(data.value)) {
        // Response wrapped in 'value' property
        departmentNames = data.value.map((dept) => dept.name);
      } else if (data.departments && Array.isArray(data.departments)) {
        // Response wrapped in 'departments' property
        departmentNames = data.departments.map((dept) => dept.name);
      }

      return {
        success: true,
        departments: departmentNames,
        fullData: data,
      };
    } else {
      console.error("Failed to fetch departments, response not ok");
      return {
        success: false,
        error: "Failed to fetch departments",
        departments: getFallbackDepartments(),
      };
    }
  } catch (error) {
    console.error("Error fetching departments:", error);
    return {
      success: false,
      error: error.message,
      departments: getFallbackDepartments(),
    };
  }
};

export const getFallbackDepartments = () => [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
  "Data Science",
  "Account Section",
];

export const fetchFacultyDistribution = async () => {
  try {
    // First get the departments
    const departmentResult = await fetchDepartments();
    const departments = departmentResult.departments;

    // Get auth token
    const token = getAuthToken();

    // Then get faculty data with authorization
    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL || "http://erpbackend.tarstech.in"
      }/api/faculty/faculties?limit=1000`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      let faculties = [];
      if (Array.isArray(data.data?.faculties)) faculties = data.data.faculties;
      else if (Array.isArray(data.data)) faculties = data.data;
      else if (Array.isArray(data)) faculties = data;

      // Create distribution map with all departments (including zero counts)
      const distributionMap = {};
      departments.forEach((dept) => {
        distributionMap[dept] = 0;
      });

      // Count faculties by department
      faculties.forEach((faculty) => {
        const dept = faculty.department || "Unknown";
        if (distributionMap.hasOwnProperty(dept)) {
          distributionMap[dept]++;
        } else {
          // If department not in our list, add it
          distributionMap[dept] = 1;
        }
      });

      // Convert to array format for charts
      const distribution = Object.entries(distributionMap).map(
        ([name, count]) => ({
          name,
          count,
        })
      );

      return {
        success: true,
        distribution,
        totalFaculties: faculties.length,
      };
    } else {
      throw new Error("Failed to fetch faculty data");
    }
  } catch (error) {
    console.error("Error fetching faculty distribution:", error);
    return {
      success: false,
      error: error.message,
      distribution: [],
    };
  }
};

export const fetchStudentDistribution = async () => {
  try {
    // First get the departments
    const departmentResult = await fetchDepartments();
    const departments = departmentResult.departments;

    // Get auth token
    const token = getAuthToken();

    // Then get student data with authorization
    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL || "http://erpbackend.tarstech.in"
      }/api/students?limit=1000`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      let students = [];
      if (Array.isArray(data.data?.students)) students = data.data.students;
      else if (Array.isArray(data.data)) students = data.data;
      else if (Array.isArray(data)) students = data;

      // Create distribution map with all departments (including zero counts)
      const distributionMap = {};
      departments.forEach((dept) => {
        distributionMap[dept] = 0;
      });

      // Count students by department
      students.forEach((student) => {
        const dept = student.department || student.branch || "Unknown";
        if (distributionMap.hasOwnProperty(dept)) {
          distributionMap[dept]++;
        } else {
          // If department not in our list, add it
          distributionMap[dept] = 1;
        }
      });

      // Convert to array format for charts
      const distribution = Object.entries(distributionMap).map(
        ([name, count]) => ({
          name,
          count,
        })
      );

      return {
        success: true,
        distribution,
        totalStudents: students.length,
      };
    } else {
      throw new Error("Failed to fetch student data");
    }
  } catch (error) {
    console.error("Error fetching student distribution:", error);
    return {
      success: false,
      error: error.message,
      distribution: [],
    };
  }
};

export const fetchFacultyByDepartment = async (department) => {
  try {
    if (!department) {
      throw new Error("Department is required");
    }

    console.log(
      `[FetchFacultyByDepartment] Using exact department name: "${department}"`
    );

    // Get auth token
    const token = getAuthToken();

    // Use the specific endpoint for fetching faculties by department - NO CORRECTIONS
    const url = `${
      import.meta.env.VITE_API_URL || "http://erpbackend.tarstech.in"
    }/api/faculty/department/${encodeURIComponent(department)}`;

    console.log(`[FetchFacultyByDepartment] Fetching from URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[FetchFacultyByDepartment] API Error ${response.status}:`,
        errorText
      );
      throw new Error(`Failed to fetch faculty data: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[FetchFacultyByDepartment] API Response:`, data);

    // Handle the response structure from the specific endpoint
    let facultiesData = [];
    let departmentName = department; // Use original department name

    if (data.success && Array.isArray(data.data)) {
      facultiesData = data.data;
      departmentName = data.department || department;
    } else if (Array.isArray(data.data?.faculties)) {
      facultiesData = data.data.faculties;
      departmentName = data.data.department || department;
    } else if (Array.isArray(data.data)) {
      facultiesData = data.data;
    } else if (Array.isArray(data)) {
      facultiesData = data;
    }

    console.log(
      `[FetchFacultyByDepartment] Retrieved ${facultiesData.length} faculties for department: ${departmentName}`
    );

    return {
      success: true,
      faculties: facultiesData,
      department: departmentName,
      count: facultiesData.length,
    };
  } catch (error) {
    console.error(
      "[DepartmentUtils] Error fetching faculty by department:",
      error
    );
    return {
      success: false,
      error: error.message,
      faculties: [],
      department: department,
      count: 0,
    };
  }
};

export const fetchCCAssignmentsByDepartment = async (department) => {
  try {
    if (!department) {
      throw new Error("Department is required");
    }

    console.log(
      `[FetchCCAssignmentsByDepartment] Using exact department: "${department}"`
    );

    // Get auth token
    const token = getAuthToken();

    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL || "http://erpbackend.tarstech.in"
      }/api/faculty/cc-assignments?department=${encodeURIComponent(
        department
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[FetchCCAssignmentsByDepartment] API Error ${response.status}:`,
        errorText
      );
      throw new Error(`Failed to fetch CC assignments: ${response.status}`);
    }

    const data = await response.json();
    const assignments = Array.isArray(data.data) ? data.data : [];

    console.log(
      `[FetchCCAssignmentsByDepartment] Retrieved ${assignments.length} CC assignments for department: ${department}`
    );

    return {
      success: true,
      assignments,
      department: department,
    };
  } catch (error) {
    console.error("Error fetching CC assignments by department:", error);
    return {
      success: false,
      error: error.message,
      assignments: [],
      department: department,
    };
  }
};

export const fetchSubjects = async (department = null) => {
  try {
    let url = `${
      import.meta.env.VITE_API_URL || "http://erpbackend.tarstech.in"
    }/api/subjects`;

    // If department is provided, use the department-specific endpoint
    if (department) { 
      url = `${
        import.meta.env.VITE_API_URL || "http://erpbackend.tarstech.in"
      }/api/subjects/department/${encodeURIComponent(department)}`;
      console.log(
        "[FetchSubjects] Fetching subjects for exact department:",
        department
      );
    } else {
      console.log("[FetchSubjects] Fetching all subjects");
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FetchSubjects] API Error ${response.status}:`, errorText);
      throw new Error(`Failed to fetch subjects: ${response.status}`);
    }

    const data = await response.json();
    const subjectsData = Array.isArray(data.data) ? data.data : [];

    console.log("[FetchSubjects] Retrieved subjects:", subjectsData.length);
    console.log("[FetchSubjects] Sample subject data:", subjectsData.slice(0, 2));

    return {
      success: true,
      subjects: subjectsData,
    };
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return {
      success: false,
      error: error.message,
      subjects: [],
    };
  }
};
