
import React from 'react';
import { Message, Sender } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === Sender.User;

  // Identify "Thinking" or "Working" state
  const hasStatus = !!message.statusText;
  const isThinking = message.sender === Sender.Bot && message.isStreaming && !message.text && !hasStatus;

  // Simple formatter to hide large HTML blocks in chat to keep it clean
  const formatText = (text: string) => {
    if (!text) return null;
    
    // Regex to detect the HTML code block
    const codeBlockRegex = /```html([\s\S]*?)```/g;
    const parts = text.split(codeBlockRegex);
    
    // If we find code blocks, replace them with a "Form Updated" placeholder in the chat UI
    if (parts.length > 1) {
      return (
        <span>
          {parts.map((part, index) => {
            // Every odd index was a code block match in split
            if (index % 2 !== 0) {
              return (
                <div key={index} className="my-2 p-3 bg-erp-100 border border-erp-300 rounded text-xs font-mono text-erp-600 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Form Code Generated/Updated</span>
                </div>
              );
            }
            return <span key={index} className="whitespace-pre-wrap">{part}</span>;
          })}
        </span>
      );
    }
    return <span className="whitespace-pre-wrap">{text}</span>;
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-2 ${
          isUser
            ? 'bg-erp-800 text-white rounded-br-none'
            : 'bg-white text-erp-800 border border-erp-200 rounded-bl-none'
        }`}
      >
        {/* Attachment Display */}
        {message.attachment && (
            <div className="rounded-lg overflow-hidden border border-white/20 mb-1">
                <img 
                    src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                    alt="User Attachment" 
                    className="max-h-48 w-auto object-cover"
                />
            </div>
        )}

        {/* Content Logic: Loader vs Text vs Status */}
        {hasStatus ? (
            <div className="flex items-center gap-2 py-1 text-erp-500">
                 <div className="w-3 h-3 rounded-full border-2 border-erp-400 border-t-transparent animate-spin"></div>
                 <span className="text-xs font-mono tracking-wide animate-pulse">{message.statusText}</span>
            </div>
        ) : isThinking ? (
            <div className="flex items-center space-x-1 h-6 py-1 px-1" aria-label="Bot is thinking">
                <div className="w-1.5 h-1.5 bg-erp-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-erp-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-erp-400 rounded-full animate-bounce"></div>
            </div>
        ) : (
            (message.text || message.isStreaming) && (
                <div className="text-sm leading-relaxed min-h-[1.25rem]">
                {formatText(message.text)}
                {message.isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-erp-400 animate-pulse"></span>
                )}
                </div>
            )
        )}
        
        <div className={`text-[10px] ${isUser ? 'text-erp-300' : 'text-erp-400'} flex items-center gap-2 mt-1`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.toolCall && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                  message.toolCall.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                  {message.toolCall.name}
              </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
