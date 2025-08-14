// Populated Data Controller - Simplified version
import Student from '../models/student.js';
import faculty from '../models/faculty.js';
import Attendancelog from '../models/Attendancelog.js';
import AccountStudent from '../models/AccountStudent.js';

// Get student with full details
export const getStudentWithFullDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId)
      .populate('caste')
      .populate('stream')
      .populate('department')
      .populate('semester');
      
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get faculty with full details
export const getFacultyWithFullDetails = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const facultyMember = await faculty.findById(facultyId)
      .populate('department')
      .populate('subjects');
      
    if (!facultyMember) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    res.status(200).json({
      success: true,
      data: facultyMember
    });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get attendance with full details
export const getAttendanceWithFullDetails = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const attendance = await Attendancelog.findById(attendanceId)
      .populate('studentId')
      .populate('facultyId')
      .populate('subjectId');
      
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all students with details
export const getAllStudentsWithDetails = async (req, res) => {
  try {
    const students = await Student.find()
      .populate('caste')
      .populate('stream')
      .populate('department')
      .populate('semester')
      .limit(50); // Limit for performance

    res.status(200).json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all faculties with details
export const getAllFacultiesWithDetails = async (req, res) => {
  try {
    const faculties = await faculty.find()
      .populate('department')
      .populate('subjects')
      .limit(50); // Limit for performance

    res.status(200).json({
      success: true,
      data: faculties,
      count: faculties.length
    });
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get account student with details
export const getAccountStudentWithDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const accountStudent = await AccountStudent.findById(studentId)
      .populate('studentId');
      
    if (!accountStudent) {
      return res.status(404).json({
        success: false,
        message: 'Account student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: accountStudent
    });
  } catch (error) {
    console.error('Error fetching account student:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get attendance report with full details
export const getAttendanceReportWithFullDetails = async (req, res) => {
  try {
    const { startDate, endDate, subjectId, studentId } = req.query;
    
    let query = {};
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (subjectId) query.subjectId = subjectId;
    if (studentId) query.studentId = studentId;

    const attendanceReport = await Attendancelog.find(query)
      .populate('studentId', 'name rollNumber')
      .populate('facultyId', 'name')
      .populate('subjectId', 'name')
      .sort({ date: -1 })
      .limit(100); // Limit for performance

    res.status(200).json({
      success: true,
      data: attendanceReport,
      count: attendanceReport.length
    });
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
