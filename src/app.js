// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import episodeRoutes from './routes/episodeRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create jobs directory if it doesn't exist
const jobsDir = path.join(__dirname, '..', 'jobs');
const tmpDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(jobsDir)) {
  fs.mkdirSync(jobsDir, { recursive: true });
}
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.use('/api', episodeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
