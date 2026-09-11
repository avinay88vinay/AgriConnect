import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Truck,
  Clock3,
  CircleCheck,
  XCircle,
  LogOut,
  RefreshCcw,
} from "lucide-react";
import {
  doc,
  onSnapshot,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import "./DeliveryWaitingForApproval.css";

function DeliveryWaitingForApproval() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const [mobile, setMobile] = useState(
    state.mobile ||
      localStorage.getItem(
        "agriconnect_delivery_mobile"
      ) ||
      ""
  );

  const [applicationId, setApplicationId] = useState(
    state.applicationId ||
      localStorage.getItem(
        "agriconnect_delivery_applicationId"
      ) ||
      ""
  );

  const [status, setStatus] = useState("pending");
  const [rejectionReason, setRejectionReason] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!applicationId) {
      setError(
        "Application information is missing. Please login again."
      );
      setLoading(false);
      return;
    }

    const applicationRef = doc(
      db,
      "deliveryApplications",
      applicationId
    );

    const unsubscribe = onSnapshot(
      applicationRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setError(
            "Your delivery partner application could not be found."
          );
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        setStatus(data.status || "pending");
        setRejectionReason(
          data.rejectionReason || ""
        );

        if (data.mobile) {
          setMobile(data.mobile);

          localStorage.setItem(
            "agriconnect_delivery_mobile",
            data.mobile
          );
        }

        setLoading(false);

        if (data.status === "approved") {
          navigate("/delivery/dashboard", {
            replace: true,
            state: {
              mobile: data.mobile || mobile,
              uid: data.uid || "",
              applicationId,
            },
          });
        }
      },
      (snapshotError) => {
        console.error(
          "Delivery application listener error:",
          snapshotError
        );

        setError(
          "Unable to check your application status."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [applicationId, navigate]);

  const handleResubmit = () => {
    navigate("/delivery/partner-details", {
      state: {
        mobile,
        applicationId,
        rejected: true,
        rejectionReason,
      },
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (logoutError) {
      console.error(
        "Delivery logout error:",
        logoutError
      );
    }

    localStorage.removeItem(
      "agriconnect_delivery_mobile"
    );

    localStorage.removeItem(
      "agriconnect_delivery_applicationId"
    );

    navigate("/login/delivery", {
      replace: true,
    });
  };

  if (loading) {
    return (
      <div className="delivery-waiting-page">
        <main className="delivery-waiting-container">
          <div className="delivery-waiting-card loading">

            <div className="delivery-waiting-logo">
              <Truck size={30} />
            </div>

            <h1>Checking Application</h1>

            <p>
              Please wait while we retrieve your
              application status.
            </p>

            <div className="delivery-waiting-spinner">
              <RefreshCcw
                size={22}
                strokeWidth={1.7}
              />
            </div>

          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="delivery-waiting-page">

        <main className="delivery-waiting-container">

          <div className="delivery-waiting-card">

            <div className="delivery-status-icon error">
              <XCircle size={34} strokeWidth={1.5} />
            </div>

            <p className="delivery-waiting-label">
              DELIVERY PARTNER
            </p>

            <h1>Unable to Load Application</h1>

            <p className="delivery-waiting-description">
              {error}
            </p>

            <button
              type="button"
              className="delivery-waiting-button"
              onClick={() =>
                navigate("/login/delivery")
              }
            >
              Back to Login
            </button>

          </div>

        </main>

      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="delivery-waiting-page">

        <div className="delivery-waiting-glow one"></div>
        <div className="delivery-waiting-glow two"></div>

        <main className="delivery-waiting-container">

          <button
            type="button"
            className="delivery-waiting-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Logout
          </button>

          <div className="delivery-waiting-card">

            <div className="delivery-status-icon rejected">
              <XCircle
                size={36}
                strokeWidth={1.5}
              />
            </div>

            <p className="delivery-waiting-label">
              DELIVERY PARTNER APPLICATION
            </p>

            <h1>Application Needs Changes</h1>

            <p className="delivery-waiting-description">
              Your application was reviewed by the
              AgriConnect admin team and requires
              some changes before approval.
            </p>

            {rejectionReason && (
              <div className="delivery-rejection-box">

                <span>Admin Feedback</span>

                <p>{rejectionReason}</p>

              </div>
            )}

            <button
              type="button"
              className="delivery-waiting-button"
              onClick={handleResubmit}
            >
              Update & Resubmit
            </button>

          </div>

          <p className="delivery-waiting-footer">
            AGRICONNECT • DELIVERY PARTNER VERIFICATION
          </p>

        </main>

      </div>
    );
  }

  return (
    <div className="delivery-waiting-page">

      <div className="delivery-waiting-glow one"></div>
      <div className="delivery-waiting-glow two"></div>

      <main className="delivery-waiting-container">

        <button
          type="button"
          className="delivery-waiting-logout"
          onClick={handleLogout}
        >
          <LogOut size={17} />
          Logout
        </button>

        <div className="delivery-waiting-card">

          <div className="delivery-status-icon pending">
            <Clock3
              size={36}
              strokeWidth={1.5}
            />
          </div>

          <p className="delivery-waiting-label">
            DELIVERY PARTNER APPLICATION
          </p>

          <h1>Application Under Review</h1>

          <p className="delivery-waiting-description">
            Your application has been submitted
            successfully. Our admin team will verify
            your details and documents.
          </p>

          <div className="delivery-waiting-status">

            <div className="status-item active">
              <div>
                <CircleCheck size={18} />
              </div>

              <span>
                Application Submitted
              </span>
            </div>

            <div className="status-line"></div>

            <div className="status-item active">
              <div>
                <Clock3 size={18} />
              </div>

              <span>
                Admin Verification
              </span>
            </div>

            <div className="status-line"></div>

            <div className="status-item">
              <div>3</div>

              <span>
                Approval
              </span>
            </div>

          </div>

          <div className="delivery-waiting-note">
            <strong>
              What happens next?
            </strong>

            <p>
              Our team will review your personal
              information, vehicle details and submitted
              documents. You will be able to access your
              delivery dashboard once your application
              is approved.
            </p>
          </div>

          <div className="delivery-application-id">
            <span>Application ID</span>
            <strong>{applicationId}</strong>
          </div>

        </div>

        <p className="delivery-waiting-footer">
          AGRICONNECT • DELIVERY PARTNER VERIFICATION
        </p>

      </main>

    </div>
  );
}

export default DeliveryWaitingForApproval;