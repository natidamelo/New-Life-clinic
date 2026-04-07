const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://kinfenati7_db_user:Nat2325@cluster0.je5wyyt.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000
});

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully!");
    const db = client.db("clinic-cms");
    const ping = await db.command({ ping: 1 });
    console.log("Ping:", ping);
  } catch (err) {
    console.log("ERROR NAME:", err.name);
    console.log("ERROR:", err.message);
    if (err.cause) {
      console.log("CAUSE:", err.cause);
    }
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
