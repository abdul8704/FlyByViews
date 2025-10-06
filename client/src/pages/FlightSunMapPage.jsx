import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components';
import PathMap from './PathMap';
import api from '../api/axios';
import { estimateArrivalTime, formatDurationHours, toTitleCase } from '../utils/helper.utils';
import { getSunPosition, getSubsolarPoint, initialBearing, greatCircleIntermediate, normalizeRelativeBearing, destinationPoint } from '../utils/sun.utils';

// UX: very similar to FlightMapPage, but focused on sunrise/sunset viewing
// Inputs: source city, destination city, departure time, optional average speed
// Outputs: seat recommendation (left/right), and interactive map with sun overlay and flight position over time

const DEFAULT_SPEED = 850; // km/h typical jet cruise

export default function FlightSunMapPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    sourceCity: '',
    destCity: '',
    departureTime: '',
    cruiseSpeed: DEFAULT_SPEED,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [routeData, setRouteData] = useState(null);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [scrubIdx, setScrubIdx] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.sourceCity.trim()) e.sourceCity = 'Source city is required';
    if (!formData.destCity.trim()) e.destCity = 'Destination city is required';
    if (!formData.departureTime) e.departureTime = 'Departure time is required';
    const speed = Number(formData.cruiseSpeed);
    if (!Number.isFinite(speed) || speed <= 0) e.cruiseSpeed = 'Enter a valid speed (km/h)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await api.post('/api/flights/route-scenery', {
        sourceCity: formData.sourceCity,
        destCity: formData.destCity,
        departureTime: formData.departureTime,
      });
      const data = response.data;
      setRouteData(data);
      const s = { lat: data.metadata.source.lat, lon: data.metadata.source.lon };
      const d = { lat: data.metadata.destination.lat, lon: data.metadata.destination.lon };
      setSourceCoords(s);
      setDestCoords(d);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || err.message || 'Failed to compute route' });
    } finally {
      setLoading(false);
    }
  };

  // Compute path for PathMap
  const pathJson = useMemo(() => {
    if (!sourceCoords || !destCoords) return null;
    return { path: [sourceCoords, destCoords] };
  }, [sourceCoords, destCoords]);

  // Compute flight timing
  const timing = useMemo(() => {
    if (!routeData?.metadata?.distance || !formData.departureTime) return null;
    const dist = routeData.metadata.distance; // km
    const speed = Number(formData.cruiseSpeed) || DEFAULT_SPEED;
    const depISO = formData.departureTime;
    const est = estimateArrivalTime(dist, depISO, speed);
    return est; // {arrival, durationHours}
  }, [routeData?.metadata?.distance, formData.departureTime, formData.cruiseSpeed]);

  // Build a small time series along the flight (every ~10 minutes) and compute sun & seat suggestion around sunrise/sunset windows
  const sunSeries = useMemo(() => {
    if (!sourceCoords || !destCoords || !timing) return [];
    const totalH = timing.durationHours;
    const totalMs = totalH * 3600 * 1000;
    const dep = new Date(formData.departureTime);
    const steps = Math.max(6, Math.min(36, Math.ceil(totalH * 6))); // ~every 10 min
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const t = new Date(dep.getTime() + f * totalMs);
      const pos = greatCircleIntermediate(sourceCoords, destCoords, f);
      const sun = getSunPosition(t, pos.lat, pos.lon);
      // plane track bearing (initial bearing is enough as GC bearing varies slightly; approximate per segment)
      const bearing = initialBearing(sourceCoords, destCoords);
      // relative bearing from nose to sun (0 front, +right, -left) -> compute difference
      // Sun azimuth measured from North clockwise; convert aircraft heading (bearing) same reference
      const rel = normalizeRelativeBearing(sun.azimuth - bearing);
      const side = rel > 0 ? 'right' : 'left';
      const isSunNearHorizon = Math.abs(sun.altitude) <= 10; // +/-10 deg window
      out.push({ t, f, pos, sun, bearing, relative: rel, side, isSunNearHorizon });
    }
    return out;
  }, [sourceCoords, destCoords, timing, formData.departureTime]);

  // Current sample from series according to scrub index
  const currentSample = useMemo(() => {
    if (!sunSeries.length) return null;
    const idx = Math.min(Math.max(0, scrubIdx), sunSeries.length - 1);
    return sunSeries[idx];
  }, [sunSeries, scrubIdx]);

  // Aggregate recommendation: focus on times when sun near horizon; fallback to overall average
  const seatRecommendation = useMemo(() => {
    if (!sunSeries.length) return null;
    const horizonPts = sunSeries.filter((p) => p.isSunNearHorizon);
    const pts = horizonPts.length ? horizonPts : sunSeries;
    const score = pts.reduce(
      (acc, p) => {
        // weight by proximity to horizon: closer gets higher weight for sunrise/sunset enjoyment
        const w = 1 / (1 + Math.abs(p.sun.altitude));
        if (p.relative > 0) acc.right += w; else acc.left += w;
        return acc;
      },
      { left: 0, right: 0 }
    );
    const best = score.right > score.left ? 'Right side' : 'Left side';
    const confidence = Math.round((Math.max(score.left, score.right) / (score.left + score.right)) * 100);
    // Determine whether the event is more sunrise (altitude increasing across series) or sunset (decreasing)
    const firstAlt = pts[0].sun.altitude;
    const lastAlt = pts[pts.length - 1].sun.altitude;
    const trend = lastAlt > firstAlt ? 'sunrise' : 'sunset';
    // Find the best moment (closest to horizon while on best side)
    const filtered = pts.filter((p) => (best.startsWith('Right') ? p.relative > 0 : p.relative < 0));
    const bestMoment = filtered.reduce((a, b) => (Math.abs(a.sun.altitude) < Math.abs(b.sun.altitude) ? a : b), filtered[0] || pts[0]);
    return { best, confidence, trend, at: bestMoment?.t, atLocal: bestMoment ? new Date(bestMoment.t).toLocaleString() : null };
  }, [sunSeries]);

  // Sun overlay features: subsolar point and instantaneous sun direction marker along path
  const sunOverlayFeatures = useMemo(() => {
    if (!sunSeries.length) return [];
    const sample = currentSample ?? sunSeries[Math.floor(sunSeries.length / 2)];
    const subsolar = getSubsolarPoint(sample.t);
    return [{ lat: subsolar.lat, lon: subsolar.lon, type: 'subsolar_point', name: 'Subsolar point' }];
  }, [sunSeries, currentSample]);

  const extraLines = useMemo(() => {
    if (!currentSample) return [];
    // Draw a short ray in the direction of the sun azimuth from aircraft
    const start = currentSample.pos;
    const rayEnd = destinationPoint(start, currentSample.sun.azimuth, 500); // 500 km ray
    return [
      { coords: [[start.lat, start.lon], [rayEnd.lat, rayEnd.lon]], color: '#f59e0b', weight: 2, dashArray: '6 6' },
    ];
  }, [currentSample]);

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Left Panel */}
      <div className="w-1/3 bg-white shadow-lg overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Sunrise/Sunset Seat Finder</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Source City" name="sourceCity" value={formData.sourceCity} onChange={handleChange} placeholder="Chennai" error={errors.sourceCity} required />
            <Input label="Destination City" name="destCity" value={formData.destCity} onChange={handleChange} placeholder="Srinagar" error={errors.destCity} required />
            <Input label="Departure Time" type="datetime-local" name="departureTime" value={formData.departureTime} onChange={handleChange} error={errors.departureTime} required />
            <Input label="Cruise Speed (km/h)" type="number" name="cruiseSpeed" value={formData.cruiseSpeed} onChange={handleChange} error={errors.cruiseSpeed} />

            {errors.submit && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{errors.submit}</div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-black hover:bg-blue-700 text-white">
              {loading ? 'Calculating...' : 'Plan & Recommend Seat'}
            </Button>
          </form>

          {/* Recommendation */}
          {seatRecommendation && (
            <Card className="mt-6 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Seat Recommendation</h3>
              <div className="text-gray-800">
                <div className="text-xl font-bold">{seatRecommendation.best}</div>
                <div className="text-sm text-gray-600">Best chance to enjoy {seatRecommendation.trend} · Confidence {seatRecommendation.confidence}%</div>
                {seatRecommendation.at && (
                  <div className="text-sm text-gray-600 mt-1">Peak moment around: {seatRecommendation.atLocal}</div>
                )}
              </div>
            </Card>
          )}

          {/* Flight Summary */}
          {routeData && (
            <Card className="mt-6 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Flight Summary</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex justify-between"><span>From</span><span className="font-medium">{toTitleCase(routeData?.metadata?.source?.name || routeData?.metadata?.source?.originalInput || '')}</span></div>
                <div className="flex justify-between"><span>To</span><span className="font-medium">{toTitleCase(routeData?.metadata?.destination?.name || routeData?.metadata?.destination?.originalInput || '')}</span></div>
                {routeData.metadata?.distance && (
                  <div className="flex justify-between"><span>Distance</span><span className="font-medium">{Math.round(routeData.metadata.distance)} km</span></div>
                )}
                {timing && (
                  <>
                    <div className="flex justify-between"><span>Duration</span><span className="font-medium">{formatDurationHours(timing.durationHours)}</span></div>
                    <div className="flex justify-between"><span>Departure</span><span className="font-medium">{new Date(formData.departureTime).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Arrival</span><span className="font-medium">{timing.arrival.toLocaleString()}</span></div>
                  </>
                )}
              </div>
            </Card>
          )}

          <div className="mt-6">
            <Button onClick={() => navigate('/')} className="w-full bg-gray-600 hover:bg-gray-700 text-white">Back to Home</Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="w-2/3 relative h-full">
        <PathMap
          pathJson={pathJson}
          tileUrl={"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"}
          tileAttribution={"&copy; OpenStreetMap contributors, &copy; CARTO"}
          features={sunOverlayFeatures}
          currentPoint={currentSample?.pos || null}
          extraLines={extraLines}
          pointsPerSegment={64}
        />

        {/* Overlay legend */}
        {sunSeries.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm max-w-md z-[1000]">
            <h4 className="font-semibold mb-2 text-black">Sun Overlay</h4>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Yellow dot marks the subsolar point (where sun is overhead)</li>
              <li>Choose seat based on recommendation shown on the left</li>
            </ul>
            {/* Time scrubber */}
            <div className="mt-3">
              <input
                type="range"
                min={0}
                max={Math.max(0, sunSeries.length - 1)}
                value={scrubIdx}
                onChange={(e) => setScrubIdx(Number(e.target.value))}
                className="w-full"
              />
              {currentSample && (
                <div className="mt-1 text-gray-700 flex justify-between">
                  <span>{new Date(sunSeries[0].t).toLocaleTimeString()}</span>
                  <span className="font-medium">{new Date(currentSample.t).toLocaleString()}</span>
                  <span>{new Date(sunSeries[sunSeries.length - 1].t).toLocaleTimeString()}</span>
                </div>
              )}
              {currentSample && (
                <div className="mt-1 text-gray-600">
                  Sun azimuth: {Math.round(currentSample.sun.azimuth)}° · altitude: {Math.round(currentSample.sun.altitude)}° · You should look to the <span className="font-medium">{currentSample.side}</span>.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Calculating sun position and seat recommendation...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
