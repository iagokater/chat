const socket = io();
let username = '';
let selectedAvatar = 'USER';
let userStats = { onlineUsers: 0, totalMessages: 0 };

// Funções de cache
function saveUserData() {
    const userData = {
        username: username,
        avatar: selectedAvatar,
        timestamp: Date.now()
    };
    localStorage.setItem('chatroom_user', JSON.stringify(userData));
}

function loadUserData() {
    try {
        const stored = localStorage.getItem('chatroom_user');
        if (stored) {
            const userData = JSON.parse(stored);
            // Verificar se os dados não são muito antigos (24 horas)
            if (Date.now() - userData.timestamp < 24 * 60 * 60 * 1000) {
                return userData;
            }
        }
    } catch (error) {
        // Se houver erro ao ler do localStorage, ignorar
    }
    return null;
}

function clearUserData() {
    localStorage.removeItem('chatroom_user');
}

// Elementos do DOM
const loginModal = document.getElementById('login-modal');
const adminModal = document.getElementById('admin-modal');
const mainContainer = document.getElementById('main-container');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const adminBtn = document.getElementById('admin-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminPassword = document.getElementById('admin-password');
const clearChatBtn = document.getElementById('clear-chat-btn');
const restartServerBtn = document.getElementById('restart-server-btn');
const closeAdminBtn = document.getElementById('close-admin-btn');
const userInfo = document.getElementById('user-info');
const messagesDiv = document.getElementById('messages');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const mongodbCommands = document.getElementById('mongodb-commands');
const mongodbContainer = document.getElementById('mongodb-container');

// Avatar selection functionality
document.addEventListener('DOMContentLoaded', function() {
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const inputFeedback = document.querySelector('.input-feedback');
    const statUsers = document.querySelector('.login-stats .stat-item:first-child .stat-text');
    const statMessages = document.querySelector('.login-stats .stat-item:last-child .stat-text');
    
    // Verificar se há dados em cache e auto-login se válidos
    const cachedData = loadUserData();
    if (cachedData && cachedData.username && cachedData.avatar) {
        // Configurar dados do usuário
        username = cachedData.username;
        selectedAvatar = cachedData.avatar;
        
        // Auto-login: entrar diretamente no chat
        console.log('Auto-login com dados em cache:', cachedData);
        loginModal.classList.add('hidden');
        mainContainer.classList.remove('hidden');
        
        // Atualizar interface do usuário
        userInfo.innerHTML = `<span class="user-avatar">[${selectedAvatar}]</span> <span class="user-name">${username}</span>`;
        
        // Emitir evento de entrada no chat
        socket.emit('join', { username, avatar: selectedAvatar });
        
        // Focar no input de mensagem
        messageInput.focus();
        
        return; // Sair da função já que o usuário foi logado automaticamente
    }
    
    // Se não há dados válidos em cache, configurar tela de login normalmente
    if (cachedData) {
        usernameInput.value = cachedData.username || '';
        selectedAvatar = cachedData.avatar || 'USER';
        
        // Selecionar o avatar correspondente se existir
        avatarOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.avatar === cachedData.avatar) {
                option.classList.add('selected');
            }
        });
        
        // Validar entrada para habilitar o botão
        validateInput();
        
        // Adicionar indicação visual de dados recuperados
        if (inputFeedback) {
            inputFeedback.textContent = 'Dados recuperados da sessão anterior';
            inputFeedback.className = 'input-feedback success';
            setTimeout(() => {
                inputFeedback.textContent = '';
                inputFeedback.className = 'input-feedback';
            }, 3000);
        }
    }
    
    // Avatar selection
    avatarOptions.forEach(option => {
        option.addEventListener('click', function() {
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedAvatar = this.dataset.avatar;
            validateInput();
            
            // Atualizar cache se já tem nome válido
            if (usernameInput.value.trim().length >= 2) {
                username = usernameInput.value.trim();
                saveUserData();
            }
        });
    });
    
    // Input validation
    usernameInput.addEventListener('input', validateInput);
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !joinBtn.disabled) {
            joinChat();
        }
    });
    
    function validateInput() {
        const value = usernameInput.value.trim();
        const isValid = value.length >= 2 && value.length <= 20;
        
        usernameInput.classList.remove('valid', 'invalid');
        inputFeedback.classList.remove('valid', 'invalid');
        
        if (value.length === 0) {
            inputFeedback.textContent = '';
            joinBtn.disabled = true;
        } else if (value.length < 2) {
            usernameInput.classList.add('invalid');
            inputFeedback.classList.add('invalid');
            inputFeedback.textContent = 'Nome muito curto (mínimo 2 caracteres)';
            joinBtn.disabled = true;
        } else if (value.length > 20) {
            usernameInput.classList.add('invalid');
            inputFeedback.classList.add('invalid');
            inputFeedback.textContent = 'Nome muito longo (máximo 20 caracteres)';
            joinBtn.disabled = true;
        } else {
            usernameInput.classList.add('valid');
            inputFeedback.classList.add('valid');
            inputFeedback.textContent = 'Nome válido';
            joinBtn.disabled = false;
            
            // Atualizar cache com nome válido
            username = value;
            saveUserData();
        }
    }
    
    // Update stats periodically
    function updateLoginStats() {
        if (statUsers) statUsers.textContent = `${userStats.onlineUsers} usuários online`;
        if (statMessages) statMessages.textContent = `${userStats.totalMessages} mensagens enviadas`;
    }
    
    // Request initial stats
    socket.emit('request-stats');
    updateLoginStats();
    
    // Listen for stats updates
    socket.on('stats-update', function(stats) {
        userStats = stats;
        updateLoginStats();
    });
});

