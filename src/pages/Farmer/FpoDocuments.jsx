import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";

import "./FpoDocuments.css";

function FpoDocuments() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const {
    organisation = {},
    farmers = [],

    // Login/session information
    mobile = "",
    uid = "",
    applicationId = "",

    // Application status
    status = "",
    rejected = false,
    rejectionReason = "",
    isNewUser = true,
  } = state;

  const isRejected =
    rejected || status?.toLowerCase() === "rejected";

  // =========================================
  // DOCUMENT STATE
  // =========================================

  const [documents, setDocuments] = useState({
    registrationCertificate: null,
    panDocument: null,
    addressProof: null,
    authorizedPersonId: null,
    supportingDocument: null,
  });

  const [error, setError] = useState("");

  // =========================================
  // DOCUMENT FIELDS
  // =========================================

  const documentFields = [
    {
      key: "registrationCertificate",
      title: "Registration Certificate",
      description:
        "Upload the official FPO registration certificate.",
      required: true,
    },
    {
      key: "panDocument",
      title: "FPO PAN Document",
      description:
        "Upload the PAN document of the FPO organisation.",
      required: true,
    },
    {
      key: "addressProof",
      title: "Address Proof",
      description:
        "Upload a valid registered office address proof.",
      required: true,
    },
    {
      key: "authorizedPersonId",
      title: "Authorized Person ID",
      description:
        "Upload ID proof of the authorised representative.",
      required: true,
    },
    {
      key: "supportingDocument",
      title: "Supporting Document",
      description:
        "Upload any additional supporting document if required.",
      required: false,
    },
  ];

  // =========================================
  // FILE CHANGE
  // =========================================

  const handleFileChange = (event, key) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    // =====================================
    // FILE TYPE
    // =====================================

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please upload a PDF, JPG or PNG file."
      );

      event.target.value = "";
      return;
    }

    // =====================================
    // FILE SIZE
    // =====================================

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "File size should be less than 5 MB."
      );

      event.target.value = "";
      return;
    }

    // =====================================
    // SAVE FILE LOCALLY
    // =====================================

    setDocuments((prev) => ({
      ...prev,
      [key]: file,
    }));

    event.target.value = "";
  };

  // =========================================
  // REMOVE FILE
  // =========================================

  const removeFile = (key) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: null,
    }));

    setError("");
  };

  // =========================================
  // CONTINUE TO REVIEW
  // =========================================

  const handleContinue = () => {
    setError("");

    // =====================================
    // CHECK REQUIRED DOCUMENTS
    // =====================================

    const requiredDocuments =
      documentFields.filter(
        (document) => document.required
      );

    const missingDocument =
      requiredDocuments.find(
        (document) =>
          !documents[document.key]
      );

    if (missingDocument) {
      setError(
        `Please upload ${missingDocument.title} before continuing.`
      );
      return;
    }

    // =====================================
    // CHECK FARMERS
    // =====================================

    if (
      !Array.isArray(farmers) ||
      farmers.length === 0
    ) {
      setError(
        "Please add at least one member farmer before continuing."
      );
      return;
    }

    // =====================================
    // NAVIGATE TO REVIEW
    // =====================================

    navigate("/fpo/review", {
      state: {
        // Organisation
        organisation,

        // Farmers
        farmers,

        // Documents
        documents,

        // Login/session
        mobile,
        uid,
        applicationId,

        // Status
        status,
        rejected: isRejected,
        isNewUser: !isRejected,

        // Rejection information
        rejectionReason,
      },
    });
  };

  // =========================================
  // BACK TO FARMERS
  // =========================================

  const handleBack = () => {
    navigate("/fpo/member-farmers", {
      state: {
        organisation,
        farmers,

        mobile,
        uid,
        applicationId,

        status,
        rejected: isRejected,
        isNewUser: !isRejected,

        rejectionReason,
      },
    });
  };

  return (
    <div className="fpo-documents-page">

      {/* Background */}
      <div className="fpo-documents-glow glow-one"></div>
      <div className="fpo-documents-glow glow-two"></div>

      <main className="fpo-documents-container">

        {/* Back */}
        <button
          type="button"
          className="fpo-documents-back"
          onClick={handleBack}
        >
          <ArrowLeft
            size={17}
            strokeWidth={1.8}
          />

          <span>
            Back to Farmers
          </span>
        </button>

        {/* Header */}
        <div className="fpo-documents-header">

          <div className="fpo-documents-logo">
            <Building2
              size={26}
              strokeWidth={1.7}
            />
          </div>

          <p className="fpo-documents-eyebrow">
            FPO Registration
          </p>

          <h1>
            Upload Documents
          </h1>

          <p className="fpo-documents-subtitle">
            Submit the required documents for
            verification of your FPO organisation.
          </p>

        </div>

        {/* Rejected Notice */}
        {isRejected && (
          <div
            className="documents-note"
            style={{
              marginBottom: "18px",
            }}
          >
            <div className="note-icon">
              <AlertCircle size={18} />
            </div>

            <div>
              <strong>
                Previous application rejected
              </strong>

              <p>
                {rejectionReason
                  ? `Reason: ${rejectionReason}`
                  : "Please review your information and documents before resubmitting."}
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="fpo-progress">

          {/* Organisation */}
          <div className="fpo-progress-step completed">

            <div className="progress-circle">
              <CheckCircle2 size={17} />
            </div>

            <span>
              Organisation
            </span>

          </div>

          <div className="progress-line completed-line"></div>

          {/* Farmers */}
          <div className="fpo-progress-step completed">

            <div className="progress-circle">
              <CheckCircle2 size={17} />
            </div>

            <span>
              Farmers
            </span>

          </div>

          <div className="progress-line active-line"></div>

          {/* Documents */}
          <div className="fpo-progress-step active">

            <div className="progress-circle">
              3
            </div>

            <span>
              Documents
            </span>

          </div>

          <div className="progress-line"></div>

          {/* Review */}
          <div className="fpo-progress-step">

            <div className="progress-circle">
              4
            </div>

            <span>
              Review
            </span>

          </div>

        </div>

        {/* Documents Card */}
        <section className="documents-card">

          {/* Heading */}
          <div className="documents-card-heading">

            <div>
              <h2>
                Required Documents
              </h2>

              <p>
                PDF, JPG or PNG files only.
                Maximum file size: 5 MB.
              </p>
            </div>

            <FileText
              size={22}
              strokeWidth={1.7}
            />

          </div>

          {/* Documents List */}
          <div className="documents-list">

            {documentFields.map(
              (document) => {
                const file =
                  documents[
                    document.key
                  ];

                return (
                  <div
                    className={`document-item ${
                      file
                        ? "document-uploaded"
                        : ""
                    }`}
                    key={document.key}
                  >

                    {/* Icon */}
                    <div className="document-icon">

                      {file ? (
                        <CheckCircle2
                          size={23}
                          strokeWidth={1.8}
                        />
                      ) : (
                        <FileText
                          size={23}
                          strokeWidth={1.7}
                        />
                      )}

                    </div>

                    {/* Info */}
                    <div className="document-info">

                      <div className="document-title-row">

                        <h3>
                          {document.title}
                        </h3>

                        {document.required ? (
                          <span className="required-badge">
                            Required
                          </span>
                        ) : (
                          <span className="optional-badge">
                            Optional
                          </span>
                        )}

                      </div>

                      <p>
                        {document.description}
                      </p>

                      {/* Selected File */}
                      {file && (
                        <div className="selected-file">

                          <span>
                            {file.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeFile(
                                document.key
                              )
                            }
                            aria-label={`Remove ${document.title}`}
                          >
                            <X size={15} />
                          </button>

                        </div>
                      )}

                    </div>

                    {/* Upload */}
                    <label className="upload-button">

                      <Upload
                        size={17}
                        strokeWidth={1.8}
                      />

                      <span>
                        {file
                          ? "Change File"
                          : "Choose File"}
                      </span>

                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(event) =>
                          handleFileChange(
                            event,
                            document.key
                          )
                        }
                      />

                    </label>

                  </div>
                );
              }
            )}

          </div>

          {/* Error */}
          {error && (
            <div
              className="documents-note"
              style={{
                marginTop: "18px",
              }}
            >
              <div className="note-icon">
                <AlertCircle size={18} />
              </div>

              <div>
                <strong>
                  Document requirement
                </strong>

                <p>
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="documents-note">

            <div className="note-icon">
              <CheckCircle2 size={18} />
            </div>

            <div>

              <strong>
                Document verification
              </strong>

              <p>
                Your documents will be reviewed
                by the AgriConnect admin team
                before your FPO account is
                approved.
              </p>

            </div>

          </div>

          {/* Footer */}
          <div className="documents-footer">

            <p>
              You can review all information
              before final submission.
            </p>

            <button
              type="button"
              className="continue-review-button"
              onClick={handleContinue}
            >

              <span>
                Continue to Review
              </span>

              <ArrowRight
                size={18}
                strokeWidth={1.8}
              />

            </button>

          </div>

        </section>

        <p className="fpo-documents-bottom-text">
          AgriConnect • Secure FPO onboarding
        </p>

      </main>
    </div>
  );
}

export default FpoDocuments;