const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

async function run() {
  await connectDB();
  const users = await User.find({}).limit(5);
  console.log("USERS:");
  users.forEach(u => console.log(`Role: ${u.role}, Email: ${u.email}, Name: ${u.name}`));
  mongoose.connection.close();
}

run();
