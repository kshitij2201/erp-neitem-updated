import React from 'react';
import IndustrialVisitList from '../../../library/components/IndustrialVisitList';

const HodIndustrialVisits = ({ userData }) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Industrial Visits</h1>
        <p className="text-sm text-gray-500">Visits created by Course Coordinators for your department</p>
      </div>
      <IndustrialVisitList department={userData?.department} />
    </div>
  );
};

export default HodIndustrialVisits;
