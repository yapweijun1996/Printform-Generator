
import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Sender, AgentTask, UserSettings, ProjectFile } from '../types';
import { GeminiService } from '../services/geminiService';

interface UseAgentChatProps {
  settings: UserSettings;
  getActiveFile: () => ProjectFile;
  updateFileContent: (content: string, description: string) => void;
}

export const useAgentChat = ({ settings, getActiveFile, updateFileContent }: UseAgentChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: Sender.Bot,
      text: 'Hello! I am your ERP Form Copilot. I use strict `<colgroup>` logic and inline styles for print safety. How can I help you today?',
      timestamp: Date.now(),
    }
  ]);
  
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  // Use a Ref to keep track of tasks immediately during recursive calls where state might be stale
  const tasksRef = useRef<AgentTask[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const geminiServiceRef = useRef<GeminiService | null>(null);

  // Sync state to ref
  useEffect(() => {
      tasksRef.current = tasks;
  }, [tasks]);

  // Re-init service when settings change
  useEffect(() => {
    geminiServiceRef.current = new GeminiService(
        settings.apiKey, 
        settings.model, 
        settings.activeTools,
        settings.pageWidth,
        settings.pageHeight
    );
  }, [settings.apiKey, settings.model, settings.activeTools, settings.pageWidth, settings.pageHeight]);

  // Helper to update the status text of the last bot message
  const setBotStatus = (status: string | undefined) => {
      setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.sender === Sender.Bot) {
              return prev.map((msg, i) => i === prev.length - 1 ? { ...msg, statusText: status } : msg);
          }
          return prev;
      });
  };

  // --- INTERNAL TOOL EXECUTOR ---
  const executeToolCall = async (toolName: string, args: any) => {
    const currentFile = getActiveFile();
    let currentContent = currentFile.content;
    let toolResultText = '';
    let success = false;
    let changeDescription = args.change_description || "AI Modification";

    try {
        if (toolName === 'manage_plan') {
            const { action, tasks: newTasksList, task_index, failure_reason } = args;
            
            // Helper to update both State and Ref
            const updateTasks = (newTaskList: AgentTask[]) => {
                setTasks(newTaskList);
                tasksRef.current = newTaskList;
            };

            if (action === 'create_plan') {
                const generatedTasks = newTasksList.map((desc: string, i: number) => ({
                    id: `task-${Date.now()}-${i}`,
                    description: desc,
                    status: 'pending'
                }));
                updateTasks(generatedTasks as AgentTask[]);
                toolResultText = `Created plan with ${generatedTasks.length} tasks.`;
                success = true;
            } else if (action === 'add_task') {
                const additionalTasks = newTasksList.map((desc: string, i: number) => ({
                    id: `task-add-${Date.now()}-${i}`,
                    description: desc,
                    status: 'pending'
                }));
                updateTasks([...tasksRef.current, ...additionalTasks as AgentTask[]]);
                toolResultText = `Added ${additionalTasks.length} tasks.`;
                success = true;
            } else if (action === 'mark_completed') {
                const updated = tasksRef.current.map((t, i) => 
                    i === task_index ? { ...t, status: 'completed' as const } : t
                );
                updateTasks(updated);
                toolResultText = `Marked task #${task_index + 1} as completed.`;
                success = true;
            } else if (action === 'mark_in_progress') {
                const updated = tasksRef.current.map((t, i) => 
                    i === task_index ? { ...t, status: 'in_progress' as const } : t
                );
                updateTasks(updated);
                toolResultText = `Started working on task #${task_index + 1}.`;
                success = true;
            } else if (action === 'mark_failed') {
                const updated = tasksRef.current.map((t, i) => 
                    i === task_index ? { ...t, status: 'failed' as const, description: `${t.description} (Failed: ${failure_reason || 'Unknown'})` } : t
                );
                updateTasks(updated);
                toolResultText = `Marked task #${task_index + 1} as failed.`;
                success = true;
            }
            return { success: true, output: toolResultText };
        }

        if (toolName === 'modify_code') {
          const { operation, search_snippet, new_code } = args;

          if (operation === 'rewrite') {
            currentContent = new_code;
            toolResultText = 'Rewrote entire file.';
            success = true;
          } else if (operation === 'replace') {
            if (!search_snippet) {
               toolResultText = 'Error: search_snippet is required for replace.';
            } else if (currentContent.includes(search_snippet)) {
              currentContent = currentContent.replace(search_snippet, new_code);
              toolResultText = 'Replaced code snippet.';
              success = true;
            } else {
              // Fuzzy Check
              const trimmedContent = currentContent.replace(/\s+/g, ' ');
              const trimmedSearch = search_snippet.replace(/\s+/g, ' ');
               if (trimmedContent.includes(trimmedSearch)) {
                  toolResultText = 'Error: Snippet found but whitespace mismatch. Please copy exact whitespace.';
               } else {
                  toolResultText = `Error: Could not find exact snippet. Please Verify the snippet exists exactly as typed.`;
               }
            }
          }
        } 
        
        else if (toolName === 'insert_content') {
            const { target_snippet, position, new_code } = args;
            if (currentContent.includes(target_snippet)) {
                if (position === 'after') {
                    currentContent = currentContent.replace(target_snippet, target_snippet + '\n' + new_code);
                } else {
                    currentContent = currentContent.replace(target_snippet, new_code + '\n' + target_snippet);
                }
                toolResultText = `Inserted code ${position} snippet.`;
                success = true;
            } else {
                toolResultText = `Error: Could not find target anchor for insertion: "${target_snippet.substring(0, 30)}..."`;
            }
        }

        if (success && currentContent !== currentFile.content) {
            updateFileContent(currentContent, changeDescription);
            if (!toolResultText) toolResultText = `Successfully executed ${toolName}`;
            return { success: true, output: toolResultText };
        }
    } catch (e: any) {
        toolResultText = `System Error during execution: ${e.message}`;
    }
    
    return { success: false, output: toolResultText };
  };

  /**
   * Recursive function to handle the conversation loop.
   * If the model calls a tool, we execute it and feed the result back to the model.
   */
  const processConversationTurn = async (
    inputPayload: string | any[], 
    image?: { mimeType: string, data: string },
    recursionDepth = 0
  ) => {
      // Safety break
      if (recursionDepth > 10) {
          setBotStatus(undefined);
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              sender: Sender.Bot,
              text: '⚠️ Stopped for safety (max automatic turns reached).',
              timestamp: Date.now()
          }]);
          setIsLoading(false);
          return;
      }

      if (!geminiServiceRef.current) {
         geminiServiceRef.current = new GeminiService(
             settings.apiKey, 
             settings.model, 
             settings.activeTools,
             settings.pageWidth,
             settings.pageHeight
         );
      }
      const service = geminiServiceRef.current;
      const botMessageId = (Date.now() + 1).toString();

      // Only create a NEW bubble if it's the start of the user interaction
      if (recursionDepth === 0) {
        setMessages((prev) => [
            ...prev,
            { id: botMessageId, sender: Sender.Bot, text: '', timestamp: Date.now(), isStreaming: true, statusText: 'Thinking...' },
        ]);
      } else {
        // Reuse existing bubble for subsequent tool turns, but set status back to "Thinking"
        setBotStatus('Processing result...');
      }
      
      const activeFile = getActiveFile();
      
      try {
          // Pass the CURRENT value of the tasks ref to ensure the model sees the updated plan
          const stream = await service.sendMessageStream(inputPayload, activeFile.content, image, tasksRef.current);
          
          let fullResponseText = '';
          let functionCallData: any = null;

          for await (const chunk of stream) {
            // Only append text if it actually exists (fixes "non-text parts" warning)
            if (chunk.text && chunk.text.length > 0) {
              fullResponseText += chunk.text;
              
              setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  // If we were showing a status, clear it once text starts streaming
                  if (lastMsg && lastMsg.sender === Sender.Bot) {
                      return prev.map((msg, i) => i === prev.length - 1 ? { ...msg, text: fullResponseText, statusText: undefined } : msg);
                  }
                  return prev;
              });
            }
            // Capture the last function call in the stream
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                functionCallData = chunk.functionCalls[0];
            }
          }

          // Mark this message as done streaming temporarily (if we are waiting for tool)
          if (!functionCallData) {
              setMessages((prev) => 
                  prev.map((msg) => msg.sender === Sender.Bot && msg.isStreaming ? { ...msg, isStreaming: false, statusText: undefined } : msg)
              );
              setIsLoading(false);
          }

          // If tool call found, Execute -> Loop
          if (functionCallData) {
            // Update UI to show we are executing
            let friendlyActionName = "Executing tool...";
            if (functionCallData.name === 'manage_plan') friendlyActionName = "Updating project plan...";
            if (functionCallData.name === 'modify_code') friendlyActionName = "Applying code changes...";
            if (functionCallData.name === 'insert_content') friendlyActionName = "Inserting new content...";
            if (functionCallData.name === 'googleSearch') friendlyActionName = "Searching web...";

            setBotStatus(friendlyActionName);
            
            // Artificial delay for UX (so user can see the status)
            await new Promise(r => setTimeout(r, 600));

            const result = await executeToolCall(functionCallData.name, functionCallData.args);

            // If error, show "Retrying" status
            if (!result.success) {
                 setBotStatus(`Error encountered. Retrying...`);
                 await new Promise(r => setTimeout(r, 800)); // Delay for readability
            }

            // Display tool execution result to user as a discrete event log?
            // Optional: We can add a "System" message, or just attach a toolCall result to the thread.
            // For now, let's keep it simple: The bot will reply with text summarizing what it did.
            // However, we DO add a discrete bubble if it's a code change to notify user.
            if (result.success && (functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content')) {
                const toolMsgId = (Date.now() + 2).toString();
                setMessages(prev => [...prev, {
                    id: toolMsgId,
                    sender: Sender.Bot,
                    text: `✅ Changes applied to file.`, // Placeholder, handled by MessageBubble
                    timestamp: Date.now(),
                    toolCall: {
                        name: functionCallData.name,
                        args: functionCallData.args,
                        status: 'success'
                    }
                }]);
                // Re-add the "Processing" bubble for the next turn
                 setMessages((prev) => [
                    ...prev,
                    { id: (Date.now() + 3).toString(), sender: Sender.Bot, text: '', timestamp: Date.now(), isStreaming: true, statusText: 'Verifying...' },
                ]);
            }

            // Construct the Function Response Part
            const functionResponsePart = {
                functionResponse: {
                    name: functionCallData.name,
                    id: functionCallData.id, 
                    response: {
                        result: result.output,
                        success: result.success
                    }
                }
            };

            // RECURSIVE CALL: Send the tool output back to the model
            await processConversationTurn([functionResponsePart], undefined, recursionDepth + 1);
          } 

      } catch (error: any) {
          console.error(error);
          let errorMsg = 'Sorry, I encountered an error.';
          if (error.message && error.message.includes("API Key")) errorMsg = "API Key Error. Please check settings.";
          
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), sender: Sender.Bot, text: errorMsg, timestamp: Date.now() },
          ]);
          setIsLoading(false);
      }
  };

  // --- PUBLIC SEND MESSAGE ---
  const sendMessage = useCallback(async (text: string, image?: { mimeType: string, data: string }) => {
    if (!text.trim() && !image) return;
    
    if (!settings.apiKey) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: Sender.Bot,
            text: 'Please configure your Google Gemini API Key in Settings (⚙️) to continue.',
            timestamp: Date.now()
        }]);
        return;
    }

    // Add User Message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: text,
      timestamp: Date.now(),
      attachment: image
    };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsLoading(true);

    // Start the recursive turn loop
    await processConversationTurn(text, image);

  }, [settings, getActiveFile, updateFileContent]);

  return {
    messages,
    tasks,
    isLoading,
    sendMessage
  };
};
