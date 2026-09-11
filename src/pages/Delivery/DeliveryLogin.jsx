import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import { signInAnonymously } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase";

import "./DeliveryLogin.css";

function DeliveryLogin() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  const [step, setStep] = useState("mobile");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // MOBILE NUMBER
  // =========================================

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    if (value.length <= 10) {
      setMobile(value);
      setError("");
      setSuccess("");
    }
  };

  // =========================================
  // OTP INPUT
  // =========================================

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    if (value.length <= 6) {
      setOtp(value);
      setError("");
      setSuccess("");
    }
  };

  // =========================================
  // GENERATE RANDOM OTP
  // =========================================

  const generateOtp = () => {
    return Math.floor(
      100000 + Math.random() * 900000
    ).toString();
  };

  // =========================================
  // SEND OTP
  // =========================================

  const handleSendOtp = (e) => {
    e.preventDefault();

    if (mobile.length !== 10) {
      setError(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const randomOtp = generateOtp();

    setGeneratedOtp(randomOtp);
    setOtp("");

    setTimeout(() => {
      setLoading(false);

      setSuccess(
        "Demo OTP generated successfully."
      );

      setStep("otp");

      console.log(
        "Delivery Partner Demo OTP:",
        randomOtp
      );
    }, 500);
  };

  // =========================================
  // FIND DELIVERY LOGIN INDEX
  // =========================================

  const findDeliveryLoginIndex = async () => {
    const loginIndexRef = doc(
      db,
      "deliveryLoginIndex",
      mobile
    );

    const loginIndexSnapshot =
      await getDoc(loginIndexRef);

    if (!loginIndexSnapshot.exists()) {
      return null;
    }

    return {
      id: loginIndexSnapshot.id,
      ...loginIndexSnapshot.data(),
    };
  };

  // =========================================
  // FIREBASE SESSION
  // =========================================

  const ensureFirebaseSession = async () => {
    if (auth.currentUser) {
      return auth.currentUser;
    }

    const userCredential =
      await signInAnonymously(auth);

    return userCredential.user;
  };

  // =========================================
  // VERIFY OTP
  // =========================================

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError(
        "Please enter the 6-digit OTP."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    // =====================================
    // CHECK DEMO OTP
    // =====================================

    if (otp !== generatedOtp) {
      setLoading(false);

      setError(
        "Invalid OTP. Please check the code and try again."
      );

      return;
    }

    try {
      // =====================================
      // FIREBASE ANONYMOUS AUTH
      // =====================================

      const firebaseUser =
        await ensureFirebaseSession();

      console.log(
        "Delivery Partner Firebase UID:",
        firebaseUser.uid
      );

      // =====================================
      // CHECK DELIVERY LOGIN INDEX
      // =====================================

      const deliveryIndex =
        await findDeliveryLoginIndex();

      // =====================================
      // NEW DELIVERY PARTNER
      // =====================================

      if (!deliveryIndex) {
        localStorage.setItem(
          "agriconnect_delivery_mobile",
          mobile
        );

        setLoading(false);

        setSuccess(
          "Verification successful. Please complete your delivery partner details."
        );

        setTimeout(() => {
          navigate(
            "/delivery/partner-details",
            {
              state: {
                uid: firebaseUser.uid,
                mobile,
                role: "delivery",
              },
            }
          );
        }, 800);

        return;
      }

      // =====================================
      // SAVE LOGIN INFORMATION
      // =====================================

      localStorage.setItem(
        "agriconnect_delivery_mobile",
        mobile
      );

      const storedUid = deliveryIndex.uid || "";
      const uidMismatch =
        storedUid && storedUid !== firebaseUser.uid;

      /*
        Anonymous Firebase Auth creates a new UID when the
        previous anonymous session is no longer available.

        If the mobile already has an application linked to
        an older anonymous UID, do NOT try to edit that old
        application from the new session. Start a fresh
        application using the current UID.
      */
      if (uidMismatch) {
        console.warn(
          "Stale delivery UID detected. Starting a fresh application session.",
          {
            oldUid: storedUid,
            currentUid: firebaseUser.uid,
            mobile,
            oldApplicationId:
              deliveryIndex.applicationId || "",
          }
        );

        localStorage.removeItem(
          "agriconnect_delivery_applicationId"
        );

        setLoading(false);

        setSuccess(
          "Mobile verification successful. Please continue your delivery partner registration."
        );

        setTimeout(() => {
          navigate(
            "/delivery/partner-details",
            {
              state: {
                uid: firebaseUser.uid,
                mobile,
                role: "delivery",
                applicationId: "",
                rejected:
                  deliveryIndex.status === "rejected",
                rejectionReason:
                  deliveryIndex.rejectionReason || "",
                freshSession: true,
              },
            }
          );
        }, 800);

        return;
      }

      if (deliveryIndex.applicationId) {
        localStorage.setItem(
          "agriconnect_delivery_applicationId",
          deliveryIndex.applicationId
        );
      }

      // =====================================
      // APPROVED
      // =====================================

      if (deliveryIndex.status === "approved") {
        setLoading(false);

        setSuccess(
          "Login successful. Welcome back."
        );

        setTimeout(() => {
          navigate(
            "/delivery/dashboard",
            {
              state: {
                uid: firebaseUser.uid,
                mobile,
                role: "delivery",
                applicationId:
                  deliveryIndex.applicationId || "",
              },
            }
          );
        }, 800);

        return;
      }

      // =====================================
      // PENDING
      // =====================================

      if (deliveryIndex.status === "pending") {
        setLoading(false);

        setSuccess(
          "Your application is currently under admin review."
        );

        setTimeout(() => {
          navigate(
            "/delivery/waiting-approval",
            {
              state: {
                uid: firebaseUser.uid,
                mobile,
                role: "delivery",
                applicationId:
                  deliveryIndex.applicationId || "",
              },
            }
          );
        }, 800);

        return;
      }

      // =====================================
      // REJECTED
      // =====================================

      if (deliveryIndex.status === "rejected") {
        setLoading(false);

        setSuccess(
          "Your application needs an update before approval."
        );

        setTimeout(() => {
          navigate(
            "/delivery/partner-details",
            {
              state: {
                uid: firebaseUser.uid,
                mobile,
                role: "delivery",
                applicationId:
                  deliveryIndex.applicationId || "",
                rejected: true,
                rejectionReason:
                  deliveryIndex.rejectionReason || "",
              },
            }
          );
        }, 800);

        return;
      }

      // =====================================
      // UNKNOWN STATUS
      // =====================================

      setLoading(false);

      setError(
        "Your delivery partner account has an invalid status. Please contact AgriConnect support."
      );

    } catch (firebaseError) {
      console.error(
        "Delivery Firebase authentication/status error:",
        firebaseError
      );

      setLoading(false);

      if (
        firebaseError.code ===
        "permission-denied"
      ) {
        setError(
          "Unable to access your delivery partner account. Please check Firebase Firestore permissions."
        );
      } else {
        setError(
          "Unable to verify your account. Please try again."
        );
      }
    }
  };

  // =========================================
  // CHANGE NUMBER
  // =========================================

  const handleChangeNumber = () => {
    setStep("mobile");
    setOtp("");
    setGeneratedOtp("");
    setError("");
    setSuccess("");
  };

  return (
    <div className="farmer-login-page">

      {/* Background */}

      <div className="farmer-login-glow farmer-login-glow-one"></div>

      <div className="farmer-login-glow farmer-login-glow-two"></div>

      <main className="farmer-login-container">

        {/* Back Button */}

        <button
          type="button"
          className="farmer-login-back"
          onClick={() => navigate("/roles")}
          aria-label="Back"
        >
          <ArrowLeft
            size={19}
            strokeWidth={1.8}
          />
        </button>

        {/* Logo */}

        <div className="farmer-login-logo">
          <Truck
            size={28}
            strokeWidth={1.8}
          />
        </div>

        {/* Header */}

        <div className="farmer-login-header">

          <p className="farmer-login-label">
            DELIVERY PARTNER
          </p>

          {step === "mobile" ? (
            <>
              <h1>
                Welcome <span>Back</span>
              </h1>

              <p className="farmer-login-subtitle">
                Login to continue to your AgriConnect
                account
              </p>
            </>
          ) : (
            <>
              <h1>
                Verify <span>OTP</span>
              </h1>

              <p className="farmer-login-subtitle">
                Enter the 6-digit verification code
                <br />
                sent to{" "}
                <strong>
                  +91 {mobile}
                </strong>
              </p>
            </>
          )}

        </div>

        {/* Login Card */}

        <section className="farmer-login-card">

          {step === "mobile" ? (

            <form onSubmit={handleSendOtp}>

              <div className="farmer-login-field">

                <label htmlFor="mobile">
                  Mobile Number
                </label>

                <div className="farmer-mobile-input">

                  <div className="country-code">
                    <span>+91</span>
                  </div>

                  <div className="mobile-divider"></div>

                  <Smartphone
                    size={19}
                    strokeWidth={1.7}
                    className="mobile-icon"
                  />

                  <input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter your mobile number"
                    value={mobile}
                    onChange={handleMobileChange}
                    maxLength={10}
                    autoComplete="tel"
                  />

                </div>

                <p className="mobile-helper">
                  We'll send a one-time password to this
                  number
                </p>

              </div>

              <button
                type="submit"
                className="send-otp-button"
                disabled={
                  mobile.length !== 10 ||
                  loading
                }
              >
                <span>
                  {loading
                    ? "Generating..."
                    : "Send OTP"}
                </span>

                {!loading && (
                  <ArrowRight
                    size={18}
                    strokeWidth={1.8}
                  />
                )}

              </button>

            </form>

          ) : (

            <form onSubmit={handleVerifyOtp}>

              {/* Demo OTP */}

              <div className="demo-otp-box">

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

              <div className="farmer-login-field">

                <label htmlFor="otp">
                  Verification Code
                </label>

                <input
                  id="otp"
                  className="otp-input"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={handleOtpChange}
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />

              </div>

              {/* Verify */}

              <button
                type="submit"
                className="send-otp-button"
                disabled={
                  otp.length !== 6 ||
                  loading
                }
              >
                <span>
                  {loading
                    ? "Verifying..."
                    : "Verify & Login"}
                </span>

                {!loading && (
                  <CheckCircle2
                    size={18}
                    strokeWidth={1.8}
                  />
                )}

              </button>

              {/* Change Number */}

              <button
                type="button"
                className="change-number-button"
                onClick={handleChangeNumber}
                disabled={loading}
              >
                Change mobile number
              </button>

            </form>
          )}

          {/* Error */}

          {error && (
            <div className="login-message login-error">
              {error}
            </div>
          )}

          {/* Success */}

          {success && (
            <div className="login-message login-success">
              {success}
            </div>
          )}

          {/* Security */}

          <div className="login-security">

            <ShieldCheck
              size={17}
              strokeWidth={1.7}
            />

            <span>
              Your login is secured with OTP verification
            </span>

          </div>

        </section>

        {/* Register */}

        {step === "mobile" && (
          <div className="farmer-register">

            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/delivery/partner-details"
                )
              }
            >
              Register
            </button>

          </div>
        )}

        {/* Footer */}

        <p className="farmer-login-footer">
          AgriConnect • From Farm to Your Home
        </p>

      </main>
    </div>
  );
}

export default DeliveryLogin;