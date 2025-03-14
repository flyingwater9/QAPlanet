// 全局变量
let currentUser = null;
let generatedAnswer = '';

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
});

// 检查认证状态
async function checkAuth() {
    try {
        const response = await fetch('/api/users/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            alert('请先登录后再添加问答');
            window.location.href = 'index.html';
            return;
        }

        const data = await response.json();
        currentUser = data.user;
    } catch (error) {
        console.error('认证检查失败:', error);
        alert('认证检查失败，请重试');
    }
}

// 设置事件监听器
function setupEventListeners() {
    const generateBtn = document.getElementById('generateBtn');
    const questionForm = document.getElementById('questionForm');
    const questionInput = document.getElementById('question');

    generateBtn.addEventListener('click', handleGenerateAnswer);
    questionForm.addEventListener('submit', handleSubmit);
    questionInput.addEventListener('input', () => {
        document.getElementById('submitBtn').disabled = !questionInput.value || questionInput.value.length < 10 || !generatedAnswer;
    });
}

// 处理生成回答
async function handleGenerateAnswer() {
    const question = document.getElementById('question').value;
    if (!question || question.length < 10) {
        alert('请输入至少10个字符的问题');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    const spinner = generateBtn.querySelector('.spinner-border');
    const answerDisplay = document.getElementById('answerDisplay');
    const generatingMessage = document.getElementById('generatingMessage');
    const submitBtn = document.getElementById('submitBtn');

    // 重置状态
    generatedAnswer = '';
    answerDisplay.innerHTML = '';
    answerDisplay.style.display = 'block';
    generatingMessage.style.display = 'block';
    generateBtn.disabled = true;
    spinner.classList.remove('d-none');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/qa/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ question })
        });

        if (!response.ok) {
            throw new Error('生成回答失败');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            generatedAnswer += text;
            
            // 使用marked渲染Markdown
            answerDisplay.innerHTML = marked.parse(generatedAnswer);
            
            // 自动滚动到底部
            answerDisplay.scrollTop = answerDisplay.scrollHeight;
        }
    } catch (error) {
        console.error('生成回答失败:', error);
        alert('生成回答失败，请重试');
        answerDisplay.innerHTML = '<div class="text-danger">生成回答失败，请重试</div>';
    } finally {
        generatingMessage.style.display = 'none';
        generateBtn.disabled = false;
        spinner.classList.add('d-none');
        submitBtn.disabled = !generatedAnswer;
    }
}

// 处理表单提交
async function handleSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
        alert('请先登录');
        return;
    }

    const question = document.getElementById('question').value;
    if (!question || !generatedAnswer) {
        alert('请确保已输入问题并生成回答');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/qa/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                question,
                answer: generatedAnswer,
                aiModel: 'DeepSeek'
            })
        });

        if (!response.ok) {
            throw new Error('提交失败');
        }

        alert('问答发布成功！');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('提交失败:', error);
        alert('提交失败，请重试');
        submitBtn.disabled = false;
    }
} 