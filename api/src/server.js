import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { notFound, errorHandler } from './utils/http.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import hospitalRoutes from './routes/hospital.js';
import donorRoutes from './routes/donor.js';
import bloodbankRoutes from './routes/bloodbank.js';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'YEDIAM NENE API' }));

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/bloodbank', bloodbankRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🩸 YEDIAM NENE API démarrée sur http://localhost:${config.port}`);
});