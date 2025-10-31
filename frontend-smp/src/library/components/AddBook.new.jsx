import React, { useState, useRef, useEffect } from "react";
import Barcode from "react-barcode";
import {
  Book,
  User,
  Bookmark,
  Package,
  CheckCircle,
  XCircle,
  X,
  Download,
  MapPin,
  Package2,
  BookOpen,
  Printer,
  Calendar,
  FileText,
  IndianRupee,
  FileDown,
} from "lucide-react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const AddBook = ({ initialData }) => {
  const [formData, setFormData] = useState({
    ACCDATE: initialData?.ACCDATE || "",
    STATUS: initialData?.STATUS || "PRESENT",
    ACCNO: initialData?.ACCNO || "",
    SERIESCODE: initialData?.SERIESCODE || "",
    CLASSNO: initialData?.CLASSNO || "",
    AUTHOR: initialData?.AUTHOR || "",
    TITLENAME: initialData?.TITLENAME || "",
    "PUBLISHER NAME": initialData?.["PUBLISHER NAME"] || "",
    CITY: initialData?.CITY || "",
    "PUB.YEAR": initialData?.["PUB.YEAR"] || "",
    PAGES: initialData?.PAGES || "",
    "VENDER CITY": initialData?.["VENDER CITY"] || "",
    INVOICENO: initialData?.INVOICENO || "",
    INVOICE_DATE: initialData?.INVOICE_DATE || "",
    "SUB.Subject NAME": initialData?.["SUB.Subject NAME"] || "",
    PRINTPRICE: initialData?.PRINTPRICE || "",
    PURPRICE: initialData?.PURPRICE || "",
    REFCIR: initialData?.REFCIR || "",
    QUANTITY: initialData?.QUANTITY || 1,
    materialType: initialData?.materialType || "",
  });

  const [barcodes, setBarcodes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("success");
  const [modalMessage, setModalMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      ACCDATE: "",
      STATUS: "PRESENT",
      ACCNO: "",
      SERIESCODE: "",
      CLASSNO: "",
      AUTHOR: "",
      TITLENAME: "",
      "PUBLISHER NAME": "",
      CITY: "",
      "PUB.YEAR": "",
      PAGES: "",
      "VENDER CITY": "",
      INVOICENO: "",
      INVOICE_DATE: "",
      "SUB.Subject NAME": "",
      PRINTPRICE: "",
      PURPRICE: "",
      REFCIR: "",
      QUANTITY: 1,
      materialType: "",
    });
  };

  const validateForm = () => {
    if (!formData.TITLENAME.trim()) {
      setModalType("error");
      setModalMessage("Please enter a title");
      setShowModal(true);
      return false;
    }

    if (!formData.AUTHOR.trim()) {
      setModalType("error");
      setModalMessage("Please enter an author name");
      setShowModal(true);
      return false;
    }

    if (!formData.materialType) {
      setModalType("error");
      setModalMessage("Please select a material type");
      setShowModal(true);
      return false;
    }

    if (isNaN(formData.QUANTITY) || formData.QUANTITY < 1) {
      setModalType("error");
      setModalMessage("QUANTITY must be a valid number and at least 1");
      setShowModal(true);
      return false;
    }

    if (!formData.ACCNO) {
      setModalType("error");
      setModalMessage("Please enter an accession number");
      setShowModal(true);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const quantity = parseInt(formData.QUANTITY);
      const baseAccNo = formData.ACCNO;

      // Create an array of books with sequential accession numbers
      const books = Array.from({ length: quantity }, (_, index) => {
        // If baseAccNo is numeric, increment it; otherwise append numbers
        const isNumeric = /^\d+$/.test(baseAccNo);
        const newAccNo = isNumeric
          ? String(parseInt(baseAccNo) + index).padStart(baseAccNo.length, "0")
          : `${baseAccNo}-${index + 1}`;

        return {
          ACCDATE: formData.ACCDATE,
          STATUS: formData.STATUS,
          ACCNO: newAccNo,
          SERIESCODE: formData.SERIESCODE,
          CLASSNO: formData.CLASSNO,
          AUTHOR: formData.AUTHOR,
          TITLENAME: formData.TITLENAME,
          "PUBLISHER NAME": formData["PUBLISHER NAME"],
          CITY: formData.CITY,
          "PUB.YEAR": formData["PUB.YEAR"],
          PAGES: formData.PAGES,
          "VENDER CITY": formData["VENDER CITY"],
          INVOICENO: formData.INVOICENO,
          INVOICE_DATE: formData.INVOICE_DATE,
          "SUB.Subject NAME": formData["SUB.Subject NAME"],
          PRINTPRICE: formData.PRINTPRICE,
          PURPRICE: formData.PURPRICE,
          REFCIR: formData.REFCIR,
          QUANTITY: 1, // Each book entry has quantity 1
          materialType: formData.materialType,
        };
      });

      // Create barcodes for each book
      const newBarcodes = books.map((book, index) => ({
        id: uuidv4(),
        title: book.TITLENAME,
        author: book.AUTHOR,
        barcodeValue: book.ACCNO,
        copyNumber: index + 1,
      }));

      // Set the barcodes for display
      setBarcodes(newBarcodes);

      // Submit each book individually
      for (const bookData of books) {
        await axios.post("http://167.172.216.231:4000/api/books", bookData);
      }

      setModalType("success");
      setModalMessage(`${books.length} book(s) added successfully!`);
      setShowModal(true);
      resetForm();
    } catch (error) {
      console.error("Error adding book:", error);
      setModalType("error");
      setModalMessage(error.response?.data?.message || "Error adding book");
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const downloadBarcodes = () => {
    barcodes.forEach((barcode, index) => {
      const canvas = document.querySelector(`#barcode-${barcode.id} canvas`);
      if (canvas) {
        try {
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `${barcode.title}-copy-${barcode.copyNumber}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (error) {
          console.error("Error downloading barcode:", error);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-gradient-to-br flex flex-col py-12 px-2 md:px-8 z-0 ml-72 overflow-y-auto overflow-x-hidden from-blue-100 to-indigo-200">
      <div className="bg-white shadow-xl rounded-lg p-8 w-full max-w-5xl border border-blue-100">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-600 text-white p-3 rounded-full">
            <Book size={24} />
          </div>
          <h2 className="text-3xl font-bold ml-3 text-blue-800">Add Book</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Your existing form JSX here */}
        </form>

        <p className="text-gray-500 text-center mt-6 text-sm">
          All books will be added to your library collection
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                {modalType === "success" ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mr-3" />
                )}
                <h3 className="text-lg font-medium text-gray-900">
                  {modalType === "success" ? "Success" : "Error"}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-2">
              <p className="text-gray-600">{modalMessage}</p>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={closeModal}
                className={`w-full py-2 px-4 rounded-md font-medium text-white ${
                  modalType === "success"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  modalType === "success"
                    ? "focus:ring-green-500"
                    : "focus:ring-blue-500"
                } transition-colors`}
              >
                {modalType === "success" ? "Continue" : "Try Again"}
              </button>
            </div>
          </div>
        </div>
      )}

      {barcodes.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Generated Barcodes</h3>
            <div className="space-y-6">
              {barcodes.map((barcode) => (
                <div key={barcode.id} className="p-4 border rounded-lg">
                  <div
                    id={`barcode-${barcode.id}`}
                    className="flex flex-col items-center"
                  >
                    <div className="text-center mb-2">
                      <p className="font-bold">{barcode.title}</p>
                      <p className="text-gray-600">By: {barcode.author}</p>
                      <p className="text-sm text-gray-500">
                        Copy {barcode.copyNumber} - {barcode.barcodeValue}
                      </p>
                    </div>
                    <Barcode
                      value={barcode.barcodeValue}
                      width={2}
                      height={100}
                      displayValue={true}
                      textMargin={2}
                      fontSize={14}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex space-x-2 mt-4 justify-end">
              <button
                onClick={downloadBarcodes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Download size={20} className="mr-2" />
                Download Barcodes
              </button>
              <button
                onClick={() => setBarcodes([])}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddBook;
