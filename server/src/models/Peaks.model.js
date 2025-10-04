// Peaks.model.js
const mongoose = require('mongoose');

const PeakSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'LineString', 'Polygon'], // adjust according to your data
      required: true
    },
    coordinates: {
      type: Array, // [Number, Number] for Point, [[Number]] for LineString/Polygon
      required: true
    }
  },
  properties: {
    natural: { type: String, required: true },
    name: String,
    alt_name: String,
    "alt_name:en": String,
    "alt_name:ja": String,
    "alt_name:ko": String,
    elevation: String,
    ele: mongoose.Schema.Types.Mixed, // supports integer or Double
    prominence: String,
    isolation: String,
    landform: String,
    landmark: String,
    wikidata: String,
    wikipedia: String,
    website: String,
    description: String,
    tourism: String,
    designation: String
    // Add more fields if you want, no need to include every language
  },
  type: {
    type: String,
    required: true
  }
});

// 2dsphere index for geospatial queries
PeakSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Peak', PeakSchema);
