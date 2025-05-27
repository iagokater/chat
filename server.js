require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Configuração do MongoDB
const MONGO_URL = process.env.MONGO_URL || 'mongodb://admin:password123@localhost:27017/chatroom?authSource=admin';
const DB_NAME = process.env.MONGO_DB_NAME || 'chatroom';
const COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME || 'messages';

let db;
let messagesCollection;

// Conectar ao MongoDB
async function connectToMongoDB() {
    try {
        console.log('Conectando ao MongoDB...');
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        
        // Testar a conexão
        await client.db('admin').command({ ping: 1 });
        
        db = client.db(DB_NAME);
        messagesCollection = db.collection(COLLECTION_NAME);
        
        console.log('Conectado ao MongoDB com sucesso!');
        console.log(`Banco: ${DB_NAME}`);
        console.log(`Coleção: ${COLLECTION_NAME}`);
        
        // Emitir comando MongoDB para todos os clientes
        io.emit('mongodb-command', {
            command: `// Conexão estabelecida com MongoDB\nuse ${DB_NAME}\ndb.${COLLECTION_NAME}.stats()`,
            timestamp: new Date(),
            type: 'connection',
            success: true
        });
        
        // Verificar se a coleção existe e criar índices se necessário
        await createIndexes();
        
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error.message);
        
        // Emitir erro para os clientes
        io.emit('mongodb-command', {
            command: `// Erro de conexão: ${error.message}`,
            timestamp: new Date(),
            type: 'error',
            success: false
        });
        
        // Tentar reconectar após 5 segundos
        setTimeout(connectToMongoDB, 5000);
    }
}

// Criar índices para otimizar performance
async function createIndexes() {
    try {
        await messagesCollection.createIndex({ "timestamp": -1 });
        await messagesCollection.createIndex({ "username": 1 });
        await messagesCollection.createIndex({ "type": 1 });
        
        io.emit('mongodb-command', {
            command: `// Índices criados para otimização\ndb.${COLLECTION_NAME}.createIndex({"timestamp": -1})\ndb.${COLLECTION_NAME}.createIndex({"username": 1})\ndb.${COLLECTION_NAME}.createIndex({"type": 1})`,
            timestamp: new Date(),
            type: 'index',
            success: true
        });
        
        console.log('Índices criados com sucesso!');
    } catch (error) {
        console.log('Índices já existem ou erro ao criar:', error.message);
    }
}

// Configurar EJS como template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.render('index');
});

// Configuração do Socket.IO
let connectedUsers = new Set();
let totalMessages = 0;

// Função para obter estatísticas
function getStats() {
    return {
        onlineUsers: connectedUsers.size,
        totalMessages: totalMessages
    };
}

