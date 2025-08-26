import AcademicCalendar from "../models/AcademicCalendar.js";
import AdminSubject from "../models/AdminSubject.js";
import Faculty from "../models/faculty.js";

// Get all academic calendars with filters
export const getAcademicCalendars = async (req, res) => {
  try {
    const { academicYear, semester, status, subjectId, department } = req.query;

    // Build query object
    let query = {};

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    if (status) query.status = status;
    if (subjectId) query.subject = subjectId;
    if (department) query.department = department;

    const calendars = await AcademicCalendar.find(query)
      .populate("subject", "name code")
      .populate("faculty", "name employeeId")
      .populate("createdBy", "name employeeId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        calendars: calendars,
      },
    });
  } catch (error) {
    console.error("Error fetching academic calendars:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create new academic calendar
export const createAcademicCalendar = async (req, res) => {
  try {
    const {
      title,
      description,
      academicYear,
      semester,
      department,
      institutionName,
      subjectId,
      facultyId,
      startDate,
      endDate,
      topics,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !academicYear ||
      !semester ||
      !department ||
      !subjectId ||
      !facultyId ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Get subject details
    const subject = await AdminSubject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Get faculty details
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    // Get creator details
    const creator = await Faculty.findById(req.user.id);
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    // Create academic calendar
    const academicCalendar = new AcademicCalendar({
      title,
      description,
      academicYear,
      semester,
      department,
      institutionName: institutionName || "NAGARJUNA UNIVERSITY",
      subject: subjectId,
      subjectName: subject.name,
      faculty: facultyId,
      facultyName: faculty.name,
      createdBy: req.user.id,
      createdByName: creator.name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      topics: topics || [],
    });

    await academicCalendar.save();

    // Populate the saved calendar
    await academicCalendar.populate("subject", "name code");
    await academicCalendar.populate("faculty", "name employeeId");

    res.status(201).json({
      success: true,
      message: "Academic calendar created successfully",
      data: academicCalendar,
    });
  } catch (error) {
    console.error("Error creating academic calendar:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single academic calendar by ID
export const getAcademicCalendarById = async (req, res) => {
  try {
    const { id } = req.params;

    const calendar = await AcademicCalendar.findById(id)
      .populate("subject", "name code")
      .populate("faculty", "name employeeId")
      .populate("createdBy", "name employeeId");

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "Academic calendar not found",
      });
    }

    res.json({
      success: true,
      data: calendar,
    });
  } catch (error) {
    console.error("Error fetching academic calendar:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update academic calendar
export const updateAcademicCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const calendar = await AcademicCalendar.findById(id);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "Academic calendar not found",
      });
    }

    // Update subject name if subject is changed
    if (
      updateData.subjectId &&
      updateData.subjectId !== calendar.subject.toString()
    ) {
      const subject = await AdminSubject.findById(updateData.subjectId);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }
      updateData.subject = updateData.subjectId;
      updateData.subjectName = subject.name;
      delete updateData.subjectId;
    }

    // Update faculty name if faculty is changed
    if (
      updateData.facultyId &&
      updateData.facultyId !== calendar.faculty.toString()
    ) {
      const faculty = await Faculty.findById(updateData.facultyId);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found",
        });
      }
      updateData.faculty = updateData.facultyId;
      updateData.facultyName = faculty.name;
      delete updateData.facultyId;
    }

    const updatedCalendar = await AcademicCalendar.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("subject", "name code")
      .populate("faculty", "name employeeId");

    res.json({
      success: true,
      message: "Academic calendar updated successfully",
      data: updatedCalendar,
    });
  } catch (error) {
    console.error("Error updating academic calendar:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete academic calendar
export const deleteAcademicCalendar = async (req, res) => {
  try {
    const { id } = req.params;

    const calendar = await AcademicCalendar.findById(id);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "Academic calendar not found",
      });
    }

    await AcademicCalendar.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Academic calendar deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting academic calendar:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Publish academic calendar
export const publishAcademicCalendar = async (req, res) => {
  try {
    const { id } = req.params;

    const calendar = await AcademicCalendar.findById(id);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "Academic calendar not found",
      });
    }

    calendar.isPublished = true;
    calendar.publishedAt = new Date();
    calendar.status = "Active";

    await calendar.save();

    res.json({
      success: true,
      message: "Academic calendar published successfully",
      data: calendar,
    });
  } catch (error) {
    console.error("Error publishing academic calendar:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add topic to academic calendar
export const addTopicToCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, plannedDate, estimatedHours } = req.body;

    const calendar = await AcademicCalendar.findById(id);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "Academic calendar not found",
      });
    }

    const newTopic = {
      topicName: name,
      description,
      plannedDate: new Date(plannedDate),
      duration: estimatedHours || 1,
      status: "Planned",
    };

    calendar.topics.push(newTopic);
    await calendar.save();

    res.json({
      success: true,
      message: "Topic added successfully",
      data: calendar,
    });
  } catch (error) {
    console.error("Error adding topic:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update topic in academic calendar
export const updateTopicInCalendar = async (req, res) => {
  try {
    const { id, topicId } = req.params;
    const updateData = req.body;

    const calendar = await AcademicCalendar.findById(id);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "Academic calendar not found",
      });
    }

    const topic = calendar.topics.id(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Update topic fields
    if (updateData.name) topic.topicName = updateData.name;
    if (updateData.description) topic.description = updateData.description;
    if (updateData.plannedDate)
      topic.plannedDate = new Date(updateData.plannedDate);
    if (updateData.actualDate)
      topic.actualDate = new Date(updateData.actualDate);
    if (updateData.estimatedHours) topic.duration = updateData.estimatedHours;
    if (updateData.notes) topic.notes = updateData.notes;
    if (updateData.status) topic.status = updateData.status;

    await calendar.save();

    res.json({
      success: true,
      message: "Topic updated successfully",
      data: calendar,
    });
  } catch (error) {
    console.error("Error updating topic:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete topic from academic calendar
export const deleteTopicFromCalendar = async (req, res) => {
  try {
    const { id, topicId } = req.params;

    const calendar = await AcademicCalendar.findById(id);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "Academic calendar not found",
      });
    }

    calendar.topics.pull(topicId);
    await calendar.save();

    res.json({
      success: true,
      message: "Topic deleted successfully",
      data: calendar,
    });
  } catch (error) {
    console.error("Error deleting topic:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get faculty by subject (for dropdown in frontend)
export const getFacultyBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    // For now, we'll return all faculty in the user's department
    // You might want to implement a more sophisticated assignment system
    const faculty = await Faculty.find({
      department: req.user.department,
    }).select("name employeeId");

    res.json({
      success: true,
      data: faculty,
    });
  } catch (error) {
    console.error("Error fetching faculty by subject:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get subjects by department (for dropdown in frontend)
export const getSubjectsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    const subjects = await AdminSubject.find({
      department: department,
    }).select("name code year semester");

    res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    console.error("Error fetching subjects by department:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get faculty by department (for dropdown in frontend)
export const getFacultyByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    const faculty = await Faculty.find({
      department: department,
    }).select("name employeeId");

    res.json({
      success: true,
      data: faculty,
    });
  } catch (error) {
    console.error("Error fetching faculty by department:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
