const cors = require('cors');

// Dynamic origin function
const originFunction = (origin, callback) => {
  // Allow all origins in development
  if (process.env.NODE_ENV === 'development') {
    return callback(null, true);
  }

  // Production: Check against allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

  // Allow requests with no origin (like server-to-server or curl)
  if (!origin) {
    return callback(null, true);
  }

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    return callback(null, true);
  }

  // Origin not allowed
  console.error(`CORS Blocked: ${origin} | Allowed: ${allowedOrigins.join(', ')}`);
  return callback(new Error('Not allowed by CORS'), false);
};

// CORS configuration
const corsOptions = {
  origin: originFunction,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Session-ID'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range'
  ],
  maxAge: 600, // 10 minutes
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);