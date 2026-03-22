#!/bin/bash
# Quick setup script for MongoDB Replica Set using Docker (Linux/Mac)

echo ""
echo "========================================"
echo "MongoDB Replica Set Setup (Docker)"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker is not installed"
    echo "Please install Docker from: https://www.docker.com/get-started"
    exit 1
fi

echo "[1/5] Checking Docker..."
if ! docker info &> /dev/null; then
    echo "❌ ERROR: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi
echo "✅ Docker is running"

echo ""
echo "[2/5] Stopping any existing MongoDB containers..."
docker-compose -f docker-compose.mongodb-replica.yml down -v &> /dev/null
echo "✅ Cleanup complete"

echo ""
echo "[3/5] Starting MongoDB Replica Set (3 containers)..."
docker-compose -f docker-compose.mongodb-replica.yml up -d
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to start containers"
    exit 1
fi
echo "✅ Containers started"

echo ""
echo "[4/5] Waiting 15 seconds for MongoDB to initialize..."
sleep 15

echo ""
echo "[5/5] Initializing Replica Set..."
docker exec mongo1 mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo1:27017'},{_id:1,host:'mongo2:27017'},{_id:2,host:'mongo3:27017'}]})" &> /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Replica set initialized"
else
    echo "ℹ️  Replica set may already be initialized (this is OK)"
fi

echo ""
echo "Waiting 10 seconds for replica set to elect primary..."
sleep 10

echo ""
echo "========================================"
echo "✅ MongoDB Replica Set is Ready!"
echo "========================================"
echo ""
echo "Ports:"
echo "  - Primary:   localhost:27017"
echo "  - Secondary: localhost:27018"
echo "  - Secondary: localhost:27019"
echo ""
echo "Connection String:"
echo "  mongodb://localhost:27017,localhost:27018,localhost:27019/clinic_db?replicaSet=rs0"
echo ""
echo "Next Steps:"
echo "  1. Update your .env file with the connection string above"
echo "  2. Test transactions: node backend/test-transactions.js"
echo "  3. Start your application"
echo ""
echo "To check status: docker exec mongo1 mongosh --eval 'rs.status()'"
echo "To stop:         docker-compose -f docker-compose.mongodb-replica.yml down"
echo ""

