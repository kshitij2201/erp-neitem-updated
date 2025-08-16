import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

// Note: Uses real student data from StudentManagement.js when available
// Falls back to fetching individual student data if not passed via localStorage

const StudentBooks = () => {
  const { id: studentId } = useParams();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔄 Function to fetch fresh borrowed books for this student
  const fetchFreshBorrowedBooks = async (studentId) => {
    try {
      console.log(
        `🔄 Fetching fresh borrowed books for student ${studentId}...`
      );

      // Use the history endpoint to get the most recent transactions
      const response = await axios.get(
        `http://142.93.177.150:4000/api/issues/history`,
        {
          params: {
            studentId: studentId,
            borrowerType: "student",
            page: 1,
            limit: 50, // Get more records to ensure we get all active books
          },
        }
      );

      console.log(
        `📚 Fresh books API response for ${studentId}:`,
        response.data
      );

      if (
        response.data.success &&
        response.data.data &&
        response.data.data.records
      ) {
        const allTransactions = response.data.data.records;
        console.log(
          `📖 Found ${allTransactions.length} total transactions for ${studentId}:`,
          allTransactions
        );

        // Group transactions by book to find the latest state
        const bookMap = new Map();

        allTransactions.forEach((transaction, index) => {
          const bookId = transaction.bookId || transaction.ACCNO;
          console.log(`📚 Transaction ${index + 1}:`, {
            ACCNO: bookId,
            transactionType: transaction.transactionType,
            issueDate: transaction.issueDate,
            dueDate: transaction.dueDate,
            createdAt: transaction.createdAt,
            status: transaction.status,
          });

          // Keep track of the latest transaction for each book
          if (
            !bookMap.has(bookId) ||
            new Date(transaction.createdAt) >
              new Date(bookMap.get(bookId).createdAt)
          ) {
            bookMap.set(bookId, transaction);
          }
        });

        // Filter to only include books that are currently borrowed (latest transaction is not return)
        const activeBorrowedBooks = [];
        bookMap.forEach((latestTransaction, bookId) => {
          console.log(`📚 Latest transaction for book ${bookId}:`, {
            transactionType: latestTransaction.transactionType,
            status: latestTransaction.status,
            dueDate: latestTransaction.dueDate,
            createdAt: latestTransaction.createdAt,
          });

          if (
            latestTransaction.transactionType !== "return" &&
            latestTransaction.status === "active"
          ) {
            activeBorrowedBooks.push(latestTransaction);
          }
        });

        console.log(
          `📖 Found ${activeBorrowedBooks.length} currently borrowed books:`,
          activeBorrowedBooks
        );

        // Update the student data with fresh book information
        setStudentData((prevData) => {
          if (!prevData) return prevData;

          const updatedData = {
            ...prevData,
            books: activeBorrowedBooks.map((book) => ({
              _id: book._id || book.bookId || book.ACCNO,
              ACCNO: book.bookId || book.ACCNO,
              TITLENAME: book.bookTitle || book.title,
              bookTitle: book.bookTitle || book.title,
              title: book.bookTitle || book.title,
              issueDate: book.issueDate,
              dueDate: book.dueDate, // This should be the latest due date from renewals
              returnDate: book.returnDate,
              status: book.status || "active",
              author: book.author || "Unknown Author",
              publisher: book.publisher || "Unknown Publisher",
              renewCount: book.renewCount || 0,
              transactionType: book.transactionType,
            })),
          };

          console.log(
            "✅ Updated student data with fresh books from history:",
            {
              oldBookCount: prevData.books.length,
              newBookCount: updatedData.books.length,
              updatedBooks: updatedData.books,
              dueDateChanges: updatedData.books.map((newBook) => {
                const oldBook = prevData.books.find(
                  (old) => old.ACCNO === newBook.ACCNO
                );
                return {
                  ACCNO: newBook.ACCNO,
                  oldDueDate: oldBook?.dueDate,
                  newDueDate: newBook.dueDate,
                  changed: oldBook?.dueDate !== newBook.dueDate,
                };
              }),
            }
          );

          return updatedData;
        });

        return activeBorrowedBooks;
      } else {
        console.log("ℹ️ No transaction history found for this student");
        return [];
      }
    } catch (error) {
      console.error("❌ Error fetching fresh borrowed books:", error);
      console.error("❌ Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return null;
    }
  };

  useEffect(() => {
    const fetchStudentBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        // First try to get data from localStorage (passed from StudentList)
        const storedData = JSON.parse(
          localStorage.getItem("viewStudentBooks") || "{}"
        );

        if (storedData.student && storedData.books) {
          console.log("Using stored student data:", storedData.student);
          setStudentData(storedData);
        } else {
          // If not in localStorage, try to fetch student data from API
          console.log("Fetching student data for ID:", studentId);

          try {
            const response = await axios.get(
              `http://142.93.177.150:4000/api/students`
            );
            const students = Array.isArray(response.data) ? response.data : [];

            // Find the specific student
            const student = students.find(
              (s) => s.studentId === studentId || s._id === studentId
            );

            if (student) {
              // Format student data
              const formattedStudent = {
                studentId: student.studentId || studentId,
                name: [student.firstName, student.middleName, student.lastName]
                  .filter(Boolean)
                  .join(" "),
                department:
                  typeof student.department === "string"
                    ? student.department
                    : student.department?.name || "Unknown Department",
                stream:
                  typeof student.stream === "string"
                    ? student.stream
                    : student.stream?.name || "Unknown Stream",
                semester:
                  student.semester?.name || student.semester || "Unknown",
                email: student.email || "N/A",
                phone: student.mobileNumber || "N/A",
                enrollmentNumber: student.enrollmentNumber,
                gender: student.gender,
                admissionType: student.admissionType,
              };

              // Generate mock books for this student (since book system isn't implemented yet)
              const mockBooks = generateMockBooks(
                student.studentId || studentId
              );

              setStudentData({
                student: formattedStudent,
                books: mockBooks,
              });

              console.log("Found student:", formattedStudent);
            } else {
              throw new Error("Student not found");
            }
          } catch (apiError) {
            console.error("Error fetching from API:", apiError);

            // Fallback to basic mock data
            const fallbackStudent = {
              studentId: studentId,
              name: "Student " + studentId,
              department: "Unknown Department",
              stream: "Unknown Stream",
              semester: "Unknown",
              email: "N/A",
              phone: "N/A",
            };

            setStudentData({
              student: fallbackStudent,
              books: generateMockBooks(studentId),
            });

            console.log("Using fallback student data");
          }
        }
      } catch (error) {
        console.error("Error in fetchStudentBooks:", error);
        setError("Failed to load student books. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    // Helper function to generate mock books
    const generateMockBooks = (studentId) => {
      const bookTitles = [
        "Introduction to Computer Science",
        "Data Structures and Algorithms",
        "Database Management Systems",
        "Operating Systems Concepts",
        "Software Engineering",
        "Digital Electronics",
        "Engineering Mechanics",
        "Thermodynamics",
      ];

      const randomCount = Math.floor(Math.random() * 3); // 0-2 books
      const books = [];

      for (let i = 0; i < randomCount; i++) {
        books.push({
          _id: `book_${i}_${studentId}`,
          ACCNO: `BB/${Math.floor(Math.random() * 9000) + 1000}`,
          TITLENAME: bookTitles[Math.floor(Math.random() * bookTitles.length)],
          bookTitle: bookTitles[Math.floor(Math.random() * bookTitles.length)],
          title: bookTitles[Math.floor(Math.random() * bookTitles.length)],
          issueDate: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
          dueDate: new Date(
            Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
          status: "active",
          author: "Academic Author",
          publisher: "Academic Press",
        });
      }

      return books;
    };

    fetchStudentBooks();
  }, [studentId]);

  // 🔄 Listen for book renewal events to refresh student's borrowed books
  useEffect(() => {
    const handleBookRenewal = (event) => {
      try {
        const { borrowerId, borrowerType, bookId, timestamp } = event.detail;
        console.log("📚 Book renewal event received in StudentBooks:", {
          borrowerId,
          borrowerType,
          bookId,
          timestamp,
        });
        console.log("🔍 Current student ID:", studentId);

        // Check if this renewal is for the current student
        if (borrowerType === "student" && borrowerId === studentId) {
          console.log(
            `🔄 Renewal detected for current student ${studentId}, refreshing books...`
          );
          // Refresh books after a short delay to ensure backend is updated
          setTimeout(() => {
            console.log("⏰ Executing delayed refresh for student books...");
            fetchFreshBorrowedBooks(studentId);
          }, 1000);
        } else {
          console.log(
            `ℹ️ Renewal event for different student (${borrowerId}), ignoring...`
          );
        }
      } catch (error) {
        console.error(
          "❌ Error handling book renewal event in StudentBooks:",
          error
        );
      }
    };

    const handleBookIssue = (event) => {
      try {
        const { borrowerId, borrowerType, bookId, timestamp } = event.detail;
        console.log("📚 Book issue event received in StudentBooks:", {
          borrowerId,
          borrowerType,
          bookId,
          timestamp,
        });

        if (borrowerType === "student" && borrowerId === studentId) {
          console.log(
            `🔄 Book issue detected for current student ${studentId}, refreshing books...`
          );
          setTimeout(() => {
            fetchFreshBorrowedBooks(studentId);
          }, 1000);
        }
      } catch (error) {
        console.error(
          "❌ Error handling book issue event in StudentBooks:",
          error
        );
      }
    };

    const handleBookReturn = (event) => {
      try {
        const { borrowerId, borrowerType, bookId, timestamp } = event.detail;
        console.log("📚 Book return event received in StudentBooks:", {
          borrowerId,
          borrowerType,
          bookId,
          timestamp,
        });

        if (borrowerType === "student" && borrowerId === studentId) {
          console.log(
            `🔄 Book return detected for current student ${studentId}, refreshing books...`
          );
          setTimeout(() => {
            fetchFreshBorrowedBooks(studentId);
          }, 1000);
        }
      } catch (error) {
        console.error(
          "❌ Error handling book return event in StudentBooks:",
          error
        );
      }
    };

    // 🔍 DEBUG: Add test listener to verify events are working
    const testEventListener = (event) => {
      console.log(
        "🚨 TEST: Book event received in StudentBooks:",
        event.type,
        event.detail
      );
    };

    // Add event listeners
    window.addEventListener("bookRenewed", handleBookRenewal);
    window.addEventListener("bookIssued", handleBookIssue);
    window.addEventListener("bookReturned", handleBookReturn);
    window.addEventListener("bookRenewed", testEventListener);
    window.addEventListener("bookIssued", testEventListener);
    window.addEventListener("bookReturned", testEventListener);

    console.log("✅ Book event listeners added for StudentBooks component");

    // Cleanup event listeners
    return () => {
      window.removeEventListener("bookRenewed", handleBookRenewal);
      window.removeEventListener("bookIssued", handleBookIssue);
      window.removeEventListener("bookReturned", handleBookReturn);
      window.removeEventListener("bookRenewed", testEventListener);
      window.removeEventListener("bookIssued", testEventListener);
      window.removeEventListener("bookReturned", testEventListener);
      console.log("🧹 Book event listeners removed for StudentBooks component");
    };
  }, [studentId]);

  // 🔄 Effect to fetch fresh books data immediately after student data is loaded
  useEffect(() => {
    if (studentData?.student?.studentId && !loading) {
      console.log("📚 Student data loaded, fetching fresh borrowed books...");
      setTimeout(() => {
        fetchFreshBorrowedBooks(studentData.student.studentId);
      }, 500);
    }
  }, [studentData?.student?.studentId, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col items-center justify-center w-full">
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
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
          <h2 className="text-2xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!studentData || !studentData.student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
          <h2 className="text-2xl font-bold text-red-700 mb-2">
            Student Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            Could not find the student's information.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 flex flex-col py-12 px-2 md:px-8 z-0 md:ml-72 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {studentData.student.name}
              </h1>
              <div className="text-gray-600">
                <p>Department: {studentData.student.department}</p>
                <p>Semester: {studentData.student.semester}</p>
                <p>Email: {studentData.student.email}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back
            </button>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Borrowed Books
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log("🔍 DEBUG: Current component state:");
                    console.log("📚 StudentData:", studentData);
                    console.log("📖 Books in state:", studentData.books);
                    console.log(
                      "🗂️ LocalStorage viewStudentBooks:",
                      localStorage.getItem("viewStudentBooks")
                    );
                    console.log(
                      "🗂️ LocalStorage viewBookDetails:",
                      localStorage.getItem("viewBookDetails")
                    );

                    // Check specific book 297
                    const book297 = studentData.books.find(
                      (book) => book.ACCNO === "297"
                    );
                    if (book297) {
                      console.log("📚 Book 297 details:", book297);
                      console.log("📅 Book 297 due date:", book297.dueDate);
                    } else {
                      console.log("⚠️ Book 297 not found in current state");
                    }
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                  title="Debug current state"
                >
                  🔍 Debug
                </button>
                <button
                  onClick={() => {
                    console.log("🧪 Testing event dispatch for student books");
                    // Manually dispatch a test event to see if the listener is working
                    window.dispatchEvent(
                      new CustomEvent("bookRenewed", {
                        detail: {
                          borrowerId: studentData.student.studentId,
                          borrowerType: "student",
                          bookId: "297",
                          timestamp: new Date().toISOString(),
                        },
                      })
                    );
                  }}
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded hover:bg-yellow-200 transition-colors flex items-center gap-1"
                  title="Test event system"
                >
                  🧪 Test Event
                </button>
                <button
                  onClick={() => {
                    console.log(
                      "🔄 Manual refresh button clicked for student books"
                    );
                    console.log(
                      "🔍 Student ID:",
                      studentData.student.studentId
                    );
                    console.log(
                      "🔍 Current books before refresh:",
                      studentData.books
                    );
                    fetchFreshBorrowedBooks(studentData.student.studentId);
                  }}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded hover:bg-indigo-200 transition-colors flex items-center gap-1"
                  title="Refresh borrowed books"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={() => {
                    console.log(
                      "🗑️ Force refresh - clearing localStorage and fetching fresh data"
                    );
                    // Clear localStorage to force fresh data fetch
                    localStorage.removeItem("viewStudentBooks");
                    localStorage.removeItem("viewBookDetails");
                    // Force page reload to get completely fresh data
                    window.location.reload();
                  }}
                  className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                  title="Force refresh (clears cache)"
                >
                  🗑️ Force Refresh
                </button>
              </div>
            </div>
            {studentData.books.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No books currently borrowed</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {studentData.books.map((book) => {
                  const status =
                    new Date(book.dueDate) < new Date() && !book.returnDate
                      ? "Overdue"
                      : book.returnDate
                      ? "Returned"
                      : "Active";

                  const statusClass =
                    status === "Overdue"
                      ? "bg-red-100 text-red-800"
                      : status === "Returned"
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800";

                  return (
                    <div
                      key={book._id}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-800">
                            {book.title || book.TITLENAME || book.bookTitle}
                          </h3>
                          <p className="text-sm text-gray-600">
                            ACCNO: {book.ACCNO || "N/A"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-sm ${statusClass}`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Issue Date:</span>{" "}
                          {book.issueDate
                            ? new Date(book.issueDate).toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Due Date:</span>{" "}
                          {book.dueDate
                            ? new Date(book.dueDate).toLocaleDateString()
                            : "N/A"}
                        </div>
                        {book.returnDate && (
                          <div>
                            <span className="font-medium">Return Date:</span>{" "}
                            {new Date(book.returnDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            localStorage.setItem(
                              "viewBookDetails",
                              JSON.stringify({
                                ...book,
                                borrower: studentData.student,
                              })
                            );
                            navigate(
                              "/library/book-details/" +
                                (book.ACCNO || book.bookId || book._id)
                            );
                          }}
                          className="w-full px-3 py-2 bg-indigo-100 text-indigo-700 text-sm rounded-lg hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View Book Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentBooks;
