import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LibraryApp from './App';

const LibraryWrapper = () => {
  return (
    <AuthProvider>
      <LibraryApp />
    </AuthProvider>
  );
};

export default LibraryWrapper;
