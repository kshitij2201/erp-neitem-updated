import ExtraStudent from '../models/ExtraStudent.js';

// Create a new extra student
export const createExtraStudent = async (req, res) => {
  try {
    console.log('Creating new extra student...');
    console.log('Request body:', req.body);
    console.log('Authenticated user (if any):', req.user || req.faculty || null);

    const studentData = { ...req.body };

    // Ensure required fields
    if (!studentData.firstName || !studentData.lastName) {
      return res.status(400).json({
        message: 'First name and last name are required'
      });
    }

    // Set defaults if not provided
    if (!studentData.middleName) {
      studentData.middleName = '';
    }

    if (!studentData.program) {
      studentData.program = 'B.Tech'; // Default
    }

    if (!studentData.department) {
      studentData.department = 'Computer Science'; // Default
    }

    if (!studentData.currentSemester) {
      studentData.currentSemester = 1;
    }

    if (!studentData.enrollmentYear) {
      studentData.enrollmentYear = new Date().getFullYear().toString();
    }

    if (!studentData.academicStatus) {
      studentData.academicStatus = 'Active';
    }

    // Generate a unique studentId if not provided
    if (!studentData.studentId) {
      // Generate format: ES-YYYY-XXXXX (ES = Extra Student)
      const year = new Date().getFullYear();
      const count = await ExtraStudent.countDocuments();
      let baseId = `ES-${year}-${String(count + 1).padStart(5, '0')}`;
      let candidate = baseId;
      let suffix = 1;
      
      // Ensure uniqueness
      while (await ExtraStudent.findOne({ studentId: candidate })) {
        candidate = `ES-${year}-${String(count + suffix).padStart(5, '0')}`;
        suffix += 1;
      }
      studentData.studentId = candidate;
      console.log('Generated studentId:', candidate);
    }

    // Generate a unique email if not provided
    if (!studentData.email) {
      const firstName = studentData.firstName.toLowerCase().replace(/\s+/g, '');
      const lastName = studentData.lastName.toLowerCase().replace(/\s+/g, '');
      let baseEmail = `${firstName}.${lastName}@student.edu`;
      let candidate = baseEmail;
      let suffix = 1;
      while (await ExtraStudent.findOne({ email: candidate })) {
        candidate = `${firstName}.${lastName}${suffix}@student.edu`;
        suffix += 1;
      }
      studentData.email = candidate;
    }

    // Create and save the extra student
    const extraStudent = new ExtraStudent(studentData);
    await extraStudent.save();

    console.log('Extra student created successfully:', extraStudent._id);
    res.status(201).json({
      success: true,
      data: extraStudent,
      message: 'Extra student created successfully'
    });
  } catch (err) {
    console.error('Error creating extra student:', err);
    console.error('Error name:', err.name);
    console.error('Error code:', err.code);
    console.error('Full error:', JSON.stringify(err, null, 2));
    
    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `A student with this ${field} already exists`,
        error: `Duplicate ${field}`,
        field: field
      });
    }
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.join(', '),
        validationErrors: errors
      });
    }
    
    // Return stack trace in non-production to help debugging
    const payload = {
      success: false,
      message: 'Error creating extra student',
      error: err.message
    };
    if (process.env.NODE_ENV !== 'production') {
      payload.stack = err.stack;
      payload.errorName = err.name;
      payload.errorCode = err.code;
    }
    res.status(500).json(payload);
  }
};

// Get all extra students
export const getExtraStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    let query = {};

    if (search && search.trim()) {
      query.$or = [
        { firstName: { $regex: search.trim(), $options: 'i' } },
        { lastName: { $regex: search.trim(), $options: 'i' } },
        { studentId: { $regex: search.trim(), $options: 'i' } },
        { program: { $regex: search.trim(), $options: 'i' } },
        { department: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const extraStudents = await ExtraStudent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ExtraStudent.countDocuments(query);

    res.json({
      success: true,
      data: extraStudents,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching extra students:', err);
    res.status(500).json({
      message: 'Error fetching extra students',
      error: err.message
    });
  }
};

// Get extra student by ID
export const getExtraStudentById = async (req, res) => {
  try {
    const extraStudent = await ExtraStudent.findById(req.params.id);
    if (!extraStudent) {
      return res.status(404).json({ message: 'Extra student not found' });
    }
    res.json({
      success: true,
      data: extraStudent
    });
  } catch (err) {
    console.error('Error fetching extra student:', err);
    res.status(500).json({
      message: 'Error fetching extra student',
      error: err.message
    });
  }
};

// Update extra student
export const updateExtraStudent = async (req, res) => {
  try {
    const extraStudent = await ExtraStudent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!extraStudent) {
      return res.status(404).json({ message: 'Extra student not found' });
    }
    res.json({
      success: true,
      data: extraStudent,
      message: 'Extra student updated successfully'
    });
  } catch (err) {
    console.error('Error updating extra student:', err);
    res.status(500).json({
      message: 'Error updating extra student',
      error: err.message
    });
  }
};

// Delete extra student
export const deleteExtraStudent = async (req, res) => {
  try {
    const extraStudent = await ExtraStudent.findByIdAndDelete(req.params.id);
    if (!extraStudent) {
      return res.status(404).json({ message: 'Extra student not found' });
    }
    res.json({
      success: true,
      message: 'Extra student deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting extra student:', err);
    res.status(500).json({
      message: 'Error deleting extra student',
      error: err.message
    });
  }
};