
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom'; // Import BrowserRouter
import PdfGalery from './components/PdfGalery';

function App() {
  return (
    <Router>
          <PdfGalery />
    </Router>
  );
}

export default App;
