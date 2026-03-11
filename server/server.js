const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pillimarket';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
const pollsRouter = require('./routes/polls');
app.use('/api/polls', pollsRouter);

// Serve frontend for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// Connect to MongoDB then start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Pillimarket running at http://localhost:${PORT}`);
    });
  })
  .catch(async err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Starting in-memory DB (data will not persist)...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('✅ Connected to In-Memory MongoDB Fallback');
      app.listen(PORT, () => {
        console.log(`🚀 Pillimarket running at http://localhost:${PORT}`);
      });
    } catch (memErr) {
      console.error('❌ Failed to start in-memory DB:', memErr.message);
    }
  });
