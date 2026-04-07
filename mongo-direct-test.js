const { MongoClient } = require('mongodb');

// Try direct connection without SRV to get raw connection error
const uri = "mongodb://kinfenati7_db_user:Nat2325@ac-arihtqu-shard-00-00.je5wyyt.mongodb.net:27017,ac-arihtqu-shard-00-01.je5wyyt.mongodb.net:27017,ac-arihtqu-shard-00-02.je5wyyt.mongodb.net:27017/clinic-cms?ssl=true&replicaSet=atlas-xxx-shard-0&authSource=admin&retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000
});

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully!");
  } catch (err) {
    console.log("ERROR TYPE:", err.constructor.name);
    console.log("ERROR NAME:", err.name);
    console.log("ERROR MESSAGE:", err.message);
    if (err.cause) {
      console.log("ERROR CAUSE:", err.cause);
    }
  } finally {
    await client.close();
  }
}
run();
