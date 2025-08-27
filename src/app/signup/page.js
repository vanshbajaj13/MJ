// app/signup/page.js - Protected signup page
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Loading from "@/components/Loading/LoadingScreen";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading, setUser } = useUser();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🔐 PROTECTION: Redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log("✅ User already logged in, redirecting...");
      router.push("/"); // Redirect to home page
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return <Loading />;
  }

  // If user is logged in, don't show signup form (this prevents flash)
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Signup failed");
        return;
      }

      // Success - update context
      setUser(data.user);
      setMessage("Account created successfully! Redirecting...");

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

  // Only show signup form if user is NOT logged in
  return (
    <div>
      <div className="min-h-[90vh] flex items-center justify-center">
        <form
          onSubmit={handleSignup}
          className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
            Create Account
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Join our jewelry collection
          </p>

          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
          />

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
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-300 ease-in-out font-medium"
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>

          {message && (
            <p
              className={`text-center text-sm mt-4 ${
                message.includes("successfully")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <p className="text-center text-sm mt-6 text-gray-600">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-purple-600 hover:underline font-medium"
            >
              Sign In
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
