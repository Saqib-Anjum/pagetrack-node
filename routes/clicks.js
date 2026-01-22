
const express = require('express');
const router = express.Router();
const Click = require('../models/Click');
const ipLocation = require('../utils/ipLocation');

// Middleware to validate API key (optional)
// const validateApiKey = (req, res, next) => {
//   const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
//   if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
//     return res.status(401).json({
//       success: false,
//       message: 'Invalid API key'
//     });
//   }
  
//   next();
// };

// Track a click
router.post('/track', async (req, res) => {
  try {
    const { button, page, referrer, userAgent, sessionId, metadata } = req.body;
    
    if (!button) {
      return res.status(400).json({
        success: false,
        message: 'Button name is required'
      });
    }
    
    // Get location data
    const location = await ipLocation.getCurrentLocation(req);
    
    // Create click record
    const click = new Click({
      button,
      ip: location.ip,
      country: location.country,
      region: location.region,
      city: location.city,
      page: page || req.headers.referer || 'Unknown',
      referrer: referrer || req.headers.referer || 'Unknown',
      userAgent: userAgent || req.headers['user-agent'] || 'Unknown',
      sessionId: sessionId || req.headers['x-session-id'] || null,
      screenResolution: req.body.screenResolution || 'Unknown',
      metadata: metadata || {}
    });
    
    // Save to database
    await click.save();
    
    res.status(201).json({
      success: true,
      message: 'Click tracked successfully',
      data: {
        id: click._id,
        timestamp: click.timestamp,
        button: click.button,
        location: `${click.city}, ${click.region}, ${click.country}`
      }
    });
    
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all clicks (with pagination and filtering)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      button, 
      startDate, 
      endDate,
      country,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter
    const filter = {};
    
    if (button) filter.button = button;
    if (country) filter.country = country;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const clicks = await Click.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    
    const total = await Click.countDocuments(filter);
    
    res.json({
      success: true,
      data: clicks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching clicks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clicks'
    });
  }
});

// Get click statistics
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    // Aggregate statistics
    const stats = await Click.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: 1 },
          uniqueIPs: { $addToSet: "$ip" },
          buttons: { $addToSet: "$button" }
        }
      },
      {
        $project: {
          totalClicks: 1,
          uniqueIPs: { $size: "$uniqueIPs" },
          uniqueButtons: { $size: "$buttons" }
        }
      }
    ]);
    
    // Get top buttons
    const topButtons = await Click.aggregate([
      { $match: filter },
      { $group: { _id: "$button", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get top countries
    const topCountries = await Click.aggregate([
      { $match: { ...filter, country: { $ne: "Unknown" } } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      data: {
        summary: stats[0] || { totalClicks: 0, uniqueIPs: 0, uniqueButtons: 0 },
        topButtons,
        topCountries
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Get click by ID
router.get('/:id', async (req, res) => {
  try {
    const click = await Click.findById(req.params.id).select('-__v');
    
    if (!click) {
      return res.status(404).json({
        success: false,
        message: 'Click not found'
      });
    }
    
    res.json({
      success: true,
      data: click
    });
    
  } catch (error) {
    console.error('Error fetching click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch click'
    });
  }
});

// Delete click by ID
router.delete('/:id', async (req, res) => {
  try {
    const click = await Click.findByIdAndDelete(req.params.id);
    
    if (!click) {
      return res.status(404).json({
        success: false,
        message: 'Click not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Click deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete click'
    });
  }
});

module.exports = router;