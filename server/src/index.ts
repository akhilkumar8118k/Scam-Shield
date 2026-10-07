import './config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import casesRoutes from './routes/cases';
import profileRoutes from './routes/profile';
import telegramRoutes from './routes/telegram';
import { errorHandler } from './middleware/error';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin.startsWith('http://localhost:') || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/telegram-webhook', telegramRoutes);

// Health check endpoint - revealing no credentials
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
