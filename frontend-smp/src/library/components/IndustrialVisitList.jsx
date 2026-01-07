import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const IndustrialVisitList = ({ department, compact = false }) => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStudentView, setIsStudentView] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let intervalId;

    const detectStudent = () => {
      try {
        const studentData = JSON.parse(localStorage.getItem('studentData') || 'null');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const isStudent = !!studentData || (user && (user.role === 'student' || user.type === 'student'));
        setIsStudentView(isStudent);
        return isStudent;
      } catch (e) {
        setIsStudentView(false);
        return false;
      }
    };

    const fetchVisits = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('authToken') || localStorage.getItem('token') || (JSON.parse(localStorage.getItem('user') || '{}').token);

        // Normalize department to a string if an object was passed
        let deptString = '';
        if (department) {
          if (typeof department === 'string') deptString = department;
          else if (typeof department === 'object') {
            deptString = (department.name || department.department || department.dept || department._id || '').toString();
          }
        }
        const deptQ = deptString ? `?department=${encodeURIComponent(deptString)}` : '';

        // If the current viewer is a student, request only visits created by CCs
        let creatorRoleQ = '';
        const isStudent = detectStudent();
        if (isStudent) {
          creatorRoleQ = (deptQ ? '&' : '?') + `creatorRole=cc`;
        }

        const apiBase = import.meta.env.VITE_API_URL || 'https://backenderp.tarstech.in';
        const res = await fetch(`${apiBase}/api/industrial-visits${deptQ}${creatorRoleQ}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error('Unauthorized (please login)');
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || 'Failed to load visits');
        }
        const data = await res.json();
        setVisits(data?.data || []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('IndustrialVisitList load error', err);
        setError(err.message || 'Failed to load');
        setVisits([]);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchVisits();

    // Poll for updates every 30s so students see newly created CC visits promptly
    intervalId = setInterval(fetchVisits, 30000);

    return () => clearInterval(intervalId);
  }, [department]);

  const studentBanner = isStudentView ? (
    <div className="mb-4 inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm">
      Showing visits created by CC for your department • Auto-refresh every 30s
    </div>
  ) : null;

  if (loading) return (
    <div className="p-4">
      {studentBanner}
      <div>Loading industrial visits...</div>
    </div>
  );

  if (error) {
    // Show login action for unauthorized
    if (error.toLowerCase().includes('unauthorized')) {
      return (
        <div className="p-4 text-red-600">
          {studentBanner}
          <div>{error}</div>
          <button onClick={() => navigate('/student/login')} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">Go to Login</button>
        </div>
      );
    }

    return (
      <div className="p-4 text-red-600">
        {studentBanner}
        {error}
      </div>
    );
  }

  if (!visits.length) return (
    <div className="p-4 text-sm text-gray-600">
      {studentBanner}
      <div>No industrial visits scheduled.</div>
      <div className="text-xs text-gray-500 mt-2">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '—'}</div>
    </div>
  );

  return (
    <div className={compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
      {visits.map((v) => (
        <div key={v._id || v.id} className="bg-white rounded-lg shadow p-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="text-lg font-semibold">{v.title}</div>
            <div className="text-sm text-gray-600">{v.company} • {v.location}</div>
            <div className="text-xs text-gray-500 mt-2">{v.industryType} • Dept: {v.department} • Sem: {v.semester}</div>
            <div className="text-xs text-gray-400 mt-1">Created: {new Date(v.createdAt).toLocaleString()}</div>
          </div>
          <div className="flex flex-col items-end ml-4 gap-2">
            {v.images && v.images.length > 0 ? (
              <img src={v.images[0]} alt={v.title} className="w-28 h-20 object-cover rounded" />
            ) : (
              <div className="w-28 h-20 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No image</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default IndustrialVisitList;
