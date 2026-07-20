import dns from 'node:dns';
import { MongoClient } from 'mongodb';
import AppError from '../utils/AppError.js';

let clientPromise = null;
let indexPromise = null;

function configureSrvDns() {
  const uri = process.env.MONGODB_URI || '';
  if (!uri.startsWith('mongodb+srv://')) return;

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('🔎 Fallback DNS servers configured for MongoDB SRV lookup');
  } catch (error) {
    console.warn('⚠️ Failed to configure fallback DNS servers for MongoDB SRV lookup:', error.message);
  }
}

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'at2_transcriber';
  
  if (uri) {
    console.log(`📍 MongoDB Config: dbName="${dbName}"`);
    // Log URI without credentials for security
    const sanitizedUri = uri.replace(/:[^:]*@/, ':****@');
    console.log(`📍 MongoDB URI: ${sanitizedUri}`);
  }
  
  return {
    uri,
    dbName,
  };
}

export function hasMongoConfig() {
  return Boolean(process.env.MONGODB_URI);
}

export async function getMongoClient() {
  const { uri } = getMongoConfig();

  if (!uri) {
    throw new AppError('MongoDB is not configured. Add MONGODB_URI to backend/.env.', 503);
  }

  if (!clientPromise) {
    configureSrvDns();
    console.log('🔌 Connecting to MongoDB...');
    const client = new MongoClient(uri, {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 8000),
    });

    clientPromise = client.connect()
      .then(() => {
        console.log('✅ MongoDB client connected');
        return client;
      })
      .catch((error) => {
        clientPromise = null;
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
      });
  }

  return clientPromise;
}

export async function getDatabase() {
  const client = await getMongoClient();
  const { dbName } = getMongoConfig();

  return client.db(dbName);
}

export async function getUsersCollection() {
  const db = await getDatabase();
  return db.collection('users');
}

export async function getSessionsCollection() {
  const db = await getDatabase();
  return db.collection('sessions');
}

export async function ensureDatabaseIndexes() {
  if (indexPromise) return indexPromise;

  indexPromise = Promise.all([
    getUsersCollection().then((users) =>
      Promise.all([
        users.createIndex({ googleId: 1 }, { unique: true, sparse: true }),
        users.createIndex({ email: 1 }, { unique: true }),
        users.createIndex({ provider: 1, lastLoginAt: -1 }),
      ]),
    ),
    getSessionsCollection().then((sessions) =>
      Promise.all([
        sessions.createIndex({ tokenHash: 1 }, { unique: true }),
        sessions.createIndex({ userId: 1 }),
        sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]),
    ),
  ]).catch((error) => {
    indexPromise = null;
    throw error;
  });

  return indexPromise;
}
