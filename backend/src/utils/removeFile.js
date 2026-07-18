import fs from 'node:fs/promises';

export async function removeFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Unable to remove uploaded file: ${filePath}`);
    }
  }
}
