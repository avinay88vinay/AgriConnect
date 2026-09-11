import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Users,
  UserRound,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  Phone,
  Mail,
  CalendarDays,
  Map,
} from "lucide-react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

import { auth, db } from "../../firebase";
import "./AdminFpoReview.css";

function AdminFpoReview() {
  const navigate = useNavigate();
  const { applicationId } = useParams();

  const [application, setApplication] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] =
    useState(false);

  const [error, setError] = useState("");
  const [showRejectBox, setShowRejectBox] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  // =========================================
  // FETCH APPLICATION
  // =========================================

  useEffect(() => {
    const fetchApplication = async () => {
      if (!applicationId) {
        setError("Application ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const applicationRef = doc(
          db,
          "fpoApplications",
          applicationId
        );

        const snapshot = await getDoc(
          applicationRef
        );

        if (!snapshot.exists()) {
          setError(
            "FPO application could not be found."
          );
          setLoading(false);
          return;
        }

        setApplication({
          id: snapshot.id,
          ...snapshot.data(),
        });

        setLoading(false);
      } catch (err) {
        console.error(
          "FPO application error:",
          err
        );

        setError(
          "Unable to load the FPO application."
        );

        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId]);

  // =========================================
  // APPROVE
  // =========================================

  const handleApprove = async () => {
    if (!application) return;

    const confirmed = window.confirm(
      "Are you sure you want to approve this FPO application?"
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      const applicationRef = doc(
        db,
        "fpoApplications",
        applicationId
      );

      await updateDoc(applicationRef, {
        status: "approved",
        reviewedAt: serverTimestamp(),
        reviewedBy:
          auth.currentUser?.email ||
          "admin@agriconnect.com",
        rejectionReason: "",
      });

      // =====================================
      // UPDATE FPO LOGIN INDEX
      // =====================================

      const mobile =
        application.mobile ||
        application.organisation?.mobile ||
        "";

      if (mobile) {
        const loginIndexRef = doc(
          db,
          "fpoLoginIndex",
          mobile
        );

        await setDoc(
          loginIndexRef,
          {
            uid: application.uid,
            applicationId,
            mobile,
            status: "approved",
            rejectionReason: "",
            updatedAt:
              serverTimestamp(),
          },
          { merge: true }
        );
      }

      alert(
        "FPO application approved successfully."
      );

      navigate("/admin/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error(
        "FPO approval error:",
        err
      );

      alert(
        "Unable to approve the application. Please try again."
      );

      setProcessing(false);
    }
  };

  // =========================================
  // REJECT
  // =========================================

  const handleReject = async () => {
    const reason =
      rejectionReason.trim();

    if (!reason) {
      alert(
        "Please provide a rejection reason."
      );
      return;
    }

    if (!application) return;

    setProcessing(true);

    try {
      const applicationRef = doc(
        db,
        "fpoApplications",
        applicationId
      );

      await updateDoc(applicationRef, {
        status: "rejected",
        reviewedAt: serverTimestamp(),
        reviewedBy:
          auth.currentUser?.email ||
          "admin@agriconnect.com",
        rejectionReason: reason,
      });

      // =====================================
      // UPDATE FPO LOGIN INDEX
      // =====================================

      const mobile =
        application.mobile ||
        application.organisation?.mobile ||
        "";

      if (mobile) {
        const loginIndexRef = doc(
          db,
          "fpoLoginIndex",
          mobile
        );

        await setDoc(
          loginIndexRef,
          {
            uid: application.uid,
            applicationId,
            mobile,
            status: "rejected",
            rejectionReason: reason,
            updatedAt:
              serverTimestamp(),
          },
          { merge: true }
        );
      }

      alert(
        "FPO application rejected with feedback."
      );

      navigate("/admin/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error(
        "FPO rejection error:",
        err
      );

      alert(
        "Unable to reject the application. Please try again."
      );

      setProcessing(false);
    }
  };

  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(
        "Logout error:",
        err
      );
    }

    navigate("/admin", {
      replace: true,
    });
  };

  // =========================================
  // DATE FORMAT
  // =========================================

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";

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
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "—";
    }
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="admin-fpo-loading">
        <div className="admin-fpo-loading-card">

          <LoaderCircle
            size={35}
            className="admin-fpo-loader"
          />

          <h2>
            Loading FPO Application
          </h2>

          <p>
            Please wait while the application
            details are loaded.
          </p>

        </div>
      </div>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (error || !application) {
    return (
      <div className="admin-fpo-loading">
        <div className="admin-fpo-loading-card">

          <div className="admin-fpo-error-icon">
            <AlertCircle size={30} />
          </div>

          <h2>
            Application Not Available
          </h2>

          <p>
            {error ||
              "The requested application could not be loaded."}
          </p>

          <button
            className="admin-fpo-back-btn"
            onClick={() =>
              navigate("/admin/dashboard")
            }
          >
            Back to Dashboard
          </button>

        </div>
      </div>
    );
  }

  const organisation =
    application.organisation || {};

  const farmers =
    Array.isArray(application.farmers)
      ? application.farmers
      : [];

  const documents =
    application.documents || {};

  const status =
    application.status?.toLowerCase() ||
    "pending";

  const totalLand = farmers.reduce(
    (total, farmer) =>
      total +
      (parseFloat(
        farmer.landArea
      ) || 0),
    0
  );

  const crops = [
    ...new Set(
      farmers
        .map((farmer) =>
          farmer.crop?.trim()
        )
        .filter(Boolean)
    ),
  ];

  return (
    <div className="admin-fpo-page">

      {/* =====================================
          HEADER
      ====================================== */}

      <header className="admin-fpo-header">

        <div className="admin-fpo-header-inner">

          <button
            className="admin-fpo-back-link"
            onClick={() =>
              navigate("/admin/dashboard")
            }
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="admin-fpo-header-brand">

            <div>
              <ShieldCheck size={18} />
            </div>

            <span>
              FPO Verification
            </span>

          </div>

          <button
            className="admin-fpo-logout"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* =====================================
          MAIN
      ====================================== */}

      <main className="admin-fpo-main">

        {/* Page Heading */}

        <section className="admin-fpo-title-section">

          <div>

            <span className="admin-fpo-eyebrow">
              APPLICATION REVIEW
            </span>

            <h1>
              {organisation.fpoName ||
                "FPO Organisation"}
            </h1>

            <p>
              Review the organisation,
              members and submitted information
              before making a decision.
            </p>

          </div>

          <div
            className={`admin-fpo-status ${status}`}
          >
            {status === "approved" && (
              <CheckCircle2 size={16} />
            )}

            {status === "rejected" && (
              <XCircle size={16} />
            )}

            {status === "pending" && (
              <LoaderCircle size={16} />
            )}

            {status}
          </div>

        </section>


        {/* =====================================
            APPLICATION OVERVIEW
        ====================================== */}

        <section className="admin-fpo-overview-grid">

          <div className="admin-fpo-overview-card">

            <Building2 size={20} />

            <div>
              <span>
                Organisation Type
              </span>

              <strong>
                {organisation.fpoType ||
                  "—"}
              </strong>
            </div>

          </div>


          <div className="admin-fpo-overview-card">

            <Users size={20} />

            <div>
              <span>
                Member Farmers
              </span>

              <strong>
                {farmers.length}
              </strong>
            </div>

          </div>


          <div className="admin-fpo-overview-card">

            <Map size={20} />

            <div>
              <span>
                Total Land
              </span>

              <strong>
                {totalLand.toFixed(1)} acres
              </strong>
            </div>

          </div>


          <div className="admin-fpo-overview-card">

            <SproutIcon />

            <div>
              <span>
                Crop Types
              </span>

              <strong>
                {crops.length}
              </strong>
            </div>

          </div>

        </section>


        {/* =====================================
            ORGANISATION DETAILS
        ====================================== */}

        <section className="admin-fpo-panel">

          <div className="admin-fpo-panel-heading">

            <div className="admin-fpo-panel-icon">
              <Building2 size={19} />
            </div>

            <div>
              <span>
                ORGANISATION
              </span>

              <h2>
                Organisation Details
              </h2>
            </div>

          </div>


          <div className="admin-fpo-details-grid">

            <Detail
              label="FPO Name"
              value={
                organisation.fpoName
              }
            />

            <Detail
              label="Registration Number"
              value={
                organisation.registrationNumber
              }
            />

            <Detail
              label="FPO Type"
              value={
                organisation.fpoType
              }
            />

            <Detail
              label="Establishment Year"
              value={
                organisation.establishmentYear
              }
              icon={<CalendarDays size={15} />}
            />

            <Detail
              label="Email"
              value={
                organisation.email
              }
              icon={<Mail size={15} />}
            />

            <Detail
              label="Mobile"
              value={
                organisation.mobile ||
                application.mobile
              }
              icon={<Phone size={15} />}
            />

            <Detail
              label="Authorised Person"
              value={
                organisation.authorizedPerson
              }
            />

            <Detail
              label="Designation"
              value={
                organisation.designation
              }
            />

            <Detail
              label="State"
              value={
                organisation.state
              }
            />

            <Detail
              label="District"
              value={
                organisation.district
              }
            />

            <Detail
              label="Mandal"
              value={
                organisation.mandal
              }
            />

            <Detail
              label="Village"
              value={
                organisation.village
              }
            />

            <Detail
              label="Pincode"
              value={
                organisation.pincode
              }
            />

            <div className="admin-fpo-detail-item full">
              <span>
                <MapPin size={15} />
                Address
              </span>

              <strong>
                {organisation.address ||
                  "—"}
              </strong>
            </div>

          </div>

        </section>


        {/* =====================================
            FARMER MEMBERS
        ====================================== */}

        <section className="admin-fpo-panel">

          <div className="admin-fpo-panel-heading">

            <div className="admin-fpo-panel-icon">
              <Users size={19} />
            </div>

            <div>
              <span>
                FARMER NETWORK
              </span>

              <h2>
                Member Farmers
              </h2>
            </div>

          </div>


          {farmers.length === 0 ? (

            <div className="admin-fpo-empty">
              <Users size={30} />

              <p>
                No member farmers were submitted.
              </p>
            </div>

          ) : (

            <div className="admin-fpo-table-wrap">

              <table className="admin-fpo-table">

                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Member ID</th>
                    <th>Mobile</th>
                    <th>Location</th>
                    <th>Crop</th>
                    <th>Land</th>
                  </tr>
                </thead>

                <tbody>

                  {farmers.map(
                    (
                      farmer,
                      index
                    ) => (

                      <tr
                        key={
                          farmer.memberId ||
                          farmer.mobile ||
                          index
                        }
                      >

                        <td>
                          <div className="admin-farmer-name">

                            <div className="admin-farmer-avatar">
                              <UserRound
                                size={15}
                              />
                            </div>

                            <strong>
                              {farmer.name ||
                                "Farmer"}
                            </strong>

                          </div>
                        </td>

                        <td>
                          {farmer.memberId ||
                            "—"}
                        </td>

                        <td>
                          {farmer.mobile ||
                            "—"}
                        </td>

                        <td>
                          {farmer.village ||
                            "—"}
                          {farmer.district
                            ? `, ${farmer.district}`
                            : ""}
                        </td>

                        <td>
                          {farmer.crop ||
                            "—"}
                        </td>

                        <td>
                          {farmer.landArea
                            ? `${farmer.landArea} acres`
                            : "—"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* =====================================
            DOCUMENTS
        ====================================== */}

        <section className="admin-fpo-panel">

          <div className="admin-fpo-panel-heading">

            <div className="admin-fpo-panel-icon">
              <FileText size={19} />
            </div>

            <div>
              <span>
                DOCUMENTS
              </span>

              <h2>
                Submitted Documents
              </h2>
            </div>

          </div>


          <div className="admin-fpo-documents">

            {Object.entries(
              documents
            ).length === 0 ? (

              <div className="admin-fpo-empty">
                <FileText size={30} />

                <p>
                  No document information
                  available.
                </p>
              </div>

            ) : (

              Object.entries(
                documents
              ).map(
                (
                  [key, document]
                ) => (

                  <div
                    className="admin-fpo-document-card"
                    key={key}
                  >

                    <div className="admin-fpo-document-icon">
                      <FileText size={20} />
                    </div>

                    <div>

                      <strong>
                        {formatDocumentName(
                          key
                        )}
                      </strong>

                      <span>
                        {document?.name ||
                          "Document submitted"}
                      </span>

                    </div>

                    <CheckCircle2
                      size={18}
                      className="admin-document-check"
                    />

                  </div>

                )
              )

            )}

          </div>

          <div className="admin-fpo-document-note">
            <AlertCircle size={16} />

            <span>
              Document files are currently stored
              as submission metadata in the
              prototype. Actual file viewing can be
              enabled when Firebase Storage is
              configured.
            </span>

          </div>

        </section>


        {/* =====================================
            SUBMISSION INFO
        ====================================== */}

        <section className="admin-fpo-submission-info">

          <div>
            <span>
              Application ID
            </span>

            <strong>
              {applicationId}
            </strong>
          </div>

          <div>
            <span>
              Submitted On
            </span>

            <strong>
              {formatDate(
                application.submittedAt
              )}
            </strong>
          </div>

          {application.reviewedAt && (
            <div>
              <span>
                Last Reviewed
              </span>

              <strong>
                {formatDate(
                  application.reviewedAt
                )}
              </strong>
            </div>
          )}

        </section>


        {/* =====================================
            ACTION AREA
        ====================================== */}

        {status === "pending" ? (

          <section className="admin-fpo-action-panel">

            <div className="admin-fpo-action-heading">

              <ShieldCheck size={21} />

              <div>
                <h2>
                  Verification Decision
                </h2>

                <p>
                  Approve the application if all
                  submitted information is valid.
                  Otherwise provide clear feedback
                  for resubmission.
                </p>
              </div>

            </div>


            {showRejectBox && (

              <div className="admin-fpo-reject-box">

                <label>
                  Rejection Reason
                </label>

                <textarea
                  value={
                    rejectionReason
                  }
                  onChange={(event) =>
                    setRejectionReason(
                      event.target.value
                    )
                  }
                  placeholder="Explain what needs to be corrected or updated..."
                  rows={4}
                  maxLength={500}
                />

                <div className="admin-fpo-reject-footer">

                  <span>
                    {rejectionReason.length}/500
                  </span>

                  <div>

                    <button
                      className="admin-fpo-cancel-btn"
                      onClick={() => {
                        setShowRejectBox(
                          false
                        );
                        setRejectionReason(
                          ""
                        );
                      }}
                      disabled={processing}
                    >
                      Cancel
                    </button>

                    <button
                      className="admin-fpo-confirm-reject"
                      onClick={
                        handleReject
                      }
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <LoaderCircle
                            size={16}
                            className="admin-small-loader"
                          />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          Confirm Rejection
                        </>
                      )}
                    </button>

                  </div>

                </div>

              </div>

            )}


            {!showRejectBox && (

              <div className="admin-fpo-action-buttons">

                <button
                  className="admin-fpo-reject-btn"
                  onClick={() =>
                    setShowRejectBox(
                      true
                    )
                  }
                  disabled={processing}
                >
                  <XCircle size={18} />
                  Reject & Request Update
                </button>

                <button
                  className="admin-fpo-approve-btn"
                  onClick={
                    handleApprove
                  }
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="admin-small-loader"
                      />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={18}
                      />
                      Approve FPO
                    </>
                  )}
                </button>

              </div>

            )}

          </section>

        ) : (

          <section className="admin-fpo-final-status">

            {status === "approved" ? (
              <>
                <CheckCircle2 size={25} />

                <div>
                  <strong>
                    FPO Application Approved
                  </strong>

                  <span>
                    This organisation has been
                    verified and approved.
                  </span>
                </div>
              </>
            ) : (
              <>
                <XCircle size={25} />

                <div>
                  <strong>
                    FPO Application Rejected
                  </strong>

                  <span>
                    {application.rejectionReason ||
                      "No rejection feedback recorded."}
                  </span>
                </div>
              </>
            )}

          </section>

        )}

      </main>

    </div>
  );
}

// =========================================
// DETAIL COMPONENT
// =========================================

function Detail({
  label,
  value,
  icon,
}) {
  return (
    <div className="admin-fpo-detail-item">

      <span>
        {icon}
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}

// =========================================
// DOCUMENT NAME
// =========================================

function formatDocumentName(
  key
) {
  return key
    .replace(
      /([A-Z])/g,
      " $1"
    )
    .replace(
      /^./,
      (letter) =>
        letter.toUpperCase()
    );
}

// =========================================
// SIMPLE CROP ICON
// =========================================

function SproutIcon() {
  return (
    <div className="admin-sprout-icon">
      <span />
      <span />
    </div>
  );
}

export default AdminFpoReview;