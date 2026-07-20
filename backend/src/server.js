import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

dotenv.config({
  path: path.resolve(currentDir, '..', '.env'),
});

// Test MongoDB connection before starting the server
console.log('⏳ Testing MongoDB connection...');
try {
  const { getMongoClient } = await import('./services/database.service.js');
  const client = await getMongoClient();
  await client.db('admin').command({ ping: 1 });
  console.log('✅ MongoDB connected successfully!');
} catch (error) {
  console.error('❌ MongoDB connection FAILED:');
  console.error('Error:', error.message);
  console.error('Make sure:');
  console.error('1. MONGODB_URI is set correctly in backend/.env');
  console.error('2. Your MongoDB Atlas IP whitelist includes your computer IP');
  console.error('3. Your MongoDB Atlas credentials are correct');
  process.exit(1);
}

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
