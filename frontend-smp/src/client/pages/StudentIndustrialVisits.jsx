import React from 'react';
import IndustrialVisitList from '../../library/components/IndustrialVisitList';

const StudentIndustrialVisits = () => {
  const student = JSON.parse(localStorage.getItem('studentData') || 'null') || JSON.parse(localStorage.getItem('user') || 'null') || {};
  const dept = student.department || student.dept || '';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Industrial Visits</h1>
        <p className="text-sm text-gray-500">Visits available for your department</p>
      </div>
      <IndustrialVisitList department={dept} />
    </div>
  );
};

export default StudentIndustrialVisits;
