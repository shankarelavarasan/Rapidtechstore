const express = require('express');
const app = express();
const PORT = 3010;

app.get('/', (req, res) => {
  res.json({ message: 'Simple server is working!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
});