const serverCode = require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI =  'mongodb://root:T7AkqzEHcG3jte7rrUlUQBLbpEfMnBwaQEdxYZfymmxX7ctSg3JucIu9Wfz3foK9@72.62.243.102:5432/?directConnection=true';
const API_KEY = process.env.API_KEY || '';

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.use(morgan('tiny'));

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('Mongo connect error', err.message);
    process.exit(1);
  });

const ClickSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  button: String,
  page: String,
  referrer: String,
  userAgent: String,
  sessionId: String,
  screenResolution: String,
  metadata: mongoose.Schema.Types.Mixed,
  raw: mongoose.Schema.Types.Mixed
});

const Click = mongoose.model('Click', ClickSchema);

function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (key && key === API_KEY) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const limiter = rateLimit({ windowMs: 10 * 1000, max: 60 });

app.post('/api/clicks/track', async (req, res) => {
  try {
    const payload = req.body || {};
    const c = new Click({
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      button: payload.button || 'unknown',
      page: payload.page || req.headers.referer || 'unknown',
      referrer: payload.referrer || req.headers.referer || null,
      userAgent: payload.userAgent || req.headers['user-agent'] || null,
      sessionId: payload.sessionId || null,
      screenResolution: payload.screenResolution || null,
      metadata: payload.metadata || {},
      raw: payload
    });
    const saved = await c.save();
    res.json({ success: true, data: saved });
  } catch (err) {
    console.error('track error', err);
    res.status(500).json({ success: false, error: 'Save failed' });
  }
});

app.get('/api/clicks', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 5000);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const filter = {}; if (req.query.sessionId) filter.sessionId = req.query.sessionId;
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
    }
    const docs = await Click.find(filter).sort({ timestamp: -1 }).skip((page-1)*limit).limit(limit).lean().exec();
    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    console.error('list error', err);
    res.status(500).json({ success: false, error: 'Fetch failed' });
  }
});

app.listen(PORT, () => console.log('🚀 API listening on', PORT));

