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
              <Link to="/flights">
                <Button variant="primary" size="lg">
                  Explore Flights
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
              Why Choose FlyByViews?
            </h2>
            <p className="text-lg text-gray-600">
              We make aerial photography and flight experiences accessible to everyone
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Stunning Photography
              </h3>
              <p className="text-gray-600">
                Access to thousands of high-quality aerial photographs from professional photographers worldwide.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Real-time Updates
              </h3>
              <p className="text-gray-600">
                Get the latest flight information and weather conditions for your aerial photography sessions.
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
                Global Coverage
              </h3>
              <p className="text-gray-600">
                Explore aerial views from every corner of the world, from bustling cities to remote natural wonders.
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
              Ready to See the World from Above?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of photographers and aviation enthusiasts who trust FlyByViews for their aerial adventures.
            </p>
            <Link to="/signup">
              <Button variant="secondary" size="lg">
                Start Your Journey
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default HomePage;
