import Attendance from "../models/attendance.js";

// Get all attendance logs
const getAttendanceLogs = async (req, res, next) => {
  try {
    const {
      subjectId,
      queryType,
      queryDate,
      queryMonth,
      queryYear,
      queryFrom,
      queryTo,
      page = 1,
      limit = 10,
      detailed = 'false'
    } = req.query;

    let filter = {};
    if (subjectId) filter.subject = subjectId;

    // Date filtering
    let start, end;
    if (queryType === "day" && queryDate) {
      start = new Date(queryDate);
      if (isNaN(start)) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    } else if (queryType === "week" && queryFrom && queryTo) {
      start = new Date(queryFrom);
      end = new Date(queryTo);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: "Invalid date format for week" });
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (queryType === "month" && queryMonth && queryYear) {
      const monthNum = parseInt(queryMonth);
      const yearNum = parseInt(queryYear);
      if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "Invalid month or year" });
      }
      start = new Date(yearNum, monthNum - 1, 1);
      end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    } else if (queryType === "range" && queryFrom && queryTo) {
      start = new Date(queryFrom);
      end = new Date(queryTo);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: "Invalid from or to date format" });
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({ message: `Missing required date parameters for type '${queryType}'` });
    }

    if (start && end) {
      filter.date = { $gte: start, $lte: end };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let attendanceRecords = await Attendance.find(filter)
      .populate("student", "firstName middleName lastName")
      .sort({ date: 1 })
      .skip(detailed === 'true' ? 0 : skip)
      .limit(detailed === 'true' ? 0 : limitNum); // No limit for detailed

    // Transform logs to include studentName
    const transformedLogs = attendanceRecords.map(log => {
      const logObj = log.toObject();
      if (logObj.student) {
        logObj.studentName = `${logObj.student.firstName || ''} ${logObj.student.middleName || ''} ${logObj.student.lastName || ''}`.trim();
        logObj.studentId = logObj.student._id;
      }
      return logObj;
    });

    if (detailed === 'true') {
      // Return detailed daily records
      res.status(200).json({
        logs: transformedLogs,
        totalPages: 1,
        currentPage: 1,
        totalLogs: transformedLogs.length
      });
    } else {
      // Aggregate for table display
      const studentMap = new Map();

      transformedLogs.forEach(log => {
        const studentId = log.studentId;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student: log.student,
            studentId: log.studentId,
            studentName: log.studentName,
            records: []
          });
        }
        studentMap.get(studentId).records.push(log);
      });

      const aggregatedLogs = [];
      studentMap.forEach(({ student, studentId, studentName, records }) => {
        if (queryType === "day") {
          records.forEach(record => {
            aggregatedLogs.push({
              ...record,
              student,
              studentId,
              studentName
            });
          });
        } else if (queryType === "week" || queryType === "range") {
          const presentCount = records.filter(r => r.status === "present").length;
          const totalDays = records.length;
          aggregatedLogs.push({
            student,
            studentId,
            studentName,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            presentCount,
            totalDays
          });
        } else if (queryType === "month") {
          const presentCount = records.filter(r => r.status === "present").length;
          const totalDays = records.length;
          aggregatedLogs.push({
            student,
            studentId,
            studentName,
            month: parseInt(queryMonth),
            year: parseInt(queryYear),
            presentCount,
            totalDays
          });
        }
      });

      const total = aggregatedLogs.length;
      const paginatedLogs = aggregatedLogs.slice(skip, skip + limitNum);

      res.status(200).json({
        logs: paginatedLogs,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        totalLogs: total
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get single attendance log by ID
const getAttendanceLog = async (req, res, next) => {
  try {
    // Populate student name for single log
    const log = await Attendance.findById(req.params.id).populate("student", "firstName middleName lastName");

    console.log(log);
    if (!log) {
      return res.status(404).json({ message: "Attendance log not found" });
    }
    
    // Transform log to include studentName
    const logObj = log.toObject();
    if (logObj.student) {
      logObj.studentName = `${logObj.student.firstName || ''} ${logObj.student.middleName || ''} ${logObj.student.lastName || ''}`.trim();
      logObj.studentId = logObj.student._id;
    }
    
    res.status(200).json(logObj);
  } catch (error) {
    next(error);
  }
};

// Create new attendance log
const createAttendanceLog = async (req, res, next) => {
  try {
    // If studentName is not provided, fetch it from student
    if (!req.body.studentName && req.body.student) {
      const Student = (await import("../models/student.js")).default;
      const student = await Student.findById(req.body.student).select('firstName middleName lastName');
      if (student) {
        req.body.studentName = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim();
      }
    }
    
    const log = await Attendance.create(req.body);
    const populatedLog = await Attendance.findById(log._id).populate("student", "firstName middleName lastName");
    
    // Transform log to include studentName
    const logObj = populatedLog.toObject();
    if (logObj.student && !logObj.studentName) {
      logObj.studentName = `${logObj.student.firstName || ''} ${logObj.student.middleName || ''} ${logObj.student.lastName || ''}`.trim();
      logObj.studentId = logObj.student._id;
    }
    
    res.status(201).json(logObj);
  } catch (error) {
    next(error);
  }
};

// Update attendance log (correction)
const updateAttendanceLog = async (req, res, next) => {
  try {
    // Allow updating status and reason
    const allowedFields = ["status", "reason"];
    const update = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });
    const log = await Attendance.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate("student", "firstName middleName lastName");
    
    if (!log) {
      return res.status(404).json({ message: "Attendance log not found" });
    }
    
    // Transform log to include studentName
    const logObj = log.toObject();
    if (logObj.student) {
      logObj.studentName = `${logObj.student.firstName || ''} ${logObj.student.middleName || ''} ${logObj.student.lastName || ''}`.trim();
      logObj.studentId = logObj.student._id;
    }
    
    res.status(200).json(logObj);
  } catch (error) {
    next(error);
  }
};

// Delete attendance log
const deleteAttendanceLog = async (req, res, next) => {
  try {
    const log = await Attendance.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ message: "Attendance log not found" });
    }
    res.status(200).json({ message: "Attendance log deleted" });
  } catch (error) {
    next(error);
  }
};

export {
  getAttendanceLogs,
  getAttendanceLog,
  createAttendanceLog,
  updateAttendanceLog,
  deleteAttendanceLog,
};
