import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";

import "./DeliveryDocuments.css";

function DeliveryDocuments() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const mobile =
    state.mobile ||
    localStorage.getItem(
      "agriconnect_delivery_mobile"
    ) ||
    "";

  const uid = state.uid || "";

  const applicationId =
    state.applicationId ||
    localStorage.getItem(
      "agriconnect_delivery_applicationId"
    ) ||
    "";

  const rejected = state.rejected || false;

  const rejectionReason =
    state.rejectionReason || "";

  const personalDetails =
    state.personalDetails || {};

  const vehicleDetails =
    state.vehicleDetails || {};

  const [documents, setDocuments] = useState({
    drivingLicence:
      state.documents?.drivingLicence || null,

    vehicleRc:
      state.documents?.vehicleRc || null,

    identityProof:
      state.documents?.identityProof || null,

    addressProof:
      state.documents?.addressProof || null,

    vehicleInsurance:
      state.documents?.vehicleInsurance || null,

    additionalDocument:
      state.documents?.additionalDocument || null,
  });

  const [error, setError] = useState("");

  // =========================================
  // DOCUMENT CONFIGURATION
  // =========================================

  const documentFields = [
    {
      key: "drivingLicence",
      label: "Driving Licence",
      required: true,
    },
    {
      key: "vehicleRc",
      label: "Vehicle Registration Certificate",
      required: true,
    },
    {
      key: "identityProof",
      label: "Identity Proof",
      required: true,
    },
    {
      key: "addressProof",
      label: "Address Proof",
      required: true,
    },
    {
      key: "vehicleInsurance",
      label: "Vehicle Insurance",
      required: true,
    },
    {
      key: "additionalDocument",
      label: "Additional Document",
      required: false,
    },
  ];

  // =========================================
  // FILE VALIDATION
  // =========================================

  const validateFile = (file) => {
    if (!file) {
      return "Please select a document.";
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    const maxSize =
      5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return "Only PDF, JPG and PNG files are allowed.";
    }

    if (file.size > maxSize) {
      return "File size must be less than 5 MB.";
    }

    return "";
  };

  // =========================================
  // FILE SELECT
  // =========================================

  const handleFileChange = (
    event,
    fieldKey
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError =
      validateFile(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setDocuments((previous) => ({
      ...previous,

      [fieldKey]: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,

        // Keep File object only for
        // current browser navigation.
        file,
      },
    }));

    setError("");
  };

  // =========================================
  // REMOVE FILE
  // =========================================

  const handleRemoveFile = (
    fieldKey
  ) => {
    setDocuments((previous) => ({
      ...previous,
      [fieldKey]: null,
    }));

    setError("");
  };

  // =========================================
  // VALIDATE DOCUMENTS
  // =========================================

  const validateDocuments = () => {
    const requiredDocuments =
      documentFields.filter(
        (document) => document.required
      );

    for (const document of requiredDocuments) {
      if (!documents[document.key]) {
        return `Please upload ${document.label}.`;
      }
    }

    return "";
  };

  // =========================================
  // CONTINUE
  // =========================================

  const handleContinue = (event) => {
    event.preventDefault();

    const validationError =
      validateDocuments();

    if (validationError) {
      setError(validationError);
      return;
    }

    // Save important information
    localStorage.setItem(
      "agriconnect_delivery_mobile",
      mobile
    );

    if (applicationId) {
      localStorage.setItem(
        "agriconnect_delivery_applicationId",
        applicationId
      );
    }

    // =======================================
    // IMPORTANT
    // =======================================
    //
    // Firebase Storage is not being used in
    // our current prototype.
    //
    // Therefore Review page receives only
    // document metadata.
    //
    // =======================================

    const documentMetadata = {};

    Object.entries(documents).forEach(
      ([key, value]) => {
        if (!value) {
          documentMetadata[key] = null;
          return;
        }

        documentMetadata[key] = {
          fileName:
            value.fileName || "",

          fileType:
            value.fileType || "",

          fileSize:
            value.fileSize || 0,
        };
      }
    );

    navigate(
      "/delivery/review",
      {
        state: {
          uid,

          mobile,

          applicationId,

          rejected,

          rejectionReason,

          personalDetails,

          vehicleDetails,

          documents: documentMetadata,
        },
      }
    );
  };

  // =========================================
  // BACK
  // =========================================

  const handleBack = () => {
    navigate(
      "/delivery/vehicle-details",
      {
        state: {
          uid,

          mobile,

          applicationId,

          rejected,

          rejectionReason,

          personalDetails,

          vehicleDetails,
        },
      }
    );
  };

  return (
    <div className="delivery-documents-page">

      <div className="delivery-documents-glow delivery-documents-glow-one" />
      <div className="delivery-documents-glow delivery-documents-glow-two" />

      <main className="delivery-documents-container">

        {/* Back */}
        <button
          type="button"
          className="delivery-documents-back"
          onClick={handleBack}
          aria-label="Back"
        >
          <ArrowLeft
            size={20}
            strokeWidth={1.7}
          />
        </button>

        {/* Header */}
        <header className="delivery-documents-header">

          <div className="delivery-documents-logo">
            <FileText
              size={30}
              strokeWidth={1.6}
            />
          </div>

          <p className="delivery-documents-label">
            DELIVERY PARTNER REGISTRATION
          </p>

          <h1>
            Documents
          </h1>

          <p>
            Upload the required documents for
            verification.
          </p>

        </header>

        {/* Rejection Notice */}
        {rejected && rejectionReason && (
          <div className="delivery-documents-rejection">

            <AlertCircle
              size={20}
              strokeWidth={1.7}
            />

            <div>
              <strong>
                Application Update Required
              </strong>

              <p>
                {rejectionReason}
              </p>
            </div>

          </div>
        )}

        {/* Main Card */}
        <section className="delivery-documents-card">

          <div className="delivery-documents-section-heading">

            <div className="delivery-documents-section-icon">
              <Upload
                size={18}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <h2>
                Verification Documents
              </h2>

              <p>
                PDF, JPG or PNG • Maximum 5 MB per file
              </p>
            </div>

          </div>

          <div className="delivery-documents-list">

            {documentFields.map(
              (document) => {
                const selectedFile =
                  documents[document.key];

                return (
                  <div
                    className="delivery-document-item"
                    key={document.key}
                  >

                    <div className="delivery-document-info">

                      <div className="delivery-document-icon">
                        <FileText
                          size={19}
                          strokeWidth={1.7}
                        />
                      </div>

                      <div>
                        <h3>
                          {document.label}

                          {document.required && (
                            <span className="delivery-document-required">
                              *
                            </span>
                          )}
                        </h3>

                        {selectedFile ? (
                          <p>
                            {selectedFile.fileName}
                          </p>
                        ) : (
                          <p>
                            No document selected
                          </p>
                        )}
                      </div>

                    </div>

                    {selectedFile ? (

                      <div className="delivery-document-selected">

                        <CheckCircle2
                          size={18}
                          strokeWidth={1.7}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveFile(
                              document.key
                            )
                          }
                          aria-label={`Remove ${document.label}`}
                        >
                          <X
                            size={17}
                            strokeWidth={1.7}
                          />
                        </button>

                      </div>

                    ) : (

                      <label className="delivery-document-upload">

                        <Upload
                          size={17}
                          strokeWidth={1.7}
                        />

                        <span>
                          Upload
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

                    )}

                  </div>
                );
              }
            )}

          </div>

          {/* Prototype Note */}
          <div className="delivery-documents-note">

            <ShieldCheck
              size={18}
              strokeWidth={1.7}
            />

            <p>
              Your documents will be reviewed by
              the AgriConnect admin team before
              your account is approved.
            </p>

          </div>

          {/* Error */}
          {error && (
            <div className="delivery-documents-error">

              <AlertCircle
                size={18}
                strokeWidth={1.7}
              />

              <span>
                {error}
              </span>

            </div>
          )}

          {/* Continue */}
          <button
            type="button"
            className="delivery-documents-button"
            onClick={handleContinue}
          >
            Review Application

            <ArrowRight
              size={18}
              strokeWidth={1.7}
            />
          </button>

        </section>

        <p className="delivery-documents-footer">
          AGRICONNECT • DELIVERY PARTNER VERIFICATION
        </p>

      </main>

    </div>
  );
}

export default DeliveryDocuments;