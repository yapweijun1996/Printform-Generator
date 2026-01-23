import { extractToolCallFromText } from './textToolCall';

describe('extractToolCallFromText', () => {
  it('parses <TOOL_CALL> wrapper', () => {
    const input = 'hello\n<TOOL_CALL>{"name":"manage_plan","args":{"action":"create_plan","tasks":["a"]}}</TOOL_CALL>';
    const { toolCall, cleanedText } = extractToolCallFromText(input);
    expect(toolCall?.name).toBe('manage_plan');
    expect(toolCall?.args?.action).toBe('create_plan');
    expect(cleanedText).toBe('hello');
  });

  it('infers manage_plan from plain JSON args', () => {
    const input = `{
      "action": "create_plan",
      "tasks": ["Step 1", "Step 2"]
    }`;
    const { toolCall, cleanedText } = extractToolCallFromText(input);
    expect(toolCall?.name).toBe('manage_plan');
    expect(toolCall?.args?.tasks?.length).toBe(2);
    expect(cleanedText).toBe('');
  });

  it('parses first inline JSON tool call and ignores trailing garbage', () => {
    const input =
      '[VISUAL DIFF]: something\n' +
      '{"name":"manage_plan","args":{"action":"mark_completed","task_index":2}} {"name":"manage_plan","args":{"action":"ma';
    const { toolCall, cleanedText } = extractToolCallFromText(input);
    expect(toolCall?.name).toBe('manage_plan');
    expect(toolCall?.args?.action).toBe('mark_completed');
    expect(toolCall?.args?.task_index).toBe(2);
    expect(cleanedText).toContain('[VISUAL DIFF]');
  });
});
