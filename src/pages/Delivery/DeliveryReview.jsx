import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  User,
  Truck,
  FileText,
  ShieldCheck,
  Send,
  AlertCircle,
} from "lucide-react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase";

import "./DeliveryReview.css";

function DeliveryReview() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const mobile =
    state.mobile ||
    localStorage.getItem("agriconnect_delivery_mobile") ||
    "";

  const personalDetails = state.personalDetails || {};
  const vehicleDetails = state.vehicleDetails || {};
  const documents = state.documents || {};

  const applicationId =
    state.applicationId ||
    localStorage.getItem(
      "agriconnect_delivery_applicationId"
    ) ||
    "";

  const rejected = state.rejected || false;

  const rejectionReason =
    state.rejectionReason || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // =========================================
  // CHECK LOGIN SESSION
  // =========================================

  useEffect(() => {
    if (!mobile) {
      navigate("/login/delivery");
    }
  }, [mobile, navigate]);

  // =========================================
  // SUBMIT APPLICATION
  // =========================================

  const handleSubmit = async () => {
    setError("");

    if (!mobile) {
      setError(
        "Mobile number is missing. Please login again."
      );
      return;
    }

    if (!auth.currentUser) {
      setError(
        "Your Firebase session has expired. Please login again."
      );
      return;
    }

    setLoading(true);

    try {
      const uid = auth.currentUser.uid;

      console.log("Delivery application submit:", {
        uid,
        mobile,
        applicationId,
      });

      // =====================================
      // APPLICATION DATA
      // =====================================

      const applicationData = {
        uid,

        mobile,

        personalDetails: {
          fullName: personalDetails.fullName || "",
          email: personalDetails.email || "",
          dob: personalDetails.dob || "",
          gender: personalDetails.gender || "",
          address: personalDetails.address || "",
          state: personalDetails.state || "",
          district: personalDetails.district || "",
          mandal: personalDetails.mandal || "",
          village: personalDetails.village || "",
          pincode: personalDetails.pincode || "",
        },

        vehicleDetails: {
          vehicleType: vehicleDetails.vehicleType || "",
          vehicleNumber: vehicleDetails.vehicleNumber || "",
          vehicleModel: vehicleDetails.vehicleModel || "",
          vehicleYear: vehicleDetails.vehicleYear || "",
          ownership: vehicleDetails.ownership || "",
          experience: vehicleDetails.experience || "",
        },

        documents,

        status: "pending",

        rejectionReason: "",

        updatedAt: serverTimestamp(),
      };

      let finalApplicationId = applicationId;
      let isNewApplication = false;

      // =====================================
      // CHECK EXISTING APPLICATION
      // =====================================

      if (finalApplicationId) {
        const existingApplicationRef = doc(
          db,
          "deliveryApplications",
          finalApplicationId
        );

        const existingApplicationSnap = await getDoc(
          existingApplicationRef
        );

        /*
          If the stored application ID is stale/non-existent,
          create a new application instead of trying to update
          a document that does not exist.
        */
        if (!existingApplicationSnap.exists()) {
          finalApplicationId = "";
        } else {
          const existingApplication =
            existingApplicationSnap.data();

          /*
            If the stored application was created under an
            older anonymous Firebase UID, it is a stale test
            session. Do not overwrite that old application.

            The mobile number is the login identifier in this
            demo flow, so create a fresh application under the
            current Firebase UID.
          */
          if (
            existingApplication.uid &&
            existingApplication.uid !== uid
          ) {
            console.warn(
              "Stale application UID detected. Creating a new application.",
              {
                oldUid: existingApplication.uid,
                currentUid: uid,
                applicationId: finalApplicationId,
                mobile,
              }
            );

            finalApplicationId = "";
          } else if (
            existingApplication.status === "approved"
          ) {
            throw new Error(
              "Your application is already approved. Please continue to the delivery dashboard."
            );
          } else {
            /*
              Existing pending/rejected application belonging
              to the current Firebase account.
            */
            await updateDoc(
              existingApplicationRef,
              applicationData
            );
          }
        }
      }

      // =====================================
      // NEW APPLICATION
      // =====================================

      if (!finalApplicationId) {
        applicationData.createdAt =
          serverTimestamp();

        const applicationRef = await addDoc(
          collection(db, "deliveryApplications"),
          applicationData
        );

        finalApplicationId =
          applicationRef.id;

        isNewApplication = true;
      }

      // =====================================
      // DELIVERY LOGIN INDEX
      // =====================================

      const loginIndexRef = doc(
        db,
        "deliveryLoginIndex",
        mobile
      );

      const loginIndexSnap = await getDoc(
        loginIndexRef
      );

      /*
        If the login index belongs to an older anonymous
        session, update it to the current Firebase UID.

        This keeps the mobile number as the stable demo
        identifier while allowing the current anonymous
        session to continue the registration flow.
      */
      if (loginIndexSnap.exists()) {
        const existingLogin =
          loginIndexSnap.data();

        if (
          existingLogin.uid &&
          existingLogin.uid !== uid
        ) {
          console.warn(
            "Updating stale delivery login UID.",
            {
              oldUid: existingLogin.uid,
              currentUid: uid,
              mobile,
            }
          );
        }
      }

      await setDoc(
        loginIndexRef,
        {
          uid,
          mobile,
          applicationId: finalApplicationId,
          status: "pending",
          rejectionReason: "",
          updatedAt: serverTimestamp(),

          ...(isNewApplication
            ? {
                createdAt:
                  serverTimestamp(),
              }
            : {}),
        },
        {
          merge: true,
        }
      );

      // =====================================
      // LOCAL STORAGE
      // =====================================

      localStorage.setItem(
        "agriconnect_delivery_mobile",
        mobile
      );

      localStorage.setItem(
        "agriconnect_delivery_applicationId",
        finalApplicationId
      );

      // =====================================
      // SUCCESS
      // =====================================

      setSubmitted(true);

      setTimeout(() => {
        navigate(
          "/delivery/waiting-approval",
          {
            state: {
              uid,
              mobile,
              applicationId:
                finalApplicationId,
              role: "delivery",
            },
          }
        );
      }, 1000);

    } catch (firebaseError) {
      console.error(
        "Delivery application submission error:",
        firebaseError
      );

      const message =
        firebaseError?.message || "";

      if (
        firebaseError?.code ===
        "permission-denied"
      ) {
        setError(
          "Permission denied. Please make sure the latest Firestore Rules are published."
        );
      } else if (message) {
        setError(message);
      } else {
        setError(
          "Unable to submit your application. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // SUCCESS SCREEN
  // =========================================

  if (submitted) {
    return (
      <div className="delivery-review-page">
        <main className="delivery-review-container">
          <section className="delivery-review-success">
            <div className="delivery-review-success-icon">
              <CheckCircle2
                size={48}
                strokeWidth={1.5}
              />
            </div>

            <p className="delivery-review-label">
              APPLICATION SUBMITTED
            </p>

            <h1>
              Application Submitted Successfully
            </h1>

            <p>
              Your delivery partner application has
              been submitted for admin verification.
            </p>

            <div className="delivery-review-success-status">
              <ShieldCheck
                size={18}
                strokeWidth={1.7}
              />
              Waiting for admin approval
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="delivery-review-page">
      <div className="delivery-review-glow delivery-review-glow-one" />
      <div className="delivery-review-glow delivery-review-glow-two" />

      <main className="delivery-review-container">

        {/* Back */}
        <button
          type="button"
          className="delivery-review-back"
          onClick={() =>
            navigate(
              "/delivery/documents",
              {
                state: {
                  mobile,
                  personalDetails,
                  vehicleDetails,
                  documents,
                  applicationId,
                  rejected,
                  rejectionReason,
                },
              }
            )
          }
        >
          <ArrowLeft
            size={20}
            strokeWidth={1.7}
          />
        </button>

        {/* Header */}
        <header className="delivery-review-header">
          <div className="delivery-review-logo">
            <ShieldCheck
              size={30}
              strokeWidth={1.6}
            />
          </div>

          <p className="delivery-review-label">
            DELIVERY PARTNER
          </p>

          <h1>
            Review Application
          </h1>

          <p>
            Please review your information carefully
            before submitting.
          </p>
        </header>

        {/* Rejection notice */}
        {rejected && rejectionReason && (
          <div className="delivery-review-rejection">
            <AlertCircle
              size={20}
              strokeWidth={1.7}
            />

            <div>
              <strong>
                Previous application was rejected
              </strong>

              <p>
                {rejectionReason}
              </p>
            </div>
          </div>
        )}

        {/* PERSONAL DETAILS */}
        <section className="delivery-review-card">
          <div className="delivery-review-card-header">
            <div className="delivery-review-card-icon">
              <User
                size={20}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <h2>
                Personal Details
              </h2>

              <p>
                Your personal information
              </p>
            </div>
          </div>

          <div className="delivery-review-grid">
            <ReviewItem
              label="Full Name"
              value={personalDetails.fullName}
            />

            <ReviewItem
              label="Mobile Number"
              value={`+91 ${mobile}`}
            />

            <ReviewItem
              label="Email"
              value={personalDetails.email}
            />

            <ReviewItem
              label="Date of Birth"
              value={personalDetails.dob}
            />

            <ReviewItem
              label="Gender"
              value={personalDetails.gender}
            />

            <ReviewItem
              label="Pincode"
              value={personalDetails.pincode}
            />

            <ReviewItem
              label="State"
              value={personalDetails.state}
            />

            <ReviewItem
              label="District"
              value={personalDetails.district}
            />

            <ReviewItem
              label="Mandal"
              value={personalDetails.mandal}
            />

            <ReviewItem
              label="Village"
              value={personalDetails.village}
            />

            <ReviewItem
              label="Address"
              value={personalDetails.address}
              fullWidth
            />
          </div>
        </section>

        {/* VEHICLE DETAILS */}
        <section className="delivery-review-card">
          <div className="delivery-review-card-header">
            <div className="delivery-review-card-icon">
              <Truck
                size={20}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <h2>
                Vehicle Details
              </h2>

              <p>
                Your delivery vehicle information
              </p>
            </div>
          </div>

          <div className="delivery-review-grid">
            <ReviewItem
              label="Vehicle Type"
              value={vehicleDetails.vehicleType}
            />

            <ReviewItem
              label="Vehicle Number"
              value={vehicleDetails.vehicleNumber}
            />

            <ReviewItem
              label="Vehicle Model"
              value={vehicleDetails.vehicleModel}
            />

            <ReviewItem
              label="Vehicle Year"
              value={vehicleDetails.vehicleYear}
            />

            <ReviewItem
              label="Ownership"
              value={vehicleDetails.ownership}
            />

            <ReviewItem
              label="Delivery Experience"
              value={vehicleDetails.experience}
            />
          </div>
        </section>

        {/* DOCUMENTS */}
        <section className="delivery-review-card">
          <div className="delivery-review-card-header">
            <div className="delivery-review-card-icon">
              <FileText
                size={20}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <h2>
                Documents
              </h2>

              <p>
                Documents submitted for verification
              </p>
            </div>
          </div>

          <div className="delivery-review-documents">
            <DocumentItem
              label="Driving Licence"
              file={documents.drivingLicence}
            />

            <DocumentItem
              label="Vehicle RC"
              file={documents.vehicleRc}
            />

            <DocumentItem
              label="Identity Proof"
              file={documents.identityProof}
            />

            <DocumentItem
              label="Address Proof"
              file={documents.addressProof}
            />

            <DocumentItem
              label="Vehicle Insurance"
              file={documents.vehicleInsurance}
            />

            {documents.additionalDocument && (
              <DocumentItem
                label="Additional Document"
                file={documents.additionalDocument}
              />
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="delivery-review-error">
            <AlertCircle
              size={19}
              strokeWidth={1.7}
            />

            <span>
              {error}
            </span>
          </div>
        )}

        {/* Submit */}
        <section className="delivery-review-submit-section">
          <div className="delivery-review-submit-info">
            <ShieldCheck
              size={18}
              strokeWidth={1.7}
            />

            <p>
              By submitting, you confirm that the
              information provided is accurate and
              complete.
            </p>
          </div>

          <button
            type="button"
            className="delivery-review-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              "Submitting Application..."
            ) : (
              <>
                <Send
                  size={18}
                  strokeWidth={1.7}
                />

                Submit Application
              </>
            )}
          </button>
        </section>

        <p className="delivery-review-footer">
          AGRICONNECT • DELIVERY PARTNER VERIFICATION
        </p>

      </main>
    </div>
  );
}

// =========================================
// REVIEW ITEM
// =========================================

function ReviewItem({
  label,
  value,
  fullWidth = false,
}) {
  return (
    <div
      className={`delivery-review-item ${
        fullWidth
          ? "delivery-review-item-full"
          : ""
      }`}
    >
      <span>{label}</span>

      <strong>
        {value || "Not provided"}
      </strong>
    </div>
  );
}

// =========================================
// DOCUMENT ITEM
// =========================================

function DocumentItem({
  label,
  file,
}) {
  return (
    <div className="delivery-review-document">
      <div className="delivery-review-document-icon">
        <FileText
          size={18}
          strokeWidth={1.7}
        />
      </div>

      <div className="delivery-review-document-info">
        <span>{label}</span>

        <strong>
          {file?.fileName ||
            file?.name ||
            "Document submitted"}
        </strong>
      </div>

      <CheckCircle2
        size={19}
        strokeWidth={1.7}
        className="delivery-review-document-check"
      />
    </div>
  );
}

export default DeliveryReview;
