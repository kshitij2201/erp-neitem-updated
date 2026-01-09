import React, { useState, useEffect } from 'react';

const IndustrialVisit = ({ userData }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visits, setVisits] = useState([]);
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    industryType: '',
    department: userData?.department || '',
    semester: '',
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const departmentQuery = form.department ? `?department=${encodeURIComponent(form.department)}` : '';
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/api/industrial-visits${departmentQuery}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          setVisits([]);
          return;
        }
        const data = await res.json();
        if (data && data.success) setVisits(data.data || []);
      } catch (err) {
        console.warn('Failed to load visits', err);
        setVisits([]);
      }
    };

    fetchVisits();
  }, [form.department]);

  // Remove local persistence; server holds canonical data
  // useEffect(() => {
  //   localStorage.setItem('industrialVisits', JSON.stringify(visits));
  // }, [visits]);

  // Fetch departments for dropdown
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/api/superadmin/departments`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const payload = await res.json();
        // support two possible shapes: array (old) or { departments: [] }
        const arr = Array.isArray(payload) ? payload : Array.isArray(payload.departments) ? payload.departments : [];
        const names = arr.map((d) => (typeof d === 'string' ? d : d.name || d.name?.name || ''));
        let deptList = names.filter(Boolean);
        // Ensure user's department appears and is selected by default
        if (userData?.department && !deptList.includes(userData.department)) {
          deptList = [userData.department, ...deptList];
        }
        setDepartments(deptList);
        // If no department selected in form, default to user's department when available
        if (!form.department && userData?.department) {
          setForm((prev) => ({ ...prev, department: userData.department }));
        }
      } catch (err) {
        console.warn('Failed to load departments', err);
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, [userData]);

  const openCreate = () => {
    setForm({ title: '', company: '', location: '', industryType: '', department: userData?.department || '', semester: '' });
    setImageFiles([]);
    setImagePreviews([]);
    setErrors({});
    setShowCreateModal(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];

    files.forEach((f) => {
      newFiles.push(f);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(f);
    });

    setImageFiles(newFiles);
  };

  const removePreview = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const err = {};
    if (!form.title.trim()) err.title = 'Visit Title is required';
    if (!form.company.trim()) err.company = 'Company / Industry Name is required';
    if (!form.location.trim()) err.location = 'Location / Address is required';
    if (!form.industryType.trim()) err.industryType = 'Industry Type is required';
    if (!form.department.trim()) err.department = 'Department is required';
    if (!form.semester) err.semester = 'Semester is required';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');

      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('company', form.company);
      formData.append('location', form.location);
      formData.append('industryType', form.industryType);
      formData.append('department', form.department);
      formData.append('semester', form.semester);

      // append files (name `images` expected by backend)
      imageFiles.forEach((file) => formData.append('images', file));

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/api/industrial-visits`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // IMPORTANT: do not set Content-Type; browser will set multipart boundary
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.message || 'Failed to create visit');
        setIsSubmitting(false);
        return;
      }

      // add the created visit to list and clear image state
      setVisits((prev) => [data.data, ...prev]);
      setImageFiles([]);
      setImagePreviews([]);
      setShowCreateModal(false);
      setIsSubmitting(false);
      alert('Industrial visit created');
    } catch (err) {
      console.error('Create visit failed', err);
      setIsSubmitting(false);
      alert('Failed to create visit');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this visit?')) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in'}/api/industrial-visits/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.message || 'Failed to delete');
        return;
      }
      setVisits((prev) => prev.filter((v) => v._id ? v._id !== id : v.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Industrial Visit</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded">Create Visit</button>
      </div>

      <p className="text-gray-600 mt-2">Manage and schedule industrial visits for your class here.</p>

      {/* Visits List */}
      <div className="mt-6 space-y-4">
        {visits.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-700">No visits scheduled.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visits.map((v) => (
              <div key={v._id || v.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold">{v.title}</div>
                    <div className="text-sm text-gray-600">{v.company} • {v.location}</div>
                    <div className="text-sm text-gray-500 mt-2">{v.industryType} • Dept: {v.department} • Sem: {v.semester}</div>
                    <div className="text-xs text-gray-400 mt-2">Created: {new Date(v.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {v.images && v.images.length > 0 && <img src={v.images[0]} alt="visit" className="w-24 h-16 object-cover rounded" />}
                    <button onClick={() => handleDelete(v._id || v.id)} className="text-red-600 text-sm">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create Industrial Visit</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500">Close</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="max-h-[52vh] overflow-auto pr-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium">Visit Title</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded" />
                  {errors.title && <div className="text-red-600 text-sm mt-1">{errors.title}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium">Company / Industry Name</label>
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 border rounded" />
                  {errors.company && <div className="text-red-600 text-sm mt-1">{errors.company}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium">Location / Address</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border rounded" />
                  {errors.location && <div className="text-red-600 text-sm mt-1">{errors.location}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium">Industry Type</label>
                  <input value={form.industryType} onChange={(e) => setForm({ ...form, industryType: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="e.g., Manufacturing, IT, Services" />
                  {errors.industryType && <div className="text-red-600 text-sm mt-1">{errors.industryType}</div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Department</label>
                    <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 border rounded">
                      <option value="">Select department</option>
                      {departments.length > 0 ? (
                        departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))
                      ) : (
                        <option value={form.department}>{form.department || 'No departments available'}</option>
                      )}
                    </select>
                    {errors.department && <div className="text-red-600 text-sm mt-1">{errors.department}</div>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Semester</label>
                    <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="w-full px-3 py-2 border rounded">
                      <option value="">Select semester</option>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.semester && <div className="text-red-600 text-sm mt-1">{errors.semester}</div>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium">Upload images</label>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="mt-1" />
                  {imagePreviews && imagePreviews.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {imagePreviews.map((src, idx) => (
                        <div key={idx} className="relative">
                          <img src={src} alt={`preview-${idx}`} className="w-28 h-20 object-cover rounded" />
                          <button type="button" onClick={() => removePreview(idx)} className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustrialVisit;

