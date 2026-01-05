import React, { useEffect, useState, useContext } from "react";
import {
  BookOpen,
  Search,
  AlertCircle,
  Book,
  Download,
  Printer,
  Edit,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AuthContext } from "../context/AuthContext";
import html2canvas from "html2canvas"; // Static import

// Now connected to real MongoDB data with fallback to mock data
// Fetches real book data from MongoDB Atlas cluster
const API_URL = "https://backenderp.tarstech.in/api/books";

const BookList = () => {
  const { isAuthenticated } = useContext(AuthContext);

  // Material types matching AddBook.jsx
  const materialTypes = [
    { id: "book", name: "Books" },
    { id: "magazine", name: "Magazine" },
    { id: "journal", name: "Journal" },
    { id: "thesis", name: "Thesis" },
    { id: "report", name: "Report" },
    { id: "research", name: "Research Paper" },
    { id: "newspaper", name: "Newspaper" },
  ];
  const [books, setBooks] = useState([]);
  const [error, setError] = useState(null);
  const [searchBy, setSearchBy] = useState("Title");
  const [searchTerm, setSearchTerm] = useState("");
  const [bookSeries, setBookSeries] = useState("");
  const [activeTab, setActiveTab] = useState("book");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBookForPrint, setSelectedBookForPrint] = useState(null);
  const [printCopies, setPrintCopies] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [showEbookModal, setShowEbookModal] = useState(false);
  const [showBookDetailsModal, setShowBookDetailsModal] = useState(false);
  const [selectedBookDetails, setSelectedBookDetails] = useState(null);

  // Fetch books when component mounts or filters change
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      fetchBooks();
    }, 300); // Add a small delay to prevent too many requests

    return () => clearTimeout(delaySearch);
  }, [searchBy, bookSeries, activeTab]); // Remove searchTerm to prevent API calls while typing

  const fetchBooks = async () => {
    try {
      setError(null);

      // First try to fetch real data from MongoDB
      let apiUrl = `${API_URL}`;
      if (activeTab && activeTab !== "book") {
        apiUrl += `?type=${activeTab}`;
      }

      console.log("Fetching books from:", apiUrl);
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();
        let booksData = data.books || [];

        console.log(`Loaded ${booksData.length} real books from MongoDB`);

        // Check for locally edited books and merge them
        try {
          const editedBooks = localStorage.getItem('editedBooks');
          if (editedBooks) {
            const parsedEditedBooks = JSON.parse(editedBooks);
            // Merge edited books with API data
            booksData = booksData.map(apiBook => {
              const editedBook = parsedEditedBooks.find(edited => edited._id === apiBook._id);
              return editedBook ? { ...apiBook, ...editedBook } : apiBook;
            });
            console.log("Merged locally edited books with API data");
          }
        } catch (error) {
          console.warn("Error loading edited books from localStorage:", error);
        }

        // Apply search filters
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          booksData = booksData.filter((book) => {
            switch (searchBy) {
              case "Title":
                return book.TITLENAME?.toLowerCase().includes(searchLower);
              case "Author":
                return book.AUTHOR?.toLowerCase().includes(searchLower);
              case "AccessionNo":
                return book.ACCNO?.toLowerCase().includes(searchLower);
              default:
                return book.TITLENAME?.toLowerCase().includes(searchLower);
            }
          });
        }

        // Apply series filter
        if (bookSeries) {
          booksData = booksData.filter(
            (book) => book.SERIESCODE === bookSeries
          );
        }

        setBooks(booksData);
        setFilteredBooks(booksData);

        // Show appropriate message when no data is found
        if (booksData.length === 0 && !searchTerm && !bookSeries) {
          // For these material types, show modal instead of mock data
          if (
            [
              "ebooksource",
              "thesis",
              "report",
              "research",
              "newspaper",
            ].includes(activeTab)
          ) {
            console.log(
              `No ${activeTab} found in database - showing modal message`
            );
            setShowEbookModal(true);
            return;
          } else {
            console.log(
              "No books found in database, falling back to mock data"
            );
            generateAndSetMockData();
          }
        }

        return;
      } else {
        console.warn(
          "API request failed, falling back to mock data:",
          response.status
        );
        // For these material types, show modal instead of mock data
        if (
          ["ebooksource", "thesis", "report", "research", "newspaper"].includes(
            activeTab
          )
        ) {
          setShowEbookModal(true);
          setBooks([]);
          setFilteredBooks([]);
          return;
        }
        generateAndSetMockData();
      }
    } catch (err) {
      console.error("Error fetching books from API:", err);
      // For these material types, show modal instead of mock data
      if (
        ["ebooksource", "thesis", "report", "research", "newspaper"].includes(
          activeTab
        )
      ) {
        setShowEbookModal(true);
        setBooks([]);
        setFilteredBooks([]);
        return;
      }
      setError(`Connected to mock data. (API Error: ${err.message})`);
      generateAndSetMockData();
    }
  };

  const generateAndSetMockData = () => {
    // Generate mock data based on the active tab and filters
    const generateMockBooks = (type, count) => {
      const titles = {
        book: [
          "Introduction to Computer Science",
          "Data Structures and Algorithms",
          "Database Management Systems",
          "Operating Systems Concepts",
          "Software Engineering",
          "Computer Networks",
          "Artificial Intelligence",
          "Machine Learning Fundamentals",
          "Web Development",
          "Mobile App Development",
          "Cybersecurity Basics",
          "Digital Image Processing",
          "Computer Graphics",
          "Human Computer Interaction",
          "Software Testing",
          "Project Management",
          "Systems Analysis and Design",
          "Programming Languages",
          "Compiler Design",
          "Theory of Computation",
          "Advanced Mathematics",
          "Engineering Physics",
          "Engineering Chemistry",
          "Engineering Mechanics",
          "Electrical Engineering",
          "Mechanical Engineering",
          "Civil Engineering",
          "Electronics and Communication",
          "Information Technology",
          "Business Management",
        ],
        journal: [
          "IEEE Computer Society",
          "ACM Computing Surveys",
          "Journal of Systems and Software",
          "Information and Software Technology",
          "Computer Networks Journal",
          "AI Research Journal",
          "Machine Learning Review",
          "Software Engineering Journal",
          "Database Systems Journal",
          "Computer Graphics and Applications",
          "Cybersecurity Today",
          "IT Management Quarterly",
          "Engineering Research Journal",
          "Science and Technology Review",
          "Academic Computing",
        ],
        ebooksource: [
          "Digital Library Collection",
          "Online Programming Tutorials",
          "E-Learning Resources",
          "Digital Reference Materials",
          "Online Course Materials",
          "Digital Archives",
          "Electronic Dissertations",
          "Online Research Papers",
          "Digital Textbooks",
          "Virtual Laboratory Manuals",
          "Online Technical Documentation",
        ],
      };

      const authors = [
        "Dr. John Smith",
        "Prof. Mary Johnson",
        "Dr. Robert Brown",
        "Prof. Sarah Davis",
        "Dr. Michael Wilson",
        "Prof. Emily Garcia",
        "Dr. David Martinez",
        "Prof. Lisa Anderson",
        "Dr. James Taylor",
        "Prof. Jennifer Thomas",
        "Dr. Christopher Lee",
        "Prof. Amanda White",
        "Dr. William Harris",
        "Prof. Jessica Clark",
        "Dr. Richard Lewis",
        "Prof. Ashley Walker",
      ];

      const publishers = [
        "Pearson Education",
        "McGraw-Hill",
        "Cengage Learning",
        "Wiley Publications",
        "Oxford University Press",
        "Cambridge University Press",
        "Springer",
        "Elsevier",
        "Prentice Hall",
        "Thomson Reuters",
        "Academic Press",
        "MIT Press",
      ];

      const cities = [
        "New York",
        "London",
        "Boston",
        "Chicago",
        "Delhi",
        "Mumbai",
        "Pune",
        "Bangalore",
      ];

      const seriesCodes = {
        book: ["BB", "GR", "LR", "MBA"],
        journal: ["JOURNAL"],
        ebooksource: ["EB", "DIGITAL"],
      };

      const subjects = [
        "Computer Science",
        "Information Technology",
        "Software Engineering",
        "Data Science",
        "Artificial Intelligence",
        "Machine Learning",
        "Web Development",
        "Mobile Computing",
        "Network Security",
        "Database Systems",
        "Operating Systems",
        "Computer Networks",
        "Mathematics",
        "Physics",
        "Chemistry",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Civil Engineering",
        "Electronics",
        "Management",
        "Business Studies",
      ];

      return Array.from({ length: count }, (_, i) => {
        const titleList = titles[type] || titles.book;
        const seriesCodeList = seriesCodes[type] || seriesCodes.book;

        return {
          _id: `${type}_${i + 1}`,
          bookId: `${type}_${i + 1}`,
          ACCNO: `${seriesCodeList[i % seriesCodeList.length]}/${(
            1000 + i
          ).toString()}`,
          TITLENAME: titleList[i % titleList.length],
          AUTHOR: authors[i % authors.length],
          "PUBLISHER NAME": publishers[i % publishers.length],
          CITY: cities[i % cities.length],
          "PUB.YEAR": 2020 + (i % 5),
          PAGES: 200 + (i % 300),
          SERIESCODE: seriesCodeList[i % seriesCodeList.length],
          CLASSNO: `${(500 + (i % 100)).toString()}.${i % 10}`,
          "SUBJECT NAME": subjects[i % subjects.length],
          STATUS: i % 10 === 0 ? "ISSUE" : "PRESENT",
          PRINTPRICE: 500 + (i % 1000),
          PURPRICE: 450 + (i % 900),
          REFCIR: "Yes",
          ACCDATE: new Date(2023, i % 12, (i % 28) + 1)
            .toISOString()
            .split("T")[0],
          INVOICENO: `INV${1000 + i}`,
          INVOICE_DATE: new Date(2023, i % 12, (i % 28) + 1)
            .toISOString()
            .split("T")[0],
          "VENDER CITY": cities[i % cities.length],
          QUANTITY: i % 15 === 0 ? 0 : Math.floor(Math.random() * 10) + 1,
          materialType: type,
        };
      });
    };

    // Filter the mock data based on search criteria
    let mockBooks = [];
    const counts = { book: 150, journal: 45, ebooksource: 25 };

    mockBooks = generateMockBooks(activeTab, counts[activeTab] || 150);

    // Apply search filters
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      mockBooks = mockBooks.filter((book) => {
        switch (searchBy) {
          case "Title":
            return book.TITLENAME?.toLowerCase().includes(searchLower);
          case "Author":
            return book.AUTHOR?.toLowerCase().includes(searchLower);
          case "AccessionNo":
            return book.ACCNO?.toLowerCase().includes(searchLower);
          default:
            return book.TITLENAME?.toLowerCase().includes(searchLower);
        }
      });
    }

    // Apply series filter
    if (bookSeries) {
      mockBooks = mockBooks.filter((book) => book.SERIESCODE === bookSeries);
    }

    setBooks(mockBooks);
    setFilteredBooks(mockBooks);
    console.log(`Loaded ${mockBooks.length} mock ${activeTab} items`);
  };

  const filterBooksByTitle = (booksArray, searchValue) => {
    if (!searchValue.trim()) return booksArray;

    const searchLower = searchValue.toLowerCase().trim();
    return booksArray.filter(
      (book) =>
        book.TITLENAME && book.TITLENAME.toLowerCase().includes(searchLower)
    );
  };

  // Helper function to group books by title
  const groupBooksByTitle = (booksArray) => {
    const grouped = {};
    booksArray.forEach(book => {
      const title = book.TITLENAME || 'Unknown Title';
      if (!grouped[title]) {
        grouped[title] = {
          ...book,
          accessionNumbers: [],
          totalCopies: 0
        };
      }
      // Add accession number to the group
      if (book.ACCNO) {
        grouped[title].accessionNumbers.push({
          accno: book.ACCNO,
          status: book.STATUS,
          seriesCode: book.SERIESCODE,
          quantity: book.QUANTITY || 1
        });
      }
      // Sum up total copies
      grouped[title].totalCopies += (book.QUANTITY || 1);
    });
   
    // Convert back to array and update quantity to show total copies
    return Object.values(grouped).map(book => ({
      ...book,
      QUANTITY: book.totalCopies,
      originalQuantity: book.QUANTITY
    }));
  };

  // Add useEffect for client-side filtering
  useEffect(() => {
    let processedBooks = books;
   
    // First filter by search term if exists based on searchBy option
    if (processedBooks.length > 0 && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      
      processedBooks = processedBooks.filter((book) => {
        if (searchBy === "Title") {
          return book.TITLENAME && book.TITLENAME.toLowerCase().includes(searchLower);
        } else if (searchBy === "Author") {
          return book.AUTHOR && book.AUTHOR.toLowerCase().includes(searchLower);
        } else if (searchBy === "AccessionNo") {
          return book.ACCNO && book.ACCNO.toLowerCase().includes(searchLower);
        }
        return false;
      });
    }
   
    // Then group by title to show unique books
    processedBooks = groupBooksByTitle(processedBooks);
   
    setFilteredBooks(processedBooks);
  }, [searchTerm, books, searchBy]);

  // Listen for book issue/return events to refresh book data
  useEffect(() => {
    const handleBookIssue = (event) => {
      const { bookId } = event.detail;
      console.log("BookList: Book issue event received, refreshing data for book:", bookId);
      fetchBooks(); // Refresh the entire list to get updated quantities
    };

    const handleBookReturn = (event) => {
      const { bookId } = event.detail;
      console.log("BookList: Book return event received, refreshing data for book:", bookId);
      fetchBooks(); // Refresh the entire list to get updated quantities
    };

    // Add event listeners
    window.addEventListener('bookIssued', handleBookIssue);
    window.addEventListener('bookReturned', handleBookReturn);

    return () => {
      window.removeEventListener('bookIssued', handleBookIssue);
      window.removeEventListener('bookReturned', handleBookReturn);
    };
  }, []);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return null;
    }
    return sortConfig.direction === "ascending" ? "↑" : "↓";
  };

  const getAvailabilityColor = (QUANTITY) => {
    if (QUANTITY === 0) return "text-red-600 bg-red-100";
    if (QUANTITY < 3) return "text-yellow-600 bg-yellow-100";
    return "text-teal-600 bg-teal-100";
  };

  const validateForm = (book) => {
    const errors = {};
    if (!book.TITLENAME?.trim()) errors.TITLENAME = "Title is required";
    if (!book.AUTHOR?.trim()) errors.AUTHOR = "Author is required";
    if (!book["PUBLISHER NAME"]?.trim())
      errors["PUBLISHER NAME"] = "Publisher is required";
    if (book.QUANTITY < 0) errors.QUANTITY = "Quantity cannot be negative";
    return errors;
  };

  const handleBookClick = (book) => {
    setSelectedBookDetails(book);
    setShowBookDetailsModal(true);
  };

  const handleEditBook = (book) => {
    if (!isAuthenticated) {
      setModalType("error");
      setModalMessage("Please log in to edit book details.");
      setShowModal(true);
      return;
    }
    setSelectedBook({
      ...book,
      _id: book._id, // Preserve the original _id
      TITLENAME: book.TITLENAME || "",
      AUTHOR: book.AUTHOR || "",
      "PUBLISHER NAME": book["PUBLISHER NAME"] || "",
      CITY: book.CITY || "",
      SERIESCODE: book.SERIESCODE || "",
      "SUBJECT NAME": book["SUBJECT NAME"] || "",
      QUANTITY: book.QUANTITY || 0,
      STATUS: book.STATUS || "PRESENT",
      materialType: book.materialType || "book",
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const updateBookDetails = async (bookId, updatedDetails) => {
    const errors = validateForm(updatedDetails);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Try to update via backend API first
      console.log("Attempting to update book via API:", bookId, updatedDetails);
     
      const updateResponse = await fetch(`${API_URL}/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(updatedDetails),
      });

      console.log("API Response status:", updateResponse.status);
     
      if (updateResponse.ok) {
        const responseData = await updateResponse.json();
        console.log("Book updated successfully via API:", responseData);
       
        // Update local state with the response from backend
        const updatedBook = responseData.book || { ...updatedDetails, _id: bookId };
       
        setBooks((prevBooks) =>
          prevBooks.map((book) =>
            book._id === bookId ? { ...book, ...updatedBook } : book
          )
        );
        setFilteredBooks((prevFiltered) =>
          prevFiltered.map((book) =>
            book._id === bookId ? { ...book, ...updatedBook } : book
          )
        );

        // Clear localStorage since backend update was successful
        localStorage.removeItem('editedBooks');

        // Dispatch custom event to notify Analytics component
        window.dispatchEvent(new CustomEvent('localBooksUpdated', {
          detail: { bookId, updatedDetails: updatedBook }
        }));

        setShowEditModal(false);
        setModalType("success");
        setModalMessage("Book details updated successfully in database!");
        setShowModal(true);
      } else {
        const errorText = await updateResponse.text();
        console.error("API Error Response:", errorText);
        throw new Error(`API Error: ${updateResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.warn("API update failed, using local simulation:", error.message);
     
      // Fallback to local simulation
      // Update the local state to reflect changes - use _id to match the specific book
      setBooks((prevBooks) =>
        prevBooks.map((book) =>
          book._id === bookId ? { ...book, ...updatedDetails } : book
        )
      );
      setFilteredBooks((prevFiltered) =>
        prevFiltered.map((book) =>
          book._id === bookId ? { ...book, ...updatedDetails } : book
        )
      );

      // Save to localStorage as backup
      const updatedBooksForStorage = books.map((book) =>
        book._id === bookId ? { ...book, ...updatedDetails } : book
      );
      localStorage.setItem('editedBooks', JSON.stringify(updatedBooksForStorage));

      // Dispatch custom event to notify Analytics component
      window.dispatchEvent(new CustomEvent('localBooksUpdated', {
        detail: { bookId, updatedDetails }
      }));

      setShowEditModal(false);
      setModalType("success");
      setModalMessage(
        "Book details updated locally! (Note: Changes will persist until page refresh as backend is not available)"
      );
      setShowModal(true);
    }
  };

  const getMaterialTypeName = (type) => {
    const types = {
      book: "Book",
      magazine: "Magazine",
      journal: "Journal",
      thesis: "Thesis",
      report: "Report",
      research: "Research Paper",
      newspaper: "Newspaper",
      ebooksource: "EBookSource",
    };
    return types[type] || type;
  };

  const getMaterialTypeColor = (type) => {
    const colors = {
      book: "bg-blue-200 text-blue-800",
      magazine: "bg-purple-200 text-purple-800",
      journal: "bg-green-200 text-green-800",
      thesis: "bg-yellow-200 text-yellow-800",
      report: "bg-orange-200 text-orange-800",
      research: "bg-red-200 text-red-800",
      newspaper: "bg-teal-200 text-teal-800",
      ebooksource: "bg-indigo-200 text-indigo-800",
    };
    return colors[type] || "bg-gray-200 text-gray-800";
  };

  const getEmptyStateMessage = () => {
    // Material types that show "not available" message instead of "no items found"
    const unavailableTypes = [
      "ebooksource",
      "thesis",
      "report",
      "research",
      "newspaper",
    ];

    if (unavailableTypes.includes(activeTab)) {
      const materialType = materialTypes.find((type) => type.id === activeTab);
      const typeName = materialType ? materialType.name : activeTab;

      return {
        title: `${typeName} Not Available`,
        description: `${typeName} are not present in the library database. Once ${typeName.toLowerCase()} are added to the system, they will be shown here.`,
      };
    }

    const materialType = materialTypes.find((type) => type.id === activeTab);
    const typeName = materialType ? materialType.name : "Items";

    return {
      title: `No ${typeName} Found`,
      description: `No ${typeName.toLowerCase()} available in the library.`,
    };
  };

  const downloadBooksReport = () => {
    try {
      const reportData = filteredBooks.map((book) => ({
        "Accession No.": book.ACCNO,
        Title: book.TITLENAME,
        Author: book.AUTHOR,
        Publisher: book["PUBLISHER NAME"],
        City: book.CITY,
        "Publication Year": book["PUB.YEAR"],
        Pages: book.PAGES,
        "Series Code": book.SERIESCODE,
        "Class No.": book.CLASSNO,
        Subject: book["SUBJECT NAME"],
        Status: book.STATUS,
        "Print Price": book.PRINTPRICE,
        "Purchase Price": book.PURPRICE,
        "Reference Circulation": book.REFCIR,
        "Accession Date": book.ACCDATE,
        "Invoice No.": book.INVOICENO,
        "Invoice Date": book.INVOICE_DATE,
        "Vendor City": book["VENDER CITY"],
      }));

      const ws = XLSX.utils.json_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Books");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(data, "books-report.xlsx");
    } catch (error) {
      setError("Failed to generate report.");
    }
  };

  const handlePrintClick = (book) => {
    if (!isAuthenticated) {
      setModalType("error");
      setModalMessage("Please log in to print barcodes.");
      setShowModal(true);
      return;
    }
    setSelectedBookForPrint(book);
    setShowPrintModal(true);
  };

  const generateCustomBarcodeHTML = (book) => {
    if (!book || !book.ACCNO) {
      return null;
    }

    // Generate a deterministic barcode based on ACCNO for consistent output
    const generateBarcodePattern = (accno) => {
      const code = String(accno).replace(/[^0-9]/g, ''); // Extract numbers only
      const seed = code.split('').reduce((acc, char) => acc + parseInt(char), 0);
     
      // Create a more realistic barcode pattern
      const patterns = [
        [2, 1, 2, 1, 1, 3, 1, 1], // Pattern A
        [1, 2, 2, 1, 3, 1, 1, 1], // Pattern B  
        [3, 1, 1, 2, 1, 2, 1, 1], // Pattern C
        [1, 1, 3, 2, 1, 1, 2, 1], // Pattern D
        [2, 2, 1, 1, 1, 1, 3, 1], // Pattern E
      ];
     
      const selectedPattern = patterns[seed % patterns.length];
      const fullPattern = [];
     
      // Start and end guards
      fullPattern.push(1, 1, 1); // Start guard
     
      // Repeat pattern multiple times for fuller barcode
      for (let i = 0; i < 8; i++) {
        fullPattern.push(...selectedPattern);
        if (i < 7) fullPattern.push(1); // Separator
      }
     
      fullPattern.push(1, 1, 1); // End guard
     
      return fullPattern;
    };

    const barcodePattern = generateBarcodePattern(book.ACCNO);
   
    // Convert pattern to SVG bars
    let x = 0;
    const barHeight = 50;
    const barElements = barcodePattern.map((width, index) => {
      const isBlack = index % 2 === 0;
      const rect = `<rect x="${x}" y="0" width="${width}" height="${barHeight}" fill="${isBlack ? '#000000' : '#ffffff'}"/>`;
      x += width;
      return rect;
    }).join('');

    const totalWidth = barcodePattern.reduce((sum, w) => sum + w, 0);
   
    const collegeName = "Nagarjuna Institute of Engineering Technology and Management Nagpur";
    const seriesAndAccNo = `${book.SERIESCODE || "GKEA"}/${book.ACCNO || "240"}`;
    const accNoDisplay = book.ACCNO || "519.5/RAV";

    return `
      <div style="text-align: center; font-family: 'Courier New', monospace; padding: 15px; background-color: white; border: 2px solid #000000; display: inline-block; margin: 10px;">
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #000000;">${accNoDisplay}</div>
        <div style="font-size: 9px; margin-bottom: 10px; color: #333333; line-height: 1.2;">${collegeName}</div>
        <div style="background-color: white; padding: 8px; margin: 8px 0; border: 1px solid #cccccc;">
          <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth * 3}" height="${barHeight}" viewBox="0 0 ${totalWidth} ${barHeight}" style="display: block; margin: 0 auto; max-width: 280px;">
            <rect x="0" y="0" width="${totalWidth}" height="${barHeight}" fill="white"/>
            ${barElements}
          </svg>
        </div>
        <div style="font-size: 10px; margin-top: 8px; font-weight: bold; color: #000000; letter-spacing: 0.5px;">${seriesAndAccNo}</div>
      </div>
    `;
  };

  const downloadBarcode = (book) => {
    if (!isAuthenticated) {
      setModalType("error");
      setModalMessage("Please log in to download barcodes.");
      setShowModal(true);
      return;
    }
    if (!book || !book.ACCNO) {
      setModalType("error");
      setModalMessage("No book selected for downloading.");
      setShowModal(true);
      return;
    }

    const barcodeHTML = generateCustomBarcodeHTML(book);
    if (!barcodeHTML) {
      setModalType("error");
      setModalMessage("Failed to generate barcode.");
      setShowModal(true);
      return;
    }

    // Create a temporary div to render the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = barcodeHTML;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px"; // Move off-screen to avoid visual flicker
    document.body.appendChild(tempDiv);

    // Use html2canvas to render the HTML to a canvas
    html2canvas(tempDiv, { scale: 2 }) // Increase scale for better quality
      .then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        saveAs(imgData, `barcode-${book.ACCNO}.png`);
        document.body.removeChild(tempDiv);
      })
      .catch((err) => {
        setModalType("error");
        setModalMessage("Failed to download barcode: " + err.message);
        setShowModal(true);
        document.body.removeChild(tempDiv);
      });
  };

  const doPrintBarcode = () => {
    if (!isAuthenticated) {
      setModalType("error");
      setModalMessage("Please log in to print barcodes.");
      setShowModal(true);
      return;
    }
    if (!selectedBookForPrint || !selectedBookForPrint.ACCNO) {
      setModalType("error");
      setModalMessage("No book selected for printing.");
      setShowModal(true);
      return;
    }

    if (printCopies < 1) {
      setModalType("error");
      setModalMessage("Number of copies must be at least 1.");
      setShowModal(true);
      return;
    }

    const barcodeHTML = generateCustomBarcodeHTML(selectedBookForPrint);
    if (!barcodeHTML) {
      setModalType("error");
      setModalMessage("Failed to generate barcode.");
      setShowModal(true);
      return;
    }

    const printWindow = window.open("", "_blank");
    const printContent = `
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
            }
            .barcode-container {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              padding: 20px;
            }
            .barcode-item {
              text-align: center;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 10px;
              background-color: #ffffff;
            }
            @media print {
              body { margin: 0; }
              .barcode-container { gap: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${Array.from({ length: printCopies })
              .map(
                () => `
              <div class="barcode-item">
                ${barcodeHTML}
              </div>
            `
              )
              .join("")}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setShowPrintModal(false);
    setPrintCopies(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks(); // Trigger search immediately
  };

  const handleSearchReset = () => {
    setSearchTerm("");
    setSearchBy("Title");
    setBookSeries("");
    fetchBooks(); // Fetch all books
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchBooks();
    }
  };

  const handleSearchTermChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Keep the selected search type - don't reset to Title
  };

  // Helper function to get book image path
  const getBookImagePath = (book) => {
    if (!book?.ACCNO) {
      console.log('No ACCNO found for book:', book?.TITLENAME);
      return null;
    }
   
    // Clean the ACCNO for file naming (replace special characters)
    const cleanAccno = book.ACCNO.toString()
      .replace(/[\/\\:*?"<>|]/g, '_') // Replace invalid file characters with underscore
      .replace(/\s+/g, '_'); // Replace spaces with underscore
   
    const imagePath = `/library/${cleanAccno}`;
    console.log(`Image path for "${book.TITLENAME}":`, imagePath);
   
    return imagePath;
  };

  const ErrorDisplay = ({ message }) => {
    const isEbookMessage = message.includes("EBooks are not present");
    const bgColor = isEbookMessage ? "bg-blue-500" : "bg-red-500";
    const iconComponent = isEbookMessage ? Book : AlertCircle;
    const IconComponent = iconComponent;

    return (
      <div
        className={`fixed top-6 right-6 ${bgColor} text-white p-4 rounded-xl shadow-2xl flex items-center max-w-md w-full z-50 animate-in fade-in duration-300 ease-in-out`}
      >
        <IconComponent size={24} className="text-white mr-3" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => setError(null)}
          className="ml-auto text-white hover:text-gray-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    );
  };

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br flex flex-col py-6 px-4 md:px-8 overflow-y-auto overflow-x-hidden bg-gray-100">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-teal-50 to-indigo-100 opacity-50"></div>
      <div className="relative max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-2xl p-6 md:p-8 shadow-lg">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold flex items-center space-x-3">
              <BookOpen size={32} className="text-teal-300 md:w-10 md:h-10" />
              <span>Book List For Students & Faculty</span>
            </h1>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/4 bg-white p-4 md:p-6 rounded-xl shadow-lg order-2 lg:order-1">
            <div className="text-center">
              <img
                src="/nga.png"
                alt="Nagarjuna Institute of Engineering Technology and Management Logo"
                className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 rounded-full object-cover"
              />
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                Nagarjuna Institute of Engineering Technology and Management
                Nagpur
              </h2>
              <p className="text-sm text-gray-600">
                Village Satnavri, Amravati Road, Nagpur - 440023
              </p>
            </div>
          </div>

          <div className="lg:w-6/4 order-1 lg:order-2 max-w-full">
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
              {materialTypes.map((materialType) => (
                <button
                  key={materialType.id}
                  className={`px-3 md:px-4 py-2 font-medium text-sm md:text-base whitespace-nowrap ${
                    activeTab === materialType.id
                      ? "border-b-2 border-indigo-600 text-indigo-600"
                      : "text-gray-600"
                  }`}
                  onClick={() => {
                    setActiveTab(materialType.id);
                    setSearchTerm("");
                    setSearchBy("Title");
                    setBookSeries("");
                  }}
                >
                  {materialType.name}
                </button>
              ))}
              <button
                className={`px-3 md:px-4 py-2 font-medium text-sm md:text-base whitespace-nowrap ${
                  activeTab === "ebooksource"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-600"
                }`}
                onClick={() => {
                  setActiveTab("ebooksource");
                  setSearchTerm("");
                  setSearchBy("Title");
                  setBookSeries("");
                }}
              >
                EBookSource
              </button>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search By
                  </label>
                  <select
                    value={searchBy}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Title">Title</option>
                    <option value="Author">Author</option>
                    <option value="AccessionNo">Accession No.</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Text *
                  </label>
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    onKeyDown={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Book Category
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option>Please Select</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Book Series
                  </label>
                  <select
                    value={bookSeries}
                    onChange={(e) => setBookSeries(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Series</option>
                    <option value="LR">LR</option>
                    <option value="GR">GR</option>
                    <option value="MBA">MBA</option>
                    <option value="BB">BB</option>
                    <option value="THESIS">Thesis</option>
                    <option value="JOURNAL">Journal</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-4">
                <button
                  onClick={handleSearch}
                  className="px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <Search size={20} className="mr-2" />
                  Search
                </button>
                <button
                  onClick={handleSearchReset}
                  className="px-4 md:px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {isAuthenticated && searchTerm && filteredBooks.length > 0 && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={downloadBooksReport}
                  className="px-4 md:px-6 py-2 md:py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 flex items-center text-sm md:text-base"
                >
                  <Download size={20} className="mr-2" />
                  Export to Excel
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {filteredBooks.length > 0 ? (
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    {filteredBooks.map((book) => (
                      <div
                        key={book._id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-indigo-300 cursor-pointer"
                        onClick={() => handleBookClick(book)}
                      >
                        <div className="flex gap-4">
                          {/* Left side - Book Image */}
                          <div className="flex-shrink-0">
                            <div className="w-20 h-28 rounded-lg shadow-md overflow-hidden relative">
                              {getBookImagePath(book) ? (
                                <>
                                  <img
                                    src={`${getBookImagePath(book)}.jpg`}
                                    alt={book.TITLENAME}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Try different formats
                                      if (e.target.src.includes('.jpg')) {
                                        e.target.src = `${getBookImagePath(book)}.png`;
                                      } else if (e.target.src.includes('.png')) {
                                        e.target.src = `${getBookImagePath(book)}.jpeg`;
                                      } else if (e.target.src.includes('.jpeg')) {
                                        e.target.src = `${getBookImagePath(book)}.webp`;
                                      } else {
                                        // All formats failed, show fallback
                                        e.target.style.display = 'none';
                                        e.target.parentElement.querySelector('.fallback-icon').style.display = 'flex';
                                      }
                                    }}
                                  />
                                  <div className="fallback-icon w-full h-full bg-gradient-to-br from-indigo-400 to-teal-500 items-center justify-center absolute inset-0" style={{display: 'none'}}>
                                    <BookOpen size={32} className="text-white" />
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-teal-500 flex items-center justify-center">
                                  <BookOpen size={32} className="text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                         
                          {/* Right side - Book Details */}
                          <div className="flex-1 min-w-0">
                            <div className="space-y-2">
                              {/* Book Title */}
                              <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
                                {book.TITLENAME}
                              </h3>
                             
                              {/* Author */}
                              <p className="text-sm text-gray-700 font-medium">
                                <span className="text-gray-500">By:</span> {book.AUTHOR}
                              </p>
                             
                              {/* Publisher */}
                              <p className="text-sm text-gray-600">
                                <span className="text-gray-500">Publisher:</span> {book["PUBLISHER NAME"]}
                              </p>
                             
                              {/* Year */}
                              <p className="text-sm text-gray-600">
                                <span className="text-gray-500">Year:</span> {book["PUB.YEAR"] || "N/A"}
                              </p>
                             
                              {/* Copies Info */}
                              {book.accessionNumbers && book.accessionNumbers.length > 0 && (
                                <p className="text-sm text-gray-600">
                                  <span className="text-gray-500">Copies:</span> {book.accessionNumbers.length}
                                  <span className="text-xs text-gray-400 ml-1">(Total: {book.QUANTITY})</span>
                                </p>
                              )}

                              {/* Actions for authenticated users */}
                              {isAuthenticated && (
                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintClick(book);
                                    }}
                                    className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="Print Barcode"
                                  >
                                    <Printer size={18} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadBarcode(book);
                                    }}
                                    className="p-1.5 rounded-full text-teal-600 hover:bg-teal-100 transition-colors"
                                    title="Download Barcode"
                                  >
                                    <Download size={18} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditBook(book);
                                    }}
                                    className="p-1.5 rounded-full text-indigo-600 hover:bg-indigo-100 transition-colors"
                                    title="Edit Book Details"
                                  >
                                    <Edit size={18} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <BookOpen size={96} className="text-gray-200 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    {searchTerm
                      ? "No Items Found"
                      : getEmptyStateMessage().title}
                  </h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto">
                    {searchTerm
                      ? `No items match your search for "${searchTerm}".`
                      : getEmptyStateMessage().description}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSearchBy("Title");
                        setBookSeries("");
                        setBooks([]);
                        setFilteredBooks([]);
                      }}
                      className="mt-6 px-6 py-3 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Material Not Available Modal */}
        {showEbookModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 ease-out">
            <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl backdrop-blur-md bg-opacity-95 border-t-4 border-blue-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Book size={32} className="text-blue-500 mr-3" />
                  <h3 className="text-2xl font-bold text-blue-600">
                    {getEmptyStateMessage().title}
                  </h3>
                </div>
                <button
                  onClick={() => setShowEbookModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="bg-blue-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <Book size={48} className="text-blue-400" />
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {getEmptyStateMessage().description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowEbookModal(false);
                    setActiveTab("book");
                    setSearchTerm("");
                    setSearchBy("Title");
                    setBookSeries("");
                  }}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center"
                >
                  <BookOpen size={20} className="mr-2" />
                  View Books
                </button>
                <button
                  onClick={() => {
                    setShowEbookModal(false);
                    setActiveTab("magazine");
                    setSearchTerm("");
                    setSearchBy("Title");
                    setBookSeries("");
                  }}
                  className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all duration-300 flex items-center justify-center"
                >
                  <Book size={20} className="mr-2" />
                  View Magazines
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowEbookModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
                >
                  Close and stay on{" "}
                  {materialTypes.find((type) => type.id === activeTab)?.name ||
                    activeTab}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && isAuthenticated && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 ease-out overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl backdrop-blur-md bg-opacity-90 my-8 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Edit Item Details
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={selectedBook?.TITLENAME || ""}
                    onChange={(e) =>
                      setSelectedBook({
                        ...selectedBook,
                        TITLENAME: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                  />
                  {formErrors.TITLENAME && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.TITLENAME}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={selectedBook?.AUTHOR || ""}
                    onChange={(e) =>
                      setSelectedBook({
                        ...selectedBook,
                        AUTHOR: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                  />
                  {formErrors.AUTHOR && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.AUTHOR}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publisher
                  </label>
                  <input
                    type="text"
                    value={selectedBook?.["PUBLISHER NAME"] || ""}
                    onChange={(e) =>
                      setSelectedBook({
                        ...selectedBook,
                        "PUBLISHER NAME": e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                  />
                  {formErrors["PUBLISHER NAME"] && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors["PUBLISHER NAME"]}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={selectedBook?.CITY || ""}
                    onChange={(e) =>
                      setSelectedBook({ ...selectedBook, CITY: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Series Code
                  </label>
                  <input
                    type="text"
                    value={selectedBook?.SERIESCODE || ""}
                    onChange={(e) =>
                      setSelectedBook({
                        ...selectedBook,
                        SERIESCODE: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={selectedBook?.["SUBJECT NAME"] || ""}
                    onChange={(e) =>
                      setSelectedBook({
                        ...selectedBook,
                        "SUBJECT NAME": e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                    {selectedBook?.QUANTITY === 0 && (
                      <span className="text-red-600 text-xs font-normal ml-2">
                        (Out of Stock)
                      </span>
                    )}
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={selectedBook?.QUANTITY ?? 0}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || 0;
                        setSelectedBook({
                          ...selectedBook,
                          QUANTITY: newQuantity,
                        });

                        // Clear the quantity error when user starts typing
                        if (formErrors.QUANTITY) {
                          setFormErrors({
                            ...formErrors,
                            QUANTITY: null,
                          });
                        }
                      }}
                      disabled={selectedBook?.QUANTITY === 0}
                      className={`w-full px-4 py-2 bg-white border rounded-lg shadow-sm focus:ring-2 transition-all duration-300 ${
                        selectedBook?.QUANTITY === 0
                          ? "border-red-500 bg-red-50 text-red-700 cursor-not-allowed opacity-75"
                          : formErrors.QUANTITY
                          ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                          : "border-gray-200 focus:ring-teal-500 focus:border-teal-500"
                      }`}
                      placeholder={
                        selectedBook?.QUANTITY === 0
                          ? "Out of stock"
                          : "Enter quantity"
                      }
                    />

                    {/* Out of stock overlay icon */}
                    {selectedBook?.QUANTITY === 0 && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Show form error if any */}
                  {formErrors.QUANTITY && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      {formErrors.QUANTITY}
                    </p>
                  )}

                  {/* Show warning if quantity is zero */}
                  {selectedBook?.QUANTITY === 0 && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-700 text-xs font-medium flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        This{" "}
                        {selectedBook?.TYPE === "journal" ? "journal" : "book"}{" "}
                        is currently out of stock!
                      </p>
                      <p className="text-red-600 text-xs mt-1">
                        Please contact the librarian to check availability or
                        reserve this item.
                      </p>
                    </div>
                  )}

                  {/* Show helpful message when quantity is low but not zero */}
                  {selectedBook?.QUANTITY > 0 &&
                    selectedBook?.QUANTITY <= 5 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-yellow-700 text-xs font-medium flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                          Only {selectedBook?.QUANTITY} copies available -
                          Limited stock!
                        </p>
                      </div>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedBook?.STATUS || ""}
                    onChange={(e) =>
                      setSelectedBook({
                        ...selectedBook,
                        STATUS: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ISSUE">Issue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material Type
                  </label>
                  <select
                    value={selectedBook?.materialType || "book"}
                    onChange={(e) =>
                      setSelectedBook({
                        ...selectedBook,
                        materialType: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                  >
                    <option value="book">Book</option>
                    <option value="journal">Journal</option>
                    <option value="ebooksource">EBookSource</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    updateBookDetails(selectedBook._id, {
                      TITLENAME: selectedBook.TITLENAME,
                      AUTHOR: selectedBook.AUTHOR,
                      "PUBLISHER NAME": selectedBook["PUBLISHER NAME"],
                      CITY: selectedBook.CITY,
                      SERIESCODE: selectedBook.SERIESCODE,
                      "SUBJECT NAME": selectedBook["SUBJECT NAME"],
                      QUANTITY: selectedBook.QUANTITY,
                      STATUS: selectedBook.STATUS,
                      materialType: selectedBook.materialType,
                    })
                  }
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-300"
                >
                  Update Item
                </button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 ease-out">
            <div
              className={`bg-white rounded-2xl max-w-lg w-full p-8 shadow-5xl backdrop-blur-md bg-opacity-90 border-t-4 ${
                modalType === "success" ? "border-teal-500" : "border-red-600"
              }`}
            >
              <h3
                className={`text-xl font-bold mb-3 ${
                  modalType === "success" ? "text-teal-600" : "text-red-600"
                }`}
              >
                {modalType === "success" ? "Success" : "Error"}
              </h3>
              <p className="text-gray-700 text-sm">{modalMessage}</p>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showPrintModal && isAuthenticated && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 ease-out">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl backdrop-blur-md bg-opacity-90">
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Print Barcode
              </h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Copies
                </label>
                <input
                  type="number"
                  min="1"
                  value={printCopies}
                  onChange={(e) =>
                    setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowPrintModal(false);
                    setPrintCopies(1);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={doPrintBarcode}
                  className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 flex items-center transition-all duration-300"
                >
                  <Printer size={20} className="mr-2" />
                  Print
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Book Details Modal */}
        {showBookDetailsModal && selectedBookDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 ease-out">
            <div className="bg-white rounded-2xl w-full max-w-7xl p-8 shadow-2xl backdrop-blur-md bg-opacity-90 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Book Details</h3>
                <button
                  onClick={() => setShowBookDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-4 lg:gap-3 items-start">
                {/* Left Column - Book Image */}
                <div className="flex justify-start md:justify-start">
                  <div className="w-48 h-64 md:w-44 md:h-60 lg:w-52 lg:h-55 rounded-lg shadow-lg overflow-hidden relative">
                    {getBookImagePath(selectedBookDetails) ? (
                      <>
                        <img
                          src={`${getBookImagePath(selectedBookDetails)}.jpg`}
                          alt={selectedBookDetails.TITLENAME}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Try different formats
                            if (e.target.src.includes('.jpg')) {
                              e.target.src = `${getBookImagePath(selectedBookDetails)}.png`;
                            } else if (e.target.src.includes('.png')) {
                              e.target.src = `${getBookImagePath(selectedBookDetails)}.jpeg`;
                            } else if (e.target.src.includes('.jpeg')) {
                              e.target.src = `${getBookImagePath(selectedBookDetails)}.webp`;
                            } else {
                              // All formats failed, show fallback
                              e.target.style.display = 'none';
                              e.target.parentElement.querySelector('.fallback-modal-icon').style.display = 'flex';
                            }
                          }}
                        />
                        <div className="fallback-modal-icon w-full h-full bg-gradient-to-br from-indigo-400 to-teal-500 items-center justify-center absolute inset-0" style={{display: 'none'}}>
                          <BookOpen size={64} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-teal-500 flex items-center justify-center">
                        <BookOpen size={64} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle Column - First Half of Details */}
                <div className="space-y-3 md:space-y-4 px-2 md:px-0">
                  <div className="md:hidden mb-3">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight text-center">
                      {selectedBookDetails.TITLENAME || 'N/A'}
                    </h3>
                  </div>
                 
                  <div className="hidden md:block">
                    <h3 className="text-sm lg:text-base font-bold text-gray-900 leading-tight mb-2 line-clamp-2">
                      {selectedBookDetails.TITLENAME || 'N/A'}
                    </h3>
                  </div>
                 
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Author</label>
                      <p className="text-xs md:text-sm text-gray-800 font-semibold line-clamp-2">{selectedBookDetails.AUTHOR || 'N/A'}</p>
                    </div>
                   
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Publisher</label>
                      <p className="text-xs md:text-sm text-gray-800 line-clamp-2">{selectedBookDetails["PUBLISHER NAME"] || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Material Type</label>
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getMaterialTypeName(selectedBookDetails.materialType || 'book')}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Series Code</label>
                      <p className="text-xs md:text-sm text-gray-800 font-mono">{selectedBookDetails.SERIESCODE || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Second Half of Details */}
                <div className="space-y-3 md:space-y-4 px-2 md:px-0">
                  <div className="mt-3 md:mt-0">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Class No.</label>
                        <p className="text-xs md:text-sm text-gray-800 font-mono">{selectedBookDetails.CLASSNO || 'N/A'}</p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Total Copies</label>
                        <p className={`text-base md:text-lg font-bold ${selectedBookDetails.QUANTITY === 0 ? 'text-red-600' : selectedBookDetails.QUANTITY < 3 ? 'text-yellow-600' : 'text-teal-600'}`}>
                          {selectedBookDetails.QUANTITY || 0}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Publication Year</label>
                        <p className="text-xs md:text-sm font-bold text-gray-800">
                          {selectedBookDetails["PUB.YEAR"] || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                        <p className="text-xs md:text-sm font-semibold text-gray-800 line-clamp-2">
                          {selectedBookDetails["SUBJECT NAME"] || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Separator Line */}
              <div className="border-t border-gray-300 my-6"></div>

              {/* Accession Numbers Table - Full Width */}
              <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Book Copies Information</h4>
                    <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#0000FF', fontWeight: 'semibold'}}>
                                Accession No.
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#0000FF', fontWeight: 'semibold'}}>
                                Book Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#0000FF', fontWeight: 'semibold'}}>
                                Book Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#0000FF', fontWeight: 'semibold'}}>
                                Issue Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#0000FF', fontWeight: 'semibold'}}>
                                Due Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {selectedBookDetails.accessionNumbers && selectedBookDetails.accessionNumbers.length > 0 ? (
                              selectedBookDetails.accessionNumbers.map((accItem, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm" style={{color: '#6b7280', fontWeight: 'semibold'}}>
                                    {accItem.accno || selectedBookDetails.ACCNO || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm" style={{color: '#6b7280', fontWeight: 'semibold'}}>
                                    {getMaterialTypeName(selectedBookDetails.materialType || 'book')}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                      (accItem.status || selectedBookDetails.STATUS) === "PRESENT"
                                        ? "bg-green-100 text-green-800"
                                        : (accItem.status || selectedBookDetails.STATUS) === "ISSUE"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                    }`}>
                                      {accItem.status || selectedBookDetails.STATUS || 'PRESENT'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900" style={{color: '#000', fontWeight: 'bold'}}>
                                    {accItem.issueDate || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900" style={{color: '#000', fontWeight: 'bold'}}>
                                    {accItem.dueDate || '-'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="px-4 py-4 text-sm font-mono" style={{color: '#6b7280', fontWeight: 'semibold'}}>
                                  {selectedBookDetails.ACCNO || 'N/A'}
                                </td>
                                <td className="px-4 py-4 text-sm" style={{color: '#6b7280', fontWeight: 'semibold'}}>
                                  {getMaterialTypeName(selectedBookDetails.materialType || 'book')}
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                    selectedBookDetails.STATUS === "PRESENT"
                                      ? "bg-green-100 text-green-800"
                                      : selectedBookDetails.STATUS === "ISSUE"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}>
                                    {selectedBookDetails.STATUS || 'PRESENT'}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 text-center">
                                  -
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 text-center">
                                  -
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowBookDetailsModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-300"
                >
                  Close
                </button>
                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => {
                        setShowBookDetailsModal(false);
                        handlePrintClick(selectedBookDetails);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center"
                    >
                      <Printer size={18} className="mr-2" />
                      Print Barcode
                    </button>
                    <button
                      onClick={() => {
                        setShowBookDetailsModal(false);
                        handleEditBook(selectedBookDetails);
                      }}
                      className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center"
                    >
                      <Edit size={18} className="mr-2" />
                      Edit Details
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookList;

