# Sala de Chat com MongoDB - Tempo Real

Este é um projeto acadêmico que implementa uma sala de chat em tempo real com visualização dos comandos MongoDB sendo executados.

## 🚀 Características

- **Chat em tempo real** usando Socket.IO
- **Persistência de dados** com MongoDB
- **Interface dividida** mostrando chat e comandos MongoDB
- **Scrolls independentes** para chat e comandos
- **Mensagens instantâneas** para todos os usuários conectados
- **Entrada obrigatória** com nome de usuário
- **Visualização em tempo real** das operações do banco

## 🛠️ Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Socket.IO** - Comunicação em tempo real
- **MongoDB** - Banco de dados NoSQL
- **EJS** - Template engine
- **CSS3** - Estilização moderna

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- MongoDB (local ou MongoDB Atlas)
- npm ou yarn

## 🔧 Instalação e Execução

### Método 1: Usando Docker (Recomendado)

1. **Pré-requisitos:**
   - Docker e Docker Compose instalados
   - Node.js (versão 16 ou superior)

2. **Execução rápida:**
```bash
# Tornar script executável (apenas na primeira vez)
chmod +x start.sh stop.sh

# Iniciar tudo automaticamente
./start.sh
```

3. **Acessos:**
   - **Chat**: http://localhost:3000
   - **MongoDB Admin**: http://localhost:8081

4. **Para parar:**
```bash
./stop.sh
```

### Método 2: MongoDB Local

1. Instale o MongoDB localmente
2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite .env com suas configurações
```

3. Execute:
```bash
npm install
npm run dev
```

### Método 3: MongoDB Atlas (Nuvem)

1. Crie uma conta no [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Configure a string de conexão no arquivo `.env`:
```bash
MONGO_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/chatroom
```

3. Execute:
```bash
npm install
npm start
```

## 🗄️ Configuração do MongoDB

### MongoDB Local
```bash
# Instalar MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb

# Iniciar o serviço
sudo systemctl start mongodb
```

### MongoDB Atlas (Nuvem)
1. Crie uma conta em https://www.mongodb.com/atlas
2. Crie um cluster gratuito
3. Configure as credenciais
4. Defina a variável de ambiente:
```bash
export MONGO_URL="mongodb+srv://usuario:senha@cluster.mongodb.net"
```

## 📱 Como Usar

1. **Acesse a aplicação** no navegador
2. **Digite seu nome** na tela inicial
3. **Clique em "Entrar"** para acessar o chat
4. **Digite mensagens** no campo de texto
5. **Observe os comandos MongoDB** sendo executados em tempo real na tela direita

## 🏗️ Estrutura do Projeto

```
/
├── server.js              # Servidor principal
├── package.json           # Dependências e scripts
├── views/
│   └── index.ejs          # Template principal
├── public/
│   ├── styles.css         # Estilos CSS
│   └── script.js          # JavaScript do cliente
└── .github/
    └── copilot-instructions.md
```

## 🔄 Comandos MongoDB Visualizados

A aplicação mostra em tempo real os seguintes comandos:

- **Conexão**: `use chatroom`
- **Consultas**: `db.messages.find().sort({timestamp: -1}).limit(50)`
- **Inserções**: `db.messages.insertOne({...})`
- **Estatísticas**: `db.stats()`

## 🌟 Funcionalidades

### Chat
- ✅ Mensagens em tempo real
- ✅ Histórico de mensagens
- ✅ Notificações de entrada/saída
- ✅ Interface responsiva
- ✅ Scroll automático

### MongoDB
- ✅ Visualização de comandos em tempo real
- ✅ Diferentes tipos de operação (conexão, consulta, inserção)
- ✅ Timestamps precisos
- ✅ Formatação de código
- ✅ Scroll independente

## 🛡️ Segurança

⚠️ **Atenção**: Este é um projeto acadêmico. Para uso em produção, implemente:

- Validação de entrada
- Sanitização de dados
- Autenticação/autorização
- Rate limiting
- HTTPS
- Configuração de CORS

## 🤝 Contribuição

Este é um projeto acadêmico, mas contribuições são bem-vindas:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

## 📞 Suporte

Para dúvidas sobre o projeto acadêmico, entre em contato através dos issues do GitHub.
