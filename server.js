//import express from 'express';
const express = require('express');

//import mongoose from 'mongoose';
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
//const passport = require('passport');
//const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors()); 
// MongoDB connection
mongoose.connect('mongodb://localhost:27017/internassign', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
//const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  googleId: { type: String }
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Models
const BoardSchema = new mongoose.Schema({
  name: String,
});

const TaskSchema = new mongoose.Schema({
  boardId: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
});

/*const Board = mongoose.model('Board', BoardSchema);
const Task = mongoose.model('Task', TaskSchema);*/

const User = mongoose.model('User', UserSchema);


const Board = mongoose.model('Board', BoardSchema);
const Task = mongoose.model('Task', TaskSchema);

// Routes

// Board Routes
app.get('/boards', async (req, res) => {
  const boards = await Board.find();
  res.json(boards);
});

app.post('/boards', async (req, res) => {
  const board = new Board(req.body);
  await board.save();
  res.json(board);
});

app.put('/boards/:id', async (req, res) => {
  const board = await Board.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(board);
});

app.delete('/boards/:id', async (req, res) => {
  await Board.findByIdAndDelete(req.params.id);
  res.json({ message: 'Board deleted' });
});

// Task Routes
app.get('/boards/:boardId/tasks', async (req, res) => {
  const tasks = await Task.find({ boardId: req.params.boardId });
  res.json(tasks);
});

app.post('/boards/:boardId/tasks', async (req, res) => {
  const task = new Task({ ...req.body, boardId: req.params.boardId });
  await task.save();
  res.json(task);
});

app.put('/tasks/:id', async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(task);
});

app.delete('/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Task deleted' });
});



// Register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    user = new User({ name, email, password });
    await user.save();
    const payload = { user: { id: user.id } };
    jwt.sign(payload, 'secret', { expiresIn: 360000 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const payload = { user: { id: user.id } };
    jwt.sign(payload, 'secret', { expiresIn: 360000 }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
app.get('/user', async (req, res) => {
  const { email } = req.query;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user details
    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
