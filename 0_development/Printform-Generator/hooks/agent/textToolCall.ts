export const extractToolCallFromText = (text: string) => {
  if (!text) return { toolCall: null as any, cleanedText: text };
  const inferToolCallFromParsed = (parsed: any) => {
    if (!parsed || typeof parsed !== 'object') return null as any;

    if (parsed?.name && parsed?.args && typeof parsed.name === 'string' && typeof parsed.args === 'object') {
      return { name: parsed.name, args: parsed.args };
    }

    // Heuristic: model sometimes outputs the args object only (no <TOOL_CALL>, no name/args wrapper).
    // We infer the tool name based on shape to avoid losing automation.
    const action = parsed?.action;
    const tasks = parsed?.tasks;
    const taskIndex = parsed?.task_index;

    const isManagePlanAction =
      typeof action === 'string' &&
      ['create_plan', 'mark_completed', 'mark_in_progress', 'mark_failed', 'add_task'].includes(action);
    const isTasksArray = Array.isArray(tasks) && tasks.every((t) => typeof t === 'string');
    const isTaskIndex = typeof taskIndex === 'number' && Number.isFinite(taskIndex) && taskIndex >= 0;

    if (
      isManagePlanAction &&
      (action === 'create_plan' || action === 'add_task' ? isTasksArray : isTaskIndex || isTasksArray)
    ) {
      return { name: 'manage_plan', args: parsed };
    }

    if (
      typeof parsed?.operation === 'string' &&
      ['replace', 'rewrite'].includes(parsed.operation) &&
      typeof parsed?.new_code === 'string'
    ) {
      return { name: 'modify_code', args: parsed };
    }

    if (
      typeof parsed?.target_snippet === 'string' &&
      typeof parsed?.position === 'string' &&
      ['before', 'after'].includes(parsed.position) &&
      typeof parsed?.new_code === 'string'
    ) {
      return { name: 'insert_content', args: parsed };
    }

    if (typeof parsed?.pattern === 'string') {
      return { name: 'grep_search', args: parsed };
    }

    if (
      typeof parsed?.operation === 'string' &&
      ['replace', 'rewrite', 'insert_before', 'insert_after'].includes(parsed.operation) &&
      typeof parsed?.new_code === 'string'
    ) {
      return { name: 'diff_check', args: parsed };
    }

    if ('template_name' in parsed) {
      return { name: 'load_reference_template', args: parsed };
    }

    if ('max_chars_per_file' in parsed || 'max_total_chars' in parsed) {
      return { name: 'read_all_files', args: parsed };
    }

    if ('max_chars' in parsed && !('template_name' in parsed)) {
      return { name: 'read_file', args: parsed };
    }

    if ('pageWidth' in parsed || 'pageHeight' in parsed) {
      return { name: 'print_safe_validator', args: parsed };
    }

    if ('allow_tr_directly_under_table' in parsed || 'allow_table_fragments_in_template' in parsed) {
      return { name: 'html_validation', args: parsed };
    }

    return null as any;
  };

  const tryParseJson = (raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const extractFirstJsonObjectSubstring = (input: string) => {
    const s = String(input || '');
    const maxStartsToTry = 20;
    let startsTried = 0;

    for (let start = 0; start < s.length; start += 1) {
      if (s[start] !== '{') continue;
      startsTried += 1;
      if (startsTried > maxStartsToTry) break;

      let depth = 0;
      let inString = false;
      let escape = false;

      for (let i = start; i < s.length; i += 1) {
        const ch = s[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\\\') {
          if (inString) escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;

        if (ch === '{') depth += 1;
        if (ch === '}') depth -= 1;

        if (depth === 0) {
          return { start, end: i + 1, raw: s.slice(start, i + 1) };
        }
      }
    }

    return null as any;
  };

  // 1) Preferred format: <TOOL_CALL>{...}</TOOL_CALL>
  const tagMatch = text.match(/<TOOL_CALL>([\s\S]*?)<\/TOOL_CALL>/);
  if (tagMatch) {
    const rawJson = tagMatch[1].trim();
    const parsed = tryParseJson(rawJson);
    const inferred = inferToolCallFromParsed(parsed);
    if (!inferred) return { toolCall: null as any, cleanedText: text };
    return {
      toolCall: { name: inferred.name, args: inferred.args, id: `text-tool-${Date.now()}` },
      cleanedText: text.replace(tagMatch[0], '').trim(),
    };
  }

  // 2) Secondary format: fenced JSON block ```json { ... } ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();
    const parsed = tryParseJson(candidate);
    const inferred = inferToolCallFromParsed(parsed);
    if (inferred) {
      return {
        toolCall: { name: inferred.name, args: inferred.args, id: `text-tool-${Date.now()}` },
        cleanedText: text.replace(fenceMatch[0], '').trim(),
      };
    }
  }

  // 3) Last resort: whole message is a JSON object/array
  const trimmed = text.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    const parsed = tryParseJson(trimmed);
    const inferred = inferToolCallFromParsed(parsed);
    if (inferred) {
      return {
        toolCall: { name: inferred.name, args: inferred.args, id: `text-tool-${Date.now()}` },
        cleanedText: '',
      };
    }
  }

  // 4) Fallback: extract the first inline JSON object substring (handles "text ... {..} {..}" cases).
  const found = extractFirstJsonObjectSubstring(text);
  if (found?.raw) {
    const parsed = tryParseJson(found.raw);
    const inferred = inferToolCallFromParsed(parsed);
    if (inferred) {
      const cleanedText = (text.slice(0, found.start) + text.slice(found.end)).trim();
      return {
        toolCall: { name: inferred.name, args: inferred.args, id: `text-tool-${Date.now()}` },
        cleanedText,
      };
    }
  }

  return { toolCall: null as any, cleanedText: text };
};
