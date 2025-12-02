import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BookOpen,
  TrendingUp,
  UserCheck,
  ChevronLeft,
  RefreshCw,
  User,
  School,
  GraduationCap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const CCClassStudents = ({ userData }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedCaste, setSelectedCaste] = useState("all");
  const [selectedSubCaste, setSelectedSubCaste] = useState("all");
  const [selectedScholarshipStatus, setSelectedScholarshipStatus] = useState("all");
  const [stats, setStats] = useState({
    totalStudents: 0,
    averageAttendance: 0,
    activeStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
  });
  const [ccAssignment, setCcAssignment] = useState(null);

  // Available caste categories for filtering
  const casteCategories = [
    "General",
    "OBC",
    "SC",
    "ST",
    "EWS",
    "Not Specified",
  ];

  useEffect(() => {
    fetchCCClassStudents();
  }, [userData]);

  const fetchCCClassStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token) {
        console.error("No auth token found");
        return;
      }

      // First, get CC assignment details
      console.log("Fetching CC assignment for user:", {
        id: userData._id,
        department: userData.department,
        role: userData.role
      });

      const ccResponse = await fetch(
        `http://erpbackend.tarstech.in/api/cc/my-cc-assignments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!ccResponse.ok) {
        console.error("Failed to fetch CC assignment:", ccResponse.status);
        return;
      }

      const ccData = await ccResponse.json();
      console.log("CC Assignment API Response:", ccData);

      if (ccData.success && ccData.data && ccData.data.ccAssignments && ccData.data.ccAssignments.length > 0) {
        const assignment = ccData.data.ccAssignments[0]; // Get first assignment
        setCcAssignment(assignment);
        console.log("CC Assignment found:", assignment);

        // Try the department endpoint with attendance data first (provides real attendance)
        console.log("Fetching students for semester filtering");
        console.log("Assignment details:", {
          department: assignment.department,
          semester: assignment.semester,
          year: assignment.year,
          section: assignment.section
        });
        
        let studentsResponse = null;
        
        // Try the attendance endpoint first for real attendance data
        try {
          console.log("Trying Mechancial department with attendance endpoint");
          studentsResponse = await axios.get(
            `http://erpbackend.tarstech.in/api/faculty/students-attendance/department/Mechancial`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          console.log("✓ Successfully fetched from Mechancial department with attendance");
        } catch (error) {
          console.log("✗ Mechancial attendance endpoint failed, trying regular endpoint");
          
          // Fallback to regular department endpoint
          studentsResponse = await axios.get(
            `http://erpbackend.tarstech.in/api/faculty/students/department/Mechancial`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          console.log("✓ Successfully fetched from Mechancial department (fallback)");
        }
        
        if (!studentsResponse) {
          throw new Error("Could not fetch students from any endpoint");
        }

        // Handle different response formats from different endpoints
        let allStudents = [];
        
        if (studentsResponse.data.success && studentsResponse.data.data) {
          // Attendance endpoint response
          allStudents = studentsResponse.data.data.students || studentsResponse.data.data || [];
        } else if (studentsResponse.data.students) {
          allStudents = studentsResponse.data.students;
        } else if (Array.isArray(studentsResponse.data)) {
          allStudents = studentsResponse.data;
        } else if (studentsResponse.data.success && studentsResponse.data.data) {
          allStudents = studentsResponse.data.data;
        }
        
        console.log("Students API Response:", studentsResponse.data);
        console.log("All students fetched:", allStudents.length);

            // Filter students by CC assignment criteria (semester only)
            console.log("Starting semester filtering...");
            console.log("Assignment details:", {
              semester: assignment.semester,
              year: assignment.year,
              section: assignment.section,
              department: assignment.department
            });
            console.log("Sample students (first 5):", allStudents.slice(0, 5).map(s => ({
              name: s.name || `${s.firstName} ${s.lastName}`,
              semester: s.semester,
              year: s.year,
              section: s.section,
              department: s.department
            })));
            
            const filteredStudents = allStudents.filter((student, index) => {
              // Extract semester number from student object
              let studentSemesterNumber = null;
              if (student.semester && typeof student.semester === 'object' && student.semester.number) {
                studentSemesterNumber = student.semester.number;
              } else if (student.semester && typeof student.semester === 'string') {
                studentSemesterNumber = parseInt(student.semester);
              } else if (student.semester && typeof student.semester === 'number') {
                studentSemesterNumber = student.semester;
              } else if (student.year) {
                studentSemesterNumber = student.year;
              }
              
              // Extract assignment semester number
              let assignmentSemesterNumber = null;
              if (assignment.semester && typeof assignment.semester === 'object' && assignment.semester.number) {
                assignmentSemesterNumber = assignment.semester.number;
              } else if (assignment.semester && typeof assignment.semester === 'string') {
                assignmentSemesterNumber = parseInt(assignment.semester);
              } else if (assignment.semester && typeof assignment.semester === 'number') {
                assignmentSemesterNumber = assignment.semester;
              } else if (assignment.year) {
                assignmentSemesterNumber = assignment.year;
              }
              
              // Match by semester number
              const semesterMatch = studentSemesterNumber === assignmentSemesterNumber;

              // Log first few students for debugging
              if (index < 10) {
                console.log(`Student ${index + 1} filter:`, {
                  name: student.name || `${student.firstName} ${student.lastName}`,
                  studentSemesterNumber: studentSemesterNumber,
                  assignmentSemesterNumber: assignmentSemesterNumber,
                  semesterMatch: semesterMatch,
                  rawStudentSemester: student.semester,
                  rawAssignmentSemester: assignment.semester,
                  studentYear: student.year,
                  assignmentYear: assignment.year
                });
              }

              return semesterMatch;
            });

            console.log(`Filtered ${filteredStudents.length} students from ${allStudents.length} total students`);

            // If no students match, show some for debugging purposes
            let finalStudents = filteredStudents;
            if (filteredStudents.length === 0 && allStudents.length > 0) {
              console.log("No students matched semester filter, showing first 5 for debugging:");
              finalStudents = allStudents;
              console.log("Debug students:", finalStudents.map(s => ({
                name: s.name || `${s.firstName} ${s.lastName}`,
                semester: s.semester,
                year: s.year,
                section: s.section,
                department: s.department
              })));
            }

            // Transform students to match the expected format
            const transformedStudents = finalStudents.map((student) => ({
              _id: student._id,
              name: student.name || `${student.firstName} ${student.lastName}`,
              email: student.email,
              enrollmentNumber: student.rollNumber || student.studentId || `${student.department}${student.year}${student.section}${student._id?.slice(-3)}`,
              semester: student.semester && typeof student.semester === 'object' 
                ? student.semester.number 
                : student.semester || student.year,
              year: student.semester && typeof student.semester === 'object' 
                ? Math.ceil(student.semester.number / 2) 
                : student.year || Math.ceil((student.semester || 1) / 2),
              section: student.section,
              department: student.department?.name || student.department,
              phone: student.contactNumber || student.mobileNumber,
              gender: student.gender,
              status: "active",
              attendancePercentage: student.attendance?.attendancePercentage || 0, // Real attendance data
              address: "N/A",
              caste: student.casteCategory || "Not Specified",
              subCaste: student.subCaste || "",
              scholarshipStatus: student.scholarship?.scholarshipStatus || "No"
            }));

            setStudents(transformedStudents);
            console.log("Transformed students for display:", transformedStudents);
            
            // Calculate real average attendance from student data
            const validAttendanceStudents = transformedStudents.filter(s => s.attendancePercentage > 0);
            const averageAttendance = validAttendanceStudents.length > 0 
              ? Math.round(validAttendanceStudents.reduce((sum, s) => sum + s.attendancePercentage, 0) / validAttendanceStudents.length)
              : 0;
            
            setStats({
              totalStudents: transformedStudents.length,
              averageAttendance: averageAttendance, // Real calculated average
              activeStudents: transformedStudents.filter((s) => s.status === "active").length,
              maleStudents: transformedStudents.filter((s) => s.gender === "Male").length || 0,
              femaleStudents: transformedStudents.filter((s) => s.gender === "Female").length || 0,
            });

            if (transformedStudents.length === 0) {
              console.log("No students found after filtering by semester");
            }
        } else {
          console.log("No CC assignment found for faculty");
          setStudents([]);
        }
      } catch (error) {
        console.error("Error fetching CC class students:", error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollmentNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(student.semester || student.year || "").toLowerCase().includes(searchTerm.toLowerCase());

    // Determine student semester as string (prefer student.semester, fallback to student.year)
    const studentSemesterStr = String(student.semester ?? student.year ?? "").toString();
    const matchesSemester = !filterSemester || studentSemesterStr === filterSemester;
    const matchesSection =
      !filterSection ||
      student.section?.toUpperCase() === filterSection.toUpperCase();
    const matchesStatus = !filterStatus || student.status === filterStatus;
    
    // Caste filtering
    const matchesCaste = selectedCaste === "all" || student.caste === selectedCaste;
    
    // Sub-caste filtering
    const matchesSubCaste = selectedSubCaste === "all" || 
      student.subCaste?.toLowerCase().includes(selectedSubCaste.toLowerCase());
    
    // Scholarship filtering
    const matchesScholarship = selectedScholarshipStatus === "all" || 
      student.scholarshipStatus === selectedScholarshipStatus;

    return matchesSearch && matchesSemester && matchesSection && matchesStatus && 
           matchesCaste && matchesSubCaste && matchesScholarship;
  });

  const exportToCSV = () => {
    const headers = [
      "Enrollment Number",
      "Name",
      "Email",
      "Phone",
      "Semester",
      "Section",
      "Department",
      "Gender",
      "Status",
      "Attendance %",
      "Address",
    ];

    const csvData = filteredStudents.map((student) => [
      student.enrollmentNumber || "",
      student.name || "",
      student.email || "",
      student.phone || "",
      student.semester || student.year || "",
      student.section || "",
      student.department || "",
      student.gender || "",
      student.status || "",
      student.attendancePercentage || "0",
      student.address || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CC_Class_Students_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return "text-green-600 bg-green-50";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const StatCard = ({ title, value, icon: Icon, color, description }) => (
    <div
      className={`${color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && (
            <p className="text-white/70 text-xs mt-1">{description}</p>
          )}
        </div>
        <div className="bg-white/20 p-3 rounded-lg">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
          <RefreshCw className="animate-spin text-indigo-600 mb-4" size={48} />
          <p className="text-gray-600 text-lg">Loading Class Students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/faculty-erp/cc-dashboard")}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  🎓 My Class Students
                </h1>
                <p className="text-gray-600 text-lg">
                  {ccAssignment ? (
                    <span>
                      CC Assignment: <span className="font-semibold text-indigo-600">
                        Semester {ccAssignment.semester && typeof ccAssignment.semester === 'object' 
                          ? ccAssignment.semester.number 
                          : ccAssignment.semester || ccAssignment.year} {ccAssignment.section} - {ccAssignment.department}
                      </span>
                    </span>
                  ) : (
                    `Students from your assigned class - ${userData?.department} Department`
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button
                onClick={fetchCCClassStudents}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {console.log("Rendering statistics cards with stats:", stats)}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
            description={ccAssignment ? `Sem ${ccAssignment.semester && typeof ccAssignment.semester === 'object' 
              ? ccAssignment.semester.number 
              : ccAssignment.semester || ccAssignment.year} ${ccAssignment.section}` : "In your class"}
          />
          <StatCard
            title="Active Students"
            value={stats.activeStudents}
            icon={UserCheck}
            color="bg-gradient-to-r from-green-500 to-green-600"
            description="Currently enrolled"
          />
          <StatCard
            title="Avg Attendance"
            value={`${stats.averageAttendance}%`}
            icon={TrendingUp}
            color="bg-gradient-to-r from-purple-500 to-purple-600"
            description="Class average"
          />
          <StatCard
            title="Male Students"
            value={stats.maleStudents}
            icon={User}
            color="bg-gradient-to-r from-cyan-500 to-cyan-600"
            description="Gender distribution"
          />
          <StatCard
            title="Female Students"
            value={stats.femaleStudents}
            icon={User}
            color="bg-gradient-to-r from-pink-500 to-pink-600"
            description="Gender distribution"
          />
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
              <option value="8">Semester 8</option>
            </select>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>
            <select
              value={selectedCaste}
              onChange={(e) => setSelectedCaste(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Castes</option>
              {casteCategories.map((caste) => (
                <option key={caste} value={caste}>
                  {caste}
                </option>
              ))}
            </select>
            <select
              value={selectedSubCaste}
              onChange={(e) => setSelectedSubCaste(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Sub-Castes</option>
              {/* <option value="yadav">Yadav</option>
              <option value="kumar">Kumar</option>
              <option value="sharma">Sharma</option>
              <option value="singh">Singh</option>
              <option value="gupta">Gupta</option>
              <option value="jha">Jha</option>
              <option value="thakur">Thakur</option>
              <option value="pandey">Pandey</option>
              <option value="mishra">Mishra</option>
              <option value="tiwari">Tiwari</option>
              <option value="verma">Verma</option>
              <option value="chauhan">Chauhan</option>
              <option value="patel">Patel</option>
              <option value="mehta">Mehta</option>
              <option value="agarwal">Agarwal</option>
              <option value="bansal">Bansal</option>
              <option value="jain">Jain</option>
              <option value="goyal">Goyal</option>
              <option value="mittal">Mittal</option>
              <option value="chopra">Chopra</option>
              <option value="khanna">Khanna</option>
              <option value="kapoor">Kapoor</option>
              <option value="malhotra">Malhotra</option>
              <option value="saxena">Saxena</option>
              <option value="trivedi">Trivedi</option>
              <option value="dubey">Dubey</option>
              <option value="bhattacharya">Bhattacharya</option>
              <option value="mukherjee">Mukherjee</option>
              <option value="banerjee">Banerjee</option>
              <option value="chatterjee">Chatterjee</option>
              <option value="das">Das</option>
              <option value="saha">Saha</option>
              <option value="roy">Roy</option>
              <option value="sen">Sen</option>
              <option value="dutta">Dutta</option>
              <option value="ghosh">Ghosh</option>
              <option value="mitra">Mitra</option>
              <option value="basu">Basu</option>
              <option value="chakraborty">Chakraborty</option>
              <option value="nair">Nair</option>
              <option value="pillai">Pillai</option>
              <option value="menon">Menon</option>
              <option value="iyer">Iyer</option>
              <option value="iyengar">Iyengar</option>
              <option value="shastri">Shastri</option>
              <option value="pandit">Pandit</option>
              <option value="joshi">Joshi</option>
              <option value="deshmukh">Deshmukh</option>
              <option value="kulkarni">Kulkarni</option>
              <option value="deshpande">Deshpande</option>
              <option value="bhat">Bhat</option>
              <option value="rao">Rao</option>
              <option value="naik">Naik</option>
              <option value="shetty">Shetty</option>
              <option value="gawde">Gawde</option>
              <option value="kamble">Kamble</option>
              <option value="jadhav">Jadhav</option>
              <option value="pawar">Pawar</option>
              <option value="more">More</option>
              <option value="salunkhe">Salunkhe</option>
              <option value="shinde">Shinde</option>
              <option value="patil">Patil</option>
              <option value="kale">Kale</option>
              <option value="mane">Mane</option>
              <option value="ghule">Ghule</option>
              <option value="dhage">Dhage</option>
              <option value="bhosale">Bhosale</option>
              <option value="kadam">Kadam</option>
              <option value="landge">Landge</option>
              <option value="shelke">Shelke</option>
              <option value="wagh">Wagh</option>
              <option value="ingale">Ingle</option>
              <option value="gaikwad">Gaikwad</option>
              <option value="mahale">Mahale</option>
              <option value="bagal">Bagal</option>
              <option value="chavan">Chavan</option>
              <option value="thorat">Thorat</option>
              <option value="kendre">Kendre</option>
              <option value="khandekar">Khandekar</option>
              <option value="kulkarni">Kulkarni</option>
              <option value="deshpande">Deshpande</option>
              <option value="bhat">Bhat</option>
              <option value="rao">Rao</option>
              <option value="naik">Naik</option>
              <option value="shetty">Shetty</option>
              <option value="gawde">Gawde</option>
              <option value="kamble">Kamble</option>
              <option value="jadhav">Jadhav</option>
              <option value="pawar">Pawar</option>
              <option value="more">More</option>
              <option value="salunkhe">Salunkhe</option>
              <option value="shinde">Shinde</option>
              <option value="patil">Patil</option>
              <option value="kale">Kale</option>
              <option value="mane">Mane</option>
              <option value="ghule">Ghule</option>
              <option value="dhage">Dhage</option>
              <option value="bhosale">Bhosale</option>
              <option value="kadam">Kadam</option>
              <option value="landge">Landge</option>
              <option value="shelke">Shelke</option>
              <option value="wagh">Wagh</option>
              <option value="ingale">Ingle</option>
              <option value="gaikwad">Gaikwad</option>
              <option value="mahale">Mahale</option>
              <option value="bagal">Bagal</option>
              <option value="chavan">Chavan</option>
              <option value="thorat">Thorat</option>
              <option value="kendre">Kendre</option>
              <option value="khandekar">Khandekar</option> */}
            </select>
            <select
              value={selectedScholarshipStatus}
              onChange={(e) => setSelectedScholarshipStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Scholarships</option>
              <option value="Yes">Scholarship Approved</option>
              <option value="No">No Scholarship</option>
            </select>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterSemester("");
                setFilterSection("");
                setFilterStatus("");
                setSelectedCaste("all");
                setSelectedSubCaste("all");
                setSelectedScholarshipStatus("all");
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <School className="h-6 w-6 text-indigo-600" />
                Class Students ({filteredStudents.length})
              </h2>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">
                No students found matching your criteria
              </p>
              <p className="text-gray-400 text-sm">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sr. No.
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Info
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Academic Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caste & Scholarship
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student._id || index}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
                            {student.name?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.name || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.enrollmentNumber || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen size={14} className="text-indigo-600" />
                            Sem {student.semester || student.year || "N/A"} - Section{" "}
                            {student.section || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {student.department || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail size={14} className="text-gray-400" />
                            <span className="truncate">
                              {student.email || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-400" />
                            <span>{student.phone || "N/A"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {student.caste || "Not Specified"}
                            </span>
                          </div>
                          {student.subCaste && (
                            <div className="text-xs text-gray-500 mb-1">
                              Sub: {student.subCaste}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              student.scholarshipStatus === "Yes" 
                                ? "bg-green-100 text-green-800" 
                                : student.scholarshipStatus === "Pending" || student.scholarshipStatus === "Applied"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {student.scholarshipStatus || "No"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getAttendanceColor(
                            student.attendancePercentage || 0
                          )}`}
                        >
                          {student.attendancePercentage || 0}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            student.status === "active"
                              ? "text-green-700 bg-green-100"
                              : student.status === "inactive"
                              ? "text-red-700 bg-red-100"
                              : "text-gray-700 bg-gray-100"
                          }`}
                        >
                          {student.status || "unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CCClassStudents;
