import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Users,
  MapPin,
  Mail,
  Smartphone,
  CalendarDays,
  UserRound,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../../firebase";

import "./FpoReview.css";

function FpoReview() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const {
    organisation = {},
    farmers = [],
    documents = {},

    mobile = "",
    uid = "",
    applicationId = "",

    status = "",
    rejected = false,
    rejectionReason = "",
    isNewUser = true,
  } = state;

  const isRejected =
    rejected || status?.toLowerCase() === "rejected";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // FIREBASE AUTH STATE
  // =========================================

  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log(
          "FPO Review Firebase user:",
          user?.uid || "NO USER"
        );

        setFirebaseUser(user);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================
  // FORMAT FILE SIZE
  // =========================================

  const formatFileSize = (bytes) => {
    if (!bytes) return "";

    const mb = bytes / (1024 * 1024);

    if (mb < 1) {
      return `${Math.max(
        1,
        Math.round(bytes / 1024)
      )} KB`;
    }

    return `${mb.toFixed(2)} MB`;
  };

  // =========================================
  // DOCUMENT METADATA
  // =========================================

  /*
   * Firebase Storage is not being used in the
   * current prototype.
   *
   * So we only save document metadata:
   *
   * name
   * type
   * size
   * lastModified
   *
   * Actual file upload can be added later
   * when Firebase Storage is enabled.
   */

  const prepareDocumentMetadata = (file) => {
    if (!file) {
      return null;
    }

    return {
      name: file.name || "",
      type: file.type || "",
      size: file.size || 0,
      lastModified: file.lastModified || null,
    };
  };

  // =========================================
  // PREPARE ALL DOCUMENTS
  // =========================================

  const prepareDocuments = () => {
    const documentKeys = [
      "registrationCertificate",
      "panDocument",
      "addressProof",
      "authorizedPersonId",
      "supportingDocument",
    ];

    const preparedDocuments = {};

    documentKeys.forEach((key) => {
      const file = documents?.[key];

      if (file) {
        preparedDocuments[key] =
          prepareDocumentMetadata(file);
      }
    });

    return preparedDocuments;
  };

  // =========================================
  // SUBMIT APPLICATION
  // =========================================

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    // =====================================
    // AUTH STATE CHECK
    // =====================================

    if (authLoading) {
      setError(
        "Please wait while your login session is being verified."
      );
      return;
    }

    // =====================================
    // FIREBASE USER CHECK
    // =====================================

    if (!firebaseUser) {
      setError(
        "Your login session has expired. Please login again."
      );
      return;
    }

    // =====================================
    // UID CHECK
    // =====================================

    const finalUid = firebaseUser.uid;

    console.log(
      "Route UID:",
      uid || "NO ROUTE UID"
    );

    console.log(
      "Firebase UID:",
      finalUid
    );

    /*
     * If route state contains a UID, it should
     * match the currently authenticated Firebase
     * user.
     *
     * This prevents submitting an application
     * using the wrong Firebase account.
     */

    if (uid && uid !== finalUid) {
      console.error(
        "UID mismatch:",
        {
          routeUid: uid,
          firebaseUid: finalUid,
        }
      );

      setError(
        "Your login session does not match this application. Please login again."
      );

      return;
    }

    // =====================================
    // BASIC VALIDATION
    // =====================================

    if (!organisation?.fpoName) {
      setError(
        "Organisation details are incomplete."
      );
      return;
    }

    if (
      !Array.isArray(farmers) ||
      farmers.length === 0
    ) {
      setError(
        "Please add at least one member farmer."
      );
      return;
    }

    // =====================================
    // REQUIRED DOCUMENTS
    // =====================================

    const requiredDocuments = [
      "registrationCertificate",
      "panDocument",
      "addressProof",
      "authorizedPersonId",
    ];

    const missingDocument =
      requiredDocuments.find(
        (key) => !documents?.[key]
      );

    if (missingDocument) {
      setError(
        "Please upload all required documents before submitting."
      );
      return;
    }

    // =====================================
    // MOBILE CHECK
    // =====================================

    const finalMobile =
      mobile ||
      organisation.mobile ||
      "";

    if (!finalMobile) {
      setError(
        "Mobile number is missing. Please login again."
      );
      return;
    }

    try {
      setSubmitting(true);

      // ===================================
      // APPLICATION ID
      // ===================================

      /*
       * New FPO:
       * Create new application ID.
       *
       * Rejected FPO:
       * Reuse existing application ID.
       */

      const targetApplicationId =
        isRejected && applicationId
          ? applicationId
          : doc(
              collection(
                db,
                "fpoApplications"
              )
            ).id;

      console.log(
        "Target Application ID:",
        targetApplicationId
      );

      // ===================================
      // DOCUMENT METADATA
      // ===================================

      const preparedDocuments =
        prepareDocuments();

      // ===================================
      // APPLICATION DATA
      // ===================================

      const applicationData = {
        uid: finalUid,

        mobile: finalMobile,

        organisation,

        farmers,

        documents: preparedDocuments,

        status: "pending",

        submittedAt:
          serverTimestamp(),

        reviewedAt: null,

        reviewedBy: "",

        rejectionReason: "",
      };

      // ===================================
      // APPLICATION REFERENCE
      // ===================================

      const applicationRef = doc(
        db,
        "fpoApplications",
        targetApplicationId
      );

      // ===================================
      // NEW APPLICATION
      // =====================================

      if (!isRejected) {
        console.log(
          "Creating new FPO application..."
        );

        await setDoc(
          applicationRef,
          applicationData
        );
      }

      // ===================================
      // REJECTED → RESUBMIT
      // ===================================

      else {
        console.log(
          "Resubmitting rejected FPO application..."
        );

        if (!applicationId) {
          setSubmitting(false);

          setError(
            "Application ID is missing. Please login again."
          );

          return;
        }

        await updateDoc(
          applicationRef,
          {
            ...applicationData,

            resubmittedAt:
              serverTimestamp(),
          }
        );
      }

      // ===================================
      // FPO LOGIN INDEX
      // ===================================

      const loginIndexRef = doc(
        db,
        "fpoLoginIndex",
        finalMobile
      );

      await setDoc(
        loginIndexRef,
        {
          uid: finalUid,

          applicationId:
            targetApplicationId,

          mobile: finalMobile,

          status: "pending",

          rejectionReason: "",

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      console.log(
        "FPO application submitted successfully."
      );

      // ===================================
      // SUCCESS MESSAGE
      // ===================================

      setSubmitting(false);

      setSuccess(
        isRejected
          ? "Your FPO application has been resubmitted successfully."
          : "Your FPO application has been submitted successfully."
      );

      // ===================================
      // WAITING FOR APPROVAL
      // ===================================

      setTimeout(() => {
        navigate(
          "/fpo/waiting-approval",
          {
            state: {
              mobile: finalMobile,

              uid: finalUid,

              applicationId:
                targetApplicationId,

              role: "fpo",

              status: "pending",

              rejected: false,

              isRejected: false,
            },
          }
        );
      }, 900);

    } catch (err) {
      console.error(
        "FPO submission error:",
        err
      );

      setSubmitting(false);

      // ===================================
      // FIREBASE ERROR MESSAGES
      // ===================================

      if (
        err?.code ===
        "permission-denied"
      ) {
        setError(
          "Permission denied. Please login again and try submitting."
        );

        return;
      }

      if (
        err?.code ===
        "unauthenticated"
      ) {
        setError(
          "Your login session has expired. Please login again."
        );

        return;
      }

      setError(
        err?.message ||
          "Unable to submit your FPO application. Please try again."
      );
    }
  };

  // =========================================
  // BACK TO DOCUMENTS
  // =========================================

  const handleBack = () => {
    if (submitting) {
      return;
    }

    navigate(
      "/fpo/documents",
      {
        state: {
          organisation,

          farmers,

          documents,

          mobile,

          uid,

          applicationId,

          status,

          rejected: isRejected,

          isNewUser: !isRejected,

          rejectionReason,
        },
      }
    );
  };

  return (
    <div className="fpo-review-page">

      {/* Background */}
      <div className="fpo-review-glow glow-one"></div>
      <div className="fpo-review-glow glow-two"></div>

      <main className="fpo-review-container">

        {/* Back */}
        <button
          type="button"
          className="fpo-review-back"
          onClick={handleBack}
          disabled={submitting}
        >
          <ArrowLeft
            size={17}
            strokeWidth={1.8}
          />

          <span>
            Back to Documents
          </span>
        </button>

        {/* Header */}
        <div className="fpo-review-header">

          <div className="fpo-review-logo">
            <Building2
              size={27}
              strokeWidth={1.7}
            />
          </div>

          <p className="fpo-review-eyebrow">
            FPO REGISTRATION
          </p>

          <h1>
            Review & <span>Submit</span>
          </h1>

          <p className="fpo-review-subtitle">
            Review your FPO information carefully
            before sending it for admin verification.
          </p>

        </div>

        {/* Progress */}
        <div className="fpo-review-progress">

          <div className="review-progress-step completed">
            <div className="review-progress-circle">
              <CheckCircle2 size={17} />
            </div>

            <span>
              Organisation
            </span>
          </div>

          <div className="review-progress-line completed"></div>

          <div className="review-progress-step completed">
            <div className="review-progress-circle">
              <CheckCircle2 size={17} />
            </div>

            <span>
              Farmers
            </span>
          </div>

          <div className="review-progress-line completed"></div>

          <div className="review-progress-step completed">
            <div className="review-progress-circle">
              <CheckCircle2 size={17} />
            </div>

            <span>
              Documents
            </span>
          </div>

          <div className="review-progress-line active"></div>

          <div className="review-progress-step active">
            <div className="review-progress-circle">
              4
            </div>

            <span>
              Review
            </span>
          </div>

        </div>

        {/* Rejected Notice */}
        {isRejected && (
          <div className="review-alert">

            <div className="review-alert-icon">
              <AlertCircle size={19} />
            </div>

            <div>

              <strong>
                Resubmission
              </strong>

              <p>
                Your previous application was
                rejected. Review the updated
                information below and resubmit it
                for verification.
              </p>

              {rejectionReason && (
                <p>
                  <strong>
                    Previous reason:
                  </strong>{" "}
                  {rejectionReason}
                </p>
              )}

            </div>

          </div>
        )}

        {/* Organisation Card */}
        <section className="review-card">

          <div className="review-card-header">

            <div className="review-card-title">

              <div className="review-section-icon">
                <Building2
                  size={19}
                  strokeWidth={1.7}
                />
              </div>

              <div>

                <h2>
                  Organisation Details
                </h2>

                <p>
                  FPO registration information
                </p>

              </div>

            </div>

            <CheckCircle2
              size={20}
              className="review-complete-icon"
            />

          </div>

          <div className="review-info-grid">

            <ReviewField
              label="FPO Name"
              value={organisation.fpoName}
            />

            <ReviewField
              label="Registration Number"
              value={
                organisation.registrationNumber
              }
            />

            <ReviewField
              label="FPO Type"
              value={organisation.fpoType}
            />

            <ReviewField
              label="Year of Establishment"
              value={
                organisation.establishmentYear
              }
              icon={
                <CalendarDays size={15} />
              }
            />

            <ReviewField
              label="State"
              value={organisation.state}
            />

            <ReviewField
              label="District"
              value={organisation.district}
            />

            <ReviewField
              label="Mandal"
              value={organisation.mandal}
            />

            <ReviewField
              label="Village"
              value={organisation.village}
            />

            <ReviewField
              label="Pincode"
              value={organisation.pincode}
            />

            <ReviewField
              label="Email"
              value={organisation.email}
              icon={
                <Mail size={15} />
              }
            />

            <ReviewField
              label="Registered Mobile"
              value={
                organisation.mobile
                  ? `+91 ${organisation.mobile}`
                  : ""
              }
              icon={
                <Smartphone size={15} />
              }
            />

            <ReviewField
              label="Authorized Person"
              value={
                organisation.authorizedPerson
              }
              icon={
                <UserRound size={15} />
              }
            />

            <ReviewField
              label="Designation"
              value={
                organisation.designation
              }
            />

            <ReviewField
              label="Registered Address"
              value={
                organisation.address
              }
              full
              icon={
                <MapPin size={15} />
              }
            />

          </div>

        </section>

        {/* Farmers Card */}
        <section className="review-card">

          <div className="review-card-header">

            <div className="review-card-title">

              <div className="review-section-icon">
                <Users
                  size={19}
                  strokeWidth={1.7}
                />
              </div>

              <div>

                <h2>
                  Member Farmers
                </h2>

                <p>
                  Farmers registered under this FPO
                </p>

              </div>

            </div>

            <div className="review-count">
              {farmers.length}{" "}
              {farmers.length === 1
                ? "Farmer"
                : "Farmers"}
            </div>

          </div>

          <div className="review-farmers-list">

            {farmers.map(
              (farmer, index) => (
                <div
                  className="review-farmer"
                  key={
                    farmer.memberId ||
                    `${farmer.name}-${index}`
                  }
                >

                  <div className="review-farmer-number">
                    {index + 1}
                  </div>

                  <div className="review-farmer-info">

                    <h3>
                      {farmer.name}
                    </h3>

                    <p>
                      Member ID:{" "}
                      {farmer.memberId}
                    </p>

                    <div className="review-farmer-meta">

                      <span>
                        <Smartphone
                          size={13}
                        />
                        +91{" "}
                        {farmer.mobile}
                      </span>

                      <span>
                        <MapPin size={13} />
                        {farmer.village}
                      </span>

                      <span>
                        <span className="simple-icon">
                          Crop
                        </span>
                        {farmer.crop}
                      </span>

                      <span>
                        <span className="simple-icon">
                          Land
                        </span>
                        {farmer.landArea} acres
                      </span>

                    </div>

                  </div>

                </div>
              )
            )}

          </div>

        </section>

        {/* Documents Card */}
        <section className="review-card">

          <div className="review-card-header">

            <div className="review-card-title">

              <div className="review-section-icon">
                <FileText
                  size={19}
                  strokeWidth={1.7}
                />
              </div>

              <div>

                <h2>
                  Documents
                </h2>

                <p>
                  Documents attached for verification
                </p>

              </div>

            </div>

            <CheckCircle2
              size={20}
              className="review-complete-icon"
            />

          </div>

          <div className="review-documents-list">

            {[
              {
                key:
                  "registrationCertificate",
                title:
                  "Registration Certificate",
              },
              {
                key:
                  "panDocument",
                title:
                  "FPO PAN Document",
              },
              {
                key:
                  "addressProof",
                title:
                  "Address Proof",
              },
              {
                key:
                  "authorizedPersonId",
                title:
                  "Authorized Person ID",
              },
              {
                key:
                  "supportingDocument",
                title:
                  "Supporting Document",
              },
            ].map((document) => {

              const file =
                documents?.[document.key];

              if (!file) {
                return null;
              }

              return (
                <div
                  className="review-document"
                  key={document.key}
                >

                  <div className="review-document-icon">
                    <CheckCircle2
                      size={18}
                    />
                  </div>

                  <div className="review-document-info">

                    <h3>
                      {document.title}
                    </h3>

                    <p>
                      {file.name}
                    </p>

                  </div>

                  <span className="review-file-size">
                    {formatFileSize(
                      file.size
                    )}
                  </span>

                </div>
              );
            })}

          </div>

        </section>

        {/* Submission Information */}
        <div className="review-submit-note">

          <div className="review-submit-note-icon">
            <ShieldCheck
              size={20}
              strokeWidth={1.7}
            />
          </div>

          <div>

            <strong>
              What happens after submission?
            </strong>

            <p>
              Your FPO application will be sent
              to the AgriConnect admin team for
              verification. You will be able to
              track the application status while it
              is under review.
            </p>

          </div>

        </div>

        {/* Error */}
        {error && (
          <div className="review-error">

            <AlertCircle size={17} />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* Success */}
        {success && (
          <div className="review-success">

            <CheckCircle2 size={17} />

            <span>
              {success}
            </span>

          </div>
        )}

        {/* Submit Card */}
        <section className="review-submit-card">

          <div>

            <h2>
              Ready to submit?
            </h2>

            <p>
              {isRejected
                ? "Your updated application will be sent back for admin verification."
                : "Once submitted, your FPO application will enter the verification process."}
            </p>

          </div>

          <button
            type="button"
            className="review-submit-button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              authLoading
            }
          >

            {submitting ? (
              <>
                <LoaderCircle
                  size={19}
                  className="review-spinner"
                />

                <span>
                  Submitting...
                </span>
              </>
            ) : authLoading ? (
              <>
                <LoaderCircle
                  size={19}
                  className="review-spinner"
                />

                <span>
                  Checking Session...
                </span>
              </>
            ) : (
              <>
                <span>
                  {isRejected
                    ? "Resubmit Application"
                    : "Submit Application"}
                </span>

                <ArrowRight
                  size={18}
                  strokeWidth={1.8}
                />
              </>
            )}

          </button>

        </section>

        <p className="fpo-review-footer">
          AgriConnect • Secure FPO Verification
        </p>

      </main>
    </div>
  );
}

// =========================================
// REVIEW FIELD
// =========================================

function ReviewField({
  label,
  value,
  icon,
  full = false,
}) {
  return (
    <div
      className={`review-field ${
        full
          ? "review-field-full"
          : ""
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

export default FpoReview;