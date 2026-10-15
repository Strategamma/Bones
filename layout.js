export function canvasGeometry(width, height, pixelRatio = 1) {
  const ratio = Math.min(Math.max(pixelRatio || 1, 1), 2);
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  const scale = pixelWidth / 390;
  const verticalScale = Math.min(scale, ratio * 1.15);
  return { pixelWidth, pixelHeight, scale, verticalScale, logicalHeight: pixelHeight / verticalScale };
}
