#!/bin/bash
# OpenProject Setup Script for Psitrix Psynq
# This script deploys OpenProject and configures the MCP server

set -e  # Exit on error

echo "=========================================="
echo "OpenProject Deployment for Psitrix Psynq"
echo "=========================================="

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Step 1: Check if Docker is running
echo ""
echo "[1/7] Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi
echo "✅ Docker is running"

# Step 2: Create .env file if it doesn't exist
echo ""
echo "[2/7] Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Please edit .env and add your OpenProject API key later"
else
    echo "✅ .env file already exists"
fi

# Step 3: Clone MCP server if it doesn't exist
echo ""
echo "[3/7] Setting up OpenProject MCP server..."
if [ ! -d openproject-mcp-server ]; then
    echo "Cloning OpenProject MCP server..."
    git clone https://github.com/AndyEverything/openproject-mcp-server.git
    cd openproject-mcp-server
    
    # Check if uv is installed
    if ! command -v uv &> /dev/null; then
        echo "⚠️  uv is not installed. Installing..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    # Install dependencies
    echo "Installing Python dependencies..."
    uv sync
    
    cd ..
    echo "✅ MCP server installed"
else
    echo "✅ MCP server directory already exists"
fi

# Step 4: Start OpenProject containers
echo ""
echo "[4/7] Starting OpenProject containers..."
docker-compose up -d

# Step 5: Wait for OpenProject to be healthy
echo ""
echo "[5/7] Waiting for OpenProject to start (this may take 2-3 minutes)..."
max_attempts=60
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8080/ > /dev/null 2>&1; then
        echo "✅ OpenProject is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting... ($attempt/$max_attempts)"
    sleep 3
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ OpenProject failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Step 6: Display next steps
echo ""
echo "[6/7] OpenProject is running!"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📋 NEXT STEPS:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  Open OpenProject in your browser:"
echo "   🌐 http://localhost:8080"
echo ""
echo "2️⃣  Login with default credentials:"
echo "   👤 Username: admin"
echo "   🔑 Password: admin"
echo "   ⚠️  CHANGE YOUR PASSWORD IMMEDIATELY!"
echo ""
echo "3️⃣  Generate API Key for MCP Server:"
echo "   • Click your avatar (top right)"
echo "   • Go to: My account → Access tokens"
echo "   • Click: + Add"
echo "   • Name it: 'MCP Server'"
echo "   • Copy the generated token"
echo ""
echo "4️⃣  Configure MCP Server:"
echo "   • Edit: .env file"
echo "   • Set: OPENPROJECT_API_KEY=your_copied_token"
echo "   • Edit: openproject-mcp-server/env_example.txt"
echo "   • Copy to: openproject-mcp-server/.env"
echo "   • Add your API key there too"
echo ""
echo "5️⃣  Configure Claude Desktop:"
echo "   • Copy: .mcp/claude_desktop_config.json"
echo "   • Windows: To %APPDATA%\\Claude\\claude_desktop_config.json"
echo "   • macOS: To ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   • Update the API key in the config"
echo ""
echo "6️⃣  Test MCP Server:"
echo "   • Run: cd openproject-mcp-server && uv run python openproject-mcp.py"
echo "   • In Claude, ask: 'Test the OpenProject connection'"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Step 7: Show container status
echo "[7/7] Container Status:"
docker-compose ps

echo ""
echo "✅ Setup complete!"
echo ""
echo "📖 For detailed documentation, see: README.md"
echo ""
