import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Successfully connected to MongoDB!');
    
    // 创建一个测试集合
    const Test = mongoose.model('Test', new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now }
    }));
    
    // 插入测试数据
    const testDoc = new Test({ name: 'test_connection' });
    await testDoc.save();
    console.log('Successfully inserted test document!');
    
    // 查询测试数据
    const result = await Test.findOne({ name: 'test_connection' });
    console.log('Test document found:', result);
    
    // 清理测试数据
    await Test.deleteOne({ name: 'test_connection' });
    console.log('Test document cleaned up');
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testConnection(); 