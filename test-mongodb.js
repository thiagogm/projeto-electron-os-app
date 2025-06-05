const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'testDB';

async function testConnection() {
    const client = new MongoClient(url);

    try {
        // Connect to MongoDB
        await client.connect();
        console.log('Successfully connected to MongoDB!');

        // Get the database
        const db = client.db(dbName);
        
        // Test a simple operation
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections);

    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    } finally {
        // Close the connection
        await client.close();
    }
}

// Run the test
testConnection(); 