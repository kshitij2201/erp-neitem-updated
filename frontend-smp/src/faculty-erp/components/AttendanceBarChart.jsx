import { Bar } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useState, useEffect } from "react";
import axios from "axios";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const api = axios.create({
  baseURL: "https://backenderp.tarstech.in/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include JWT token
api.interceptors?.request?.use?.(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default function AttendanceBarChart({ students, subjectId, title, refreshTrigger }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentAttendanceData, setStudentAttendanceData] = useState([]);

  useEffect(() => {
    if (students && students.length > 0 && subjectId) {
      fetchAttendanceData();
    }
  }, [students, subjectId, refreshTrigger]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user data to get employeeId
      const userDataStr = localStorage.getItem("user");
      const userData = JSON.parse(userDataStr);
      const facultyId = userData.employeeId;

      // Get current month for monthly attendance
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Fetch attendance data for all students in this subject
      const params = {
        facultyId: facultyId,
        subjectId: subjectId,
        type: "month",
        month: month,
        year: year,
        page: 1,
        limit: 10000, // Get all records
      };

      const response = await api.get("/faculty/attendance/query", { params });

      if (response.data.success && response.data.data) {
        // Process the attendance data
        const attendanceRecords = response.data.data;

        // Calculate attendance percentage for each student
        const studentAttendance = students.map(student => {
          // Filter records for this student
          const studentRecords = attendanceRecords.filter(record =>
            record.studentId === student._id || record.student?._id === student._id
          );

          const presentCount = studentRecords.filter(record => record.status === "present").length;
          const totalCount = studentRecords.length;
          const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

          return {
            name: `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim(),
            percentage: percentage,
            present: presentCount,
            total: totalCount
          };
        });

        // Prepare chart data with better color coding for absent students
        const chartDataObj = {
          labels: studentAttendance.map(item => item.name),
          datasets: [
            {
              label: "Attendance %",
              data: studentAttendance.map(item => item.percentage),
              backgroundColor: studentAttendance.map(item => {
                if (item.percentage < 50) return "rgba(239, 68, 68, 0.8)"; // Red for absent/low attendance
                if (item.percentage >= 75) return "rgba(34, 197, 94, 0.8)"; // Green for good attendance
                return "rgba(251, 191, 36, 0.8)"; // Yellow/Orange for moderate attendance
              }),
              borderColor: studentAttendance.map(item => {
                if (item.percentage < 50) return "rgba(239, 68, 68, 1)"; // Red border
                if (item.percentage >= 75) return "rgba(34, 197, 94, 1)"; // Green border
                return "rgba(251, 191, 36, 1)"; // Yellow/Orange border
              }),
              borderWidth: 2,
              borderRadius: 4,
              borderSkipped: false,
              hoverBackgroundColor: studentAttendance.map(item => {
                if (item.percentage < 50) return "rgba(239, 68, 68, 0.9)"; // Darker red on hover
                if (item.percentage >= 75) return "rgba(34, 197, 94, 0.9)"; // Darker green on hover
                return "rgba(251, 191, 36, 0.9)"; // Darker yellow on hover
              }),
            },
          ],
        };

        setStudentAttendanceData(studentAttendance);
        setChartData(chartDataObj);
      } else {
        setError("No attendance data found");
      }
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      setError("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  // Add validation to ensure data exists
  if (loading) {
    return (
      <div style={{ height: '400px', position: 'relative' }} className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading attendance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '400px', position: 'relative' }} className="flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!chartData || !chartData.datasets[0].data || chartData.datasets[0].data.length === 0) {
    return (
      <div style={{ height: '400px', position: 'relative' }} className="flex items-center justify-center">
        <p className="text-gray-500">No attendance data available to display</p>
      </div>
    );
  }
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 18,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 30
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const percentage = context.parsed.y;
            let status = '';
            if (percentage < 50) {
              status = '🚨 Critical (Absent)';
            } else if (percentage >= 75) {
              status = '✅ Good Attendance';
            } else {
              status = '⚠️ Needs Improvement';
            }
            return [
              `Attendance: ${percentage}%`,
              status
            ];
          },
          afterLabel: function(context) {
            const dataIndex = context.dataIndex;
            const studentData = students[dataIndex];
            if (studentData) {
              const attendanceData = studentAttendance[dataIndex];
              return [
                `Present: ${attendanceData.present} days`,
                `Total: ${attendanceData.total} days`
              ];
            }
            return '';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: 'Attendance Percentage',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10
          }
        },
        title: {
          display: true,
          text: 'Students',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      }
    },
    // Add canvas configuration to prevent Canvas2D warnings
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      bar: {
        borderRadius: 4,
      }
    }
  };
  
  return (
    <div style={{ height: '400px', position: 'relative', width: '100%' }}>
      <Bar 
        data={chartData} 
        options={options}
        plugins={[{
          beforeInit: (chart) => {
            // Set willReadFrequently on the canvas context
            const ctx = chart.canvas.getContext('2d');
            if (ctx) {
              ctx.willReadFrequently = true;
            }
          }
        }]}
      />
    </div>
  );
}
