import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  UserRoundPlus,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Trash2,
  Smartphone,
  MapPin,
  Sprout,
  Ruler,
  IdCard,
  LoaderCircle,
} from "lucide-react";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { signInAnonymously } from "firebase/auth";

import { auth, db } from "../../firebase";

import "./FpoMemberFarmers.css";

const EMPTY_FARMER = {
  name: "",
  mobile: "",
  memberId: "",
  village: "",
  district: "",
  crop: "",
  landArea: "",
};

function FpoMemberFarmers() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const organisation =
    state.organisation || {};

  const mobile =
    state.mobile ||
    organisation.mobile ||
    "";

  const incomingUid =
    state.uid || "";

  const applicationId =
    state.applicationId || "";

  const status =
    state.status || "";

  const rejected =
    state.rejected === true;

  const rejectionReason =
    state.rejectionReason || "";

  const previousFarmers =
    Array.isArray(state.farmers)
      ? state.farmers
      : [];

  const isRejected =
    rejected ||
    String(status).toLowerCase() ===
      "rejected";

  // =========================================
  // FARMERS STATE
  // =========================================

  const [farmers, setFarmers] =
    useState(previousFarmers);

  const [loadingData, setLoadingData] =
    useState(
      isRejected &&
        previousFarmers.length === 0 &&
        !!applicationId
    );

  const [showForm, setShowForm] =
    useState(
      previousFarmers.length === 0
    );

  const [editingIndex, setEditingIndex] =
    useState(null);

  const [farmer, setFarmer] =
    useState({
      ...EMPTY_FARMER,
    });

  const [error, setError] =
    useState("");

  // =========================================
  // LOAD PREVIOUS FARMERS FOR REJECTED FPO
  // =========================================

  useEffect(() => {
    if (
      !isRejected ||
      previousFarmers.length > 0 ||
      !applicationId
    ) {
      return;
    }

    let cancelled = false;

    const loadPreviousFarmers =
      async () => {
        try {
          setLoadingData(true);
          setError("");

          const applicationRef =
            doc(
              db,
              "fpoApplications",
              applicationId
            );

          const snapshot =
            await getDoc(
              applicationRef
            );

          if (cancelled) return;

          if (!snapshot.exists()) {
            setFarmers([]);
            setShowForm(true);

            setError(
              "Previous application was not found. You can add farmers again."
            );

            setLoadingData(false);
            return;
          }

          const data =
            snapshot.data();

          const existingFarmers =
            Array.isArray(data.farmers)
              ? data.farmers
              : [];

          setFarmers(
            existingFarmers
          );

          setShowForm(
            existingFarmers.length === 0
          );

          setLoadingData(false);

        } catch (err) {
          console.error(
            "Error loading previous farmers:",
            err
          );

          if (cancelled) return;

          setFarmers([]);
          setShowForm(true);
          setLoadingData(false);

          setError(
            "Unable to load previous farmers. You can add farmers again."
          );
        }
      };

    loadPreviousFarmers();

    return () => {
      cancelled = true;
    };

    // Do NOT add previousFarmers here.
  }, [isRejected, applicationId]);

  // =========================================
  // INPUT CHANGE
  // =========================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFarmer((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // =========================================
  // MOBILE CHANGE
  // =========================================

  const handleMobileChange = (e) => {
    const value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 10);

    setFarmer((prev) => ({
      ...prev,
      mobile: value,
    }));

    setError("");
  };

  // =========================================
  // RESET FORM
  // =========================================

  const resetForm = () => {
    setFarmer({
      ...EMPTY_FARMER,
    });

    setEditingIndex(null);
    setError("");
  };

  // =========================================
  // SAVE FARMER
  // =========================================

  const handleSaveFarmer = (e) => {
    e.preventDefault();

    setError("");

    const name =
      String(farmer.name || "")
        .trim();

    const farmerMobile =
      String(farmer.mobile || "")
        .trim();

    const memberId =
      String(farmer.memberId || "")
        .trim();

    const village =
      String(farmer.village || "")
        .trim();

    const district =
      String(farmer.district || "")
        .trim();

    const crop =
      String(farmer.crop || "")
        .trim();

    const landArea =
      String(farmer.landArea || "")
        .trim();

    if (
      !name ||
      !farmerMobile ||
      !memberId ||
      !village ||
      !district ||
      !crop ||
      !landArea
    ) {
      setError(
        "Please complete all farmer details."
      );
      return;
    }

    // =====================================
    // MOBILE
    // =====================================

    if (
      !/^[6-9]\d{9}$/.test(
        farmerMobile
      )
    ) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    // =====================================
    // LAND AREA
    // =====================================

    const numericLandArea =
      Number(landArea);

    if (
      !Number.isFinite(
        numericLandArea
      ) ||
      numericLandArea <= 0
    ) {
      setError(
        "Please enter a valid land area."
      );
      return;
    }

    const finalFarmer = {
      name,
      mobile: farmerMobile,
      memberId,
      village,
      district,
      crop,
      landArea:
        numericLandArea.toString(),
    };

    // =====================================
    // DUPLICATE MEMBER ID
    // =====================================

    const duplicateMemberId =
      farmers.some(
        (item, index) => {
          if (
            index === editingIndex
          ) {
            return false;
          }

          return (
            String(
              item.memberId || ""
            )
              .trim()
              .toLowerCase() ===
            memberId.toLowerCase()
          );
        }
      );

    if (duplicateMemberId) {
      setError(
        "This Member ID is already added."
      );
      return;
    }

    // =====================================
    // DUPLICATE MOBILE
    // =====================================

    const duplicateMobile =
      farmers.some(
        (item, index) => {
          if (
            index === editingIndex
          ) {
            return false;
          }

          return (
            String(
              item.mobile || ""
            ) === farmerMobile
          );
        }
      );

    if (duplicateMobile) {
      setError(
        "This mobile number is already added."
      );
      return;
    }

    // =====================================
    // UPDATE FARMER
    // =====================================

    if (editingIndex !== null) {
      setFarmers(
        (currentFarmers) =>
          currentFarmers.map(
            (item, index) =>
              index === editingIndex
                ? finalFarmer
                : item
          )
      );

      resetForm();
      setShowForm(false);

      return;
    }

    // =====================================
    // ADD FARMER
    // =====================================

    setFarmers(
      (currentFarmers) => [
        ...currentFarmers,
        finalFarmer,
      ]
    );

    setFarmer({
      ...EMPTY_FARMER,
    });

    setEditingIndex(null);
    setShowForm(false);
    setError("");
  };

  // =========================================
  // EDIT FARMER
  // =========================================

  const handleEdit = (index) => {
    const selected =
      farmers[index];

    if (!selected) {
      return;
    }

    setFarmer({
      name:
        selected.name || "",

      mobile:
        selected.mobile || "",

      memberId:
        selected.memberId || "",

      village:
        selected.village || "",

      district:
        selected.district || "",

      crop:
        selected.crop || "",

      landArea:
        selected.landArea || "",
    });

    setEditingIndex(index);
    setShowForm(true);
    setError("");
  };

  // =========================================
  // DELETE FARMER
  // =========================================

  const handleDelete = (index) => {
    const updatedFarmers =
      farmers.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

    setFarmers(
      updatedFarmers
    );

    resetForm();

    setShowForm(
      updatedFarmers.length === 0
    );
  };

  // =========================================
  // ADD ANOTHER
  // =========================================

  const handleAddAnother = () => {
    resetForm();
    setShowForm(true);
  };

  // =========================================
  // ENSURE FIREBASE SESSION
  // =========================================

  const ensureFirebaseSession =
    async () => {
      let currentUser =
        auth.currentUser;

      if (!currentUser) {
        const credential =
          await signInAnonymously(auth);

        currentUser =
          credential.user;
      }

      return currentUser;
    };

  // =========================================
  // CONTINUE TO DOCUMENTS
  // =========================================

  const handleContinue = async () => {
    setError("");

    if (farmers.length === 0) {
      setShowForm(true);

      setError(
        "Please add at least one member farmer to continue."
      );

      return;
    }

    try {
      /*
       * Make sure Firebase session exists
       * before moving to the next step.
       */
      const currentUser =
        await ensureFirebaseSession();

      const currentUid =
        incomingUid ||
        currentUser.uid;

      console.log(
        "FPO Farmers UID:",
        currentUid
      );

      navigate(
        "/fpo/documents",
        {
          state: {
            organisation,
            farmers,

            mobile:
              mobile ||
              organisation.mobile ||
              "",

            uid: currentUid,

            applicationId,

            status,

            rejected:
              isRejected,

            rejectionReason,

            isNewUser:
              !isRejected,
          },
        }
      );

    } catch (err) {
      console.error(
        "FPO session error:",
        err
      );

      setError(
        "Unable to continue your secure session. Please try again."
      );
    }
  };

  // =========================================
  // BACK
  // =========================================

  const handleBack = () => {
    navigate(
      "/fpo/organisation-details",
      {
        state: {
          organisation,

          mobile,
          uid: incomingUid,

          applicationId,

          status,

          rejected:
            isRejected,

          rejectionReason,

          isNewUser:
            !isRejected,
        },
      }
    );
  };

  // =========================================
  // LOADING
  // =========================================

  if (loadingData) {
    return (
      <div className="fpo-farmers-page">

        <div className="fpo-farmers-glow fpo-farmers-glow-one" />
        <div className="fpo-farmers-glow fpo-farmers-glow-two" />

        <main className="fpo-farmers-container">

          <div
            style={{
              minHeight: "70vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <LoaderCircle
              size={30}
              className="fpo-loading-icon"
            />

            <p>
              Loading member farmers...
            </p>
          </div>

        </main>

      </div>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <div className="fpo-farmers-page">

      <div className="fpo-farmers-glow fpo-farmers-glow-one" />
      <div className="fpo-farmers-glow fpo-farmers-glow-two" />

      <main className="fpo-farmers-container">

        {/* BACK */}

        <button
          type="button"
          className="fpo-farmers-back"
          onClick={handleBack}
        >
          <ArrowLeft size={19} />
        </button>

        {/* HEADER */}

        <div className="fpo-farmers-header">

          <div className="fpo-farmers-logo">
            <Users size={28} />
          </div>

          <p className="fpo-farmers-label">
            FPO REGISTRATION
          </p>

          <h1>
            Member <span>Farmers</span>
          </h1>

          <p className="fpo-farmers-subtitle">
            Add the farmers who are members of
            your Farmer Producer Organization
          </p>

        </div>

        {/* REJECTED */}

        {isRejected && (
          <div
            className="fpo-org-info"
            style={{
              marginBottom: "18px",
            }}
          >
            <p>
              <strong>
                Previous application rejected.
              </strong>

              {rejectionReason && (
                <>
                  <br />
                  Reason:{" "}
                  {rejectionReason}
                </>
              )}

              <br />

              Review and update your member
              farmers before resubmitting.
            </p>
          </div>
        )}

        {/* PROGRESS */}

        <div className="fpo-farmers-progress">

          <div className="farmer-progress-step completed">
            <span>✓</span>
            <p>Organisation</p>
          </div>

          <div className="farmer-progress-line active" />

          <div className="farmer-progress-step active">
            <span>2</span>
            <p>Farmers</p>
          </div>

          <div className="farmer-progress-line" />

          <div className="farmer-progress-step">
            <span>3</span>
            <p>Documents</p>
          </div>

        </div>

        {/* MAIN CARD */}

        <section className="fpo-farmers-card">

          {/* SUMMARY */}

          <div className="farmers-summary">

            <div className="farmers-summary-icon">
              <Users size={20} />
            </div>

            <div>
              <span>
                FPO Members
              </span>

              <strong>
                {farmers.length} Farmer
                {farmers.length !== 1
                  ? "s"
                  : ""}
              </strong>
            </div>

          </div>

          {/* FARMER LIST */}

          {farmers.length > 0 && (
            <div className="farmers-list">

              <div className="farmers-list-header">

                <div>

                  <h2>
                    Added Farmers
                  </h2>

                  <p>
                    Members added to this FPO
                  </p>

                </div>

              </div>

              {farmers.map(
                (item, index) => (
                  <div
                    className="farmer-item"
                    key={
                      `${item.memberId || "farmer"}-${index}`
                    }
                  >

                    <div className="farmer-avatar">
                      {String(
                        item.name || "?"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="farmer-item-info">

                      <h3>
                        {item.name}
                      </h3>

                      <p>
                        Member ID:{" "}
                        {item.memberId}
                      </p>

                      <div className="farmer-item-meta">

                        <span>
                          <Smartphone
                            size={13}
                          />
                          +91{" "}
                          {item.mobile}
                        </span>

                        <span>
                          <MapPin
                            size={13}
                          />
                          {item.village}
                        </span>

                        <span>
                          <Sprout
                            size={13}
                          />
                          {item.crop}
                        </span>

                        <span>
                          <Ruler
                            size={13}
                          />
                          {item.landArea} acres
                        </span>

                      </div>

                    </div>

                    <div className="farmer-item-actions">

                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(index)
                        }
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(index)
                        }
                      >
                        <Trash2 size={16} />
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

          {/* ADD FORM */}

          {showForm && (
            <div className="add-farmer-section">

              <div className="add-farmer-title">

                <div className="add-farmer-icon">
                  <UserRoundPlus size={18} />
                </div>

                <div>

                  <h2>
                    {editingIndex !== null
                      ? "Edit Farmer"
                      : "Add Member Farmer"}
                  </h2>

                  <p>
                    Enter the basic details of
                    the FPO member
                  </p>

                </div>

              </div>

              <form
                className="farmer-form"
                onSubmit={
                  handleSaveFarmer
                }
              >

                <div className="farmer-field full">

                  <label>
                    Farmer Name{" "}
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      farmer.name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter farmer full name"
                  />

                </div>

                <div className="farmer-field">

                  <label>
                    Mobile Number{" "}
                    <span>*</span>
                  </label>

                  <div className="farmer-mobile-input">

                    <span>
                      +91
                    </span>

                    <div />

                    <Smartphone
                      size={16}
                    />

                    <input
                      type="tel"
                      inputMode="numeric"
                      value={
                        farmer.mobile
                      }
                      onChange={
                        handleMobileChange
                      }
                      placeholder="10-digit mobile"
                      maxLength={10}
                    />

                  </div>

                </div>

                <div className="farmer-field">

                  <label>
                    Farmer / Member ID{" "}
                    <span>*</span>
                  </label>

                  <div className="field-with-icon">

                    <IdCard size={16} />

                    <input
                      type="text"
                      name="memberId"
                      value={
                        farmer.memberId
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter member ID"
                    />

                  </div>

                </div>

                <div className="farmer-field">

                  <label>
                    Village{" "}
                    <span>*</span>
                  </label>

                  <div className="field-with-icon">

                    <MapPin size={16} />

                    <input
                      type="text"
                      name="village"
                      value={
                        farmer.village
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter village"
                    />

                  </div>

                </div>

                <div className="farmer-field">

                  <label>
                    District{" "}
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="district"
                    value={
                      farmer.district
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter district"
                  />

                </div>

                <div className="farmer-field">

                  <label>
                    Main Crop{" "}
                    <span>*</span>
                  </label>

                  <div className="field-with-icon">

                    <Sprout size={16} />

                    <input
                      type="text"
                      name="crop"
                      value={
                        farmer.crop
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Example: Tomato"
                    />

                  </div>

                </div>

                <div className="farmer-field">

                  <label>
                    Land Area{" "}
                    <span>*</span>
                  </label>

                  <div className="field-with-icon">

                    <Ruler size={16} />

                    <input
                      type="number"
                      name="landArea"
                      value={
                        farmer.landArea
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Example: 3"
                      min="0"
                      step="0.01"
                    />

                    <small>
                      acres
                    </small>

                  </div>

                </div>

                {error && (
                  <div className="farmer-error">
                    {error}
                  </div>
                )}

                <div className="farmer-form-actions">

                  {editingIndex !== null && (
                    <button
                      type="button"
                      className="cancel-farmer-button"
                      onClick={() => {
                        resetForm();

                        setShowForm(
                          farmers.length === 0
                        );
                      }}
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    className="save-farmer-button"
                  >

                    <UserRoundPlus
                      size={17}
                    />

                    <span>
                      {editingIndex !== null
                        ? "Update Farmer"
                        : "Add Farmer"}
                    </span>

                  </button>

                </div>

              </form>

            </div>
          )}

          {/* ADD ANOTHER */}

          {!showForm &&
            farmers.length > 0 && (
              <button
                type="button"
                className="add-another-button"
                onClick={
                  handleAddAnother
                }
              >

                <UserRoundPlus
                  size={18}
                />

                <span>
                  Add Another Farmer
                </span>

              </button>
            )}

          {/* ERROR */}

          {!showForm && error && (
            <div className="farmer-error">
              {error}
            </div>
          )}

          {/* CONTINUE */}

          <div className="farmers-bottom">

            <p>
              You can add more farmers later
              from your FPO dashboard.
            </p>

            <button
              type="button"
              className="continue-farmers-button"
              onClick={
                handleContinue
              }
            >

              <span>
                Continue to Documents
              </span>

              <ArrowRight
                size={18}
              />

            </button>

          </div>

        </section>

        <p className="fpo-farmers-footer">
          AgriConnect • FPO Registration
        </p>

      </main>

    </div>
  );
}

export default FpoMemberFarmers;