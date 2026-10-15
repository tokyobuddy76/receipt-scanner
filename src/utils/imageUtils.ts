import heic2any from 'heic2any';

export async function fileToDataUrl(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  let processedBlob: Blob = file;
  let mimeType = file.type;

  // Check if it's HEIC or HEIF format
  const isHeic =
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif';

  if (isHeic) {
    try {
      const conversionResult = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      });
      processedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
      mimeType = 'image/jpeg';
    } catch (e) {
      console.warn('HEIC conversion failed or skipped, trying direct read:', e);
    }
  }

  // If MIME type is missing, infer from file extension
  if (!mimeType) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'webp') mimeType = 'image/webp';
    else mimeType = 'image/jpeg';
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        mimeType,
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(processedBlob);
  });
}
