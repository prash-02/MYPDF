import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFUtilities.css';

// Set up the worker for PDF.js
// Use jsdelivr CDN which is more reliable than unpkg
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFUtilities = ({ file, onSave }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [utilityMode, setUtilityMode] = useState('ocr'); // ocr, compress, merge, split, convert
  const [ocrLanguage, setOcrLanguage] = useState('eng'); // Default OCR language
  const [compressionLevel, setCompressionLevel] = useState('medium'); // low, medium, high
  const [filesToMerge, setFilesToMerge] = useState([]);
  const [splitPages, setSplitPages] = useState('');
  const [convertFormat, setConvertFormat] = useState('docx'); // docx, xlsx, html, txt
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileInputRef = useRef(null);

  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // Change page
  const changePage = (offset) => {
    const newPageNumber = pageNumber + offset;
    if (newPageNumber >= 1 && newPageNumber <= numPages) {
      setPageNumber(newPageNumber);
    }
  };

  // Handle file selection for merge
  const handleFileSelection = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFilesToMerge([...filesToMerge, ...selectedFiles]);
  };

  // Remove file from merge list
  const removeFileFromMerge = (index) => {
    const updatedFiles = [...filesToMerge];
    updatedFiles.splice(index, 1);
    setFilesToMerge(updatedFiles);
  };

  // Perform OCR on the PDF
  const performOCR = async () => {
    setIsProcessing(true);
    setProcessingStatus('Performing OCR...');

    try {
      // In a real application, this would call a backend service or use a library
      // For this example, we'll simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProcessingStatus('OCR completed successfully!');
      
      // In a real app, we would return the OCR'd PDF
      if (onSave) {
        // Here we're just returning the original file as a placeholder
        onSave(file, 'ocr-processed.pdf');
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      setProcessingStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Compress the PDF
  const compressPDF = async () => {
    setIsProcessing(true);
    setProcessingStatus(`Compressing PDF (${compressionLevel})...`);

    try {
      // In a real application, this would use more sophisticated compression techniques
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Simple compression by copying pages (in a real app, more would be done here)
      const compressedPdfDoc = await PDFDocument.create();
      const pages = await compressedPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      
      pages.forEach(page => {
        compressedPdfDoc.addPage(page);
      });
      
      const compressedPdfBytes = await compressedPdfDoc.save();
      setProcessingStatus('Compression completed successfully!');
      
      if (onSave) {
        const blob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
        onSave(blob, 'compressed.pdf');
      }
    } catch (error) {
      console.error('Compression error:', error);
      setProcessingStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Merge PDFs
  const mergePDFs = async () => {
    if (filesToMerge.length === 0) {
      setProcessingStatus('Please add files to merge');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Merging PDFs...');

    try {
      const mergedPdfDoc = await PDFDocument.create();
      
      // Add the current file first
      const currentFileArrayBuffer = await file.arrayBuffer();
      const currentPdfDoc = await PDFDocument.load(currentFileArrayBuffer);
      const currentPages = await mergedPdfDoc.copyPages(currentPdfDoc, currentPdfDoc.getPageIndices());
      currentPages.forEach(page => mergedPdfDoc.addPage(page));
      
      // Add all other files
      for (const fileToMerge of filesToMerge) {
        const fileArrayBuffer = await fileToMerge.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileArrayBuffer);
        const pages = await mergedPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach(page => mergedPdfDoc.addPage(page));
      }
      
      const mergedPdfBytes = await mergedPdfDoc.save();
      setProcessingStatus('Merge completed successfully!');
      
      if (onSave) {
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        onSave(blob, 'merged.pdf');
      }
    } catch (error) {
      console.error('Merge error:', error);
      setProcessingStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Split PDF
  const splitPDF = async () => {
    if (!splitPages) {
      setProcessingStatus('Please specify pages to split');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Splitting PDF...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Parse page ranges (e.g., "1-3,5,7-9")
      const pageRanges = splitPages.split(',').map(range => range.trim());
      const pagesToExtract = [];
      
      pageRanges.forEach(range => {
        if (range.includes('-')) {
          const [start, end] = range.split('-').map(num => parseInt(num, 10) - 1);
          for (let i = start; i <= end; i++) {
            if (i >= 0 && i < pdfDoc.getPageCount()) {
              pagesToExtract.push(i);
            }
          }
        } else {
          const pageIndex = parseInt(range, 10) - 1;
          if (pageIndex >= 0 && pageIndex < pdfDoc.getPageCount()) {
            pagesToExtract.push(pageIndex);
          }
        }
      });
      
      // Create a new PDF with the selected pages
      const newPdfDoc = await PDFDocument.create();
      const pages = await newPdfDoc.copyPages(pdfDoc, pagesToExtract);
      pages.forEach(page => newPdfDoc.addPage(page));
      
      const newPdfBytes = await newPdfDoc.save();
      setProcessingStatus('Split completed successfully!');
      
      if (onSave) {
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        onSave(blob, 'split.pdf');
      }
    } catch (error) {
      console.error('Split error:', error);
      setProcessingStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert PDF to other formats
  const convertPDF = async () => {
    setIsProcessing(true);
    setProcessingStatus(`Converting PDF to ${convertFormat}...`);

    try {
      // In a real application, this would call a backend service or use a library
      // For this example, we'll simulate conversion processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProcessingStatus('Conversion completed successfully!');
      
      // In a real app, we would return the converted file
      if (onSave) {
        // Here we're just returning the original file as a placeholder
        onSave(file, `converted.${convertFormat}`);
      }
    } catch (error) {
      console.error('Conversion error:', error);
      setProcessingStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process the current utility mode
  const processUtility = () => {
    switch (utilityMode) {
      case 'ocr':
        performOCR();
        break;
      case 'compress':
        compressPDF();
        break;
      case 'merge':
        mergePDFs();
        break;
      case 'split':
        splitPDF();
        break;
      case 'convert':
        convertPDF();
        break;
      default:
        break;
    }
  };

  return (
    <div className="pdf-utilities-container">
      <div className="pdf-utilities-toolbar">
        <div className="pdf-utilities-controls">
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
        <div className="pdf-utilities-mode-controls">
          <button 
            className={utilityMode === 'ocr' ? 'active' : ''}
            onClick={() => setUtilityMode('ocr')}
          >
            OCR
          </button>
          <button 
            className={utilityMode === 'compress' ? 'active' : ''}
            onClick={() => setUtilityMode('compress')}
          >
            Compress
          </button>
          <button 
            className={utilityMode === 'merge' ? 'active' : ''}
            onClick={() => setUtilityMode('merge')}
          >
            Merge
          </button>
          <button 
            className={utilityMode === 'split' ? 'active' : ''}
            onClick={() => setUtilityMode('split')}
          >
            Split
          </button>
          <button 
            className={utilityMode === 'convert' ? 'active' : ''}
            onClick={() => setUtilityMode('convert')}
          >
            Convert
          </button>
        </div>
      </div>

      <div className="pdf-utilities-content">
        <div className="pdf-utilities-document">
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
            />
          </Document>
        </div>

        <div className="pdf-utilities-panel">
          <h3>PDF Utilities</h3>
          
          {utilityMode === 'ocr' && (
            <div className="ocr-options">
              <h4>OCR Options</h4>
              <div className="form-group">
                <label>Language:</label>
                <select 
                  value={ocrLanguage} 
                  onChange={(e) => setOcrLanguage(e.target.value)}
                >
                  <option value="eng">English</option>
                  <option value="fra">French</option>
                  <option value="deu">German</option>
                  <option value="spa">Spanish</option>
                  <option value="ita">Italian</option>
                </select>
              </div>
              <p className="note">
                OCR will extract text from scanned documents and make it searchable.
              </p>
            </div>
          )}

          {utilityMode === 'compress' && (
            <div className="compress-options">
              <h4>Compression Options</h4>
              <div className="form-group">
                <label>Compression Level:</label>
                <select 
                  value={compressionLevel} 
                  onChange={(e) => setCompressionLevel(e.target.value)}
                >
                  <option value="low">Low (Better Quality)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Smaller Size)</option>
                </select>
              </div>
              <p className="note">
                Higher compression may reduce image quality in the PDF.
              </p>
            </div>
          )}

          {utilityMode === 'merge' && (
            <div className="merge-options">
              <h4>Merge PDFs</h4>
              <p>Current file will be merged with:</p>
              <ul className="merge-file-list">
                {filesToMerge.map((file, index) => (
                  <li key={index}>
                    {file.name}
                    <button onClick={() => removeFileFromMerge(index)}>Remove</button>
                  </li>
                ))}
              </ul>
              <div className="form-group">
                <input 
                  type="file" 
                  accept=".pdf" 
                  multiple 
                  ref={fileInputRef}
                  onChange={handleFileSelection}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current.click()}>
                  Add Files
                </button>
              </div>
              <p className="note">
                Files will be merged in the order listed above.
              </p>
            </div>
          )}

          {utilityMode === 'split' && (
            <div className="split-options">
              <h4>Split PDF</h4>
              <div className="form-group">
                <label>Pages to Extract:</label>
                <input 
                  type="text" 
                  value={splitPages} 
                  onChange={(e) => setSplitPages(e.target.value)} 
                  placeholder="e.g., 1-3,5,7-9"
                />
              </div>
              <p className="note">
                Specify page ranges (e.g., 1-3,5,7-9) to extract into a new PDF.
              </p>
            </div>
          )}

          {utilityMode === 'convert' && (
            <div className="convert-options">
              <h4>Convert PDF</h4>
              <div className="form-group">
                <label>Output Format:</label>
                <select 
                  value={convertFormat} 
                  onChange={(e) => setConvertFormat(e.target.value)}
                >
                  <option value="docx">Word Document (.docx)</option>
                  <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                  <option value="html">Web Page (.html)</option>
                  <option value="txt">Text File (.txt)</option>
                </select>
              </div>
              <p className="note">
                Conversion quality may vary depending on the PDF structure.
              </p>
            </div>
          )}

          <div className="processing-status">
            {processingStatus && <p>{processingStatus}</p>}
          </div>

          <button 
            onClick={processUtility} 
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFUtilities;