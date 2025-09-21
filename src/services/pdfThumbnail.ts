import fs from 'fs';
import path from 'path';
import { fromPath } from 'pdf2pic';

export async function generateThumbnail(pdfPath: string, outputName: string): Promise<string> {
  const outputDir = path.join(__dirname, '../../uploads/thumbnails');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const options = {
    density: 100,
    saveFilename: outputName,
    savePath: outputDir,
    format: 'png',
    width: 300,
    height: 400
  };
  const storeAsImage = fromPath(pdfPath, options);
  const pageToConvertAsImage = 1;
  const result = await storeAsImage(pageToConvertAsImage);
  return path.join('uploads/thumbnails', result.name ?? `${outputName}.png`);
}