// Enhanced command display
function displayMongoDBCommand(data) {
    const mongodbCommands = document.getElementById('mongodb-commands');
    if (!mongodbCommands) return;
    
    const commandDiv = document.createElement('div');
    commandDiv.className = `mongodb-command ${data.type || 'general'}`;
    
    const timestamp = new Date(data.timestamp).toLocaleTimeString('pt-BR');
    const statusIcon = data.success ? '✓' : '✗';
    
    commandDiv.innerHTML = `
        <div class="command-header">
            <span class="command-timestamp">${timestamp}</span>
            <span class="command-status">${statusIcon}</span>
            <span class="command-type">${data.type?.toUpperCase() || 'COMMAND'}</span>
        </div>
        <pre class="command-text">${data.command}</pre>
    `;
    
    mongodbCommands.appendChild(commandDiv);
    
    // Auto scroll to bottom
    const container = document.getElementById('mongodb-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
    
    // Add animation
    commandDiv.style.opacity = '0';
    commandDiv.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        commandDiv.style.transition = 'all 0.3s ease';
        commandDiv.style.opacity = '1';
        commandDiv.style.transform = 'translateY(0)';
    }, 50);
    
    // Limit number of commands displayed (keep last 50)
    const commands = mongodbCommands.children;
    if (commands.length > 50) {
        mongodbCommands.removeChild(commands[0]);
    }
}

// Função para entrar no chat
function joinChat() {
    const inputUsername = usernameInput.value.trim();
    if (inputUsername.length < 2) {
        const feedback = document.querySelector('.input-feedback');
        feedback.textContent = 'Nome deve ter pelo menos 2 caracteres!';
        feedback.className = 'input-feedback invalid';
        return;
    }
    
    username = inputUsername;
    userInfo.textContent = `[${selectedAvatar}] ${username}`;
    
    // Salvar dados no cache antes de entrar no chat
    saveUserData();
    
    // Enviar dados do usuário incluindo avatar
    socket.emit('join-chat', { username, avatar: selectedAvatar });
    
    // Esconder modal e mostrar chat
    loginModal.classList.add('hidden');
    mainContainer.classList.remove('hidden');
    
    // Focar no input de mensagem
    messageInput.focus();
    
    // Iniciar observação do DOM
    startObserver();
    
    // Garantir que o input esteja visível
    ensureInputVisible();
}

