// Set DEBUG environment variable BEFORE importing any modules
process.env.DEBUG = 'agenda:*';

import mongoose from 'mongoose';
import { Agenda } from '.';
import { MongoClient } from 'mongodb';

const REUSE_MONGO_CONNECTION = process.env.REUSE_MONGO_CONNECTION === 'true';
const USE_MONGOOSE = process.env.USE_MONGOOSE === 'true';

interface TestData {
	message: string;
	timestamp: Date;
}

let testResult = 'not executed';

async function testAgendaWithExistingConnection() {
	console.log(`🧪 Testing Agenda with REUSE_MONGO_CONNECTION=${REUSE_MONGO_CONNECTION}`);

	try {
		let db: any = null;
		const mongoUrl = 'mongodb://localhost:27017/agenda-test';

		if (USE_MONGOOSE) {
			// Connect with Mongoose first
			await mongoose.connect('mongodb://localhost:27017/agenda-test');
			console.log('✅ Mongoose connected');

			// Clean up any existing jobs
			db = mongoose.connection.db;
		} else {
			// connect with mongo driver
			const mongoClient = await MongoClient.connect(mongoUrl, {
				// useNewUrlParser: true,
				// useUnifiedTopology: true
			});
			db = mongoClient.db();
		}

		if (!db) {
			console.error('❌ Failed to get database connection from Mongoose');
			return;
		}
		try {
			await db.dropCollection('agendaJobs');
			console.log('🗑️ Dropped existing agendaJobs collection');
		} catch (error) {
			console.log('ℹ️ No existing agendaJobs collection to drop');
		}

		let agenda: Agenda;

		if (REUSE_MONGO_CONNECTION) {
			console.log('🔄 Creating Agenda with reused Mongoose connection');
			agenda = new Agenda({
				mongo: db as any,
				processEvery: '1 second',
				maxConcurrency: 1,
				defaultConcurrency: 1
			});
			console.log('✅ Created Agenda with reused Mongoose connection');
		} else {
			console.log('🆕 Creating Agenda with new connection');
			agenda = new Agenda({
				db: { address: 'mongodb://localhost:27017/agenda-test' },
				processEvery: '1 second',
				maxConcurrency: 1,
				defaultConcurrency: 1
			});
		}

		// Define a simple job
		agenda.define('test-job', async job => {
			const data = job.attrs.data as TestData;
			console.log(`🚀 Job executed: ${data.message} at ${data.timestamp}`);
			testResult = 'executed successfully';
		});

		// Wait for agenda to be ready and start it
		await agenda.start();
		console.log('✅ Agenda started');

		// Schedule a job
		const jobData: TestData = {
			message: 'Hello from test job',
			timestamp: new Date()
		};

		console.log('📋 Scheduling job...');
		await agenda.schedule('in 2 seconds', 'test-job', jobData);
		console.log('✅ Job scheduled');

		// Wait for job to execute
		console.log('⏳ Waiting for job execution...');
		let attempts = 0;
		while (testResult === 'not executed' && attempts < 10) {
			await new Promise(resolve => setTimeout(resolve, 1000));
			attempts++;
			console.log(`⏳ Waiting... attempt ${attempts}/10`);
		}

		// Check result
		if (testResult === 'executed successfully') {
			console.log('🎉 SUCCESS: Job executed successfully!');
		} else {
			console.log('❌ FAILURE: Job did not execute');

			// Debug: Check jobs in database
			const jobs = await agenda.jobs({});
			console.log(
				'🔍 Jobs in database:',
				jobs.map(j => ({
					id: j.attrs._id,
					name: j.attrs.name,
					nextRunAt: j.attrs.nextRunAt,
					lockedAt: j.attrs.lockedAt,
					disabled: j.attrs.disabled,
					lastRunAt: j.attrs.lastRunAt,
					failedAt: j.attrs.failedAt
				}))
			);
		}

		await agenda.stop();
		console.log('🛑 Agenda stopped');
	} catch (error) {
		console.error('💥 Test failed with error:', error);
	} finally {
		await mongoose.disconnect();
		console.log('🔌 Mongoose disconnected');
		process.exit(0);
	}
}

// Run the test
testAgendaWithExistingConnection();
