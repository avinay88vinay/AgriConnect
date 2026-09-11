import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  UserRound,
  MapPin,
  Sprout,
  FileText,
  Leaf,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase";

import "./AdminFarmerReview.css";


function AdminFarmerReview() {
  const navigate = useNavigate();

  const { applicationId } =
    useParams();

  const [application, setApplication] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [rejectReason, setRejectReason] =
    useState("");

  const [
    showRejectBox,
    setShowRejectBox,
  ] = useState(false);


  /* =========================================
     LOAD APPLICATION
  ========================================= */

  useEffect(() => {
    const loadApplication =
      async () => {
        try {
          setLoading(true);

          const applicationRef =
            doc(
              db,
              "farmerApplications",
              applicationId
            );

          const snapshot =
            await getDoc(
              applicationRef
            );

          if (!snapshot.exists()) {
            setError(
              "Farmer application not found."
            );

            setLoading(false);
            return;
          }

          setApplication({
            id: snapshot.id,
            ...snapshot.data(),
          });

        } catch (firebaseError) {
          console.error(
            firebaseError
          );

          setError(
            "Unable to load farmer application."
          );
        }

        setLoading(false);
      };

    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);


  /* =========================================
     GET PROFILE ID
  ========================================= */

  const getProfileId = () => {
    if (!application) {
      return "";
    }

    if (
      application.profileId
    ) {
      return application.profileId;
    }

    if (
      application.mobile
    ) {
      return `farmer_${application.mobile}`;
    }

    return `farmer_${applicationId}`;
  };


  /* =========================================
     APPROVE
  ========================================= */

  const handleApprove =
    async () => {
      if (!application) {
        return;
      }

      setActionLoading(true);
      setError("");

      try {
        const profileId =
          getProfileId();

        const mobile =
          application.mobile ||
          "";

        /* -----------------------------------
           1. UPDATE APPLICATION
        ----------------------------------- */

        await updateDoc(
          doc(
            db,
            "farmerApplications",
            applicationId
          ),
          {
            status: "approved",

            profileId,

            reviewedAt:
              serverTimestamp(),

            reviewedBy:
              "admin",
          }
        );


        /* -----------------------------------
           2. CREATE CANONICAL PROFILE
        ----------------------------------- */

        await setDoc(
          doc(
            db,
            "farmerProfiles",
            profileId
          ),
          {
            profileId,

            uid:
              application.uid ||
              "",

            applicationId,

            mobile,

            role:
              "individual_farmer",

            status:
              "approved",

            personalDetails:
              application.personalDetails ||
              {},

            farmDetails:
              application.farmDetails ||
              {},

            documents:
              application.documents ||
              {},

            fullName:
              application.personalDetails
                ?.fullName ||
              application.fullName ||
              "",

            location: {
              state:
                application.personalDetails
                  ?.state ||
                "",
              district:
                application.personalDetails
                  ?.district ||
                "",
              mandal:
                application.personalDetails
                  ?.mandal ||
                "",
              village:
                application.personalDetails
                  ?.village ||
                "",
              pincode:
                application.personalDetails
                  ?.pincode ||
                "",
              address:
                application.personalDetails
                  ?.address ||
                "",
            },

            approvedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );


        /* -----------------------------------
           3. CREATE LOGIN INDEX
        ----------------------------------- */

        if (mobile) {
          await setDoc(
            doc(
              db,
              "farmerLoginIndex",
              mobile
            ),
            {
              uid:
                application.uid ||
                "",

              applicationId,

              profileId,

              status:
                "approved",

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }


        /* -----------------------------------
           4. USER RECORD
        ----------------------------------- */

        if (application.uid) {
          await setDoc(
            doc(
              db,
              "users",
              application.uid
            ),
            {
              uid:
                application.uid,

              role:
                "individual_farmer",

              status:
                "approved",

              profileId,

              mobile,

              applicationId,

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }


        navigate(
          "/admin/dashboard"
        );

      } catch (firebaseError) {
        console.error(
          "Farmer approval error:",
          firebaseError
        );

        setError(
          firebaseError.message ||
            "Unable to approve farmer."
        );
      }

      setActionLoading(false);
    };


  /* =========================================
     REJECT
  ========================================= */

  const handleReject =
    async () => {
      if (!application) {
        return;
      }

      const reason =
        rejectReason.trim();

      if (!reason) {
        setError(
          "Please enter a rejection reason."
        );

        return;
      }

      setActionLoading(true);
      setError("");

      try {
        const profileId =
          getProfileId();

        const mobile =
          application.mobile ||
          "";

        /* -----------------------------------
           1. UPDATE APPLICATION
        ----------------------------------- */

        await updateDoc(
          doc(
            db,
            "farmerApplications",
            applicationId
          ),
          {
            status:
              "rejected",

            profileId,

            rejectionReason:
              reason,

            reviewedAt:
              serverTimestamp(),

            reviewedBy:
              "admin",
          }
        );


        /* -----------------------------------
           2. CREATE / UPDATE PROFILE
        ----------------------------------- */

        await setDoc(
          doc(
            db,
            "farmerProfiles",
            profileId
          ),
          {
            profileId,

            uid:
              application.uid ||
              "",

            applicationId,

            mobile,

            role:
              "individual_farmer",

            status:
              "rejected",

            personalDetails:
              application.personalDetails ||
              {},

            farmDetails:
              application.farmDetails ||
              {},

            documents:
              application.documents ||
              {},

            rejectionReason:
              reason,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );


        /* -----------------------------------
           3. LOGIN INDEX
        ----------------------------------- */

        if (mobile) {
          await setDoc(
            doc(
              db,
              "farmerLoginIndex",
              mobile
            ),
            {
              uid:
                application.uid ||
                "",

              applicationId,

              profileId,

              status:
                "rejected",

              rejectionReason:
                reason,

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }


        /* -----------------------------------
           4. USER STATUS
        ----------------------------------- */

        if (application.uid) {
          await setDoc(
            doc(
              db,
              "users",
              application.uid
            ),
            {
              uid:
                application.uid,

              role:
                "individual_farmer",

              status:
                "rejected",

              profileId,

              mobile,

              applicationId,

              rejectionReason:
                reason,

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }


        navigate(
          "/admin/dashboard"
        );

      } catch (firebaseError) {
        console.error(
          "Farmer rejection error:",
          firebaseError
        );

        setError(
          firebaseError.message ||
            "Unable to reject farmer."
        );
      }

      setActionLoading(false);
    };


  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="admin-review-loading">

        <LoaderCircle
          size={30}
          className="spin"
        />

        <p>
          Loading farmer application...
        </p>

      </div>
    );
  }


  /* =========================================
     ERROR / NO APPLICATION
  ========================================= */

  if (!application) {
    return (
      <div className="admin-review-error">

        <XCircle size={35} />

        <h2>
          Application not found
        </h2>

        <p>
          {error ||
            "This farmer application does not exist."}
        </p>

        <button
          onClick={() =>
            navigate(
              "/admin/dashboard"
            )
          }
        >
          Back to Dashboard
        </button>

      </div>
    );
  }


  const personal =
    application.personalDetails ||
    {};

  const farm =
    application.farmDetails ||
    {};

  const documents =
    application.documents ||
    {};

  const profileId =
    getProfileId();


  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="admin-farmer-review">

      {/* HEADER */}

      <header className="admin-review-header">

        <button
          className="review-back"
          onClick={() =>
            navigate(
              "/admin/dashboard"
            )
          }
        >
          <ArrowLeft size={18} />
          Back
        </button>


        <div className="review-brand">

          <div>
            <Leaf
              size={21}
            />
          </div>

          <span>
            AgriConnect
          </span>

        </div>

      </header>


      {/* CONTENT */}

      <main className="admin-review-content">

        <div className="review-title">

          <div>

            <p>
              FARMER VERIFICATION
            </p>

            <h1>
              Individual Farmer Application
            </h1>

            <span>
              Application ID:{" "}
              {applicationId}
            </span>

          </div>


          <div className="review-status">

            <ShieldCheck
              size={17}
            />

            {application.status}

          </div>

        </div>


        {error && (
          <div className="review-error-box">
            <AlertCircle size={18} />
            {error}
          </div>
        )}


        {/* PERSONAL */}

        <section className="review-section">

          <div className="review-section-title">

            <UserRound
              size={19}
            />

            <div>
              <p>
                PERSONAL DETAILS
              </p>

              <h2>
                Farmer Information
              </h2>
            </div>

          </div>


          <div className="review-grid">

            <div>
              <span>
                Full Name
              </span>

              <strong>
                {personal.fullName ||
                  application.fullName ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Mobile
              </span>

              <strong>
                {application.mobile ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Email
              </span>

              <strong>
                {personal.email ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Date of Birth
              </span>

              <strong>
                {personal.dob ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Gender
              </span>

              <strong>
                {personal.gender ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Pincode
              </span>

              <strong>
                {personal.pincode ||
                  "—"}
              </strong>
            </div>

          </div>

        </section>


        {/* LOCATION */}

        <section className="review-section">

          <div className="review-section-title">

            <MapPin
              size={19}
            />

            <div>
              <p>
                LOCATION
              </p>

              <h2>
                Registered Address
              </h2>
            </div>

          </div>


          <div className="review-address">

            <strong>
              {personal.address ||
                "Address not provided"}
            </strong>

            <span>
              {[
                personal.village,
                personal.mandal,
                personal.district,
                personal.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>

          </div>

        </section>


        {/* FARM */}

        <section className="review-section">

          <div className="review-section-title">

            <Sprout
              size={19}
            />

            <div>
              <p>
                FARM DETAILS
              </p>

              <h2>
                Farming Information
              </h2>
            </div>

          </div>


          <div className="review-grid">

            <div>
              <span>
                Farm Name
              </span>

              <strong>
                {farm.farmName ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Farm Type
              </span>

              <strong>
                {farm.farmType ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Land Area
              </span>

              <strong>
                {farm.landArea ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Land Unit
              </span>

              <strong>
                {farm.landUnit ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Main Crops
              </span>

              <strong>
                {farm.crops ||
                  farm.mainCrops ||
                  "—"}
              </strong>
            </div>


            <div>
              <span>
                Irrigation
              </span>

              <strong>
                {farm.irrigation ||
                  "—"}
              </strong>
            </div>

          </div>

        </section>


        {/* DOCUMENTS */}

        <section className="review-section">

          <div className="review-section-title">

            <FileText
              size={19}
            />

            <div>
              <p>
                DOCUMENTS
              </p>

              <h2>
                Submitted Documents
              </h2>
            </div>

          </div>


          <div className="review-documents">

            {Object.keys(
              documents
            ).length === 0 ? (
              <p>
                No document metadata available.
              </p>
            ) : (
              Object.entries(
                documents
              ).map(
                ([key, value]) => (
                  <div
                    className="review-document"
                    key={key}
                  >

                    <FileText
                      size={17}
                    />

                    <div>

                      <strong>
                        {key}
                      </strong>

                      <span>
                        {typeof value ===
                        "object"
                          ? value.name ||
                            "Submitted"
                          : value ||
                            "Submitted"}
                      </span>

                    </div>

                  </div>
                )
              )
            )}

          </div>

        </section>


        {/* IDENTITY */}

        <section className="review-section">

          <div className="review-section-title">

            <ShieldCheck
              size={19}
            />

            <div>
              <p>
                SYSTEM IDENTITY
              </p>

              <h2>
                Stable Farmer Mapping
              </h2>
            </div>

          </div>


          <div className="review-identity">

            <div>
              <span>
                Profile ID
              </span>

              <strong>
                {profileId}
              </strong>
            </div>

            <div>
              <span>
                Application ID
              </span>

              <strong>
                {applicationId}
              </strong>
            </div>

          </div>

        </section>


        {/* ACTIONS */}

        {application.status ===
          "pending" && (
          <section className="review-actions">

            {!showRejectBox ? (
              <>

                <button
                  className="reject-button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    setShowRejectBox(
                      true
                    )
                  }
                >
                  <XCircle
                    size={18}
                  />

                  Reject Application
                </button>


                <button
                  className="approve-button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    handleApprove
                  }
                >

                  {actionLoading ? (
                    <LoaderCircle
                      size={18}
                      className="spin"
                    />
                  ) : (
                    <CheckCircle2
                      size={18}
                    />
                  )}

                  Approve Farmer

                </button>

              </>
            ) : (
              <div className="reject-box">

                <h3>
                  Rejection Reason
                </h3>

                <textarea
                  value={
                    rejectReason
                  }
                  onChange={(event) =>
                    setRejectReason(
                      event.target
                        .value
                    )
                  }
                  placeholder="Explain why this application is being rejected..."
                  rows={4}
                />

                <div>

                  <button
                    className="cancel-reject"
                    onClick={() => {
                      setShowRejectBox(
                        false
                      );

                      setRejectReason(
                        ""
                      );
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    className="confirm-reject"
                    disabled={
                      actionLoading
                    }
                    onClick={
                      handleReject
                    }
                  >
                    {actionLoading
                      ? "Rejecting..."
                      : "Confirm Rejection"}
                  </button>

                </div>

              </div>
            )}

          </section>
        )}

      </main>

    </div>
  );
}

export default AdminFarmerReview;