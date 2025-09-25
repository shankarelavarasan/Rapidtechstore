import express from 'express';
import dotenv from 'dotenv';

console.log('Starting minimal TypeScript server...');

// Load environment variables
dotenv.config();
console.log('Environment loaded');

const app = express();
const PORT = process.env.PORT || 3010;

console.log('Express app created');

app.get('/', (req, res) => {
  res.json({ message: 'Minimal TypeScript server is working!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

console.log('Routes configured');

app.listen(PORT, () => {
  console.log(`Minimal TypeScript server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});