import React, { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Simple helper: convert degrees <-> radians
const toRad = (v) => (v * Math.PI) / 180;
const toDeg = (v) => (v * 180) / Math.PI;

// Haversine distance (km)
function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Interpolate points along a great-circle between two coordinates using Slerp on a unit sphere
// Returns array of [lat, lon] including both endpoints when numPoints >= 2
function greatCirclePoints([lat1, lon1], [lat2, lon2], numPoints = 64) {
  // convert to radians
  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  // convert to 3D cartesian coordinates on unit sphere
  const x1 = Math.cos(φ1) * Math.cos(λ1);
  const y1 = Math.cos(φ1) * Math.sin(λ1);
  const z1 = Math.sin(φ1);

  const x2 = Math.cos(φ2) * Math.cos(λ2);
  const y2 = Math.cos(φ2) * Math.sin(λ2);
  const z2 = Math.sin(φ2);

  // angle between vectors
  let dot = x1 * x2 + y1 * y2 + z1 * z2;
  // clamp for numerical stability
  dot = Math.min(1, Math.max(-1, dot));
  const ω = Math.acos(dot);

  // if points are the same or nearly antipodal, fall back to linear interpolation of lat/lon
  if (Math.abs(ω) < 1e-6) {
    const out = [];
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const lat = lat1 + (lat2 - lat1) * t;
      const lon = lon1 + (lon2 - lon1) * t;
      out.push([lat, lon]);
    }
    return out;
  }

  const out = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const sin_ω = Math.sin(ω);
    const A = Math.sin((1 - t) * ω) / sin_ω;
    const B = Math.sin(t * ω) / sin_ω;
    const x = A * x1 + B * x2;
    const y = A * y1 + B * y2;
    const z = A * z1 + B * z2;

    // convert back to lat lon
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λ = Math.atan2(y, x);
    out.push([toDeg(φ), toDeg(λ)]);
  }
  return out;
}

// Given a path of coordinates, expand each consecutive segment to many points so the polyline looks smooth and geodesic.
function expandPathToGreatCircle(path, pointsPerSegment = 64) {
  if (!path || path.length < 2) return path || [];
  const out = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    // choose resolution proportional to distance (min 16, max pointsPerSegment)
    const dist = haversineDistance([a.lat, a.lon], [b.lat, b.lon]);
    const n = Math.max(
      16,
      Math.min(pointsPerSegment, Math.ceil((dist / 1000) * pointsPerSegment))
    );
    const segment = greatCirclePoints([a.lat, a.lon], [b.lat, b.lon], n);
    // drop last point to avoid duplicates except for final segment
    if (i < path.length - 2) segment.pop();
    segment.forEach((p) => out.push(p));
  }
  return out;
}

// Helper component: fit map bounds to path automatically
function arraysEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

function FitBounds({ coords }) {
  const map = useMap();
  const last = useRef(null);
  useEffect(() => {
    if (!coords || coords.length === 0) return;
    // Avoid re-fitting if bounds are effectively the same
    if (last.current && arraysEqual(last.current, coords)) return;
    last.current = coords;
    map.fitBounds(coords, { padding: [40, 40] });
  }, [coords, map]);
  return null;
}

/**
 * PathMap React Component
 * Props:
 *  - pathJson: { path: [{ lat, lon }, ... ] }  OR an array of {lat, lon}
 *  - tileUrl: optional tile layer URL (default uses OpenStreetMap)
 *  - pointsPerSegment: numeric: controls smoothness (default 64)
 */
