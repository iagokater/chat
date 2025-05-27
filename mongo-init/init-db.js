// Script de inicialização do MongoDB para o projeto de chat
db = db.getSiblingDB('chatroom');

// Criar coleção de mensagens com índices para performance
db.createCollection('messages');

// Criar índices para otimizar consultas
db.messages.createIndex({ "timestamp": -1 });
db.messages.createIndex({ "username": 1 });
db.messages.createIndex({ "type": 1 });

// Inserir uma mensagem de boas-vindas do sistema
db.messages.insertOne({
    username: "Sistema",
    message: "Bem-vindos à sala de chat! Este sistema mostra os comandos MongoDB em tempo real.",
    timestamp: new Date(),
    type: "system"
});

print("Banco de dados 'chatroom' inicializado com sucesso!");
