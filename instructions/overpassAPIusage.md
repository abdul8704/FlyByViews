# Overpass API Quick Reference for Scenic Queries
This document summarizes how to use the Overpass API (based on OpenStreetMap data) for fetching scenic features such as mountains, beaches, rivers, and tourist attractions. It is tailored for airplane seat recommendation projects.

## 1. API Endpoint
- **Public endpoint**: `https://overpass-api.de/api/interpreter`
- **Method**: POST
- **Parameter**: `data=<your Overpass QL query>`

## 2. Basic Query Structure
```overpassql
[out:json];      // output format
node(...);       // or way(...), relation(...)
out;             // return results
```
- **out:json**: Get the response in JSON format.
- **node(...)**: Query point features.
- **way(...)**: Query linear or area features (e.g., roads, coastlines, lakes).
- **relation(...)**: Query complex structures (e.g., parks, multi-polygons).

## 3. Spatial Filters
- **Bounding box**: `(lat1, lon1, lat2, lon2)`
- **Around radius**: `(around:RADIUS_METERS, LAT, LON)`
- **Area by name**:

```overpassql
area[name="Bangalore"]->.searchArea;
node(area.searchArea)["tourism"="viewpoint"];
```

## 4. Scenic Categories & OSM Tags
- **Mountains & Peaks**: `natural=peak`, `natural=mountain_range`
- **Coastlines & Beaches**: `natural=beach`, `natural=coastline`
- **Lakes & Rivers**: `natural=water`, `water=lake`, `water=river`
- **Volcanoes**: `natural=volcano`, `natural=crater`
- **Glaciers / Ice fields**: `natural=glacier`
- **Viewpoints**: `tourism=viewpoint`
- **Tourist attractions**: `tourism=attraction`
- **National Parks/Reserves**: `boundary=national_park`
- **Islands**: `place=island`

## 5. Example Queries

### a) Find peaks within 50 km of Mt. Everest
```overpassql
[out:json];
node(around:50000, 27.9881, 86.9250)["natural"="peak"];
out;
```

### b) Beaches near Mumbai (30 km)
```overpassql
[out:json];
node(around:30000, 19.0760, 72.8777)["natural"="beach"];
out;
```

### c) Viewpoints in Switzerland (using area)
```overpassql
[out:json];
area[name="Switzerland"]->.a;
(
  node(area.a)["tourism"="viewpoint"];
  way(area.a)["tourism"="viewpoint"];
);
out center;
```

### d) Lakes along a corridor (bounding box)
```overpassql
[out:json];
way(35.0, 10.0, 37.0, 12.0)["natural"="water"];
out center;
```

## 6. Example Integration (Python)
```python
import requests

query = """
[out:json];
node(around:50000, 27.9881, 86.9250)["natural"="peak"];
out;
"""

url = "https://overpass-api.de/api/interpreter"
resp = requests.post(url, data={'data': query})
data = resp.json()

for el in data['elements']:
    name = el.get('tags', {}).get('name', 'Unnamed')
    print(f"{name}: {el['lat']}, {el['lon']}")
```

## 7. Best Practices
- Use specific tags to reduce the size of the results.
- Always limit your search using a radius or a bounding box.
- Don’t spam the public Overpass servers. Cache results when possible.
- For heavy use, consider running your own Overpass instance.
- Always give attribution: “© OpenStreetMap contributors”.

## 8. Useful Resources
- Overpass Turbo Playground
- Overpass QL Guide (OSM Wiki)
- OSM Tagging Documentation (Map Features)