// Função para logout (sair do chat)
function logout() {
    if (confirm('Tem certeza que deseja sair do chat? Os dados serão mantidos para próxima sessão.')) {
        // Notificar o servidor sobre desconexão
        socket.disconnect();
        
        // Limpar interface
        messagesDiv.innerHTML = '';
        messageInput.value = '';
        
        // Voltar para tela de login mantendo dados em cache
        mainContainer.classList.add('hidden');
        loginModal.classList.remove('hidden');
        
        // Refocar no input de username
        usernameInput.focus();
        
        // Reconectar socket para nova sessão
        socket.connect();
    }
}

// Função para enviar mensagem
function sendMessage() {
    const message = messageInput.value.trim();
    if (message.length === 0) return;
    
    socket.emit('send-message', { message });
    messageInput.value = '';
    messageInput.focus();
    
    // Garantir que o input permaneça visível após envio
    ensureInputVisible();
    
    // Verificação adicional após 200ms
    setTimeout(() => {
        ensureInputVisible();
        messageInput.focus();
    }, 200);
}

// Função para garantir que o input de mensagem permaneça visível
function ensureInputVisible() {
    const inputContainer = document.querySelector('.message-input-container');
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (inputContainer) {
        // Forçar estilo de exibição
        inputContainer.style.display = 'flex';
        inputContainer.style.visibility = 'visible';
        inputContainer.style.opacity = '1';
        inputContainer.style.position = 'relative';
        inputContainer.style.zIndex = '100';
        inputContainer.style.bottom = '0';
        inputContainer.style.width = '100%';
        inputContainer.style.minHeight = '70px';
        inputContainer.style.maxHeight = '70px';
        inputContainer.style.flexShrink = '0';
        
        // Garantir que os elementos internos também estejam visíveis
        if (input) {
            input.style.display = 'block';
            input.style.visibility = 'visible';
            input.style.opacity = '1';
        }
        
        if (sendBtn) {
            sendBtn.style.display = 'block';
            sendBtn.style.visibility = 'visible';
            sendBtn.style.opacity = '1';
        }
    } else {
        // Container não encontrado
    }
}

// Função para formatar data e hora
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
}

