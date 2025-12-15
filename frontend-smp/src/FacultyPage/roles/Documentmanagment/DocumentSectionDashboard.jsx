import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { jsPDF } from "jspdf";

// Update these paths as needed
const LOGO_URL = "/logo.png";
const LOGO1_URL = "/logo1.png";

// Utility to load images for jsPDF
const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });

const numberToWords = (num) => {
  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const thousands = ["", "Thousand"];
  if (num === 0) return "Zero";
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100)
    return `${tens[Math.floor(num / 10)]} ${units[num % 10]}`.trim();
  if (num < 1000)
    return `${units[Math.floor(num / 100)]} Hundred ${
      num % 100 === 0 ? "" : numberToWords(num % 100)
    }`.trim();
  if (num < 10000)
    return `${numberToWords(Math.floor(num / 1000))} ${thousands[1]} ${
      num % 1000 === 0 ? "" : numberToWords(num % 1000)
    }`.trim();
  return num.toString();
};

const dateToWords = (dateStr) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Not Provided";
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${numberToWords(day)} ${month} ${numberToWords(year)}`;
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Not Provided";
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .split("/")
    .join("/");
};

const DocumentManagementDashboard = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [errors, setErrors] = useState({});
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState({
    username: "Faculty User",
    role: "Document Section",
  });
  const [authError, setAuthError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [certificatePreview, setCertificatePreview] = useState(null);
  const [certificateYear, setCertificateYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

  // Authentication helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem("facultyToken");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("facultyToken");
    if (!storedToken) {
      setAuthError("No authentication token found");
      navigate("/");
      return;
    }
    setToken(storedToken);
    setTimeout(() => {
      setUser({ username: "Faculty User", role: "Document Section" });
    }, 1000);
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};

    // Check if enrollment number is provided
    const hasEnrollment = enrollmentNumber.trim();

    // Check if both first and last names are provided
    const hasFirstName = firstName.trim();
    const hasLastName = lastName.trim();
    const hasBothNames = hasFirstName && hasLastName;

    // Validation: Either enrollment number OR both names must be provided
    if (!hasEnrollment && !hasBothNames) {
      if (!hasFirstName) {
        newErrors.firstName =
          "First Name is required when Enrollment Number is not provided";
      }
      if (!hasLastName) {
        newErrors.lastName =
          "Last Name is required when Enrollment Number is not provided";
      }
      if (!hasEnrollment) {
        newErrors.enrollmentNumber =
          "Enrollment Number is required when First Name and Last Name are not provided";
      }
      // Add a general error message
      newErrors.general =
        "Please provide either: (First Name + Last Name) OR Enrollment Number";
    }

    // Validate enrollment number format if provided
    if (hasEnrollment && !/^[0-9]+$/.test(enrollmentNumber)) {
      newErrors.enrollmentNumber = "Enrollment Number must be numeric";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchStudentData = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      // Prepare search parameters based on what's provided
      const params = {};

      if (enrollmentNumber.trim()) {
        // Search by enrollment number only
        params.enrollmentNumber = enrollmentNumber.trim();
      } else if (firstName.trim() && lastName.trim()) {
        // Search by first name and last name
        params.firstName = firstName.trim();
        params.lastName = lastName.trim();
      }

      const res = await axios.get(
        "http://localhost:4000/api/superadmin/students",
        {
          params,
          headers: getAuthHeaders(),
        }
      );

      if (res.data && res.data.length > 0) {
        setStudentData(res.data[0]);
      } else {
        const searchMethod = enrollmentNumber.trim()
          ? "enrollment number"
          : "first and last name";
        setErrors({
          api: `No student found with the provided ${searchMethod}`,
        });
        setStudentData(null);
      }
    } catch (err) {
      setStudentData(null);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/");
        return;
      }
      if (err.response) {
        setErrors({
          api: err.response.data.error || "Failed to fetch student data",
        });
      } else if (err.request) {
        setErrors({ api: "Network error: Unable to connect to the server" });
      } else {
        setErrors({ api: "An unexpected error occurred" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (validateForm()) fetchStudentData();
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setEnrollmentNumber("");
    setStudentData(null);
    setErrors({});
    setCertificatePreview(null);
    setCertificateYear(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  };

  const handlePreviewCertificate = async () => {
    if (!studentData) {
      alert("Please select a student first.");
      return;
    }
    try {
      const studentRes = await axios.get(
        `http://localhost:4000/api/superadmin/students/${studentData._id}`,
        {
          headers: getAuthHeaders(),
        }
      );
      const student = studentRes.data;
      const certificateData = {
        studentName: `${student.firstName} ${student.middleName || ""} ${
          student.lastName
        }`.trim(),
        course: `${student.stream?.name || "B.Tech"} in ${
          student.department?.name || "Engineering"
        }`,
        semesterNumber: student.semester?.number || "",
        year: student.semester?.number
          ? Math.ceil(student.semester.number / 2)
          : "",
        session: certificateYear,
        dateOfBirth: student.dateOfBirth
          ? new Date(student.dateOfBirth).toLocaleDateString("en-GB")
          : "",
        dateOfBirthWords: student.dateOfBirth
          ? dateToWords(student.dateOfBirth)
          : "",
        conduct: "good moral character",
        dateOfIssue: new Date().toLocaleDateString("en-GB"),
      };
      setCertificatePreview(certificateData);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/");
        return;
      }
      setErrors({
        api: `Failed to generate preview: ${
          err.response?.data?.error || err.message
        }`,
      });
    }
  };

  const handleDownloadCertificate = async () => {
    if (!studentData) {
      alert("Please select a student first.");
      return;
    }
    if (!studentData._id || !/^[0-9a-fA-F]{24}$/.test(studentData._id)) {
      alert("Invalid student ID. Please fetch student data again.");
      return;
    }

    let certificateData;
    try {
      certificateData = {
        studentName: `${studentData.firstName} ${
          studentData.middleName || ""
        } ${studentData.lastName}`.trim(),
        course: `${studentData.stream?.name || "B.Tech"} in ${
          studentData.department?.name || "Engineering"
        }`,
        semesterNumber: studentData.semester?.number || "",
        year: studentData.semester?.number
          ? Math.ceil(studentData.semester.number / 2)
          : "",
        session: certificateYear,
        dateOfBirth: studentData.dateOfBirth
          ? new Date(studentData.dateOfBirth).toLocaleDateString("en-GB")
          : "",
        dateOfBirthWords: studentData.dateOfBirth
          ? dateToWords(studentData.dateOfBirth)
          : "",
        conduct: "good moral character",
        dateOfIssue: new Date().toLocaleDateString("en-GB"),
      };

      // First try to register the certificate with the backend
      try {
        await axios.post(
          `http://localhost:4000/api/superadmin/students/generate-certificate/${studentData._id}`,
          {
            type: "BC",
            purpose: "Academic purpose",
            data: certificateData,
          },
          {
            headers: getAuthHeaders(),
          }
        );
      } catch (apiErr) {
        if (apiErr.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }
        console.warn(
          "⚠️ Backend certificate registration failed:",
          apiErr.response?.data?.error || apiErr.message
        );
        // Continue with PDF generation even if backend fails
      }

      // Generate PDF certificate
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const marginLeft = 25;
      const marginRight = 25;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - marginLeft - marginRight;
      let y = 10;

      try {
        const logoImg = await loadImage(LOGO_URL);
        if (logoImg.width > 0) {
          doc.addImage(logoImg, "PNG", marginLeft, y, 25, 25);
        }
      } catch {}
      try {
        const logo1Img = await loadImage(LOGO1_URL);
        if (logo1Img.width > 0) {
          doc.addImage(
            logo1Img,
            "PNG",
            pageWidth - marginRight - 25,
            y,
            23,
            23
          );
        }
      } catch {}

      doc.setFontSize(8).setFont("Helvetica", "normal");
      doc.text("maitrey education society", pageWidth / 2, y + 3, {
        align: "center",
      });
      doc.setFontSize(25).setFont("Helvetica", "bold");
      doc.text("NAGARJUNA", pageWidth / 2, y + 12, { align: "center" });
      y += 23;
      doc.setFontSize(14).setFont("Helvetica", "normal");
      doc.text(
        "Institute of Engineering, Technology & Management",
        pageWidth / 2,
        y - 3,
        { align: "center" }
      );
      y += 6;
      doc.setFontSize(12).setFont("Helvetica", "normal");
      const affiliation =
        "(AICTE, DTE Approved & Affiliated to R.T.M. Nagpur University, Nagpur)";
      const affiliationLines = doc.splitTextToSize(
        affiliation,
        contentWidth - 20
      );
      doc.text(affiliationLines, pageWidth / 2, y - 2, { align: "center" });
      y += affiliationLines.length * 4;
      doc.text(
        "Village Satnavri, Amravati Road, Nagpur 440023",
        pageWidth / 2,
        y - 2,
        { align: "center" }
      );
      y += 4;
      doc.text(
        "Email: maitrey.ngp@gmail.com | Website: www.nietm.in | Phone: 07118 322211, 12",
        pageWidth / 2,
        y - 2,
        { align: "center" }
      );
      y += 8;
      doc.setLineWidth(0.5);
      doc.line(marginLeft + 5, y, pageWidth - marginRight - 5, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`Ref No.: NIETM / 2025-26`, marginLeft, y);
      doc.text(
        `Date: ${certificateData.dateOfIssue}`,
        pageWidth - marginRight - 50,
        y
      );
      y += 15;
      const titleWidth = 70;
      const titleX = (pageWidth - titleWidth) / 2;
      doc.setLineWidth(0.2);
      doc.roundedRect(titleX, y, titleWidth, 10, 2, 2, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("BONAFIDE CERTIFICATE", pageWidth / 2, y + 7, {
        align: "center",
      });
      y += 40;

      // Certificate content with bold formatting for important details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const gender = studentData?.gender || "Male";
      const isFemalePronoun = gender.toLowerCase() === "female";
      const heShe = isFemalePronoun ? "she" : "he";
      const hisHer = isFemalePronoun ? "her" : "his";
      const studentTitle = isFemalePronoun ? "Ku." : "Shri";

      // Build the certificate text with proper spacing and formatting
      const lineHeight = 14;
      const maxLineWidth = contentWidth - 15; // Leave more margin for better justification

      // Create text segments with bold formatting
      const textSegments = [
        { text: "Certified that   ", bold: false },
        { text: `${studentTitle}  ${certificateData.studentName}  `, bold: true },
        {
          text: " is a bonafide student of this college studying in ",
          bold: false,
        },
        { text: certificateData.course, bold: true },
        {
          text: ` ${certificateData.year}   Year in ${certificateData.semesterNumber}   Sem in the session `,
          bold: false,
        },
        { text: certificateData.session, bold: true },
        {
          text: `. According to our college record ${hisHer} date of birth is `,
          bold: false,
        },
        { text: certificateData.dateOfBirth, bold: true },
        { text: `. As far as known to me ${heShe} bears `, bold: false },
        { text: certificateData.conduct, bold: true },
        { text: ".", bold: false },
      ];

      // Function to render justified text with proper word spacing
      const renderJustifiedText = () => {
        // Combine all segments into words with formatting info
        let allWords = [];
        
        textSegments.forEach(segment => {
          const words = segment.text.trim().split(/\s+/).filter(word => word);
          words.forEach(word => {
            allWords.push({ text: word, bold: segment.bold });
          });
        });

        let lines = [];
        let currentLine = [];
        let currentLineWidth = 0;
        
        // Build lines by fitting words
        for (let i = 0; i < allWords.length; i++) {
          const word = allWords[i];
          
          // Set font to measure width correctly
          doc.setFont("helvetica", word.bold ? "bold" : "normal");
          const wordWidth = doc.getTextWidth(word.text);
          const spaceWidth = doc.getTextWidth(" ");
          
          // Check if word fits on current line
          const wordWithSpaceWidth = currentLine.length > 0 ? wordWidth + spaceWidth : wordWidth;
          
          if (currentLineWidth + wordWithSpaceWidth <= maxLineWidth) {
            currentLine.push(word);
            currentLineWidth += wordWithSpaceWidth;
          } else {
            // Start new line
            if (currentLine.length > 0) {
              lines.push({ words: currentLine, width: currentLineWidth });
            }
            currentLine = [word];
            currentLineWidth = wordWidth;
          }
        }
        
        // Add the last line
        if (currentLine.length > 0) {
          lines.push({ words: currentLine, width: currentLineWidth });
        }

        // Render justified lines
        let currentY = y;
        
        lines.forEach((line, lineIndex) => {
          const isLastLine = lineIndex === lines.length - 1;
          let currentX = marginLeft;
          
          if (line.words.length === 1 || isLastLine) {
            // Single word or last line - no justification needed
            line.words.forEach((word, wordIndex) => {
              doc.setFont("helvetica", word.bold ? "bold" : "normal");
              doc.text(word.text, currentX, currentY);
              currentX += doc.getTextWidth(word.text);
              
              if (wordIndex < line.words.length - 1) {
                currentX += doc.getTextWidth(" ");
              }
            });
          } else {
            // Justify line by distributing extra space
            const totalWordWidth = line.words.reduce((sum, word) => {
              doc.setFont("helvetica", word.bold ? "bold" : "normal");
              return sum + doc.getTextWidth(word.text);
            }, 0);
            
            const extraSpace = maxLineWidth - totalWordWidth;
            const spacesBetweenWords = line.words.length - 1;
            const spaceBetweenWords = spacesBetweenWords > 0 ? extraSpace / spacesBetweenWords : 0;
            
            line.words.forEach((word, wordIndex) => {
              doc.setFont("helvetica", word.bold ? "bold" : "normal");
              doc.text(word.text, currentX, currentY);
              currentX += doc.getTextWidth(word.text);
              
              if (wordIndex < line.words.length - 1) {
                currentX += spaceBetweenWords;
              }
            });
          }
          
          currentY += lineHeight;
        });
        
        return currentY;
      };
      
      // Render the justified text
      const finalY = renderJustifiedText();

      // Add extra spacing after the main paragraph
      const signatureY = finalY + lineHeight * 3;

      const currentDate = formatDate(new Date());
      doc.text(`Date: ${currentDate}`, marginLeft, signatureY + 20);
      doc.text("Checked by", pageWidth / 2 - 10, signatureY + 20);
      doc.text(
        "Principal/Vice-Principal",
        pageWidth - marginRight - 2,
        signatureY + 19.8,
        { align: "right" }
      );
      doc.save(`BC_${studentData._id}_${Date.now()}.pdf`);
      alert("Bonafide Certificate downloaded successfully!");
    } catch (err) {
      setErrors({
        api: `Failed to generate BC certificate: ${err.message}`,
      });
    }
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setFirstName("");
    setLastName("");
    setEnrollmentNumber("");
    setStudentData(null);
    setErrors({});
    setCertificatePreview(null);
    navigate("/");
  };

  if (!user && !authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Loading Dashboard
          </h3>
          <p className="text-gray-600">
            Please wait while we set up your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Main Container */}
      <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-6">
            {user && (
              <div className="p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-blue-100">
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                        Document Management
                      </h1>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Welcome,</span>
                        <span className="font-semibold text-blue-600">
                          {user.username}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 rounded-xl font-medium shadow-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm transition-all duration-200 hover:shadow-md"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}

            {authError && (
              <div className="mx-6 mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
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
                  {authError}
                </div>
              </div>
            )}
          </div>

          {/* Search Form Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-6">
            <div className="p-6 lg:p-8">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white mr-4">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Student Search
                </h2>
              </div>

              {/* Instructions */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-2">Search Options:</p>
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Option 1:</span> Enter
                        both First Name and Last Name
                      </p>
                      <p>
                        <span className="font-medium">Option 2:</span> Enter
                        Enrollment Number only
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      className="flex items-center text-sm font-semibold text-gray-700"
                      htmlFor="firstName"
                    >
                      <svg
                        className="w-4 h-4 mr-2 text-gray-500"
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
                      First Name
                      {!enrollmentNumber.trim() && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={enrollmentNumber.trim() !== ""}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        enrollmentNumber.trim() !== ""
                          ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                          : errors.firstName
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-300"
                      } focus:outline-none focus:ring-4 bg-white placeholder-gray-400`}
                      placeholder="Enter first name"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
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
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      className="flex items-center text-sm font-semibold text-gray-700"
                      htmlFor="lastName"
                    >
                      <svg
                        className="w-4 h-4 mr-2 text-gray-500"
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
                      Last Name
                      {!enrollmentNumber.trim() && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={enrollmentNumber.trim() !== ""}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        enrollmentNumber.trim() !== ""
                          ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                          : errors.lastName
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-300"
                      } focus:outline-none focus:ring-4 bg-white placeholder-gray-400`}
                      placeholder="Enter last name"
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
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
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* OR Divider */}
                <div className="flex items-center">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="px-4 text-sm font-medium text-gray-500 bg-white">
                    OR
                  </span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>

                {/* Enrollment Number */}
                <div className="space-y-2">
                  <label
                    className="flex items-center text-sm font-semibold text-gray-700"
                    htmlFor="enrollment"
                  >
                    <svg
                      className="w-4 h-4 mr-2 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Enrollment Number
                    {!firstName.trim() && !lastName.trim() && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="enrollment"
                    value={enrollmentNumber}
                    onChange={(e) => setEnrollmentNumber(e.target.value)}
                    disabled={firstName.trim() !== "" || lastName.trim() !== ""}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                      firstName.trim() !== "" || lastName.trim() !== ""
                        ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                        : errors.enrollmentNumber
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-300"
                    } focus:outline-none focus:ring-4 bg-white placeholder-gray-400`}
                    placeholder="Enter enrollment number"
                  />
                  {errors.enrollmentNumber && (
                    <p className="text-red-500 text-sm flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
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
                      {errors.enrollmentNumber}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className={`flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      isLoading
                        ? "bg-blue-300 cursor-not-allowed text-blue-100"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-100"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        Search Student
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
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
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Clear Form
                  </button>
                </div>
              </div>

              {/* Error Messages */}
              {errors.general && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center text-red-700">
                    <svg
                      className="w-5 h-5 mr-2"
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
                    {errors.general}
                  </div>
                </div>
              )}

              {errors.api && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center text-red-700">
                    <svg
                      className="w-5 h-5 mr-2"
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
                    {errors.api}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student Details Section */}
          {studentData && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-6">
              <div className="p-6 lg:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white mr-4">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Student Information
                  </h2>
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Found
                    </span>
                  </div>
                </div>

                {/* Student Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Personal Information */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
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
                      Personal Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          First Name:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.firstName || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Middle Name:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.middleName || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Last Name:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.lastName || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Full Name:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {`${studentData.firstName || ""} ${
                            studentData.middleName || ""
                          } ${studentData.lastName || ""}`
                            .replace(/\s+/g, " ")
                            .trim() || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Gender:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.gender || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Date of Birth:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.dateOfBirth
                            ? formatDate(studentData.dateOfBirth)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Place of Birth:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.placeOfBirth || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Nationality:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.nationality || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                    <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
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
                      Academic Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Enrollment Number:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.enrollmentNumber || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Student ID:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.studentId || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Stream:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.stream?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Department:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.department?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Semester:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.semester?.number || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Section:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.section || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Admission Date:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.admissionDate
                            ? formatDate(studentData.admissionDate)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span
                          className={`text-sm font-medium px-2 py-1 rounded ${
                            studentData.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {studentData.status || "Active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Family Information */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                    <h3 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
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
                      Contact & Family
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Mobile Number:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.mobileNumber || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.email || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Father Name:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.fatherName || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Mother Name:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.motherName || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Caste Category:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.casteCategory || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Sub Caste:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.subCaste || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Admission Type:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.admissionType || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Admission Through:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {studentData.admissionThrough || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Records */}
                {(studentData.semesterRecords?.length > 0 ||
                  studentData.backlogs?.length > 0 ||
                  studentData.subjects?.length > 0) && (
                  <div className="mt-8 space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Academic Records
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Semester Records */}
                      {studentData.semesterRecords?.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                          <h4 className="font-semibold text-gray-800 mb-3">
                            Semester Records
                          </h4>
                          <div className="space-y-3">
                            {studentData.semesterRecords.map(
                              (record, index) => (
                                <div
                                  key={index}
                                  className="bg-white rounded-lg p-3 border border-gray-100"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      Semester:{" "}
                                      {record.semester?.number ||
                                        record.semester ||
                                        "N/A"}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-1 rounded ${
                                        record.isBacklog
                                          ? "bg-red-100 text-red-800"
                                          : "bg-green-100 text-green-800"
                                      }`}
                                    >
                                      {record.isBacklog ? "Backlog" : "Clear"}
                                    </span>
                                  </div>
                                  {record.subjects?.length > 0 && (
                                    <div className="space-y-1">
                                      {record.subjects.map((sub, subIndex) => (
                                        <div
                                          key={subIndex}
                                          className="text-xs text-gray-600"
                                        >
                                          <span className="font-medium">
                                            {sub.subject?.name ||
                                              sub.subject?.subjectCode ||
                                              "N/A"}
                                          </span>
                                          {sub.marks && (
                                            <span> - {sub.marks} marks</span>
                                          )}
                                          {sub.status && (
                                            <span> ({sub.status})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Backlogs */}
                      {studentData.backlogs?.length > 0 && (
                        <div className="bg-red-50 rounded-xl p-5 border border-red-200">
                          <h4 className="font-semibold text-red-800 mb-3">
                            Current Backlogs
                          </h4>
                          <div className="space-y-2">
                            {studentData.backlogs.map((backlog, index) => (
                              <div
                                key={index}
                                className="bg-white rounded-lg p-3 border border-red-100"
                              >
                                <div className="text-sm">
                                  <span className="font-medium text-gray-800">
                                    {backlog.subject?.name ||
                                      backlog.subject?.subjectCode ||
                                      "Not Provided"}
                                  </span>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Semester:{" "}
                                    {backlog.semester?.number || "Not Provided"}{" "}
                                    | Status: {backlog.status || "Not Provided"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Current Subjects */}
                    {studentData.subjects?.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3">
                          Current Subjects
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {studentData.subjects.map((subject, index) => (
                            <div
                              key={index}
                              className="bg-white rounded-lg px-3 py-2 border border-blue-100"
                            >
                              <span className="text-sm text-gray-800">
                                {subject?.name || subject?.subjectCode || "Not Provided"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Information */}
                {(studentData.remark ||
                  studentData.unicodeName ||
                  studentData.unicodeFatherName ||
                  studentData.unicodeMotherName ||
                  studentData.schoolAttended ||
                  studentData.nameOfInstitute) && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Additional Information
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {studentData.unicodeName && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Unicode Name:
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {studentData.unicodeName}
                            </span>
                          </div>
                        )}
                        {studentData.unicodeFatherName && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Unicode Father Name:
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {studentData.unicodeFatherName}
                            </span>
                          </div>
                        )}
                        {studentData.unicodeMotherName && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Unicode Mother Name:
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {studentData.unicodeMotherName}
                            </span>
                          </div>
                        )}
                        {studentData.schoolAttended && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              School Attended:
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {studentData.schoolAttended}
                            </span>
                          </div>
                        )}
                        {studentData.nameOfInstitute && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Name of Institute:
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {studentData.nameOfInstitute}
                            </span>
                          </div>
                        )}
                        {studentData.remark && (
                          <div className="col-span-1 md:col-span-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                Remark:
                              </span>
                              <span className="text-sm font-medium text-gray-800">
                                {studentData.remark}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Certificate Year Block */}
                {studentData && (
                  <div className="mt-6">
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Certificate Year
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            value={certificateYear}
                            onChange={(e) => setCertificateYear(e.target.value)}
                            placeholder="2020-2021"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This year will be displayed on the certificate
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Certificate Actions */}
          {studentData && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-6">
              <div className="p-6 lg:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white mr-4">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Certificate Actions
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handlePreviewCertificate}
                    className="group flex items-center justify-center px-6 py-4 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                  >
                    <svg
                      className="w-5 h-5 mr-3 group-hover:animate-pulse"
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
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Preview Certificate
                  </button>

                  <button
                    onClick={handleDownloadCertificate}
                    className="group flex items-center justify-center px-6 py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                  >
                    <svg
                      className="w-5 h-5 mr-3 group-hover:animate-bounce"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download Certificate
                  </button>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">
                        Certificate Information:
                      </p>
                      <p>
                        • Preview allows you to review the certificate details
                        before downloading
                      </p>
                      <p>
                        • Download generates a PDF certificate with official
                        formatting
                      </p>
                      <p>
                        • The certificate is automatically registered with the
                        backend system
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Certificate Preview */}
          {certificatePreview && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-6">
              <div className="p-6 lg:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white mr-4">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Certificate Preview
                  </h2>
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      <svg
                        className="w-4 h-4 mr-1"
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
                      </svg>
                      Preview
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                    Bonafide Certificate Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Student Name:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.studentName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Course:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.course}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Semester:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.semesterNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Year:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.year}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Session:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.session}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Date of Birth:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.dateOfBirth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          DOB (Words):
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.dateOfBirthWords}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Conduct:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.conduct}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Issue Date:
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {certificatePreview.dateOfIssue}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentManagementDashboard;