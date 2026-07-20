import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

dotenv.config({
  path: path.resolve(currentDir, '.env'),
});

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'at2_transcriber';

console.log('\n🧪 MongoDB Connection Test');
console.log('='.repeat(60));

if (!mongoUri) {
  console.error('❌ MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

// Sanitize URI for logging (hide password)
const sanitizedUri = mongoUri.replace(/:[^:]*@/, ':****@');
console.log(`📍 Testing connection to: ${sanitizedUri}`);
console.log(`📍 Database name: ${dbName}\n`);

const client = new MongoClient(mongoUri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 8000,
});

try {
  console.log('⏳ Connecting...');
  await client.connect();
  console.log('✅ Connected!\n');

  // Test admin command
  console.log('⏳ Running ping command...');
  const adminDb = client.db('admin');
  const pingResult = await adminDb.command({ ping: 1 });
  console.log('✅ Ping successful:', pingResult, '\n');

  // List databases
  console.log('⏳ Listing databases...');
  const databases = await adminDb.listDatabases();
  console.log(`✅ Found ${databases.databases.length} databases:`);
  databases.databases.forEach(db => console.log(`   - ${db.name}`));
  console.log();

  // Check target database
  const targetDb = client.db(dbName);
  console.log(`⏳ Checking database "${dbName}"...`);
  const collections = await targetDb.listCollections().toArray();
  console.log(`✅ Found ${collections.length} collections:`);
  collections.forEach(col => console.log(`   - ${col.name}`));
  console.log();

  console.log('='.repeat(60));
  console.log('✅ ALL TESTS PASSED - MongoDB is working correctly!');
  console.log('='.repeat(60));
  process.exit(0);
} catch (error) {
  console.error('\n❌ Connection Test FAILED\n');
  console.error('Error Type:', error.name);
  console.error('Error Message:', error.message);
  console.error();

  if (error.message.includes('authentication failed')) {
    console.error('⚠️  Authentication Issue:');
    console.error('   - Check your username and password in MONGODB_URI');
    console.error('   - Make sure special characters are URL-encoded');
  } else if (error.message.includes('connect ENOTFOUND') || error.message.includes('getaddrinfo')) {
    console.error('⚠️  Connection Issue:');
    console.error('   - Check your cluster URL is correct');
    console.error('   - Make sure your computer is in the MongoDB Atlas IP whitelist');
  } else if (error.message.includes('TIMEOUT') || error.message.includes('timed out')) {
    console.error('⚠️  Timeout Issue:');
    console.error('   - Check if your firewall is blocking the connection');
    console.error('   - Verify the MongoDB Atlas cluster is running');
    console.error('   - Check your network connection');
  }

  console.error();
  console.error('Full error:');
  console.error(error);
  console.error();
  console.error('Troubleshooting steps:');
  console.error('1. Visit MongoDB Atlas dashboard (mongodb.com/atlas)');
  console.error('2. Go to your cluster -> Network Access');
  console.error('3. Add your current IP address (find it at whatismyip.com)');
  console.error('4. Or click "Allow Access From Anywhere" for testing (0.0.0.0/0)');
  console.error('5. Go to Database Access and verify username/password');
  console.error();
  process.exit(1);
} finally {
  await client.close();
  console.log('Connection closed.');
}
