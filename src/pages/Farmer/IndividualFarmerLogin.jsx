import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  signInAnonymously,
} from "firebase/auth";

import {
  auth,
  db,
} from "../../firebase";

import "./IndividualFarmerLogin.css";


/* =========================================================
   HELPERS
========================================================= */

const generateDemoOtp = () => {
  return String(
    Math.floor(
      100000 +
        Math.random() * 900000
    )
  );
};


/* =========================================================
   COMPONENT
========================================================= */

function IndividualFarmerLogin() {
  const navigate =
    useNavigate();


  /* =======================================================
     STATE
  ======================================================= */

  const [mobile, setMobile] =
    useState(
      localStorage.getItem(
        "farmer_mobile"
      ) || ""
    );

  const [otp, setOtp] =
    useState("");

  const [generatedOtp, setGeneratedOtp] =
    useState("");

  const [otpSent, setOtpSent] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [checking, setChecking] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /* =======================================================
     CLEAN OLD OTP ON PAGE LOAD
  ======================================================= */

  useEffect(() => {
    setOtp("");
    setGeneratedOtp("");
    setOtpSent(false);
    setError("");
    setSuccess("");
  }, []);


  /* =======================================================
     MOBILE INPUT
  ======================================================= */

  const handleMobileChange =
    (event) => {
      const value =
        event.target.value
          .replace(/\D/g, "")
          .slice(0, 10);

      setMobile(value);

      setError("");
    };


  /* =======================================================
     SEND DEMO OTP
  ======================================================= */

  const handleSendOtp =
    (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (
        !/^[6-9]\d{9}$/.test(
          mobile
        )
      ) {
        setError(
          "Please enter a valid 10-digit Indian mobile number."
        );

        return;
      }


      const newOtp =
        generateDemoOtp();

      setGeneratedOtp(
        newOtp
      );

      setOtpSent(
        true
      );

      setOtp("");

      localStorage.setItem(
        "farmer_mobile",
        mobile
      );


      /*
        Prototype only:
        Actual SMS is not sent.

        OTP is shown in the development UI.
      */

      setSuccess(
        `Demo OTP generated: ${newOtp}`
      );
    };


  /* =======================================================
     VERIFY OTP
  ======================================================= */

  const handleVerifyOtp =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (
        otp.length !== 6
      ) {
        setError(
          "Please enter the 6-digit OTP."
        );

        return;
      }

      if (
        otp !== generatedOtp
      ) {
        setError(
          "Incorrect OTP. Please enter the demo OTP shown above."
        );

        return;
      }

      setLoading(true);

      try {

        /* =====================================
           FIREBASE ANONYMOUS SESSION
        ===================================== */

        let firebaseUser =
          auth.currentUser;

        if (!firebaseUser) {
          const result =
            await signInAnonymously(
              auth
            );

          firebaseUser =
            result.user;
        }


        /*
          Store current session UID only
          for temporary Firebase authentication.

          IMPORTANT:
          This UID is NOT the permanent farmer identity.
        */

        localStorage.setItem(
          "farmer_uid",
          firebaseUser.uid
        );


        /* =====================================
           CHECK FARMER LOGIN INDEX
        ===================================== */

        setChecking(true);

        const indexRef =
          doc(
            db,
            "farmerLoginIndex",
            mobile
          );

        const indexSnapshot =
          await getDoc(
            indexRef
          );

        setChecking(false);


        /* =====================================
           NEW FARMER
        ===================================== */

        if (
          !indexSnapshot.exists()
        ) {

          /*
            Stable profile ID is based on
            mobile number.

            Admin will create the canonical
            farmerProfile after approval.
          */

          const profileId =
            `farmer_${mobile}`;

          localStorage.setItem(
            "farmer_mobile",
            mobile
          );

          localStorage.setItem(
            "farmer_profile_id",
            profileId
          );

          localStorage.removeItem(
            "farmer_application_id"
          );

          navigate(
            "/farmer/details",
            {
              state: {
                uid:
                  firebaseUser.uid,

                mobile,

                profileId,

                existingUser:
                  false,
              },
            }
          );

          return;
        }


        /* =====================================
           EXISTING FARMER
        ===================================== */

        const indexData =
          indexSnapshot.data();

        const status =
          indexData.status ||
          "pending";


        /*
          Always derive a stable profileId
          if old records don't have one.
        */

        const profileId =
          indexData.profileId ||
          `farmer_${mobile}`;


        localStorage.setItem(
          "farmer_mobile",
          mobile
        );

        localStorage.setItem(
          "farmer_profile_id",
          profileId
        );


        if (
          indexData.applicationId
        ) {
          localStorage.setItem(
            "farmer_application_id",
            indexData.applicationId
          );
        }


        /* =====================================
           APPROVED
        ===================================== */

        if (
          status === "approved"
        ) {

          navigate(
            "/farmer/dashboard",
            {
              state: {
                uid:
                  firebaseUser.uid,

                mobile,

                profileId,

                applicationId:
                  indexData.applicationId ||
                  "",

                existingUser:
                  true,
              },
            }
          );

          return;
        }


        /* =====================================
           REJECTED
        ===================================== */

        if (
          status === "rejected"
        ) {

          navigate(
            "/farmer/details",
            {
              state: {
                uid:
                  firebaseUser.uid,

                mobile,

                profileId,

                applicationId:
                  indexData.applicationId ||
                  "",

                rejected:
                  true,

                existingUser:
                  true,
              },
            }
          );

          return;
        }


        /* =====================================
           PENDING
        ===================================== */

        navigate(
          "/waiting-approval",
          {
            state: {
              uid:
                firebaseUser.uid,

              mobile,

              profileId,

              applicationId:
                indexData.applicationId ||
                "",

              role:
                "individual_farmer",
            },
          }
        );

      } catch (firebaseError) {
        console.error(
          "Farmer login error:",
          firebaseError
        );

        setChecking(false);

        if (
          firebaseError.code ===
          "permission-denied"
        ) {
          setError(
            "Unable to check your farmer account. Please verify your Firestore rules."
          );
        } else {
          setError(
            firebaseError.message ||
              "Unable to continue. Please try again."
          );
        }
      }

      setLoading(false);
    };


  /* =======================================================
     BACK TO MOBILE
  ======================================================= */

  const changeMobile =
    () => {
      setOtpSent(false);

      setOtp("");

      setGeneratedOtp("");

      setError("");

      setSuccess("");
    };


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="individual-farmer-login">

      {/* =====================================
          LEFT BRAND PANEL
      ===================================== */}

      <section className="farmer-login-brand-panel">

        <div className="farmer-login-brand">

          <div className="farmer-login-logo">
            <Leaf
              size={25}
              strokeWidth={1.5}
            />
          </div>

          <span>
            AgriConnect
          </span>

        </div>


        <div className="farmer-login-brand-content">

          <p className="farmer-login-eyebrow">
            INDIVIDUAL FARMER
          </p>

          <h1>
            Your farm.
            <br />
            Your produce.
            <br />
            Your marketplace.
          </h1>

          <p>
            Connect directly with consumers and
            bring your farm produce to the AgriConnect
            marketplace.
          </p>

        </div>


        <div className="farmer-login-brand-footer">

          <div>
            <ShieldCheck
              size={15}
            />

            Verified farmer ecosystem
          </div>

          <div>
            <LockKeyhole
              size={14}
            />

            Secure account access
          </div>

        </div>

      </section>


      {/* =====================================
          RIGHT LOGIN PANEL
      ===================================== */}

      <section className="farmer-login-form-panel">

        <div className="farmer-login-form-container">

          <div className="farmer-login-mobile-brand">

            <div>
              <Leaf
                size={21}
              />
            </div>

            <span>
              AgriConnect
            </span>

          </div>


          {/* ===================================
              HEADER
          =================================== */}

          <div className="farmer-login-heading">

            <span>
              FARMER ACCESS
            </span>

            <h2>
              {otpSent
                ? "Verify your number"
                : "Welcome, Farmer"}
            </h2>

            <p>
              {otpSent
                ? `Enter the verification code for +91 ${mobile}.`
                : "Sign in to manage your farm and produce."}
            </p>

          </div>


          {/* ===================================
              ERROR
          =================================== */}

          {error && (
            <div className="farmer-login-alert error">

              <span>
                !
              </span>

              <p>
                {error}
              </p>

            </div>
          )}


          {/* ===================================
              SUCCESS
          =================================== */}

          {success && (
            <div className="farmer-login-alert success">

              <CheckCircle2
                size={16}
              />

              <p>
                {success}
              </p>

            </div>
          )}


          {/* ===================================
              MOBILE FORM
          =================================== */}

          {!otpSent ? (
            <form
              onSubmit={
                handleSendOtp
              }
              className="farmer-login-form"
            >

              <div className="farmer-login-field">

                <label>
                  Mobile Number
                </label>

                <div className="farmer-mobile-input">

                  <span>
                    +91
                  </span>

                  <input
                    type="tel"
                    inputMode="numeric"
                    value={
                      mobile
                    }
                    onChange={
                      handleMobileChange
                    }
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    autoFocus
                  />

                </div>

                <small>
                  Use the mobile number registered with your farmer account.
                </small>

              </div>


              <button
                type="submit"
                className="farmer-login-primary-button"
              >
                Continue

                <ArrowRight
                  size={16}
                />

              </button>

            </form>
          ) : (

            /* =================================
               OTP FORM
            ================================= */

            <form
              onSubmit={
                handleVerifyOtp
              }
              className="farmer-login-form"
            >

              <div className="farmer-login-otp-field">

                <label>
                  Verification Code
                </label>

                <input
                  className="farmer-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={
                    otp
                  }
                  onChange={(
                    event
                  ) =>
                    setOtp(
                      event.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(
                          0,
                          6
                        )
                    )
                  }
                  placeholder="000000"
                  autoFocus
                />

                <span>
                  Enter the 6-digit demo OTP
                </span>

              </div>


              <button
                type="submit"
                className="farmer-login-primary-button"
                disabled={
                  loading ||
                  checking
                }
              >

                {loading ||
                checking ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="farmer-login-spinner"
                    />

                    Checking...
                  </>
                ) : (
                  <>
                    Verify & Continue

                    <ArrowRight
                      size={16}
                    />
                  </>
                )}

              </button>


              <button
                type="button"
                className="farmer-change-number"
                onClick={
                  changeMobile
                }
              >
                Change mobile number
              </button>

            </form>
          )}


          {/* ===================================
              SECURITY NOTE
          =================================== */}

          <div className="farmer-login-security">

            <LockKeyhole
              size={15}
            />

            <div>

              <strong>
                Secure access
              </strong>

              <p>
                Your farmer profile is linked to your
                registered mobile number.
              </p>

            </div>

          </div>


          {/* ===================================
              FOOTER
          =================================== */}

          <div className="farmer-login-footer">

            <button
              onClick={() =>
                navigate(
                  "/farmer-type"
                )
              }
            >
              ← Back to farmer type
            </button>

            <span>
              AgriConnect Farmer Portal
            </span>

          </div>

        </div>

      </section>

    </div>
  );
}

export default IndividualFarmerLogin;