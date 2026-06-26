const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected && mongoose.connection.readyState === 1) {
      console.log("✅ MongoDB already connected");
      return;
    }

    const uri = process.env.MONGODB_URI;   // ✅ FIXED

    console.log("MONGODB_URI exists:", !!uri);

    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set!");
    }

    // reset connection if needed
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoose.set("bufferCommands", false);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
    });

    isConnected = true;

    console.log("✅ MongoDB connected:", conn.connection.host);

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDB;