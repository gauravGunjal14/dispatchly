const mongoose = require('mongoose');
const { redactSecrets, parseSafeDbTarget } = require('../utils/redact');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dispatchly';
  const { host, database } = parseSafeDbTarget(uri);

  try {
    console.log(`[DB] Connecting to cluster host ${host}, database ${database}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    const connectedHost = mongoose.connection.host || host;
    const connectedDb = mongoose.connection.db?.databaseName || mongoose.connection.name || database;
    console.log(`[DB] Connected to cluster host ${connectedHost}, database ${connectedDb}`);
  } catch (err) {
    console.warn(
      `[DB] Warning: Could not connect to cluster host ${host}, database ${database} (${redactSecrets(err)}).`
    );
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
    console.error('[DB] Error during disconnect:', redactSecrets(err));
  }
};

module.exports = { connectDB, disconnectDB };
