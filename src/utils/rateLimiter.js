const fs = require('fs-extra');
const path = require('path');

class RateLimiter {
  constructor(monthlyLimit) {
    this.monthlyLimit = monthlyLimit;
    this.dataFile = path.join(__dirname, '../../data/usage.json');
    this.ensureDataFile();
  }

  async ensureDataFile() {
    await fs.ensureDir(path.dirname(this.dataFile));
    if (!await fs.pathExists(this.dataFile)) {
      await fs.writeJson(this.dataFile, {});
    }
  }

  async getUsage(userId) {
    const data = await fs.readJson(this.dataFile);
    const month = new Date().toISOString().slice(0, 7);
    const key = `${userId}-${month}`;
    
    return {
      used: data[key] || 0,
      limit: this.monthlyLimit,
      remaining: this.monthlyLimit - (data[key] || 0),
      month
    };
  }

  async checkLimit(userId) {
    const usage = await this.getUsage(userId);
    return usage.remaining > 0;
  }

  async recordUsage(userId) {
    const data = await fs.readJson(this.dataFile);
    const month = new Date().toISOString().slice(0, 7);
    const key = `${userId}-${month}`;
    
    data[key] = (data[key] || 0) + 1;
    await fs.writeJson(this.dataFile, data);
  }

  async getRemainingCalls(userId) {
    const usage = await this.getUsage(userId);
    return usage.remaining;
  }
}

module.exports = RateLimiter;
