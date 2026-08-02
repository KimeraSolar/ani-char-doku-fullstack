import express, { Request, Response } from 'express';
import cors from 'cors';
import { apiRoutes } from './routes';

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({ origin: true, credentials: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running successfully!' });
});

// MAL API Proxy Routes
await apiRoutes(app);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[Dev] Server running on port: ${PORT}`);
  });
}

export default app;