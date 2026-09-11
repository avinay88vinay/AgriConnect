import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Truck,
  UserRound,
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  Car,
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase";

import "./AdminDeliveryReview.css";

function AdminDeliveryReview() {
  const navigate = useNavigate();
  const { applicationId } = useParams();

  const [application, setApplication] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [showRejectBox, setShowRejectBox] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  // =========================================
  // LOAD APPLICATION
  // =========================================

  useEffect(() => {
    const loadApplication = async () => {
      if (!applicationId) {
        setError(
          "Delivery partner application ID is missing."
        );

        setLoading(false);
        return;
      }

      try {
        const applicationRef = doc(
          db,
          "deliveryApplications",
          applicationId
        );

        const snapshot =
          await getDoc(applicationRef);

        if (!snapshot.exists()) {
          setError(
            "Delivery partner application could not be found."
          );

          setLoading(false);
          return;
        }

        setApplication({
          id: snapshot.id,
          ...snapshot.data(),
        });

        setLoading(false);
      } catch (loadError) {
        console.error(
          "Delivery application load error:",
          loadError
        );

        setError(
          "Unable to load this delivery partner application."
        );

        setLoading(false);
      }
    };

    loadApplication();
  }, [applicationId]);

  // =========================================
  // FORMAT DATE
  // =========================================

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Not available";
    }

    try {
      const date =
        timestamp.toDate
          ? timestamp.toDate()
          : new Date(
              timestamp.seconds * 1000
            );

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );
    } catch {
      return "Not available";
    }
  };

  // =========================================
  // APPROVE APPLICATION
  // =========================================

  const handleApprove = async () => {
    if (!application) {
      return;
    }

    const confirmApproval =
      window.confirm(
        "Are you sure you want to approve this delivery partner application?"
      );

    if (!confirmApproval) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      // =====================================
      // UPDATE APPLICATION
      // =====================================

      await updateDoc(
        doc(
          db,
          "deliveryApplications",
          applicationId
        ),
        {
          status: "approved",
          rejectionReason: "",
          reviewedAt: serverTimestamp(),
          reviewedBy:
            auth.currentUser?.email ||
            "admin",
          updatedAt: serverTimestamp(),
        }
      );

      // =====================================
      // UPDATE LOGIN INDEX
      // =====================================

      if (application.mobile) {
        await setDoc(
          doc(
            db,
            "deliveryLoginIndex",
            application.mobile
          ),
          {
            uid: application.uid || "",
            mobile: application.mobile,
            applicationId,
            status: "approved",
            rejectionReason: "",
            updatedAt: serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      }

      setSuccess(
        "Delivery partner application approved successfully."
      );

      setApplication((previous) => ({
        ...previous,
        status: "approved",
        rejectionReason: "",
      }));

      setActionLoading(false);

      setTimeout(() => {
        navigate("/admin/dashboard", {
          replace: true,
        });
      }, 1200);
    } catch (approveError) {
      console.error(
        "Delivery approval error:",
        approveError
      );

      setActionLoading(false);

      setError(
        "Unable to approve the application. Please try again."
      );
    }
  };

  // =========================================
  // REJECT APPLICATION
  // =========================================

  const handleReject = async () => {
    const reason =
      rejectionReason.trim();

    if (!reason) {
      setError(
        "Please provide a rejection reason before rejecting the application."
      );

      return;
    }

    if (!application) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      // =====================================
      // UPDATE APPLICATION
      // =====================================

      await updateDoc(
        doc(
          db,
          "deliveryApplications",
          applicationId
        ),
        {
          status: "rejected",
          rejectionReason: reason,
          reviewedAt: serverTimestamp(),
          reviewedBy:
            auth.currentUser?.email ||
            "admin",
          updatedAt: serverTimestamp(),
        }
      );

      // =====================================
      // UPDATE LOGIN INDEX
      // =====================================

      if (application.mobile) {
        await setDoc(
          doc(
            db,
            "deliveryLoginIndex",
            application.mobile
          ),
          {
            uid: application.uid || "",
            mobile: application.mobile,
            applicationId,
            status: "rejected",
            rejectionReason: reason,
            updatedAt: serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      }

      setSuccess(
        "Application rejected successfully."
      );

      setApplication((previous) => ({
        ...previous,
        status: "rejected",
        rejectionReason: reason,
      }));

      setShowRejectBox(false);

      setActionLoading(false);

      setTimeout(() => {
        navigate("/admin/dashboard", {
          replace: true,
        });
      }, 1200);
    } catch (rejectError) {
      console.error(
        "Delivery rejection error:",
        rejectError
      );

      setActionLoading(false);

      setError(
        "Unable to reject the application. Please try again."
      );
    }
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="admin-delivery-review-page">

        <div className="admin-delivery-loading">

          <Loader2
            size={34}
            className="admin-delivery-loading-icon"
          />

          <h2>
            Loading Application
          </h2>

          <p>
            Retrieving delivery partner details.
          </p>

        </div>

      </div>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (error && !application) {
    return (
      <div className="admin-delivery-review-page">

        <main className="admin-delivery-review-container">

          <div className="admin-delivery-error-card">

            <div className="admin-delivery-error-icon">
              <AlertCircle size={32} />
            </div>

            <h2>
              Unable to Load Application
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/dashboard"
                )
              }
            >
              Back to Dashboard
            </button>

          </div>

        </main>

      </div>
    );
  }

  const personal =
    application?.personalDetails || {};

  const vehicle =
    application?.vehicleDetails || {};

  const documents =
    application?.documents || {};

  const documentEntries =
    Object.entries(documents);

  return (
    <div className="admin-delivery-review-page">

      {/* =====================================
          HEADER
      ====================================== */}

      <header className="admin-delivery-review-header">

        <div className="admin-delivery-review-header-inner">

          <button
            type="button"
            className="admin-delivery-back"
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="admin-delivery-header-brand">

            <div className="admin-delivery-header-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <strong>
                AgriConnect
              </strong>

              <span>
                Delivery Partner Verification
              </span>
            </div>

          </div>

        </div>

      </header>


      {/* =====================================
          MAIN
      ====================================== */}

      <main className="admin-delivery-review-container">

        {/* PAGE TITLE */}

        <section className="admin-delivery-review-title">

          <div>

            <span>
              APPLICATION REVIEW
            </span>

            <h1>
              Delivery Partner Verification
            </h1>

            <p>
              Review the applicant's personal,
              vehicle and document information before
              making a verification decision.
            </p>

          </div>

          <div
            className={`admin-delivery-status ${
              application.status?.toLowerCase() ||
              "pending"
            }`}
          >
            {application.status ||
              "pending"}
          </div>

        </section>


        {/* APPLICATION ID */}

        <div className="admin-delivery-application-id">

          <span>
            Application ID
          </span>

          <strong>
            {applicationId}
          </strong>

        </div>


        {/* =====================================
            ERROR / SUCCESS
        ====================================== */}

        {error && (
          <div className="admin-delivery-action-message error">
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        {success && (
          <div className="admin-delivery-action-message success">
            <CheckCircle2 size={17} />
            {success}
          </div>
        )}


        {/* =====================================
            PERSONAL DETAILS
        ====================================== */}

        <section className="admin-delivery-section">

          <div className="admin-delivery-section-header">

            <div className="admin-delivery-section-icon">
              <UserRound size={20} />
            </div>

            <div>
              <span>
                SECTION 01
              </span>

              <h2>
                Personal Details
              </h2>
            </div>

          </div>


          <div className="admin-delivery-details-grid">

            <ReviewItem
              label="Full Name"
              value={personal.fullName}
              icon={<UserRound size={15} />}
            />

            <ReviewItem
              label="Mobile Number"
              value={
                application.mobile
                  ? `+91 ${application.mobile}`
                  : ""
              }
              icon={<Phone size={15} />}
            />

            <ReviewItem
              label="Email Address"
              value={personal.email}
              icon={<Mail size={15} />}
            />

            <ReviewItem
              label="Date of Birth"
              value={personal.dob}
              icon={<CalendarDays size={15} />}
            />

            <ReviewItem
              label="Gender"
              value={personal.gender}
            />

            <ReviewItem
              label="Pincode"
              value={personal.pincode}
            />

            <ReviewItem
              label="State"
              value={personal.state}
              icon={<MapPin size={15} />}
            />

            <ReviewItem
              label="District"
              value={personal.district}
            />

            <ReviewItem
              label="Mandal"
              value={personal.mandal}
            />

            <ReviewItem
              label="Village"
              value={personal.village}
            />

            <ReviewItem
              label="Address"
              value={personal.address}
              full
              icon={<MapPin size={15} />}
            />

          </div>

        </section>


        {/* =====================================
            VEHICLE DETAILS
        ====================================== */}

        <section className="admin-delivery-section">

          <div className="admin-delivery-section-header">

            <div className="admin-delivery-section-icon vehicle">
              <Truck size={20} />
            </div>

            <div>
              <span>
                SECTION 02
              </span>

              <h2>
                Vehicle Details
              </h2>
            </div>

          </div>


          <div className="admin-delivery-details-grid">

            <ReviewItem
              label="Vehicle Type"
              value={vehicle.vehicleType}
              icon={<Truck size={15} />}
            />

            <ReviewItem
              label="Vehicle Number"
              value={vehicle.vehicleNumber}
              icon={<Car size={15} />}
            />

            <ReviewItem
              label="Vehicle Model"
              value={vehicle.vehicleModel}
              icon={<Car size={15} />}
            />

            <ReviewItem
              label="Vehicle Year"
              value={vehicle.vehicleYear}
            />

            <ReviewItem
              label="Ownership"
              value={vehicle.ownership}
            />

            <ReviewItem
              label="Carrying Capacity"
              value={vehicle.capacity}
            />

            <ReviewItem
              label="Delivery Experience"
              value={vehicle.experience}
              full
            />

          </div>

        </section>


        {/* =====================================
            DOCUMENTS
        ====================================== */}

        <section className="admin-delivery-section">

          <div className="admin-delivery-section-header">

            <div className="admin-delivery-section-icon documents">
              <FileText size={20} />
            </div>

            <div>
              <span>
                SECTION 03
              </span>

              <h2>
                Submitted Documents
              </h2>
            </div>

          </div>


          {documentEntries.length === 0 ? (

            <div className="admin-delivery-no-documents">

              <FileText size={25} />

              <p>
                No document information was
                submitted.
              </p>

            </div>

          ) : (

            <div className="admin-delivery-documents-grid">

              {documentEntries.map(
                ([key, document]) => {

                  const documentName =
                    document?.fileName ||
                    document?.name ||
                    key;

                  return (
                    <div
                      className="admin-delivery-document-card"
                      key={key}
                    >

                      <div className="admin-delivery-document-icon">
                        <FileText size={19} />
                      </div>

                      <div className="admin-delivery-document-info">

                        <span>
                          {formatDocumentLabel(
                            key
                          )}
                        </span>

                        <strong>
                          {documentName}
                        </strong>

                        {document?.fileSize && (
                          <small>
                            {formatFileSize(
                              document.fileSize
                            )}
                          </small>
                        )}

                      </div>

                      <CheckCircle2
                        size={18}
                        className="admin-delivery-document-check"
                      />

                    </div>
                  );
                }
              )}

            </div>

          )}

          <div className="admin-delivery-document-note">

            <AlertCircle size={16} />

            <p>
              Document files are currently stored as
              registration metadata in the prototype.
              Actual file preview is unavailable while
              Firebase Storage is disabled.
            </p>

          </div>

        </section>


        {/* =====================================
            REVIEW INFORMATION
        ====================================== */}

        <section className="admin-delivery-review-info">

          <div>
            <span>
              Submitted
            </span>

            <strong>
              {formatDate(
                application.submittedAt ||
                  application.updatedAt
              )}
            </strong>
          </div>

          <div>
            <span>
              Current Status
            </span>

            <strong>
              {application.status ||
                "pending"}
            </strong>
          </div>

        </section>


        {/* =====================================
            ACTIONS
        ====================================== */}

        {application.status === "pending" && (

          <section className="admin-delivery-actions">

            {!showRejectBox ? (

              <div className="admin-delivery-action-buttons">

                <button
                  type="button"
                  className="admin-delivery-reject-btn"
                  onClick={() => {
                    setError("");
                    setShowRejectBox(true);
                  }}
                  disabled={actionLoading}
                >
                  <XCircle size={18} />
                  Reject Application
                </button>

                <button
                  type="button"
                  className="admin-delivery-approve-btn"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2
                        size={18}
                        className="spin"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Approve Application
                    </>
                  )}
                </button>

              </div>

            ) : (

              <div className="admin-delivery-reject-panel">

                <div className="admin-delivery-reject-header">

                  <div>
                    <span>
                      REJECTION REQUIRED
                    </span>

                    <h3>
                      Why does this application
                      need changes?
                    </h3>
                  </div>

                  <XCircle size={24} />

                </div>


                <textarea
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(
                      e.target.value
                    );

                    setError("");
                  }}
                  placeholder="Enter clear feedback for the delivery partner..."
                  rows={5}
                  maxLength={500}
                  disabled={actionLoading}
                />


                <div className="admin-delivery-reject-footer">

                  <small>
                    {rejectionReason.length}/500
                  </small>

                  <div>

                    <button
                      type="button"
                      className="admin-delivery-cancel-btn"
                      onClick={() => {
                        setShowRejectBox(false);
                        setRejectionReason("");
                        setError("");
                      }}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="admin-delivery-confirm-reject-btn"
                      onClick={handleReject}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2
                            size={17}
                            className="spin"
                          />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle size={17} />
                          Confirm Rejection
                        </>
                      )}
                    </button>

                  </div>

                </div>

              </div>
            )}

          </section>
        )}


        {/* Already processed */}

        {application.status !== "pending" && (

          <div className="admin-delivery-processed">

            {application.status ===
            "approved" ? (
              <CheckCircle2 size={19} />
            ) : (
              <XCircle size={19} />
            )}

            <span>
              This application has already been{" "}
              <strong>
                {application.status}
              </strong>
              .
            </span>

          </div>

        )}

      </main>

    </div>
  );
}


/* =========================================
   REVIEW ITEM
   ========================================= */

function ReviewItem({
  label,
  value,
  icon,
  full = false,
}) {
  return (
    <div
      className={`admin-delivery-review-item ${
        full ? "full" : ""
      }`}
    >

      <span>
        {icon}
        {label}
      </span>

      <strong>
        {value || "Not provided"}
      </strong>

    </div>
  );
}


/* =========================================
   DOCUMENT LABEL
   ========================================= */

function formatDocumentLabel(key) {
  const labels = {
    drivingLicence:
      "Driving Licence",

    vehicleRegistration:
      "Vehicle Registration Certificate",

    identityProof:
      "Identity Proof",

    addressProof:
      "Address Proof",

    vehicleInsurance:
      "Vehicle Insurance",

    supportingDocument:
      "Additional Document",

    additionalDocument:
      "Additional Document",
  };

  if (labels[key]) {
    return labels[key];
  }

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) =>
      char.toUpperCase()
    );
}


/* =========================================
   FILE SIZE
   ========================================= */

function formatFileSize(size) {
  if (!size) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default AdminDeliveryReview;