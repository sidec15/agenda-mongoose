// Set DEBUG environment variable BEFORE importing any modules
process.env.DEBUG = 'agenda:*';

import mongoose, { Connection } from 'mongoose';
import { Agenda } from '.';
import { MongoClient } from 'mongodb';

async function testDifferenceInFindOneAndUpdate() {
	console.log(
		`🧪 Testing findOneAndUpdate`
	);

	try {
		let dbMongo: any = null;
		let dbMongoose: any = null;
		const mongoUrl = 'mongodb://localhost:27017/agenda-test';

		// Connect with Mongoose first
		await mongoose.connect('mongodb://localhost:27017/agenda-test');
		console.log('✅ Mongoose connected');

		dbMongoose = mongoose.connection.db;

		// connect with mongo driver
		const mongoClient = await MongoClient.connect(mongoUrl, {
			// useNewUrlParser: true,
			// useUnifiedTopology: true
		});
		dbMongo = mongoClient.db();

    //####### Mongoose part #######
		// Now clean the people collection
		const mongoosepeopleCollection = dbMongoose.collection('people_mongoose');
		await mongoosepeopleCollection.deleteMany({});
		console.log('✅ Cleaned people collection');
		// Now add a person
		await mongoosepeopleCollection.insertOne({
			name: 'John Doe',
			age: 30,
			createdAt: new Date()
		});
		console.log('✅ Added a person to the people collection');
		// Now try the findOneAndUpdate operation
		const mongoosePerson = await mongoosepeopleCollection.findOneAndUpdate(
			{ name: 'John Doe' },
			{ $set: { name: 'Jane Doe', age: 31 } },
			{ returnDocument: 'after' }
		);
		console.log('✅ Updated person:', mongoosePerson);

    //####### Mongo part #######

		const mongoPeopleCollection = dbMongo.collection('people_mongo');
		await mongoPeopleCollection.deleteMany({});
		console.log('✅ Cleaned people collection');
		// Now add a person
		await mongoPeopleCollection.insertOne({
			name: 'John Doe',
			age: 30,
			createdAt: new Date()
		});
		console.log('✅ Added a person to the people collection');
		// Now try the findOneAndUpdate operation
		const mongoPerson = await mongoPeopleCollection.findOneAndUpdate(
			{ name: 'John Doe' },
			{ $set: { name: 'Jane Doe', age: 31 } },
			{ returnDocument: 'after' }
		);
		console.log('✅ Updated person:', mongoPerson);


    // Now compare the results
    console.log('🔍 Comparing results...');
    console.log('Mongoose person:', mongoosePerson);
    console.log('MongoDB person:', mongoPerson);

		// Just end the process
		return;
	} catch (error) {
		console.error('💥 Test failed with error:', error);
	} finally {
		await mongoose.disconnect();
		console.log('🔌 Mongoose disconnected');
		process.exit(0);
	}
}

// Run the test
testDifferenceInFindOneAndUpdate()
	.then(() => console.log('🧪 Test completed'))
	.catch(error => console.error('❌ Test failed:', error));
