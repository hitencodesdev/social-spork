const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 1000,
      connectTimeoutMS: 1000
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    console.warn(`[Database Warning] Could not connect to MongoDB at ${config.MONGODB_URI} (${error.message}).`);
    console.warn(`[Database] Operating in Standalone Resilient Mode. Set MONGODB_URI in .env to connect to live MongoDB or MongoDB Atlas.`);
    isConnected = false;
    return false;
  }
};

const getDBStatus = () => ({
  connected: isConnected,
  uri: config.MONGODB_URI
});

module.exports = {
  connectDB,
  getDBStatus
};
