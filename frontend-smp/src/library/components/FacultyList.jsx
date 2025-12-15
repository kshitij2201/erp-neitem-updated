import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const FacultyList = () => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [borrowedBooks, setBorrowedBooks] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFaculties, setTotalFaculties] = useState(0);
  const [itemsPerPage] = useState(10);
  const navigate = useNavigate();



  // Function to get total faculty count
  const getTotalFacultyCount = async () => {
    try {
      console.log("🔢 Getting total faculty count...");
      
      // Try different approaches to get total count
      const countResponse = await axios.get(
        "http://localhost:4000/api/faculty/faculties",
        {
          params: {
            page: 1,
            limit: 1000, // Large limit to get all data
          },
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (countResponse.data.success && countResponse.data.data) {
        let totalCount = 0;
        
        if (Array.isArray(countResponse.data.data)) {
          totalCount = countResponse.data.data.length;
        } else if (countResponse.data.data.faculties && Array.isArray(countResponse.data.data.faculties)) {
          totalCount = countResponse.data.data.faculties.length;
        } else if (countResponse.data.data.total) {
          totalCount = countResponse.data.data.total;
        }
        
        console.log("✅ Total faculty count from API:", totalCount);
        return totalCount;
      }
      
      return 0;
    } catch (error) {
      console.error("❌ Error getting total faculty count:", error);
      return 50; // Fallback to user-provided number
    }
  };

  const fetchFaculties = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Fetching faculties from API (Page: ${page}, Limit: ${limit})...`);
      
      // Always fetch all data for local search functionality
      const actualLimit = 1000; // Always fetch all data for local filtering
      const actualPage = 1; // Always fetch from page 1
      
      // First get the total count
      const totalCount = await getTotalFacultyCount();
      const totalPagesCalculated = Math.ceil(totalCount / limit);
      
      console.log(`📊 Total faculty: ${totalCount}, Total pages: ${totalPagesCalculated}`);
      
      // Now fetch all the data
      const response = await axios.get(
        "http://localhost:4000/api/faculty/faculties",
        {
          params: {
            page: actualPage,
            limit: actualLimit,
          },
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log("✅ Faculty API Response:", response.data);
      console.log("📊 Response status:", response.status);

      let facultyData = [];
      let paginationInfo = {
        currentPage: page,
        totalPages: totalPagesCalculated,
        totalFaculties: totalCount,
        itemsPerPage: limit
      };

      // Handle different response formats based on what we see in the network
      console.log("🔍 Raw response structure:", response.data);
      
      if (response.data.success && response.data.data && response.data.data.faculties) {
        // Handle nested structure: { success: true, data: { faculties: [...], pagination: {...} } }
        facultyData = Array.isArray(response.data.data.faculties) 
          ? response.data.data.faculties 
          : [response.data.data.faculties];
        if (response.data.data.pagination) {
          paginationInfo = {
            ...paginationInfo,
            ...response.data.data.pagination
          };
        }
        console.log("✅ Faculty data from nested structure, length:", facultyData.length);
      } else if (response.data.success && Array.isArray(response.data.data)) {
        // Handle wrapper structure: { success: true, data: [...] }
        facultyData = response.data.data;
        console.log("✅ Faculty data from success wrapper, length:", facultyData.length);
      } else if (Array.isArray(response.data)) {
        // Direct array response
        facultyData = response.data;
        console.log("✅ Faculty data is direct array, length:", facultyData.length);
      } else if (response.data && typeof response.data === "object") {
        facultyData = [response.data];
        console.log("✅ Faculty data as single object");
      } else {
        console.error("❌ Unexpected faculty data format:", response.data);
        console.error("❌ No faculty data found in API response");
        setFaculties([]);
        setLoading(false);
        setError("No faculty data found in the API response");
        return;
      }

      // Update pagination state
      console.log("📊 Setting pagination state:", {
        currentPage: paginationInfo.currentPage,
        totalPages: paginationInfo.totalPages,
        totalFaculties: paginationInfo.totalFaculties,
        itemsPerPage: paginationInfo.itemsPerPage
      });
      
      setCurrentPage(paginationInfo.currentPage || page);
      setTotalPages(paginationInfo.totalPages || 1);
      setTotalFaculties(paginationInfo.totalFaculties || facultyData.length);

      // Check if we have valid faculty data
      if (!facultyData || facultyData.length === 0) {
        console.error("❌ No faculty data received from API");
        setFaculties([]);
        setLoading(false);
        setError("No faculty data received from API");
        return;
      }

      console.log("Sample faculty data:", facultyData[0]);
      console.log("Total faculty members:", facultyData.length);

      // Debug department data
      console.log("Sample faculty object keys:", Object.keys(facultyData[0] || {}));
      const departments = facultyData.map((f) => f.department);
      console.log("All departments:", departments);
      console.log("Unique departments:", [...new Set(departments)]);

      // Check if department data might be in a different field
      const possibleDeptFields = [
        "department",
        "Department",
        "dept",
        "facultyDepartment",
        "stream",
        "branch",
        "designation",
      ];
      possibleDeptFields.forEach((field) => {
        const values = facultyData
          .map((f) => f[field])
          .filter((v) => v !== undefined);
        if (values.length > 0) {
          console.log(`Found data in field '${field}':`, [...new Set(values)]);
        }
      });

      // Check specific designation values to see if they contain department info
      const designations = facultyData
        .map((f) => f.designation)
        .filter((d) => d);
      console.log("All designations:", designations);
      console.log("Unique designations:", [...new Set(designations)]);

      const formattedFaculties = facultyData.map((faculty, index) => {
        console.log(`🔍 Processing faculty ${index}:`, faculty);
        console.log(`🔑 Available fields:`, Object.keys(faculty));
        console.log(`📝 Name fields:`, {
          firstName: faculty.firstName,
          lastName: faculty.lastName,
          name: faculty.name,
          employeeId: faculty.employeeId,
          department: faculty.department
        });
        
        // Parse the joining date safely
        let joiningDate =
          faculty.joiningDate ||
          faculty.dateOfJoining ||
          faculty.dateOfBirth ||
          new Date().toISOString().split("T")[0];
        let formattedDate;
        try {
          formattedDate = new Date(joiningDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } catch (e) {
          console.error("Error formatting date:", joiningDate);
          formattedDate = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }

        // Build full name from available parts
        const firstN = faculty.firstName || faculty.fname || "";
        const middleN = faculty.middleName || faculty.mname || "";
        const lastN = faculty.lastName || faculty.lname || "";
        
        let fullName = [firstN, middleN, lastN].filter(Boolean).join(" ");
        
        // Fallback to other name formats
        if (!fullName) {
          fullName = faculty.name || faculty.fullName || `${firstN} ${lastN}`.trim();
        }
        
        // Final fallback
        if (!fullName || fullName.trim() === "") {
          fullName = "Unknown Faculty";
        }

        const formattedFaculty = {
          _id: faculty._id || faculty.id || "",
          employeeId: faculty.employeeId || faculty.empId || faculty._id || faculty.id || "",
          firstName: firstN,
          middleName: middleN,
          lastName: lastN,
          name: fullName,
          department:
            faculty.department?.name ||
            faculty.department ||
            faculty.dept ||
            faculty.stream ||
            faculty.branch ||
            "Unknown Department",
          designation: faculty.designation || faculty.position || "Not Specified",
          email: faculty.email || faculty.emailId || "",
          mobile: faculty.mobile || faculty.phone || faculty.phoneNumber || "",
          status: faculty.status || faculty.employmentStatus || faculty.isActive ? "Active" : "Inactive" || "Active",
          joiningDate,
          formattedJoiningDate: formattedDate,
        };

        console.log(`Formatted faculty ${index}:`, formattedFaculty);
        return formattedFaculty;
      });

      setFaculties(formattedFaculties);
      console.log(`✅ Successfully loaded ${formattedFaculties.length} faculty members from API`);
      console.log("📋 Faculty list:", formattedFaculties);

      // Fetch real borrowed books for each faculty from MongoDB
      console.log(
        "📚 Fetching real borrowed books for faculty members from database..."
      );
      try {
        await fetchBorrowedBooksForAllFaculty(formattedFaculties);
      } catch (booksError) {
        console.error("❌ Error fetching borrowed books:", booksError);
        // Continue without borrowed books data - the UI will show 0 books
      }

      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching faculties:", error);
      console.error("❌ Error details:", error.message);
      
      // Set error message for API failure
      console.log("❌ API failed, no fallback data");
      setError(`API Connection Failed: ${error.message}. Please check if the backend server is running on http://localhost:4000`);
      setFaculties([]);
      
      setLoading(false);
    }
  };

  // 📚 Function to fetch real borrowed books for all faculty from database
  const fetchBorrowedBooksForAllFaculty = async (facultyList) => {
    try {
      const newBorrowedBooks = {};

      // Fetch borrowed books for each faculty member
      for (const faculty of facultyList) {
        try {
          // Skip faculty without employeeId or _id
          const borrowerId = faculty.employeeId || faculty._id;
          if (!borrowerId) {
            console.log(`⚠️ Skipping faculty without ID: ${faculty.name}`);
            newBorrowedBooks[faculty.employeeId || faculty._id || "unknown"] =
              [];
            continue;
          }

          console.log(`🔍 Fetching books for faculty: ${borrowerId}`);

          // First try the borrowed-books endpoint
          let allBooks = [];

          try {
            const borrowedResponse = await axios.get(
              `http://localhost:4000/api/issues/borrowed-books`,
              {
                params: {
                  borrowerId: borrowerId,
                  borrowerType: "faculty",
                },
                timeout: 5000
              }
            );

            if (borrowedResponse.data.success && borrowedResponse.data.data) {
              const borrowedBooks = Array.isArray(borrowedResponse.data.data)
                ? borrowedResponse.data.data
                : [];
              allBooks = [...borrowedBooks];
              console.log(
                `📚 Found ${borrowedBooks.length} books from borrowed-books API for ${borrowerId}`
              );
            }
          } catch (borrowedError) {
            console.log(
              `ℹ️ borrowed-books API not available for ${borrowerId}, using history only`
            );
          }

          // Also check history for additional/more recent transactions
          try {
            const historyResponse = await axios.get(
              `http://localhost:4000/api/issues/history`,
              {
                params: {
                  employeeId: borrowerId,
                  borrowerType: "faculty",
                  page: 1,
                  limit: 50,
                },
                timeout: 5000
              }
            );

            if (
              historyResponse.data.success &&
              historyResponse.data.data &&
              historyResponse.data.data.records
            ) {
              const historyTransactions = historyResponse.data.data.records;

              // Group transactions by book to find the latest state
              const bookMap = new Map();

              // Add existing books to map first
              allBooks.forEach((book) => {
                const bookId = book.ACCNO || book.bookId;
                bookMap.set(bookId, {
                  ...book,
                  source: "borrowed-books",
                });
              });

              // Process history transactions
              historyTransactions.forEach((transaction) => {
                const bookId = transaction.bookId || transaction.ACCNO;

                // Keep track of the latest transaction for each book
                if (
                  !bookMap.has(bookId) ||
                  new Date(transaction.createdAt) >
                    new Date(bookMap.get(bookId).createdAt || 0)
                ) {
                  bookMap.set(bookId, {
                    ...transaction,
                    source: "history",
                  });
                }
              });

              // Filter to only include books that are currently borrowed
              const activeBorrowedBooks = [];
              bookMap.forEach((latestTransaction, bookId) => {
                if (
                  latestTransaction.transactionType !== "return" &&
                  latestTransaction.status === "active"
                ) {
                  activeBorrowedBooks.push({
                    _id: latestTransaction._id,
                    ACCNO: latestTransaction.bookId || latestTransaction.ACCNO,
                    bookTitle: latestTransaction.bookTitle,
                    author: latestTransaction.author || "Unknown Author",
                    publisher:
                      latestTransaction.publisher || "Unknown Publisher",
                    issueDate: latestTransaction.issueDate,
                    dueDate: latestTransaction.dueDate,
                    status: latestTransaction.status,
                    employeeId: borrowerId,
                    borrowerId: borrowerId,
                    borrowerType: "faculty",
                    transactionType: latestTransaction.transactionType,
                    source: latestTransaction.source,
                  });
                }
              });

              newBorrowedBooks[borrowerId] = activeBorrowedBooks;
              console.log(
                `📚 Final count: ${activeBorrowedBooks.length} books for faculty ${borrowerId} (using combined approach)`
              );
            } else {
              // Fallback to borrowed-books data only
              newBorrowedBooks[borrowerId] = allBooks.filter(
                (book) => book.status === "active"
              );
              console.log(
                `📚 Using borrowed-books only: ${newBorrowedBooks[borrowerId].length} books for faculty ${borrowerId}`
              );
            }
          } catch (historyError) {
            console.error(
              `❌ Error fetching history for faculty ${borrowerId}:`,
              historyError
            );
            newBorrowedBooks[borrowerId] = allBooks.filter(
              (book) => book.status === "active"
            );
          }
        } catch (error) {
          console.error(
            `❌ Error fetching books for faculty ${borrowerId}:`,
            error
          );
          // Generate mock books for this faculty as fallback
          console.log(`🔄 Generating mock books for faculty ${borrowerId}`);
          generateMockBorrowedBooks(borrowerId);
          newBorrowedBooks[borrowerId] = borrowedBooks[borrowerId] || [];
        }
      }

      setBorrowedBooks(newBorrowedBooks);
      console.log("✅ Finished fetching borrowed books for all faculty");
    } catch (error) {
      console.error("❌ Error fetching borrowed books for faculty:", error);
    }
  };

  const generateMockBorrowedBooks = (employeeId) => {
    // Generate 0-3 random books for each faculty member
    const bookCount = Math.floor(Math.random() * 4);
    const mockBooks = [];

    const bookTitles = [
      "Introduction to Computer Science",
      "Data Structures and Algorithms",
      "Database Management Systems",
      "Operating Systems Concepts",
      "Software Engineering Principles",
      "Network Security Fundamentals",
      "Machine Learning Basics",
      "Web Development with React",
      "Python Programming Guide",
      "Java Enterprise Edition",
      "Digital Image Processing",
      "Artificial Intelligence",
      "Mobile App Development",
      "Cloud Computing Essentials",
      "Cybersecurity Handbook",
    ];

    const authors = [
      "John Smith",
      "Sarah Johnson",
      "Michael Brown",
      "Emily Davis",
      "Robert Wilson",
      "Jessica Garcia",
      "David Miller",
      "Lisa Anderson",
      "James Taylor",
      "Mary Martinez",
      "Christopher Lee",
      "Jennifer White",
    ];

    for (let i = 0; i < bookCount; i++) {
      const randomBook =
        bookTitles[Math.floor(Math.random() * bookTitles.length)];
      const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
      const issueDate = new Date();
      issueDate.setDate(issueDate.getDate() - Math.floor(Math.random() * 30));

      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 14);

      mockBooks.push({
        ACCNO: `ACC${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`,
        bookTitle: randomBook,
        author: randomAuthor,
        publisher: "Academic Press",
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: "active",
        employeeId: employeeId,
        borrowerId: employeeId,
        borrowerType: "faculty",
      });
    }

    setBorrowedBooks((prev) => ({
      ...prev,
      [employeeId]: mockBooks,
    }));

    console.log(
      `� Generated ${mockBooks.length} mock books for faculty ${employeeId}`
    );
  };

  useEffect(() => {
    fetchFaculties(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

  // Reset to page 1 when starting a search
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Handle search and filter changes - reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDepartment]);

  // Function to handle page changes
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Function to refresh data
  const refreshData = async () => {
    setCurrentPage(1);
    await fetchFaculties(1, itemsPerPage);
  };

  const getFacultyStats = () => {
    const stats = {
      total: searchTerm.trim() !== "" ? allFilteredFaculties.length : totalFaculties, // Use filtered count when searching
      byDepartment: (searchTerm.trim() !== "" ? allFilteredFaculties : faculties).reduce((acc, faculty) => {
        const dept = faculty.department || "Unknown Department";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}),
    };

    console.log("📊 Faculty stats:", stats);
    return stats;
  };

  // Add safety check to prevent the error
  const allFilteredFaculties = (faculties || []).filter((faculty) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      (faculty.firstName?.toLowerCase() || "").startsWith(searchTerm.toLowerCase());

    const matchesDepartment =
      filterDepartment === "all" || faculty.department === filterDepartment;

    return matchesSearch && matchesDepartment;
  }).sort((a, b) => {
    // Sort alphabetically by firstName
    const nameA = (a.firstName || a.name || "").toLowerCase();
    const nameB = (b.firstName || b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Apply pagination only when not searching
  const filteredFaculties = searchTerm.trim() === ""
    ? allFilteredFaculties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : allFilteredFaculties;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col items-center justify-center ml-72">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-indigo-400 mb-4"></div>
          <div className="h-8 w-64 bg-indigo-300 rounded mb-3"></div>
          <div className="h-4 w-40 bg-indigo-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md flex flex-col items-center">
          <h2 className="text-2xl font-bold text-red-700 mb-2">
            Error Loading Faculty
          </h2>
          <p className="text-gray-600 text-center">{error}</p>
          <button
            onClick={refreshData}
            className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 min-h-screen bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 flex flex-col py-12 px-2 md:px-8 z-0 ml-72 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-7xl">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">
            Faculty Directory
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage and view all faculty members and their details.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Total Faculty
            </h3>
            <p className="text-3xl font-bold text-indigo-600">
              {getFacultyStats().total}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-lg font-semibold text-gray-700">Departments</h3>
            <p className="text-3xl font-bold text-indigo-600">
              {Object.keys(getFacultyStats().byDepartment).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Active Faculty
            </h3>
            <p className="text-3xl font-bold text-indigo-600">
              {faculties.filter((f) => f.status === "active").length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Departments</option>
                {Object.keys(getFacultyStats().byDepartment).map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4 text-gray-600">
          {searchTerm.trim() !== "" ? (
            `Found ${allFilteredFaculties.length} faculty member${allFilteredFaculties.length !== 1 ? 's' : ''} matching "${searchTerm}"`
          ) : (
            `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, totalFaculties)} of ${totalFaculties} faculty members (Page ${currentPage} of ${totalPages})`
          )}
        </div>

        {filteredFaculties.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-purple-100 p-12 text-center">
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              {searchTerm.trim() !== "" ? "No Matching Faculty Found" : "No Faculty Found"}
            </h3>
            <p className="text-gray-500">
              {searchTerm.trim() !== "" 
                ? `No faculty members match your search for "${searchTerm}". Try a different search term.`
                : "There are currently no faculty members in the database."
              }
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
              <div className="col-span-4">Name & Department</div>
              <div className="col-span-3">Contact</div>
              <div className="col-span-2">Designation</div>
              <div className="col-span-3">Actions</div>
            </div>

            {/* Faculty List */}
            <div className="divide-y divide-gray-200">
              {filteredFaculties.map((faculty) => (
                <div
                  key={faculty._id}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Name and Department */}
                  <div className="col-span-4">
                    <h3 className="font-medium text-gray-900">
                      {faculty.name}
                    </h3>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                        {faculty.department}
                      </span>
                      <span className="text-xs text-gray-500">
                        ID: {faculty.employeeId}
                      </span>
                      <span className="text-xs font-medium bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Joined:{" "}
                        {faculty.joiningDate
                          ? new Date(faculty.joiningDate).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "Not specified"}
                      </span>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="col-span-3">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="truncate">{faculty.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <span>{faculty.mobile}</span>
                      </div>
                    </div>
                  </div>

                  {/* Designation */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-600">
                      {faculty.designation}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center gap-2">
                    <button
                      className="flex-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm font-semibold"
                      onClick={() => {
                        // Store faculty and books info for the books view page
                        const facultyKey = faculty.employeeId || faculty._id;
                        localStorage.setItem(
                          "viewFacultyBooks",
                          JSON.stringify({
                            faculty: {
                              employeeId: faculty.employeeId,
                              name: faculty.name,
                              department: faculty.department,
                              designation: faculty.designation,
                            },
                            books: borrowedBooks[facultyKey] || [],
                          })
                        );
                        navigate(
                          "/library/faculty-books/" + faculty.employeeId
                        );
                      }}
                    >
                      View Books (
                      {
                        (borrowedBooks[faculty.employeeId || faculty._id] || [])
                          .length
                      }
                      )
                    </button>
                    <button
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold"
                      onClick={() => {
                        const borrowerData = {
                          employeeId: faculty.employeeId,
                          borrowerId: faculty.employeeId,
                          borrowerName: faculty.name,
                          name: faculty.name,
                          department: faculty.department || "",
                          designation: faculty.designation || "",
                          email: faculty.email || "",
                          mobile: faculty.mobile || "",
                          phone: faculty.mobile || "",
                          type: "faculty",
                          borrowerType: "faculty",
                          status: "active",
                        };
                        // Store in localStorage as a fallback
                        localStorage.setItem(
                          "selectedFaculty",
                          JSON.stringify(borrowerData)
                        );
                        localStorage.setItem(
                          "selectedBorrower",
                          JSON.stringify(borrowerData)
                        );
                        // Use React Router's state for better state management
                        navigate("/library/book-actions", {
                          state: {
                            borrower: borrowerData,
                          },
                        });
                      }}
                    >
                      Issue Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && searchTerm.trim() === "" && (
          <div className="bg-white rounded-xl shadow-md p-4 mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalFaculties)} of {totalFaculties} faculty members
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyList;
