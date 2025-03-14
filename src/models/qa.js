const mongoose = require('mongoose');

const qaSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    question: {
        type: String,
        required: true,
        trim: true,
        minlength: 10
    },
    answer: {
        type: String,
        required: true,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    views: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    aiModel: {
        type: String,
        required: true,
        enum: ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Other']
    }
}, {
    timestamps: true
});

// 添加全文搜索索引
qaSchema.index({
    question: 'text',
    answer: 'text',
    tags: 'text'
});

// 虚拟字段：点赞数
qaSchema.virtual('likesCount').get(function() {
    return this.likes.length;
});

// 虚拟字段：评论数
qaSchema.virtual('commentsCount').get(function() {
    return this.comments.length;
});

// 查询中间件：自动填充用户信息
qaSchema.pre('find', function() {
    this.populate('user', 'username avatar');
});

qaSchema.pre('findOne', function() {
    this.populate('user', 'username avatar');
});

// 清除现有的模型（如果存在）
if (mongoose.models.QA) {
    delete mongoose.models.QA;
}

const QA = mongoose.model('QA', qaSchema);

module.exports = QA; 