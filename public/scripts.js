// 全局变量
let token = localStorage.getItem('token');
let currentUser = null;
let questionEditor = null;
let answerEditor = null;

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadQuestions();
    setupEventListeners();
    initializeEditors();
});

// 初始化Markdown编辑器
function initializeEditors() {
    questionEditor = new EasyMDE({
        element: document.getElementById('questionContent'),
        spellChecker: false,
        placeholder: '请输入您的问题，支持 Markdown 格式...',
        status: false
    });

    answerEditor = new EasyMDE({
        element: document.getElementById('answerContent'),
        spellChecker: false,
        placeholder: 'AI的回答，支持 Markdown 格式...',
        status: false
    });
}

// 检查认证状态
async function checkAuth() {
    if (token) {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                currentUser = {
                    ...data.user,
                    _id: data.user._id || data.user.id // 确保_id字段存在
                };
                updateAuthUI();
            } else {
                localStorage.removeItem('token');
                token = null;
            }
        } catch (error) {
            console.error('认证检查失败:', error);
        }
    }
}

// 更新认证UI
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    if (currentUser) {
        authButtons.innerHTML = `
            <span class="navbar-text me-3">欢迎, ${currentUser.username}</span>
            <button class="btn btn-outline-light" onclick="logout()">退出</button>
        `;
    } else {
        authButtons.innerHTML = `
            <button class="btn btn-outline-light me-2" onclick="showLoginModal()">登录</button>
            <button class="btn btn-light" onclick="showRegisterModal()">注册</button>
        `;
    }
}

