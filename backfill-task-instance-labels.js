const { MongoClient, ObjectId } = require('mongodb');

(async () => {
	const client = new MongoClient('mongodb://localhost:27017');
	await client.connect();
	const db = client.db('clinic-cms');
	const tasks = db.collection('nursetasks');

	// Group by patient + medication and assign instanceOrder/instanceLabel by createdAt asc
	const cursor = tasks.aggregate([
		{ $match: { taskType: 'MEDICATION', 'medicationDetails.medicationName': { $exists: true } } },
		{ $sort: { createdAt: 1 } },
		{ $project: { _id: 1, patientId: 1, createdAt: 1, med: '$medicationDetails.medicationName' } }
	]);

	const groups = new Map();
	while (await cursor.hasNext()) {
		const doc = await cursor.next();
		const key = `${String(doc.patientId)}|${String(doc.med).toLowerCase()}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(doc);
	}

	const suffix = (n) => {
		if (n % 10 === 1 && n % 100 !== 11) return 'st';
		if (n % 10 === 2 && n % 100 !== 12) return 'nd';
		if (n % 10 === 3 && n % 100 !== 13) return 'rd';
		return 'th';
	};

	let updated = 0;
	for (const [, list] of groups) {
		for (let i = 0; i < list.length; i++) {
			const order = i + 1;
			const label = `${order}${suffix(order)}`;
			await tasks.updateOne(
				{ _id: list[i]._id },
				{ $set: { 'medicationDetails.instanceOrder': order, 'medicationDetails.instanceLabel': label } }
			);
			updated++;
		}
	}

	console.log(`Updated ${updated} tasks with instance labels.`);
	await client.close();
	process.exit(0);
})();


