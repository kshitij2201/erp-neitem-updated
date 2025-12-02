import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://erpbackend.tarstech.in';
const API = `${API_BASE}/api/fee-heads`;
const STREAM_API = `${API_BASE}/api/superadmin/streams`;

export const useFeeHeads = (searchTerm) => {
  const [feeHeads, setFeeHeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeeHeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = { search: searchTerm };
      const res = await axios.get(API, { params, headers });
      const normalized = res.data.map(f => ({
        ...f,
        filters: {
          ...f.filters,
          casteCategory: Array.isArray(f.filters?.casteCategory)
            ? f.filters?.casteCategory
            : (f.filters?.casteCategory ? f.filters?.casteCategory.split(',').map(s => s.trim()) : [])
        }
      }));
      const sorted = [...normalized].sort((a, b) => a.title.localeCompare(b.title));
      setFeeHeads(sorted);
    } catch (error) {
      console.error("Failed to fetch fee heads:", error);
      setError(error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeHeads();
  }, [searchTerm]);

  const addFeeHead = async (payload) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(API, payload, { headers });
      const newFeeHead = {
        ...res.data,
        filters: {
          ...res.data.filters,
          casteCategory: Array.isArray(res.data.filters?.casteCategory)
            ? res.data.filters?.casteCategory
            : (res.data.filters?.casteCategory ? res.data.filters?.casteCategory.split(',').map(s => s.trim()) : [])
        }
      };
      setFeeHeads(prev => [...prev, newFeeHead].sort((a, b) => a.title.localeCompare(b.title)));
      return newFeeHead;
    } catch (err) {
      console.error("Error saving fee head:", err);
      throw err;
    }
  };

  const updateFeeHead = async (id, payload) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.put(`${API}/${id}`, payload, { headers });
      const updatedFeeHead = {
        ...res.data,
        filters: {
          ...res.data.filters,
          casteCategory: Array.isArray(res.data.filters?.casteCategory)
            ? res.data.filters?.casteCategory
            : (res.data.filters?.casteCategory ? res.data.filters?.casteCategory.split(',').map(s => s.trim()) : [])
        }
      };
      setFeeHeads(prev => prev.map(f => f._id === id ? updatedFeeHead : f).sort((a, b) => a.title.localeCompare(b.title)));
      return updatedFeeHead;
    } catch (err) {
      console.error("Error updating fee head:", err);
      throw err;
    }
  };

  const deleteFeeHead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${API}/${id}`, { headers });
      setFeeHeads(prev => prev.filter(f => f._id !== id).sort((a, b) => a.title.localeCompare(b.title)));
    } catch (error) {
      console.error("Failed to delete fee head:", error);
      throw error;
    }
  };

  return { feeHeads, loading, error, addFeeHead, updateFeeHead, deleteFeeHead, refetch: fetchFeeHeads };
};

export const useStreams = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStreams = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(STREAM_API, { headers });
      setStreams(res.data);
    } catch (error) {
      console.error("Failed to fetch streams:", error);
      setError(error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  return { streams, loading, error };
};