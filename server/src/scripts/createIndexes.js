// Script to create required MongoDB indexes for geospatial queries
const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const peaks = db.collection('peaks');
    const volcanoes = db.collection('volcanoes');
    const coastlines = db.collection('coastlines');

    console.log('Creating indexes...');

    // Create 2dsphere indexes for geospatial queries
    await peaks.createIndex({ "geometry": "2dsphere" });
    console.log('✅ Created 2dsphere index for peaks.geometry');

    await peaks.createIndex({ "properties.natural": 1 });
    console.log('✅ Created index for peaks.properties.natural');

    await volcanoes.createIndex({ "geometry": "2dsphere" });
    console.log('✅ Created 2dsphere index for volcanoes.geometry');

    await volcanoes.createIndex({ "properties.natural": 1 });
    console.log('✅ Created index for volcanoes.properties.natural');

    await coastlines.createIndex({ "geometry": "2dsphere" });
    console.log('✅ Created 2dsphere index for coastlines.geometry');

    await coastlines.createIndex({ "properties.natural": 1 });
    console.log('✅ Created index for coastlines.properties.natural');

    console.log('\n🎉 All indexes created successfully!');

    // Show index information
    const peakIndexes = await peaks.indexes();
    const volcanoIndexes = await volcanoes.indexes();
    const coastlineIndexes = await coastlines.indexes();

    console.log('\n📊 Index Summary:');
    console.log(`Peaks collection: ${peakIndexes.length} indexes`);
    console.log(`Volcanoes collection: ${volcanoIndexes.length} indexes`);
    console.log(`Coastlines collection: ${coastlineIndexes.length} indexes`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createIndexes();
}

module.exports = { createIndexes };