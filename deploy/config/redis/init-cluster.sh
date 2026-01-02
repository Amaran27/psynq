#!/bin/bash
# Redis Cluster Formation Script
# Phase 1 Infrastructure - 3 Masters + 3 Replicas
# Psitrix Psynq CPaaS Platform

set -e

echo "========================================="
echo "Redis Cluster Formation"
echo "========================================="

# Configuration
REDIS_NODES=(
    "redis_master_1:6379"
    "redis_master_2:6379"
    "redis_master_3:6379"
    "redis_replica_1:6379"
    "redis_replica_2:6379"
    "redis_replica_3:6379"
)

REDIS_PASSWORD_FILE="/run/secrets/redis_password"

# Read Redis password from secret
if [ -f "$REDIS_PASSWORD_FILE" ]; then
    REDIS_PASSWORD=$(cat "$REDIS_PASSWORD_FILE")
else
    echo "ERROR: Redis password file not found at $REDIS_PASSWORD_FILE"
    exit 1
fi

# Wait for all Redis nodes to be ready
echo "Waiting for Redis nodes to be ready..."
for node in "${REDIS_NODES[@]}"; do
    host=$(echo "$node" | cut -d: -f1)
    port=$(echo "$node" | cut -d: -f2)
    
    echo "Checking $host:$port..."
    until redis-cli -h "$host" -p "$port" -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; do
        echo "  $host:$port is unavailable - sleeping"
        sleep 2
    done
    echo "  $host:$port is ready"
done

echo ""
echo "All Redis nodes are ready!"
echo ""

# Check if cluster is already initialized
echo "Checking if cluster is already formed..."
CLUSTER_INFO=$(redis-cli -h redis_master_1 -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning cluster info 2>/dev/null || echo "")

if echo "$CLUSTER_INFO" | grep -q "cluster_state:ok"; then
    echo "Cluster is already formed and healthy."
    echo ""
    echo "Cluster Info:"
    redis-cli -h redis_master_1 -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning cluster info
    echo ""
    echo "Cluster Nodes:"
    redis-cli -h redis_master_1 -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning cluster nodes
    exit 0
fi

# Create cluster with 3 masters and 3 replicas
echo "Initializing Redis Cluster (3 masters + 3 replicas)..."
echo ""

redis-cli --cluster create \
    redis_master_1:6379 \
    redis_master_2:6379 \
    redis_master_3:6379 \
    redis_replica_1:6379 \
    redis_replica_2:6379 \
    redis_replica_3:6379 \
    -a "$REDIS_PASSWORD" \
    --cluster-replicas 1 \
    --cluster-yes

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "Redis Cluster formed successfully!"
    echo "========================================="
    echo ""
    echo "Cluster Info:"
    redis-cli -h redis_master_1 -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning cluster info
    echo ""
    echo "Cluster Nodes:"
    redis-cli -h redis_master_1 -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning cluster nodes
    echo ""
    echo "Cluster Slots:"
    redis-cli -h redis_master_1 -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning cluster slots
else
    echo "ERROR: Cluster formation failed."
    exit 1
fi
