import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFEditor.css';

// Set up the worker for PDF.js
// Use jsdelivr CDN which is more reliable than unpkg
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFEditor = ({ file, onSave }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [editMode, setEditMode] = useState('text'); // 'text', 'image', 'page'
  const [selectedElement, setSelectedElement] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const canvasRef = useRef(null);

  // Load the PDF document for editing
  const loadPdfForEditing = async () => {
    try {
      // Convert the file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Save the PDF bytes for later use
      const pdfBytes = await pdfDoc.save();
      setPdfBytes(pdfBytes);
    } catch (error) {
      console.error('Error loading PDF for editing:', error);
    }
  };

  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    loadPdfForEditing();
  };

  // Change page
  const changePage = (offset) => {
    const newPageNumber = pageNumber + offset;
    if (newPageNumber >= 1 && newPageNumber <= numPages) {
      setPageNumber(newPageNumber);
    }
  };

  // Handle text editing
  const handleTextEdit = async () => {
    if (!pdfBytes) return;

    try {
      // Load the PDF document from bytes
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Get the page
      const page = pdfDoc.getPage(pageNumber - 1);
      
      // Add text to the page
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(editText, {
        x: 50,
        y: 500,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      setPdfBytes(modifiedPdfBytes);
      
      // Call the onSave callback with the modified PDF
      if (onSave) {
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        onSave(blob);
      }
      
      // Reset editing state
      setIsEditing(false);
      setEditText('');
    } catch (error) {
      console.error('Error editing PDF:', error);
    }
  };

  // Handle image editing (placeholder for now)
  const handleImageEdit = () => {
    // This would be implemented with more complex PDF manipulation
    console.log('Image editing not implemented yet');
  };

  // Handle page operations (placeholder for now)
  const handlePageOperation = (operation) => {
    // Operations like insert, delete, or move pages
    console.log(`Page operation ${operation} not implemented yet`);
  };

  return (
    <div className="pdf-editor-container">
      <div className="pdf-editor-toolbar">
        <div className="pdf-editor-controls">
          <button onClick={() => changePage(-1)} disabled={pageNumber <= 1}>
            Previous
          </button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <button onClick={() => changePage(1)} disabled={pageNumber >= numPages}>
            Next
          </button>
        </div>
        <div className="pdf-editor-mode-controls">
          <button 
            className={editMode === 'text' ? 'active' : ''}
            onClick={() => setEditMode('text')}
          >
            Text
          </button>
          <button 
            className={editMode === 'image' ? 'active' : ''}
            onClick={() => setEditMode('image')}
          >
            Image
          </button>
          <button 
            className={editMode === 'page' ? 'active' : ''}
            onClick={() => setEditMode('page')}
          >
            Page
          </button>
        </div>
      </div>

      <div className="pdf-editor-content">
        <div className="pdf-editor-document">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            options={{
              cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
              cMapPacked: true,
            }}
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              canvasRef={canvasRef}
              onClick={(e) => {
                if (editMode === 'text') {
                  setIsEditing(true);
                }
              }}
            />
          </Document>
        </div>

        {isEditing && editMode === 'text' && (
          <div className="pdf-editor-text-panel">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Enter text to add to the PDF"
            />
            <div className="pdf-editor-text-controls">
              <button onClick={handleTextEdit}>Add Text</button>
              <button onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        )}

        {editMode === 'page' && (
          <div className="pdf-editor-page-panel">
            <button onClick={() => handlePageOperation('insert')}>Insert Page</button>
            <button onClick={() => handlePageOperation('delete')}>Delete Page</button>
            <button onClick={() => handlePageOperation('move')}>Move Page</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFEditor;