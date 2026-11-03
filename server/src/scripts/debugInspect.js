const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const TechnicianProfile = require('../models/TechnicianProfile');
const TechnicianDocument = require('../models/TechnicianDocument');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const users = await User.find({}).lean();
  console.log('USERS_COUNT:', users.length);
  for (const u of users) {
    console.log('USER:', u._id.toString(), u.email, u.role, u.name);
  }

  const profiles = await TechnicianProfile.find({}).lean();
  console.log('PROFILES_COUNT:', profiles.length);
  for (const p of profiles) {
    console.log('PROFILE:', p._id.toString(), 'user:', p.user ? p.user.toString() : 'NONE', 'status:', p.verificationStatus);
  }

  const docs = await TechnicianDocument.find({}).lean();
  console.log('DOCS_COUNT:', docs.length);
  for (const d of docs) {
    console.log('DOC:', d._id.toString(), 'tech:', d.technician.toString(), d.originalName, d.filePath);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});
