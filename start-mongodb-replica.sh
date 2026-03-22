#!/bin/bash
# Bash script to start MongoDB replica set on Linux/Mac

echo "🚀 Starting MongoDB Replica Set..."

# Create data directories
echo ""
echo "📁 Creating data directories..."
mkdir -p /tmp/mongodb/rs0-0 /tmp/mongodb/rs0-1 /tmp/mongodb/rs0-2
echo "✅ Data directories created"

# Start MongoDB instances
echo ""
echo "🔄 Starting MongoDB instances..."

# Instance 1 (Port 27017)
mongod --replSet rs0 --port 27017 --dbpath /tmp/mongodb/rs0-0 --bind_ip localhost --fork --logpath /tmp/mongodb/rs0-0.log
echo "✅ Started MongoDB on port 27017"

# Instance 2 (Port 27018)
mongod --replSet rs0 --port 27018 --dbpath /tmp/mongodb/rs0-1 --bind_ip localhost --fork --logpath /tmp/mongodb/rs0-1.log
echo "✅ Started MongoDB on port 27018"

# Instance 3 (Port 27019)
mongod --replSet rs0 --port 27019 --dbpath /tmp/mongodb/rs0-2 --bind_ip localhost --fork --logpath /tmp/mongodb/rs0-2.log
echo "✅ Started MongoDB on port 27019"

echo ""
echo "⏳ Waiting 10 seconds for MongoDB to start..."
sleep 10

echo ""
echo "📝 Next steps:"
echo "1. Run: mongosh --port 27017"
echo "2. In mongosh, run the following command to initialize the replica set:"
echo ""
echo 'rs.initiate({'
echo '  _id: "rs0",'
echo '  members: ['
echo '    { _id: 0, host: "localhost:27017" },'
echo '    { _id: 1, host: "localhost:27018" },'
echo '    { _id: 2, host: "localhost:27019" }'
echo '  ]'
echo '})'
echo ""
echo "3. Wait 10 seconds and run: rs.status()"
echo "4. Update your .env file:"
echo '   MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/clinic_db?replicaSet=rs0'
echo ""
echo "✅ MongoDB replica set processes started!"
echo ""
echo "To stop the replica set later, run: ./stop-mongodb-replica.sh"

