const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Replace with your actual MongoDB connection string
const MONGO_URI = 'mongodb+srv://pushpam:Pushpam009@cluster0.pzavdug.mongodb.net/distributionDB?retryWrites=true&w=majority&appName=Cluster0';

const User = require('./models/User');

async function createAdmin() {
  await mongoose.connect(MONGO_URI);

  const mobile = '7033021791';
  const plainPassword = '123'; // You can change this to any password you want
  const name = 'Admin';

  const hash = await bcrypt.hash(plainPassword, 10);

  // Upsert admin user
  const result = await User.findOneAndUpdate(
    { mobile },
    {
      mobile,
      password: hash,
      role: 'admin',
      name,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  console.log('Admin user created/updated:', result);

  await mongoose.disconnect();
}

createAdmin();
