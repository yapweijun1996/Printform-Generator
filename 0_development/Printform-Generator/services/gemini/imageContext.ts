export type GeminiImageInputs = {
  reference?: { mimeType: string; data: string };
  preview?: { mimeType: string; data: string };
};

export const hasAnyImages = (images?: GeminiImageInputs) => Boolean(images?.reference || images?.preview);

export const pushLabeledImageParts = (messageParts: any[], images?: GeminiImageInputs) => {
  if (!images) return;

  if (images.reference) {
    messageParts.push({ text: '[IMAGE:REFERENCE] Target layout/style (用户参考图)' });
    messageParts.push({
      inlineData: {
        mimeType: images.reference.mimeType,
        data: images.reference.data,
      },
    });
  }

  if (images.preview) {
    messageParts.push({ text: '[IMAGE:CURRENT_PREVIEW] Latest preview snapshot (当前预览快照)' });
    messageParts.push({
      inlineData: {
        mimeType: images.preview.mimeType,
        data: images.preview.data,
      },
    });
  }
};

export const buildImageNote = (images?: GeminiImageInputs) => {
  const hasReferenceImage = Boolean(images?.reference);
  const hasPreviewImage = Boolean(images?.preview);

  return `
[IMAGE CONTEXT]
- Reference Image: ${hasReferenceImage ? 'Provided' : 'Not provided'} (target layout/style).
- Current Preview: ${hasPreviewImage ? 'Provided' : 'Not provided'} (latest snapshot after changes).
If BOTH are provided, you MUST compare them and report discrepancies as [VISUAL DIFF].
`;
};
