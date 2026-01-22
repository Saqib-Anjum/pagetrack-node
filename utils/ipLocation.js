const axios = require('axios');

class IPLocationService {
  constructor() {
    this.services = [
      {
        name: 'ip-api',
        url: 'http://ip-api.com/json/',
        mapper: (data) => ({
          ip: data.query,
          country: data.country,
          region: data.regionName,
          city: data.city,
          isp: data.isp,
          lat: data.lat,
          lon: data.lon
        })
      },
      {
        name: 'ipapi.co',
        url: 'https://ipapi.co/json/',
        mapper: (data) => ({
          ip: data.ip,
          country: data.country_name,
          region: data.region,
          city: data.city,
          isp: data.org,
          lat: data.latitude,
          lon: data.longitude
        })
      }
    ];
  }

  async getLocation(ip = '') {
    for (const service of this.services) {
      try {
        const url = ip ? `${service.url}${ip}` : service.url;
        const response = await axios.get(url, { timeout: 5000 });
        
        if (response.status === 200) {
          return {
            success: true,
            service: service.name,
            ...service.mapper(response.data)
          };
        }
      } catch (error) {
        console.log(`Service ${service.name} failed:`, error.message);
        continue;
      }
    }
    
    return {
      success: false,
      ip: ip || 'Unknown',
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown'
    };
  }
  
  // Get location without IP (for current request)
  async getCurrentLocation(req) {
    // Get IP from request
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.ip ||
               'Unknown';
    
    // Clean IP (remove port if present)
    const cleanIp = ip.split(':').slice(-1)[0];
    
    return await this.getLocation(cleanIp);
  }
}

module.exports = new IPLocationService();