// Função para adicionar mensagem ao chat
function addMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.type}`;
    
    if (data.type === 'system') {
        messageDiv.innerHTML = `
            <div class="message-text">${data.message}</div>
            <div class="message-time">${formatTime(data.timestamp)}</div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-header">
                ${data.username}
                <span class="message-time">${formatTime(data.timestamp)}</span>
            </div>
            <div class="message-text">${data.message}</div>
        `;
    }
    
    messagesDiv.appendChild(messageDiv);
    
    // Scroll para a mensagem mais recente
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        ensureInputVisible();
    });
    
    // Verificação adicional após um tempo
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        ensureInputVisible();
    }, 100);
}

// Função para adicionar comando MongoDB (usando a nova função educativa)
function addMongoCommand(data) {
    displayMongoDBCommand(data);
}

// Socket event listeners
socket.on('message', addMessage);
socket.on('mongodb-command', displayMongoDBCommand);
socket.on('previous-messages', function(messages) {
    messages.forEach(message => {
        addMessage(message);
    });
});

socket.on('chat-cleared', function() {
    messagesDiv.innerHTML = '';
});

socket.on('error', function(errorMessage) {
    alert(errorMessage);
});

socket.on('stats-update', function(stats) {
    userStats = stats;
    // Atualizar estatísticas na tela de login se estiver visível
    const statUsers = document.querySelector('.login-stats .stat-item:first-child .stat-text');
    const statMessages = document.querySelector('.login-stats .stat-item:last-child .stat-text');
    
    if (statUsers) statUsers.textContent = `${stats.onlineUsers} usuários online`;
    if (statMessages) statMessages.textContent = `${stats.totalMessages} mensagens enviadas`;
});

// Socket events
socket.on('connect', () => {
    // Conectado ao servidor
});

socket.on('disconnect', () => {
    // Desconectado do servidor
});

// Ajustar layout quando a tela for redimensionada
window.addEventListener('resize', () => {
    setTimeout(() => {
        ensureInputVisible();
        adjustLayoutForDevice();
    }, 100);
});

// Função para ajustar layout baseado no dispositivo
function adjustLayoutForDevice() {
    const isMobile = window.innerWidth <= 768;
    const isSmallScreen = window.innerWidth <= 480;
    
    // Ajustar scrolls para dispositivos móveis
    if (isMobile) {
        // Em mobile, garantir que os scrolls funcionem corretamente
        if (messagesContainer) {
            messagesContainer.style.webkitOverflowScrolling = 'touch';
        }
        if (mongodbContainer) {
            mongodbContainer.style.webkitOverflowScrolling = 'touch';
        }
    }
}

// Função para verificar e corrigir a visibilidade do input periodicamente
function checkInputVisibility() {
    const inputContainer = document.querySelector('.message-input-container');
    if (inputContainer && !loginModal.classList.contains('hidden') === false) {
        const rect = inputContainer.getBoundingClientRect();
        
        // Se o input não estiver visível ou estiver fora da tela
        if (rect.height === 0 || rect.bottom > window.innerHeight || rect.top < 0) {
            ensureInputVisible();
        }
    }
}

// Verificar a cada 2 segundos se o input está visível (apenas quando no chat)
setInterval(() => {
    if (!mainContainer.classList.contains('hidden')) {
        checkInputVisibility();
    }
}, 2000);

// Observer para detectar mudanças no DOM que possam afetar o input
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.target.id === 'messages') {
            // Quando novas mensagens são adicionadas, garantir que o input permaneça visível
            setTimeout(() => {
                ensureInputVisible();
            }, 100);
        }
    });
});

// Iniciar observação quando entrar no chat
function startObserver() {
    if (messagesDiv) {
        observer.observe(messagesDiv, {
            childList: true,
            subtree: true
        });
    }
}

// Funcionalidades de administração
function openAdminModal() {
    adminModal.classList.remove('hidden');
    adminPassword.focus();
}

function closeAdminModal() {
    adminModal.classList.add('hidden');
    adminPassword.value = '';
}

function clearChat() {
    const password = adminPassword.value;
    if (password.length === 0) {
        alert('Digite a senha admin');
        return;
    }
    
    socket.emit('admin-clear-chat', { password });
    closeAdminModal();
}

function restartServer() {
    const password = adminPassword.value;
    if (password.length === 0) {
        alert('Digite a senha admin');
        return;
    }
    
    if (confirm('Tem certeza que deseja reiniciar o servidor? Todos os usuários serão desconectados.')) {
        socket.emit('admin-restart-server', { password });
        closeAdminModal();
    }
}

// Event listeners principais
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners para botões
    if (joinBtn) joinBtn.addEventListener('click', joinChat);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (adminBtn) adminBtn.addEventListener('click', openAdminModal);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (clearChatBtn) clearChatBtn.addEventListener('click', clearChat);
    if (restartServerBtn) restartServerBtn.addEventListener('click', restartServer);
    if (closeAdminBtn) closeAdminBtn.addEventListener('click', closeAdminModal);

    // Event listeners para inputs
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    if (adminPassword) {
        adminPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                clearChat();
            }
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !joinBtn.disabled) {
                joinChat();
            }
        });
    }

    // Escape para fechar modal de admin
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !adminModal.classList.contains('hidden')) {
            closeAdminModal();
        }
    });

    // Focar no input de username quando a página carregar
    if (usernameInput) {
        usernameInput.focus();
    }
    adjustLayoutForDevice();
});
