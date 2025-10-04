const mongoose = require('mongoose');

const CoastlineSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'LineString', 'Polygon'], // adjust as needed
      required: true
    },
    coordinates: {
      type: Array, // [[Number]] for LineString/Polygon, flexible enough
      required: true
    }
  },
  properties: {
    natural: { type: String, required: true },
    name: String,
    "alt_name:en": String,
    "alt_name:fr": String,
    "alt_name:it": String,
    // add more fields you need from your schema
    place: String,
    population: String,
    wikidata: String,
    wikipedia: String
  },
  type: {
    type: String,
    required: true
  }
});

// 2dsphere index for geospatial queries
CoastlineSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Coastline', CoastlineSchema);
