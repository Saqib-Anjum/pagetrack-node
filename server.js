// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// require('dotenv').config();

// const clickRoutes = require('./routes/clicks');

// const app = express();

// // Security middleware
// app.use(helmet());

// // CORS configuration
// app.use(cors({
//   origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
//   credentials: true,
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/clicks', limiter);

// // Body parsing middleware
// app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use('/api/clicks', clickRoutes);

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime()
//   });
// });

// // Handle preflight requests
// app.options('*', cors());

// // Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => {
//   console.log('✅ Connected to MongoDB');
  
//   // Start server
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//   });
// })
// .catch(err => {
//   console.error('❌ MongoDB connection error:', err);
//   process.exit(1);
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('🔥 Error:', err.stack);
//   res.status(500).json({
//     success: false,
//     message: 'Something went wrong!',
//     error: process.env.NODE_ENV === 'development' ? err.message : undefined
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   });
// });

// module.exports = app;




/* const express = require('express');
const mongoose = require('mongoose');
const cors = require('./middleware/cors'); // Custom CORS
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const clickRoutes = require('./routes/clicks');

const app = express();

// 1. Security headers
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" },
//   crossOriginEmbedderPolicy: false
// }));

// 2. CORS - Must be before routes
app.use(cors);

// 3. Handle preflight globally
app.options('*', cors);

// 4. Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 5. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});
app.use('/api/', limiter);

// 6. Routes
app.use('/api/clicks', clickRoutes);

// 7. Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Click Tracker API',
    version: '1.0.0',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 8. Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

// 9. Error handling
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS: Origin not allowed'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 10. Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app; */




/*
Simple Clicks API (index.js)

Includes:
- POST /api/clicks/track     => save a click (expects JSON click payload)
- GET  /api/clicks           => list / download clicks (supports ?limit&page&startDate&endDate&sessionId&sortBy)
- GET  /api/clicks/stats     => basic aggregation stats (counts by button, top pages, daily counts)
- GET  /health               => health check

Quick setup:
1. Create a project folder and save this file as `index.js`.
2. Create `.env` with these values (example below):

   MONGO_URI=mongodb://localhost:27017/clicksdb
   PORT=3000
   API_KEY=supersecretapikey

3. Install deps:
   npm init -y
   npm install express mongoose cors helmet morgan dotenv express-rate-limit

4. Run:
   node index.js

You can run behind PM2 / systemd or containerize for production.

This file intentionally keeps validation light to remain flexible. Add stricter validation in production.
*/

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:T7AkqzEHcG3jte7rrUlUQBLbpEfMnBwaQEdxYZfymmxX7ctSg3JucIu9Wfz3foK9@72.62.243.102:5432/?directConnection=true';
const API_KEY = process.env.API_KEY || '';

// Basic middlewares
// app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cors());
// app.use(morgan('tiny'));

// Rate limiter for write endpoints
const writeLimiter = rateLimit({
  windowMs: 10 * 1000, // 10s
  max: 50,
  message: { success: false, error: 'Too many requests' }
});

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Schema
const ClickSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  button: { type: String, index: true },
  page: { type: String, index: true },
  referrer: String,
  userAgent: String,
  sessionId: { type: String, index: true },
  screenResolution: String,
  metadata: { type: mongoose.Schema.Types.Mixed },
  raw: { type: mongoose.Schema.Types.Mixed }
}, { strict: false });

// Keep small indexes for common queries
ClickSchema.index({ timestamp: -1 });

const Click = mongoose.model('Click', ClickSchema);

// Simple API key middleware (optional)
function requireApiKey(req, res, next) {
  if (!API_KEY) return next(); // no key configured -> allow
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (key && key === API_KEY) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Track endpoint
app.post('/api/clicks/track', async (req, res) => {
  try {
    // Accept payload as-is; merge some fields into 'raw' for debugging
    const payload = req.body || {};

    // Basic normalization
    const click = new Click({
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      button: payload.button || payload.name || 'unknown',
      page: payload.page || req.body.page || req.headers.referer || 'unknown',
      referrer: payload.referrer || req.headers.referer || null,
      userAgent: payload.userAgent || req.headers['user-agent'] || null,
      sessionId: payload.sessionId || null,
      screenResolution: payload.screenResolution || null,
      metadata: payload.metadata || {},
      raw: payload
    });

    const saved = await click.save();
    res.json({ success: true, data: saved });
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({ success: false, error: 'Failed to save click' });
  }
});

// List / download clicks
// Example: GET /api/clicks?limit=1000&page=1&startDate=2025-01-01&endDate=2025-02-01&sessionId=abc
app.get('/api/clicks', requireApiKey, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 5000);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const sortBy = req.query.sortBy || 'timestamp';
    const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

    const filter = {};
    if (req.query.sessionId) filter.sessionId = req.query.sessionId;
    if (req.query.button) filter.button = req.query.button;
    if (req.query.pageUrl) filter.page = req.query.pageUrl;
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
    }

    const docs = await Click.find(filter)
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch clicks' });
  }
});

// Statistics endpoint
app.get('/api/clicks/stats', requireApiKey, async (req, res) => {
  try {
    // Basic aggregations: total count, top buttons, top pages, clicks per day (last 30 days)
    const total = await Click.countDocuments();

    const topButtons = await Click.aggregate([
      { $group: { _id: '$button', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const topPages = await Click.aggregate([
      { $group: { _id: '$page', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // clicks per day for last N days
    const days = parseInt(req.query.days, 10) || 30;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const perDay = await Click.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } } },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: { total, topButtons, topPages, perDay } });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to compute stats' });
  }
});

// Simple admin route to delete old clicks (protected by API key)
app.delete('/api/clicks', requireApiKey, async (req, res) => {
  try {
    // Use with care: ?before=2025-01-01
    if (!req.query.before) return res.status(400).json({ success: false, error: 'missing before query' });
    const before = new Date(req.query.before);
    const result = await Click.deleteMany({ timestamp: { $lt: before } });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

// Fallback
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Clicks API listening on port ${PORT}`);
});
