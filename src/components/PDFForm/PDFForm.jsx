import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFForm.css';

// Set up the worker for PDF.js
// Use jsdelivr CDN which is more reliable than unpkg
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFForm = ({ file, onSave }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [formFields, setFormFields] = useState([]);
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [fieldType, setFieldType] = useState('text'); // text, checkbox, radio, dropdown
  const [fieldName, setFieldName] = useState('');
  const [fieldOptions, setFieldOptions] = useState('');
  const [formValues, setFormValues] = useState({});
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    // In a real app, we would extract existing form fields from the PDF here
  };

  // Change page
  const changePage = (offset) => {
    const newPageNumber = pageNumber + offset;
    if (newPageNumber >= 1 && newPageNumber <= numPages) {
      setPageNumber(newPageNumber);
    }
  };

  // Add a form field at the clicked position
  const addFormField = (e) => {
    if (!isCreatingField || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      name: fieldName || `${fieldType}-${formFields.length + 1}`,
      x,
      y,
      page: pageNumber,
      options: fieldType === 'dropdown' || fieldType === 'radio' 
        ? fieldOptions.split(',').map(opt => opt.trim())
        : [],
      value: fieldType === 'checkbox' ? false : '',
    };

    setFormFields([...formFields, newField]);
    setIsCreatingField(false);
    setFieldName('');
    setFieldOptions('');
  };

  // Update form field value
  const updateFieldValue = (fieldId, value) => {
    setFormValues({
      ...formValues,
      [fieldId]: value,
    });
  };

  // Render form fields on the PDF
  const renderFormFields = () => {
    return formFields
      .filter(field => field.page === pageNumber)
      .map(field => {
        const fieldValue = formValues[field.id] !== undefined 
          ? formValues[field.id] 
          : field.value;

        switch (field.type) {
          case 'text':
            return (
              <div 
                key={field.id} 
                className="pdf-form-field text-field"
                style={{ left: field.x, top: field.y }}
              >
                <label>{field.name}</label>
                <input 
                  type="text" 
                  value={fieldValue} 
                  onChange={(e) => updateFieldValue(field.id, e.target.value)}
                />
              </div>
            );

          case 'checkbox':
            return (
              <div 
                key={field.id} 
                className="pdf-form-field checkbox-field"
                style={{ left: field.x, top: field.y }}
              >
                <label>
                  <input 
                    type="checkbox" 
                    checked={fieldValue} 
                    onChange={(e) => updateFieldValue(field.id, e.target.checked)}
                  />
                  {field.name}
                </label>
              </div>
            );

          case 'radio':
            return (
              <div 
                key={field.id} 
                className="pdf-form-field radio-field"
                style={{ left: field.x, top: field.y }}
              >
                <fieldset>
                  <legend>{field.name}</legend>
                  {field.options.map((option, index) => (
                    <label key={index}>
                      <input 
                        type="radio" 
                        name={field.id} 
                        value={option} 
                        checked={fieldValue === option} 
                        onChange={(e) => updateFieldValue(field.id, e.target.value)}
                      />
                      {option}
                    </label>
                  ))}
                </fieldset>
              </div>
            );

          case 'dropdown':
            return (
              <div 
                key={field.id} 
                className="pdf-form-field dropdown-field"
                style={{ left: field.x, top: field.y }}
              >
                <label>{field.name}</label>
                <select 
                  value={fieldValue} 
                  onChange={(e) => updateFieldValue(field.id, e.target.value)}
                >
                  <option value="">Select...</option>
                  {field.options.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            );

          default:
            return null;
        }
      });
  };

  // Save form data
  const saveForm = async () => {
    try {
      // In a real app, we would embed form data into the PDF
      // For now, we'll just save the form values
      if (onSave) {
        onSave({
          formFields,
          formValues,
        });
      }

      alert('Form saved successfully!');
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Error saving form. Please try again.');
    }
  };

  // Submit form (e.g., via email)
  const submitForm = () => {
    // In a real app, we would implement form submission logic
    alert('Form submitted successfully!');
  };

  return (
    <div className="pdf-form-container" ref={containerRef}>
      <div className="pdf-form-toolbar">
        <div className="pdf-form-controls">
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
        <div className="pdf-form-field-controls">
          <select 
            value={fieldType} 
            onChange={(e) => setFieldType(e.target.value)}
            disabled={isCreatingField}
          >
            <option value="text">Text Field</option>
            <option value="checkbox">Checkbox</option>
            <option value="radio">Radio Buttons</option>
            <option value="dropdown">Dropdown</option>
          </select>
          <input 
            type="text" 
            placeholder="Field Name" 
            value={fieldName} 
            onChange={(e) => setFieldName(e.target.value)}
            disabled={isCreatingField}
          />
          {(fieldType === 'radio' || fieldType === 'dropdown') && (
            <input 
              type="text" 
              placeholder="Options (comma-separated)" 
              value={fieldOptions} 
              onChange={(e) => setFieldOptions(e.target.value)}
              disabled={isCreatingField}
            />
          )}
          <button 
            onClick={() => setIsCreatingField(true)}
            disabled={isCreatingField}
          >
            Add Field
          </button>
          {isCreatingField && (
            <button 
              onClick={() => setIsCreatingField(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="pdf-form-action-controls">
          <button onClick={saveForm}>Save Form</button>
          <button onClick={submitForm}>Submit Form</button>
        </div>
      </div>

      <div className="pdf-form-content">
        <div className="pdf-form-document">
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
              onClick={isCreatingField ? addFormField : undefined}
            />
          </Document>
          <div className="pdf-form-fields-overlay">
            {renderFormFields()}
          </div>
        </div>
      </div>

      {isCreatingField && (
        <div className="pdf-form-instructions">
          Click on the document to place the {fieldType} field
        </div>
      )}
    </div>
  );
};

export default PDFForm;