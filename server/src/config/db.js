const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dispatchly';

  try {
    console.log(`[DB] Attempting connection to MongoDB at: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('[DB] Successfully connected to MongoDB');
  } catch (err) {
    console.warn(`[DB] Warning: Could not connect to MongoDB at ${uri} (${err.message}).`);
    console.warn('[DB] Operating in mock-resilient mode. Please ensure MongoDB is running for persistent storage.');
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[DB] Disconnected from MongoDB');
    }
  } catch (err) {
    console.error('[DB] Error during disconnect:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
