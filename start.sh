#!/bin/bash

# Script para iniciar o projeto Chat MongoDB

echo "Iniciando Sala de Chat com MongoDB..."

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

# Verificar se o Docker Compose está disponível
if ! docker compose version &> /dev/null; then
    echo "Docker Compose não está disponível. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

# Copiar arquivo de ambiente se não existir
if [ ! -f .env ]; then
    echo "Criando arquivo de ambiente..."
    cp .env.example .env
    echo "Arquivo .env criado. Você pode editá-lo se necessário."
fi

# Iniciar containers MongoDB
echo "Iniciando containers MongoDB..."
docker compose up -d

# Aguardar MongoDB inicializar
echo "Aguardando MongoDB inicializar..."
sleep 10

# Verificar se MongoDB está rodando
echo "Verificando status do MongoDB..."
if docker compose ps | grep -q "Up"; then
    echo "MongoDB está rodando!"
    echo "Mongo Express disponível em: http://localhost:8081"
else
    echo "Erro ao iniciar MongoDB. Verificando logs..."
    docker compose logs mongodb
    exit 1
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências do Node.js..."
    npm install
fi

# Iniciar aplicação
echo "Iniciando aplicação..."
echo "Chat estará disponível em: http://localhost:3000"
echo "MongoDB Admin em: http://localhost:8081"
echo ""
echo "Para parar os containers: ./stop.sh"
echo "Para ver logs: docker compose logs -f"
echo ""

npm run dev
