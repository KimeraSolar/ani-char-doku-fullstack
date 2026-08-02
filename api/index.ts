import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API rodando com sucesso no Vercel!' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[Dev] Server running on port: ${PORT}`);
  });
}

export default app;