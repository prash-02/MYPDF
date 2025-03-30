import { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import PDFViewer from './components/PDFViewer/PDFViewer';
import PDFEditor from './components/PDFEditor/PDFEditor';
import PDFForm from './components/PDFForm/PDFForm';
import PDFAnnotation from './components/PDFAnnotation/PDFAnnotation';
import PDFSecurity from './components/PDFSecurity/PDFSecurity';
import PDFUtilities from './components/PDFUtilities/PDFUtilities';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleSave = (modifiedFile, suggestedName) => {
    // Create a download link for the modified file
    const url = URL.createObjectURL(modifiedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName || 'modified.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>PDF Application</h1>
          <nav className="app-nav">
            <Link to="/viewer">View</Link>
            <Link to="/editor">Edit</Link>
            <Link to="/form">Forms</Link>
            <Link to="/annotate">Annotate</Link>
            <Link to="/security">Security</Link>
            <Link to="/utilities">Utilities</Link>
          </nav>
        </header>

        <main className="app-content">
          {!selectedFile ? (
            <div 
              className="file-drop-area"
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange} 
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <div className="file-drop-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p>Drag & Drop a PDF file here or click to browse</p>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/viewer" element={<PDFViewer file={selectedFile} />} />
              <Route path="/editor" element={<PDFEditor file={selectedFile} onSave={handleSave} />} />
              <Route path="/form" element={<PDFForm file={selectedFile} onSave={handleSave} />} />
              <Route path="/annotate" element={<PDFAnnotation file={selectedFile} onSave={handleSave} />} />
              <Route path="/security" element={<PDFSecurity file={selectedFile} onSave={handleSave} />} />
              <Route path="/utilities" element={<PDFUtilities file={selectedFile} onSave={handleSave} />} />
              <Route path="*" element={<Navigate to="/viewer" replace />} />
            </Routes>
          )}
        </main>

        {selectedFile && (
          <footer className="app-footer">
            <div className="current-file">
              <span>Current File: {fileName}</span>
              <button onClick={() => {
                setSelectedFile(null);
                setFileName('');
              }}>Change File</button>
            </div>
          </footer>
        )}
      </div>
    </Router>
  )
}

export default App
