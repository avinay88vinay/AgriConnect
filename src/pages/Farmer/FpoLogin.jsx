import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

import { auth, db } from "../../firebase";

import "./FpoLogin.css";

function FpoLogin() {
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
    }, 500);
  };

  // =========================================
  // ENSURE FIREBASE SESSION
  // =========================================

  const ensureFirebaseSession = async () => {
    try {
      let currentUser = auth.currentUser;

      if (!currentUser) {
        const credential =
          await signInAnonymously(auth);

        currentUser = credential.user;
      }

      console.log(
        "Current Firebase FPO UID:",
        currentUser.uid
      );

      return currentUser;
    } catch (err) {
      console.error(
        "Firebase anonymous authentication error:",
        err
      );

      throw new Error(
        "Unable to create a secure login session. Please try again."
      );
    }
  };

  // =========================================
  // CHECK EXISTING FPO
  // =========================================

  const checkExistingFpo = async () => {
    try {
      const currentUser =
        await ensureFirebaseSession();

      const fpoRef = doc(
        db,
        "fpoLoginIndex",
        mobile
      );

      const fpoSnap = await getDoc(fpoRef);

      // =====================================
      // NEW FPO
      // =====================================

      if (!fpoSnap.exists()) {
        return {
          type: "new",
          uid: currentUser.uid,
        };
      }

      const fpoData = fpoSnap.data();

      console.log(
        "Existing FPO data:",
        fpoData
      );

      /*
       * IMPORTANT:
       *
       * We intentionally use the CURRENT
       * Firebase anonymous UID.
       *
       * Do not use the old UID stored in
       * fpoLoginIndex as the active session UID.
       */

      return {
        type: "existing",

        ...fpoData,

        uid: currentUser.uid,
      };
    } catch (err) {
      console.error(
        "FPO lookup error:",
        err
      );

      throw new Error(
        err.message ||
          "Unable to check your FPO account. Please try again."
      );
    }
  };

  // =========================================
  // UPDATE LOGIN SESSION
  // =========================================

  const updateFpoLoginSession = async (
    result,
    currentUser
  ) => {
    if (!result?.applicationId) {
      return;
    }

    try {
      const loginIndexRef = doc(
        db,
        "fpoLoginIndex",
        mobile
      );

      /*
       * Keep the current Firebase UID as
       * the active prototype session UID.
       */

      await setDoc(
        loginIndexRef,
        {
          uid: currentUser.uid,

          applicationId:
            result.applicationId,

          mobile,

          status:
            result.status || "pending",

          rejectionReason:
            result.rejectionReason || "",

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      console.log(
        "FPO login session updated:",
        currentUser.uid
      );
    } catch (err) {
      console.error(
        "Unable to update FPO login session:",
        err
      );

      /*
       * Do not immediately stop login here.
       * Dashboard will handle Firestore access.
       */
    }
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

    setTimeout(async () => {
      try {
        // ===================================
        // OTP CHECK
        // ===================================

        if (otp !== generatedOtp) {
          setLoading(false);

          setError(
            "Invalid OTP. Please check the code and try again."
          );

          return;
        }

        // ===================================
        // FIREBASE SESSION
        // ===================================

        const currentUser =
          await ensureFirebaseSession();

        console.log(
          "Authenticated FPO UID:",
          currentUser.uid
        );

        // ===================================
        // CHECK EXISTING FPO
        // ===================================

        const result =
          await checkExistingFpo();

        setLoading(false);

        // ===================================
        // NEW FPO
        // =====================================

        if (result.type === "new") {
          setSuccess(
            "Mobile verified. Let's register your FPO."
          );

          setTimeout(() => {
            navigate(
              "/fpo/organisation-details",
              {
                state: {
                  mobile,

                  uid:
                    currentUser.uid,

                  isNewUser: true,

                  role: "fpo",

                  status: "new",

                  rejected: false,
                },
              }
            );
          }, 800);

          return;
        }

        // ===================================
        // EXISTING FPO
        // =====================================

        const status =
          result.status?.toLowerCase();

        console.log(
          "Existing FPO status:",
          status
        );

        console.log(
          "Application ID:",
          result.applicationId
        );

        // ===================================
        // APPROVED
        // =====================================

        if (status === "approved") {
          setSuccess(
            "Login successful. Welcome back."
          );

          /*
           * Update the active prototype
           * session UID.
           */

          await updateFpoLoginSession(
            result,
            currentUser
          );

          setTimeout(() => {
            navigate(
              "/fpo/dashboard",
              {
                state: {
                  mobile,

                  uid:
                    currentUser.uid,

                  applicationId:
                    result.applicationId,

                  role: "fpo",

                  status: "approved",
                },
              }
            );
          }, 800);

          return;
        }

        // ===================================
        // PENDING
        // =====================================

        if (status === "pending") {
          setSuccess(
            "Your FPO application is under verification."
          );

          await updateFpoLoginSession(
            result,
            currentUser
          );

          setTimeout(() => {
            navigate(
              "/fpo/waiting-approval",
              {
                state: {
                  mobile,

                  uid:
                    currentUser.uid,

                  applicationId:
                    result.applicationId,

                  role: "fpo",

                  status: "pending",
                },
              }
            );
          }, 800);

          return;
        }

        // ===================================
        // REJECTED
        // ===================================

        if (status === "rejected") {
          setSuccess(
            "Your application needs some updates."
          );

          await updateFpoLoginSession(
            result,
            currentUser
          );

          setTimeout(() => {
            navigate(
              "/fpo/organisation-details",
              {
                state: {
                  mobile,

                  uid:
                    currentUser.uid,

                  applicationId:
                    result.applicationId,

                  role: "fpo",

                  status: "rejected",

                  rejectionReason:
                    result.rejectionReason ||
                    "",

                  isNewUser: false,

                  rejected: true,
                },
              }
            );
          }, 800);

          return;
        }

        // ===================================
        // UNKNOWN STATUS
        // ===================================

        setError(
          "Your FPO account has an invalid status. Please contact support."
        );
      } catch (err) {
        console.error(
          "FPO verification error:",
          err
        );

        setLoading(false);

        setError(
          err.message ||
            "Something went wrong. Please try again."
        );
      }
    }, 500);
  };

  // =========================================
  // CHANGE MOBILE NUMBER
  // =========================================

  const handleChangeNumber = () => {
    setStep("mobile");
    setOtp("");
    setGeneratedOtp("");
    setError("");
    setSuccess("");
  };

  return (
    <div className="fpo-login-page">

      {/* Background */}
      <div className="fpo-login-glow fpo-login-glow-one"></div>
      <div className="fpo-login-glow fpo-login-glow-two"></div>

      <main className="fpo-login-container">

        {/* Back Button */}
        <button
          type="button"
          className="fpo-login-back"
          onClick={() =>
            navigate("/farmer-type")
          }
          aria-label="Back to farmer type"
        >
          <ArrowLeft
            size={19}
            strokeWidth={1.8}
          />
        </button>

        {/* Logo */}
        <div className="fpo-login-logo">
          <Building2
            size={28}
            strokeWidth={1.7}
          />
        </div>

        {/* Header */}
        <div className="fpo-login-header">

          <p className="fpo-login-label">
            FARMER PRODUCER ORGANIZATION
          </p>

          {step === "mobile" ? (
            <>
              <h1>
                Welcome <span>Back</span>
              </h1>

              <p className="fpo-login-subtitle">
                Login to manage your FPO account on
                AgriConnect
              </p>
            </>
          ) : (
            <>
              <h1>
                Verify <span>OTP</span>
              </h1>

              <p className="fpo-login-subtitle">
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
        <section className="fpo-login-card">

          {step === "mobile" ? (

            <form onSubmit={handleSendOtp}>

              <div className="fpo-login-field">

                <label htmlFor="fpo-mobile">
                  Registered Mobile Number
                </label>

                <div className="fpo-mobile-input">

                  <div className="fpo-country-code">
                    <span>+91</span>
                  </div>

                  <div className="fpo-mobile-divider"></div>

                  <Smartphone
                    size={19}
                    strokeWidth={1.7}
                    className="fpo-mobile-icon"
                  />

                  <input
                    id="fpo-mobile"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter registered mobile number"
                    value={mobile}
                    onChange={handleMobileChange}
                    maxLength={10}
                    autoComplete="tel"
                  />

                </div>

                <p className="fpo-mobile-helper">
                  Use the mobile number registered with your FPO
                </p>

              </div>

              <button
                type="submit"
                className="fpo-send-otp-button"
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
              <div className="fpo-demo-otp-box">

                <div className="fpo-demo-otp-info">

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
              <div className="fpo-login-field">

                <label htmlFor="fpo-otp">
                  Verification Code
                </label>

                <input
                  id="fpo-otp"
                  className="fpo-otp-input"
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

              {/* Verify Button */}
              <button
                type="submit"
                className="fpo-send-otp-button"
                disabled={
                  otp.length !== 6 ||
                  loading
                }
              >
                <span>
                  {loading
                    ? "Verifying..."
                    : "Verify & Continue"}
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
                className="fpo-change-number-button"
                onClick={handleChangeNumber}
              >
                Change mobile number
              </button>

            </form>
          )}

          {/* Error */}
          {error && (
            <div className="fpo-login-message fpo-login-error">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="fpo-login-message fpo-login-success">
              {success}
            </div>
          )}

          {/* Security */}
          <div className="fpo-login-security">

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
          <div className="fpo-register">

            <span>
              Don't have an FPO account?
            </span>

            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);

                  const currentUser =
                    await ensureFirebaseSession();

                  setLoading(false);

                  navigate(
                    "/fpo/organisation-details",
                    {
                      state: {
                        mobile: "",

                        uid:
                          currentUser.uid,

                        isNewUser: true,

                        role: "fpo",

                        status: "new",

                        rejected: false,
                      },
                    }
                  );
                } catch (err) {
                  console.error(err);

                  setLoading(false);

                  setError(
                    err.message ||
                      "Unable to start registration."
                  );
                }
              }}
            >
              Register
            </button>

          </div>
        )}

        {/* Footer */}
        <p className="fpo-login-footer">
          AgriConnect • FPO Verification
        </p>

      </main>
    </div>
  );
}

export default FpoLogin;