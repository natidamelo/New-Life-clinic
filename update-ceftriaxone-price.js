const { MongoClient } = require('mongodb');

const dbURI = 'mongodb://localhost:27017/clinic-cms';
const dbName = 'clinic-cms';
const collectionName = 'inventoryitems';

const updateCeftriaxonePrice = async () => {
  const client = new MongoClient(dbURI);
  try {
    await client.connect();
    console.log('MongoDB connected');

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const filter = { name: { $regex: /^Ceftriaxone$/i } };
    const update = {
      $set: { sellingPrice: 250 },
      $setOnInsert: {
        name: 'Ceftriaxone',
        itemCode: 'MED-CET-001',
        category: 'medication',
        unit: 'Vial',
        costPrice: 200,
        quantity: 100,
        minimumStockLevel: 10,
        reorderPoint: 20,
        prescriptionRequired: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const result = await collection.findOneAndUpdate(filter, update, {
      returnDocument: 'after',
      upsert: true,
    });

    if (result.value) {
      console.log('Successfully found and updated the item:');
      console.log(result.value);
    } else {
      console.log('Could not find the item "Ceftriaxone", but it has been created.');
      const newItem = await collection.findOne(filter);
      console.log(newItem);
    }
  } catch (error) {
    console.error('Error updating price:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

updateCeftriaxonePrice();