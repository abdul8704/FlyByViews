import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, Input } from '../components';
import PathMap from './PathMap';

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
  const [sceneryStats, setSceneryStats] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Create path data for PathMap component
  const createPathData = () => {
    if (!sourceCoords || !destCoords) {
      return null;
    }
    
    return {
      path: [
        { lat: sourceCoords.lat, lon: sourceCoords.lon },
        { lat: destCoords.lat, lon: destCoords.lon }
      ]
    };
  };



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
    
    if (!formData.departureTime) {
      newErrors.departureTime = 'Departure time is required';
    }
    
    if (!formData.arrivalTime) {
      newErrors.arrivalTime = 'Arrival time is required';
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
      
      // Calculate scenery statistics
      const stats = {
        left: response.data.results?.left?.length || 0,
        right: response.data.results?.right?.length || 0,
        both: response.data.results?.both?.length || 0
      };
      stats.total = stats.left + stats.right + stats.both;
      setSceneryStats(stats);
      
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
    <div className="min-h-screen bg-gray-50 flex">
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
                placeholder="e.g., New York, London"
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
                placeholder="e.g., Tokyo, Paris"
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
                required
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
                required
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Planning Route...' : 'Plan Route & Show Scenery'}
            </Button>
          </form>
          
          {/* Scenery Statistics */}
          {sceneryStats && (
            <Card className="mt-6 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Scenery Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Scenery on left side:</span>
                  <span className="font-medium">{sceneryStats.left}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scenery on right side:</span>
                  <span className="font-medium">{sceneryStats.right}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scenery on both sides:</span>
                  <span className="font-medium">{sceneryStats.both}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total scenery:</span>
                  <span className="text-blue-600">{sceneryStats.total}</span>
                </div>
              </div>
            </Card>
          )}
          
          {/* Back to Flight Planner */}
          <div className="mt-6">
            <Button
              onClick={() => navigate('/flight-planner')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white"
            >
              Back to Flight Planner
            </Button>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Map (2/3 width) */}
      <div className="w-2/3 relative">
        {/* PathMap Component */}
        <PathMap 
          pathJson={createPathData()}
          features={
            routeData?.results
              ? [
                  ...(routeData.results.left || []).map((f) => ({ ...f, side: 'left' })),
                  ...(routeData.results.right || []).map((f) => ({ ...f, side: 'right' })),
                  ...(routeData.results.both || []).map((f) => ({ ...f, side: 'both' })),
                ]
              : []
          }
          pointsPerSegment={96}
        />
        
        {/* Route Information Overlay */}
        {routeData && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 text-sm max-w-xs z-[1000]">
            <h4 className="font-semibold mb-2">Route Information</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span className="font-medium">{formData.sourceCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-medium">{formData.destCity}</span>
              </div>
              {routeData.metadata?.distance && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium">{Math.round(routeData.metadata.distance)} km</span>
                </div>
              )}
              {sceneryStats && (
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-2">
                  <span className="text-gray-600">Scenery:</span>
                  <span className="font-medium text-blue-600">{sceneryStats.total}</span>
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