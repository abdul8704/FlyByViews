import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "../components/Container";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import Logo from "../components/Logo";
import { validateSignup, validateOtp } from "../utils/validators";
import api from "../api/axios";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = validateSignup(formData);
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
      const response = await api.post("/auth/user-exist", {
        email: formData.email,
      })
      if(response.data.exists) {
        setErrors((prev) => ({
          ...prev,
          email: "Email already exists",
        }));
      } else {
        await sendOtp();
        console.log("Signup attempt:", formData);
      }
      // Handle successful signup here
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // API: send OTP to user's email
  const sendOtp = async () => {
    setOtpError("");
    if (!formData.email) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      throw new Error("Email required");
    }

    setOtpLoading(true);
    try {
      const resp = await api.post("/auth/send-otp", { email: formData.email });
      if (resp?.data?.success) {
        setOtpSent(true);
      } else {
        throw new Error(resp?.data?.message || "Failed to send OTP");
      }
    } catch (err) {
      setOtpError(
        err?.response?.data?.message || err.message || "Failed to send OTP"
      );
      throw err;
    } finally {
      setOtpLoading(false);
    }
  };

  // API: verify OTP; on success, create user
  const verifyOtp = async () => {
    setOtpError("");
    const validation = validateOtp(otp);
    if (Object.keys(validation).length) {
      setOtpError(validation.otp);
      return;
    }

    setOtpLoading(true);
    try {
      const resp = await api.post("/auth/verify-otp", {
        email: formData.email,
        otp,
      });
      console.log("OTP verify response:", resp);
      if (resp?.data?.success) {
        // OTP verified; create the user
        await createUser();
        navigate("/flight-map");
      } else if (resp?.data.data.message === "Incorrect OTP") {
        setOtpError(resp?.data?.data?.message);
      } else {
        setOtpError(resp?.data?.message || "OTP verification failed");
      }
    } catch (err) {
      setOtpError(
        err?.response?.data.data?.message ||
          err.message ||
          "OTP verification failed"
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // API: create the user after OTP verified
  const createUser = async () => {
    setIsLoading(true);
    try {
      const payload = {
        username: formData.name,
        email: formData.email,
        password: formData.password,
      };
      const resp = await api.post("/auth/signup", payload);
      if (resp?.data?.success) {
        // Registration complete - redirect to home or login
        window.location.href = "/";
      } else {
        setErrors((prev) => ({
          ...prev,
          form: resp?.data?.message || "Registration failed",
        }));
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form:
          err?.response?.data?.message || err.message || "Registration failed",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setResendLoading(true);
    try {
      await sendOtp();
    } catch (err) {
      console.error("Resend OTP failed", err);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Container maxWidth="lg">
        <div className="text-center mb-8">
          <Logo size="lg" className="mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Create your account
          </h2>
          <p className="text-gray-600">
            Join FlyByViews and start exploring the world
          </p>
        </div>

        <Card className="w-full max-w-3xl mx-auto">
          {!otpSent && (
            <div className="flex justify-center mt-6">
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-0 text-gray-600 focus:text-gray-600`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {}}
                  className={`px-6 py-2 rounded-md font-medium bg-white shadow text-black focus:outline-none focus:ring-0 focus:text-black`}
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
          {!otpSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />

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

              {/* Terms/Privacy removed as requested */}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Processing..." : "Create account"}
              </Button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <Input
                label="Verify OTP"
                type="text"
                name="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                error={otpError}
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resendOtp}
                  disabled={resendLoading}
                >
                  {resendLoading ? "Resending..." : "Resend OTP"}
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={verifyOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Container>
    </div>
  );
};

export default SignupPage;
