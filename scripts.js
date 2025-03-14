// 模拟数据
const mockData = [
    {
        id: 1,
        user: {
            name: "张三",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1"
        },
        question: "如何使用ChatGPT来提高编程效率？",
        answer: "ChatGPT可以通过以下方式提高编程效率：1. 代码审查和优化建议 2. 解释复杂概念 3. 调试帮助 4. 生成样板代码 5. API使用示例",
        likes: 42,
        comments: 15,
        timestamp: "2024-03-13T10:30:00"
    },
    {
        id: 2,
        user: {
            name: "李四",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2"
        },
        question: "AI能否取代人类程序员？",
        answer: "AI目前更多是作为程序员的助手和工具，而非替代品。它可以处理重复性工作，但在创造性思维、系统设计和复杂问题解决方面仍需要人类的参与。",
        likes: 38,
        comments: 27,
        timestamp: "2024-03-13T09:15:00"
    }
];

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化用户界面
    initializeUI();
    // 加载问答数据
    loadQAItems();
    // 添加事件监听器
    addEventListeners();
});

// 初始化用户界面
function initializeUI() {
    // 检查用户登录状态
    const isLoggedIn = checkLoginStatus();
    updateUserMenu(isLoggedIn);
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('userToken');
    return !!token;
}

// 更新用户菜单
function updateUserMenu(isLoggedIn) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userProfile = document.getElementById('userProfile');

    if (isLoggedIn) {
        loginBtn.classList.add('hidden');
        registerBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        // 加载用户头像
        const userAvatar = document.getElementById('userAvatar');
        userAvatar.src = localStorage.getItem('userAvatar') || 'default-avatar.png';
    } else {
        loginBtn.classList.remove('hidden');
        registerBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
    }
}

// 加载问答列表
function loadQAItems() {
    const qaList = document.getElementById('qaList');
    const template = document.getElementById('qaItemTemplate');

    // 清空现有内容
    qaList.innerHTML = '';

    // 使用模拟数据（实际应用中应该从服务器获取）
    mockData.forEach(item => {
        const qaItem = template.content.cloneNode(true);
        
        // 填充数据
        qaItem.querySelector('.user-avatar').src = item.user.avatar;
        qaItem.querySelector('.user-name').textContent = item.user.name;
        qaItem.querySelector('.post-time').textContent = formatDate(item.timestamp);
        qaItem.querySelector('.question').textContent = item.question;
        qaItem.querySelector('.answer').textContent = item.answer;
        qaItem.querySelector('.like-btn span').textContent = item.likes;
        qaItem.querySelector('.comment-btn span').textContent = item.comments;

        // 添加到列表
        qaList.appendChild(qaItem);
    });
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // 小于1小时
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
    }
    // 小于24小时
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
    }
    // 其他情况
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 添加事件监听器
function addEventListeners() {
    // 登出按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // 点赞按钮
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', handleLike);
    });

    // 评论按钮
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', handleComment);
    });

    // 分享按钮
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', handleShare);
    });

    // 筛选按钮
    document.querySelectorAll('.filters button').forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });
}

// 处理登出
function handleLogout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userAvatar');
    updateUserMenu(false);
    window.location.reload();
}

// 处理点赞
function handleLike(e) {
    const btn = e.currentTarget;
    const span = btn.querySelector('span');
    const icon = btn.querySelector('i');
    
    if (icon.classList.contains('far')) {
        icon.classList.replace('far', 'fas');
        span.textContent = parseInt(span.textContent) + 1;
    } else {
        icon.classList.replace('fas', 'far');
        span.textContent = parseInt(span.textContent) - 1;
    }
}

// 处理评论
function handleComment(e) {
    // TODO: 实现评论功能
    alert('评论功能开发中...');
}

// 处理分享
function handleShare(e) {
    // TODO: 实现分享功能
    if (navigator.share) {
        navigator.share({
            title: '分享这个问答',
            text: '查看这个有趣的AI问答',
            url: window.location.href
        });
    } else {
        alert('复制链接成功！');
    }
}

// 处理筛选
function handleFilter(e) {
    const btn = e.currentTarget;
    // 移除其他按钮的active类
    btn.parentElement.querySelectorAll('button').forEach(b => {
        b.classList.remove('active');
    });
    // 添加当前按钮的active类
    btn.classList.add('active');
    // TODO: 实现筛选逻辑
    loadQAItems(); // 临时重新加载数据
} 