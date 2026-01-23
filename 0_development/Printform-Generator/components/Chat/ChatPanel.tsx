import React, { useRef, useEffect, useState } from 'react';
import { Message } from '../../types';
import MessageBubble from './MessageBubble';
import ImagePreviewModal from './ImagePreviewModal';

interface ChatPanelProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  onSend: (image?: { mimeType: string; data: string }) => void;
  isLoading: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, input, setInput, onSend, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [isSelectedImageOpen, setIsSelectedImageOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handleSendClick = () => {
    if (!input.trim() && !selectedImage) return;
    onSend(selectedImage || undefined);
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // remove data:image/xxx;base64, prefix for the API
      const base64Data = base64String.split(',')[1];

      setSelectedImage({
        mimeType: file.type,
        data: base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-erp-50">
      {selectedImage && (
        <ImagePreviewModal
          isOpen={isSelectedImageOpen}
          src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`}
          alt="Selected Upload"
          onClose={() => setIsSelectedImageOpen(false)}
        />
      )}
      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-white/50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-erp-400 opacity-60 p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 mb-3 text-erp-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="text-xs text-center leading-relaxed">
              Describe the invoice or report you need.
              <br />
              <span className="italic">"Add a tax column"</span> or <span className="italic">"Make headers blue"</span>
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-none p-3 bg-white border-t border-erp-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        {/* Image Preview */}
        {selectedImage && (
          <div className="mb-2 relative inline-block">
            <div className="relative group">
              <button type="button" onClick={() => setIsSelectedImageOpen(true)} title="Click to preview">
                <img
                  src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`}
                  alt="Preview"
                  className="h-16 rounded border border-erp-300 shadow-sm cursor-zoom-in"
                />
              </button>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="relative flex items-end gap-2">
          {/* File Input */}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-erp-400 hover:text-erp-700 hover:bg-erp-100 rounded-lg transition-colors flex-none"
            title="Attach Image for Replication"
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>

          <textarea
            ref={inputRef as any}
            rows={1}
            className="flex-1 bg-erp-50 border border-erp-200 text-erp-800 text-sm rounded-lg focus:ring-2 focus:ring-erp-500 focus:border-transparent block px-3 py-2.5 shadow-inner transition-all resize-none overflow-hidden min-h-[42px] max-h-[120px]"
            placeholder={selectedImage ? 'Describe this form...' : 'Type instructions...'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />

          <button
            onClick={handleSendClick}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className={`p-2.5 rounded-lg transition-all flex-none ${
              (!input.trim() && !selectedImage) || isLoading
                ? 'text-erp-300 bg-erp-100 cursor-not-allowed'
                : 'text-white bg-erp-800 hover:bg-erp-900 shadow-md transform hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
