import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 创建 Express 实例
const app = express();

// 调试中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  next();
});

// 中间件
app.use(cors());
app.use(express.json());

// MongoDB 连接
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    console.log('Using cached database connection');
    return cachedDb;
  }

  console.log('Creating new database connection');
  const db = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  cachedDb = db;
  return db;
}

// 用户模型
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// 问答模型
const qaSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const QA = mongoose.models.QA || mongoose.model('QA', qaSchema);

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

// API 路由处理器
const handler = async (req, res) => {
  try {
    // 连接数据库
    await connectToDatabase();

    // 路由处理
    if (req.method === 'GET' && req.url === '/') {
      // 基础路由
      return res.json({
        message: 'QAPlanet API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          MONGODB_URI: process.env.MONGODB_URI ? '已设置' : '未设置',
          JWT_SECRET: process.env.JWT_SECRET ? '已设置' : '未设置'
        }
      });
    }

    // 用户注册
    if (req.method === 'POST' && req.url === '/api/users/register') {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 8);
      const user = new User({ username, password: hashedPassword });
      await user.save();
      return res.status(201).json({ success: true });
    }

    // 用户登录
    if (req.method === 'POST' && req.url === '/api/users/login') {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
      return res.json({ token });
    }

    // 获取问题列表
    if (req.method === 'GET' && req.url.startsWith('/api/qa/questions')) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const questions = await QA.find()
        .populate('userId', 'username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      const total = await QA.countDocuments();
      return res.json({
        questions,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      });
    }

    // 创建新问题
    if (req.method === 'POST' && req.url === '/api/qa/questions') {
      const { question, answer } = req.body;
      const qa = new QA({
        question,
        answer,
        userId: req.user._id
      });
      await qa.save();
      await qa.populate('userId', 'username');
      return res.status(201).json({ success: true, qa });
    }

    // 获取问题详情
    if (req.method === 'GET' && req.url === '/api/qa/questions/:id') {
      const qa = await QA.findById(req.params.id).populate('userId', 'username');
      if (!qa) {
        return res.status(404).json({ error: '问题不存在' });
      }
      return res.json({ qa });
    }

    // 删除问题
    if (req.method === 'DELETE' && req.url === '/api/qa/questions/:id') {
      const qa = await QA.findOne({ _id: req.params.id, userId: req.user._id });
      if (!qa) {
        return res.status(404).json({ error: '问题不存在或无权删除' });
      }
      await qa.deleteOne();
      return res.json({ success: true });
    }

    // 如果没有匹配的路由
    return res.status(404).json({ error: 'Not Found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// 将 Express 应用包装为 Vercel 函数
export default async function (req, res) {
  return handler(req, res);
} 