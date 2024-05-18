require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const BASE_URL = process.env.BASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use(cors()); 

// MongoDB connection
mongoose.connect(DATABASE_URL, {
  tls: true,
  tlsAllowInvalidCertificates: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  if (err.cause) {
    console.error('Error cause:', err.cause);
  }
});
//mongoose.connect(DATABASE_URL).then(() => console.log('MongoDB connected')).catch(err => console.log(err));
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

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
    res.json({ msg: 'User registered successfully' });
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
    res.json({ msg: 'Login successful' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

app.get('/user', async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on ${BASE_URL}`);
});
