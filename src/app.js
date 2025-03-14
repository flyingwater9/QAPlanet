import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// 用户模型
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 问答模型
const qaSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const QA = mongoose.model('QA', qaSchema);

// 验证token中间件
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded._id };
    next();
  } catch (error) {
    res.status(401).json({ error: '请先登录' });
  }
};

// 基础路由
app.get('/', (req, res) => {
  res.json({ message: 'QAPlanet API is running' });
});

// 用户注册
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 用户登录
app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('用户名或密码错误');
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// 获取问题列表
app.get('/api/qa/questions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const questions = await QA.find()
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await QA.countDocuments();
    res.json({
      questions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新问题
app.post('/api/qa/questions', auth, async (req, res) => {
  try {
    const { question, answer } = req.body;
    const qa = new QA({
      question,
      answer,
      userId: req.user._id
    });
    await qa.save();
    await qa.populate('userId', 'username');
    res.status(201).json({ success: true, qa });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取问题详情
app.get('/api/qa/questions/:id', async (req, res) => {
  try {
    const qa = await QA.findById(req.params.id).populate('userId', 'username');
    if (!qa) {
      return res.status(404).json({ error: '问题不存在' });
    }
    res.json({ qa });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除问题
app.delete('/api/qa/questions/:id', auth, async (req, res) => {
  try {
    const qa = await QA.findOne({ _id: req.params.id, userId: req.user._id });
    if (!qa) {
      return res.status(404).json({ error: '问题不存在或无权删除' });
    }
    await qa.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// 导出 app 以供 Vercel 使用
export default app;
