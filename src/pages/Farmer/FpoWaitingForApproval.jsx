import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  Building2,
  AlertCircle,
  RefreshCw,
  LogOut,
} from "lucide-react";
import {
  doc,
  onSnapshot,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

import { auth, db } from "../../firebase";
import "./FpoWaitingForApproval.css";

function FpoWaitingForApproval() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    mobile = "",
    uid = "",
    applicationId = "",
    status: initialStatus = "pending",
  } = location.state || {};

  const [status, setStatus] = useState(
    initialStatus?.toLowerCase() || "pending"
  );

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) {
      setLoading(false);
      return;
    }

    const applicationRef = doc(
      db,
      "fpoApplications",
      applicationId
    );

    const unsubscribe = onSnapshot(
      applicationRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        setApplication(data);
        setStatus(
          data.status?.toLowerCase() || "pending"
        );
        setLoading(false);
      },
      (error) => {
        console.error(
          "FPO application listener error:",
          error
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [applicationId]);

  useEffect(() => {
    if (status === "approved" && application) {
      const timer = setTimeout(() => {
        navigate("/fpo/dashboard", {
          state: {
            mobile:
              application.mobile ||
              mobile,
            uid:
              application.uid ||
              uid,
            applicationId,
            role: "fpo",
            status: "approved",
            organisation:
              application.organisation || {},
            farmers:
              application.farmers || [],
          },
        });
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, [
    status,
    application,
    applicationId,
    mobile,
    uid,
    navigate,
  ]);

  const handleUpdateApplication = () => {
    navigate("/fpo/organisation-details", {
      state: {
        mobile:
          application?.mobile || mobile,
        uid:
          application?.uid || uid,
        applicationId,
        status: "rejected",
        rejected: true,
        rejectionReason:
          application?.rejectionReason || "",
        isNewUser: false,
        organisation:
          application?.organisation || {},
      },
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }

    navigate("/roles", { replace: true });
  };

  if (loading) {
    return (
      <div className="fpo-wait-page">
        <div className="fpo-wait-card">
          <div className="fpo-wait-icon loading">
            <RefreshCw size={32} />
          </div>

          <h1>Checking Application</h1>

          <p>
            Please wait while we check your FPO
            application status.
          </p>
        </div>
      </div>
    );
  }

  if (!applicationId) {
    return (
      <div className="fpo-wait-page">
        <div className="fpo-wait-card error-card">
          <div className="fpo-wait-icon error">
            <AlertCircle size={32} />
          </div>

          <h1>Application Not Found</h1>

          <p>
            We could not find your FPO application.
            Please start the registration process again.
          </p>

          <button
            className="fpo-primary-btn"
            onClick={() =>
              navigate("/login/farmer/fpo")
            }
          >
            Go to FPO Login
          </button>
        </div>
      </div>
    );
  }

  // =========================================
  // APPROVED
  // =========================================

  if (status === "approved") {
    return (
      <div className="fpo-wait-page">
        <div className="fpo-wait-card approved-card">

          <div className="fpo-status-icon approved">
            <CheckCircle2 size={42} />
          </div>

          <span className="fpo-status-label approved-label">
            APPLICATION APPROVED
          </span>

          <h1>Welcome to AgriConnect</h1>

          <p>
            Your FPO application has been successfully
            verified and approved by the admin.
          </p>

          <div className="fpo-redirect-box">
            <Building2 size={20} />

            <span>
              Redirecting you to your FPO dashboard...
            </span>
          </div>

        </div>
      </div>
    );
  }

  // =========================================
  // REJECTED
  // =========================================

  if (status === "rejected") {
    return (
      <div className="fpo-wait-page">
        <div className="fpo-wait-card rejected-card">

          <div className="fpo-status-icon rejected">
            <AlertCircle size={42} />
          </div>

          <span className="fpo-status-label rejected-label">
            ACTION REQUIRED
          </span>

          <h1>Application Needs Update</h1>

          <p>
            Your FPO application was reviewed by the
            admin and requires some changes before it
            can be approved.
          </p>

          {application?.rejectionReason && (
            <div className="fpo-reason-box">
              <div className="reason-title">
                <FileCheck2 size={18} />
                Admin Feedback
              </div>

              <p>
                {application.rejectionReason}
              </p>
            </div>
          )}

          <button
            className="fpo-primary-btn"
            onClick={handleUpdateApplication}
          >
            Update & Resubmit
          </button>

          <button
            className="fpo-logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Logout
          </button>

        </div>
      </div>
    );
  }

  // =========================================
  // PENDING
  // =========================================

  return (
    <div className="fpo-wait-page">
      <div className="fpo-wait-card">

        <div className="fpo-brand">
          <div className="fpo-brand-icon">
            <Building2 size={22} />
          </div>

          <span>AgriConnect</span>
        </div>

        <div className="fpo-status-icon pending">
          <Clock3 size={42} />
        </div>

        <span className="fpo-status-label pending-label">
          APPLICATION UNDER REVIEW
        </span>

        <h1>Waiting for Approval</h1>

        <p>
          Your FPO registration has been submitted
          successfully. Our admin team is reviewing
          your application.
        </p>

        <div className="fpo-application-info">
          <div>
            <span>Application ID</span>
            <strong>
              {applicationId.slice(0, 12)}...
            </strong>
          </div>

          <div>
            <span>Registered Mobile</span>
            <strong>
              {application?.mobile || mobile || "—"}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong className="pending-text">
              Pending Review
            </strong>
          </div>
        </div>

        <div className="fpo-progress">

          <div className="fpo-progress-step active">
            <div className="step-circle">
              <CheckCircle2 size={18} />
            </div>

            <span>Submitted</span>
          </div>

          <div className="progress-line active-line" />

          <div className="fpo-progress-step active">
            <div className="step-circle">
              <Clock3 size={18} />
            </div>

            <span>Admin Review</span>
          </div>

          <div className="progress-line" />

          <div className="fpo-progress-step">
            <div className="step-circle">
              <CheckCircle2 size={18} />
            </div>

            <span>Approved</span>
          </div>

        </div>

        <div className="fpo-note">
          <FileCheck2 size={18} />

          <p>
            You don't need to keep refreshing this page.
            We'll automatically update the status when
            the admin completes the review.
          </p>
        </div>

        <button
          className="fpo-logout-btn"
          onClick={handleLogout}
        >
          <LogOut size={17} />
          Logout
        </button>

      </div>
    </div>
  );
}

export default FpoWaitingForApproval;