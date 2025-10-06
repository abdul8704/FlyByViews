// Sun position utilities (approximate, based on common solar position formulas)
// Returns azimuth (deg from North, clockwise) and altitude (elevation, deg)

const toRad = (v) => (v * Math.PI) / 180;
const toDeg = (v) => (v * 180) / Math.PI;

function normalizeDegrees(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// Julian Day relative to J2000.0 (days since 2000-01-01 12:00:00 TT approx)
function toDays(date) {
  // Convert to UTC millis
  const d = date instanceof Date ? date : new Date(date);
  const ms = d.getTime();
  // Julian Day from Unix time
  const JD = ms / 86400000 + 2440587.5; // Unix epoch to JD
  return JD - 2451545.0; // days since J2000
}

// Compute sun position at time and location
export function getSunPosition(date, lat, lon) {
  const d = toDays(date);

  // Mean anomaly of the Sun (deg)
  const M = toRad(357.5291 + 0.98560028 * d);
  // Equation of center
  const C = toRad(1.9148) * Math.sin(M) + toRad(0.02) * Math.sin(2 * M) + toRad(0.0003) * Math.sin(3 * M);
  // Ecliptic longitude
  const P = toRad(102.9372); // perihelion of the Earth
  const L = M + C + P + Math.PI; // ecliptic longitude (rad)

  // Obliquity of the ecliptic
  const e = toRad(23.4397);

  // Sun's right ascension and declination
  const sinL = Math.sin(L);
  const cosL = Math.cos(L);
  const RA = Math.atan2(Math.cos(e) * sinL, cosL); // right ascension
  const dec = Math.asin(Math.sin(e) * sinL); // declination

  // Sidereal time at Greenwich at given date (radians)
  const theta = toRad(280.16 + 360.9856235 * d);

  // Local sidereal time: add longitude (east positive), convert to radians
  const lw = -toRad(lon); // note: negative sign (east positive)
  const LST = theta - lw;

  // Hour angle of the sun
  let H = LST - RA;
  // normalize to -pi..pi
  H = ((H + Math.PI) % (2 * Math.PI)) - Math.PI;

  const phi = toRad(lat);
  const alt = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  );

  // Azimuth from North, clockwise
  // Using formula: az = atan2( sin(H), cos(H)*sin(phi) - tan(dec)*cos(phi) )
  let az = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
  );
  // Convert from radians where 0 = North; ensure 0..360
  az = normalizeDegrees(toDeg(az));
  if (az < 0) az += 360;

  return { azimuth: az, altitude: toDeg(alt), declination: toDeg(dec) };
}

// Subsolar point (lat, lon) where the sun is at zenith at given date
export function getSubsolarPoint(date) {
  const d = toDays(date);
  const M = toRad(357.5291 + 0.98560028 * d);
  const C = toRad(1.9148) * Math.sin(M) + toRad(0.02) * Math.sin(2 * M) + toRad(0.0003) * Math.sin(3 * M);
  const P = toRad(102.9372);
  const L = M + C + P + Math.PI;
  const e = toRad(23.4397);
  const sinL = Math.sin(L);
  const cosL = Math.cos(L);
  const RA = Math.atan2(Math.cos(e) * sinL, cosL);
  const dec = Math.asin(Math.sin(e) * sinL);

  // Greenwich mean sidereal time
  const theta = toRad(280.16 + 360.9856235 * d);
  // Greenwich hour angle of the sun
  let GHA = theta - RA; // radians
  // Normalize to -pi..pi
  GHA = ((GHA + Math.PI) % (2 * Math.PI)) - Math.PI;
  // Subsolar longitude is -GHA (east positive)
  let lon = -toDeg(GHA);
  // Normalize to [-180, 180]
  lon = ((lon + 180) % 360) - 180;
  const lat = toDeg(dec);
  return { lat, lon };
}

// Geodesy helpers for bearings and great-circle interpolation
export function initialBearing(from, to) {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lon - from.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return normalizeDegrees(toDeg(θ));
}

export function greatCircleIntermediate(a, b, f) {
  // a, b: {lat, lon}, f in [0,1]
  const φ1 = toRad(a.lat);
  const λ1 = toRad(a.lon);
  const φ2 = toRad(b.lat);
  const λ2 = toRad(b.lon);

  const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
  const sinφ2 = Math.sin(φ2), cosφ2 = Math.cos(φ2);
  const Δφ = φ2 - φ1;
  const Δλ = λ2 - λ1;

  const sinΔφ2 = Math.sin(Δφ / 2);
  const sinΔλ2 = Math.sin(Δλ / 2);
  const aHarv = sinΔφ2 * sinΔφ2 + cosφ1 * cosφ2 * sinΔλ2 * sinΔλ2;
  const δ = 2 * Math.asin(Math.min(1, Math.sqrt(aHarv)));

  if (δ === 0) return { lat: a.lat, lon: a.lon };

  const A = Math.sin((1 - f) * δ) / Math.sin(δ);
  const B = Math.sin(f * δ) / Math.sin(δ);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);
  return { lat: toDeg(φi), lon: toDeg(λi) };
}

export function haversineKm(a, b) {
  const R = 6371;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δφ = φ2 - φ1;
  const Δλ = toRad(b.lon - a.lon);
  const s =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function normalizeRelativeBearing(angle) {
  // returns angle in (-180, 180]
  let a = ((angle + 180) % 360) - 180;
  if (a <= -180) a += 360;
  return a;
}

// Compute destination point given start, bearing (deg from North clockwise) and distance (km)
export function destinationPoint(start, bearingDeg, distanceKm) {
  const R = 6371; // km
  const δ = distanceKm / R; // angular distance in radians
  const θ = toRad(bearingDeg);
  const φ1 = toRad(start.lat);
  const λ1 = toRad(start.lon);

  const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ), cosδ = Math.cos(δ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(Math.min(1, Math.max(-1, sinφ2)));
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return { lat: toDeg(φ2), lon: toDeg(λ2) };
}
