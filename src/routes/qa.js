const express = require('express');
const router = express.Router();
const QA = require('../models/qa');
const auth = require('../middleware/auth');
const fetch = require('node-fetch');

// 获取所有问题
router.get('/questions', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const questions = await QA.find()
            .populate('user', 'username avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await QA.countDocuments();

        res.json({
            success: true,
            questions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 创建新问题
router.post('/questions', auth, async (req, res) => {
    try {
        const { question, answer, tags, aiModel } = req.body;
        const qa = new QA({
            question,
            answer,
            tags,
            aiModel,
            user: req.user._id
        });

        await qa.save();
        await qa.populate('user', 'username avatar');

        res.status(201).json({
            success: true,
            qa
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 获取问题详情
router.get('/questions/:id', async (req, res) => {
    try {
        const qa = await QA.findById(req.params.id)
            .populate('user', 'username avatar')
            .populate({
                path: 'comments.user',
                select: 'username avatar'
            });

        if (!qa) {
            return res.status(404).json({
                success: false,
                message: '问题不存在'
            });
        }

        // 增加浏览次数
        qa.views += 1;
        await qa.save();

        res.json({
            success: true,
            qa
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 添加评论
router.post('/questions/:id/comments', auth, async (req, res) => {
    try {
        const qa = await QA.findById(req.params.id);
        if (!qa) {
            return res.status(404).json({
                success: false,
                message: '问题不存在'
            });
        }

        const comment = {
            user: req.user._id,
            content: req.body.content
        };

        qa.comments.push(comment);
        await qa.save();
        await qa.populate('comments.user', 'username avatar');

        res.status(201).json({
            success: true,
            comment: qa.comments[qa.comments.length - 1]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 点赞/取消点赞
router.post('/questions/:id/like', auth, async (req, res) => {
    try {
        const qa = await QA.findById(req.params.id);
        if (!qa) {
            return res.status(404).json({
                success: false,
                message: '问题不存在'
            });
        }

        const userId = req.user._id;
        const likeIndex = qa.likes.indexOf(userId);

        if (likeIndex === -1) {
            qa.likes.push(userId);
        } else {
            qa.likes.splice(likeIndex, 1);
        }

        await qa.save();

        res.json({
            success: true,
            likesCount: qa.likes.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 删除问题
router.delete('/questions/:id', auth, async (req, res) => {
    try {
        const question = await QA.findById(req.params.id);
        
        console.log('删除请求:', {
            questionId: req.params.id,
            userId: req.user._id,
            questionUserId: question?.user
        });
        
        if (!question) {
            return res.status(404).json({
                success: false,
                message: '问题不存在'
            });
        }

        // 检查是否是问题的创建者
        const questionUserId = question.user._id || question.user;
        const isCreator = questionUserId.toString() === req.user._id.toString();
        console.log('权限检查:', {
            questionUserId: questionUserId.toString(),
            requestUserId: req.user._id.toString(),
            isMatch: isCreator
        });

        if (!isCreator) {
            return res.status(403).json({
                success: false,
                message: '没有权限删除此问题'
            });
        }

        await QA.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: '问题已删除'
        });
    } catch (error) {
        console.error('删除失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 生成回答
router.post('/generate', auth, async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({
            success: false,
            message: '问题不能为空'
        });
    }

    // 设置响应头以支持流式传输
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        console.log('开始调用DeepSeek API，问题:', question);
        const apiResponse = await fetch('http://ai-service.tal.com/openai-compatible/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer 1000080918:2d0309389080054cfa7864c9d2acaf61',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-reasoner',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的AI助手，请用Markdown格式回答用户的问题，回答要专业、准确、有条理。'
                    },
                    {
                        role: 'user',
                        content: question
                    }
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        console.log('API响应状态:', apiResponse.status);

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('API错误响应:', errorText);
            throw new Error(`调用AI服务失败: ${errorText}`);
        }

        const responseText = await apiResponse.text();
        console.log('API响应内容:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('解析API响应失败:', e);
            throw new Error('API响应格式错误');
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('无效的API响应格式:', data);
            throw new Error('API响应格式错误');
        }

        const answer = data.choices[0].message.content;
        console.log('生成的回答:', answer);

        // 逐字符发送回答
        const chars = answer.split('');
        for (let char of chars) {
            res.write(char);
            // 添加一个小延迟，模拟打字效果
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        res.end();
    } catch (error) {
        console.error('生成回答失败:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        } else {
            res.end('生成回答失败: ' + error.message);
        }
    }
});

module.exports = router; 