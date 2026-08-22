const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    console.log("Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Reconnecting when network is available...");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected successfully.");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB runtime connection error:", err.message);
});

module.exports = connectDB;