import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBasket,
  ArrowLeft,
  CircleCheck,
  ShieldCheck,
} from "lucide-react";
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase";
import "./ConsumerLogin.css";

function ConsumerLogin() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [step, setStep] = useState("mobile");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isMobileValid = /^[6-9]\d{9}$/.test(mobile);

  // Generate Demo OTP
  const generateOtp = () => {
    const newOtp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    setGeneratedOtp(newOtp);
    setStep("otp");
    setOtp("");
    setError("");

    console.log("Consumer Demo OTP:", newOtp);
  };

  // Mobile Submit
  const handleMobileSubmit = (event) => {
    event.preventDefault();

    if (!isMobileValid) {
      setError(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    generateOtp();
  };

  // OTP Submit
  const handleOtpSubmit = async (event) => {
    event.preventDefault();

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    if (otp !== generatedOtp) {
      setError("Incorrect OTP. Please try again.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Create Firebase anonymous session
      let currentUser = auth.currentUser;

      if (!currentUser) {
        const result = await signInAnonymously(auth);
        currentUser = result.user;
      }

      // Save mobile locally
      localStorage.setItem(
        "consumer_mobile",
        mobile
      );

      // Check whether consumer already exists
      const loginRef = doc(
        db,
        "consumerLoginIndex",
        mobile
      );

      const loginSnap = await getDoc(loginRef);

      // =====================================
      // EXISTING CONSUMER
      // =====================================

      if (loginSnap.exists()) {
        const consumerData = loginSnap.data();

        localStorage.setItem(
          "consumer_profile_id",
          consumerData.profileId || ""
        );

        navigate("/consumer/dashboard", {
          state: {
            uid: currentUser.uid,
            mobile,
            profileId:
              consumerData.profileId || "",
            existingUser: true,
          },
        });

        return;
      }

      // =====================================
      // NEW CONSUMER
      // =====================================

      navigate("/consumer/details", {
        state: {
          uid: currentUser.uid,
          mobile,
          isNewUser: true,
        },
      });

    } catch (error) {
      console.error(
        "Consumer login error:",
        error
      );

      setError(
        "Unable to check your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Change Mobile Number
  const changeMobile = () => {
    setStep("mobile");
    setOtp("");
    setGeneratedOtp("");
    setError("");
  };

  return (
    <div className="consumer-login-page">

      {/* Background Glows */}
      <div className="consumer-glow consumer-glow-one"></div>
      <div className="consumer-glow consumer-glow-two"></div>

      <main className="consumer-login-container">

        {/* Back */}
        <button
          type="button"
          className="consumer-back-button"
          onClick={() => navigate("/roles")}
          aria-label="Back"
        >
          <ArrowLeft
            size={23}
            strokeWidth={1.5}
          />
        </button>

        {/* Header */}
        <div className="consumer-login-header">

          <div className="consumer-logo">
            <ShoppingBasket
              size={32}
              strokeWidth={1.5}
            />
          </div>

          <p className="consumer-label">
            CONSUMER
          </p>

          {step === "mobile" ? (
            <>
              <h1>Consumer Login</h1>

              <p className="consumer-description">
                Enter your mobile number to continue
                <br />
                securely with AgriConnect.
              </p>
            </>
          ) : (
            <>
              <h1>Verify OTP</h1>

              <p className="consumer-description">
                Enter the 6-digit verification code
                <br />
                sent to <strong>+91 {mobile}</strong>
              </p>
            </>
          )}

        </div>

        {/* Login Card */}
        <section className="consumer-login-card">

          {/* =================================
              MOBILE STEP
          ================================== */}

          {step === "mobile" ? (

            <form onSubmit={handleMobileSubmit}>

              <div className="consumer-form-group">

                <label>
                  Mobile Number
                </label>

                <div
                  className={`consumer-mobile-input ${
                    mobile.length > 0 &&
                    isMobileValid
                      ? "valid"
                      : ""
                  }`}
                >

                  <span>+91</span>

                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={mobile}
                    onChange={(event) => {
                      const value =
                        event.target.value.replace(
                          /\D/g,
                          ""
                        );

                      setMobile(value);
                      setError("");
                    }}
                  />

                </div>

              </div>

              {error && (
                <div className="consumer-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={`consumer-login-button ${
                  isMobileValid
                    ? "active"
                    : "disabled"
                }`}
                disabled={!isMobileValid}
              >
                Continue

                <CircleCheck
                  size={20}
                  strokeWidth={1.6}
                />
              </button>

              <div className="consumer-security">

                <ShieldCheck
                  size={18}
                  strokeWidth={1.6}
                />

                <span>
                  Your login is secured with OTP verification
                </span>

              </div>

            </form>

          ) : (

            /* =================================
               OTP STEP
            ================================== */

            <form onSubmit={handleOtpSubmit}>

              {/* Demo OTP */}
              <div className="consumer-demo-otp">

                <div className="demo-otp-info">

                  <span>
                    Demo OTP
                  </span>

                  <small>
                    Development mode
                  </small>

                </div>

                <strong>
                  {generatedOtp}
                </strong>

              </div>

              {/* OTP Input */}
              <div className="consumer-form-group">

                <label>
                  Verification Code
                </label>

                <input
                  className="consumer-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(event) => {
                    const value =
                      event.target.value.replace(
                        /\D/g,
                        ""
                      );

                    setOtp(value);
                    setError("");
                  }}
                />

              </div>

              {error && (
                <div className="consumer-error">
                  {error}
                </div>
              )}

              {/* Verify */}
              <button
                type="submit"
                className={`consumer-login-button ${
                  otp.length === 6
                    ? "active"
                    : "disabled"
                }`}
                disabled={
                  otp.length !== 6 ||
                  loading
                }
              >
                {loading
                  ? "Checking..."
                  : "Verify & Login"}

                {!loading && (
                  <CircleCheck
                    size={20}
                    strokeWidth={1.6}
                  />
                )}

              </button>

              {/* Change Number */}
              <button
                type="button"
                className="consumer-change-number"
                onClick={changeMobile}
                disabled={loading}
              >
                Change mobile number
              </button>

              {/* Demo Success */}
              <div className="consumer-demo-success">
                Demo OTP generated successfully.
              </div>

              {/* Divider */}
              <div className="consumer-divider"></div>

              {/* Security */}
              <div className="consumer-security">

                <ShieldCheck
                  size={19}
                  strokeWidth={1.6}
                />

                <span>
                  Your login is secured with OTP verification
                </span>

              </div>

            </form>
          )}

        </section>

        {/* Footer */}
        <p className="consumer-footer">
          AGRICONNECT • FROM FARM TO YOUR HOME
        </p>

      </main>
    </div>
  );
}

export default ConsumerLogin;