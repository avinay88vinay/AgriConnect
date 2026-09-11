import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Clock3,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../../firebase";

import "./WaitingForApproval.css";

function WaitingForApproval() {
  const location = useLocation();
  const navigate = useNavigate();

  // =========================================
  // ROUTER STATE
  // =========================================

  const role =
    location.state?.role || "farmer";

  const applicationId =
    location.state?.applicationId || "";

  const initialUid =
    location.state?.uid || "";

  const initialMobile =
    location.state?.mobile || "";

  // =========================================
  // STATE
  // =========================================

  const [status, setStatus] =
    useState("pending");

  const [rejectionReason, setRejectionReason] =
    useState(
      location.state?.rejectionReason || ""
    );

  const [applicationData, setApplicationData] =
    useState(null);

  const [checking, setChecking] =
    useState(true);

  // =========================================
  // REAL-TIME APPLICATION STATUS
  // =========================================

  useEffect(() => {
    if (!applicationId) {
      setChecking(false);
      return;
    }

    const applicationRef = doc(
      db,
      "farmerApplications",
      applicationId
    );

    const unsubscribe = onSnapshot(
      applicationRef,

      (snapshot) => {
        // =====================================
        // APPLICATION DOES NOT EXIST
        // =====================================

        if (!snapshot.exists()) {
          setChecking(false);
          setStatus("not-found");
          return;
        }

        const data =
          snapshot.data();

        setApplicationData(data);

        const currentStatus =
          data.status || "pending";

        setStatus(currentStatus);

        setRejectionReason(
          data.rejectionReason || ""
        );

        setChecking(false);

        // =====================================
        // APPROVED
        // =====================================

        if (
          currentStatus === "approved"
        ) {
          navigate(
            "/farmer/dashboard",
            {
              replace: true,

              state: {
                uid:
                  data.uid ||
                  initialUid,

                mobile:
                  data.mobile ||
                  initialMobile,

                applicationId,

                role: "farmer",
              },
            }
          );

          return;
        }

        // =====================================
        // REJECTED
        // =====================================
        //
        // Stay on this page.
        // Show rejection reason.
        //

        if (
          currentStatus === "rejected"
        ) {
          return;
        }
      },

      (firebaseError) => {
        console.error(
          "Application status listener error:",
          firebaseError
        );

        setChecking(false);
      }
    );

    // Cleanup listener
    return () => {
      unsubscribe();
    };
  }, [
    applicationId,
    initialUid,
    initialMobile,
    navigate,
  ]);

  // =========================================
  // ROLE LABEL
  // =========================================

  const roleLabel =
    role === "fpo"
      ? "FPO"
      : role === "consumer"
      ? "Consumer"
      : role === "delivery"
      ? "Delivery Partner"
      : "Farmer";

  // =========================================
  // RESUBMIT
  // =========================================

  const handleResubmit = () => {
    navigate(
      "/farmer/details",
      {
        state: {
          uid:
            applicationData?.uid ||
            initialUid,

          mobile:
            applicationData?.mobile ||
            initialMobile,

          role: "farmer",

          applicationId,

          rejected: true,

          rejectionReason:
            rejectionReason || "",
        },
      }
    );
  };

  // =========================================
  // BACK
  // =========================================

  const handleBack = () => {
    navigate("/roles");
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <div className="waiting-page">

      {/* =====================================
          BACK BUTTON
      ====================================== */}

      <button
        type="button"
        className="waiting-back-button"
        onClick={handleBack}
        aria-label="Go back"
      >
        <ArrowLeft size={20} />
      </button>

      {/* =====================================
          MAIN CARD
      ====================================== */}

      <div
        className={`waiting-card ${
          status === "rejected"
            ? "waiting-card-rejected"
            : ""
        }`}
      >

        {/* ===================================
            TOP ICON
        ==================================== */}

        <div
          className={`waiting-icon ${
            status === "rejected"
              ? "waiting-icon-rejected"
              : ""
          }`}
        >
          {status === "rejected" ? (
            <XCircle
              size={42}
              strokeWidth={1.7}
            />
          ) : (
            <Clock3
              size={42}
              strokeWidth={1.7}
            />
          )}
        </div>

        {/* ===================================
            BRAND
        ==================================== */}

        <div className="waiting-brand">
          AGRICONNECT
        </div>

        <div className="waiting-role">
          {roleLabel.toUpperCase()}
        </div>

        {/* ===================================
            TITLE
        ==================================== */}

        <h1>
          {status === "rejected"
            ? "Application Rejected"
            : status === "not-found"
            ? "Application Not Found"
            : "Verification Pending"}
        </h1>

        <p className="waiting-subtitle">
          {status === "rejected"
            ? "Your application needs some changes before it can be approved."
            : status === "not-found"
            ? "We could not find your application. Please try again."
            : "Your registration has been submitted successfully and is currently waiting for administrator approval."}
        </p>

        {/* =====================================
            REJECTION CARD
        ====================================== */}

        {status === "rejected" && (
          <div className="rejection-card">

            <div className="rejection-card-header">

              <div className="rejection-card-icon">
                <XCircle
                  size={22}
                  strokeWidth={1.8}
                />
              </div>

              <div>

                <span className="rejection-card-label">
                  APPLICATION REJECTED
                </span>

                <h3>
                  Changes Required
                </h3>

              </div>

            </div>

            <p className="rejection-card-description">
              The administrator reviewed your
              application and requested changes
              before approval.
            </p>

            <div className="rejection-reason-box">

              <span className="rejection-reason-label">
                ADMIN'S REASON
              </span>

              <p>
                {rejectionReason ||
                  "Please review your application details and documents before resubmitting."}
              </p>

            </div>

            <button
              type="button"
              className="rejection-resubmit-button"
              onClick={handleResubmit}
            >
              <span>
                Update & Resubmit
              </span>

              <ArrowRight size={18} />
            </button>

          </div>
        )}

        {/* =====================================
            APPLICATION NOT FOUND
        ====================================== */}

        {status === "not-found" && (
          <div className="waiting-info-box">

            <ShieldCheck size={22} />

            <p>
              Your application record could not
              be located. Please return and try
              again.
            </p>

          </div>
        )}

        {/* =====================================
            NORMAL PENDING STATUS
        ====================================== */}

        {status !== "rejected" &&
          status !== "not-found" && (
            <>
              <div className="waiting-status-box">

                <div className="waiting-status-icon">
                  <FileCheck2 size={22} />
                </div>

                <div className="waiting-status-content">

                  <h3>
                    Application Submitted
                  </h3>

                  <p>
                    {checking
                      ? "Checking application status..."
                      : "Status: Pending Admin Review"}
                  </p>

                </div>

              </div>

              {/* INFORMATION */}

              <div className="waiting-info-box">

                <ShieldCheck size={22} />

                <p>
                  Our administration team will
                  review your submitted details and
                  documents. Your dashboard will
                  become available once your
                  application is approved.
                </p>

              </div>
            </>
          )}

        {/* =====================================
            STEPS
        ====================================== */}

        {status !== "not-found" && (
          <div className="waiting-steps">

            {/* Submitted */}

            <div className="waiting-step completed">

              <div className="step-circle">
                <CheckCircle2 size={18} />
              </div>

              <span>
                Submitted
              </span>

            </div>

            <div className="step-line"></div>

            {/* Admin Review */}

            <div
              className={`waiting-step ${
                status === "approved" ||
                status === "rejected"
                  ? "completed"
                  : "active"
              }`}
            >

              <div className="step-circle">

                {status === "approved" ||
                status === "rejected" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  "2"
                )}

              </div>

              <span>
                Admin Review
              </span>

            </div>

            <div className="step-line"></div>

            {/* Approved */}

            <div
              className={`waiting-step ${
                status === "approved"
                  ? "completed"
                  : ""
              }`}
            >

              <div className="step-circle">

                {status === "approved" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  "3"
                )}

              </div>

              <span>
                Approved
              </span>

            </div>

          </div>
        )}

        {/* =====================================
            PENDING FOOTER
        ====================================== */}

        {status !== "rejected" &&
          status !== "not-found" && (
            <p className="waiting-footer-text">
              You can stay on this page. The
              application status will update
              automatically after admin review.
            </p>
          )}

      </div>

      {/* =====================================
          BOTTOM BRAND
      ====================================== */}

      <div className="waiting-bottom-brand">
        AGRICONNECT • SECURE • TRUSTED • CONNECTED
      </div>

    </div>
  );
}

export default WaitingForApproval;