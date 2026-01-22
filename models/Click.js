const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  button: {
    type: String,
    required: true,
    index: true
  },
  ip: {
    type: String,
    required: true,
    index: true
  },
  country: String,
  region: String,
  city: String,
  userAgent: String,
  page: String,
  referrer: String,
  sessionId: String,
  deviceType: String,
  browser: String,
  os: String,
  screenResolution: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for faster queries
clickSchema.index({ button: 1, timestamp: -1 });
clickSchema.index({ ip: 1, timestamp: -1 });
clickSchema.index({ country: 1, timestamp: -1 });

// Pre-save middleware to extract browser/device info
clickSchema.pre('save', function(next) {
  if (this.userAgent) {
    const ua = this.userAgent.toLowerCase();
    
    // Extract browser
    if (ua.includes('chrome')) this.browser = 'Chrome';
    else if (ua.includes('firefox')) this.browser = 'Firefox';
    else if (ua.includes('safari')) this.browser = 'Safari';
    else if (ua.includes('edge')) this.browser = 'Edge';
    else this.browser = 'Other';
    
    // Extract OS
    if (ua.includes('windows')) this.os = 'Windows';
    else if (ua.includes('mac os')) this.os = 'macOS';
    else if (ua.includes('linux')) this.os = 'Linux';
    else if (ua.includes('android')) this.os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone')) this.os = 'iOS';
    else this.os = 'Other';
    
    // Device type
    if (ua.includes('mobile')) this.deviceType = 'Mobile';
    else if (ua.includes('tablet')) this.deviceType = 'Tablet';
    else this.deviceType = 'Desktop';
  }
  
  next();
});

const Click = mongoose.model('Click', clickSchema);

module.exports = Click;