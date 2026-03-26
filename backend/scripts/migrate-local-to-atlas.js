const mongoose = require('mongoose');

async function connect(uri, label) {
  const conn = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 60000,
    maxPoolSize: 10
  }).asPromise();
  console.log(`Connected: ${label}`);
  return conn;
}

async function main() {
  const localUri = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017';
  const atlasUri = process.env.ATLAS_MONGO_URI;
  const dbName = process.env.DB_NAME || 'clinic-cms';
  const batchSize = Number(process.env.BATCH_SIZE || 500);

  if (!atlasUri) {
    throw new Error('Missing ATLAS_MONGO_URI env var');
  }

  const localConn = await connect(localUri, 'local');
  const atlasConn = await connect(atlasUri, 'atlas');

  try {
    const localDb = localConn.useDb(dbName, { useCache: true }).db;
    const atlasDb = atlasConn.useDb(dbName, { useCache: true }).db;

    const collections = await localDb.listCollections({}, { nameOnly: true }).toArray();
    console.log(`DB: ${dbName}`);
    console.log(`Collections found: ${collections.length}`);

    let totalRead = 0;
    let totalUpserted = 0;
    let totalModified = 0;
    let totalFailed = 0;

    for (const { name } of collections) {
      const src = localDb.collection(name);
      const dst = atlasDb.collection(name);
      const cursor = src.find({});
      let ops = [];
      let readCount = 0;
      let upsertedCount = 0;
      let modifiedCount = 0;
      let failedCount = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        readCount += 1;
        ops.push({
          replaceOne: {
            filter: { _id: doc._id },
            replacement: doc,
            upsert: true
          }
        });

        if (ops.length >= batchSize) {
          try {
            const result = await dst.bulkWrite(ops, { ordered: false });
            upsertedCount += result.upsertedCount || 0;
            modifiedCount += result.modifiedCount || 0;
          } catch (e) {
            failedCount += ops.length;
            console.error(`Collection ${name}: batch failed - ${e.message}`);
          }
          ops = [];
        }
      }

      if (ops.length) {
        try {
          const result = await dst.bulkWrite(ops, { ordered: false });
          upsertedCount += result.upsertedCount || 0;
          modifiedCount += result.modifiedCount || 0;
        } catch (e) {
          failedCount += ops.length;
          console.error(`Collection ${name}: final batch failed - ${e.message}`);
        }
      }

      totalRead += readCount;
      totalUpserted += upsertedCount;
      totalModified += modifiedCount;
      totalFailed += failedCount;

      console.log(
        `${name}: read=${readCount}, inserted=${upsertedCount}, updated=${modifiedCount}, failed=${failedCount}`
      );
    }

    console.log('--- Migration complete ---');
    console.log(
      `Total: read=${totalRead}, inserted=${totalUpserted}, updated=${totalModified}, failed=${totalFailed}`
    );
    console.log('Local data was not modified.');
  } finally {
    await localConn.close();
    await atlasConn.close();
  }
}

main().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});

