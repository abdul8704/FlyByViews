import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, Input } from '../components';
import PathMap from './PathMap';
import { toTitleCase } from '../utils/helper.utils';

const FlightMapPage = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    sourceCity: '',
    destCity: '',
    departureTime: '',
    arrivalTime: ''
  });
  
  // Map and API response state
  const [routeData, setRouteData] = useState(null);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  // Deprecated: previously used simple counts; replaced by detailed table counts
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    
    // Check if arrival is after departure
    if (formData.departureTime && formData.arrivalTime) {
      const departure = new Date(formData.departureTime);
      const arrival = new Date(formData.arrivalTime);
      
      if (arrival <= departure) {
        newErrors.arrivalTime = 'Arrival time must be after departure time';
      }
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
      const response = await axios.post('/api/flights/route-scenery', {
        sourceCity: formData.sourceCity,
        destCity: formData.destCity,
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime
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
                label="Arrival Time"
                type="datetime-local"
                name="arrivalTime"
                value={formData.arrivalTime}
                onChange={handleChange}
                error={errors.arrivalTime}
              />
            </div>
            
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
          features={mapFeatures}
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