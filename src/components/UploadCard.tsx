import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Camera,
  FileImage,
  Sparkles,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../utils/sampleReceipts';

interface UploadCardProps {
  imagePreview: string | null;
  imageFileName: string | null;
  isAnalyzing: boolean;
  onImageSelected: (dataUrl: string, fileName: string, mimeType: string) => void;
  onAnalyze: () => void;
  onClearImage: () => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  imagePreview,
  imageFileName,
  isAnalyzing,
  onImageSelected,
  onAnalyze,
  onClearImage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    try {
      const { fileToDataUrl } = await import('../utils/imageUtils');
      const { dataUrl, mimeType } = await fileToDataUrl(file);
      onImageSelected(dataUrl, file.name, mimeType);
    } catch (err) {
      console.error('Error reading file:', err);
    }
  };

  const handleSelectSample = (sample: SampleReceipt) => {
    // Rasterize SVG sample to high-res PNG for optimal OCR readability
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // High-DPI rasterization
      canvas.width = 400 * scale;
      canvas.height = (img.height || 600) * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        const pngData = canvas.toDataURL('image/png', 0.95);
        onImageSelected(pngData, `${sample.id}.png`, 'image/png');
      } else {
        onImageSelected(sample.dataUrl, `${sample.id}.svg`, 'image/svg+xml');
      }
    };
    img.onerror = () => {
      onImageSelected(sample.dataUrl, `${sample.id}.svg`, 'image/svg+xml');
    };
    img.src = sample.dataUrl;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Title & Subtitle */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Receipt Scanner
        </h1>
        <p className="text-base sm:text-lg text-slate-600">
          Upload a receipt to automatically extract the details.
        </p>
      </div>

      {/* Main Upload / Drag-and-drop Card */}
      {!imagePreview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-white shadow-sm ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
          }`}
        >
          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp,image/heic,image/heif"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-800">
                Drag and drop your receipt here
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Supports JPG, JPEG, PNG, and HEIC files
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm shadow-blue-500/25 flex items-center gap-2 cursor-pointer"
              >
                <FileImage className="w-4 h-4" />
                Upload Receipt
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium text-sm transition border border-slate-200 flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-slate-500" />
                Take Photo
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Preview State when Image is Uploaded */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Receipt Ready</h3>
                <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                  {imageFileName || 'Uploaded receipt image'}
                </p>
              </div>
            </div>
            {!isAnalyzing && (
              <button
                type="button"
                onClick={onClearImage}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change Image
              </button>
            )}
          </div>

          {/* Receipt Image Preview */}
          <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 max-h-80 flex items-center justify-center p-2">
            <img
              src={imagePreview}
              alt="Receipt Preview"
              className="w-auto max-h-76 object-contain mx-auto rounded shadow-xs"
            />
          </div>

          {/* Analyze Receipt Action */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={onAnalyze}
              className={`w-full py-3.5 px-6 rounded-xl font-semibold text-base transition flex items-center justify-center gap-2 shadow-sm ${
                isAnalyzing
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 cursor-pointer active:scale-[0.99]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Analyze Receipt</span>
                </>
              )}
            </button>
            {isAnalyzing && (
              <p className="text-xs text-center text-slate-500 mt-2 animate-pulse">
                Gemini vision is reading merchant, items, taxes, and totals...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Test with Sample Receipts */}
      {!imagePreview && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Or try a sample receipt
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_RECEIPTS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition shadow-xs group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition">
                    {sample.badge}
                  </span>
                </div>
                <div className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition">
                  {sample.title}
                </div>
                <div className="text-xs text-slate-500">{sample.subtitle}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
