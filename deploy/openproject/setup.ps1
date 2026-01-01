# OpenProject Setup Script for Psitrix Psynq (Windows PowerShell)
# This script deploys OpenProject and configures the MCP server

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "OpenProject Deployment for Psitrix Psynq" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = $PSScriptRoot
Set-Location $ScriptDir

# Step 1: Check if Docker is running
Write-Host "[1/7] Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Step 2: Create .env file if it doesn't exist
Write-Host ""
Write-Host "[2/7] Setting up environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env file from .env.example" -ForegroundColor Green
    Write-Host "WARNING: Please edit .env and add your OpenProject API key later" -ForegroundColor Yellow
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

# Step 3: Check if uv is installed
Write-Host ""
Write-Host "[3/7] Checking uv (Python package manager)..." -ForegroundColor Yellow
try {
    $uvVersion = uv --version 2>$null
    if ($uvVersion) {
        Write-Host "uv is installed: $uvVersion" -ForegroundColor Green
    } else {
        throw "uv not found"
    }
} catch {
    Write-Host "WARNING: uv is not installed. Installing..." -ForegroundColor Yellow
    try {
        powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
        Write-Host "uv installed successfully" -ForegroundColor Green
        Write-Host "Please restart your terminal and run this script again" -ForegroundColor Yellow
        exit 0
    } catch {
        Write-Host "ERROR: Failed to install uv. Please install manually: https://docs.astral.sh/uv/" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Clone MCP server if it doesn't exist
Write-Host ""
Write-Host "[4/7] Setting up OpenProject MCP server..." -ForegroundColor Yellow
if (-not (Test-Path openproject-mcp-server)) {
    Write-Host "Cloning OpenProject MCP server..." -ForegroundColor Cyan
    git clone https://github.com/AndyEverything/openproject-mcp-server.git
    Set-Location openproject-mcp-server
    
    # Install dependencies
    Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
    uv sync
    
    Set-Location ..
    Write-Host "MCP server installed" -ForegroundColor Green
} else {
    Write-Host "MCP server directory already exists" -ForegroundColor Green
}

# Step 5: Start OpenProject containers
Write-Host ""
Write-Host "[5/7] Starting OpenProject containers..." -ForegroundColor Yellow
docker-compose up -d

# Step 6: Wait for OpenProject to be healthy
Write-Host ""
Write-Host "[6/7] Waiting for OpenProject to start (this may take 2-3 minutes)..." -ForegroundColor Yellow
$maxAttempts = 60
$attempt = 0
while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "OpenProject is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Continue waiting
    }
    $attempt++
    Write-Host "Waiting... ($attempt/$maxAttempts)" -ForegroundColor Cyan
    Start-Sleep -Seconds 3
}

if ($attempt -eq $maxAttempts) {
    Write-Host "ERROR: OpenProject failed to start. Check logs with: docker-compose logs" -ForegroundColor Red
    exit 1
}

# Step 7: Display next steps
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open OpenProject in your browser:" -ForegroundColor White
Write-Host "   http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Login with default credentials:" -ForegroundColor White
Write-Host "   Username: admin" -ForegroundColor Yellow
Write-Host "   Password: admin" -ForegroundColor Yellow
Write-Host "   WARNING: CHANGE YOUR PASSWORD IMMEDIATELY!" -ForegroundColor Red
Write-Host ""
Write-Host "3. Generate API Key for MCP Server:" -ForegroundColor White
Write-Host "   - Click your avatar (top right)" -ForegroundColor Gray
Write-Host "   - Go to: My account -> Access tokens" -ForegroundColor Gray
Write-Host "   - Click: + Add" -ForegroundColor Gray
Write-Host "   - Name it: MCP Server" -ForegroundColor Gray
Write-Host "   - Copy the generated token" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Configure MCP Server:" -ForegroundColor White
Write-Host "   - Edit: .env file (in current directory)" -ForegroundColor Gray
Write-Host "   - Set: OPENPROJECT_API_KEY=your_copied_token" -ForegroundColor Gray
Write-Host "   - Edit: openproject-mcp-server\env_example.txt" -ForegroundColor Gray
Write-Host "   - Copy to: openproject-mcp-server\.env" -ForegroundColor Gray
Write-Host "   - Add your API key there too" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Configure Claude Desktop:" -ForegroundColor White
Write-Host "   - Copy: ..\.mcp\claude_desktop_config.json" -ForegroundColor Gray
Write-Host "   - To: %APPDATA%\Claude\claude_desktop_config.json" -ForegroundColor Gray
Write-Host "   - Update the API key in the config" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Test MCP Server:" -ForegroundColor White
Write-Host "   - Run: cd openproject-mcp-server; uv run python openproject-mcp.py" -ForegroundColor Gray
Write-Host "   - In Claude, ask: Test the OpenProject connection" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Container status
Write-Host "[7/7] Container Status:" -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "For detailed documentation, see: README.md" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to open browser
$openBrowser = Read-Host "Open OpenProject in browser? (Y/N)"
if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
    Start-Process "http://localhost:8080"
}
