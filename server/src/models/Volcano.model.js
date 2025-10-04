const mongoose = require('mongoose');

const VolcanoSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'LineString', 'Polygon'], // usually Point for volcano coordinates
      required: true
    },
    coordinates: {
      type: [mongoose.Schema.Types.Mixed], // can be number or object like {"$numberDouble": "..."}
      required: true
    }
  },
  properties: {
    natural: { type: String, required: true },
    ele: mongoose.Schema.Types.Mixed, // supports integer or Double
    name: String,
    alt_name: String,
    "alt_name:en": String,
    "alt_name:ja": String,
    "alt_name:ko": String,
    description: String,
    "description:en": String,
    "description:ru": String,
    prominence: String,
    isolation: String,
    status: String,
    volcano: String,
    "volcano:last_eruption": String,
    "volcano:number_of_eruptions": String,
    "volcano:status": String,
    "volcano:type": String,
    wikidata: String,
    wikipedia: String,
    website: String,
    tourism: String,
    man_made: String,
    condition: String,
    heritage: String,
    image: String,
    url: String,
    fixme: String,
    owner: String,
    "survey_point:structure": String,
    location_name: String,
    "addr:street": String
    // Add more fields if needed, no need to include every alt_name/lang unless you use it
  },
  type: {
    type: String,
    required: true
  }
});

// 2dsphere index for geospatial queries
VolcanoSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Volcano', VolcanoSchema);
