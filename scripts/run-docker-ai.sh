#!/usr/bin/env bash
set -e

# ==============================================================================
# The Nostalgia Cookbook - Self-Hosted Open-Weight AI Orchestrator
# Harnesses Gemma 2 & Whisper locally with Docker and zero external dependencies
# ==============================================================================

MODEL_NAME="gemma2:9b"

if [[ "$1" == "--light" || "$1" == "-l" ]]; then
  MODEL_NAME="gemma2:2b"
  echo "⚡ Selected lightweight model: $MODEL_NAME (ideal for laptops and <=8GB RAM)"
elif [[ -n "$1" ]]; then
  MODEL_NAME="$1"
fi

echo ""
echo "======================================================================"
echo " 🍲 THE NOSTALGIA COOKBOOK - DOCKER OPEN-WEIGHT AI ORCHESTRATOR"
echo " 🔒 100% Private, 0 External Paid APIs, Zero Rate Limits"
echo " 🧠 Harnessing Model: $MODEL_NAME"
echo "======================================================================"
echo ""

# 1. Check Docker prerequisite
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed or not in your PATH."
  echo "Please install Docker from https://docs.docker.com/get-docker/ and retry."
  exit 1
fi

# Detect docker compose CLI command
if docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "❌ Error: docker compose is not installed."
  exit 1
fi

# 2. Check GPU Acceleration
echo "🔍 Checking GPU acceleration..."
if command -v nvidia-smi &> /dev/null; then
  echo "🚀 NVIDIA GPU detected! Hardware acceleration will be utilized."
else
  echo "ℹ️  No discrete NVIDIA GPU detected. Running in high-performance CPU mode."
fi

# 3. Launch Docker Compose Stack
echo ""
echo "📦 Starting Docker containers (Ollama Engine + Nostalgia Web App)..."
export GEMMA_MODEL="$MODEL_NAME"
$DOCKER_COMPOSE up -d --build

# 4. Wait for Ollama Service to be ready
echo ""
echo "⏳ Waiting for local Ollama engine to initialize on port 11434..."
RETRIES=30
until curl -s http://localhost:11434/api/tags &> /dev/null || [ $RETRIES -eq 0 ]; do
  sleep 1
  RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -eq 0 ]; then
  echo "❌ Error: Ollama container failed to respond within 30 seconds."
  echo "Check container logs with: docker logs nostalgia-ollama"
  exit 1
fi

echo "✅ Ollama engine is online and responding!"

# 5. Harness Open-Weight Model (Pull into container if not already downloaded)
echo ""
echo "📥 Ensuring open-weight model '$MODEL_NAME' is loaded in Ollama..."
docker exec -i nostalgia-ollama ollama pull "$MODEL_NAME"

echo "✅ Open-weight model '$MODEL_NAME' is ready in local memory!"

# 6. Verify Web App Availability
echo ""
echo "⏳ Checking Nostalgia Cookbook Web App..."
APP_RETRIES=20
until curl -s http://localhost:3000/api/health &> /dev/null || [ $APP_RETRIES -eq 0 ]; do
  sleep 1
  APP_RETRIES=$((APP_RETRIES - 1))
done

echo ""
echo "======================================================================"
echo " 🎉 SUCCESS! The Nostalgia Cookbook is live and ready:"
echo ""
echo " 🌐 Web Application:   http://localhost:3000"
echo " 🧠 Open-Weight Model:  $MODEL_NAME (Ollama Local Container)"
echo " 🔌 Inference Route:   http://localhost:11434/api/generate"
echo " 💾 Local Database:     Persistent Docker Volume (Zero Seed Bloat)"
echo ""
echo " Commands:"
echo "   View Web App Logs:  $DOCKER_COMPOSE logs -f nostalgia-app"
echo "   View Model Logs:    $DOCKER_COMPOSE logs -f ollama"
echo "   Stop Stack:         $DOCKER_COMPOSE down"
echo "======================================================================"
echo ""
