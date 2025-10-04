import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/Container';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { validateLogin, validateSignup } from '../utils/validators';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
    const newErrors = isLogin ? validateLogin(formData) : validateSignup(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Login attempt:', formData);
      // Handle successful login here
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Container maxWidth="lg">
        <div className="text-center mb-8">
          <Logo size="lg" className="mb-4" />
          {/* toggle moved into card (should appear on top of the card) */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to your FlyByViews account' : 'Join FlyByViews and start exploring the world'}
          </p>
        </div>
  <Card className="w-full max-w-3xl mx-auto">
          <div className="flex justify-center mt-6">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-0 ${isLogin ? 'bg-white shadow text-black focus:text-black' : 'text-gray-600 focus:text-gray-600'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-0 ${!isLogin ? 'bg-white shadow text-black focus:text-black' : 'text-gray-600 focus:text-gray-600'}`}
              >
                Sign Up
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`space-y-6 transition-all duration-300 ease-in-out transform ${
              isLogin ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-100'
            }`}
          >
            {!isLogin && (
              <Input
                label="Name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                required
              />
            )}
            <Input
              label="Email address"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            {!isLogin && (
              <Input
                label="Confirm password"
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
              />
            )}

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm font-medium text-black hover:text-gray-800">
                Forgot your password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign in' : 'Create account')}
            </Button>
          </form>

          {/* hint paragraph intentionally removed; toggle lives inside the card */}
        </Card>
      </Container>
    </div>
  );
};

export default LoginPage;
