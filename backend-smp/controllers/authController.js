import User from "../models/User.js";
import Faculty from "../models/faculty.js";
import Driver from "../models/Driver.js";
import Conductor from "../models/Conductor.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AdminSubject from "../models/AdminSubject.js";
import mongoose from "mongoose";

const registerUser = async (req, res) => {
  const {
    username,
    email,
    // remove password from destructuring since we generate it
    role,
    firstName,
    lastName,
    employeeId,
    gender,
    dateOfBirth,
    mobile,
    address,
    aadhaar,
    department,
    designation,
    dateOfJoining,
    employmentStatus,
    status,
    teachingExperience,
    subjectsTaught,
    classIncharge,
    researchPublications,
    technicalSkills,
    workExperience,
  } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate password from dateOfBirth by removing special characters
    const rawPassword = dateOfBirth || "";
    const cleanPassword = rawPassword.replace(/[^a-zA-Z0-9]/g, "");

    // Hash the cleaned password
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    // Create new user with hashed password
    const user = new User({
      username,
      email,
      password: hashedPassword,
      // plainPassword: cleanPassword, // ⚠️ DEVELOPMENT ONLY - SECURITY RISK
      role,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      employeeId,
      gender,
      dateOfBirth,
      mobile,
      address,
      aadhaar,
      department,
      designation,
      dateOfJoining,
      employmentStatus,
      status: status || "Active",
      teachingExperience: teachingExperience || 0,
      subjectsTaught: subjectsTaught || [],
      classIncharge,
      researchPublications: researchPublications || [],
      technicalSkills: technicalSkills || [],
      workExperience: workExperience || 0,
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  // Accept either employeeId or email
  const { employeeId, email, password } = req.body;
  console.log("Login attempt:", {
    employeeId,
    email,
    password: password ? "***provided***" : "***missing***",
  });

  try {
    let user = null;
    let userType = "user";

    // First try to find in User model
    user = await User.findOne(employeeId ? { employeeId } : { email });
    console.log(
      "User model search:",
      employeeId ? `employeeId: ${employeeId}` : `email: ${email}`,
      "found:",
      !!user
    );

    // If not found in User model, try Faculty model
    if (!user) {
      user = await Faculty.findOne(employeeId ? { employeeId } : { email });
      userType = "faculty";
      console.log(
        "Faculty model search:",
        employeeId ? `employeeId: ${employeeId}` : `email: ${email}`,
        "found:",
        !!user
      );
    }

    // If not found in Faculty model, try Driver model
    if (!user) {
      // For Driver model, search by employeeId or email in personalInfo
      const searchQuery = employeeId
        ? { "employment.employeeId": employeeId }
        : { "personalInfo.email": email };
      user = await Driver.findOne(searchQuery).select("+password");
      userType = "driver";
      console.log(
        "Driver model search:",
        employeeId ? `employeeId: ${employeeId}` : `email: ${email}`,
        "found:",
        !!user
      );
    }

    // If not found in Driver model, try Conductor model
    if (!user) {
      // For Conductor model, search by employeeId or email in personalInfo
      const searchQuery = employeeId
        ? { "employment.employeeId": employeeId }
        : { "personalInfo.email": email };
      user = await Conductor.findOne(searchQuery).select("+password");
      userType = "conductor";
      console.log(
        "Conductor model search:",
        employeeId ? `employeeId: ${employeeId}` : `email: ${email}`,
        "found:",
        !!user
      );
    }

    console.log("User found:", user ? `${userType} model` : "not found");

    if (!user) {
      console.log("No user found, returning invalid credentials");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      console.log("User has no password set");
      return res.status(400).json({ message: "User has no password set" });
    }

    console.log("Comparing passwords...");

    console.log(password);
    console.log(user);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      console.log("Password mismatch, returning invalid credentials");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create token with appropriate role based on user type
    const tokenPayload = {
      id: user._id,
      userId: user._id,
    };

    // Set role and other fields based on which model the user came from
    if (userType === "faculty") {
      tokenPayload.employeeId = user.employeeId;

      // Properly map faculty role based on role and type fields
      let facultyRole = "teaching"; // default

      // First check for special roles (highest priority)
      if (user.role === "principal") {
        facultyRole = "principal";
      } else if (user.role === "hod") {
        facultyRole = "HOD";
      }
      // Check for CC assignment (active CC assignments)
      else if (user.ccAssignments && user.ccAssignments.length > 0) {
        // If user has active CC assignments, set role as cc
        facultyRole = "cc";
      }
      // Check for faculty management role (could be based on designation or special permission)
      else if (
        user.designation &&
        (user.designation.toLowerCase().includes("management") ||
          user.designation.toLowerCase().includes("admin") ||
          user.designation.toLowerCase().includes("coordinator"))
      ) {
        facultyRole = "facultymanagement";
      }
      // Check type field for other roles
      else if (user.type === "cc") {
        facultyRole = "cc";
      } else if (user.type === "non-teaching") {
        facultyRole = "non-teaching";
      } else if (user.type === "teaching") {
        facultyRole = "teaching";
      } else if (user.type === "HOD") {
        facultyRole = "HOD";
      } else if (user.type === "principal") {
        facultyRole = "principal";
      }

      // Check if faculty has valid dashboard access
      const validDashboardRoles = [
        "principal",
        "HOD",
        "cc",
        "facultymanagement",
        "teaching",
        "non-teaching"
      ];
      if (!validDashboardRoles.includes(facultyRole)) {
        return res.status(403).json({
          message:
            "Access denied: You don't have permission to access any dashboard. Please contact administrator.",
          code: "NO_DASHBOARD_ACCESS",
        });
      }

      tokenPayload.role = facultyRole;
      tokenPayload.type = user.type;
    } else if (userType === "driver") {
      tokenPayload.employeeId = user.employment?.employeeId;
      tokenPayload.role = "driver";
      tokenPayload.type = "driver";
      tokenPayload.email = user.personalInfo?.email;
    } else if (userType === "conductor") {
      tokenPayload.employeeId = user.employment?.employeeId;
      tokenPayload.role = "conductor";
      tokenPayload.type = "conductor";
    } else {
      tokenPayload.employeeId = user.employeeId;
      tokenPayload.role = user.role;
      tokenPayload.type = user.type;
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Prepare user response based on user type
    let userResponse = {
      _id: user._id,
      role: tokenPayload.role,
    };

    if (userType === "driver") {
      userResponse = {
        ...userResponse,
        firstName: user.personalInfo?.firstName,
        lastName: user.personalInfo?.lastName,
        email: user.personalInfo?.email,
        employeeId: user.employment?.employeeId,
        contactNumber: user.personalInfo?.contactNumber,
        dateOfJoining: user.employment?.dateOfJoining,
        status: user.employment?.status || user.status,
      };
    } else if (userType === "conductor") {
      userResponse = {
        ...userResponse,
        firstName: user.personalInfo?.firstName,
        lastName: user.personalInfo?.lastName,
        email: user.personalInfo?.email,
        employeeId: user.employment?.employeeId,
        contactNumber: user.personalInfo?.contactNumber,
        dateOfJoining: user.employment?.dateOfJoining,
        status: user.employment?.status || user.status,
      };
    } else {
      // Faculty or User model
      userResponse = {
        ...userResponse,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        employeeId: user.employeeId,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        mobile: user.mobile,
        address: user.address,
        aadhaar: user.aadhaar,
        department: user.department,
        designation: user.designation,
        dateOfJoining: user.dateOfJoining,
        employmentStatus: user.employmentStatus,
        status: user.status,
        teachingExperience: user.teachingExperience,
        subjectsTaught: user.subjectsTaught,
        classIncharge: user.classIncharge,
        type: user.type,
        researchPublications: user.researchPublications,
        technicalSkills: user.technicalSkills,
        workExperience: user.workExperience,
      };
    }

    res.json({
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    console.log("=== getUserProfile Debug Start ===");
    console.log("User object from middleware:", req.user);
    
    // Since auth middleware now provides full Faculty document, use it directly
    if (req.user && req.user._id) {
      // User is already populated by auth middleware
      const user = req.user;
      console.log("Using user from auth middleware:", {
        id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department?.name || user.department
      });

      // Populate subjects for the faculty
      let subjects = [];
      try {
        const facultyWithSubjects = await Faculty.findById(user._id).populate({
          path: "subjectsTaught",
          model: "AdminSubject",
          select: "name department",
        });
        
        subjects = facultyWithSubjects?.subjectsTaught || [];
        console.log("Subjects populated:", subjects.length);
      } catch (subjectError) {
        console.error("Error fetching subjects:", subjectError);
        subjects = [];
      }

      // Return user data with subjects
      const userWithSubjects = {
        ...user.toObject(),
        subjectsTaught: subjects,
      };

      console.log("=== getUserProfile Debug End ===");
      res.json(userWithSubjects);
    } else {
      // Fallback to old logic if middleware didn't provide user
      console.log("No user from middleware, falling back to token lookup");
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in token" });
      }
      
      // Try to find user in Faculty model
      const user = await Faculty.findById(userId).populate({
        path: "subjectsTaught",
        model: "AdminSubject",
        select: "name department",
      }).populate('department', 'name');
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    }
  } catch (error) {
    console.error("getUserProfile Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      username,
      email,
      firstName,
      lastName,
      employeeId,
      gender,
      dateOfBirth,
      mobile,
      address,
      aadhaar,
      department,
      designation,
      dateOfJoining,
      employmentStatus,
      status,
      teachingExperience,
      subjectsTaught,
      classIncharge,
      researchPublications,
      technicalSkills,
      workExperience,
    } = req.body;

    user.username = username || user.username;
    user.email = email || user.email;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.name = `${firstName || user.firstName} ${
      lastName || user.lastName
    }`.trim();
    user.employeeId = employeeId || user.employeeId;
    user.gender = gender || user.gender;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.mobile = mobile || user.mobile;
    user.address = address || user.address;
    user.aadhaar = aadhaar || user.aadhaar;
    user.department = department || user.department;
    user.designation = designation || user.designation;
    user.dateOfJoining = dateOfJoining || user.dateOfJoining;
    user.employmentStatus = employmentStatus || user.employmentStatus;
    user.status = status || user.status;
    user.teachingExperience = teachingExperience || user.teachingExperience;
    user.subjectsTaught = subjectsTaught || user.subjectsTaught;
    user.classIncharge = classIncharge || user.classIncharge;
    user.researchPublications =
      researchPublications || user.researchPublications;
    user.technicalSkills = technicalSkills || user.technicalSkills;
    user.workExperience = workExperience || user.workExperience;

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      employeeId: user.employeeId,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      mobile: user.mobile,
      address: user.address,
      aadhaar: user.aadhaar,
      department: user.department,
      designation: user.designation,
      dateOfJoining: user.dateOfJoining,
      employmentStatus: user.employmentStatus,
      status: user.status,
      teachingExperience: user.teachingExperience,
      subjectsTaught: user.subjectsTaught,
      classIncharge: user.classIncharge,
      researchPublications: user.researchPublications,
      technicalSkills: user.technicalSkills,
      workExperience: user.workExperience,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  console.log("=== changePassword function called ===");
  console.log("Request body:", req.body);
  console.log("User from auth middleware:", req.user);

  try {
    // Defensive: ensure we have a parsed body before destructuring
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log("Validation failed: request body missing or empty");
      return res.status(400).json({ message: "Request body is missing or empty" });
    }

    const { currentPassword, newPassword } = req.body || {};

    // Ensure we have a user attached by auth middleware
    if (!req.user) {
      console.log("Authentication failed: req.user missing");
      return res.status(401).json({ message: "Not authorized" });
    }

    // Support different token payload shapes (decoded id, userId, or mongoose doc)
    // If req.user is a mongoose document, prefer its _id
    const userId = (req.user && (req.user._id || req.user.id || req.user.userId))
      ? (req.user._id || req.user.id || req.user.userId).toString()
      : null;

    console.log("Extracted data:", {
      currentPassword: currentPassword ? "***provided***" : "***missing***",
      newPassword: newPassword ? "***provided***" : "***missing***",
      userId,
    });

    // Validation
    if (!currentPassword || !newPassword) {
      console.log("Validation failed: missing passwords");
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      console.log("Validation failed: password too short");
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    if (!userId) {
      console.log("Validation failed: user id not available on req.user");
      return res.status(401).json({ message: "Not authorized" });
    }

    console.log("Looking for user with ID:", userId);

    // Try to find the user document across possible user collections and ensure we include the password
    let userDoc = null;
    let modelName = null;

    // Order of precedence: User, Faculty, Driver, Conductor
    userDoc = await User.findById(userId).select("+password");
    modelName = userDoc ? 'User' : null;

    if (!userDoc) {
      userDoc = await Faculty.findById(userId).select("+password");
      modelName = userDoc ? 'Faculty' : modelName;
    }

    if (!userDoc) {
      userDoc = await Driver.findById(userId).select("+password");
      modelName = userDoc ? 'Driver' : modelName;
    }

    if (!userDoc) {
      userDoc = await Conductor.findById(userId).select("+password");
      modelName = userDoc ? 'Conductor' : modelName;
    }

    if (!userDoc) {
      console.log("User not found in any model");
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`User found in model: ${modelName}`);

    // Ensure userDoc has a password field
    if (!userDoc.password) {
      console.log("User record does not have a password set");
      return res.status(400).json({ message: "User has no password set" });
    }

    console.log("Verifying current password...");

    // Verify current password
    let isCurrentPasswordValid = false;
    try {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, userDoc.password);
    } catch (compareErr) {
      console.error("bcrypt compare error (current password):", compareErr);
      return res.status(500).json({ message: "Server error" });
    }

    console.log("Current password valid:", isCurrentPasswordValid);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    console.log("Checking if new password is same as current...");
    // Check if new password is same as current
    let isSamePassword = false;
    try {
      isSamePassword = await bcrypt.compare(newPassword, userDoc.password);
    } catch (compareErr) {
      console.error("bcrypt compare error (new password check):", compareErr);
      return res.status(500).json({ message: "Server error" });
    }

    console.log("Is same password:", isSamePassword);

    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    console.log("Hashing new password...");
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    console.log("New password hashed successfully");

    console.log("Updating user password on document and removing any plainPassword...");

    // Prepare update data
    const updateData = { password: hashedNewPassword };
    if (userDoc.plainPassword !== undefined) {
      updateData.$unset = { plainPassword: "" };
    }

    // First try to save the loaded document (convenient when shape is complete)
    try {
      userDoc.password = hashedNewPassword;
      if (userDoc.plainPassword !== undefined) {
        userDoc.plainPassword = undefined;
        userDoc.markModified('plainPassword');
      }
      await userDoc.save();

      console.log("Password updated successfully on model:", modelName);
      return res.json({ message: "Password changed successfully" });
    } catch (saveErr) {
      // If save fails due to validation (e.g., missing required fields on the schema), fall back to a direct update
      console.warn("Save failed, falling back to direct update to avoid validation issues:", saveErr.message);

      const modelForUpdate =
        modelName === 'User' ? User :
        modelName === 'Faculty' ? Faculty :
        modelName === 'Driver' ? Driver :
        modelName === 'Conductor' ? Conductor : null;

      if (!modelForUpdate) {
        console.error("No model available to perform fallback update");
        console.error("Original save error:", saveErr);
        return res.status(500).json({ message: "Server error" });
      }

      try {
        await modelForUpdate.findByIdAndUpdate(userDoc._id, updateData, { new: true });
        console.log("Password updated via fallback update on model:", modelName);
        return res.json({ message: "Password changed successfully" });
      } catch (updateErr) {
        console.error("Fallback update failed:", updateErr);
        return res.status(500).json({ message: "Server error" });
      }
    }
  } catch (error) {
    console.error("Change password error:", error.stack || error);
    res.status(500).json({ message: "Server error" });
  }
};

export {
  registerUser,
  login,
  getUserProfile,
  updateUserProfile,
  changePassword,
};
