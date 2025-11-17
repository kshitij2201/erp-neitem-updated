import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Download, Printer, ArrowLeft, FileText } from 'lucide-react';
import './print-styles.css';

const AcademicCalendarPrint = ({ calendar, onBack }) => {
  const printRef = useRef();
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    if (calendar) {
      console.log('Calendar data received:', calendar);
      // Process calendar data for print format
      const processedData = processCalendarForPrint(calendar);
      console.log('Processed data:', processedData);
      setPrintData(processedData);
    }
  }, [calendar]);

  const processCalendarForPrint = (cal) => {
    // Sort topics by planned date
    const sortedTopics = [...(cal.topics || [])].sort((a, b) => {
      const dateA = new Date(a.plannedDate || a.date || Date.now());
      const dateB = new Date(b.plannedDate || b.date || Date.now());
      return dateA - dateB;
    });

    // Generate date range for the calendar
    const startDate = new Date(cal.startDate || Date.now());
    const endDate = new Date(cal.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)); // 3 months from now if no end date
    
    // Create schedule entries
    const scheduleEntries = [];
    let currentWeek = 1;
    let topicIndex = 0;

    // Generate weekly schedule
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 7)) {
      if (topicIndex < sortedTopics.length) {
        const topic = sortedTopics[topicIndex];
        scheduleEntries.push({
          week: currentWeek,
          date: new Date(date),
          topic: topic,
          isScheduled: true
        });
        topicIndex++;
      } else {
        // Add empty weeks for completion
        scheduleEntries.push({
          week: currentWeek,
          date: new Date(date),
          topic: null,
          isScheduled: false
        });
      }
      currentWeek++;
    }

    return {
      ...cal,
      scheduleEntries,
      totalWeeks: currentWeek - 1,
      totalHours: sortedTopics.reduce((sum, topic) => sum + (topic.estimatedHours || 0), 0)
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Set print-specific styles before printing
    const originalTitle = document.title;
    document.title = `Academic_Calendar_${printData.academicYear}_Sem${printData.semester}`;
    
    // Trigger print dialog
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDay = (date) => {
    return date.toLocaleDateString('en-IN', { weekday: 'short' });
  };

  if (!printData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar data...</p>
        </div>
      </div>
    );
  }

  console.log('Print Data:', printData);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Actions */}
      <div className="bg-white shadow-sm border-b px-6 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            Back to Calendar
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Printable Calendar */}
      <div 
        ref={printRef}
        className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none print:max-w-none"
        id="printable-content"
        style={{ 
          minHeight: '297mm', // A4 height
          padding: '20mm', // A4 margins
        }}
      >
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <div className="mb-3">
            <h1 className="text-2xl font-bold text-black mb-1">
              {printData.institutionName || "NAGARJUNA UNIVERSITY"}
            </h1>
            <h2 className="text-lg font-bold text-black mb-1">
              DEPARTMENT OF {(printData.department || "COMPUTER SCIENCE ENGINEERING").toUpperCase()}
            </h2>
            <div className="text-base font-semibold text-black mb-2">
              Academic Year: {printData.academicYear || 'N/A'} &nbsp;&nbsp;&nbsp; Semester: {printData.semester || 'N/A'}
            </div>
            <div className="text-sm text-black">
              <p><strong>Subject:</strong> {printData.subjectName || printData.subjectId?.name || printData.title || 'N/A'} ({printData.subjectCode || printData.subjectId?.code || 'N/A'})</p>
              <p><strong>Faculty:</strong> {printData.facultyName || printData.facultyId?.name || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Calendar Table */}
        <div className="overflow-hidden">
          <table className="w-full border-collapse" style={{ border: '2px solid black' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th className="px-2 py-3 text-xs font-bold text-center" style={{ border: '1px solid black', width: '8%' }}>
                  S.No
                </th>
                <th className="px-2 py-3 text-xs font-bold text-center" style={{ border: '1px solid black', width: '10%' }}>
                  Week No.
                </th>
                <th className="px-2 py-3 text-xs font-bold text-center" style={{ border: '1px solid black', width: '12%' }}>
                  Date
                </th>
                <th className="px-2 py-3 text-xs font-bold text-center" style={{ border: '1px solid black', width: '8%' }}>
                  Day
                </th>
                <th className="px-2 py-3 text-xs font-bold text-center" style={{ border: '1px solid black', width: '40%' }}>
                  Topics to be Covered / Teaching Learning Method / Assignments
                </th>
                <th className="px-2 py-3 text-xs font-bold text-center" style={{ border: '1px solid black', width: '10%' }}>
                  Hours
                </th>
                <th className="px-2 py-3 text-xs font-bold text-center" style={{ border: '1px solid black', width: '12%' }}>
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody>
              {printData.scheduleEntries.map((entry, index) => (
                <tr key={index} style={{ minHeight: '40px' }}>
                  <td className="px-2 py-2 text-xs text-center" style={{ border: '1px solid black' }}>
                    {index + 1}
                  </td>
                  <td className="px-2 py-2 text-xs text-center" style={{ border: '1px solid black' }}>
                    {entry.week}
                  </td>
                  <td className="px-2 py-2 text-xs text-center" style={{ border: '1px solid black' }}>
                    {entry.topic ? formatDate(new Date(entry.topic.plannedDate || entry.topic.date || Date.now())) : formatDate(entry.date)}
                  </td>
                  <td className="px-2 py-2 text-xs text-center" style={{ border: '1px solid black' }}>
                    {entry.topic ? getDay(new Date(entry.topic.plannedDate || entry.topic.date || Date.now())) : getDay(entry.date)}
                  </td>
                  <td className="px-2 py-2 text-xs" style={{ border: '1px solid black' }}>
                    {entry.topic ? (
                      <div>
                        <div className="font-medium">{entry.topic.topicName || entry.topic.name || 'N/A'}</div>
                        {(entry.topic.description) && (
                          <div className="text-xs text-gray-700 mt-1">
                            {entry.topic.description}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-center" style={{ border: '1px solid black' }}>
                    {entry.topic ? entry.topic.estimatedHours || 1 : '-'}
                  </td>
                  <td className="px-2 py-2 text-xs" style={{ border: '1px solid black' }}>
                    {entry.topic?.actualDate ? (
                      <span className="text-green-700 text-xs font-medium">
                        ✓ Done
                      </span>
                    ) : entry.topic ? (
                      <span className="text-orange-700 text-xs">Planned</span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}

              {/* Add extra empty rows for a full page */}
              {Array.from({ length: Math.max(0, 30 - printData.scheduleEntries.length) }, (_, index) => (
                <tr key={`empty-${index}`} style={{ height: '35px' }}>
                  <td className="px-2 py-2 text-xs text-center" style={{ border: '1px solid black' }}>
                    {printData.scheduleEntries.length + index + 1}
                  </td>
                  <td style={{ border: '1px solid black' }}>&nbsp;</td>
                  <td style={{ border: '1px solid black' }}>&nbsp;</td>
                  <td style={{ border: '1px solid black' }}>&nbsp;</td>
                  <td style={{ border: '1px solid black' }}>&nbsp;</td>
                  <td style={{ border: '1px solid black' }}>&nbsp;</td>
                  <td style={{ border: '1px solid black' }}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="mt-6 grid grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold text-sm mb-2 text-black">COURSE SUMMARY:</h4>
            <div className="text-xs space-y-1">
              <p><strong>Total Topics:</strong> {printData.topics?.length || 0}</p>
              <p><strong>Total Contact Hours:</strong> {printData.totalHours}</p>
              <p><strong>Duration:</strong> {printData.totalWeeks} weeks</p>
              <p><strong>Status:</strong> {printData.status?.toUpperCase()}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-sm mb-2 text-black">FACULTY DETAILS:</h4>
            <div className="text-xs space-y-1">
              <p><strong>Name:</strong> {printData.facultyName || printData.facultyId?.name || 'N/A'}</p>
              <p><strong>Designation:</strong> {printData.facultyId?.designation || 'Faculty'}</p>
              <p><strong>Employee ID:</strong> {printData.facultyId?.employeeId || 'N/A'}</p>
              <p><strong>Department:</strong> {printData.department || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-sm mb-2 text-black">APPROVALS:</h4>
            <div className="text-xs space-y-6">
              <div>
                <div className="border-b border-black w-32 mb-1"></div>
                <p><strong>Faculty In-charge</strong></p>
              </div>
              <div>
                <div className="border-b border-black w-32 mb-1"></div>
                <p><strong>Head of Department</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Notes Section */}
        <div className="mt-6">
          <h4 className="font-bold text-sm mb-2 text-black">NOTES:</h4>
          <div className="border border-black p-3 min-h-16">
            <p className="text-xs">
              {printData.description || "Additional notes and instructions will be added here as needed."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>Generated on: {new Date().toLocaleDateString('en-IN')} | Academic Calendar System</p>
        </div>
      </div>


    </div>
  );
};

export default AcademicCalendarPrint;
