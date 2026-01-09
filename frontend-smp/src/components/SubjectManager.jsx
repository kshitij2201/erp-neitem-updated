import { useEffect, useState } from "react";
import axios from "axios";

const SubjectManager = () => {
  const [streams, setStreams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editedSubjectName, setEditedSubjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const token = localStorage.getItem("token");

  // Helper: extract stream id from department object (handles multiple shapes)
  const getStreamIdFromDept = (dept) => {
    if (!dept) return "";
    if (typeof dept.stream === "string") return dept.stream;
    if (dept.stream && typeof dept.stream === "object") return dept.stream._id || dept.stream.id || "";
    return dept.streamId || "";
  };


  useEffect(() => {
    fetchStreams();
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (semesters.length > 0 && !selectedSemester) {
      setSelectedSemester(semesters[0].number?.toString() || "");
    }
  }, [semesters]);

  const fetchSemesters = async () => {
    try {
      const res = await axios.get("https://backenderp.tarstech.in/api/superadmin/semesters", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const semData = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setSemesters(semData);
      if (semData.length > 0) {
        setSelectedSemester(semData[0].number?.toString());
      }
    } catch (err) {
      console.error("Failed to fetch semesters", err);
    }
  };

  useEffect(() => {
    // Clear departments/subjects when stream changes, then fetch for selected stream
    setDepartments([]);
    setSelectedDepartmentId("");
    setSubjects([]);
    if (selectedStreamId) {
      fetchDepartments(selectedStreamId);
    }
  }, [selectedStreamId]);

  useEffect(() => {
    if (selectedDepartmentId) {
      fetchSubjects(selectedDepartmentId);
    }
  }, [selectedDepartmentId]);

  const fetchStreams = async () => {
    try {
      const res = await axios.get(
        "https://backenderp.tarstech.in/api/superadmin/streams",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const streamsData = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setStreams(streamsData);
      if (streamsData.length > 0 && !selectedStreamId) {
        setSelectedStreamId(streamsData[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch streams", err);
    }
  };

  const fetchDepartments = async (streamId) => {
    try {
      const res = await axios.get(
        `https://backenderp.tarstech.in/api/superadmin/departments?streamId=${streamId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      // Find stream name for fallback matching if departments store stream as name
      const streamObj = streams.find((s) => s._id === streamId) || {};
      const streamName = (streamObj.name || "").toString().trim().toLowerCase();

      // Prefer explicit matches (by id or by stream name)
      const exactMatches = data.filter((dept) => {
        const deptStreamId = getStreamIdFromDept(dept);
        if (deptStreamId && deptStreamId === streamId) return true;

        if (typeof dept.stream === "string") {
          if (dept.stream.toString().trim().toLowerCase() === streamName) return true;
          return false;
        }

        if (dept.stream && typeof dept.stream === "object") {
          if ((dept.stream._id && dept.stream._id === streamId) ||
            (dept.stream.name && dept.stream.name.toString().trim().toLowerCase() === streamName)) {
            return true;
          }
          return false;
        }

        return false;
      });

      const unlabeled = data.filter((dept) => !dept.stream && !dept.streamId);
      // If we have explicit matches, use them. Otherwise use unlabeled departments if available.
      let filtered = exactMatches.length > 0 ? exactMatches : (unlabeled.length > 0 ? unlabeled : []);

      const hasTagged = data.some((d) => !!d.stream || !!d.streamId);
      console.log(`fetchDepartments streamId=${streamId} streamName=${streamName} dataCount=${data.length} tagged=${hasTagged} exactMatches=${exactMatches.length} unlabeled=${unlabeled.length} final=${filtered.length}`, {
        exactNames: exactMatches.map((d) => d.name),
        unlabeledNames: unlabeled.map((d) => d.name),
      });

      setDepartments(filtered);
      if (filtered.length > 0) {
        setSelectedDepartmentId(filtered[0]._id);
      } else {
        setSelectedDepartmentId("");
      }
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };  

  const fetchSubjects = async (departmentId) => {
    try {
      if (!departmentId) {
        setSubjects([]);
        return;
      }
      const res = await axios.get(
        `https://backenderp.tarstech.in/api/superadmin/subjects?departmentId=${departmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setSubjects(data);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };  

  const handleAddSubject = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!newSubject.trim()) {
      setErrorMsg("Please enter a subject name.");
      return;
    }
    if (!selectedDepartmentId) {
      setErrorMsg("Please select a department.");
      return;
    }
    if (!selectedSemester) {
      setErrorMsg("Please select a semester.");
      return;
    }

    setIsSaving(true);
    try {
      await axios.post(
        "https://backenderp.tarstech.in/api/superadmin/subjects",
        { name: newSubject, department: selectedDepartmentId, semester: selectedSemester },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewSubject("");
      fetchSubjects(selectedDepartmentId);
      setSuccessMsg("Subject added successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error adding subject", err);
      setErrorMsg(err.response?.data?.error || "Failed to add subject.");
    } finally {
      setIsSaving(false);
    }
  };


  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `https://backenderp.tarstech.in/api/superadmin/subjects/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchSubjects(selectedDepartmentId);
    } catch (err) {
      console.error("Error deleting subject", err);
    }
  };

  const handleEdit = async (id) => {
    try {
      await axios.put(
        `https://backenderp.tarstech.in/api/superadmin/subjects/${id}`,
        { name: editedSubjectName, department: selectedDepartmentId, semester: selectedSemester },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEditingSubjectId(null);
      setEditedSubjectName("");
      fetchSubjects(selectedDepartmentId);
    } catch (err) {
      console.error("Error updating subject", err);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto my-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">
        Manage Subjects
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">
            Select Stream
          </label>
          <select
            value={selectedStreamId}
            onChange={(e) => setSelectedStreamId(e.target.value)}
            className="border border-gray-300 rounded-md py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
          >
            {streams.map((stream) => (
              <option key={stream._id} value={stream._id}>
                {stream.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">
            Select Department
          </label>
          <select
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            className="border border-gray-300 rounded-md py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
          >
            {departments.length === 0 ? (
              <option value="" disabled>
                No departments for selected stream
              </option>
            ) : (
              departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">Select Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="border border-gray-300 rounded-md py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
          >
            {semesters.map((sem) => (
              <option key={sem._id} value={sem.number?.toString()}>
                {sem.number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center mb-8">
        <input
          type="text"
          placeholder="Add new subject"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md py-2 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleAddSubject}
          disabled={isSaving || !newSubject.trim() || !selectedDepartmentId || !selectedSemester}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition duration-200 ease-in-out shadow-sm ${
            isSaving || !newSubject.trim() || !selectedDepartmentId || !selectedSemester
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {isSaving ? "Adding..." : "Add Subject"}
        </button>
      </div>

      {errorMsg && <p className="text-sm text-red-600 mt-2">{errorMsg}</p>}
      {successMsg && <p className="text-sm text-green-600 mt-2">{successMsg}</p>}


      {subjects.length > 0 ? (
        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {subjects.map((subject) => (
              <li
                key={subject._id}
                className="p-4 hover:bg-gray-100 transition duration-150 ease-in-out"
              >
                <div className="flex justify-between items-center">
                  {editingSubjectId === subject._id ? (
                    <div className="flex flex-1 items-center gap-3">
                      <input
                        type="text"
                        value={editedSubjectName}
                        onChange={(e) => setEditedSubjectName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md py-1.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleEdit(subject._id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-4 rounded-md transition duration-200 ease-in-out text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSubjectId(null)}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-1.5 px-4 rounded-md transition duration-200 ease-in-out text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-800 font-medium text-lg">
                        {subject.name} {subject.semester ? <span className="text-sm text-gray-500">(Sem {subject.semester})</span> : null}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSubjectId(subject._id);
                            setEditedSubjectName(subject.name);
                          }}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-1.5 px-4 rounded-md transition duration-200 ease-in-out text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(subject._id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1.5 px-4 rounded-md transition duration-200 ease-in-out text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No subjects found for this department.
          </p>
          <p className="text-gray-500 mt-2">
            Add a new subject to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubjectManager;
