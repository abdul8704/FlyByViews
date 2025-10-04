const mongoose = require('mongoose');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Import models
const Volcano = require('../models/Volcano.model');
const Peak = require('../models/Peaks.model');
const Coastline = require('../models/Coastlines.model');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://abdul0910abd_db_user:hZQ0WiQh8uIzQYov@flybyviews.13vshgb.mongodb.net/');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Function to read NDJSON file and import to MongoDB
const importNDJSON = async (filePath, Model, collectionName) => {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const batchSize = 1000;
    let batch = [];
    let totalCount = 0;

    console.log(`Starting import of ${collectionName}...`);

    rl.on('line', (line) => {
      try {
        const feature = JSON.parse(line.trim());
        
        // Transform GeoJSON Feature to our schema format
        const document = {
          _id: new mongoose.Types.ObjectId(),
          geometry: {
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates
          },
          properties: feature.properties
        };

        batch.push(document);

        if (batch.length >= batchSize) {
          // Process batch
          Model.insertMany(batch)
            .then(() => {
              totalCount += batch.length;
              console.log(`${collectionName}: Imported ${totalCount} documents...`);
              batch = [];
            })
            .catch(error => {
              console.error(`Error importing batch for ${collectionName}:`, error);
            });
        }
      } catch (error) {
        console.error(`Error parsing line in ${collectionName}:`, error);
      }
    });

    rl.on('close', async () => {
      // Process remaining batch
      if (batch.length > 0) {
        try {
          await Model.insertMany(batch);
          totalCount += batch.length;
        } catch (error) {
          console.error(`Error importing final batch for ${collectionName}:`, error);
        }
      }
      
      console.log(`${collectionName}: Import completed. Total documents: ${totalCount}`);
      resolve(totalCount);
    });

    rl.on('error', (error) => {
      console.error(`Error reading file ${filePath}:`, error);
      reject(error);
    });
  });
};

// Main import function
const importAllData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing collections...');
    await Volcano.deleteMany({});
    await Peak.deleteMany({});
    await Coastline.deleteMany({});
    console.log('Collections cleared.');

    const dataDir = path.join(__dirname, '../../../overpass-data');

    // Import volcanoes
    const volcanoFile = path.join(dataDir, 'asia_volcanoes.ndjson');
    if (fs.existsSync(volcanoFile)) {
      await importNDJSON(volcanoFile, Volcano, 'Volcanoes');
    } else {
      console.log('Volcano file not found:', volcanoFile);
    }

    // Import peaks
    const peakFile = path.join(dataDir, 'asia_peaks.ndjson');
    if (fs.existsSync(peakFile)) {
      await importNDJSON(peakFile, Peak, 'Peaks');
    } else {
      console.log('Peak file not found:', peakFile);
    }

    // Import coastlines
    const coastlineFile = path.join(dataDir, 'asia_coastlines.ndjson');
    if (fs.existsSync(coastlineFile)) {
      await importNDJSON(coastlineFile, Coastline, 'Coastlines');
    } else {
      console.log('Coastline file not found:', coastlineFile);
    }

    console.log('\n=== Import Summary ===');
    const volcanoCount = await Volcano.countDocuments();
    const peakCount = await Peak.countDocuments();
    const coastlineCount = await Coastline.countDocuments();

    console.log(`Volcanoes: ${volcanoCount}`);
    console.log(`Peaks: ${peakCount}`);
    console.log(`Coastlines: ${coastlineCount}`);
    console.log('======================\n');

    // Test geospatial query to verify indexing
    console.log('Testing geospatial queries...');
    
    // Test around Chennai (13.0827, 80.2707)
    const testLocation = [80.2707, 13.0827]; // [longitude, latitude]
    const testRadius = 50000; // 50km in meters

    const nearbyVolcanoes = await Volcano.find({
      geometry: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: testLocation },
          $maxDistance: testRadius
        }
      }
    }).limit(5);

    const nearbyPeaks = await Peak.find({
      geometry: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: testLocation },
          $maxDistance: testRadius
        }
      }
    }).limit(5);

    const nearbyCoastlines = await Coastline.find({
      geometry: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: testLocation },
          $maxDistance: testRadius
        }
      }
    }).limit(5);

    console.log(`Found near Chennai (50km radius):`);
    console.log(`- Volcanoes: ${nearbyVolcanoes.length}`);
    console.log(`- Peaks: ${nearbyPeaks.length}`);
    console.log(`- Coastlines: ${nearbyCoastlines.length}`);

    if (nearbyVolcanoes.length > 0) {
      console.log(`Sample volcano: ${nearbyVolcanoes[0].properties.name || 'Unknown'}`);
    }
    if (nearbyPeaks.length > 0) {
      console.log(`Sample peak: ${nearbyPeaks[0].properties.name || 'Unknown'}`);
    }

    console.log('\nData import completed successfully!');
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

// Run the import
if (require.main === module) {
  importAllData();
}

module.exports = { importAllData };