// Função para emitir logs do sistema
function emitSystemLog(type, description, command, isSuccessful = true) {
    io.emit('mongodb-command', {
        command: `// ${description}\n${command}`,
        timestamp: new Date(),
        type: type,
        success: isSuccessful
    });
}

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);
    connectedUsers.add(socket.id);
    
    // Enviar estatísticas iniciais
    socket.emit('stats-update', getStats());
    
    // Log de conexão
    emitSystemLog('connection', 
        'Nova conexão estabelecida', 
        `db.runCommand({connectionStatus: 1})`);

    // Request stats event
    socket.on('request-stats', () => {
        socket.emit('stats-update', getStats());
    });

    // Quando um usuário entra no chat
    socket.on('join-chat', async (userData) => {
        // Suportar tanto string quanto objeto para compatibilidade
        if (typeof userData === 'string') {
            socket.username = userData;
            socket.avatar = 'USER';
        } else {
            socket.username = userData.username || userData;
            socket.avatar = userData.avatar || 'USER';
        }
        
        console.log(`${socket.username} entrou no chat com avatar ${socket.avatar}`);
        
        // Buscar mensagens anteriores
        try {
            const queryCommand = `db.${COLLECTION_NAME}.find({}).sort({timestamp: -1}).limit(50)`;
            
            emitSystemLog('query', 
                `Recuperando histórico de mensagens para ${socket.username}`, 
                queryCommand);
            
            const messages = await messagesCollection
                .find()
                .sort({ timestamp: -1 })
                .limit(50)
                .toArray();
            
            // Log do resultado da consulta
            emitSystemLog('result', 
                `Consulta executada com sucesso`, 
                `// ${messages.length} documentos encontrados`);
            
            // Enviar mensagens anteriores em ordem cronológica
            socket.emit('previous-messages', messages.reverse());
            
            // Calcular estatísticas
            const statsCommand = `db.${COLLECTION_NAME}.aggregate([
  { $group: { _id: null, total: { $sum: 1 } } },
  { $project: { _id: 0, totalMessages: "$total" } }
])`;
            
            emitSystemLog('aggregation', 
                'Calculando estatísticas do sistema', 
                statsCommand);
            
        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
            
            emitSystemLog('error', 
                'Erro na consulta ao banco de dados', 
                `// Erro: ${error.message}`, 
                false);
        }
        
        // Notificar que o usuário entrou
        const joinMessage = {
            username: 'Sistema',
            message: `[${socket.avatar}] ${socket.username} entrou no chat`,
            timestamp: new Date(),
            type: 'system'
        };
        
        socket.broadcast.emit('message', joinMessage);
        
        // Atualizar estatísticas
        io.emit('stats-update', getStats());
    });

    // Quando uma mensagem é enviada
    socket.on('send-message', async (data) => {
        const messageData = {
            username: socket.username || 'Anônimo',
            message: data.message,
            timestamp: new Date(),
            type: 'user',
            avatar: socket.avatar || 'USER'
        };

        try {
            // Demonstrar inserção de documento flexível
            const insertCommand = `db.${COLLECTION_NAME}.insertOne({
  username: "${messageData.username}",
  message: "${messageData.message}",
  timestamp: ISODate("${messageData.timestamp.toISOString()}"),
  type: "${messageData.type}",
  avatar: "${messageData.avatar}",
  metadata: {
    socketId: "${socket.id}",
    userAgent: "WebSocket Client",
    connectionTime: new Date()
  }
})`;
            
            emitSystemLog('insert', 
                `Salvando mensagem no banco de dados`, 
                insertCommand);
            
            // Inserir no MongoDB
            const result = await messagesCollection.insertOne(messageData);
            totalMessages++;
            
            // Confirmar inserção realizada
            emitSystemLog('result', 
                'Mensagem salva com sucesso', 
                `// ID: ${result.insertedId}\n// Status: Persistido`);
            
            // Demonstrar consulta de verificação
                        // Emitir mensagem para todos os clientes
            io.emit('message', messageData);
            
            // Atualizar estatísticas
            io.emit('stats-update', getStats());
            
        } catch (error) {
            console.error('Erro ao salvar mensagem:', error);
            
            emitSystemLog('error', 
                'Erro ao salvar mensagem', 
                `// Erro: ${error.message}`, 
                false);
            
            socket.emit('error', 'Erro ao enviar mensagem. Tente novamente.');
        }
    });

    // Handlers para funcionalidades de administração
    socket.on('admin-clear-chat', async (data) => {
        const adminPassword = 'vejabem';
        
        if (data.password !== adminPassword) {
            socket.emit('error', 'Senha admin incorreta');
            return;
        }
        
        try {
            console.log(`Admin ${socket.username || 'Anônimo'} limpou o chat`);
            
            // Log da operação administrativa
            emitSystemLog('admin', 
                'Operação administrativa: Limpeza do chat', 
                `db.${COLLECTION_NAME}.deleteMany({})`);
            
            // Limpar todas as mensagens do banco
            const deleteResult = await messagesCollection.deleteMany({});
            totalMessages = 0;
            
            // Confirmar operação realizada
            emitSystemLog('result', 
                'Chat limpo com sucesso', 
                `// ${deleteResult.deletedCount} mensagens removidas`);
            
            // Notificar todos os usuários que o chat foi limpo
            const adminMessage = {
                username: 'Sistema',
                message: 'Chat foi limpo por um administrador',
                timestamp: new Date(),
                type: 'system'
            };
            
            io.emit('message', adminMessage);
            io.emit('chat-cleared');
            io.emit('stats-update', getStats());
            
        } catch (error) {
            console.error('Erro ao limpar chat:', error);
            
            emitSystemLog('error', 
                'Erro na operação administrativa', 
                `// Erro: ${error.message}`, 
                false);
            
            socket.emit('error', 'Erro ao limpar chat');
        }
    });

    socket.on('admin-restart-server', async (data) => {
        const adminPassword = 'ciag0309';
        
        if (data.password !== adminPassword) {
            socket.emit('error', 'Senha admin incorreta');
            return;
        }
        
        console.log(`Admin ${socket.username || 'Anônimo'} solicitou reinicialização do servidor`);
        
        // Notificar todos os usuários sobre a reinicialização
        const restartMessage = {
            username: 'Sistema',
            message: 'Servidor será reiniciado em 5 segundos...',
            timestamp: new Date(),
            type: 'system'
        };
        
        io.emit('message', restartMessage);
        
        // Mostrar comando administrativo
        io.emit('mongodb-command', {
            command: '// Comando administrativo: Reinicialização do servidor\n// process.exit(0)',
            timestamp: new Date(),
            type: 'admin',
            success: true
        });
        
        // Aguardar 5 segundos e reiniciar
        setTimeout(() => {
            console.log('Reiniciando servidor...');
            process.exit(0);
        }, 5000);
    });

    // Quando um usuário se desconecta
    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        
        if (socket.username) {
            console.log(`${socket.username} saiu do chat`);
            
            // Log da desconexão
            emitSystemLog('connection', 
                'Usuário desconectado', 
                `// Conexão encerrada: ${socket.username}`);
            
            // Notificar outros usuários
            const leaveMessage = {
                username: 'Sistema',
                message: `[${socket.avatar || 'USER'}] ${socket.username} saiu do chat`,
                timestamp: new Date(),
                type: 'system'
            };
            
            socket.broadcast.emit('message', leaveMessage);
        }
        
        // Atualizar estatísticas
        io.emit('stats-update', getStats());
    });
});

// Função para verificar saúde do banco de dados periodicamente
setInterval(async () => {
    if (db) {
        try {
            await db.admin().ping();
            // Opcional: emitir estatísticas do banco a cada 5 minutos
        } catch (error) {
            console.error('Perda de conexão com MongoDB:', error.message);
            io.emit('mongodb-command', {
                command: `// Reconectando ao MongoDB...`,
                timestamp: new Date(),
                type: 'reconnect',
                success: false
            });
        }
    }
}, 30000); // Verifica a cada 30 segundos

// Inicializar servidor
const PORT = process.env.PORT || 3000;

connectToMongoDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}`);
    });
});
