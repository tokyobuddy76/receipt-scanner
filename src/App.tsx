import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadCard } from './components/UploadCard';
import { ReceiptImageViewer } from './components/ReceiptImageViewer';
import { ReceiptResults } from './components/ReceiptResults';
import { SavedReceiptsModal } from './components/SavedReceiptsModal';
import { ReceiptData, SavedReceipt } from './types';
import { getSavedReceipts, saveReceiptToStorage, deleteSavedReceipt } from './utils/storage';
import { AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load saved receipts on mount
  useEffect(() => {
    setSavedReceipts(getSavedReceipts());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleImageSelected = (dataUrl: string, fileName: string, detectedMime: string) => {
    setImagePreview(dataUrl);
    setImageFileName(fileName);
    setMimeType(detectedMime);
    setError(null);
    setReceiptData(null);
    setIsSaved(false);
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setImageFileName(null);
    setError(null);
    setReceiptData(null);
    setIsSaved(false);
  };

  const handleAnalyzeReceipt = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: mimeType || 'image/jpeg',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.error ||
            "We couldn't read this receipt. Try taking a clearer photo or uploading another image."
        );
        return;
      }

      setReceiptData(result.data);
      setIsSaved(false);
      showToast('Receipt analyzed successfully!');
    } catch (err: any) {
      console.error('Analysis request error:', err);
      setError(
        "We couldn't read this receipt. Try taking a clearer photo or uploading another image."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReceiptDataChange = (updated: ReceiptData) => {
    setReceiptData(updated);
    setIsSaved(false);
  };

  const handleSaveReceipt = () => {
    if (!receiptData) return;
    saveReceiptToStorage(receiptData, imagePreview || undefined, imageFileName || undefined);
    const updatedList = getSavedReceipts();
    setSavedReceipts(updatedList);
    setIsSaved(true);
    showToast('Receipt saved to library');
  };

  const handleScanAnother = () => {
    setImagePreview(null);
    setImageFileName(null);
    setReceiptData(null);
    setError(null);
    setIsSaved(false);
  };

  const handleSelectSavedReceipt = (saved: SavedReceipt) => {
    setReceiptData(saved.data);
    if (saved.imageDataUrl) {
      setImagePreview(saved.imageDataUrl);
    }
    setImageFileName(saved.imageFileName || 'saved_receipt.jpg');
    setError(null);
    setIsSaved(true);
  };

  const handleDeleteSavedReceipt = (id: string) => {
    deleteSavedReceipt(id);
    setSavedReceipts(getSavedReceipts());
    showToast('Receipt deleted');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header
        savedCount={savedReceipts.length}
        onOpenSaved={() => setIsSavedModalOpen(true)}
        onNewScan={handleScanAnother}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-950 mb-0.5">Extraction Notice</p>
              <p className="text-amber-800 leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                handleAnalyzeReceipt();
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200/80 text-amber-900 transition flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* View Switch: Upload State VS Result State */}
        {!receiptData ? (
          <UploadCard
            imagePreview={imagePreview}
            imageFileName={imageFileName}
            isAnalyzing={isAnalyzing}
            onImageSelected={handleImageSelected}
            onAnalyze={handleAnalyzeReceipt}
            onClearImage={handleClearImage}
          />
        ) : (
          /* Results Screen: Two-column layout on desktop, stacked on mobile */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Receipt Details
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Extracted
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Review and edit the extracted details. Click any field to update.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition shadow-xs cursor-pointer"
                >
                  Scan Another
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: Receipt image preview */}
              <div className="lg:col-span-5 order-2 lg:order-1">
                {imagePreview ? (
                  <ReceiptImageViewer
                    imageSrc={imagePreview}
                    fileName={imageFileName || 'Receipt'}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                    No image preview available
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Extracted receipt information */}
              <div className="lg:col-span-7 order-1 lg:order-2">
                <ReceiptResults
                  receipt={receiptData}
                  onChange={handleReceiptDataChange}
                  onSave={handleSaveReceipt}
                  onScanAnother={handleScanAnother}
                  isSaved={isSaved}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Receipt Scanner • Multimodal AI Analysis</span>
          <span>Only verifiable details are extracted • All fields editable</span>
        </div>
      </footer>

      {/* Saved Receipts Modal */}
      <SavedReceiptsModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedReceipts={savedReceipts}
        onSelectReceipt={handleSelectSavedReceipt}
        onDeleteReceipt={handleDeleteSavedReceipt}
      />
    </div>
  );
}