export default function PathMap({
  pathJson = null,
  tileUrl = null,
  tileAttribution = "&copy; OpenStreetMap contributors",
  pointsPerSegment = 96,
  features = [],
  currentPoint = null, // {lat, lon}
  extraLines = [], // [{ coords: [[lat, lon], [lat, lon], ...], color?: string, weight?: number, dashArray?: string|null }]
}) {
  // If user passes entire JSON object or just array, normalize
  const rawPath = useMemo(() => {
    if (!pathJson) return null;
    if (Array.isArray(pathJson)) return pathJson;
    if (Array.isArray(pathJson.path)) return pathJson.path;
    return null;
  }, [pathJson]);

  // use provided path only when valid; otherwise no path by default
  const hasPath = Array.isArray(rawPath) && rawPath.length >= 2;
  const path = hasPath ? rawPath : [];

  // normalize features: prefer explicit features prop, else try from pathJson.results
  const rawFeatures = useMemo(() => {
    if (Array.isArray(features) && features.length) return features;
    const out = [];
    if (pathJson && pathJson.results) {
      ["left", "right", "both"].forEach((side) => {
        const arr = pathJson.results[side] || [];
        arr.forEach((f) => {
          if (f && typeof f.lat === "number" && typeof f.lon === "number") {
            out.push({ ...f, side: f.side || side });
          }
        });
      });
    }
    return out;
  }, [features, pathJson]);

  // expand to geodesic polyline points
  const polyline = useMemo(
    () => expandPathToGreatCircle(path, pointsPerSegment),
    [path, pointsPerSegment]
  );

  // decide initial center
  const defaultCenter = [20, 0];
  const defaultZoom = 2;
  let start, end;
  if (hasPath) {
    start = path[0];
    end = path[path.length - 1];
  }
  const centre = hasPath
    ? [(start.lat + end.lat) / 2, (start.lon + end.lon) / 2]
    : defaultCenter;
  const initialZoom = hasPath ? 3 : defaultZoom;

  const tile = tileUrl || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  // helper: color by feature type
  const getFeatureColor = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes('subsolar')) return '#f59e0b'; // amber for subsolar point
    if (t.includes("volcano")) return "#FF4500"; // orange/red
    if (t.includes("coast")) return "#4169E1"; // royal blue
    if (t.includes("peak") || t.includes("mountain")) return "#8B4513"; // saddle brown
    return "#666666"; // default gray
  };

  // bounds should include polyline and features
  const boundsCoords = useMemo(() => {
    const arr = [...polyline];
    rawFeatures.forEach((f) => arr.push([f.lat, f.lon]));
    return arr;
  }, [polyline, rawFeatures]);

  return (
    <div className="w-full h-full min-h-[600px] rounded-none overflow-hidden">
      <MapContainer
        center={centre}
        zoom={initialZoom}
        preferCanvas={true}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={tile} attribution={tileAttribution} />

        {/* fit map to path extent */}
        <FitBounds coords={boundsCoords} />

        {/* main path */}
        {polyline.length > 0 && (
          <Polyline positions={polyline} weight={3} dashArray={null} />
        )}

        {/* extra polylines (e.g., sun rays) */}
        {extraLines?.map((ln, idx) => (
          <Polyline
            key={`extra-${idx}`}
            positions={ln.coords}
            weight={ln.weight ?? 2}
            color={ln.color ?? '#f59e0b'}
            dashArray={ln.dashArray ?? '6 6'}
          />
        ))}

        {/* start and end markers */}
        {hasPath && <Marker position={[start.lat, start.lon]} />}
        {hasPath && <Marker position={[end.lat, end.lon]} />}

        {/* scenery feature markers */}
        {rawFeatures.map((feature, idx) => {
          const type = feature.genericType || feature.type || "scenery";
          const color = getFeatureColor(type);
          const name =
            feature.name && feature.name !== "Unnamed"
              ? feature.name
              : type.replace(/_/g, " ");
          const isSubsolar = (type || '').toLowerCase().includes('subsolar');
          if (isSubsolar) {
            // Draw a bright halo + a solid core and a permanent label
            return (
              <React.Fragment key={`feat-${idx}`}>
                <CircleMarker
                  center={[feature.lat, feature.lon]}
                  radius={12}
                  fillColor={color}
                  color={color}
                  weight={0}
                  fillOpacity={0.25}
                  interactive={false}
                />
                <CircleMarker
                  center={[feature.lat, feature.lon]}
                  radius={6}
                  fillColor={color}
                  color="#111827"
                  weight={2}
                  fillOpacity={0.95}
                >
                  {/* Intentionally no label to keep the sun unobtrusive */}
                </CircleMarker>
              </React.Fragment>
            );
          }
          return (
            <CircleMarker
              key={`feat-${idx}`}
              center={[feature.lat, feature.lon]}
              radius={4}
              fillColor={color}
              color="#ffffff"
              weight={1}
              fillOpacity={0.85}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
                    {name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#4b5563",
                      textTransform: "capitalize",
                    }}
                  >
                    {type.replace(/_/g, " ")}
                  </div>
                  {typeof feature.elevation === "number" && (
                    <div style={{ fontSize: 12, color: "#4b5563" }}>
                      Elevation: {feature.elevation} m
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {feature.lat?.toFixed?.(4)}, {feature.lon?.toFixed?.(4)}
                  </div>
                  {feature.side && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#2563eb",
                        fontWeight: 500,
                      }}
                    >
                      Visible on {feature.side} side
                      {feature.side === "both" ? "s" : ""}
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* current aircraft position marker */}
        {currentPoint && (
          <CircleMarker
            center={[currentPoint.lat, currentPoint.lon]}
            radius={6}
            fillColor="#ffffff"
            color="#111827"
            weight={2}
            fillOpacity={0.95}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <div style={{ fontSize: 12, color: '#111827' }}>Current aircraft position</div>
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

/*
  Usage example (in your app):

  import PathMap from "./PathMap";

  const myJson = {
    path: [
      { lat: 37.7749, lon: -122.4194 },
      { lat: 48.8566, lon: 2.3522 },
      { lat: 35.6895, lon: 139.6917 },
    ],
  };

  <PathMap pathJson={myJson} pointsPerSegment={96} />

  Dependencies to install:
  - react-leaflet
  - leaflet
  - tailwindcss (optional, component uses small tailwind classes)

  Notes:
  - If you need a curved "arc" that bulges away from the great-circle (for visual routing), let me know and
    I can add a function that offsets intermediate points outward to create an aesthetically curved arc.
  - For very long routes you may want to reduce pointsPerSegment to improve performance.
*/
