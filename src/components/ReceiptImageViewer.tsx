import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface ReceiptImageViewerProps {
  imageSrc: string;
  fileName?: string;
}

export const ReceiptImageViewer: React.FC<ReceiptImageViewerProps> = ({ imageSrc, fileName }) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col ${
        isFullscreen
          ? 'fixed inset-4 z-50 shadow-2xl flex flex-col bg-white/98'
          : 'h-full min-h-[460px] lg:sticky lg:top-20'
      }`}
    >
      {/* Viewer Header / Toolbar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">
          {fileName || 'Receipt Preview'}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset zoom"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-300 mx-1" />
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Image display container */}
      <div className="flex-1 bg-slate-100/70 overflow-auto p-4 flex items-center justify-center min-h-[360px]">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}
          className="max-w-full flex items-center justify-center"
        >
          <img
            src={imageSrc}
            alt="Uploaded Receipt"
            className="rounded-lg shadow-md max-h-[720px] w-auto object-contain select-none"
          />
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate-100 bg-white text-[11px] text-slate-400 text-center">
        Use controls to zoom and inspect items or numbers
      </div>
    </div>
  );
};