// 加载问题列表
async function loadQuestions() {
    try {
        const response = await fetch('/api/qa/questions');
        const data = await response.json();
        
        console.log('当前用户ID:', currentUser?._id);
        console.log('所有问题:', data.questions);
        
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = data.questions.map((q, index) => {
            console.log('比较:', {
                currentUserId: currentUser?._id,
                questionUserId: q.user._id,
                isMatch: currentUser && currentUser._id === q.user._id
            });
            return `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <h5 class="question-title mb-0">${q.question}</h5>
                        ${currentUser && currentUser._id === q.user._id ? 
                            `<button class="btn btn-danger btn-sm" onclick="deleteQuestion('${q._id}')">删除</button>` 
                            : ''}
                    </div>
                    <div class="question-meta">
                        <span class="ai-model-badge">${q.aiModel}</span>
                        <span class="me-3">作者: ${q.user.username}</span>
                        <span class="me-3">浏览: ${q.views}</span>
                        <span>点赞: ${q.likes.length}</span>
                    </div>
                    <div class="question-content markdown-body">
                        ${DOMPurify.sanitize(marked.parse(q.question))}
                    </div>
                    <div class="answer-content markdown-body">
                        <div class="answer-preview" id="preview-${index}">
                            ${DOMPurify.sanitize(marked.parse(q.answer))}
                        </div>
                        <div class="answer-full d-none" id="full-${index}">
                            ${DOMPurify.sanitize(marked.parse(q.answer))}
                        </div>
                        <button class="btn btn-link btn-sm mt-2" onclick="toggleAnswer(${index})">
                            <span id="toggle-text-${index}">展开全文</span>
                            <i class="toggle-icon" id="toggle-icon-${index}">▼</i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // 初始化所有回答的预览
        data.questions.forEach((_, index) => {
            initializeAnswerPreview(index);
        });
    } catch (error) {
        console.error('加载问题失败:', error);
    }
}

// 初始化回答预览
function initializeAnswerPreview(index) {
    const preview = document.getElementById(`preview-${index}`);
    const full = document.getElementById(`full-${index}`);
    
    if (preview && full) {
        // 获取完整内容的行数
        const lineHeight = parseInt(window.getComputedStyle(preview).lineHeight);
        const maxHeight = lineHeight * 4; // 显示4行
        
        // 设置预览区域的最大高度
        preview.style.maxHeight = maxHeight + 'px';
        preview.style.overflow = 'hidden';
        
        // 如果内容高度小于等于最大高度，隐藏展开按钮
        const button = preview.nextElementSibling.nextElementSibling;
        if (preview.scrollHeight <= maxHeight) {
            button.style.display = 'none';
        }
    }
}

// 切换回答的展开/收起状态
function toggleAnswer(index) {
    const preview = document.getElementById(`preview-${index}`);
    const full = document.getElementById(`full-${index}`);
    const toggleText = document.getElementById(`toggle-text-${index}`);
    const toggleIcon = document.getElementById(`toggle-icon-${index}`);
    
    if (preview.style.display !== 'none') {
        preview.style.display = 'none';
        full.classList.remove('d-none');
        toggleText.textContent = '收起';
        toggleIcon.style.transform = 'rotate(180deg)';
    } else {
        preview.style.display = 'block';
        full.classList.add('d-none');
        toggleText.textContent = '展开全文';
        toggleIcon.style.transform = 'rotate(0deg)';
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 登录表单提交
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            if (response.ok) {
                token = data.token;
                localStorage.setItem('token', token);
                currentUser = data.user;
                updateAuthUI();
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('登录失败:', error);
            alert('登录失败，请重试');
        }
    });

    // 注册表单提交
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            if (response.ok) {
                token = data.token;
                localStorage.setItem('token', token);
                currentUser = data.user;
                updateAuthUI();
                bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('注册失败:', error);
            alert('注册失败，请重试');
        }
    });

    // 添加问答表单提交
    document.getElementById('addQuestionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('表单提交开始');

        if (!token) {
            alert('请先登录');
            return;
        }

        // 获取编辑器的值
        const question = questionEditor.value().trim();
        const answer = answerEditor.value().trim();
        const aiModel = document.getElementById('aiModel').value;

        // 表单验证
        if (!question || question.length < 10) {
            alert('问题内容至少需要10个字符');
            return;
        }

        if (!answer || answer.length < 1) {
            alert('请填写AI回答内容');
            return;
        }

        if (!aiModel) {
            alert('请选择AI模型');
            return;
        }

        console.log('提交数据:', {
            question,
            answer,
            aiModel
        });

        try {
            const response = await fetch('/api/qa/questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question,
                    answer,
                    aiModel
                })
            });

            console.log('服务器响应状态:', response.status);
            const data = await response.json();
            console.log('服务器响应数据:', data);

            if (response.ok) {
                alert('发布成功！');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addQuestionModal'));
                if (modal) {
                    modal.hide();
                }
                loadQuestions(); // 重新加载问题列表
                // 清空表单
                questionEditor.value('');
                answerEditor.value('');
                document.getElementById('aiModel').value = 'ChatGPT';
            } else {
                alert(data.message || '发布失败，请重试');
            }
        } catch (error) {
            console.error('发布问答失败:', error);
            alert('发布失败：' + (error.message || '未知错误'));
        }
    });
}

// 显示登录模态框
function showLoginModal() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// 显示注册模态框
function showRegisterModal() {
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    registerModal.show();
}

// 显示添加问答模态框
function showAddQuestionModal() {
    if (!token) {
        alert('请先登录');
        return;
    }
    const addQuestionModal = new bootstrap.Modal(document.getElementById('addQuestionModal'));
    addQuestionModal.show();
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    updateAuthUI();
}

// 删除问题
async function deleteQuestion(questionId) {
    if (!confirm('确定要删除这个问答吗？此操作不可恢复。')) {
        return;
    }

    try {
        console.log('删除请求:', {
            questionId,
            token,
            currentUser: currentUser
        });

        const response = await fetch(`/api/qa/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('删除响应:', data);

        if (response.ok) {
            alert('删除成功');
            loadQuestions(); // 重新加载问题列表
        } else {
            alert(data.message || '删除失败，请重试');
        }
    } catch (error) {
        console.error('删除问题失败:', error);
        alert('删除失败：' + (error.message || '未知错误'));
    }
} 