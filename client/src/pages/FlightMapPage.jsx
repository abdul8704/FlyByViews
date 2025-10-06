import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Card, Button, Input } from '../components';
import PathMap from './PathMap';
import { toTitleCase, estimateArrivalTime, formatDurationHours } from '../utils/helper.utils';
import { getSunPosition, getSubsolarPoint, initialBearing, greatCircleIntermediate, normalizeRelativeBearing, destinationPoint } from '../utils/sun.utils';

const FlightMapPage = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    sourceCity: '',
    destCity: '',
    departureTime: '',
    cruiseSpeed: 850,
  });
  
  // Map and API response state
  const [routeData, setRouteData] = useState(null);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  // Deprecated: previously used simple counts; replaced by detailed table counts
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [scrubIdx, setScrubIdx] = useState(0);

  // Memoize features to avoid re-creating the array on every render
  const mapFeatures = useMemo(() => {
    const results = routeData?.results;
    if (!results) return [];
    const tag = (arr, side) => (arr || []).map((f) => ({ ...f, side }));
    return [
      ...tag(results.left, 'left'),
      ...tag(results.right, 'right'),
      ...tag(results.both, 'both'),
    ];
  }, [routeData?.results]);

  // Count features by side and type (mountains, coastlines, volcanoes)
  const sceneryCounts = useMemo(() => {
    const results = routeData?.results;
    if (!results) return null;

    const normType = (f) => (f?.genericType || f?.type || '').toLowerCase();
    const countSide = (arr) => {
      const counts = { mountain_peak: 0, coastline: 0, volcano: 0, other: 0, total: 0 };
      (arr || []).forEach((f) => {
        const t = normType(f);
        if (t.includes('peak') || t.includes('mountain')) counts.mountain_peak += 1;
        else if (t.includes('coast')) counts.coastline += 1;
        else if (t.includes('volcano')) counts.volcano += 1;
        else counts.other += 1;
      });
      counts.total = (arr || []).length;
      return counts;
    };

    return {
      left: countSide(results.left),
      right: countSide(results.right),
      both: countSide(results.both),
    };
  }, [routeData?.results]);

  // Create stable path data for PathMap component
  const pathJsonMemo = useMemo(() => {
    if (!sourceCoords || !destCoords) return null;
    return {
      path: [
        { lat: sourceCoords.lat, lon: sourceCoords.lon },
        { lat: destCoords.lat, lon: destCoords.lon },
      ],
    };
  }, [sourceCoords?.lat, sourceCoords?.lon, destCoords?.lat, destCoords?.lon]);

  // Timing based on distance and speed
  const timing = useMemo(() => {
    if (!routeData?.metadata?.distance || !formData.departureTime) return null;
    const speed = Number(formData.cruiseSpeed) || 850;
    return estimateArrivalTime(routeData.metadata.distance, formData.departureTime, speed);
  }, [routeData?.metadata?.distance, formData.departureTime, formData.cruiseSpeed]);

  // Build a time series along the flight to compute sun positions
  const sunSeries = useMemo(() => {
    if (!sourceCoords || !destCoords || !timing) return [];
    const totalH = timing.durationHours;
    const totalMs = totalH * 3600 * 1000;
    const dep = new Date(formData.departureTime);
    const steps = Math.max(6, Math.min(36, Math.ceil(totalH * 6))); // ~10 min cadence
    const bearing = initialBearing(sourceCoords, destCoords);
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const t = new Date(dep.getTime() + f * totalMs);
      const pos = greatCircleIntermediate(sourceCoords, destCoords, f);
      const sun = getSunPosition(t, pos.lat, pos.lon);
      const rel = normalizeRelativeBearing(sun.azimuth - bearing);
      const side = rel > 0 ? 'right' : 'left';
      const isSunNearHorizon = Math.abs(sun.altitude) <= 10;
      out.push({ t, f, pos, sun, bearing, relative: rel, side, isSunNearHorizon });
    }
    return out;
  }, [sourceCoords, destCoords, timing, formData.departureTime]);

  const currentSample = useMemo(() => {
    if (!sunSeries.length) return null;
    const idx = Math.min(Math.max(0, scrubIdx), sunSeries.length - 1);
    return sunSeries[idx];
  }, [sunSeries, scrubIdx]);

  // Sun overlay (subsolar point) and ray from aircraft
  const sunOverlayFeatures = useMemo(() => {
    if (!sunSeries.length) return [];
    const sample = currentSample ?? sunSeries[Math.floor(sunSeries.length / 2)];
    const subsolar = getSubsolarPoint(sample.t);
    return [{ lat: subsolar.lat, lon: subsolar.lon, type: 'subsolar_point', name: 'Subsolar point' }];
  }, [sunSeries, currentSample]);

  const extraLines = useMemo(() => {
    if (!currentSample) return [];
    const start = currentSample.pos;
    const rayEnd = destinationPoint(start, currentSample.sun.azimuth, 500); // 500 km ray
    return [
      { coords: [[start.lat, start.lon], [rayEnd.lat, rayEnd.lon]], color: '#f59e0b', weight: 2, dashArray: '6 6' },
    ];
  }, [currentSample]);

  const combinedFeatures = useMemo(() => {
    return [...mapFeatures, ...sunOverlayFeatures];
  }, [mapFeatures, sunOverlayFeatures]);

  const seatRecommendation = useMemo(() => {
    if (!sunSeries.length) return null;
    const horizonPts = sunSeries.filter(p => p.isSunNearHorizon);
    const pts = horizonPts.length ? horizonPts : sunSeries;
    const score = pts.reduce((acc, p) => {
      const w = 1 / (1 + Math.abs(p.sun.altitude));
      if (p.relative > 0) acc.right += w; else acc.left += w;
      return acc;
    }, { left: 0, right: 0 });
    const best = score.right > score.left ? 'Right side' : 'Left side';
    const firstAlt = pts[0].sun.altitude;
    const lastAlt = pts[pts.length - 1].sun.altitude;
    const trend = lastAlt > firstAlt ? 'sunrise' : 'sunset';
    const filtered = pts.filter((p) => (best.startsWith('Right') ? p.relative > 0 : p.relative < 0));
    const bestMoment = filtered.reduce((a, b) => (Math.abs(a.sun.altitude) < Math.abs(b.sun.altitude) ? a : b), filtered[0] || pts[0]);
    return { best, trend, at: bestMoment?.t, atLocal: bestMoment ? new Date(bestMoment.t).toLocaleString() : null };
  }, [sunSeries]);

  // Build scenery-based alternative suggestion (mountains + coastlines) relative to sun recommendation
  const sceneryAdvice = useMemo(() => {
    if (!sceneryCounts || !seatRecommendation) return null;
    const scenicLeft = (sceneryCounts.left?.mountain_peak || 0) + (sceneryCounts.left?.coastline || 0);
    const scenicRight = (sceneryCounts.right?.mountain_peak || 0) + (sceneryCounts.right?.coastline || 0);
    const scenicSide = scenicRight > scenicLeft ? 'Right side' : 'Left side';
    // Determine which feature dominates on that scenic side
    const counts = scenicSide.startsWith('Right') ? sceneryCounts.right : sceneryCounts.left;
    const dominantType = (counts.coastline || 0) >= (counts.mountain_peak || 0) ? 'coastlines' : 'mountains';
    const sunSide = seatRecommendation.best;
    if (scenicSide === sunSide) {
      // both align; still provide friendly summary
      return { scenicSide, dominantType, differs: false };
    }
    return { scenicSide, dominantType, differs: true };
  }, [sceneryCounts, seatRecommendation]);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.sourceCity.trim()) {
      newErrors.sourceCity = 'Source city is required';
    }
    
    if (!formData.destCity.trim()) {
      newErrors.destCity = 'Destination city is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Call the route-scenery API with just city names
      const response = await api.post('/api/flights/route-scenery', {
        sourceCity: formData.sourceCity,
        destCity: formData.destCity,
        // departureTime is optional; include only if provided
        ...(formData.departureTime ? { departureTime: formData.departureTime } : {})
      });

      console.log('Route scenery response:', response.data);
      
      setRouteData(response.data);
      
      // Extract coordinates from the API response
      const sourceCoords = {
        lat: response.data.metadata.source.lat,
        lon: response.data.metadata.source.lon
      };
      const destCoords = {
        lat: response.data.metadata.destination.lat,
        lon: response.data.metadata.destination.lon
      };
      
      setSourceCoords(sourceCoords);
      setDestCoords(destCoords);
      
      setRouteData(response.data);
      
    } catch (error) {
      console.error('Error planning route:', error);
      setErrors({ 
        submit: error.response?.data?.message || error.message || 'Failed to plan route. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };



  return (
  <div className="h-screen bg-gray-50 flex">
      {/* Left Panel - Form (1/3 width) */}
      <div className="w-1/3 bg-white shadow-lg overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Flight Route Planner</h1>
          
          {/* Flight Planning Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Source City"
                type="text"
                name="sourceCity"
                value={formData.sourceCity}
                onChange={handleChange}
                placeholder="Chennai"
                error={errors.sourceCity}
                required
              />
            </div>
            
            <div>
              <Input
                label="Destination City"
                type="text"
                name="destCity"
                value={formData.destCity}
                onChange={handleChange}
                placeholder="Srinagar"
                error={errors.destCity}
                required
              />
            </div>
            
            <div>
              <Input
                label="Departure Time"
                type="datetime-local"
                name="departureTime"
                value={formData.departureTime}
                onChange={handleChange}
                error={errors.departureTime}
              />
            </div>
            <div>
              <Input
                label="Cruise Speed (km/h)"
                type="number"
                name="cruiseSpeed"
                value={formData.cruiseSpeed}
                onChange={handleChange}
                error={errors.cruiseSpeed}
              />
            </div>
            
            {/* Arrival time is computed, not entered */}
            
            {errors.submit && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {errors.submit}
              </div>
            )}
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-blue-700 text-white"
            >
              {loading ? 'Planning Route...' : 'Plan Route & Show Scenery'}
            </Button>
          </form>
          
          {/* Scenery Statistics (Left vs Right) */}
          {sceneryCounts && (
            <Card className="mt-6 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Scenery Statistics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-700 font-medium">Type</th>
                      <th className="text-right px-3 py-2 text-gray-700 font-medium">Left</th>
                      <th className="text-right px-3 py-2 text-gray-700 font-medium">Right</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 text-gray-700">Mountains</td>
                      <td className="px-3 py-2 text-right text-gray-900">{sceneryCounts.left.mountain_peak}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{sceneryCounts.right.mountain_peak}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 text-gray-700">Coastlines</td>
                      <td className="px-3 py-2 text-right text-gray-900">{sceneryCounts.left.coastline}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{sceneryCounts.right.coastline}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 text-gray-700">Volcanoes</td>
                      <td className="px-3 py-2 text-right text-gray-900">{sceneryCounts.left.volcano}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{sceneryCounts.right.volcano}</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 text-gray-700">Other</td>
                      <td className="px-3 py-2 text-right text-gray-900">{sceneryCounts.left.other}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{sceneryCounts.right.other}</td>
                    </tr>
                    <tr className="border-t border-gray-300 bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-900">Total</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{sceneryCounts.left.total}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{sceneryCounts.right.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Seat Recommendation */}
          {seatRecommendation && (
            <Card className="mt-6 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Seat Recommendation</h3>
              <div className="text-gray-800">
                <div className="text-xl font-bold">{seatRecommendation.best}</div>
                <div className="text-sm text-gray-600">Best chance to enjoy {seatRecommendation.trend}</div>
                {seatRecommendation.at && (
                  <div className="text-sm text-gray-600 mt-1">Likely best around: {seatRecommendation.atLocal}</div>
                )}
                {sceneryAdvice && sceneryAdvice.differs && (
                  <div className="text-sm text-gray-700 mt-3">
                    Prefer views? Choose <span className="font-medium">{sceneryAdvice.scenicSide}</span> for more {sceneryAdvice.dominantType}.
                  </div>
                )}
                {sceneryAdvice && !sceneryAdvice.differs && (
                  <div className="text-sm text-gray-700 mt-3">
                    Good news: this side also has more {sceneryAdvice.dominantType} to enjoy.
                  </div>
                )}
                {sceneryAdvice && sceneryAdvice.differs && (
                  <div className="text-xs text-gray-500 mt-1">
                    Tip: Book <span className="font-medium">{seatRecommendation.best}</span> for {seatRecommendation.trend}; or <span className="font-medium">{sceneryAdvice.scenicSide}</span> if you prefer {sceneryAdvice.dominantType}.
                  </div>
                )}
              </div>
            </Card>
          )}
          {!seatRecommendation && routeData && (
            <Card className="mt-6 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Seat Recommendation</h3>
              <div className="text-sm text-gray-700">Add a departure time to get a left/right seat suggestion for sunrise/sunset.</div>
            </Card>
          )}
          
          {/* Back to Flight Map */}
          <div className="mt-6">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Map (2/3 width) */}
  <div className="w-2/3 relative h-full">
        {/* PathMap Component */}
        <PathMap 
          pathJson={pathJsonMemo}
          tileUrl={"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"}
          tileAttribution={"&copy; OpenStreetMap contributors, &copy; CARTO"}
          features={combinedFeatures}
          currentPoint={currentSample?.pos || null}
          extraLines={extraLines}
          pointsPerSegment={64}
        />
        
        {/* Route Information Overlay */}
        {routeData && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm max-w-md z-[1000]">
            <h4 className="font-semibold mb-2 text-black">Route Information</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span className="font-medium text-gray-600">{
                  toTitleCase(
                    routeData?.metadata?.source?.name || routeData?.metadata?.source?.originalInput || ''
                  )
                }</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-medium text-gray-600">{
                  toTitleCase(
                    routeData?.metadata?.destination?.name || routeData?.metadata?.destination?.originalInput || ''
                  )
                }</span>
              </div>
              {routeData.metadata?.distance && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium pl-3 text-gray-600">{Math.round(routeData.metadata.distance)} km</span>
                </div>
              )}
              {/* Estimated arrival based on optional departure time */}
              {routeData.metadata?.distance && formData.departureTime && (() => {
                const est = estimateArrivalTime(routeData.metadata.distance, formData.departureTime);
                if (!est) return null;
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium pl-3 text-gray-600">{formatDurationHours(est.durationHours)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. arrival:</span>
                      <span className="font-medium pl-3 text-gray-600">{new Date(est.arrival).toLocaleString()}</span>
                    </div>
                  </>
                );
              })()}
            
            </div>
          </div>
        )}

        {/* Sun Overlay and Time Slider */}
        {sunSeries.length > 0 && (
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-sm max-w-md z-[1000]">
            <h4 className="font-semibold mb-2 text-black">Sun & View</h4>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Drag the slider to see where the sun will be during your flight.</li>
              <li>Amber dot shows where the sun is directly overhead.</li>
            </ul>
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
                  Now: look to the <span className="font-medium">{currentSample.side}</span> to see the sun.
                  <span className="block text-xs text-gray-500">Closer to the horizon = better sunrise/sunset.</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Planning your route and finding scenery...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightMapPage;