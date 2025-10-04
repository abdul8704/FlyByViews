// Reusable client-side validation helpers

export function validateSignup(formData) {
  const errors = {};

  if (!formData.name || !formData.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Email is invalid';
  }

  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
    errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

export function validateLogin(formData) {
  const errors = {};
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Email is invalid';
  }

  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return errors;
}

export function validateEmail(email) {
  if (!email) return { email: 'Email is required' };
  if (!/\S+@\S+\.\S+/.test(email)) return { email: 'Email is invalid' };
  return {};
}

export function validateOtp(otp) {
  if (!otp) return { otp: 'OTP is required' };
  if (!/^\d{6}$/.test(otp)) return { otp: 'OTP must be 6 digits' };
  return {};
}

export function validatePasswords(newPassword, confirmPassword) {
  const errors = {};
  if (!newPassword) {
    errors.newPassword = 'New password is required';
  } else if (newPassword.length < 8) {
    errors.newPassword = 'Password must be at least 8 characters';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    errors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

// Note: functions are exported as named exports above. Import them like:
// import { validateSignup, validateLogin } from '../utils/validators';
