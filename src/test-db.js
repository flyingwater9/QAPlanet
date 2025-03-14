const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/qaplanet')
  .then(() => {
    console.log('成功连接到 MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB 连接错误:', err);
    process.exit(1);
  }); 