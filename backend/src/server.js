import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

dotenv.config({
  path: path.resolve(currentDir, '..', '.env'),
});

const { default: app } = await import('./app.js');
const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`AT2 Transcriber API running on http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. Stop the other backend process or set a different PORT in backend/.env.`,
    );
    process.exit(1);
  }

  throw error;
});
