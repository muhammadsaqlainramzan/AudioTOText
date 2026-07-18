import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import assistantRoutes from './routes/assistant.routes.js';
import healthRoutes from './routes/health.routes.js';
import languageRoutes from './routes/language.routes.js';
import transcriptionRoutes from './routes/transcription.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    exposedHeaders: ['Content-Disposition'],
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'));
    },
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/health', healthRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/transcriptions', transcriptionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
