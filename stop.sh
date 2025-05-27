#!/bin/bash

# Script para parar o projeto Chat MongoDB

echo "Parando Sala de Chat com MongoDB..."

# Parar containers
echo "Parando containers MongoDB..."
docker compose down

echo "Containers parados com sucesso!"
echo "Os dados do MongoDB foram preservados no volume Docker."
echo ""
echo "Para iniciar novamente: ./start.sh"
echo "Para remover completamente (incluindo dados): docker-compose down -v"
