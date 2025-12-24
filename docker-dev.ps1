# Docker Build and Run Script for Psynq Development
# This script helps build and run the Docker containers properly in WSL2

Write-Host "=== Psynq Docker Development Setup ===" -ForegroundColor Cyan
Write-Host ""

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Check Docker status
if (-not (Test-DockerRunning)) {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "Docker is running..." -ForegroundColor Green
Write-Host ""

# Parse command line arguments
param(
    [Parameter(Position=0)]
    [ValidateSet('build', 'up', 'down', 'restart', 'logs', 'clean')]
    [string]$Command = 'build',
    
    [switch]$NoCache
)

switch ($Command) {
    'build' {
        Write-Host "Building Docker images..." -ForegroundColor Yellow
        Write-Host "This may take 5-10 minutes on first build (compiling mediasoup)..." -ForegroundColor Yellow
        Write-Host ""
        
        if ($NoCache) {
            docker-compose -f docker-compose.dev.yml build --no-cache --progress=plain
        } else {
            docker-compose -f docker-compose.dev.yml build --progress=plain
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Build completed successfully!" -ForegroundColor Green
            Write-Host "Run './docker-dev.ps1 up' to start the containers." -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "Build failed! Check the errors above." -ForegroundColor Red
        }
    }
    
    'up' {
        Write-Host "Starting Docker containers..." -ForegroundColor Yellow
        docker-compose -f docker-compose.dev.yml up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Containers started successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Services:" -ForegroundColor Cyan
            Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
            Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
            Write-Host ""
            Write-Host "To view logs: ./docker-dev.ps1 logs" -ForegroundColor Cyan
            Write-Host "To stop:      ./docker-dev.ps1 down" -ForegroundColor Cyan
        }
    }
    
    'down' {
        Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
        docker-compose -f docker-compose.dev.yml down
        Write-Host "Containers stopped." -ForegroundColor Green
    }
    
    'restart' {
        Write-Host "Restarting Docker containers..." -ForegroundColor Yellow
        docker-compose -f docker-compose.dev.yml restart
        Write-Host "Containers restarted." -ForegroundColor Green
    }
    
    'logs' {
        Write-Host "Showing container logs (Ctrl+C to exit)..." -ForegroundColor Yellow
        docker-compose -f docker-compose.dev.yml logs -f
    }
    
    'clean' {
        Write-Host "Cleaning up Docker resources..." -ForegroundColor Yellow
        Write-Host "This will remove containers, volumes, and images." -ForegroundColor Red
        $confirm = Read-Host "Are you sure? (y/N)"
        
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            docker-compose -f docker-compose.dev.yml down -v
            docker system prune -f
            Write-Host "Cleanup completed." -ForegroundColor Green
        } else {
            Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        }
    }
}
