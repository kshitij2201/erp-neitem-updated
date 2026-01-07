import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Filter,
  X,
  FileText,
  Upload,
  Download,
} from "lucide-react";
import AcademicCalendarPrint from "./AcademicCalendarPrint";

const AcademicCalendar = ({ userData }) => {
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printCalendar, setPrintCalendar] = useState(null);

  // Upload state
  const [uploadedPlans, setUploadedPlans] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  // Editing state
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [savingPreview, setSavingPreview] = useState(false);

  const [filters, setFilters] = useState({
    academicYear: "",
    semester: "",
    status: "",
    subjectId: "",
  });
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(userData);

  useEffect(() => {
    fetchCalendars();
    fetchSubjects();
    fetchFaculty();
    fetchUploadedPlans();
  }, [filters]);

  // Keep local user data in sync with prop
  useEffect(() => {
    setCurrentUserData(userData);
  }, [userData]);

  // Function to refresh user data from server
  const refreshCurrentUserData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      console.log("[AcademicCalendar] Fetching fresh user profile data...");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "https://backenderp.tarstech.in"}/api/auth/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const freshUserData = await response.json();
        const userDataToSet = freshUserData.user || freshUserData;
        console.log("[AcademicCalendar] Fresh user data received:", userDataToSet);
        
        // Update local state with fresh data
        setCurrentUserData(userDataToSet);
        
        // Also update localStorage to keep it in sync
        localStorage.setItem("user", JSON.stringify(userDataToSet));
        
        return userDataToSet;
      }
    } catch (error) {
      console.error("[AcademicCalendar] Error fetching fresh user data:", error);
    }
  };

  // Listen for user data updates (e.g., after subject assignment)
  useEffect(() => {
    const handleUserDataUpdate = (event) => {
      console.log('[AcademicCalendar] User data updated, refreshing data...', event.detail);
      
      // Update local user data state with fresh data
      const updatedUserData = event.detail;
      setCurrentUserData(updatedUserData);
      
      // Refetch both subjects and calendars to ensure we have the latest data
      fetchSubjects();
      fetchCalendars(); // Also refetch calendars to update the view immediately
    };

    // Listen for the custom userDataUpdated event
    window.addEventListener('userDataUpdated', handleUserDataUpdate);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, []);

  // Refresh user data on component mount to ensure fresh subject assignments
  useEffect(() => {
    refreshCurrentUserData();
  }, []);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      // Role-based filtering logic
      if (currentUserData?.role === "hod") {
        // HOD should see all calendars from their department (CC Portal, Staff Portal, etc.)
        if (currentUserData.department) {
          queryParams.append("department", currentUserData.department);
        }
        // Don't add createdBy filter for HOD - they should see all calendars
      } else if (currentUserData?.role === "teaching_staff" || currentUserData?.role === "cc" || currentUserData?._id) {
        // For staff and CC, show only their own created calendars
        queryParams.append("createdBy", currentUserData._id);
      }

      // Add timestamp to avoid browser caching
      queryParams.append("t", Date.now());

      const response = await fetch(
        `https://backenderp.tarstech.in/api/academic-calendar?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setCalendars(data.data.calendars);
      }
    } catch (error) {
      console.error("Error fetching calendars:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/subjects/department/${userData.department}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSubjects(data.data);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchFaculty = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/faculty/department/${userData.department}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setFaculty(data.data);
      }
    } catch (error) {
      console.error("Error fetching faculty:", error);
    }
  };

  // Local helper: decide whether current user can view a file (for local fallback entries)
  const canViewLocalFile = (file) => {
    const user = currentUserData;
    if (!user) return false;
    // Owner always sees their own uploads
    if (file?.meta && file.meta.uploaderId && String(file.meta.uploaderId) === String(user._id)) return true;
    // HOD sees files uploaded by their department
    const role = String(user.role || '').toLowerCase();
    const userDept = user.department?._id || user.department;
    if (role === 'hod' && file?.meta && file.meta.uploaderDepartment && String(file.meta.uploaderDepartment) === String(userDept)) return true;
    return false;
  };

  // Extract metadata from a File object or fallback local file object
  const readMetaFromFileObject = (file) => {
    if (!file) return null;
    // If already present, return meta directly
    if (file.meta) return file.meta;

    // Some fallback objects may store uploader info directly on the object
    const meta = {};
    if (file.uploaderId) meta.uploaderId = file.uploaderId;
    if (file.uploaderName) meta.uploaderName = file.uploaderName;
    if (file.uploaderDepartment) meta.uploaderDepartment = file.uploaderDepartment;
    if (file.originalName) meta.originalName = file.originalName;

    return Object.keys(meta).length ? meta : null;
  };

  // Fetch list of uploaded teaching plans (server endpoint optional)
  const fetchUploadedPlans = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const url = `${import.meta.env.VITE_API_URL || "https://backenderp.tarstech.in"}/api/academic-calendar/uploads`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Fallback to any locally saved uploads
        const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
        setUploadedPlans((local || []).filter(canViewLocalFile));
        return;
      }

      const data = await response.json();
      if (data && data.success) {
        setUploadedPlans(data.data || []);
      } else {
        const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
        setUploadedPlans((local || []).filter(canViewLocalFile));
      }
    } catch (err) {
      console.error("Failed to fetch uploaded plans:", err);
      const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
      setUploadedPlans((local || []).filter(canViewLocalFile));
    }
  };

  // Handle file upload (accepts .doc, .docx, .xls, .xlsx, .csv)
  const handleUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    // Validate extension
    if (!/\.(docx?|xlsx?|csv|xls)$/i.test(file.name)) {
      setUploadError("Unsupported file type. Use .docx/.doc/.xlsx/.xls/.csv");
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const token = localStorage.getItem("authToken");
      const url = `${import.meta.env.VITE_API_URL || "https://backenderp.tarstech.in"}/api/academic-calendar/upload`;

      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        // Try to parse a JSON error first, otherwise fall back to text
        let errMsg = null;
        try {
          const errJson = await res.json();
          errMsg = errJson?.message || errJson?.error || JSON.stringify(errJson);
        } catch (e) {
          try {
            errMsg = await res.text();
        const fallback = { name: file.name, uploadedAt: new Date().toISOString(), meta: { uploaderId: currentUserData?._id, uploaderName: currentUserData?.firstName || currentUserData?.name, uploaderDepartment: currentUserData?.department?._id || currentUserData?.department } };
        setUploadedPlans((prev) => [fallback, ...prev]);
        const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
        localStorage.setItem("localUploadedPlans", JSON.stringify([fallback, ...local]));
        setUploadError(`Upload failed (server ${res.status})` + (errMsg ? `: ${String(errMsg).substring(0,300)}` : ""));
        return;
          } catch (t) {
            errMsg = String(t);
          }
        }

        console.error('Upload failed server response:', res.status, errMsg);
        const fallback = { name: file.name, uploadedAt: new Date().toISOString(), meta: { uploaderId: currentUserData?._id, uploaderDepartment: currentUserData?.department?._id || currentUserData?.department } };
        setUploadedPlans((prev) => [fallback, ...prev]);
        const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
        localStorage.setItem("localUploadedPlans", JSON.stringify([fallback, ...local]));
        setUploadError(`Upload failed (server ${res.status})` + (errMsg ? `: ${String(errMsg).substring(0,300)}` : ""));
        return;
      }

      const result = await res.json();

      if (result && result.success) {
        // If server returns the uploaded file record, prepend it
        const uploaded = result.file || result.data || { name: file.name, uploadedAt: new Date().toISOString() };
        setUploadedPlans((prev) => [uploaded, ...prev]);
        // Save minimal info locally as fallback
        const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
        localStorage.setItem("localUploadedPlans", JSON.stringify([uploaded, ...local]));
        // Refresh calendars/list
        fetchCalendars();
        alert("Upload successful");
      } else {
        const fallback = { name: file.name, uploadedAt: new Date().toISOString(), meta: { uploaderId: currentUserData?._id, uploaderName: currentUserData?.firstName || currentUserData?.name, uploaderDepartment: currentUserData?.department?._id || currentUserData?.department } };
        setUploadedPlans((prev) => [fallback, ...prev]);
        const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
        localStorage.setItem("localUploadedPlans", JSON.stringify([fallback, ...local]));
        setUploadError(result?.message || "Upload failed (server) - saved locally");
      }
    } catch (err) {
      console.error("Upload error:", err);
      const fallback = { name: file.name, uploadedAt: new Date().toISOString(), meta: { uploaderId: currentUserData?._id, uploaderName: currentUserData?.firstName || currentUserData?.name, uploaderDepartment: currentUserData?.department?._id || currentUserData?.department } };
      setUploadedPlans((prev) => [fallback, ...prev]);
      const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
      localStorage.setItem("localUploadedPlans", JSON.stringify([fallback, ...local]));
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete an uploaded plan (remove file from server)
  const handleDeleteUpload = async (file) => {
    if (!file || !file.name) return;
    if (!window.confirm(`Delete uploaded file "${file.originalName || file.name}"? This cannot be undone.`)) return;

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "https://backenderp.tarstech.in"}/api/academic-calendar/upload/${encodeURIComponent(file.name)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        // Remove from state and localStorage fallback
        setUploadedPlans((prev) => prev.filter((p) => p.name !== file.name));
        const local = JSON.parse(localStorage.getItem("localUploadedPlans") || "[]");
        localStorage.setItem(
          "localUploadedPlans",
          JSON.stringify(local.filter((p) => p.name !== file.name))
        );
        alert("File deleted");
      } else {
        console.error("Failed to delete upload", data);
        alert(data?.message || "Failed to delete file");
      }
    } catch (err) {
      console.error("Error deleting upload:", err);
      alert("Error deleting file");
    }
  };

  // Rename an uploaded plan (change server filename and URL)
  // Open preview in editing mode for a file
  const handleEditUpload = async (file) => {
    if (!file || !file.name) return;

    setEditingFile(file);
    setIsEditingPreview(true);
    // Reuse preview loader
    await handlePreviewUpload(file);
  };

  // NOTE: kept for backward compatibility if direct renaming is needed in future
  const handleRenameUpload = async (file) => {
    alert('Filename renaming is disabled. Use Edit to modify the file contents instead.');
  };

  // Preview uploaded file (CSV / Excel)
  const handlePreviewUpload = async (file) => {
    if (!file || !file.name) return;
    // remember which file we're previewing so Edit can operate on it
    setEditingFile(file);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    setShowPreviewModal(true);

    try {
      const token = localStorage.getItem("authToken");

      // Allow calling preview endpoint for CSV/XLS/XLSX and DOCX (server supports docx text extraction)
      const ext = file.name ? String(file.name).split('.').pop().toLowerCase() : '';
      if (!['csv', 'xls', 'xlsx', 'docx'].includes(ext)) {
        setPreviewError('Preview not available for this file type. You can download or open the file instead.');
        setPreviewData({ meta: readMetaFromFileObject(file), fileUrl: file.name ? `${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/uploads/${encodeURIComponent(file.name)}` : null });
        setPreviewLoading(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "https://backenderp.tarstech.in"}/api/academic-calendar/upload/${encodeURIComponent(file.name)}/preview`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        // Try parse JSON for more useful message
        let jsonErr = null;
        try {
          jsonErr = await res.json();
        } catch (e) {
          // fallback to text
          const text = await res.text();
          setPreviewError(`Preview failed (server ${res.status}): ${text.substring(0, 300)}`);
          // attach basic file info so user can download/open it
          setPreviewData({ meta: readMetaFromFileObject(file), fileUrl: `${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/uploads/${encodeURIComponent(file.name)}` });
          return;
        }

        // Known case: preview not available for this file type
        if (jsonErr && jsonErr.message && jsonErr.message.toLowerCase().includes('preview not available')) {
          setPreviewError('Preview not available for this file type. You can download or open the file instead.');
          setPreviewData({ meta: jsonErr.file?.meta || readMetaFromFileObject(file), fileUrl: `${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/uploads/${encodeURIComponent(file.name)}` });
          return;
        }

        setPreviewError(jsonErr?.message || `Preview failed (server ${res.status})`);
        setPreviewData({ meta: jsonErr?.file?.meta || readMetaFromFileObject(file), fileUrl: `${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/uploads/${encodeURIComponent(file.name)}` });
        return;
      }

      const data = await res.json();
      if (data && data.success && data.preview) {
        // Attach meta if available so preview modal knows uploader info
        const pd = data.preview;
        pd.meta = data.file?.meta || readMetaFromFileObject(file) || pd.meta || null;
        setPreviewData(pd);
      } else {
        setPreviewError(data?.message || 'No preview available');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewError(err.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteCalendar = async (id) => {
    if (window.confirm("Are you sure you want to delete this calendar?")) {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `https://backenderp.tarstech.in/api/academic-calendar/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          fetchCalendars();
        }
      } catch (error) {
        console.error("Error deleting calendar:", error);
      }
    }
  };

  const handlePublishCalendar = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/academic-calendar/${id}/publish`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchCalendars();
      }
    } catch (error) {
      console.error("Error publishing calendar:", error);
    }
  };

  const handlePrintView = (calendar) => {
    setPrintCalendar(calendar);
    setShowPrintView(true);
  };

  const handleEdit = (calendar) => {
    setEditingCalendar(calendar);
    setShowEditModal(true);
  };

  // Permission functions
  const canEditCalendar = (calendar) => {
    // Only the creator can edit their calendar.
    // Handle different shapes: calendar.createdBy may be an id string or an object.
    const creatorId = calendar?.createdBy?._id || calendar?.createdBy || calendar?.createdById;
    return !!(creatorId && currentUserData?._id && String(creatorId) === String(currentUserData._id));
  };

  const canDeleteCalendar = (calendar) => {
    const creatorId = calendar?.createdBy?._id || calendar?.createdBy || calendar?.createdById;
    return !!(creatorId && currentUserData?._id && String(creatorId) === String(currentUserData._id));
  };

  const canPublishCalendar = (calendar) => {
    // HOD (case-insensitive) can publish any calendar in their department.
    // Creator can also publish their own calendar.
    const isHod = !!(currentUserData?.role && String(currentUserData.role).toLowerCase() === "hod");
    const creatorId = calendar?.createdBy?._id || calendar?.createdBy || calendar?.createdById;
    const isCreator = !!(creatorId && currentUserData?._id && String(creatorId) === String(currentUserData._id));
    return isHod || isCreator;
  };

  // Show print view if selected
  if (showPrintView && printCalendar) {
    return (
      <AcademicCalendarPrint
        calendar={printCalendar}
        onBack={() => {
          setShowPrintView(false);
          setPrintCalendar(null);
        }}
      />
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-gray-100 text-gray-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Archived":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 60) return "bg-yellow-500";
    if (progress >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  // Compute progress from topics (fall back to backend value if topics missing)
  const computeProgress = (calendar) => {
    try {
      const topics = calendar?.topics || [];
      if (!topics || topics.length === 0) return calendar.progressPercentage || 0;

      const totalPlanned = topics.reduce(
        (sum, t) => sum + (t.estimatedHours || t.duration || 0),
        0
      );

      if (totalPlanned === 0) {
        // Fall back to simple count-based calculation to avoid division by zero
        const completedCount = topics.filter((t) => t.actualDate || t.status === "Completed").length;
        return topics.length ? Math.round((completedCount / topics.length) * 100) : (calendar.progressPercentage || 0);
      }

      const completedHours = topics
        .filter((t) => t.actualDate || t.status === "Completed")
        .reduce((sum, t) => sum + (t.estimatedHours || t.duration || 0), 0);

      return Math.round((completedHours / totalPlanned) * 100) || 0;
    } catch (e) {
      return calendar.progressPercentage || 0;
    }
  };

  // Function to check if user should see a teaching plan
  const isUserAssignedToSubject = (subjectId) => {
    if (!currentUserData || !subjectId) {
      console.log('[AcademicCalendar] Missing user data or subject ID:', { currentUserData: !!currentUserData, subjectId });
      return false;
    }
    
    // HODs can see ALL teaching plans in their department
    const isHod = String(currentUserData?.role || "").toLowerCase() === "hod";
    if (isHod) {
      console.log('[AcademicCalendar] HOD can see all teaching plans');
      return true;
    }
    
    // For faculty, check if they are assigned to the subject
    // Try multiple possible fields where subjects might be stored
    const userSubjects = (
      currentUserData.subjects || 
      currentUserData.subjectsTaught || 
      currentUserData.assignedSubjects ||
      []
    );
    
    // Handle different data structures - subjects could be objects or IDs
    const assignedSubjectIds = userSubjects.map(s => {
      if (typeof s === 'string') return s;
      if (typeof s === 'object' && s !== null) {
        return s._id || s.id || s.subjectId || String(s);
      }
      return String(s);
    });
    
    const normalizedSubjectId = String(subjectId);
    const isAssigned = assignedSubjectIds.includes(normalizedSubjectId);
    
    console.log('[AcademicCalendar] Faculty subject assignment check:', {
      subjectId: normalizedSubjectId,
      userSubjects,
      assignedSubjectIds,
      isAssigned,
      userRole: currentUserData?.role,
      currentUserData: {
        id: currentUserData._id,
        name: currentUserData.name,
        subjects: currentUserData.subjects?.length || 0,
        subjectsTaught: currentUserData.subjectsTaught?.length || 0,
        assignedSubjects: currentUserData.assignedSubjects?.length || 0
      }
    });
    
    return isAssigned;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Teaching Plan
          </h1>
          <p className="text-gray-600 mt-1">
            Manage subject-wise academic schedules and track progress
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx,.xls,.xlsx,.csv"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload size={18} />
            Upload Plan
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Create Teaching Plan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={20} className="text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.academicYear}
            onChange={(e) =>
              setFilters({ ...filters, academicYear: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Academic Years</option>
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
          </select>

          <select
            value={filters.semester}
            onChange={(e) =>
              setFilters({ ...filters, semester: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>

          <select
            value={filters.subjectId}
            onChange={(e) =>
              setFilters({ ...filters, subjectId: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Uploaded Plans */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
        <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <FileText size={18} />
          Uploaded Teaching Plans
        </h3>
        {uploadError && (
          <div className="text-sm text-red-600 mb-2">{uploadError}</div>
        )}
        {uploadedPlans.length === 0 ? (
          <div className="text-sm text-gray-500">No uploaded plans found.</div>
        ) : (
          (() => {
            const isHodUser = String(currentUserData?.role || '').toLowerCase() === 'hod';
            const userDept = currentUserData?.department?._id || currentUserData?.department;

            if (!isHodUser) {
              return (
                <div className="space-y-2">
                  {uploadedPlans.map((p) => (
                    <div
                      key={p._id || p.name}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm text-gray-800">{p.originalName || p.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(p.uploadedAt || p.createdAt || Date.now()).toLocaleString()}
                          {p?.meta?.uploaderName ? (
                            <span> • Uploaded by {p.meta.uploaderName}</span>
                          ) : p?.meta?.uploaderId && String(p.meta.uploaderId) === String(currentUserData?._id) ? (
                            <span> • Uploaded by You</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <>
                          <button
                            onClick={() => handlePreviewUpload(p)}
                            className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                            title="Preview file"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleEditUpload(p)}
                            disabled={!(p?.meta && p?.meta.uploaderId && String(p.meta.uploaderId) === String(currentUserData?._id))}
                            className={`text-sm px-2 py-1 rounded ${p?.meta && p?.meta.uploaderId && String(p.meta.uploaderId) === String(currentUserData?._id) ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
                            title={p?.meta && p?.meta.uploaderId && String(p.meta.uploaderId) === String(currentUserData?._id) ? 'Edit file contents' : 'Only the uploader can edit this file'}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUpload(p)}
                            className="text-sm text-red-600 px-2 py-1 rounded hover:bg-red-50"
                            title="Delete file"
                          >
                            Delete
                          </button>
                        </>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            const hodUploads = uploadedPlans.filter(p => p?.meta && String(p.meta.uploaderId) === String(currentUserData?._id));
            const deptUploads = uploadedPlans.filter(p => p?.meta && p?.meta.uploaderDepartment && String(p.meta.uploaderDepartment) === String(userDept) && String(p.meta.uploaderId) !== String(currentUserData?._id));
            const otherUploads = uploadedPlans.filter(p => !hodUploads.includes(p) && !deptUploads.includes(p));

            return (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Your Uploads ({hodUploads.length})</h4>
                  {hodUploads.length === 0 ? (
                    <div className="text-sm text-gray-500">No uploads by you.</div>
                  ) : (
                    <div className="space-y-2">
                      {hodUploads.map((p) => (
                        <div key={p._id || p.name} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-800">{p.originalName || p.name}</div>
                            <div className="text-xs text-gray-500">{new Date(p.uploadedAt || p.createdAt || Date.now()).toLocaleString()} • Uploaded by You</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handlePreviewUpload(p)} className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100" title="Preview file">Preview</button>
                            <button onClick={() => handleEditUpload(p)} className="text-sm px-2 py-1 rounded text-gray-600 hover:bg-gray-100" title="Edit file contents">Edit</button>
                            <button onClick={() => handleDeleteUpload(p)} className="text-sm text-red-600 px-2 py-1 rounded hover:bg-red-50" title="Delete file">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Department Uploads ({deptUploads.length})</h4>
                  {deptUploads.length === 0 ? (
                    <div className="text-sm text-gray-500">No uploads from your department.</div>
                  ) : (
                    <div className="space-y-2">
                      {deptUploads.map((p) => (
                        <div key={p._id || p.name} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-800">{p.originalName || p.name}</div>
                            <div className="text-xs text-gray-500">{new Date(p.uploadedAt || p.createdAt || Date.now()).toLocaleString()} {p?.meta?.uploaderName ? (<span> • Uploaded by {p.meta.uploaderName}</span>) : null}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handlePreviewUpload(p)} className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100" title="Preview file">Preview</button>
                            <button onClick={() => handleEditUpload(p)} disabled className="text-sm px-2 py-1 rounded text-gray-400 cursor-not-allowed" title="Only the uploader can edit this file">Edit</button>
                            <button onClick={() => handleDeleteUpload(p)} className="text-sm text-red-600 px-2 py-1 rounded hover:bg-red-50" title="Delete file">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {otherUploads.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Other Uploads ({otherUploads.length})</h4>
                    <div className="space-y-2">
                      {otherUploads.map((p) => (
                        <div key={p._id || p.name} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-800">{p.originalName || p.name}</div>
                            <div className="text-xs text-gray-500">{new Date(p.uploadedAt || p.createdAt || Date.now()).toLocaleString()} {p?.meta?.uploaderName ? (<span> • Uploaded by {p.meta.uploaderName}</span>) : null}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handlePreviewUpload(p)} className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100" title="Preview file">Preview</button>
                            <button onClick={() => handleEditUpload(p)} disabled className="text-sm px-2 py-1 rounded text-gray-400 cursor-not-allowed" title="Only the uploader can edit this file">Edit</button>
                            <button onClick={() => handleDeleteUpload(p)} className="text-sm text-red-600 px-2 py-1 rounded hover:bg-red-50" title="Delete file">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {calendars
          .filter(calendar => isUserAssignedToSubject(calendar.subjectId?._id || calendar.subjectId))
          .map((calendar) => (
          <div
            key={calendar._id}
            className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">
                    Created by: <span className="font-medium text-gray-800">{calendar.createdByName || calendar.facultyName || 'Unknown'}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {calendar.title}
                  </h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <BookOpen size={16} />
                    {calendar.subjectName}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    calendar.status
                  )}`}
                >
                  {calendar.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Academic Year:</span>
                  <span className="font-medium">{calendar.academicYear}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Semester:</span>
                  <span className="font-medium">{calendar.semester}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Faculty:</span>
                  <span className="font-medium">{calendar.facultyName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Topics:</span>
                  <span className="font-medium">
                    {calendar.topics?.length || 0}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Progress
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {computeProgress(calendar)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(
                      computeProgress(calendar)
                    )}`}
                    style={{ width: `${computeProgress(calendar)}%` }}
                  ></div>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-purple-700">
                  {computeProgress(calendar) || 0}%
                </div>
                <div className="text-xs text-gray-500">Completion Rate</div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCalendar(calendar)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handlePrintView(calendar)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Print View"
                  >
                    <FileText size={16} />
                  </button>
                  {canEditCalendar(calendar) && (
                    <button
                      onClick={() => handleEdit(calendar)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                  {canDeleteCalendar(calendar) && (
                    <button
                      onClick={() => handleDeleteCalendar(calendar._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {calendar.status === "Draft" && canPublishCalendar(calendar) && (
                  <button
                    onClick={() => handlePublishCalendar(calendar._id)}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 transition-colors"
                  >
                    Publish
                  </button>
                )}
              </div>

              {/* Published indicator */}
              {calendar.isPublished && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={12} />
                  Published
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {calendars.filter(calendar => isUserAssignedToSubject(calendar.subjectId?._id || calendar.subjectId)).length === 0 && (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Academic Calendars
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first academic calendar
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Create Calendar
          </button>
        </div>
      )}

      {/* Create/Edit Modal would go here */}
      {showCreateModal && (
        <CreateCalendarModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCalendars();
          }}
          subjects={subjects}
          faculty={faculty}
          userData={currentUserData}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingCalendar && (
        <EditCalendarModal
          isOpen={showEditModal}
          calendar={editingCalendar}
          onClose={() => {
            setShowEditModal(false);
            setEditingCalendar(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingCalendar(null);
            fetchCalendars();
          }}
          subjects={subjects}
          faculty={faculty}
          userData={currentUserData}
        />
      )}

      {/* Calendar Detail Modal would go here */}
      {selectedCalendar && (
        <CalendarDetailModal
          calendar={selectedCalendar}
          onClose={() => setSelectedCalendar(null)}
          onUpdate={fetchCalendars}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">File Preview</h3>
              <div className="flex items-center gap-2">
                {isEditingPreview ? (
                  <>
                    <button
                      onClick={async () => {
                        // Save edited preview
                        if (!editingFile) return;
                        setSavingPreview(true);
                        try {
                          const token = localStorage.getItem('authToken');
                          const res = await fetch(
                            `${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/api/academic-calendar/upload/${encodeURIComponent(editingFile.name)}/save`,
                            {
                              method: 'POST',
                              headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ sheets: previewData.sheets }),
                            }
                          );

                          const data = await res.json();
                          if (res.ok && data.success) {
                            // update uploadedPlans entry's timestamp/size
                            setUploadedPlans((prev) => prev.map((p) => p.name === editingFile.name ? ({ ...p, ...data.file }) : p));
                            const local = JSON.parse(localStorage.getItem('localUploadedPlans') || '[]');
                            localStorage.setItem('localUploadedPlans', JSON.stringify(local.map((p) => p.name === editingFile.name ? ({ ...p, ...data.file }) : p)));
                            alert('Saved successfully');
                            setIsEditingPreview(false);
                            setEditingFile(null);
                            setShowPreviewModal(false);
                            setPreviewData(null);
                          } else {
                            console.error('Failed to save edited file', data);
                            alert(data?.message || 'Failed to save file');
                          }
                        } catch (err) {
                          console.error('Save error:', err);
                          alert('Error saving file');
                        } finally {
                          setSavingPreview(false);
                        }
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      disabled={savingPreview}
                    >
                      {savingPreview ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingPreview(false);
                        setEditingFile(null);
                        setShowPreviewModal(false);
                        setPreviewData(null);
                        setPreviewError(null);
                      }}
                      className="text-gray-600 px-3 py-1 rounded hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowPreviewModal(false);
                        setPreviewData(null);
                        setPreviewError(null);
                      }}
                      className="text-gray-600 px-3 py-1 rounded hover:bg-gray-100"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>

            {previewLoading && <div>Loading preview...</div>}
            {previewError && <div className="text-red-600">{previewError}</div>}

            {/* If server returned plain text preview (DOCX), show it */}
            {previewData && previewData.text && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Document Preview</h4>
                  {previewData.meta && previewData.meta.uploaderName && (
                    <div className="text-xs text-gray-500">Uploaded by {previewData.meta.uploaderName}</div>
                  )}
                </div>
                <div className="border rounded p-4 max-h-[60vh] overflow-auto bg-gray-50">
                  <pre className="whitespace-pre-wrap break-words text-sm text-gray-800">{previewData.text}</pre>
                </div>
              </div>
            )}

            {/* If preview not available but we have a file URL, offer download/open fallback */}
            {previewData && previewData.fileUrl && !previewData.sheets && !previewData.text && (
              <div className="py-4">
                <div className="text-sm text-gray-700 mb-2">No preview available for this file. You can download or open it:</div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewData.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                  >
                    Open file
                  </a>
                  <a
                    href={previewData.fileUrl}
                    download
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download
                  </a>
                </div>
              </div>
            )}

            {previewData && previewData.sheets && (
              <div>
                {previewData.sheets.map((sheet, sIdx) => (
                  <div key={sIdx} className="mb-6">
                    <h4 className="font-medium mb-2">{sheet.name}</h4>
                    <div className="overflow-auto border rounded">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          {sheet.rows && sheet.rows.length > 0 && (
                            <tr>
                              {sheet.rows[0].map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left border">{h}</th>
                              ))}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {sheet.rows && sheet.rows.slice(1).map((r, ri) => (
                            <tr key={ri} className="odd:bg-white even:bg-gray-50">
                              {r.map((cell, ci) => (
                                <td key={ci} className="px-3 py-2 border">
                                  {isEditingPreview ? (
                                    <input
                                      value={previewData.sheets[sIdx].rows[ri+1][ci] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setPreviewData((prev) => {
                                          const copy = JSON.parse(JSON.stringify(prev));
                                          if (copy.sheets && copy.sheets[sIdx] && copy.sheets[sIdx].rows) {
                                            copy.sheets[sIdx].rows[ri+1][ci] = val;
                                          }
                                          return copy;
                                        });
                                      }}
                                      className="w-full px-1 py-0 border rounded"
                                    />
                                  ) : (
                                    cell
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Create Calendar Modal Component
const CreateCalendarModal = ({
  isOpen,
  onClose,
  onSuccess,
  subjects,
  faculty,
  userData,
}) => {
  const [formData, setFormData] = useState({
    academicYear:
      new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    semester: "",
    subjectId: "",
    facultyId: "",
    title: "",
    description: "",
    department: userData?.department || "",
    institutionName: "NAGARJUNA UNIVERSITY",
    startDate: "",
    endDate: "",
    topics: [],
  });
  const [newTopic, setNewTopic] = useState({
    name: "",
    description: "",
    plannedDate: "",
    estimatedHours: 1,
  });
  const [loading, setLoading] = useState(false);
  const [subjectFaculty, setSubjectFaculty] = useState([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);

  // Fetch faculty when subject changes
  React.useEffect(() => {
    if (formData.subjectId) {
      fetchFacultiesBySubject(formData.subjectId);
    } else {
      setSubjectFaculty(faculty); // Show all department faculty when no subject selected
    }
  }, [formData.subjectId, faculty]);

  // Initialize subject faculty with all faculty
  React.useEffect(() => {
    setSubjectFaculty(faculty);
  }, [faculty]);

  const fetchFacultiesBySubject = async (subjectId) => {
    try {
      setLoadingFaculties(true);
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/faculty/subject/${subjectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSubjectFaculty(data.data);
      } else {
        setSubjectFaculty([]);
      }
    } catch (error) {
      console.error("Error fetching faculty by subject:", error);
      setSubjectFaculty([]);
    } finally {
      setLoadingFaculties(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");

      // Transform topics to match backend schema
      const transformedFormData = {
        ...formData,
        topics: formData.topics.map((topic) => ({
          topicName: topic.name,
          description: topic.description,
          plannedDate: topic.plannedDate,
          estimatedHours: topic.estimatedHours,
          status: "Planned",
        })),
      };

      const response = await fetch(
        "https://backenderp.tarstech.in/api/academic-calendar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(transformedFormData),
        }
      );

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert("Error creating calendar: " + error.message);
      }
    } catch (error) {
      console.error("Error creating calendar:", error);
      alert("Error creating calendar");
    } finally {
      setLoading(false);
    }
  };

  const addTopic = () => {
    if (newTopic.name && newTopic.plannedDate) {
      setFormData((prev) => ({
        ...prev,
        topics: [...prev.topics, { ...newTopic, id: Date.now() }],
      }));
      setNewTopic({
        name: "",
        description: "",
        plannedDate: "",
        estimatedHours: 1,
      });
    }
  };

  const removeTopic = (topicId) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((topic) => topic.id !== topicId),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Teaching Plan
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Calendar title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    academicYear: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="2024-2025"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester
              </label>
              <select
                value={formData.semester}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, semester: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={formData.subjectId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    subjectId: e.target.value,
                    facultyId: "", // Clear faculty selection when subject changes
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => {
                  // Debug: Log userData and subject details
                  console.log('CreateModal - userData:', userData);
                  console.log('CreateModal - subject:', subject);
                  console.log('CreateModal - userData.subjects:', userData?.subjects);
                  console.log('CreateModal - userData.subjectsTaught:', userData?.subjectsTaught);
                  
                  // Role-based subject access:
                  const isHod = String(userData?.role || "").toLowerCase() === "hod";
                  
                  // HODs can see all subjects, faculty only see assigned subjects
                  const userSubjectsArray = userData?.subjectsTaught || userData?.subjects || [];
                  const userSubjects = userSubjectsArray.map((s) => String(s._id || s));
                  const isAssignedToUser = isHod || userSubjects.includes(String(subject._id));
                  
                  console.log('CreateModal - isHod:', isHod);
                  console.log('CreateModal - userSubjectsArray:', userSubjectsArray);
                  console.log('CreateModal - userSubjects (IDs):', userSubjects);
                  console.log('CreateModal - current subject ID:', String(subject._id));
                  console.log('CreateModal - isAssignedToUser:', isAssignedToUser);

                  return (
                    <option
                      key={subject._id}
                      value={subject._id}
                      disabled={!isAssignedToUser}
                      className={!isAssignedToUser ? "text-gray-400" : ""}
                    >
                      {subject.name} ({subject.code})
                      {!isAssignedToUser && " - Not assigned to you"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned Faculty
              </label>
              <select
                value={formData.facultyId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    facultyId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loadingFaculties}
              >
                <option value="">
                  {loadingFaculties ? "Loading faculty..." : "Select Faculty"}
                </option>
                {!loadingFaculties &&
                subjectFaculty.length === 0 &&
                formData.subjectId ? (
                  <option value="" disabled>
                    No faculty assigned to this subject
                  </option>
                ) : !loadingFaculties && subjectFaculty.length === 0 ? (
                  <option value="" disabled>
                    No faculty found for this department
                  </option>
                ) : (
                  subjectFaculty.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name} ({f.employeeId})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Institution Name
              </label>
              <input
                type="text"
                value={formData.institutionName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    institutionName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Institution Name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Department"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Optional description for the calendar"
            />
          </div>

          {/* Topics Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Topics/Lessons
            </h3>

            {/* Add New Topic */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-700 mb-3">Add New Topic</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Topic name"
                  value={newTopic.name}
                  onChange={(e) =>
                    setNewTopic((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newTopic.description}
                  onChange={(e) =>
                    setNewTopic((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={newTopic.plannedDate}
                  onChange={(e) =>
                    setNewTopic((prev) => ({
                      ...prev,
                      plannedDate: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Hours"
                    min="1"
                    value={newTopic.estimatedHours}
                    onChange={(e) =>
                      setNewTopic((prev) => ({
                        ...prev,
                        estimatedHours: parseInt(e.target.value),
                      }))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addTopic}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Topics List */}
            {formData.topics.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">
                  Added Topics ({formData.topics.length})
                </h4>
                {formData.topics.map((topic, index) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between bg-white p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {topic.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {topic.description} •{" "}
                        {new Date(topic.plannedDate).toLocaleDateString()} •{" "}
                        {topic.estimatedHours}h
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTopic(topic.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Calendar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Calendar Modal Component
const EditCalendarModal = ({
  isOpen,
  calendar,
  onClose,
  onSuccess,
  subjects,
  faculty,
  userData,
}) => {
  const [formData, setFormData] = useState({
    academicYear: calendar?.academicYear || "",
    semester: calendar?.semester || "",
    subjectId: calendar?.subjectId?._id || calendar?.subjectId || "",
    facultyId: calendar?.facultyId?._id || calendar?.facultyId || "",
    title: calendar?.title || "",
    description: calendar?.description || "",
    department: calendar?.department || userData?.department || "",
    institutionName: calendar?.institutionName || "NAGARJUNA UNIVERSITY",
    startDate: calendar?.startDate ? new Date(calendar.startDate).toISOString().split('T')[0] : "",
    endDate: calendar?.endDate ? new Date(calendar.endDate).toISOString().split('T')[0] : "",
    topics: calendar?.topics?.map(topic => ({
      id: topic._id || Math.random().toString(36).substr(2, 9),
      name: topic.topicName || topic.name,
      description: topic.description,
      plannedDate: topic.plannedDate ? new Date(topic.plannedDate).toISOString().split('T')[0] : "",
      estimatedHours: topic.estimatedHours || 1,
    })) || [],
  });
  const [newTopic, setNewTopic] = useState({
    name: "",
    description: "",
    plannedDate: "",
    estimatedHours: 1,
  });
  const [loading, setLoading] = useState(false);
  const [subjectFaculty, setSubjectFaculty] = useState([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);

  // Fetch faculty when subject changes
  React.useEffect(() => {
    if (formData.subjectId) {
      fetchFacultiesBySubject(formData.subjectId);
    } else {
      setSubjectFaculty(faculty); // Show all department faculty when no subject selected
    }
  }, [formData.subjectId, faculty]);

  // Initialize subject faculty with all faculty
  React.useEffect(() => {
    setSubjectFaculty(faculty);
  }, [faculty]);

  const fetchFacultiesBySubject = async (subjectId) => {
    try {
      setLoadingFaculties(true);
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/faculty/subject/${subjectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSubjectFaculty(data.data);
      } else {
        setSubjectFaculty([]);
      }
    } catch (error) {
      console.error("Error fetching faculty by subject:", error);
      setSubjectFaculty([]);
    } finally {
      setLoadingFaculties(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");

      // Transform topics to match backend schema
      const transformedFormData = {
        ...formData,
        topics: formData.topics.map((topic) => ({
          topicName: topic.name,
          description: topic.description,
          plannedDate: topic.plannedDate,
          estimatedHours: topic.estimatedHours,
          status: "Planned",
        })),
      };

      const response = await fetch(
        `https://backenderp.tarstech.in/api/academic-calendar/${calendar._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(transformedFormData),
        }
      );

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert("Error updating calendar: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating calendar:", error);
      alert("Error updating calendar");
    } finally {
      setLoading(false);
    }
  };

  const addTopic = () => {
    if (!newTopic.name || !newTopic.plannedDate) return;

    const topic = {
      id: Math.random().toString(36).substr(2, 9),
      ...newTopic,
    };

    setFormData((prev) => ({
      ...prev,
      topics: [...prev.topics, topic],
    }));

    setNewTopic({
      name: "",
      description: "",
      plannedDate: "",
      estimatedHours: 1,
    });
  };

  const removeTopic = (topicId) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((topic) => topic.id !== topicId),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            Edit Academic Calendar
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year *
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    academicYear: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="2024-2025"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester *
              </label>
              <select
                value={formData.semester}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    semester: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={formData.subjectId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    subjectId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => {
                  // Debug: Log userData and subject details
                  console.log('EditModal - userData:', userData);
                  console.log('EditModal - subject:', subject);
                  console.log('EditModal - userData.subjects:', userData?.subjects);
                  console.log('EditModal - userData.subjectsTaught:', userData?.subjectsTaught);
                  
                  // Role-based subject access:
                  const isHod = String(userData?.role || "").toLowerCase() === "hod";
                  
                  // HODs can see all subjects, faculty only see assigned subjects
                  const userSubjectsArray = userData?.subjectsTaught || userData?.subjects || [];
                  const userSubjects = userSubjectsArray.map((s) => String(s._id || s));
                  const isAssignedToUser = isHod || userSubjects.includes(String(subject._id));
                  
                  console.log('EditModal - isHod:', isHod);
                  console.log('EditModal - userSubjects:', userSubjects, 'isAssignedToUser:', isAssignedToUser);

                  return (
                    <option
                      key={subject._id}
                      value={subject._id}
                      disabled={!isAssignedToUser}
                      className={!isAssignedToUser ? "text-gray-400" : ""}
                    >
                      {subject.name} ({subject.code})
                      {!isAssignedToUser && " - Not assigned to you"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faculty *
              </label>
              <select
                value={formData.facultyId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    facultyId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingFaculties}
                required
              >
                <option value="">
                  {loadingFaculties ? "Loading..." : "Select Faculty"}
                </option>
                {subjectFaculty.map((fac) => (
                  <option key={fac._id} value={fac._id}>
                    {fac.name} ({fac.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Calendar title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Optional description for the calendar"
            />
          </div>

          {/* Topics Section */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Topics/Lessons
            </h3>

            {/* Add New Topic */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-700 mb-3">Add New Topic</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Topic name"
                  value={newTopic.name}
                  onChange={(e) =>
                    setNewTopic((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newTopic.description}
                  onChange={(e) =>
                    setNewTopic((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={newTopic.plannedDate}
                  onChange={(e) =>
                    setNewTopic((prev) => ({
                      ...prev,
                      plannedDate: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addTopic}
                  disabled={!newTopic.name || !newTopic.plannedDate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Add Topic
                </button>
              </div>
            </div>

            {/* Existing Topics */}
            {formData.topics.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Topics</h4>
                <div className="space-y-2">
                  {formData.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between bg-white p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {topic.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {topic.description} •{" "}
                          {topic.plannedDate ? new Date(topic.plannedDate).toLocaleDateString() : 'No date'} •{" "}
                          {topic.estimatedHours}h
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTopic(topic.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Calendar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Calendar Detail Modal Component
const CalendarDetailModal = ({ calendar, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [editingTopic, setEditingTopic] = useState(null);
  const [newTopic, setNewTopic] = useState({
    name: "",
    description: "",
    plannedDate: "",
    estimatedHours: 1,
  });
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/academic-calendar/${calendar._id}/publish`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        alert("Error publishing calendar: " + error.message);
      }
    } catch (error) {
      console.error("Error publishing calendar:", error);
      alert("Error publishing calendar");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic.name || !newTopic.plannedDate) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/academic-calendar/${calendar._id}/topics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newTopic),
        }
      );

      if (response.ok) {
        setNewTopic({
          name: "",
          description: "",
          plannedDate: "",
          estimatedHours: 1,
        });
        onUpdate();
      } else {
        const error = await response.json();
        alert("Error adding topic: " + error.message);
      }
    } catch (error) {
      console.error("Error adding topic:", error);
      alert("Error adding topic");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTopic = async (topicId, updates) => {
    if (!topicId) {
      alert("Error: Topic ID is missing");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `https://backenderp.tarstech.in/api/academic-calendar/${calendar._id}/topics/${topicId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        setEditingTopic(null);
        onUpdate();
      } else {
        const error = await response.json();
        alert("Error updating topic: " + error.message);
      }
    } catch (error) {
      console.error("Error updating topic:", error);
      alert("Error updating topic");
    } finally {
      setLoading(false);
    }
  };

  if (!calendar) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[99vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Academic Calendar Details
            </h2>
            <p className="text-gray-600">
              {calendar.title} - {calendar.subjectId?.name} (
              {calendar.subjectId?.code}) - {calendar.academicYear} Semester{" "}
              {calendar.semester}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-medium ${
              activeTab === "overview"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("topics")}
            className={`px-6 py-3 font-medium ${
              activeTab === "topics"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Topics ({calendar.topics?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-6 py-3 font-medium ${
              activeTab === "analytics"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Analytics
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="text-blue-600" size={20} />
                    <span className="font-medium text-blue-800">Subject</span>
                  </div>
                  <p className="text-blue-900">{calendar.subjectId?.name}</p>
                  <p className="text-blue-700 text-sm">
                    {calendar.subjectId?.code}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-green-600" size={20} />
                    <span className="font-medium text-green-800">
                      Academic Year
                    </span>
                  </div>
                  <p className="text-green-900">{calendar.academicYear}</p>
                  <p className="text-green-700 text-sm">
                    Semester {calendar.semester}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-purple-600" size={20} />
                    <span className="font-medium text-purple-800">
                      Total Hours
                    </span>
                  </div>
                  <p className="text-purple-900">
                    {calendar.topics?.reduce(
                      (sum, topic) => sum + (topic.estimatedHours || 0),
                      0
                    ) || 0}
                    h
                  </p>
                  <p className="text-purple-700 text-sm">
                    {calendar.topics?.length || 0} topics
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {calendar.status === "published" ? (
                      <CheckCircle className="text-yellow-600" size={20} />
                    ) : (
                      <AlertCircle className="text-yellow-600" size={20} />
                    )}
                    <span className="font-medium text-yellow-800">Status</span>
                  </div>
                  <p className="text-yellow-900 capitalize">
                    {calendar.status}
                  </p>
                  <p className="text-yellow-700 text-sm">
                    {calendar.status === "published" ? "Active" : "Draft"}
                  </p>
                </div>
              </div>

              {calendar.description && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-600">{calendar.description}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium text-gray-800 mb-2">
                  Assigned Faculty
                </h3>
                <p className="text-gray-600">
                  {calendar.facultyId?.name || "Not assigned"}
                  {calendar.facultyId?.employeeId &&
                    ` (${calendar.facultyId.employeeId})`}
                </p>
              </div>

              {calendar.status === "draft" && (
                <div className="pt-4 border-t">
                  <button
                    onClick={handlePublish}
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? "Publishing..." : "Publish Calendar"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Topics Tab */}
          {activeTab === "topics" && (
            <div className="space-y-6">
              {/* Add New Topic */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-3">
                  Add New Topic
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder="Topic name"
                    value={newTopic.name}
                    onChange={(e) =>
                      setNewTopic((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newTopic.description}
                    onChange={(e) =>
                      setNewTopic((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={newTopic.plannedDate}
                    onChange={(e) =>
                      setNewTopic((prev) => ({
                        ...prev,
                        plannedDate: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Hours"
                    min="1"
                    value={newTopic.estimatedHours}
                    onChange={(e) =>
                      setNewTopic((prev) => ({
                        ...prev,
                        estimatedHours: parseInt(e.target.value),
                      }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddTopic}
                    disabled={
                      loading || !newTopic.name || !newTopic.plannedDate
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Adding..." : "Add Topic"}
                  </button>
                </div>
              </div>

              {/* Topics List */}
              <div className="space-y-3">
                {calendar.topics && calendar.topics.length > 0 ? (
                  calendar.topics.map((topic, index) => (
                    <div
                      key={topic.id || index}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      {editingTopic === topic.id ? (
                        <EditTopicForm
                          topic={topic}
                          onSave={(updates) => {
                            console.log("Updating topic with ID:", topic.id);
                            handleUpdateTopic(topic.id, updates);
                          }}
                          onCancel={() => setEditingTopic(null)}
                          loading={loading}
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">
                              {topic.name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {topic.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>
                                📅{" "}
                                {new Date(
                                  topic.plannedDate
                                ).toLocaleDateString()}
                              </span>
                              <span>⏱️ {topic.estimatedHours}h</span>
                              {topic.actualDate && (
                                <span>
                                  ✅ Completed{" "}
                                  {new Date(
                                    topic.actualDate
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                console.log("Editing topic:", topic);
                                setEditingTopic(topic.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen
                      size={48}
                      className="mx-auto mb-4 text-gray-300"
                    />
                    <p>No topics added yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Topics Progress
                  </h4>
                  <div className="text-2xl font-bold text-blue-900">
                    {calendar.topics?.filter((t) => t.actualDate).length || 0} /{" "}
                    {calendar.topics?.length || 0}
                  </div>
                  <p className="text-blue-700 text-sm">Completed</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    Hours Planned
                  </h4>
                  <div className="text-2xl font-bold text-green-900">
                    {calendar.topics?.reduce(
                      (sum, topic) => sum + (topic.estimatedHours || 0),
                      0
                    ) || 0}
                  </div>
                  <p className="text-green-700 text-sm">Total hours</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">
                    Completion Rate
                  </h4>
                  <div className="text-2xl font-bold text-purple-900">
                    {calendar.topics?.length
                      ? Math.round(
                          (calendar.topics.filter((t) => t.actualDate).length /
                            calendar.topics.length) *
                            100
                        )
                      : 0}
                    %
                  </div>
                  <p className="text-purple-700 text-sm">Overall</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 mb-4">
                  Timeline View
                </h4>
                <div className="space-y-2">
                  {calendar.topics
                    ?.sort(
                      (a, b) =>
                        new Date(a.plannedDate) - new Date(b.plannedDate)
                    )
                    .map((topic, index) => (
                      <div
                        key={topic._id || index}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            topic.actualDate ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <div className="flex-1">
                          <span className="font-medium">{topic.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({new Date(topic.plannedDate).toLocaleDateString()})
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {topic.estimatedHours}h
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Topic Form Component
const EditTopicForm = ({ topic, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: topic.name || "",
    description: topic.description || "",
    plannedDate: topic.plannedDate ? topic.plannedDate.split("T")[0] : "",
    estimatedHours: topic.estimatedHours || 1,
    actualDate: topic.actualDate ? topic.actualDate.split("T")[0] : "",
    notes: topic.notes || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Topic name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="date"
          value={formData.plannedDate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, plannedDate: e.target.value }))
          }
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <input
          type="number"
          placeholder="Estimated hours"
          min="1"
          value={formData.estimatedHours}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              estimatedHours: parseInt(e.target.value),
            }))
          }
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="date"
          placeholder="Actual completion date"
          value={formData.actualDate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, actualDate: e.target.value }))
          }
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="Notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
};

export default AcademicCalendar;
