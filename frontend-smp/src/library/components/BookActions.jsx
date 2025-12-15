"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";

const BookActions = () => {
  const location = useLocation();
  const [activeForm, setActiveForm] = useState("issue");
  const [message, setMessage] = useState("");
  const [selectedDays, setSelectedDays] = useState("");
  const [students, setStudents] = useState([]);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt");
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
    return {
      "Content-Type": "application/json",
    };
  };
  const [formData, setFormData] = useState({
    ACCNO: "",
    bookTitle: "",
    author: "",
    publisher: "",
    isbn: "",
    borrowerType: "student",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    returnDate: new Date().toISOString().split("T")[0],
    btNumber: "",
    studentName: "",
    rollNumber: "",
    studentId: "",
    semester: "",
    course: "",
    employeeId: "",
    firstName: "",
    designation: "",
    dateOfJoining: "",
    department: "",
    email: "",
    phone: "",
    lostDate: new Date().toISOString().split("T")[0],
    lostReason: "",
    replacementCost: "",
    lostRemarks: "",
  });

  const [issuedBooks, setIssuedBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [issuedBookDetails, setIssuedBookDetails] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnBookDetails, setReturnBookDetails] = useState(null);
  const [showRenewSuccessModal, setShowRenewSuccessModal] = useState(false);
  const [renewedBookDetails, setRenewedBookDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({
    ACCNO: "",
    btNumber: "",
    transactionType: "all",
    borrowerType: "all",
    studentId: "",
    employeeId: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  
  // Add debounce for ACCNO input to prevent auto-revert
  const [accnoDebounceTimer, setAccnoDebounceTimer] = useState(null);

  // Handle auto-refresh after new book issue
  useEffect(() => {
    if (
      location.state?.refresh &&
      location.state?.borrowerId &&
      location.state?.borrowerType
    ) {
      // Clear existing data
      setIssuedBooks([]);
      setHistory([]);

      // Fetch new data
      fetchIssuedBooks(location.state.borrowerId, location.state.borrowerType);
      const lastIssuedBook = localStorage.getItem("lastIssuedBook");
      if (lastIssuedBook) {
        try {
          const book = JSON.parse(lastIssuedBook);
          setHistory((prev) => [book, ...prev]);
        } catch (err) {
          console.error("Error parsing last issued book:", err);
        }
      }

      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Load pre-filled data from location state or localStorage when component mounts
  useEffect(() => {
    // First check if we have borrower data in location state
    if (location.state?.borrower) {
      const borrowerData = location.state.borrower;

      if (borrowerData.type === "student") {
        setFormData((prev) => ({
          ...prev,
          borrowerType: "student",
          btNumber: borrowerData.studentId || "",
          studentId: borrowerData.studentId || "",
          studentName: borrowerData.name || "",
          rollNumber:
            borrowerData.enrollmentNumber || borrowerData.studentId || "",
          department: borrowerData.department || "",
          semester: borrowerData.semester?.toString() || "",
          course: borrowerData.course || borrowerData.stream || "",
          email: borrowerData.email || "",
          phone: borrowerData.phone || "",
        }));

        // Fetch issued books for this student
        if (borrowerData.studentId) {
          fetchIssuedBooks(borrowerData.studentId, "student");
        }
      } else if (borrowerData.type === "faculty") {
        setFormData((prev) => ({
          ...prev,
          borrowerType: "faculty",
          employeeId: borrowerData.employeeId || "",
          firstName: borrowerData.name || "",
          department: borrowerData.department || "",
          designation: borrowerData.designation || "",
          email: borrowerData.email || "",
          phone: borrowerData.phone || "",
        }));

        // Fetch issued books for this faculty
        if (borrowerData.employeeId) {
          fetchIssuedBooks(borrowerData.employeeId, "faculty");
        }
      }

      // Clear the location state to avoid issues on refresh
      window.history.replaceState({}, document.title);
    }
    // Fallback to localStorage if no data in location state
    else {
      const selectedBorrower = localStorage.getItem("selectedBorrower");
      if (selectedBorrower) {
        try {
          const borrowerData = JSON.parse(selectedBorrower);

          if (borrowerData.type === "student") {
            setFormData((prev) => ({
              ...prev,
              borrowerType: "student",
              btNumber: borrowerData.studentId || "",
              studentId: borrowerData.studentId || "",
              studentName: borrowerData.name || "",
              rollNumber:
                borrowerData.enrollmentNumber || borrowerData.studentId || "",
              department: borrowerData.department || "",
              semester: borrowerData.semester?.toString() || "",
              course: borrowerData.course || borrowerData.stream || "",
              email: borrowerData.email || "",
              phone: borrowerData.phone || "",
            }));

            // Fetch issued books for this student
            if (borrowerData.studentId) {
              fetchIssuedBooks(borrowerData.studentId, "student");
            }
          } else if (borrowerData.type === "faculty") {
            setFormData((prev) => ({
              ...prev,
              borrowerType: "faculty",
              employeeId: borrowerData.employeeId || "",
              firstName: borrowerData.name || "",
              department: borrowerData.department || "",
              designation: borrowerData.designation || "",
              email: borrowerData.email || "",
              phone: borrowerData.phone || "",
            }));

            // Fetch issued books for this faculty
            if (borrowerData.employeeId) {
              fetchIssuedBooks(borrowerData.employeeId, "faculty");
            }
          }

          // Clear the localStorage after using it
          localStorage.removeItem("selectedBorrower");
        } catch (err) {
          console.error("Error parsing selectedBorrower data:", err);
        }
      }
    }
  }, [location.state]);

  const handleDaysChange = (e) => {
    const days = e.target.value;
    setSelectedDays(days);
    if (days) {
      const issueDate = new Date();
      const dueDate = new Date(
        issueDate.getTime() + Number.parseInt(days) * 24 * 60 * 60 * 1000
      );
      setFormData((prev) => ({
        ...prev,
        dueDate: dueDate.toISOString().split("T")[0],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        dueDate: "",
      }));
    }
  };

  // Clear success messages when switching tabs
  const handleTabChange = (tab) => {
    setActiveForm(tab);
    setSuccess("");
    setError("");
    setShowSuccessModal(false);
    setShowReturnModal(false);
    setIssuedBookDetails(null);
    setReturnBookDetails(null);
  };

  const fetchBorrowerDetails = async (id, type) => {
    try {
      setLoading(true);
      setError("");

      if (!id) {
        setError("Please enter a valid ID");
        setLoading(false);
        return;
      }

      if (type === "faculty") {
        const response = await axios.get(
          "http://localhost:4000/api/faculty/faculties",
          { headers: getAuthHeaders() }
        );
        const facultyMember = response.data.find((f) => f.employeeId === id);

        if (facultyMember) {
          setFormData((prev) => ({
            ...prev,
            firstName: facultyMember.name || facultyMember.NAME || "",
            department: facultyMember.department || "",
            designation: facultyMember.designation || "",
            email: facultyMember.email || "",
            phone: facultyMember.mobile || "",
            employmentStatus: facultyMember.employmentStatus || "",
            dateOfJoining: facultyMember.dateOfJoining || "",
          }));
        } else {
          setError("Faculty member not found");
          setFormData((prev) => ({
            ...prev,
            firstName: "",
            department: "",
            designation: "",
            email: "",
            phone: "",
            employmentStatus: "",
            dateOfJoining: "",
          }));
        }
      } else {
        try {
          if (!id || typeof id !== "string" || id.trim().length === 0) {
            throw new Error("Please enter a valid student ID");
          }

          const studentId = id.trim();

          try {
            const response = await axios.get(
              `http://localhost:4000/api/students/enrollment/${encodeURIComponent(
                studentId
              )}`,
              { headers: getAuthHeaders() }
            );

            if (response.data) {
              const studentData = response.data;

              if (!studentData.studentId || !studentData._id) {
                throw new Error("Student ID not found in response");
              }

              const fullName = [
                studentData.firstName,
                studentData.middleName,
                studentData.lastName,
              ]
                .filter(Boolean)
                .join(" ");

              const departmentName = studentData.department?.name || "";
              const streamName = studentData.stream?.name || "";
              const semesterNumber = studentData.semester?.number || "";
              const formattedAdmissionDate = studentData.admissionDate
                ? new Date(studentData.admissionDate).toLocaleDateString()
                : "";

              const updatedFormData = {
                ...formData,
                studentName: fullName || "",
                rollNumber: studentData.enrollmentNumber || "",
                studentId: studentData.studentId || "",
                department: departmentName,
                semester: semesterNumber,
                course: streamName,
                email: studentData.email || "",
                phone: studentData.mobileNumber || "",
                gender: studentData.gender || "",
                admissionType: studentData.admissionType || "",
                admissionDate: formattedAdmissionDate,
                section: studentData.section || "",
                casteCategory: studentData.casteCategory || "",
                subCaste: studentData.subCaste || "",
                fatherName: studentData.fatherName || "",
                motherName: studentData.motherName || "",
                admissionThrough: studentData.admissionThrough || "",
                remark: studentData.remark || "",
                unicodeName: studentData.unicodeName || "",
                unicodeFatherName: studentData.unicodeFatherName || "",
                unicodeMotherName: studentData.unicodeMotherName || "",
                isActive: studentData.isActive || false,
                backlogs: studentData.backlogs || [],
                subjects: studentData.subjects || [],
                semesterRecords: studentData.semesterRecords || [],
              };

              setFormData(updatedFormData);

              if (studentData.studentId) {
                fetchIssuedBooks(studentData.studentId, "student");
              }
            }
          } catch (err) {
            if (err.response && err.response.status === 404) {
              console.error("Student not found:", studentId);
              setError(
                `Student with ID "${studentId}" not found. Please check the ID and try again.`
              );
            } else {
              console.error("Error fetching student details:", err);
              setError("Error fetching student details. Please try again.");
            }

            setFormData((prev) => ({
              ...prev,
              studentName: "",
              rollNumber: "",
              studentId: "",
              department: "",
              semester: "",
              course: "",
              email: "",
              phone: "",
              gender: "",
              admissionType: "",
              admissionDate: "",
              section: "",
              casteCategory: "",
              subCaste: "",
              fatherName: "",
              motherName: "",
              admissionThrough: "",
              remark: "",
              unicodeName: "",
              unicodeFatherName: "",
              unicodeMotherName: "",
              isActive: false,
              backlogs: [],
              subjects: [],
              semesterRecords: [],
            }));
          }
        } catch (err) {
          console.error("Error in student fetch process:", err);
          setError(
            err.message || "Error fetching student details. Please try again."
          );
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching borrower details:", err);
      setError("Error fetching borrower details");
      setLoading(false);
    }
  };

  const fetchBookDetails = async (accno) => {
    try {
      if (!accno || accno.trim() === "") {
        setError("Please enter a valid ACCNO");
        return;
      }

      setLoading(true);

      // Try multiple possible endpoints for fetching book details
      let bookData = null;

      try {
        // First try the accno endpoint
        const response = await axios.get(
          `http://localhost:4000/api/books/accno/${accno}`,
          { headers: getAuthHeaders() }
        );
        bookData = response.data;

        // Verify the ACCNO matches exactly
        if (bookData && String(bookData.ACCNO) !== String(accno)) {
          bookData = null;
        }
      } catch (err) {
        try {
          // Try alternative endpoint
          const response = await axios.get(`http://localhost:4000/api/books/${accno}`);
          bookData = response.data;

          // Verify the ACCNO matches exactly
          if (bookData && String(bookData.ACCNO) !== String(accno)) {
            bookData = null;
          }
        } catch (err2) {
          try {
            // Try search endpoint
            const response = await axios.get(
              `http://localhost:4000/api/books?search=${encodeURIComponent(
                accno
              )}`
            );
            const books =
              response.data.data || response.data.books || response.data;
              if (Array.isArray(books) && books.length > 0) {
              // Find exact ACCNO match only (compare as strings to avoid type mismatch)
              bookData = books.find((book) => String(book.ACCNO) === String(accno));
              if (bookData) {
              } else {
              }
            } else {
              throw new Error("No books found");
            }
          } catch (err3) {
            try {
              // Last attempt - get all books and filter
              const response = await axios.get(`http://localhost:4000/api/books`);
              const allBooks =
                response.data.data || response.data.books || response.data;
              if (Array.isArray(allBooks)) {
                bookData = allBooks.find((book) => String(book.ACCNO) === String(accno));
                if (bookData) {
                } else {
                }
              }
            } catch (err4) {}
          }
        }
      }

      // Only proceed if we have book data with matching ACCNO
      if (bookData && String(bookData.ACCNO) === String(accno)) {
        const issueDate = new Date().toISOString().split("T")[0];

        setFormData((prev) => ({
          ...prev,
          ACCNO: accno, // Always preserve user input
          isbn: accno, // Always preserve user input
          bookTitle: bookData.TITLENAME || bookData.title || "",
          author: bookData.AUTHOR || bookData.author || "",
          publisher: bookData["PUBLISHER NAME"] || bookData.publisher || "",
          SERIESCODE: bookData.SERIESCODE || "",
          CLASSNO: bookData.CLASSNO || "",
          "PUB.YEAR": bookData["PUB.YEAR"] || "",
          PAGES: bookData.PAGES || "",
          PRINTPRICE: bookData.PRINTPRICE || "",
          PURPRICE: bookData.PURPRICE || "",
          shelf: bookData.shelf || "",
          category: bookData.category || "",
          status: bookData.STATUS || bookData.status || "available",
          ACCDATE: bookData.ACCDATE || "",
          CITY: bookData.CITY || "",
          "VENDER CITY": bookData["VENDER CITY"] || "",
          INVOICENO: bookData.INVOICENO || "",
          INVOICE_DATE: bookData.INVOICE_DATE || "",
          "SUBJECT NAME": bookData["SUBJECT NAME"] || "",
          REFCIR: bookData.REFCIR || "",
          materialType: bookData.materialType || "book",
          QUANTITY: bookData.QUANTITY || 1,
          section: bookData.section || "",
          vendor: bookData.vendor || "",
          purchaseDate: bookData.purchaseDate || "",
          invoiceNumber: bookData.invoiceNumber || "",
          price: bookData.price || bookData.PRINTPRICE || "",
          paymentMethod: bookData.paymentMethod || "",
          paymentStatus: bookData.paymentStatus || "",
          issueDate,
          replacementCost: bookData.PURPRICE || bookData.PRINTPRICE || "",
        }));

        const formFields = document.querySelectorAll(
          'input:not([name="ACCNO"])'
        );
        formFields.forEach((field) => {
          field.setAttribute("readonly", true);
        });

        setError("");
        setSuccess("Book details loaded successfully!");
      } else {
        // Book not found after all attempts
        const issueDate = new Date().toISOString().split("T")[0];

        setFormData((prev) => ({
          ...prev,
          ACCNO: accno,
          isbn: accno,
          bookTitle: "",
          author: "",
          publisher: "",
          shelf: "",
          category: "",
          SERIESCODE: "",
          CLASSNO: "",
          "PUB.YEAR": "",
          PAGES: "",
          PRINTPRICE: "",
          PURPRICE: "",
          ACCDATE: "",
          CITY: "",
          "VENDER CITY": "",
          INVOICENO: "",
          INVOICE_DATE: "",
          "SUBJECT NAME": "",
          REFCIR: "",
          materialType: "book",
          QUANTITY: 1,
          section: "",
          vendor: "",
          purchaseDate: "",
          invoiceNumber: "",
          price: "",
          paymentMethod: "",
          paymentStatus: "",
          issueDate,
          replacementCost: "",
        }));

        setError(
          `Book with ACCNO ${accno} not found in database. Please fill in the book details to add it.`
        );

        const formFields = document.querySelectorAll("input[readonly]");
        formFields.forEach((field) => {
          field.removeAttribute("readonly");
        });
      }
    } catch (err) {
      console.error("Error in fetchBookDetails:", err);
      setError(
        "Failed to connect to the server. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveNewBook = async () => {
    try {
      setLoading(true);
      setError("");

      if (!formData.ACCNO || !formData.bookTitle) {
        setError("ACCNO and Title are required");
        setLoading(false);
        return;
      }

      const bookData = {
        ACCNO: formData.ACCNO,
        TITLENAME: formData.bookTitle,
        AUTHOR: formData.author,
        "PUBLISHER NAME": formData.publisher,
        SERIESCODE: formData.SERIESCODE,
        CLASSNO: formData.CLASSNO,
        "PUB.YEAR": formData["PUB.YEAR"],
        PAGES: formData.PAGES,
        PRINTPRICE: formData.PRINTPRICE,
        PURPRICE: formData.PURPRICE,
        ACCDATE: formData.ACCDATE,
        CITY: formData.CITY,
        "VENDER CITY": formData["VENDER CITY"],
        INVOICENO: formData.INVOICENO,
        INVOICE_DATE: formData.INVOICE_DATE,
        "SUBJECT NAME": formData["SUBJECT NAME"],
        REFCIR: formData.REFCIR,
        status: "available",
        QUANTITY: 1,
        materialType: "book",
      };

      const response = await axios.post(
        "http://localhost:4000/api/books",
        bookData
      );

      if (response.data) {
        // Immediately update status and quantity in backend if not set
        try {
          await axios.patch(
            `hhttp://localhost:4000/api/books/accno/${formData.ACCNO}`,
            {
              status: "available",
              QUANTITY: 1,
            }
          );
        } catch (patchErr) {
          console.warn(
            "Could not patch book status/quantity after creation",
            patchErr
          );
        }
        setSuccess("Book added successfully!");
        const formFields = document.querySelectorAll(
          'input:not([name="ACCNO"])'
        );
        formFields.forEach((field) => {
          field.setAttribute("readonly", true);
        });

        setFormData((prev) => ({
          ...prev,
          ...bookData,
        }));
      }
    } catch (err) {
      console.error("Error saving book:", err);
      if (err.response?.data?.message?.includes("duplicate key")) {
        setError(
          "A book with this ACCNO already exists. Please use a different ACCNO."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Failed to save book. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLostBookSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!formData.ACCNO || !formData.bookTitle) {
        setError("Book details (ACCNO and Title) are required");
        setLoading(false);
        return;
      }

      if (!formData.lostDate) {
        setError("Lost date is required");
        setLoading(false);
        return;
      }

      if (!formData.lostReason) {
        setError("Lost reason is required");
        setLoading(false);
        return;
      }

      // Add borrower validation for lost book
      const borrowerId =
        formData.borrowerType === "student"
          ? formData.studentId
          : formData.employeeId;
      if (!borrowerId) {
        setError(
          `${
            formData.borrowerType === "student" ? "Student ID" : "Employee ID"
          } is required to record who lost the book`
        );
        setLoading(false);
        return;
      }

      // Prepare lost book data with borrower information
      const lostBookData = {
        bookId: formData.ACCNO,
        bookTitle: formData.bookTitle,
        author: formData.author,
        publisher: formData.publisher,
        SERIESCODE: formData.SERIESCODE,
        lostDate: formData.lostDate,
        lostReason: formData.lostReason,
        replacementCost: formData.replacementCost || "0",
        lostRemarks: formData.lostRemarks || "",
        status: "lost",
        transactionType: "lost",
        borrowerType: formData.borrowerType,
        // Add borrower-specific fields
        ...(formData.borrowerType === "student"
          ? {
              studentId: formData.studentId,
              studentName: formData.studentName,
              department: formData.department,
              course: formData.course,
              semester: formData.semester,
              borrowerId: formData.studentId,
            }
          : {
              employeeId: formData.employeeId,
              facultyName: formData.firstName,
              department: formData.department,
              designation: formData.designation,
              borrowerId: formData.employeeId,
            }),
        email: formData.email,
        phone: formData.phone,
        dueDate: new Date(), // Setting current date as due date for lost books
      };

      const response = await axios.post(
        "http://localhost:4000/api/issues/lost",
        lostBookData
      );

      if (response.data.success) {
        setSuccess("Lost book entry recorded successfully!");

        // 🔄 IMPORTANT: Notify parent components about the lost book
        // This ensures accurate book counts and proper state management
        if (window.dispatchEvent) {
          const borrowerId =
            formData.borrowerType === "student"
              ? formData.studentId
              : formData.employeeId;
          window.dispatchEvent(
            new CustomEvent("bookLost", {
              detail: {
                borrowerId: borrowerId,
                borrowerType: formData.borrowerType,
                bookId: formData.ACCNO,
                timestamp: new Date().toISOString(),
              },
            })
          );
        }

        // Clear form data
        if (formData.borrowerType === "student") {
          setFormData((prev) => ({
            ...prev,
            ACCNO: "",
            bookTitle: "",
            author: "",
            publisher: "",
            isbn: "",
            SERIESCODE: "",
            studentId: "",
            studentName: "",
            department: "",
            course: "",
            semester: "",
            email: "",
            phone: "",
            lostDate: new Date().toISOString().split("T")[0],
            lostReason: "",
            replacementCost: "",
            lostRemarks: "",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            ACCNO: "",
            bookTitle: "",
            author: "",
            publisher: "",
            isbn: "",
            SERIESCODE: "",
            employeeId: "",
            firstName: "",
            department: "",
            designation: "",
            email: "",
            phone: "",
            lostDate: new Date().toISOString().split("T")[0],
            lostReason: "",
            replacementCost: "",
            lostRemarks: "",
          }));
        }

        // Refresh history to show the new lost record
        fetchHistory();
      } else {
        setError(response.data.message || "Failed to record lost book entry");
      }
    } catch (err) {
      console.error("Error recording lost book:", err);
      if (err.response) {
        console.error("Error response:", err.response.data);
        setError(
          err.response.data.message || "Failed to record lost book entry"
        );
      } else {
        setError(
          "Failed to record lost book entry. Please check your connection."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const borrowerId =
        formData.borrowerType === "student"
          ? formData.studentId
          : formData.employeeId;

      // Check how many books are already issued to this borrower (use correct endpoint)
      try {
        const borrowerResponse = await axios.get(
          `http://localhost:4000/api/issues/borrowed-books?borrowerId=${borrowerId}&borrowerType=${formData.borrowerType}`
        );

        // The backend should return an array of issued books in .data or .borrowedBooks
        const issuedBooks =
          borrowerResponse.data.data ||
          borrowerResponse.data.borrowedBooks ||
          [];
        if (issuedBooks.length >= 2) {
          setError(
            `${
              formData.borrowerType === "student" ? "Student" : "Faculty"
            } already has 2 books issued. Please return a book before issuing a new one.`
          );
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking issued books:", err);
        // Only ignore 404 (no books issued), treat other errors as real
        if (err.response && err.response.status !== 404) {
          setError(
            err.response?.data?.message || "Error checking issued books"
          );
          setLoading(false);
          return;
        }
      }

      if (!formData.ACCNO || !formData.bookTitle) {
        setError("Book details (ACCNO and Title) are required");
        setLoading(false);
        return;
      }

      if (formData.borrowerType === "student" && !formData.studentId) {
        setError("Student ID is required");
        setLoading(false);
        return;
      }

      if (formData.borrowerType === "faculty" && !formData.employeeId) {
        setError("Employee ID is required");
        setLoading(false);
        return;
      }

      if (!formData.dueDate) {
        setError("Please select the number of days to set the due date");
        setLoading(false);
        return;
      }

      // Prepare issueData based on borrower type
      let issueData;

      if (formData.borrowerType === "student") {
        issueData = {
          ACCNO: formData.ACCNO,
          bookTitle: formData.bookTitle,
          author: formData.author,
          publisher: formData.publisher,
          isbn: formData.isbn,
          borrowerType: "student",
          studentId: formData.studentId,
          studentName: formData.studentName,
          department: formData.department,
          course: formData.course,
          semester: formData.semester,
          email: formData.email,
          phone: formData.phone,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          borrowerId: formData.studentId, // Add explicit borrowerId for student
        };
      } else {
        // Faculty issue data
        issueData = {
          ACCNO: formData.ACCNO,
          bookTitle: formData.bookTitle,
          author: formData.author,
          publisher: formData.publisher,
          isbn: formData.isbn,
          borrowerType: "faculty",
          employeeId: formData.employeeId,
          facultyName: formData.firstName,
          department: formData.department,
          designation: formData.designation,
          email: formData.email,
          phone: formData.phone,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          borrowerId: formData.employeeId, // Add explicit borrowerId for faculty
        };
      }

      // Use the issues endpoint instead of books endpoint
      const issueResponse = await axios.post(
        "http://localhost:4000/api/issues/issue",
        issueData
      );

      if (issueResponse.data.success) {
        setSuccess("Book issued successfully!");

        // Store issued book details for modal
        setIssuedBookDetails({
          ACCNO: formData.ACCNO,
          bookTitle: formData.bookTitle,
          author: formData.author,
          publisher: formData.publisher,
          borrowerName:
            formData.borrowerType === "student"
              ? formData.studentName
              : formData.firstName,
          borrowerId: borrowerId,
          borrowerType: formData.borrowerType,
          department: formData.department,
          course: formData.course,
          semester: formData.semester,
          designation: formData.designation,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          email: formData.email,
          phone: formData.phone,
        });

        // Show success modal
        setShowSuccessModal(true);

        // 🔄 IMPORTANT: Notify parent components about the book issue
        // This prevents cross-contamination and ensures accurate book counts
        if (window.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent("bookIssued", {
              detail: {
                borrowerId: borrowerId,
                borrowerType: formData.borrowerType,
                bookId: formData.ACCNO,
                timestamp: new Date().toISOString(),
              },
            })
          );
        }

        // Clear form data based on borrower type
        if (formData.borrowerType === "student") {
          setFormData((prev) => ({
            ...prev,
            ACCNO: "",
            bookTitle: "",
            author: "",
            publisher: "",
            isbn: "",
            studentId: "",
            studentName: "",
            rollNumber: "",
            department: "",
            course: "",
            semester: "",
            email: "",
            phone: "",
            issueDate: new Date().toISOString().split("T")[0],
            dueDate: "",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            ACCNO: "",
            bookTitle: "",
            author: "",
            publisher: "",
            isbn: "",
            employeeId: "",
            firstName: "",
            department: "",
            designation: "",
            email: "",
            phone: "",
            issueDate: new Date().toISOString().split("T")[0],
            dueDate: "",
          }));
        }
        setSelectedDays("");
      } else {
        setError(issueResponse.data.message || "Failed to issue book");
      }
    } catch (err) {
      console.error("Error issuing book:", err);
      if (err.response) {
        console.error("Error response:", err.response.data);
        console.error("Error status:", err.response.status);
        console.error("Error headers:", err.response.headers);
        if (err.response.status === 404) {
          setError(
            "Book issue service not found. Please check the server configuration."
          );
        } else if (err.response.status === 400) {
          setError(
            err.response.data.message ||
              "Invalid request data. Please check all required fields."
          );
        } else {
          setError(err.response.data.message || "Failed to issue book");
        }
      } else if (err.request) {
        console.error("Error request:", err.request);
        setError(
          "No response received from server. Please check your connection."
        );
      } else if (err.message) {
        console.error("Error message:", err.message);
        setError(err.message);
      } else {
        setError("Failed to issue book. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubmit = async () => {
    try {
      const borrowerId =
        formData.borrowerType === "student"
          ? formData.studentId
          : formData.employeeId;

      if (!selectedBookId) {
        setError("Please select a book to renew");
        return;
      }

      if (!borrowerId) {
        setError(
          `Please enter ${
            formData.borrowerType === "student" ? "Student ID" : "Employee ID"
          }`
        );
        return;
      }

      if (!formData.newDueDate) {
        setError("Please select a new due date");
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");

      const response = await axios.post(
        "http://localhost:4000/api/issues/renew",
        {
          bookId: selectedBookId,
          borrowerId,
          borrowerType: formData.borrowerType,
          newReturnDate: formData.newDueDate,
        }
      );

      if (response.data.success) {
        // Find the renewed book details
        const renewedBook = issuedBooks.find(
          (book) => String(book.ACCNO) === String(selectedBookId)
        );

        // Set renewed book details for the modal
        setRenewedBookDetails({
          ACCNO: renewedBook?.ACCNO || selectedBookId,
          bookTitle:
            renewedBook?.bookTitle || renewedBook?.title || "Unknown Title",
          author: renewedBook?.author || "Unknown Author",
          publisher: renewedBook?.publisher || "Unknown Publisher",
          borrowerName:
            formData.borrowerType === "student"
              ? formData.studentName
              : formData.firstName,
          borrowerId:
            formData.borrowerType === "student"
              ? formData.studentId
              : formData.employeeId,
          borrowerType: formData.borrowerType,
          department: formData.department,
          course: formData.course,
          semester: formData.semester,
          designation: formData.designation,
          email: formData.email,
          phone: formData.phone,
          oldDueDate: renewedBook?.dueDate || "Unknown",
          newDueDate: formData.newDueDate,
          renewCount: (renewedBook?.renewCount || 0) + 1,
        });

        // Update the renewed book in the current issued books list to reflect new due date
        setIssuedBooks(prevBooks => 
          prevBooks.map(book => {
            if (String(book.ACCNO) === String(selectedBookId)) {
              return {
                ...book,
                dueDate: formData.newDueDate,
                renewCount: (book.renewCount || 0) + 1,
                transactionType: 'renew',
                issueDate: new Date().toISOString().split('T')[0], // Update to renewal date
                status: 'active'
              };
            }
            return book;
          })
        );

        setSuccess("Book renewed successfully!");
        setShowRenewSuccessModal(true);

        // Refresh issued books for the current borrower with force refresh
        await fetchIssuedBooks(borrowerId, formData.borrowerType);

        // Also refresh student data if it exists in localStorage
        try {
          const savedStudents = localStorage.getItem('studentSearchResults');
          if (savedStudents) {
            const students = JSON.parse(savedStudents);
            const updatedStudents = students.map(student => {
              if (student.studentId === borrowerId && formData.borrowerType === 'student') {
                // Force refresh this student's issued books
                fetchIssuedBooks(student.studentId, 'student');
              }
              return student;
            });
            localStorage.setItem('studentSearchResults', JSON.stringify(updatedStudents));
          }
        } catch (e) {
          console.warn('Could not update localStorage:', e);
        }

        // Clear form fields
        setSelectedBookId("");
        setFormData((prev) => ({
          ...prev,
          newDueDate: "",
        }));

        // 🔄 IMPORTANT: Notify parent components about the renewal
        // This prevents cross-contamination between different students
        // Dispatch event AFTER all processing is complete
        setTimeout(() => {
          if (window.dispatchEvent) {
            window.dispatchEvent(
              new CustomEvent("bookRenewed", {
                detail: {
                  borrowerId: borrowerId,
                  borrowerType: formData.borrowerType,
                  bookId: selectedBookId,
                  newDueDate: formData.newDueDate,
                  timestamp: new Date().toISOString(),
                },
              })
            );
          }
          
          // Also dispatch a more generic refresh event for student lists
          window.dispatchEvent(
            new CustomEvent("refreshStudentData", {
              detail: {
                borrowerId: borrowerId,
                borrowerType: formData.borrowerType,
                action: 'renew',
                timestamp: new Date().toISOString(),
              },
            })
          );
        }, 100); // Small delay to ensure all processing is complete
      } else {
        setError(response.data.message || "Failed to renew book");
      }
    } catch (err) {
      console.error("Error renewing book:", err);
      if (err.response) {
        console.error("Error response:", err.response.data);
        setError(err.response.data.message || "Failed to renew book");
      } else {
        setError("Failed to renew book. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIssuedBooks = async (borrowerId, borrowerType) => {
    // If no specific borrowerId provided, use the current form data
    if (!borrowerId && !borrowerType) {
      borrowerId =
        formData.borrowerType === "student"
          ? formData.studentId
          : formData.employeeId;
      borrowerType = formData.borrowerType;
    }

    if (!borrowerId || !borrowerType || !borrowerId.trim()) {
      setIssuedBooks([]);
      return;
    }

    try {
      // Clear existing books first
      setIssuedBooks([]);

      // Make real API call to fetch borrowed books - include all statuses
      const response = await axios.get(
        `http://localhost:4000/api/issues/borrowed-books`,
        {
          params: {
            borrowerId: borrowerId.trim(),
            borrowerType: borrowerType,
            includeRenewed: true, // Explicitly include renewed books
            status: "all", // Get all active books regardless of status
            _t: Date.now(), // Cache buster for fresh data
          },
        }
      );

      // Extract books from response - handle different response structures
      let books = [];
      if (response.data.success && response.data.data) {
        books = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (response.data.borrowedBooks) {
        books = Array.isArray(response.data.borrowedBooks)
          ? response.data.borrowedBooks
          : [];
      } else if (Array.isArray(response.data)) {
        books = response.data;
      }

      // If we got fewer books than expected, try to get from history API as well
      if (books.length < 2) {
        try {
          const historyParams =
            borrowerType === "student"
              ? { studentId: borrowerId, borrowerType: borrowerType, limit: 50 }
              : {
                  employeeId: borrowerId,
                  borrowerType: borrowerType,
                  limit: 50,
                };

          const historyResponse = await axios.get(
            `http://localhost:4000/api/issues/history`,
            {
              params: historyParams,
            }
          );

          if (
            historyResponse.data.success &&
            historyResponse.data.data.records
          ) {
            const allTransactions = historyResponse.data.data.records;

            // Group transactions by book ID to find the latest state of each book
            const bookMap = new Map();

            // First add existing books to the map
            books.forEach((book) => {
              const bookId = book.ACCNO || book.bookId;
              bookMap.set(bookId, {
                ...book,
                source: "borrowed-books",
              });
            });

            // Process all history transactions - but ONLY for the specific borrower
            allTransactions.forEach((transaction) => {
              // 🔒 STRICT VALIDATION: Only include transactions for the exact borrower
              const transactionBorrowerId =
                borrowerType === "student"
                  ? transaction.studentId
                  : transaction.employeeId;

              if (transactionBorrowerId !== borrowerId) {
                return; // Skip this transaction
              }

              const bookId = transaction.bookId || transaction.ACCNO;

              // Only process if this transaction is more recent than what we have
              if (
                !bookMap.has(bookId) ||
                new Date(transaction.createdAt) >
                  new Date(bookMap.get(bookId).createdAt || 0)
              ) {
                bookMap.set(bookId, {
                  ...transaction,
                  ACCNO: bookId,
                  bookTitle: transaction.bookTitle,
                  author: transaction.author,
                  publisher: transaction.publisher,
                  source: "history",
                });
              }
            });

            // Filter to only include books that are currently active (not returned)
            const activeBooks = [];
            bookMap.forEach((latestTransaction, bookId) => {
              if (
                latestTransaction.transactionType !== "return" &&
                latestTransaction.status === "active"
              ) {
                activeBooks.push(latestTransaction);
              }
            });

            books = activeBooks;
          }
        } catch (historyError) {
          console.warn("Could not fetch from history:", historyError);
        }
      }

      // Debug: Log book statuses and details

      // Update state with real borrowed books
      setIssuedBooks(books);

      // Clear any previous errors since this is expected behavior
      setError("");
    } catch (err) {
      // Only log 404 errors as info since no books issued is expected

      setIssuedBooks([]);
      setError("");
    }
  };

  // ✅ Then, loop over students
  useEffect(() => {
    students.forEach((student) => {
      if (student.studentId) {
        fetchIssuedBooks(student.studentId);
      }
    });
  }, [students]);

  // ✅ Auto-fetch books when borrower details change
  useEffect(() => {
    if (activeForm === "return" || activeForm === "renew") {
      const borrowerId =
        formData.borrowerType === "student"
          ? formData.studentId
          : formData.employeeId;

      if (borrowerId && borrowerId.trim() && formData.borrowerType) {
        fetchIssuedBooks(borrowerId.trim(), formData.borrowerType);
      } else {
        setIssuedBooks([]); // Clear books if no borrower selected
        setSelectedBookId("");
      }
    }
  }, [
    formData.borrowerType,
    formData.studentId,
    formData.employeeId,
    activeForm,
  ]);

  // ✅ Auto-sync history filters with current borrower selection
  useEffect(() => {
    if (activeForm === "history") {
      setFilters((prev) => ({
        ...prev,
        borrowerType: formData.borrowerType,
        studentId:
          formData.borrowerType === "student" ? formData.studentId : "",
        employeeId:
          formData.borrowerType === "faculty" ? formData.employeeId : "",
      }));
    }
  }, [
    formData.borrowerType,
    formData.studentId,
    formData.employeeId,
    activeForm,
  ]);

  // ✅ Listen for renewal events to refresh data
  useEffect(() => {
    const handleBookRenewed = (event) => {
      const { borrowerId, borrowerType, bookId, newDueDate } = event.detail;
      
      // If this matches current borrower, refresh the books
      const currentBorrowerId = formData.borrowerType === 'student' ? formData.studentId : formData.employeeId;
      if (borrowerId === currentBorrowerId && borrowerType === formData.borrowerType) {
        setTimeout(() => {
          fetchIssuedBooks(borrowerId, borrowerType);
        }, 500); // Allow backend time to process
      }
    };

    const handleRefreshStudentData = (event) => {
      const { borrowerId, borrowerType } = event.detail;
      
      // Force refresh for any affected students
      if (borrowerType === 'student') {
        setTimeout(() => {
          fetchIssuedBooks(borrowerId, borrowerType);
        }, 300);
      }
    };

    window.addEventListener('bookRenewed', handleBookRenewed);
    window.addEventListener('refreshStudentData', handleRefreshStudentData);

    return () => {
      window.removeEventListener('bookRenewed', handleBookRenewed);
      window.removeEventListener('refreshStudentData', handleRefreshStudentData);
      
      // Clean up ACCNO debounce timer
      if (accnoDebounceTimer) {
        clearTimeout(accnoDebounceTimer);
      }
    };
  }, [formData.borrowerType, formData.studentId, formData.employeeId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (filters.ACCNO) {
        params.append("bookId", filters.ACCNO);
      }

      // Auto-apply borrower type filter based on current form selection
      const currentBorrowerType =
        filters.borrowerType !== "all"
          ? filters.borrowerType
          : formData.borrowerType;

      if (
        currentBorrowerType === "student" &&
        (filters.studentId || formData.studentId)
      ) {
        params.append("studentId", filters.studentId || formData.studentId);
        params.append("borrowerType", "student");
      } else if (
        currentBorrowerType === "faculty" &&
        (filters.employeeId || formData.employeeId)
      ) {
        params.append("employeeId", filters.employeeId || formData.employeeId);
        params.append("borrowerType", "faculty");
      } else if (currentBorrowerType && currentBorrowerType !== "all") {
        params.append("borrowerType", currentBorrowerType);
      }

      if (filters.transactionType !== "all") {
        params.append("transactionType", filters.transactionType);
      }

      const response = await axios.get(
        `http://localhost:4000/api/issues/history?${params}`
      );

      if (response.data.data.records.length === 0) {
        let specificError = "No transaction history found";
        if (filters.studentId && filters.borrowerType === "student") {
          try {
            await axios.get(
              `http://localhost:4000/api/students/enrollment/${encodeURIComponent(
                filters.studentId
              )}`,
              { headers: getAuthHeaders() }
            );
          } catch (err) {
            if (err.response?.status === 404) {
              specificError = `Student with ID ${filters.studentId} not found.`;
            }
          }
        }
        if (filters.employeeId && filters.borrowerType === "faculty") {
          try {
            const response = await axios.get(
              "http://localhost:4000/api/faculty/faculties",
              { headers: getAuthHeaders() }
            );
            const facultyMember = response.data.find(
              (f) => f.employeeId === filters.employeeId
            );
            if (!facultyMember) {
              specificError = `Faculty member with ID ${filters.employeeId} not found.`;
            }
          } catch (err) {
            if (err.response?.status === 404) {
              specificError = `Faculty member with ID ${filters.employeeId} not found.`;
            }
          }
        }
        if (filters.ACCNO) {
          try {
            await axios.get(`http://localhost:4000/api/books/accno/${filters.ACCNO}`);
          } catch (err) {
            if (err.response?.status === 404) {
              specificError = `Book with ACCNO ${filters.ACCNO} not found.`;
            }
          }
        }
        setError(specificError);
      } else {
        setError("");
      }

      const mappedHistory = response.data.data.records.map((record) => ({
        ...record,
        ACCNO: record.bookId || record.ACCNO || "N/A",
      }));

      // Debug: Log all transaction types received

      setHistory(mappedHistory);
      setPagination((prev) => ({
        ...prev,
        totalPages: response.data.data.pagination.totalPages,
        currentPage: response.data.data.pagination.currentPage,
      }));
    } catch (err) {
      console.error("Error fetching history:", err);
      setError(
        err.response?.data?.message ||
          "Failed to fetch history. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear issued books immediately when changing borrower IDs
    if (name === "studentId" || name === "employeeId") {
      setIssuedBooks([]);
      setSelectedBookId("");
    }

    // Debounce ACCNO input to prevent immediate overwrite of user input
    if (name === "ACCNO") {
      // Clear existing timer
      if (accnoDebounceTimer) {
        clearTimeout(accnoDebounceTimer);
      }
      
      // Only fetch book details if value has length and after user stops typing for 1 second
      if (value.length > 0) {
        const newTimer = setTimeout(() => {
          fetchBookDetails(value);
        }, 1000); // 1 second delay
        setAccnoDebounceTimer(newTimer);
      }
    }

    if (name === "studentId" && value.length > 0) {
      try {
        setLoading(true);
        setError("");

        if (!value || typeof value !== "string" || value.trim().length === 0) {
          throw new Error("Please enter a valid student ID");
        }

        const studentId = value.trim();

        const response = await axios.get(
          `http://localhost:4000/api/students/enrollment/${encodeURIComponent(
            studentId
          )}`,
          { headers: getAuthHeaders() }
        );

        if (response.data) {
          const studentData = response.data;

          const fullName = [
            studentData.firstName,
            studentData.middleName,
            studentData.lastName,
          ]
            .filter(Boolean)
            .join(" ");

          const departmentName = studentData.department?.name || "";
          const streamName = studentData.stream?.name || "";
          const semesterNumber = studentData.semester?.number || "";

          setFormData((prev) => ({
            ...prev,
            studentName: fullName || "",
            rollNumber: studentData.enrollmentNumber || "",
            department: departmentName,
            semester: semesterNumber,
            course: streamName,
            email: studentData.email || "",
            phone: studentData.mobileNumber || "",
          }));

          if (studentData.studentId) {
            // Only fetch issued books for Issue, Return, and Renew forms, not for Lost Book form
            if (activeForm !== "lost") {
              fetchIssuedBooks(studentData.studentId, "student");
            }
          }
        }
      } catch (err) {
        console.error("Error fetching student details:", err);
        if (err.response && err.response.status === 404) {
          setError(
            `Student with ID "${value}" not found. Please check the ID and try again.`
          );
        } else {
          setError("Error fetching student details. Please try again.");
        }

        setFormData((prev) => ({
          ...prev,
          studentName: "",
          rollNumber: "",
          department: "",
          semester: "",
          course: "",
          email: "",
          phone: "",
        }));
      } finally {
        setLoading(false);
      }
    }

    if (name === "employeeId" && value.length > 0) {
      try {
        setLoading(true);
        setError("");

        if (!value || typeof value !== "string" || value.trim().length === 0) {
          throw new Error("Please enter a valid employee ID");
        }

        const employeeId = value.trim();

        const response = await axios.get(
          "http://localhost:4000/api/faculty/faculties",
          { headers: getAuthHeaders() }
        );

        // Check if response.data is an array or contains an array
        let facultyList = [];
        if (Array.isArray(response.data)) {
          facultyList = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          facultyList = response.data.data;
        } else {
          throw new Error("Invalid faculty data structure");
        }

        const facultyMember = facultyList.find((f) => {
          return (
            f.employeeId === employeeId ||
            f.empId === employeeId ||
            f.id === employeeId
          );
        });

        if (facultyMember) {
          setFormData((prev) => ({
            ...prev,
            firstName:
              facultyMember.name ||
              facultyMember.firstName ||
              facultyMember.NAME ||
              "",
            department: facultyMember.department || "",
            designation:
              facultyMember.designation || facultyMember.position || "",
            email: facultyMember.email || "",
            phone:
              facultyMember.mobile ||
              facultyMember.phone ||
              facultyMember.phoneNumber ||
              "",
            employmentStatus:
              facultyMember.employmentStatus || facultyMember.status || "",
            dateOfJoining:
              facultyMember.dateOfJoining || facultyMember.joiningDate || "",
          }));

          if (
            facultyMember.employeeId ||
            facultyMember.empId ||
            facultyMember.id
          ) {
            // Only fetch issued books for Issue, Return, and Renew forms, not for Lost Book form
            if (activeForm !== "lost") {
              fetchIssuedBooks(employeeId, "faculty");
            }
          }

          setError("");
          setSuccess("Faculty details loaded successfully!");
        } else {
          setError(
            `Faculty member with ID "${employeeId}" not found. Please check the ID and try again.`
          );
          setFormData((prev) => ({
            ...prev,
            firstName: "",
            department: "",
            designation: "",
            email: "",
            phone: "",
            employmentStatus: "",
            dateOfJoining: "",
          }));
        }
      } catch (err) {
        console.error("Error fetching faculty details:", err);
        if (err.response) {
          setError(
            err.response.data.message ||
              "Error fetching faculty details. Please try again."
          );
        } else {
          setError("Error fetching faculty details. Please try again.");
        }

        setFormData((prev) => ({
          ...prev,
          firstName: "",
          department: "",
          designation: "",
          email: "",
          phone: "",
          employmentStatus: "",
          dateOfJoining: "",
        }));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReturnSubmit = async () => {
    const borrowerId =
      formData.borrowerType === "student"
        ? formData.studentId
        : formData.employeeId;

    if (!borrowerId || !selectedBookId) {
      setError(
        `${
          formData.borrowerType === "student" ? "Student ID" : "Employee ID"
        } and Book selection are required`
      );
      return;
    }

    // Always fetch fresh issued books data before proceeding

    try {
      setLoading(true);

      // Fetch issued books first - include all statuses and renewed books
      const response = await axios.get(
        `http://localhost:4000/api/issues/borrowed-books`,
        {
          params: {
            borrowerId: borrowerId,
            borrowerType: formData.borrowerType,
            includeRenewed: true, // Explicitly include renewed books
            status: "all", // Get all active books regardless of status
          },
        }
      );

      // Extract books from response
      let currentIssuedBooks = [];
      if (response.data.success && response.data.data) {
        currentIssuedBooks = Array.isArray(response.data.data)
          ? response.data.data
          : [];
      } else if (response.data.borrowedBooks) {
        currentIssuedBooks = Array.isArray(response.data.borrowedBooks)
          ? response.data.borrowedBooks
          : [];
      } else if (Array.isArray(response.data)) {
        currentIssuedBooks = response.data;
      }

      // If we got fewer books than expected, try to get from history API as well
      if (currentIssuedBooks.length < 2) {
        try {
          const historyParams =
            borrowerType === "student"
              ? { studentId: borrowerId, borrowerType: borrowerType, limit: 50 }
              : {
                  employeeId: borrowerId,
                  borrowerType: borrowerType,
                  limit: 50,
                };

          const historyResponse = await axios.get(
            `http://localhost:4000/api/issues/history`,
            {
              params: historyParams,
            }
          );

          if (
            historyResponse.data.success &&
            historyResponse.data.data.records
          ) {
            const allTransactions = historyResponse.data.data.records;

            // Group transactions by book ID to find the latest state of each book
            const bookMap = new Map();

            // First add existing books to the map
            currentIssuedBooks.forEach((book) => {
              const bookId = book.ACCNO || book.bookId;
              bookMap.set(bookId, {
                ...book,
                source: "borrowed-books",
              });
            });

            // Process all history transactions - but ONLY for the specific borrower
            allTransactions.forEach((transaction) => {
              // 🔒 STRICT VALIDATION: Only include transactions for the exact borrower
              const transactionBorrowerId =
                formData.borrowerType === "student"
                  ? transaction.studentId
                  : transaction.employeeId;

              if (transactionBorrowerId !== borrowerId) {
                return; // Skip this transaction
              }

              const bookId = transaction.bookId || transaction.ACCNO;

              // Only process if this transaction is more recent than what we have
              if (
                !bookMap.has(bookId) ||
                new Date(transaction.createdAt) >
                  new Date(bookMap.get(bookId).createdAt || 0)
              ) {
                bookMap.set(bookId, {
                  ...transaction,
                  ACCNO: bookId,
                  bookTitle: transaction.bookTitle,
                  author: transaction.author,
                  publisher: transaction.publisher,
                  source: "history",
                });
              }
            });

            // Filter to only include books that are currently active (not returned)
            const activeBooks = [];
            bookMap.forEach((latestTransaction, bookId) => {
              if (
                latestTransaction.transactionType !== "return" &&
                latestTransaction.status === "active"
              ) {
                activeBooks.push(latestTransaction);
              }
            });

            currentIssuedBooks = activeBooks;
          }
        } catch (historyError) {
          console.warn("Could not fetch from history:", historyError);
        }
      }

      // Update the state with fresh data
      setIssuedBooks(currentIssuedBooks);

      // Check if there are any issued books
      if (!currentIssuedBooks || currentIssuedBooks.length === 0) {
        setError(
          "No active books found for this borrower. Please check the ID or ensure books are issued."
        );
        setLoading(false);
        return;
      }

      // Check if the selected book exists in the issued books list
      const selectedBook = currentIssuedBooks.find(
        (book) => String(book.ACCNO) === String(selectedBookId)
      );
      if (!selectedBook) {
        setError("Selected book is not currently issued to this borrower.");
        setLoading(false);
        return;
      }
    } catch (fetchError) {
      console.error("Error fetching issued books:", fetchError);
      setError(
        "Error fetching issued books. Please check the ID or ensure books are issued."
      );
      setLoading(false);
      return;
    }

    // Now proceed with the return process using fresh data
    try {
      setError("");
      setSuccess("");
      // setLoading(true) - already set above

      // Get the fresh issued books data (already fetched above)
      const currentIssuedBooks = issuedBooks; // Use the updated state

      if (!currentIssuedBooks.length > 0) {
        console.warn("No issued books found after fresh fetch");
      }

      // Create comprehensive return data with all possible field names
      const returnData = {
        ACCNO: selectedBookId,
        bookId: selectedBookId,
        accessionNumber: selectedBookId,
        borrowerId: borrowerId,
        studentId: formData.borrowerType === "student" ? borrowerId : undefined,
        employeeId:
          formData.borrowerType === "faculty" ? borrowerId : undefined,
        borrowerType: formData.borrowerType,
        returnDate:
          formData.returnDate || new Date().toISOString().split("T")[0],
        status: "returned",
      };

      // Instead of trying different endpoints, use the same endpoint as the issue functionality
      let res;
      try {
        // Use the same base endpoint as issue functionality
        res = await axios.post(
          "http://localhost:4000/api/issues/return",
          returnData
        );
      } catch (endpointErr) {
        // If there's an error, let's check if the book exists in the issued books array
        const matchingBook = currentIssuedBooks.find(
          (book) => String(book.ACCNO) === String(selectedBookId)
        );

        if (matchingBook) {
          // Try with the exact structure from the matched book
          returnData.issueId = matchingBook._id || matchingBook.id;
          returnData.transactionId = matchingBook.transactionId;
          returnData.issueRecordId = matchingBook.issueRecordId;

          // Try again with the enhanced data
          res = await axios.post(
            "http://localhost:4000/api/issues/return",
            returnData
          );
        } else {
          throw endpointErr; // Re-throw if we can't enhance the data
        }
      }

      const { success, message, data } = res.data;

      if (success) {
        // Get book details for the modal using fresh data
        const returnedBook = currentIssuedBooks.find(
          (book) => String(book.ACCNO) === String(selectedBookId)
        );

        let fineAmount = 0;
        if (data.fineAmount > 0 && data.fineStatus === "pending") {
          const confirmReturn = window.confirm(
            `Fine of Rs. ${data.fineAmount} is due. Has the student paid the fine? Click OK to confirm and complete return.`
          );

          if (!confirmReturn) {
            setSuccess("");
            setError("Return cancelled until fine is paid.");
            setLoading(false);
            return;
          }

          try {
            // Use the same endpoint pattern as the successful return call
            await axios.post(
              "http://localhost:4000/api/issues/return/confirm-payment",
              {
                issueId: data._id,
                ACCNO: selectedBookId,
                bookId: selectedBookId,
                borrowerId: borrowerId,
                borrowerType: formData.borrowerType,
                returnDate:
                  formData.returnDate || new Date().toISOString().split("T")[0],
                fineAmount: data.fineAmount,
                paymentStatus: "paid",
              }
            );
          } catch (confirmErr) {
            console.error("Payment confirmation failed:", confirmErr);
            // Show the error but still mark as successful since the book was returned
            console.warn(
              "Book return succeeded but fine payment recording failed"
            );
          }

          fineAmount = data.fineAmount;
        }

        // Calculate days borrowed
        const issueDate = new Date(returnedBook?.issueDate || new Date());
        const returnDate = new Date(formData.returnDate || new Date());
        const daysBorrowed = Math.ceil(
          (returnDate - issueDate) / (1000 * 60 * 60 * 24)
        );

        // Prepare return book details for modal
        const returnBookDetails = {
          ACCNO: selectedBookId,
          bookTitle: returnedBook?.bookTitle || "Unknown Title",
          author: returnedBook?.author || "Unknown Author",
          publisher: returnedBook?.publisher || "Unknown Publisher",
          borrowerName:
            returnedBook?.borrowerName || formData.borrowerName || "Unknown",
          borrowerId: borrowerId,
          borrowerType: formData.borrowerType,
          department:
            returnedBook?.department || formData.department || "Unknown",
          course: returnedBook?.course || formData.course,
          semester: returnedBook?.semester || formData.semester,
          designation: returnedBook?.designation || formData.designation,
          issueDate: returnedBook?.issueDate
            ? new Date(returnedBook.issueDate).toLocaleDateString()
            : "Unknown",
          returnDate: new Date(
            formData.returnDate || new Date()
          ).toLocaleDateString(),
          daysBorrowed: daysBorrowed,
          fineAmount: fineAmount,
        };

        setReturnBookDetails(returnBookDetails);
        setShowReturnModal(true);

        // 🔄 IMPORTANT: Notify parent components about the book return
        // This prevents cross-contamination and ensures accurate book counts
        if (window.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent("bookReturned", {
              detail: {
                borrowerId: borrowerId,
                borrowerType: formData.borrowerType,
                bookId: selectedBookId,
                timestamp: new Date().toISOString(),
              },
            })
          );
        }

        setFormData((prev) => ({
          ...prev,
          studentId: "",
          employeeId: "",
          returnDate: new Date().toISOString().split("T")[0],
        }));
        setIssuedBooks([]);
        setSelectedBookId("");
        // Refresh history after successful return
        fetchHistory();
      } else {
        setError(message || "Error while returning book.");
      }
    } catch (err) {
      console.error("Error returning book:", err);
      if (err.response) {
        console.error("Error response:", err.response.data);

        // Specific error handling for "No active issue" errors
        if (err.response.data?.message?.includes("No active issue found")) {
          setError(
            "This book is not currently issued to this borrower. Please verify the book ID and borrower ID are correct."
          );

          // Show available books that can be returned for this borrower
          if (issuedBooks.length > 0) {
            const bookList = issuedBooks
              .map((book) => `${book.bookTitle} (${book.ACCNO})`)
              .join(", ");
            setError(
              (prev) =>
                `${prev}\n\nBooks currently issued to this borrower: ${bookList}`
            );
          } else {
            setError((prev) => `${prev}\n\nThis borrower has no active books.`);
          }

          // Refresh the issued books list to ensure we have the latest data
          fetchIssuedBooks(borrowerId, formData.borrowerType);
        } else {
          // General error handling
          setError(err.response.data.message || "Error while returning book.");
        }
      } else {
        setError("Error while returning book. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      if (!Array.isArray(history) || history.length === 0) {
        setError("No transaction history available to generate a report.");
        return;
      }

      const sanitizedHistory = history.map((record) => ({
        ...record,
        ACCNO: record.bookId || record.ACCNO || "N/A",
        bookTitle: record.bookTitle || "Unknown Title",
        borrowerType: record.borrowerType || "Unknown",
        studentId: record.studentId || "",
        employeeId: record.employeeId || "",
        transactionType: record.transactionType || "unknown",
        issueDate: record.issueDate || new Date(),
        dueDate: record.dueDate || new Date(),
        actualReturnDate: record.actualReturnDate || null,
        returnDate: record.returnDate || null,
        status: record.status || "unknown",
      }));

      const loadScript = (src) => {
        return new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
      );
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
      );

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      let imgData;
      try {
        const response = await fetch("/nga.png");
        if (!response.ok) {
          throw new Error("Failed to load the image");
        }
        const blob = await response.blob();
        imgData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (imgError) {
        console.error("Error loading image:", imgError);
        setError(
          "Failed to load logo image for the PDF. Generating PDF without the logo."
        );
        imgData = null;
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      let headerHeight = 10;

      if (imgData) {
        const imgWidth = 30;
        const imgHeight = 30;
        const imgX = 10;
        const imgY = headerHeight;
        doc.addImage(imgData, "PNG", imgX, imgY, imgWidth, imgHeight);
        headerHeight += imgHeight + 5;
      }

      if (imgData) {
        const collegeName =
          "NAGARJUNA INSTITUTE OF ENGINEERING TECHNOLOGY AND MANAGEMENT";
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 102, 204);
        const textX = 45;
        const textY = headerHeight;
        doc.text(collegeName, textX, textY, { maxWidth: 220 });
        headerHeight += 10;
      } else {
        const collegeName =
          "NAGARJUNA INSTITUTE OF ENGINEERING TECHNOLOGY AND MANAGEMENT";
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 102, 204);
        doc.text(collegeName, pageWidth / 2, headerHeight + 5, {
          align: "center",
          maxWidth: 240,
        });
        headerHeight += 15;
      }

      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 102, 204);
      doc.line(10, headerHeight + 2, pageWidth - 10, headerHeight + 2);
      headerHeight += 8;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(
        "Satnavri, Amravati Road, Nagpur, Maharashtra 440023, India",
        pageWidth / 2,
        headerHeight + 2,
        {
          align: "center",
        }
      );
      headerHeight += 10;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Library Transaction Report", pageWidth / 2, headerHeight + 2, {
        align: "center",
      });
      headerHeight += 10;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Generated on: ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        headerHeight + 2,
        {
          align: "center",
        }
      );
      headerHeight += 10;

      const tableData = sanitizedHistory.map((record) => {
        const borrowerId =
          record.borrowerType === "student"
            ? record.studentId
            : record.employeeId;
        const displayStatus =
          record.status === "active"
            ? "ACTIVE"
            : record.status === "returned"
            ? "COMPLETED"
            : record.status.toUpperCase() || "UNKNOWN";

        return [
          record.ACCNO,
          record.bookTitle,
          record.borrowerType === "student"
            ? "Student"
            : record.borrowerType === "faculty"
            ? "Faculty"
            : "Unknown",
          borrowerId || "N/A",
          (record.transactionType || "unknown").toUpperCase(),
          new Date(record.issueDate).toLocaleDateString(),
          new Date(record.dueDate).toLocaleDateString(),
          record.actualReturnDate
            ? new Date(record.actualReturnDate).toLocaleDateString()
            : record.status === "returned" && record.returnDate
            ? new Date(record.returnDate).toLocaleDateString()
            : "-",
          displayStatus,
        ];
      });

      const columns = [
        { header: "ACCNO", dataKey: "accno" },
        { header: "Book Title", dataKey: "bookTitle" },
        { header: "Borrower Type", dataKey: "borrowerType" },
        { header: "ID", dataKey: "id" },
        { header: "Type", dataKey: "type" },
        { header: "Issued", dataKey: "issued" },
        { header: "Due", dataKey: "due" },
        { header: "Returned", dataKey: "returned" },
        { header: "Status", dataKey: "status" },
      ];

      const rows = tableData.map((row) => ({
        accno: row[0],
        bookTitle: row[1],
        borrowerType: row[2],
        id: row[3],
        type: row[4],
        issued: row[5],
        due: row[6],
        returned: row[7],
        status: row[8],
      }));

      const totalColumnWidth = columns.reduce(
        (sum, col) => sum + (col.cellWidth || 30),
        0
      );
      const availableWidth = pageWidth - 20;
      const scaleFactor = availableWidth / totalColumnWidth;

      doc.autoTable({
        columns: columns.map((col) => ({
          ...col,
          cellWidth: col.cellWidth
            ? col.cellWidth * scaleFactor
            : 30 * scaleFactor,
        })),
        body: rows,
        startY: headerHeight,
        theme: "striped",
        headStyles: {
          fillColor: [0, 102, 204],
          textColor: [255, 255, 255],
          halign: "center",
        },
        styles: {
          fontSize: 10,
          cellPadding: 2,
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          accno: { cellWidth: 20 * scaleFactor },
          bookTitle: { cellWidth: 40 * scaleFactor },
          borrowerType: { cellWidth: 20 * scaleFactor },
          id: { cellWidth: 20 * scaleFactor },
          type: { cellWidth: 20 * scaleFactor },
          issued: { cellWidth: 20 * scaleFactor },
          due: { cellWidth: 20 * scaleFactor },
          returned: { cellWidth: 20 * scaleFactor },
          status: { cellWidth: 20 * scaleFactor },
        },
        margin: { top: headerHeight, left: 10, right: 10 },
        pageBreak: "auto",
      });

      doc.save(
        `library_history_report_${new Date().toISOString().split("T")[0]}.pdf`
      );
    } catch (err) {
      console.error("Error generating PDF report:", err);
      setError("Failed to generate PDF report: " + err.message);
    }
  };

  const getAllBooks = async () => {
    const response = await fetch("http://localhost:4000/api/books");
    const books = await response.json();
    return books;
  };

  const searchBooksByACCNO = async (accno) => {
    const response = await fetch(`http://localhost:4000/api/books?accno=${accno}`);
    const books = await response.json();
    return books;
  };

  const getBookByACCNO = async (accno) => {
    const response = await fetch(`http://localhost:4000/api/books/accno/${accno}`);
    const book = await response.json();
    return book;
  };

  const handleReturn = async (ACCNO) => {
    try {
      const borrowerData = JSON.parse(localStorage.getItem("borrowerData"));
      if (!borrowerData?.borrowerId || !borrowerData?.borrowerType) {
        throw new Error("Missing borrower information. Please try again.");
      }

      const response = await axios.post(
        `http://localhost:4000/api/issues/return`,
        {
          ACCNO,
          borrowerId: borrowerData.borrowerId,
          borrowerType: borrowerData.borrowerType,
        }
      );

      // Update UI immediately
      setIssuedBooks((prev) => prev.filter((book) => String(book.ACCNO) !== String(ACCNO)));

      // Add the returned book to history if it's not already there
      setHistory((prev) => {
        const returnedBook = issuedBooks.find((book) => String(book.ACCNO) === String(ACCNO));
        if (returnedBook) {
          const existingIndex = prev.findIndex((h) => String(h.ACCNO) === String(ACCNO));
          if (existingIndex >= 0) {
            // Update existing history entry
            const updated = [...prev];
            updated[existingIndex] = {
              ...returnedBook,
              returnDate: new Date().toISOString(),
            };
            return updated;
          } else {
            // Add new history entry
            return [
              { ...returnedBook, returnDate: new Date().toISOString() },
              ...prev,
            ];
          }
        }
        return prev;
      });

      toast.success("Book returned successfully!");

      // Refresh the issued books list to ensure UI is in sync
      await fetchIssuedBooks(
        borrowerData.borrowerId,
        borrowerData.borrowerType
      );
    } catch (err) {
      console.error("Error returning book:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to return book. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
          <button
            type="button"
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${
              activeForm === "issue"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("issue")}
          >
            Issue Book
          </button>
          <button
            type="button"
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${
              activeForm === "return"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("return")}
          >
            Return Book
          </button>
          <button
            type="button"
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${
              activeForm === "renew"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("renew")}
          >
            Renew Book
          </button>
          <button
            type="button"
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${
              activeForm === "lost"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("lost")}
          >
            Lost Book Entry
          </button>
          <button
            type="button"
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${
              activeForm === "history"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("history")}
          >
            History
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto">
          {activeForm === "issue" && (
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                Issue Book
              </h2>
              {loading && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
                  Loading details...
                </div>
              )}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                  {success}
                </div>
              )}

              <form onSubmit={handleIssueSubmit} className="space-y-6">
                <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
                  <label className="block text-lg font-semibold text-gray-800 mb-4">
                    Select Borrower Type
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="borrowerType"
                        value="student"
                        checked={formData.borrowerType === "student"}
                        onChange={handleInputChange}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-700 font-medium">Student</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="borrowerType"
                        value="faculty"
                        checked={formData.borrowerType === "faculty"}
                        onChange={handleInputChange}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-700 font-medium">Faculty</span>
                    </label>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {formData.borrowerType === "student"
                      ? "Student Information"
                      : "Faculty Information"}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.borrowerType === "student" ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Student ID
                          </label>
                          <input
                            type="text"
                            name="studentId"
                            value={formData.studentId}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            placeholder="Enter Student ID"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Student Name
                          </label>
                          <input
                            type="text"
                            name="studentName"
                            value={formData.studentName}
                            className="w-full p-2 border rounded bg-gray-50"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Roll Number
                          </label>
                          <input
                            type="text"
                            name="rollNumber"
                            value={formData.rollNumber}
                            className="w-full p-2 border rounded bg-gray-50"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Semester
                          </label>
                          <input
                            type="text"
                            name="semester"
                            value={formData.semester}
                            className="w-full p-2 border rounded bg-gray-50"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Course
                          </label>
                          <input
                            type="text"
                            name="course"
                            value={formData.course}
                            className="w-full p-2 border rounded bg-gray-50"
                            readOnly
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Employee ID
                          </label>
                          <input
                            type="text"
                            name="employeeId"
                            value={formData.employeeId}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            placeholder="Enter Employee ID"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Faculty Name
                          </label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            className="w-full p-2 border rounded bg-gray-50"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Designation
                          </label>
                          <input
                            type="text"
                            name="designation"
                            value={formData.designation}
                            className="w-full p-2 border rounded bg-gray-50"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Date of Joining
                          </label>
                          <input
                            type="text"
                            name="dateOfJoining"
                            value={formData.dateOfJoining}
                            className="w-full p-2 border rounded bg-gray-50"
                            readOnly
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        className="w-full p-2 border rounded bg-gray-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        className="w-full p-2 border rounded bg-gray-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        className="w-full p-2 border rounded bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Book Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Scan Book Barcode
                      </label>
                      <input
                        type="text"
                        name="ACCNO"
                        value={formData.ACCNO}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        placeholder="Scan or enter book barcode"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Book Title
                      </label>
                      <input
                        type="text"
                        name="bookTitle"
                        value={formData.bookTitle}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Author
                      </label>
                      <input
                        type="text"
                        name="author"
                        value={formData.author}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Publisher
                      </label>
                      <input
                        type="text"
                        name="publisher"
                        value={formData.publisher}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        ISBN
                      </label>
                      <input
                        type="text"
                        name="isbn"
                        value={formData.isbn}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Shelf
                      </label>
                      <input
                        type="text"
                        name="shelf"
                        value={formData.shelf}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Series Code
                      </label>
                      <input
                        type="text"
                        name="SERIESCODE"
                        value={formData.SERIESCODE}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Class No
                      </label>
                      <input
                        type="text"
                        name="CLASSNO"
                        value={formData.CLASSNO}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Publication Year
                      </label>
                      <input
                        type="text"
                        name="PUB.YEAR"
                        value={formData["PUB.YEAR"]}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Pages
                      </label>
                      <input
                        type="text"
                        name="PAGES"
                        value={formData.PAGES}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Print Price
                      </label>
                      <input
                        type="text"
                        name="PRINTPRICE"
                        value={formData.PRINTPRICE}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Purchase Price
                      </label>
                      <input
                        type="text"
                        name="PURPRICE"
                        value={formData.PURPRICE}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>
                  </div>

                  {error?.includes("not found") && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={saveNewBook}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save New Book
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 11-4 0 2 2 0 014 0zM8 7h8l-.5 7.5A2 2 0 0113.5 16h-3a2 2 0 01-2-1.5L8 7z"
                      />
                    </svg>
                    Issue Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Issue Date
                      </label>
                      <input
                        type="text"
                        name="issueDate"
                        value={formData.issueDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Borrowing Duration (Days)
                      </label>
                      <select
                        value={selectedDays}
                        onChange={handleDaysChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      >
                        <option value="">Select duration</option>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15].map(
                          (day) => (
                            <option key={day} value={day}>
                              {day} {day === 1 ? "day" : "days"}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date
                      </label>
                      <input
                        type="text"
                        name="dueDate"
                        value={formData.dueDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2"
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
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <span>Issue Book</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeForm === "return" && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Return Book
                </h2>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.borrowerType === "student"
                        ? "Student ID"
                        : "Employee ID"}
                    </label>
                    <input
                      type="text"
                      name={
                        formData.borrowerType === "student"
                          ? "studentId"
                          : "employeeId"
                      }
                      value={
                        formData.borrowerType === "student"
                          ? formData.studentId
                          : formData.employeeId
                      }
                      onChange={handleInputChange}
                      onBlur={() => {
                        const id =
                          formData.borrowerType === "student"
                            ? formData.studentId
                            : formData.employeeId;
                        if (id.length > 2) {
                          fetchIssuedBooks(id, formData.borrowerType);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder={
                        formData.borrowerType === "student"
                          ? "Enter Student ID"
                          : "Enter Employee ID"
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Book to Return
                    </label>
                    {issuedBooks.length > 0 ? (
                      <div>
                        <select
                          value={selectedBookId}
                          onChange={(e) => setSelectedBookId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          required
                        >
                          <option value="">Select a book</option>
                          {issuedBooks.map((book) => (
                            <option key={book.ACCNO} value={book.ACCNO}>
                              {book.bookTitle || "Unknown"} - {book.ACCNO}
                            </option>
                          ))}
                        </select>
                        <div className="text-green-600 text-sm mt-1">
                          {issuedBooks.length} active book(s) found for this{" "}
                          {formData.borrowerType}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center">
                          <input
                            type="text"
                            name="ACCNO"
                            value={selectedBookId}
                            onChange={(e) => setSelectedBookId(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Scan or enter book barcode"
                            required
                            autoFocus
                          />
                          <button
                            type="button"
                            className="ml-2 px-3 py-2 bg-blue-600 text-white rounded"
                            onClick={() => {
                              const id =
                                formData.borrowerType === "student"
                                  ? formData.studentId
                                  : formData.employeeId;
                              if (id) {
                                fetchIssuedBooks(id, formData.borrowerType);
                              }
                            }}
                          >
                            Refresh
                          </button>
                        </div>
                        {(formData.borrowerType === "student"
                          ? formData.studentId
                          : formData.employeeId) && (
                          <div className="text-orange-600 text-sm mt-1">
                            No active books found for this{" "}
                            {formData.borrowerType}. Please check the ID or try
                            refreshing.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Return Date
                    </label>
                    <input
                      type="date"
                      name="returnDate"
                      value={
                        formData.returnDate ||
                        new Date().toISOString().split("T")[0]
                      }
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2"
                    onClick={handleReturnSubmit}
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
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                    <span>Return Book</span>
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                    {success}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeForm === "renew" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-6">Renew Book</h2>

              {loading && (
                <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">
                  Loading details...
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {formData.borrowerType === "student"
                      ? "Student ID"
                      : "Employee ID"}
                  </label>
                  <input
                    type="text"
                    name={
                      formData.borrowerType === "student"
                        ? "studentId"
                        : "employeeId"
                    }
                    value={
                      formData.borrowerType === "student"
                        ? formData.studentId
                        : formData.employeeId
                    }
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <button
                    onClick={() => {
                      const id =
                        formData.borrowerType === "student"
                          ? formData.studentId
                          : formData.employeeId;
                      fetchIssuedBooks(id, formData.borrowerType);
                    }}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Fetch Issued Books
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Select Book to Renew
                  </label>
                  <select
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select a book</option>
                    {issuedBooks.map((book) => (
                      <option key={book.ACCNO} value={book.ACCNO}>
                        {book.bookTitle || "Unknown"} - {book.ACCNO}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBookId && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        New Due Date
                      </label>
                      <input
                        type="date"
                        name="newDueDate"
                        value={formData.newDueDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full p-2 border rounded"
                        required
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleRenewSubmit}
                        disabled={loading || !formData.newDueDate}
                        className={`px-4 py-2 text-white rounded ${
                          loading || !formData.newDueDate
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {loading ? "Renewing..." : "Renew Book"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeForm === "lost" && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Lost Book Entry
                </h2>
              </div>
              {loading && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
                  Loading details...
                </div>
              )}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                  {success}
                </div>
              )}

              <form onSubmit={handleLostBookSubmit} className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Book Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Scan Book Barcode
                      </label>
                      <input
                        type="text"
                        name="ACCNO"
                        value={formData.ACCNO}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        placeholder="Scan or enter book barcode"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Book Title
                      </label>
                      <input
                        type="text"
                        name="bookTitle"
                        value={formData.bookTitle}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Author
                      </label>
                      <input
                        type="text"
                        name="author"
                        value={formData.author}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Series Code
                      </label>
                      <input
                        type="text"
                        name="SERIESCODE"
                        value={formData.SERIESCODE}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Class No
                      </label>
                      <input
                        type="text"
                        name="CLASSNO"
                        value={formData.CLASSNO}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Publication Year
                      </label>
                      <input
                        type="text"
                        name="PUB.YEAR"
                        value={formData["PUB.YEAR"]}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Pages
                      </label>
                      <input
                        type="text"
                        name="PAGES"
                        value={formData.PAGES}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Print Price
                      </label>
                      <input
                        type="text"
                        name="PRINTPRICE"
                        value={formData.PRINTPRICE}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Purchase Price
                      </label>
                      <input
                        type="text"
                        name="PURPRICE"
                        value={formData.PURPRICE}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        readOnly={!error?.includes("not found")}
                      />
                    </div>
                  </div>

                  {error?.includes("not found") && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={saveNewBook}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save New Book
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Borrower Information
                  </h3>
                  <div className="mb-4">
                    <label className="block text-lg font-semibold mb-2">
                      Select Borrower Type
                    </label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="borrowerType"
                          value="student"
                          checked={formData.borrowerType === "student"}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Student
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="borrowerType"
                          value="faculty"
                          checked={formData.borrowerType === "faculty"}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Faculty
                      </label>
                    </div>
                  </div>

                  {formData.borrowerType === "student" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Student ID
                        </label>
                        <input
                          type="text"
                          name="studentId"
                          value={formData.studentId}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Enter Student ID"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Student Name
                        </label>
                        <input
                          type="text"
                          name="studentName"
                          value={formData.studentName}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Student name will be auto-filled"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Department will be auto-filled"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Course
                        </label>
                        <input
                          type="text"
                          name="course"
                          value={formData.course}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Course will be auto-filled"
                          readOnly
                        />
                      </div>
                    </div>
                  )}

                  {formData.borrowerType === "faculty" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          name="employeeId"
                          value={formData.employeeId}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Enter Employee ID"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Faculty Name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Faculty name will be auto-filled"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Department will be auto-filled"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Designation
                        </label>
                        <input
                          type="text"
                          name="designation"
                          value={formData.designation}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Designation will be auto-filled"
                          readOnly
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Lost Book Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Lost Date
                      </label>
                      <input
                        type="date"
                        name="lostDate"
                        value={formData.lostDate}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        max={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Lost Reason
                      </label>
                      <select
                        name="lostReason"
                        value={formData.lostReason}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                      >
                        <option value="">Select reason</option>
                        <option value="misplaced">Misplaced</option>
                        <option value="damaged">Damaged</option>
                        <option value="stolen">Stolen</option>
                        <option value="torn">Torn/Destroyed</option>
                        <option value="water_damage">Water Damage</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Replacement Cost (₹)
                      </label>
                      <input
                        type="number"
                        name="replacementCost"
                        value={formData.replacementCost}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        placeholder="Enter replacement cost"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Remarks
                      </label>
                      <textarea
                        name="lostRemarks"
                        value={formData.lostRemarks}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        placeholder="Additional remarks about the lost book"
                        rows="3"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Record Lost Book
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeForm === "history" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Transaction History</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Borrower Type
                  </label>
                  <select
                    value={filters.borrowerType || "all"}
                    onChange={(e) =>
                      setFilters({ ...filters, borrowerType: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="all">All</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>

                {filters.borrowerType === "student" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={filters.studentId || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, studentId: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="Enter Student ID"
                    />
                  </div>
                )}

                {filters.borrowerType === "faculty" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={filters.employeeId || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, employeeId: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="Enter Employee ID"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Search by ACCNO
                  </label>
                  <input
                    type="text"
                    value={filters.ACCNO}
                    onChange={(e) =>
                      setFilters({ ...filters, ACCNO: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                    placeholder="Book ACCNO"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={filters.transactionType || "all"}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        transactionType: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="all">All</option>
                    <option value="issue">Issued</option>
                    <option value="return">Returned</option>
                    <option value="renew">Renewed</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <button
                  onClick={fetchHistory}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply Filters
                </button>

                <button
                  onClick={generateReport}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={history.length === 0}
                >
                  Generate PDF Report
                </button>
              </div>

              {loading && (
                <div className="text-center p-4">Loading history...</div>
              )}

              {!loading && history.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border">ACCNO</th>
                        <th className="py-2 px-4 border">Book Title</th>
                        <th className="py-2 px-4 border">Borrower Type</th>
                        <th className="py-2 px-4 border">ID</th>
                        <th className="py-2 px-4 border">Type</th>
                        <th className="py-2 px-4 border">Issued Date</th>
                        <th className="py-2 px-4 border">Due Date</th>
                        <th className="py-2 px-4 border">Return Date</th>
                        <th className="py-2 px-4 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="py-2 px-4 border">
                            {record.ACCNO || record.bookId || "N/A"}
                          </td>
                          <td className="py-2 px-4 border">
                            {record.bookTitle || "Unknown Title"}
                          </td>
                          <td className="py-2 px-4 border">
                            {record.borrowerType === "student"
                              ? "Student"
                              : record.borrowerType === "faculty"
                              ? "Faculty"
                              : "Unknown"}
                          </td>
                          <td className="py-2 px-4 border">
                            {record.borrowerType === "student"
                              ? record.studentId
                              : record.employeeId || "N/A"}
                          </td>
                          <td className="py-2 px-4 border">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                record.transactionType === "issue"
                                  ? "bg-blue-100 text-blue-800"
                                  : record.transactionType === "return"
                                  ? "bg-green-100 text-green-800"
                                  : record.transactionType === "renew"
                                  ? "bg-purple-100 text-purple-800"
                                  : record.transactionType === "lost"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {(
                                record.transactionType || "unknown"
                              ).toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-4 border">
                            {record.issueDate
                              ? new Date(record.issueDate).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="py-2 px-4 border">
                            {record.dueDate
                              ? new Date(record.dueDate).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="py-2 px-4 border">
                            {record.actualReturnDate
                              ? new Date(
                                  record.actualReturnDate
                                ).toLocaleDateString()
                              : record.status === "returned" &&
                                record.returnDate
                              ? new Date(record.returnDate).toLocaleDateString()
                              : record.transactionType === "lost"
                              ? new Date(
                                  record.lostDate || record.createdAt
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="py-2 px-4 border">
                            {record.status === "active" ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                ACTIVE
                              </span>
                            ) : record.status === "returned" ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                                COMPLETED
                              </span>
                            ) : record.transactionType === "lost" ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                                LOST
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                                UNKNOWN
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() =>
                        setPagination({
                          ...pagination,
                          page: pagination.page - 1,
                        })
                      }
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPagination({
                          ...pagination,
                          page: pagination.page + 1,
                        })
                      }
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {!loading && history.length === 0 && (
                <div className="text-center p-8 text-gray-500">
                  {error || "No transaction history found"}
                </div>
              )}
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && issuedBookDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-green-600 mb-2">
                    Book Issued Successfully!
                  </h3>
                  <p className="text-gray-600">
                    The book has been successfully issued to the borrower.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Book Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">ACCNO:</span>{" "}
                        {issuedBookDetails.ACCNO}
                      </div>
                      <div>
                        <span className="font-medium">Title:</span>{" "}
                        {issuedBookDetails.bookTitle}
                      </div>
                      <div>
                        <span className="font-medium">Author:</span>{" "}
                        {issuedBookDetails.author}
                      </div>
                      <div>
                        <span className="font-medium">Publisher:</span>{" "}
                        {issuedBookDetails.publisher}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Borrower Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span>{" "}
                        {issuedBookDetails.borrowerName}
                      </div>
                      <div>
                        <span className="font-medium">ID:</span>{" "}
                        {issuedBookDetails.borrowerId}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>{" "}
                        {issuedBookDetails.borrowerType}
                      </div>
                      <div>
                        <span className="font-medium">Department:</span>{" "}
                        {issuedBookDetails.department}
                      </div>
                      {issuedBookDetails.borrowerType === "student" && (
                        <>
                          <div>
                            <span className="font-medium">Course:</span>{" "}
                            {issuedBookDetails.course}
                          </div>
                          <div>
                            <span className="font-medium">Semester:</span>{" "}
                            {issuedBookDetails.semester}
                          </div>
                        </>
                      )}
                      {issuedBookDetails.borrowerType === "faculty" && (
                        <div>
                          <span className="font-medium">Designation:</span>{" "}
                          {issuedBookDetails.designation}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Issue Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Issue Date:</span>{" "}
                        {issuedBookDetails.issueDate}
                      </div>
                      <div>
                        <span className="font-medium">Due Date:</span>{" "}
                        {issuedBookDetails.dueDate}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {issuedBookDetails.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        {issuedBookDetails.phone}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      setIssuedBookDetails(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      ></path>
                    </svg>
                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Return Success Modal */}
          {showReturnModal && returnBookDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-blue-600 mb-2">
                    Book Returned Successfully!
                  </h3>
                  <p className="text-gray-600">
                    The book has been successfully returned by the borrower.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Book Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">ACCNO:</span>{" "}
                        {returnBookDetails.ACCNO}
                      </div>
                      <div>
                        <span className="font-medium">Title:</span>{" "}
                        {returnBookDetails.bookTitle}
                      </div>
                      <div>
                        <span className="font-medium">Author:</span>{" "}
                        {returnBookDetails.author}
                      </div>
                      <div>
                        <span className="font-medium">Publisher:</span>{" "}
                        {returnBookDetails.publisher}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Borrower Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span>{" "}
                        {returnBookDetails.borrowerName}
                      </div>
                      <div>
                        <span className="font-medium">ID:</span>{" "}
                        {returnBookDetails.borrowerId}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>{" "}
                        {returnBookDetails.borrowerType}
                      </div>
                      <div>
                        <span className="font-medium">Department:</span>{" "}
                        {returnBookDetails.department}
                      </div>
                      {returnBookDetails.borrowerType === "student" && (
                        <>
                          <div>
                            <span className="font-medium">Course:</span>{" "}
                            {returnBookDetails.course}
                          </div>
                          <div>
                            <span className="font-medium">Semester:</span>{" "}
                            {returnBookDetails.semester}
                          </div>
                        </>
                      )}
                      {returnBookDetails.borrowerType === "faculty" && (
                        <div>
                          <span className="font-medium">Designation:</span>{" "}
                          {returnBookDetails.designation}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Return Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Issue Date:</span>{" "}
                        {returnBookDetails.issueDate}
                      </div>
                      <div>
                        <span className="font-medium">Return Date:</span>{" "}
                        {returnBookDetails.returnDate}
                      </div>
                      <div>
                        <span className="font-medium">Days Borrowed:</span>{" "}
                        {returnBookDetails.daysBorrowed}
                      </div>
                      {returnBookDetails.fineAmount > 0 && (
                        <div>
                          <span className="font-medium text-red-600">
                            Fine Amount:
                          </span>{" "}
                          ₹{returnBookDetails.fineAmount}
                        </div>
                      )}
                      {returnBookDetails.fineAmount === 0 && (
                        <div>
                          <span className="font-medium text-green-600">
                            Status:
                          </span>{" "}
                          No Fine
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReturnModal(false);
                      setReturnBookDetails(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      ></path>
                    </svg>
                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Renewal Success Modal */}
          {showRenewSuccessModal && renewedBookDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-green-600 mb-2">
                    Book Renewed Successfully!
                  </h3>
                  <p className="text-gray-600">
                    The book has been successfully renewed with a new due date.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Book Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">ACCNO:</span>{" "}
                        {renewedBookDetails.ACCNO}
                      </div>
                      <div>
                        <span className="font-medium">Title:</span>{" "}
                        {renewedBookDetails.bookTitle}
                      </div>
                      <div>
                        <span className="font-medium">Author:</span>{" "}
                        {renewedBookDetails.author}
                      </div>
                      <div>
                        <span className="font-medium">Publisher:</span>{" "}
                        {renewedBookDetails.publisher}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Borrower Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span>{" "}
                        {renewedBookDetails.borrowerName}
                      </div>
                      <div>
                        <span className="font-medium">ID:</span>{" "}
                        {renewedBookDetails.borrowerId}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>{" "}
                        {renewedBookDetails.borrowerType}
                      </div>
                      <div>
                        <span className="font-medium">Department:</span>{" "}
                        {renewedBookDetails.department}
                      </div>
                      {renewedBookDetails.borrowerType === "student" && (
                        <>
                          <div>
                            <span className="font-medium">Course:</span>{" "}
                            {renewedBookDetails.course}
                          </div>
                          <div>
                            <span className="font-medium">Semester:</span>{" "}
                            {renewedBookDetails.semester}
                          </div>
                        </>
                      )}
                      {renewedBookDetails.borrowerType === "faculty" && (
                        <div>
                          <span className="font-medium">Designation:</span>{" "}
                          {renewedBookDetails.designation}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Renewal Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Previous Due Date:</span>{" "}
                        {renewedBookDetails.oldDueDate}
                      </div>
                      <div>
                        <span className="font-medium">New Due Date:</span>{" "}
                        {renewedBookDetails.newDueDate}
                      </div>
                      <div>
                        <span className="font-medium">Total Renewals:</span>{" "}
                        {renewedBookDetails.renewCount}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {renewedBookDetails.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        {renewedBookDetails.phone}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRenewSuccessModal(false);
                      setRenewedBookDetails(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
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
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      ></path>
                    </svg>
                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookActions;
