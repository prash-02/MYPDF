import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFAnnotation.css';

// Set up the worker for PDF.js
// Use jsdelivr CDN which is more reliable than unpkg
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFAnnotation = ({ file, onSave }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [annotationMode, setAnnotationMode] = useState('highlight'); // highlight, underline, note, draw, shape
  const [shapeType, setShapeType] = useState('rectangle'); // rectangle, circle, line, arrow
  const [color, setColor] = useState('#ffff00'); // Default yellow for highlights
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

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

  // Start annotation
  const startAnnotation = (e) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentAnnotation({
      type: annotationMode,
      shapeType: annotationMode === 'shape' ? shapeType : null,
      color,
      page: pageNumber,
      points: [{ x, y }],
      text: annotationMode === 'note' ? '' : null,
    });
  };

  // Continue annotation
  const continueAnnotation = (e) => {
    if (!isDrawing || !currentAnnotation || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (annotationMode === 'draw' || annotationMode === 'shape') {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: [...prev.points, { x, y }],
      }));
    }
  };

  // End annotation
  const endAnnotation = (e) => {
    if (!isDrawing || !currentAnnotation) return;

    setIsDrawing(false);

    if (annotationMode === 'note') {
      // For notes, we'll prompt for text
      const noteText = prompt('Enter note text:');
      if (noteText) {
        setAnnotations(prev => [
          ...prev,
          { ...currentAnnotation, text: noteText },
        ]);
      }
    } else {
      setAnnotations(prev => [...prev, currentAnnotation]);
    }

    setCurrentAnnotation(null);
  };

  // Render annotations on canvas
  useEffect(() => {
    if (!canvasRef.current || !annotations.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter annotations for current page
    const pageAnnotations = annotations.filter(a => a.page === pageNumber);

    pageAnnotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = 2;

      switch (annotation.type) {
        case 'highlight':
          ctx.globalAlpha = 0.3;
          ctx.fillRect(
            annotation.points[0].x,
            annotation.points[0].y,
            100, // Width of highlight
            20   // Height of highlight
          );
          ctx.globalAlpha = 1.0;
          break;

        case 'underline':
          ctx.beginPath();
          ctx.moveTo(annotation.points[0].x, annotation.points[0].y + 20);
          ctx.lineTo(annotation.points[0].x + 100, annotation.points[0].y + 20);
          ctx.stroke();
          break;

        case 'note':
          // Draw note icon
          ctx.beginPath();
          ctx.arc(annotation.points[0].x, annotation.points[0].y, 10, 0, 2 * Math.PI);
          ctx.fill();
          // Draw note text
          ctx.fillStyle = '#000000';
          ctx.font = '12px Arial';
          ctx.fillText(annotation.text.substring(0, 10) + '...', 
            annotation.points[0].x + 15, 
            annotation.points[0].y + 5);
          break;

        case 'draw':
          if (annotation.points.length < 2) break;
          ctx.beginPath();
          ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
          for (let i = 1; i < annotation.points.length; i++) {
            ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
          }
          ctx.stroke();
          break;

        case 'shape':
          if (annotation.points.length < 2) break;
          const startPoint = annotation.points[0];
          const endPoint = annotation.points[annotation.points.length - 1];
          
          switch (annotation.shapeType) {
            case 'rectangle':
              ctx.strokeRect(
                startPoint.x,
                startPoint.y,
                endPoint.x - startPoint.x,
                endPoint.y - startPoint.y
              );
              break;

            case 'circle':
              const radius = Math.sqrt(
                Math.pow(endPoint.x - startPoint.x, 2) +
                Math.pow(endPoint.y - startPoint.y, 2)
              );
              ctx.beginPath();
              ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
              ctx.stroke();
              break;

            case 'line':
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();
              break;

            case 'arrow':
              // Draw line
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();
              
              // Draw arrowhead
              const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
              const headLength = 15;
              ctx.beginPath();
              ctx.moveTo(endPoint.x, endPoint.y);
              ctx.lineTo(
                endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
                endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
              );
              ctx.moveTo(endPoint.x, endPoint.y);
              ctx.lineTo(
                endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
                endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
              );
              ctx.stroke();
              break;
          }
          break;
      }
    });
  }, [annotations, pageNumber, canvasRef]);

  // Render current annotation while drawing
  useEffect(() => {
    if (!canvasRef.current || !currentAnnotation || !isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear and redraw all annotations
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw existing annotations
    annotations
      .filter(a => a.page === pageNumber)
      .forEach(annotation => {
        // ... (same rendering logic as above)
      });
    
    // Draw current annotation
    ctx.strokeStyle = currentAnnotation.color;
    ctx.fillStyle = currentAnnotation.color;
    ctx.lineWidth = 2;

    switch (currentAnnotation.type) {
      case 'draw':
        if (currentAnnotation.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(currentAnnotation.points[0].x, currentAnnotation.points[0].y);
        for (let i = 1; i < currentAnnotation.points.length; i++) {
          ctx.lineTo(currentAnnotation.points[i].x, currentAnnotation.points[i].y);
        }
        ctx.stroke();
        break;

      case 'shape':
        if (currentAnnotation.points.length < 2) break;
        const startPoint = currentAnnotation.points[0];
        const endPoint = currentAnnotation.points[currentAnnotation.points.length - 1];
        
        // ... (same shape rendering logic as above)
        break;
    }
  }, [currentAnnotation, isDrawing, annotations, pageNumber]);

  // Save annotations
  const saveAnnotations = () => {
    if (onSave) {
      onSave(annotations);
    }
  };

  return (
    <div className="pdf-annotation-container" ref={containerRef}>
      <div className="pdf-annotation-toolbar">
        <div className="pdf-annotation-controls">
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
        <div className="pdf-annotation-mode-controls">
          <button 
            className={annotationMode === 'highlight' ? 'active' : ''}
            onClick={() => {
              setAnnotationMode('highlight');
              setColor('#ffff00');
            }}
          >
            Highlight
          </button>
          <button 
            className={annotationMode === 'underline' ? 'active' : ''}
            onClick={() => {
              setAnnotationMode('underline');
              setColor('#ff0000');
            }}
          >
            Underline
          </button>
          <button 
            className={annotationMode === 'note' ? 'active' : ''}
            onClick={() => {
              setAnnotationMode('note');
              setColor('#00ff00');
            }}
          >
            Note
          </button>
          <button 
            className={annotationMode === 'draw' ? 'active' : ''}
            onClick={() => {
              setAnnotationMode('draw');
              setColor('#0000ff');
            }}
          >
            Draw
          </button>
          <button 
            className={annotationMode === 'shape' ? 'active' : ''}
            onClick={() => {
              setAnnotationMode('shape');
              setColor('#ff00ff');
            }}
          >
            Shape
          </button>
        </div>
        {annotationMode === 'shape' && (
          <div className="pdf-annotation-shape-controls">
            <button 
              className={shapeType === 'rectangle' ? 'active' : ''}
              onClick={() => setShapeType('rectangle')}
            >
              Rectangle
            </button>
            <button 
              className={shapeType === 'circle' ? 'active' : ''}
              onClick={() => setShapeType('circle')}
            >
              Circle
            </button>
            <button 
              className={shapeType === 'line' ? 'active' : ''}
              onClick={() => setShapeType('line')}
            >
              Line
            </button>
            <button 
              className={shapeType === 'arrow' ? 'active' : ''}
              onClick={() => setShapeType('arrow')}
            >
              Arrow
            </button>
          </div>
        )}
        <div className="pdf-annotation-color-picker">
          <label>Color:</label>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
          />
        </div>
        <button onClick={saveAnnotations}>Save Annotations</button>
      </div>

      <div className="pdf-annotation-content">
        <div className="pdf-annotation-document">
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
              onMouseDown={startAnnotation}
              onMouseMove={continueAnnotation}
              onMouseUp={endAnnotation}
              onMouseLeave={endAnnotation}
            />
          </Document>
          <canvas 
            ref={canvasRef} 
            className="pdf-annotation-canvas"
            width={800}
            height={1100}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFAnnotation;