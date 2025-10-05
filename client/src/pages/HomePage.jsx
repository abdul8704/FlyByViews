import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import Logo from '../components/Logo';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white py-20">
        <Container maxWidth="4xl">
          <div className="text-center">
            <Logo size="xl" className="mb-8" />
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Discover Amazing Views from Above
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Experience the world's most breathtaking landscapes and cityscapes through our curated collection of aerial photography and flight experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/flight-map">
                <Button variant="primary" size="lg">
                  Plan Flight Route
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline" size="lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <Container maxWidth="6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Discover Scenic Flight Routes
            </h2>
            <p className="text-lg text-gray-600">
              Plan your flight and discover amazing geographical features along your route
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Interactive Route Planning
              </h3>
              <p className="text-gray-600">
                Plan your flight route between any two cities and discover scenic points of interest along the way.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Geographic Features
              </h3>
              <p className="text-gray-600">
                Discover mountains, volcanoes, and coastlines visible from your flight path on both sides of the aircraft.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2M7 13h10M7 17h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Flight Details
              </h3>
              <p className="text-gray-600">
                Get detailed flight information including aircraft heading, sun position, and optimal viewing times.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="bg-black py-20">
        <Container maxWidth="4xl">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Discover Your Flight's Scenic Route?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Plan your next flight and explore the magnificent geographical features visible from your aircraft window.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/flight-map">
                <Button variant="secondary" size="lg">
                  Plan Your Route
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-black">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default HomePage;
