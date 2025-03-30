import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFViewer.css';

// Set up the worker for PDF.js
// Use jsdelivr CDN which is more reliable than unpkg
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewer = ({ file }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'continuous'
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const containerRef = useRef(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
    setLoadError(null);
  }

  function onDocumentLoadError(error) {
    console.error('Error while loading PDF:', error);
    setIsLoading(false);
    setLoadError(error);
  }

  // Reset loading state when file changes
  useEffect(() => {
    if (file) {
      setIsLoading(true);
      setLoadError(null);
    }
  }, [file]);

  function changePage(offset) {
    const newPageNumber = pageNumber + offset;
    if (newPageNumber >= 1 && newPageNumber <= numPages) {
      setPageNumber(newPageNumber);
    }
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale(scale => Math.min(scale + 0.1, 3.0));
  }

  function zoomOut() {
    setScale(scale => Math.max(scale - 0.1, 0.5));
  }

  function rotateClockwise() {
    setRotation(rotation => (rotation + 90) % 360);
  }

  function rotateCounterClockwise() {
    setRotation(rotation => (rotation - 90 + 360) % 360);
  }

  function toggleViewMode() {
    setViewMode(viewMode === 'single' ? 'continuous' : 'single');
  }

  // Render loading state
  const renderLoading = () => (
    <div className="pdf-viewer-loading">
      <div className="pdf-viewer-loading-spinner"></div>
      <p>Loading PDF...</p>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="pdf-viewer-error">
      <p>Error loading PDF. Please try again or check if the file is valid.</p>
      <p className="pdf-viewer-error-details">{loadError?.message || 'Unknown error'}</p>
    </div>
  );

  return (
    <div className="pdf-viewer-container" ref={containerRef}>
      <div className="pdf-viewer-toolbar">
        <div className="pdf-viewer-controls">
          <button onClick={previousPage} disabled={pageNumber <= 1 || isLoading || loadError}>
            Previous
          </button>
          <span>
            {numPages ? `Page ${pageNumber} of ${numPages}` : 'No pages'}
          </span>
          <button onClick={nextPage} disabled={pageNumber >= numPages || isLoading || loadError}>
            Next
          </button>
        </div>
        <div className="pdf-viewer-zoom-controls">
          <button onClick={zoomOut} disabled={isLoading || loadError}>-</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={isLoading || loadError}>+</button>
        </div>
        <div className="pdf-viewer-rotation-controls">
          <button onClick={rotateCounterClockwise} disabled={isLoading || loadError}>↺</button>
          <button onClick={rotateClockwise} disabled={isLoading || loadError}>↻</button>
        </div>
        <div className="pdf-viewer-view-mode">
          <button onClick={toggleViewMode} disabled={isLoading || loadError}>
            {viewMode === 'single' ? 'Continuous' : 'Single Page'}
          </button>
        </div>
      </div>

      <div className="pdf-viewer-document">
        {isLoading && renderLoading()}
        {loadError && renderError()}
        
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={renderLoading}
          error={renderError}
          options={{
            cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
          }}
        >
          {viewMode === 'single' ? (
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              error={renderError}
            />
          ) : (
            Array.from(new Array(numPages), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                error={renderError}
              />
            ))
          )}
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;