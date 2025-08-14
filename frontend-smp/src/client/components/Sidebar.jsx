import React, { useState, useEffect } from 'react';

const Sidebar = ({ setSection, isCollapsed, toggleSidebar, isMobile, mobileMenuOpen, setMobileMenuOpen }) => {
  const [active, setActive] = useState('announcements');
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [studentData, setStudentData] = useState(null);
  
  useEffect(() => {
    if (isCollapsed !== undefined) {
      setLocalCollapsed(isCollapsed);
    }
  }, [isCollapsed]);

  // Load student data from localStorage
  useEffect(() => {
    const savedStudentData = localStorage.getItem('studentData');
    if (savedStudentData) {
      try {
        const parsedData = JSON.parse(savedStudentData);
        setStudentData(parsedData);
      } catch (error) {
        console.error('Error parsing student data:', error);
      }
    }
  }, []);

  const handleNavigation = (section) => {
    setActive(section);
    setSection(section);
    // Close mobile menu after navigation
    if (isMobile && setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };
  
  const handleToggle = () => {
    if (toggleSidebar) {
      toggleSidebar();
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };
  
  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed;

  const navItems = [
    {
      id: 'announcements',
      label: 'Announcements',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      id: 'timetables',
      label: 'Timetable',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'feedback',
      label: 'Feedback',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    },
    {
      id: 'library',
      label: 'Library',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 20h9m0 0V4a1 1 0 00-1-1H9a1 1 0 00-1 1v16m13 0H6a1 1 0 01-1-1V4" />
        </svg>
      )
    },
    {
      id: 'materials',
      label: 'Study Materials',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18m-9 5h9m-9-10H3m0 0v14a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    {
      id: 'scholarship',
      label: 'Student Scholarship',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 7v-7" />
        </svg>
      )
    },
    {
      id: 'busManagement',
      label: 'Bus Management',
      icon: (
        <svg
  className="w-5 h-5"
  fill="none"
  stroke="currentColor"
  viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    d="M4 16V6a2 2 0 012-2h12a2 2 0 012 2v10M4 16h16M4 16v2a2 2 0 002 2h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a2 2 0 002-2v-2M6 8h.01M18 8h.01M8 12h8"
  />
</svg>

      )
    }
  ];
  

  return (
    <div className={`${
      isMobile 
        ? `fixed inset-y-0 left-0 z-50 w-64 sm:w-72 transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`
        : `${collapsed ? 'w-16 lg:w-20' : 'w-64 lg:w-72'} fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out`
    } h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl flex flex-col`}>
      
      {/* Enhanced Toggle button - Hidden on mobile and small tablets */}
      {!isMobile && (
        <button 
          onClick={handleToggle}
          className="hidden lg:block absolute -right-3 top-10 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white p-2 rounded-full shadow-lg z-10 transition-all duration-300 hover:scale-110 group"
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''} group-hover:rotate-12`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}
      
      {/* Mobile close button */}
      {isMobile && (
        <button 
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-3 right-3 text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200 z-20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* Enhanced Header */}
      <div className={`py-4 sm:py-6 px-3 sm:px-4 ${collapsed && !isMobile ? 'text-center' : ''} border-b border-gray-700/50 flex-shrink-0`}>
        <div className="flex items-center justify-center mb-3 sm:mb-4">
          <div className="relative">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg">
              <span className="text-lg sm:text-xl font-bold">
                {studentData?.firstName?.charAt(0).toUpperCase() || 'N'}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
          </div>
          {(!collapsed || isMobile) && (
            <div className="ml-3">
              <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-300 to-blue-300 bg-clip-text text-transparent">
                {studentData ? `${studentData.firstName} ${studentData.lastName}` : 'NIET Portal'}
              </h1>
              <p className="text-xs text-gray-400 mt-1">Student Dashboard</p>
            </div>
          )}
        </div>
        
        {/* Quick stats - only show when not collapsed */}
        {(!collapsed || isMobile) && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-indigo-400 text-base sm:text-lg font-bold">
                {studentData?.semester?.number || studentData?.semester || 'N/A'}
              </div>
              <div className="text-xs text-gray-400">Semester</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-blue-400 text-base sm:text-lg font-bold">
                {studentData?.department?.name || studentData?.department || studentData?.stream?.name || 'N/A'}
              </div>
              <div className="text-xs text-gray-400">Department</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced Navigation */}
      <nav className="px-2 sm:px-3 py-3 sm:py-4 space-y-1 sm:space-y-2 flex-1 overflow-y-auto">
        {navItems.map((item, index) => (
          <button 
            key={item.id}
            onClick={() => handleNavigation(item.id)}
            className={`w-full text-left rounded-lg sm:rounded-xl flex items-center transition-all duration-300 ease-in-out group relative overflow-hidden
              ${active === item.id 
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 shadow-lg text-white' 
                : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'} 
              ${collapsed && !isMobile ? 'justify-center py-2 sm:py-3' : 'py-2 sm:py-3 px-2 sm:px-3'}`}
          >
            {/* Active indicator */}
            {active === item.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-blue-500/20"></div>
            )}
            
            <div className={`relative z-10 ${active === item.id && (!collapsed || isMobile) ? 'bg-white/20' : ''} 
              rounded-lg p-1 sm:p-2 transition-all duration-300 ${active === item.id ? 'scale-105' : 'group-hover:scale-105'}`}>
              {item.icon}
            </div>
            
            {(!collapsed || isMobile) && (
              <div className="ml-2 sm:ml-3 flex-1 relative z-10">
                <span className={`text-sm sm:text-base transition-all duration-300 ${active === item.id ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
                {active === item.id && (
                  <div className="w-full h-0.5 bg-gradient-to-r from-white/50 to-transparent mt-1 rounded-full"></div>
                )}
              </div>
            )}
            
            {(!collapsed || isMobile) && active === item.id && (
              <div className="relative z-10">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
            
            {/* Left border indicator for collapsed state */}
            {active === item.id && collapsed && !isMobile && (
              <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-tr-lg rounded-br-lg" 
                aria-hidden="true"></span>
            )}
          </button>
        ))}
        
        {/* Logout Button as part of navigation */}
        <div className="pt-4 mt-4 border-t border-gray-700/50">
          <button 
            onClick={() => {
              // Clear authentication data
              localStorage.removeItem('token');
              localStorage.removeItem('studentData');
              // Redirect to login page
              window.location.href = '/';
            }}
            className={`w-full flex items-center ${collapsed && !isMobile ? 'justify-center py-2 sm:py-3' : 'py-2 sm:py-3 px-2 sm:px-3'} 
            bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
            rounded-lg sm:rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 group text-white`}>
            <div className="relative z-10 rounded-lg p-1 sm:p-2 transition-all duration-300 group-hover:scale-105">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            {(!collapsed || isMobile) && (
              <div className="ml-2 sm:ml-3 flex-1 relative z-10">
                <span className="text-sm sm:text-base font-medium">Logout</span>
              </div>
            )}
          </button>
        </div>
      </nav>
      
    </div>
  );
};

export default Sidebar;
