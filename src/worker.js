import { Router } from 'itty-router';
import { MongoClient } from 'mongodb';

// 创建路由器
const router = Router();

// MongoDB连接客户端
let client = null;

// 连接到MongoDB
const connectDB = async (env) => {
  try {
    if (!client) {
      client = new MongoClient(env.MONGODB_URI);
      await client.connect();
      console.log('MongoDB connected successfully');
    }
    return client.db('qaplanet');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// 验证JWT token
const verifyToken = async (request, env) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('未提供认证token');
  }

  const token = authHeader.split(' ')[1];
  try {
    // 在这里添加JWT验证逻辑
    // const decoded = jwt.verify(token, env.JWT_SECRET);
    // return decoded;
    return { _id: 'test-user-id' }; // 临时返回测试用户ID
  } catch (error) {
    throw new Error('无效的token');
  }
};

// 基础路由
router.get('/', () => new Response('QAPlanet API is running'));

// API路由
router.all('/api/*', async (request, env) => {
  // 处理CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // 连接数据库
    const db = await connectDB(env);

    // 用户相关路由
    if (path.startsWith('/api/users')) {
      if (path === '/api/users/register' && request.method === 'POST') {
        const data = await request.json();
        // 处理用户注册
        const result = await db.collection('users').insertOne({
          username: data.username,
          password: data.password, // 注意：实际应用中需要加密
          createdAt: new Date()
        });
        return new Response(JSON.stringify({ success: true, userId: result.insertedId }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/users/login' && request.method === 'POST') {
        const data = await request.json();
        // 处理用户登录
        const user = await db.collection('users').findOne({ username: data.username });
        if (user && user.password === data.password) { // 注意：实际应用中需要验证加密密码
          return new Response(JSON.stringify({ token: 'test-token' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 问答相关路由
    if (path.startsWith('/api/qa')) {
      if (path === '/api/qa/questions' && request.method === 'GET') {
        // 获取问题列表
        const questions = await db.collection('questions')
          .find()
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();
        return new Response(JSON.stringify({ questions }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/qa/questions' && request.method === 'POST') {
        // 验证用户token
        const user = await verifyToken(request, env);
        const data = await request.json();
        
        // 创建新问题
        const result = await db.collection('questions').insertOne({
          question: data.question,
          answer: data.answer,
          userId: user._id,
          createdAt: new Date()
        });

        return new Response(JSON.stringify({ 
          success: true, 
          questionId: result.insertedId 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (path.match(/^\/api\/qa\/questions\/\w+$/) && request.method === 'GET') {
        // 获取单个问题详情
        const id = path.split('/').pop();
        const question = await db.collection('questions').findOne({ _id: id });
        
        if (!question) {
          return new Response(JSON.stringify({ error: '问题不存在' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ question }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 如果没有匹配的路由
    return new Response('API endpoint not found', {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// 导出fetch处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      // 添加CORS头
      const response = await router.handle(request, env);
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    } catch (error) {
      console.error('Server Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
}; 