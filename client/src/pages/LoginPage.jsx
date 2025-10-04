import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { validateLogin } from '../utils/validators';
import api from '../api/axios';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
    const newErrors = validateLogin(formData);
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
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });

      console.log('Login successful:', response.data);

      if (response.data.success) {
        // Redirect to dashboard or home page
        window.location.href = '/'; // Adjust the path as needed
      }
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-600">Sign in to your FlyByViews account</p>
        </div>
  <Card className="w-full max-w-3xl mx-auto">
          <div className="flex justify-center mt-6">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`px-6 py-2 rounded-md font-medium bg-white shadow text-black focus:outline-none focus:ring-0 focus:text-black`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className={`px-6 py-2 rounded-md font-medium text-gray-600 focus:outline-none focus:ring-0 focus:text-gray-600`}
              >
                Sign Up
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`space-y-6 transition-all duration-300 ease-in-out transform translate-x-0 opacity-100`}
          >
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

            {/* confirm password removed from login form */}

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
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* hint paragraph intentionally removed; toggle lives inside the card */}
        </Card>
      </Container>
    </div>
  );
};

export default LoginPage;
