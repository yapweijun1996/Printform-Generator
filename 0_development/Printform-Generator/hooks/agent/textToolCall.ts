export const extractToolCallFromText = (text: string) => {
  if (!text) return { toolCall: null as any, cleanedText: text };
  const match = text.match(/<TOOL_CALL>([\s\S]*?)<\/TOOL_CALL>/);
  if (!match) return { toolCall: null as any, cleanedText: text };

  const rawJson = match[1].trim();
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed?.name || !parsed?.args) return { toolCall: null as any, cleanedText: text };
    return {
      toolCall: { name: parsed.name, args: parsed.args, id: `text-tool-${Date.now()}` },
      cleanedText: text.replace(match[0], '').trim(),
    };
  } catch {
    return { toolCall: null as any, cleanedText: text };
  }
};
