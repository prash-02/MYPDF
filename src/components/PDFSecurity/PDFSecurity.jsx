import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFSecurity.css';

// Set up the worker for PDF.js
// Use jsdelivr CDN which is more reliable than unpkg
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFSecurity = ({ file, onSave }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [securityMode, setSecurityMode] = useState('password'); // password, permissions, signature, redact
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [permissions, setPermissions] = useState({
    printing: true,
    modifying: true,
    copying: true,
    annotating: true,
    fillingForms: true,
    contentAccessibility: true,
    documentAssembly: true,
  });
  const [signatureMode, setSignatureMode] = useState('draw'); // draw, image, text
  const [signatureText, setSignatureText] = useState('');
  const [signaturePosition, setSignaturePosition] = useState({ page: 1, x: 100, y: 100 });
  const [redactText, setRedactText] = useState('');
  const [sigCanvas, setSignCanvas] = useState({});

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

  // Toggle permission
  const togglePermission = (permission) => {
    setPermissions({
      ...permissions,
      [permission]: !permissions[permission],
    });
  };

  // Clear signature
  const clearSignature = () => {
    sigCanvas.clear();
  };

  // Apply password protection
  const applyPasswordProtection = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      // Convert the file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Encrypt the PDF with the password
      pdfDoc.encrypt({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: 'highResolution',
          modifying: true,
          copying: true,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: true,
        },
      });
      
      // Save the encrypted PDF
      const encryptedPdfBytes = await pdfDoc.save();
      
      // Call the onSave callback with the encrypted PDF
      if (onSave) {
        const blob = new Blob([encryptedPdfBytes], { type: 'application/pdf' });
        onSave(blob, 'password-protected.pdf');
      }
      
      alert('Password protection applied successfully!');
    } catch (error) {
      console.error('Error applying password protection:', error);
      alert('Error applying password protection. Please try again.');
    }
  };

  // Apply permissions
  const applyPermissions = async () => {
    try {
      // Convert the file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Encrypt the PDF with permissions
      pdfDoc.encrypt({
        ownerPassword: 'owner-password', // In a real app, this would be more secure
        permissions: {
          printing: permissions.printing ? 'highResolution' : 'none',
          modifying: permissions.modifying,
          copying: permissions.copying,
          annotating: permissions.annotating,
          fillingForms: permissions.fillingForms,
          contentAccessibility: permissions.contentAccessibility,
          documentAssembly: permissions.documentAssembly,
        },
      });
      
      // Save the PDF with permissions
      const permissionsPdfBytes = await pdfDoc.save();
      
      // Call the onSave callback with the PDF
      if (onSave) {
        const blob = new Blob([permissionsPdfBytes], { type: 'application/pdf' });
        onSave(blob, 'permissions-applied.pdf');
      }
      
      alert('Permissions applied successfully!');
    } catch (error) {
      console.error('Error applying permissions:', error);
      alert('Error applying permissions. Please try again.');
    }
  };

  // Apply digital signature
  const applyDigitalSignature = async () => {
    try {
      // Convert the file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Get the page
      const page = pdfDoc.getPage(signaturePosition.page - 1);
      
      // For drawn signature, convert canvas to image
      if (signatureMode === 'draw') {
        if (!sigCanvas.isEmpty()) {
          const signatureImage = sigCanvas.toDataURL('image/png');
          
          // In a real app, we would embed this image in the PDF
          // For now, we'll just add a text placeholder
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          page.drawText('[Digital Signature]', {
            x: signaturePosition.x,
            y: signaturePosition.y,
            size: 12,
            font,
          });
        } else {
          alert('Please draw a signature first!');
          return;
        }
      } else if (signatureMode === 'text' && signatureText) {
        // For text signature
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(signatureText, {
          x: signaturePosition.x,
          y: signaturePosition.y,
          size: 12,
          font,
        });
      } else {
        alert('Please provide a signature!');
        return;
      }
      
      // Save the signed PDF
      const signedPdfBytes = await pdfDoc.save();
      
      // Call the onSave callback with the signed PDF
      if (onSave) {
        const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
        onSave(blob, 'signed.pdf');
      }
      
      alert('Digital signature applied successfully!');
    } catch (error) {
      console.error('Error applying digital signature:', error);
      alert('Error applying digital signature. Please try again.');
    }
  };

  // Apply redaction (placeholder for now)
  const applyRedaction = () => {
    // In a real app, we would implement redaction logic
    alert('Redaction feature not fully implemented yet.');
  };

  return (
    <div className="pdf-security-container">
      <div className="pdf-security-toolbar">
        <div className="pdf-security-controls">
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
        <div className="pdf-security-mode-controls">
          <button 
            className={securityMode === 'password' ? 'active' : ''}
            onClick={() => setSecurityMode('password')}
          >
            Password Protection
          </button>
          <button 
            className={securityMode === 'permissions' ? 'active' : ''}
            onClick={() => setSecurityMode('permissions')}
          >
            Permissions
          </button>
          <button 
            className={securityMode === 'signature' ? 'active' : ''}
            onClick={() => setSecurityMode('signature')}
          >
            Digital Signature
          </button>
          <button 
            className={securityMode === 'redact' ? 'active' : ''}
            onClick={() => setSecurityMode('redact')}
          >
            Redaction
          </button>
        </div>
      </div>

      <div className="pdf-security-content">
        <div className="pdf-security-document">
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

        <div className="pdf-security-panel">
          {securityMode === 'password' && (
            <div className="pdf-security-password-panel">
              <h3>Password Protection</h3>
              <div className="form-group">
                <label>Password:</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Enter password"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password:</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm password"
                />
              </div>
              <button onClick={applyPasswordProtection}>Apply Password Protection</button>
            </div>
          )}

          {securityMode === 'permissions' && (
            <div className="pdf-security-permissions-panel">
              <h3>Set Permissions</h3>
              <div className="permissions-list">
                <label>
                  <input 
                    type="checkbox" 
                    checked={permissions.printing} 
                    onChange={() => togglePermission('printing')} 
                  />
                  Allow Printing
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={permissions.modifying} 
                    onChange={() => togglePermission('modifying')} 
                  />
                  Allow Modifying
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={permissions.copying} 
                    onChange={() => togglePermission('copying')} 
                  />
                  Allow Copying
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={permissions.annotating} 
                    onChange={() => togglePermission('annotating')} 
                  />
                  Allow Annotating
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={permissions.fillingForms} 
                    onChange={() => togglePermission('fillingForms')} 
                  />
                  Allow Filling Forms
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={permissions.contentAccessibility} 
                    onChange={() => togglePermission('contentAccessibility')} 
                  />
                  Allow Content Accessibility
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={permissions.documentAssembly} 
                    onChange={() => togglePermission('documentAssembly')} 
                  />
                  Allow Document Assembly
                </label>
              </div>
              <button onClick={applyPermissions}>Apply Permissions</button>
            </div>
          )}

          {securityMode === 'signature' && (
            <div className="pdf-security-signature-panel">
              <h3>Digital Signature</h3>
              <div className="signature-mode-controls">
                <button 
                  className={signatureMode === 'draw' ? 'active' : ''}
                  onClick={() => setSignatureMode('draw')}
                >
                  Draw Signature
                </button>
                <button 
                  className={signatureMode === 'text' ? 'active' : ''}
                  onClick={() => setSignatureMode('text')}
                >
                  Text Signature
                </button>
              </div>

              {signatureMode === 'draw' && (
                <div className="signature-draw-container">
                  <SignatureCanvas
                    ref={(ref) => setSignCanvas(ref)}
                    penColor="black"
                    canvasProps={{
                      className: 'signature-canvas',
                      width: 300,
                      height: 150,
                    }}
                  />
                  <button onClick={clearSignature}>Clear</button>
                </div>
              )}

              {signatureMode === 'text' && (
                <div className="signature-text-container">
                  <input 
                    type="text" 
                    value={signatureText} 
                    onChange={(e) => setSignatureText(e.target.value)} 
                    placeholder="Type your signature"
                  />
                </div>
              )}

              <div className="signature-position">
                <h4>Signature Position</h4>
                <div className="form-group">
                  <label>Page:</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={numPages || 1} 
                    value={signaturePosition.page} 
                    onChange={(e) => setSignaturePosition({
                      ...signaturePosition,
                      page: parseInt(e.target.value) || 1,
                    })} 
                  />
                </div>
                <div className="form-group">
                  <label>X Position:</label>
                  <input 
                    type="number" 
                    value={signaturePosition.x} 
                    onChange={(e) => setSignaturePosition({
                      ...signaturePosition,
                      x: parseInt(e.target.value) || 0,
                    })} 
                  />
                </div>
                <div className="form-group">
                  <label>Y Position:</label>
                  <input 
                    type="number" 
                    value={signaturePosition.y} 
                    onChange={(e) => setSignaturePosition({
                      ...signaturePosition,
                      y: parseInt(e.target.value) || 0,
                    })} 
                  />
                </div>
              </div>

              <button onClick={applyDigitalSignature}>Apply Signature</button>
            </div>
          )}

          {securityMode === 'redact' && (
            <div className="pdf-security-redact-panel">
              <h3>Redaction</h3>
              <div className="form-group">
                <label>Text to Redact:</label>
                <input 
                  type="text" 
                  value={redactText} 
                  onChange={(e) => setRedactText(e.target.value)} 
                  placeholder="Enter text to redact"
                />
              </div>
              <button onClick={applyRedaction}>Apply Redaction</button>
              <p className="note">
                Note: Redaction permanently removes sensitive information from the PDF.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFSecurity;