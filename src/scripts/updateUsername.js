const mongoose = require('mongoose');
const User = require('../models/user');

async function updateUsername() {
    try {
        // 连接数据库
        await mongoose.connect('mongodb://localhost:27017/qaplanet', {});
        console.log('MongoDB connected');

        // 更新用户名
        const result = await User.updateOne(
            { username: 'aaa' },
            { $set: { username: 'flying_water' } }
        );

        console.log('更新结果:', result);

        if (result.matchedCount === 0) {
            console.log('未找到用户名为 "aaa" 的用户');
        } else if (result.modifiedCount === 1) {
            console.log('用户名已成功更新为 "flying_water"');
        }

    } catch (error) {
        console.error('更新失败:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
    }
}

updateUsername(); 