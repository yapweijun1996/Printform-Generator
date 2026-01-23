import React, { useEffect } from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, src, alt, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        {/* Close Button - Fixed position, always visible */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-erp-800 rounded-full p-3 transition-all shadow-lg hover:shadow-xl hover:scale-110"
          aria-label="Close image preview"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image Container */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <img src={src} alt={alt || 'Preview'} className="w-full h-auto max-h-[90vh] object-contain bg-erp-50" />
        </div>

        {/* Hint Text */}
        <p className="text-center text-white/70 text-sm mt-4">
          Press <kbd className="px-2 py-1 bg-white/10 rounded">ESC</kbd> or click outside to close
        </p>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
