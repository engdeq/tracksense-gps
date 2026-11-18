import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, corsOrigins } from './config/env.js';
import { connectDatabase } from './config/database.js';
import './models/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initSocket } from './sockets/index.js';
import { startGpsTcpServer } from './protocols/gpsTcpServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  await connectDatabase();

  const app = express();
  const server = http.createServer(app);

  app.set('trust proxy', 1);
  // Allow admin-web (different origin) to display uploaded images in <img> tags
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '..', env.UPLOAD_DIR), {
      setHeaders(res) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'public, max-age=86400');
      },
    }),
  );
  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  initSocket(server);
  startGpsTcpServer();

  server.listen(env.PORT, () => {
    console.log(`TrackSense API running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start TrackSense API', err);
  process.exit(1);
});
