"use client";

// Real-time analytics connected to MongoDB data
// Fetches live book data from the same API as BookList component

import React, { useEffect, useState, useContext, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Users,
  User,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Download,
  Book,
  Clock,
  Award,
  Star,
  Trophy,
  Medal,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import axios from "axios";

const API_URL = "https://backenderp.tarstech.in/api/books";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e42",
  "#ef4444",
  "#a78bfa",
  "#fbbf24",
  "#14b8a6",
];

// Redesigned StatCard
const StatCard = ({ icon, label, value, sub, gradient }) => (
  <div
    className={`rounded-2xl p-6 shadow-xl bg-white/60 backdrop-blur-md border border-white/40 hover:scale-105 transition-transform duration-300`}
  >
    <div
      className={`w-12 h-12 flex items-center justify-center rounded-xl mb-4 ${gradient}`}
    >
      {icon}
    </div>
    <div className="text-3xl font-extrabold text-slate-800 flex items-baseline">
      {value}
      {sub && (
        <>
          <span className="mx-2 text-slate-300 text-2xl">/</span>
          <span className="text-base text-slate-400 font-normal">{sub}</span>
        </>
      )}
    </div>
    <div className="mt-2 text-slate-500 font-semibold">{label}</div>
  </div>
);

// Timeline Item for Most Popular Books
const TimelineItem = ({ book, index, maxCount }) => {
  const icons = [
    <Trophy className="text-yellow-500" size={22} />,
    <Medal className="text-slate-400" size={22} />,
    <Award className="text-amber-600" size={22} />,
  ];
  return (
    <div className="flex items-start group">
      <div className="flex flex-col items-center mr-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 shadow-lg">
          {icons[index] || <Star className="text-indigo-400" size={20} />}
        </div>
        {index < maxCount - 1 && (
          <div className="w-1 h-12 bg-gradient-to-b from-indigo-200 to-purple-200"></div>
        )}
      </div>
      <div className="flex-1 bg-white/70 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/40 shadow">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg text-slate-800">{book.title}</div>
            <div className="flex items-center text-slate-500 text-sm mt-1">
              <User size={14} className="mr-1" />
              Borrowed{" "}
              <span className="font-bold text-indigo-700 mx-1">
                {book.borrowCount}
              </span>{" "}
              times
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold mr-2">
              #{index + 1}
            </span>
            {index < 3 && (
              <span className="text-xs bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-2 py-1 rounded-full font-bold">
                TOP
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.min((book.borrowCount / maxCount) * 100, 100)}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const Analytics = () => {
  const isPrintMode =
    typeof window !== "undefined" &&
    window.location.search.includes("print=true");
  const { isAuthenticated } = useContext(AuthContext);
  const allowAccess = isAuthenticated || isPrintMode;

  const [analytics, setAnalytics] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [booksBorrowedByMonth, setBooksBorrowedByMonth] = useState([]);
  const [booksAddedByMonth, setBooksAddedByMonth] = useState([]);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [totalBorrowedBooks, setTotalBorrowedBooks] = useState(0);

  if (!allowAccess) {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // For initial load, show full loading screen
        if (!analytics) {
          setLoading(true);
        } else {
          // For subsequent updates, show subtle updating state
          setUpdating(true);
        }

        console.log("Fetching real-time analytics data from:", API_URL);

        // Fetch real book data from MongoDB
        const response = await fetch(API_URL);

        // Also fetch issued books data
        const issuesResponse = await fetch(
          "https://backenderp.tarstech.in/api/issues/borrowed-books/all"
        );

        if (response.ok) {
          const data = await response.json();
          let fetchedBooks = data.books || data || [];

          // Check for locally edited books and merge them (same as BookList component)
          try {
            const editedBooks = localStorage.getItem("editedBooks");
            if (editedBooks) {
              const parsedEditedBooks = JSON.parse(editedBooks);
              // Merge edited books with API data
              fetchedBooks = fetchedBooks.map((apiBook) => {
                const editedBook = parsedEditedBooks.find(
                  (edited) => edited._id === apiBook._id
                );
                return editedBook ? { ...apiBook, ...editedBook } : apiBook;
              });
              console.log(
                "Analytics: Merged locally edited books with API data"
              );
            }
          } catch (error) {
            console.warn(
              "Analytics: Error loading edited books from localStorage:",
              error
            );
          }

          console.log(
            `Fetched ${fetchedBooks.length} books for analytics (including local edits)`
          );

          // Process issued books data
          let issuedBooksData = [];
          let totalBorrowedCount = 0;

          if (issuesResponse.ok) {
            const issuesData = await issuesResponse.json();
            issuedBooksData = issuesData.data || issuesData || [];

            // Filter active issues only
            const activeIssues = issuedBooksData.filter(
              (issue) =>
                issue.status === "active" && issue.transactionType === "issue"
            );

            totalBorrowedCount = activeIssues.length;
            setIssuedBooks(activeIssues);
            setTotalBorrowedBooks(totalBorrowedCount);

            console.log(`Found ${totalBorrowedCount} active borrowed books`);
          } else {
            console.warn("Failed to fetch issued books data");
          }

          // Calculate real-time analytics from fetched data
          const totalBooks = fetchedBooks.length;
          const journalBooks = fetchedBooks.filter(
            (book) =>
              book.materialType === "journal" || book.SERIESCODE === "JOURNAL"
          ).length;

          // Generate most borrowed books (mock for now, as we don't have borrow history)
          const mockMostBorrowedBooks = fetchedBooks
            .slice(0, 5)
            .map((book, index) => ({
              bookId: book._id,
              title: book.TITLENAME || "Unknown Title",
              borrowCount: Math.floor(Math.random() * 50) + (50 - index * 5), // Decreasing pattern
            }));

          const realAnalyticsData = {
            totalBooks,
            journalBooks,
            mostBorrowedBooks: mockMostBorrowedBooks,
          };

          // Mock books borrowed by month data (since we don't have borrow history yet)
          const mockBooksBorrowedByMonth = [
            { month: "Jan 2024", count: Math.floor(totalBooks * 0.03) },
            { month: "Feb 2024", count: Math.floor(totalBooks * 0.04) },
            { month: "Mar 2024", count: Math.floor(totalBooks * 0.03) },
            { month: "Apr 2024", count: Math.floor(totalBooks * 0.05) },
            { month: "May 2024", count: Math.floor(totalBooks * 0.04) },
            { month: "Jun 2024", count: Math.floor(totalBooks * 0.05) },
            { month: "Jul 2024", count: Math.floor(totalBooks * 0.06) },
            { month: "Aug 2024", count: Math.floor(totalBooks * 0.04) },
            { month: "Sep 2024", count: Math.floor(totalBooks * 0.05) },
            { month: "Oct 2024", count: Math.floor(totalBooks * 0.04) },
            { month: "Nov 2024", count: Math.floor(totalBooks * 0.04) },
            { month: "Dec 2024", count: Math.floor(totalBooks * 0.03) },
          ];

          // Calculate real books added by month from ACCDATE
          const booksAddedByMonth = {};
          fetchedBooks.forEach((book) => {
            if (book.ACCDATE) {
              const date = new Date(book.ACCDATE);
              const monthKey = `${date.getFullYear()}-${String(
                date.getMonth() + 1
              ).padStart(2, "0")}`;
              booksAddedByMonth[monthKey] =
                (booksAddedByMonth[monthKey] || 0) + 1;
            }
          });

          const realBooksAddedByMonth = Object.entries(booksAddedByMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({ month, count }));

          setAnalytics(realAnalyticsData);
          setBooks(fetchedBooks);
          setBooksBorrowedByMonth(mockBooksBorrowedByMonth);
          setBooksAddedByMonth(
            realBooksAddedByMonth.length > 0
              ? realBooksAddedByMonth
              : [
                  { month: "2023-01", count: Math.floor(totalBooks * 0.08) },
                  { month: "2023-02", count: Math.floor(totalBooks * 0.06) },
                  { month: "2023-03", count: Math.floor(totalBooks * 0.1) },
                  { month: "2023-04", count: Math.floor(totalBooks * 0.09) },
                  { month: "2023-05", count: Math.floor(totalBooks * 0.11) },
                  { month: "2023-06", count: Math.floor(totalBooks * 0.07) },
                  { month: "2023-07", count: Math.floor(totalBooks * 0.13) },
                  { month: "2023-08", count: Math.floor(totalBooks * 0.09) },
                  { month: "2023-09", count: Math.floor(totalBooks * 0.12) },
                  { month: "2023-10", count: Math.floor(totalBooks * 0.08) },
                  { month: "2023-11", count: Math.floor(totalBooks * 0.1) },
                  { month: "2023-12", count: Math.floor(totalBooks * 0.06) },
                ]
          );
        } else {
          throw new Error(`API returned status ${response.status}`);
        }
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError(`Failed to load real-time data: ${err.message}`);

        // Fallback to basic mock data if API fails
        setAnalytics({
          totalBooks: 0,
          journalBooks: 0,
          mostBorrowedBooks: [],
        });
        setBooks([]);
        setBooksBorrowedByMonth([]);
        setBooksAddedByMonth([]);
      } finally {
        setLoading(false);
        setUpdating(false);
      }
    };

    fetchData();
  }, []); // Removed auto-refresh and manual refresh functionality

  // Listen for localStorage changes to update analytics when books are edited
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "editedBooks") {
        console.log(
          "Analytics: Detected book edits in localStorage, refreshing data..."
        );
        const fetchData = async () => {
          try {
            setUpdating(true);

            const response = await fetch(API_URL);
            if (response.ok) {
              const data = await response.json();
              let fetchedBooks = data.books || data || [];

              // Merge with localStorage edits
              try {
                const editedBooks = localStorage.getItem("editedBooks");
                if (editedBooks) {
                  const parsedEditedBooks = JSON.parse(editedBooks);
                  fetchedBooks = fetchedBooks.map((apiBook) => {
                    const editedBook = parsedEditedBooks.find(
                      (edited) => edited._id === apiBook._id
                    );
                    return editedBook ? { ...apiBook, ...editedBook } : apiBook;
                  });
                }
              } catch (error) {
                console.warn("Analytics: Error loading edited books:", error);
              }

              setBooks(fetchedBooks);

              // Recalculate analytics
              const totalBooks = fetchedBooks.length;
              const journalBooks = fetchedBooks.filter(
                (book) =>
                  book.materialType === "journal" ||
                  book.SERIESCODE === "JOURNAL"
              ).length;

              const mockMostBorrowedBooks = fetchedBooks
                .slice(0, 5)
                .map((book, index) => ({
                  bookId: book._id,
                  title: book.TITLENAME || "Unknown Title",
                  borrowCount:
                    Math.floor(Math.random() * 50) + (50 - index * 5),
                }));

              setAnalytics({
                totalBooks,
                journalBooks,
                mostBorrowedBooks: mockMostBorrowedBooks,
              });

              console.log("Analytics: Updated with latest book edits");
            }
          } catch (error) {
            console.error("Analytics: Error updating data after edits:", error);
          } finally {
            setUpdating(false);
          }
        };

        fetchData();
      }
    };

    // Listen for storage events (works across tabs/windows)
    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events within the same tab
    window.addEventListener("localBooksUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localBooksUpdated", handleStorageChange);
    };
  }, []);

  // Listen for book issue/return events to update borrowed books count
  useEffect(() => {
    const handleBookIssue = (event) => {
      const { borrowerId, borrowerType, bookId } = event.detail;
      console.log("Analytics: Book issue event received:", {
        borrowerId,
        borrowerType,
        bookId,
      });

      // Update total borrowed books count
      setTotalBorrowedBooks((prev) => prev + 1);

      // Optionally refetch issue data for accuracy
      const refreshIssueData = async () => {
        try {
          const response = await fetch(
            "https://backenderp.tarstech.in/api/issues/borrowed-books/all"
          );
          if (response.ok) {
            const data = await response.json();
            const activeIssues = data.data || data.borrowedBooks || data || [];
            setTotalBorrowedBooks(activeIssues.length);
            setIssuedBooks(activeIssues);
          }
        } catch (error) {
          console.error("Analytics: Error refreshing issue data:", error);
        }
      };

      refreshIssueData();
    };

    const handleBookReturn = (event) => {
      const { borrowerId, borrowerType, bookId } = event.detail;
      console.log("Analytics: Book return event received:", {
        borrowerId,
        borrowerType,
        bookId,
      });

      // Update total borrowed books count
      setTotalBorrowedBooks((prev) => Math.max(0, prev - 1));

      // Optionally refetch issue data for accuracy
      const refreshIssueData = async () => {
        try {
          const response = await fetch(
            "https://backenderp.tarstech.in/api/issues/borrowed-books/all"
          );
          if (response.ok) {
            const data = await response.json();
            const activeIssues = data.data || data.borrowedBooks || data || [];
            setTotalBorrowedBooks(activeIssues.length);
            setIssuedBooks(activeIssues);
          }
        } catch (error) {
          console.error("Analytics: Error refreshing issue data:", error);
        }
      };

      refreshIssueData();
    };

    // Add event listeners
    window.addEventListener("bookIssued", handleBookIssue);
    window.addEventListener("bookReturned", handleBookReturn);

    return () => {
      window.removeEventListener("bookIssued", handleBookIssue);
      window.removeEventListener("bookReturned", handleBookReturn);
    };
  }, []);

  // Data processing with useMemo hooks
  const titleBreakdown = useMemo(() => {
    return books.reduce((acc, book) => {
      const title = book.TITLENAME || "Unknown Title";
      acc[title] = (acc[title] || 0) + 1;
      return acc;
    }, {});
  }, [books]);

  const totalBooksCount = useMemo(
    () => Object.values(titleBreakdown).reduce((sum, count) => sum + count, 0),
    [titleBreakdown]
  );

  const uniqueTitles = useMemo(
    () => Object.keys(titleBreakdown).length,
    [titleBreakdown]
  );

  const generalBooksCount = useMemo(
    () => books.filter((book) => book.materialType === "general").length,
    [books]
  );

  const materialTypeData = useMemo(() => {
    const materialTypeCounts = books.reduce((acc, book) => {
      const type = book.materialType || "Unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(materialTypeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));
  }, [books]);

  // Series code data for bar chart
  const seriesData = useMemo(() => {
    if (!books?.length) return [];

    const seriesCodes = ["JOURNAL", "MBA", "THESIS", "LR", "GR", "BB"];
    const seriesMap = new Map();

    // Initialize counts for all series codes
    seriesCodes.forEach((code) => {
      seriesMap.set(code, 0);
    });

    // Count books for each series code
    books.forEach((book) => {
      const seriesCode = book.SERIESCODE?.toUpperCase() || "OTHER";
      if (seriesMap.has(seriesCode)) {
        seriesMap.set(seriesCode, seriesMap.get(seriesCode) + 1);
      }
    });

    // Convert to array format for the chart
    return Array.from(seriesMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [books]);

  const lineChartData = useMemo(() => {
    const now = new Date();
    const booksByMonth = books.reduce((acc, book) => {
      const date = book.ACCDATE ? new Date(book.ACCDATE) : null;
      if (
        date &&
        !isNaN(date) &&
        date <= now &&
        date.getFullYear() > 2000 &&
        date.getFullYear() < 2100 // reasonable year range
      ) {
        const month = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        acc[month] = (acc[month] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(booksByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }, [books]);

  // Sort most borrowed books
  const sortedMostBorrowedBooks = useMemo(() => {
    if (!analytics?.mostBorrowedBooks) return [];
    // Make sure to sort by borrow count in descending order
    return [...analytics.mostBorrowedBooks]
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .map((book, index) => ({
        ...book,
        rank: index + 1, // Add rank for display
      }));
  }, [analytics?.mostBorrowedBooks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-blue-50 to-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-6 text-lg text-indigo-700 font-semibold animate-pulse">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-100 via-red-50 to-pink-50">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 max-w-md flex flex-col items-center border border-red-100">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mb-3">
            Oops! Something went wrong
          </h2>
          <p className="text-slate-600 text-center mb-8 leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If print mode, always allow dashboard rendering
  if (isPrintMode) {
    // skip all authentication checks
  } else if (!allowAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-100 via-red-50 to-pink-50">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 max-w-md flex flex-col items-center border border-red-100">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mb-3">
            Access Denied
          </h2>
          <p className="text-slate-600 text-center mb-8 leading-relaxed">
            You must be logged in to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-slate-50 py-12 px-2 md:px-8 z-0 ml-72 overflow-y-auto overflow-x-hidden">
      {/* Glassmorphism floating shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-indigo-300/30 rounded-full -translate-x-48 -translate-y-48 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-pink-300/30 rounded-full translate-x-48 translate-y-48 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent leading-tight">
              Analytics
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-600 mt-2">
              Library Dashboard
            </h2>
            <p className="text-slate-500 max-w-xl mt-4">
              Visualize your library's performance, user engagement, and
              resource utilization with current metrics and trends.
            </p>
          </div>
        </header>

        {/* Stat Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <StatCard
            icon={<BookOpen size={28} className="text-indigo-700" />}
            label="Total Books"
            value={totalBooksCount}
            sub={`Unique Titles: ${uniqueTitles}`}
            gradient="bg-gradient-to-br from-indigo-100 to-purple-100"
          />
          <StatCard
            icon={<TrendingUp size={28} className="text-emerald-700" />}
            label="Active Borrowed Books"
            value={totalBorrowedBooks}
            sub="Currently Issued"
            gradient="bg-gradient-to-br from-emerald-100 to-teal-100"
          />
          <StatCard
            icon={<Clock size={28} className="text-rose-700" />}
            label="Journal Series Books"
            value={analytics?.journalBooks || 0}
            sub="Available"
            gradient="bg-gradient-to-br from-rose-100 to-pink-100"
          />
        </div>

        {/* Most Popular Books Timeline */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 overflow-hidden px-6 py-10 relative">
          <div className="flex items-center mb-8">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mr-4">
              <Book size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-1">
                Most Popular Books
              </h2>
              <p className="text-slate-500">Ranking of most borrowed titles</p>
            </div>
          </div>
          {sortedMostBorrowedBooks.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {sortedMostBorrowedBooks.slice(0, 2).map((book, idx) => (
                <TimelineItem
                  key={book.bookId || book.title}
                  book={book}
                  index={idx}
                  maxCount={Math.max(
                    ...sortedMostBorrowedBooks.map((b) => b.borrowCount)
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-12 text-center border border-slate-200">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen size={40} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-600 mb-2">
                No Data Available
              </h3>
              <p className="text-slate-500">
                Most borrowed books will appear here once data is available.
              </p>
            </div>
          )}
        </div>

        {/* Graphs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 mb-20">
          {/* Pie Chart: Books by Material Type */}
          <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-100 hover:shadow-indigo-300 transition-shadow duration-300 group overflow-hidden">
            {/* Floating accent */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-indigo-300/40 to-purple-300/30 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
            <h3 className="text-2xl font-bold mb-6 text-indigo-700 flex items-center gap-2">
              <BookOpen size={22} className="text-indigo-400" /> Books by
              Material Type
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={materialTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={60}
                  fill="#6366f1"
                  label={({ name, percent }) => (
                    <tspan>
                      <tspan className="font-bold">{name}</tspan>
                      <tspan> </tspan>
                      <tspan className="text-indigo-500">
                        {(percent * 100).toFixed(0)}%
                      </tspan>
                    </tspan>
                  )}
                  labelLine={false}
                  isAnimationActive={true}
                  animationDuration={1200}
                >
                  {materialTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{
                        filter: "drop-shadow(0 2px 8px rgba(99,102,241,0.15))",
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.97)",
                    border: "1px solid #e0e7ff",
                    color: "#312e81",
                    fontWeight: 600,
                    boxShadow: "0 4px 24px 0 rgba(99,102,241,0.07)",
                  }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend
                  iconType="circle"
                  align="center"
                  verticalAlign="bottom"
                  wrapperStyle={{
                    paddingTop: 24,
                    fontWeight: 700,
                    color: "#6366f1",
                    fontSize: 16,
                    letterSpacing: 1,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart: Books by Series Code */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-200 relative overflow-hidden group">
            {/* Gradient background blob */}
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-300 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>

            <h3 className="text-2xl font-bold mb-6 text-purple-700 flex items-center gap-2">
              <Book size={24} className="text-purple-500" /> Books by Series
              Code
            </h3>

            {/* Chart with horizontal scroll */}
            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent pb-2">
              <div style={{ width: "100%", minWidth: "600px" }}>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={seriesData} barSize={40}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#ede9fe"
                    />

                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "#7c3aed",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fill: "#4f46e5",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        background: "#f5f3ff",
                        border: "1px solid #ddd6fe",
                        color: "#6d28d9",
                        fontWeight: 600,
                        boxShadow: "0 4px 24px 0 rgba(124,58,237,0.1)",
                      }}
                      formatter={(value, name, props) => [
                        `${value} books`,
                        `Series: ${props.payload.name}`,
                      ]}
                    />

                    <Bar
                      name="Total Books"
                      dataKey="count"
                      fill="#a78bfa"
                      radius={[12, 12, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1200}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Line Chart: Books Added Per Month */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-blue-100 hover:shadow-blue-300 transition-shadow duration-300 group relative overflow-hidden col-span-1 md:col-span-2">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-200 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <h3 className="text-2xl font-bold mb-6 text-blue-700 flex items-center gap-2">
              <TrendingUp size={22} className="text-blue-400" /> Books Added Per
              Month
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#dbeafe"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#2563eb", fontWeight: 700, fontSize: 15 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(month) => {
                    // month is in 'YYYY-MM' format
                    const [year, m] = month.split("-");
                    const monthNames = [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ];
                    return monthNames[parseInt(m, 10) - 1] + " " + year;
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#6366f1", fontWeight: 700, fontSize: 15 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid #bfdbfe",
                    color: "#2563eb",
                    fontWeight: 600,
                    boxShadow: "0 4px 24px 0 rgba(37,99,235,0.07)",
                  }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend
                  iconType="plainline"
                  wrapperStyle={{
                    paddingTop: 20,
                    fontWeight: 700,
                    color: "#2563eb",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Books Added"
                  stroke="#2563eb"
                  strokeWidth={4}
                  dot={{
                    r: 7,
                    fill: "#6366f1",
                    stroke: "#2563eb",
                    strokeWidth: 3,
                  }}
                  activeDot={{
                    r: 10,
                    fill: "#2563eb",
                    stroke: "#fff",
                    strokeWidth: 4,
                  }}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart: Books Borrowed Per Month */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-emerald-100 hover:shadow-emerald-300 transition-shadow duration-300 group relative overflow-hidden col-span-1 md:col-span-2">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-200 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <h3 className="text-2xl font-bold mb-6 text-emerald-700 flex items-center gap-2">
              <TrendingUp size={22} className="text-emerald-400" /> Books
              Borrowed Per Month
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={booksBorrowedByMonth}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#d1fae5"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#10b981", fontWeight: 700, fontSize: 15 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(month) => {
                    if (
                      !month ||
                      typeof month !== "string" ||
                      !month.includes("-")
                    )
                      return month || "";
                    const [year, mRaw] = month.split("-");
                    const m = mRaw.trim();
                    const monthNames = [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ];
                    const monthIdx = parseInt(m, 10) - 1;
                    if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
                      console.warn(
                        "Invalid month for XAxis:",
                        month,
                        "parsed:",
                        m,
                        "index:",
                        monthIdx
                      );
                      return month;
                    }
                    return monthNames[monthIdx] + " " + year;
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#059669", fontWeight: 700, fontSize: 15 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid #a7f3d0",
                    color: "#047857",
                    fontWeight: 600,
                    boxShadow: "0 4px 24px 0 rgba(5,150,105,0.07)",
                  }}
                  formatter={(value) => [`${value} books borrowed`, null]}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend
                  iconType="plainline"
                  wrapperStyle={{
                    paddingTop: 20,
                    fontWeight: 700,
                    color: "#059669",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Books Borrowed"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{
                    r: 7,
                    fill: "#34d399",
                    stroke: "#10b981",
                    strokeWidth: 3,
                  }}
                  activeDot={{
                    r: 10,
                    fill: "#10b981",
                    stroke: "#fff",
                    strokeWidth: 4,
                  }}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
