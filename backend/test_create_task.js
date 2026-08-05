const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Task = require('./models/Task');
const Project = require('./models/Project');

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  // Get first project
  const project = await Project.findOne();
  if (!project) {
    console.error("No project found in database.");
    process.exit(1);
  }

  console.log("Testing Task creation with Project ID:", project._id);

  try {
    const task = await Task.create({
      title: "Test Inline Task Creation",
      project: project._id,
      section: "General",
      assignedTo: null,
      dueDate: null,
      priority: "Medium",
      status: "Pending"
    });
    console.log("Task created successfully:", task);
  } catch (err) {
    console.error("Error creating task:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
