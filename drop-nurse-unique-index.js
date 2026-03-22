const { MongoClient } = require('mongodb');

(async () => {
	try {
		const client = new MongoClient('mongodb://localhost:27017');
		await client.connect();
		const db = client.db('clinic-cms');
		const coll = db.collection('nursetasks');

		const indexes = await coll.indexes();
		console.log('INDEXES BEFORE:', indexes.map(i => ({ name: i.name, key: i.key, unique: i.unique })));

		// Find any unique index on patientId + medicationDetails.medicationName
		const uniqueIdx = indexes.find(i => i.unique && i.key && i.key.patientId && i.key['medicationDetails.medicationName']);
		if (uniqueIdx) {
			await coll.dropIndex(uniqueIdx.name);
			console.log('Dropped unique index:', uniqueIdx.name);
		} else {
			try {
				await coll.dropIndex({ patientId: 1, 'medicationDetails.medicationName': 1 });
				console.log('Dropped compound index by key');
			} catch (e) {
				console.log('No matching unique index found:', e.message);
			}
		}

		const after = await coll.indexes();
		console.log('INDEXES AFTER:', after.map(i => ({ name: i.name, key: i.key, unique: i.unique })));
		await client.close();
		process.exit(0);
	} catch (e) {
		console.error('Failed to drop index:', e);
		process.exit(1);
	}
})();


