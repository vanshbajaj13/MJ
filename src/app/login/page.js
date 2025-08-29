// app/login/page.js - Protected login page
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Loading from "@/components/Loading/LoadingScreen";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, setUser } = useUser();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");

  // 🔐 PROTECTION: Redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/"); // Redirect to home page
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return <Loading />;
  }

  // If user is logged in, don't show login form (this prevents flash)
  if (user) {
    return (
      <div>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p>You are already logged in! Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      // Success - update context
      setUser(data.user);
      setMessage("Login successful! Redirecting...");

      // Redirect to home page
      router.push("/");
    } catch (err) {
      console.error("Error:", err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!form.email) {
      setMessage("Please enter your email address first");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || data.error || "Failed to send OTP");
        return;
      }

      setMessage("OTP sent to your email!");
      setOtpMode(true);
    } catch (err) {
      console.error("Error:", err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    
    if (!otp) {
      setMessage("Please enter the OTP");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || data.error || "Invalid OTP");
        return;
      }

      // Success - update context
      setUser(data.user);
      setMessage("Login successful! Redirecting...");

      // Redirect to home page
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err) {
      console.error("Error:", err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToLogin = () => {
    setOtpMode(false);
    setShowForgotPassword(false);
    setOtp("");
    setMessage("");
  };

  // Only show login form if user is NOT logged in
  return (
    <div>
      <div className="min-h-[90vh] flex items-center justify-center">
        <form
          onSubmit={otpMode ? handleOtpLogin : handleLogin}
          className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
            {otpMode ? "Enter OTP" : "Welcome Back"}
          </h2>
          <p className="text-center text-gray-600 mb-6">
            {otpMode 
              ? "Enter the OTP sent to your email" 
              : "Sign in to your account"
            }
          </p>

          {!otpMode && (
            <>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required={!showForgotPassword}
                className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-300 ease-in-out font-medium mb-4"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>

              <div className="text-center mb-4">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="text-purple-600 hover:underline text-sm disabled:opacity-50"
                >
                  Forgot Password? Login with OTP
                </button>
              </div>
            </>
          )}

          {otpMode && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Email: {form.email}</p>
              </div>

              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-center text-lg tracking-widest"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-300 ease-in-out font-medium mb-4"
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>

              <div className="text-center mb-4">
                <button
                  type="button"
                  onClick={resetToLogin}
                  className="text-purple-600 hover:underline text-sm"
                >
                  ← Back to Password Login
                </button>
              </div>
            </>
          )}

          {message && (
            <p
              className={`text-center text-sm mt-4 ${
                message.includes("successful") || message.includes("sent")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <p className="text-center text-sm mt-6 text-gray-600">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-purple-600 hover:underline font-medium"
            >
              Sign Up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}