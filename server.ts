import express from 'express';
import cors from 'cors';
import handler from './api/norms';

const app = express();
const port = Number(process.env.API_PORT || 5000);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

app.all('/api/norms', async (req, res) => {
  console.log('API /api/norms called with method:', req.method);
  try {
    await handler(req, res);
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({ error: 'Internal API server error' });
  }
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});