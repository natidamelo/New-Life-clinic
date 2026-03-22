#!/bin/bash
# Bash script to stop MongoDB replica set on Linux/Mac

echo "🛑 Stopping MongoDB Replica Set..."

# Stop all mongod processes
pkill -f "mongod --replSet rs0"

echo "✅ MongoDB replica set stopped"
echo ""
echo "Note: Data is preserved in /tmp/mongodb/rs0-* directories"
echo "To start again, run: ./start-mongodb-replica.sh"

