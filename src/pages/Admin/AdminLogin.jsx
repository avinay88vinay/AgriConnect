import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

import "./AdminLogin.css";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = userCredential.user;

      // Temporary prototype admin verification
      if (
        user.email?.toLowerCase() !==
        "admin@agriconnect.com"
      ) {
        await auth.signOut();

        setError(
          "You are not authorised to access the admin portal."
        );

        setLoading(false);
        return;
      }

      navigate("/admin/dashboard");
    } catch (firebaseError) {
      console.error(
        "Admin login error:",
        firebaseError
      );

      setError(
        "Invalid admin credentials. Please try again."
      );

      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">

      {/* Background */}
      <div className="admin-login-glow admin-glow-one"></div>
      <div className="admin-login-glow admin-glow-two"></div>

      <main className="admin-login-container">

        {/* Back */}
        <button
          type="button"
          className="admin-back-button"
          onClick={() => navigate("/roles")}
          aria-label="Back to roles"
        >
          <ArrowLeft
            size={20}
            strokeWidth={1.7}
          />
        </button>

        {/* Header */}
        <div className="admin-login-header">

          <div className="admin-logo">
            <ShieldCheck
              size={32}
              strokeWidth={1.6}
            />
          </div>

          <p className="admin-label">
            AGRICONNECT
          </p>

          <h1>Admin Portal</h1>

          <p className="admin-description">
            Secure administration and platform management.
          </p>

        </div>

        {/* Card */}
        <section className="admin-login-card">

          <div className="admin-card-heading">
            <h2>Administrator Login</h2>

            <p>
              Sign in with your authorised administrator
              credentials.
            </p>
          </div>

          <form onSubmit={handleLogin}>

            {/* Email */}
            <div className="admin-form-group">

              <label htmlFor="admin-email">
                Email Address
              </label>

              <input
                id="admin-email"
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                autoComplete="email"
                disabled={loading}
              />

            </div>

            {/* Password */}
            <div className="admin-form-group">

              <label htmlFor="admin-password">
                Password
              </label>

              <div className="admin-password-input">

                <input
                  id="admin-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                      strokeWidth={1.7}
                    />
                  ) : (
                    <Eye
                      size={18}
                      strokeWidth={1.7}
                    />
                  )}
                </button>

              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="admin-error">
                {error}
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              className="admin-login-button"
              disabled={loading}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Secure Login

                  <ArrowRight
                    size={18}
                    strokeWidth={1.7}
                  />
                </>
              )}
            </button>

          </form>

          {/* Security */}
          <div className="admin-security">

            <div className="admin-security-icon">
              <LockKeyhole
                size={16}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <strong>
                Protected administration
              </strong>

              <p>
                Only authorised administrators can
                access this portal.
              </p>
            </div>

          </div>

        </section>

        {/* Footer */}
        <p className="admin-footer">
          AGRICONNECT • ADMINISTRATION PORTAL
        </p>

      </main>
    </div>
  );
}

export default AdminLogin;