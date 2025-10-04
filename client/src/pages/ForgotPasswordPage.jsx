import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../components/Container';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { validateEmail, validateOtp, validatePasswords } from '../utils/validators';
import api from '../api/axios';


const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success


  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email || errors.form) setErrors(prev => ({ ...prev, email: '', form: '' }));
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
    if (errors.otp || errors.form) setErrors(prev => ({ ...prev, otp: '', form: '' }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    if (name === 'newPassword') {
      setNewPassword(value);
    } else {
      setConfirmPassword(value);
    }
    if (errors.newPassword || errors.confirmPassword || errors.form) setErrors(prev => ({ ...prev, newPassword: '', confirmPassword: '', form: '' }));
  };

  // Reuse validators
  const validateEmailLocal = () => {
    const err = validateEmail(email);
    if (Object.keys(err).length) {
      setErrors(prev => ({ ...prev, email: err.email }));
      return false;
    }
    return true;
  };

  const validateOtpLocal = () => {
    const err = validateOtp(otp);
    if (Object.keys(err).length) {
      setErrors(prev => ({ ...prev, otp: err.otp }));
      return false;
    }
    return true;
  };

  const validatePasswordsLocal = () => {
    const err = validatePasswords(newPassword, confirmPassword);
    if (Object.keys(err).length) {
      setErrors(prev => ({ ...prev, ...err }));
      return false;
    }
    return true;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmailLocal()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await api.post("/auth/user-exist", {
        email: email,
      })
      console.log(response.data);
      if (!response.data.exists) {
        setErrors(prev => ({ ...prev, email: 'Email does not exist' }));
      } else {
        const resp = await api.post('/auth/send-otp', { email });
        if (resp?.data?.success) {
          setStep(2);
          setErrors({});
        } else {
          setErrors(prev => ({ ...prev, form: resp?.data?.message || 'Failed to send OTP' }));
        }
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      const msg = err?.response?.data?.data?.message || err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      if (/not found/i.test(msg) || /user not found/i.test(msg)) {
        setErrors(prev => ({ ...prev, email: msg }));
      } else {
        setErrors(prev => ({ ...prev, form: msg }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateOtpLocal()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const resp = await api.post('/auth/verify-otp', { email, otp });
      if (resp?.data?.success) {
        setStep(3);
        setErrors({});
      } else {
        const msg = resp?.data?.message || 'OTP verification failed';
        if (/otp/i.test(msg)) {
          setErrors(prev => ({ ...prev, otp: msg }));
        } else {
          setErrors(prev => ({ ...prev, form: msg }));
        }
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      const msg = err?.response?.data?.data?.message || err?.response?.data?.message || err?.message || 'Invalid OTP. Please try again.';
      if (/otp/i.test(msg)) {
        setErrors(prev => ({ ...prev, otp: msg }));
      } else {
        setErrors(prev => ({ ...prev, form: msg }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if(newPassword !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }
    console.log('Submitting new password:', { email, newPassword, confirmPassword });
    if (!validatePasswordsLocal()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const resp = await api.post('/auth/reset-password', { email, password: newPassword });
      if (resp?.data?.success) {
        setStep(4);
      } else {
        const msg = resp?.data?.message || 'Failed to reset password';
        if (/password/i.test(msg)) {
          setErrors(prev => ({ ...prev, newPassword: msg }));
        } else {
          setErrors(prev => ({ ...prev, form: msg }));
        }
      }
    } catch (err) {
      console.error('Password reset error:', err);
      const msg = err?.response?.data?.data?.message || err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      if (/password/i.test(msg)) {
        setErrors(prev => ({ ...prev, newPassword: msg }));
      } else {
        setErrors(prev => ({ ...prev, form: msg }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    try {
      await api.post("/auth/send-otp", { email });
      console.log('OTP resent to:', email);
      setError('');
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError(error?.response?.data?.message || error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Container maxWidth="lg">
          <div className="text-center mb-8">
            <Logo size="lg" className="mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Password reset successful!
            </h2>
            <p className="text-gray-600">
              Your password has been successfully updated.
            </p>
          </div>

          <Card className="w-full max-w-2xl mx-auto">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  All done!
                </h3>
                <p className="text-gray-600">
                  You can now Login with your new password.
                </p>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 transition-colors"
              >
                Login
              </Link>
            </div>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Container maxWidth="lg">
        <div className="text-center mb-8">
          <Logo size="lg" className="mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 1 && 'Forgot your password?'}
            {step === 2 && 'Verify your email'}
            {step === 3 && 'Set new password'}
          </h2>
          <p className="text-gray-600">
            {step === 1 && "No worries! Enter your email address and we'll send you an OTP to reset your password."}
            {step === 2 && `We've sent a 6-digit OTP to ${email}. Please enter it below.`}
            {step === 3 && 'Please enter your new password below.'}
          </p>
        </div>

        <Card className="w-full max-w-2xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber 
                      ? 'bg-black text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`w-8 h-0.5 ml-4 ${
                      step > stepNumber ? 'bg-black' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <Input
                label="Email address"
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={email}
                onChange={handleEmailChange}
                error={errors.email || errors.form}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <Input
                label="Enter OTP"
                type="text"
                name="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={handleOtpChange}
                error={errors.otp || errors.form}
                maxLength={6}
                required
              />

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the OTP?{' '}
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={isLoading}
                    className="font-medium text-black hover:text-gray-800 transition-colors disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                </p>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <Input
                label="New password"
                type="password"
                name="newPassword"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={handlePasswordChange}
                error={errors.newPassword || errors.form}
                required
              />

              <Input
                label="Confirm new password"
                type="password"
                name="confirmPassword"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={handlePasswordChange}
                error={errors.confirmPassword || errors.form}
                required
              />

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link
                to="/login"
                className="font-medium text-black hover:text-gray-800 transition-colors"
              >
                Login
              </Link>
            </p>
          </div>
        </Card>
      </Container>
    </div>
  );
};

export default ForgotPasswordPage;
