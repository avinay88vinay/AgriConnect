import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserRound,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Mail,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import "./DeliveryPartnerDetails.css";

function DeliveryPartnerDetails() {
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

  const [formData, setFormData] = useState({
    fullName:
      state.personalDetails?.fullName || "",

    email:
      state.personalDetails?.email || "",

    dob:
      state.personalDetails?.dob || "",

    gender:
      state.personalDetails?.gender || "",

    address:
      state.personalDetails?.address || "",

    state:
      state.personalDetails?.state || "",

    district:
      state.personalDetails?.district || "",

    mandal:
      state.personalDetails?.mandal || "",

    village:
      state.personalDetails?.village || "",

    pincode:
      state.personalDetails?.pincode || "",
  });

  const [error, setError] = useState("");

  // =========================================
  // INPUT CHANGE
  // =========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // =========================================
  // VALIDATION
  // =========================================

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!formData.email.trim()) {
      return "Please enter your email address.";
    }

    if (!formData.dob) {
      return "Please select your date of birth.";
    }

    if (!formData.gender) {
      return "Please select your gender.";
    }

    if (!formData.address.trim()) {
      return "Please enter your address.";
    }

    if (!formData.state.trim()) {
      return "Please enter your state.";
    }

    if (!formData.district.trim()) {
      return "Please enter your district.";
    }

    if (!formData.mandal.trim()) {
      return "Please enter your mandal.";
    }

    if (!formData.village.trim()) {
      return "Please enter your village.";
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      return "Please enter a valid 6-digit pincode.";
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return "Invalid mobile number. Please login again.";
    }

    return "";
  };

  // =========================================
  // CONTINUE
  // =========================================

  const handleContinue = (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    // Save mobile locally
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

    navigate(
      "/delivery/vehicle-details",
      {
        state: {
          uid,
          mobile,

          applicationId,

          rejected,

          rejectionReason,

          personalDetails: formData,
        },
      }
    );
  };

  // =========================================
  // BACK
  // =========================================

  const handleBack = () => {
    navigate("/login/delivery");
  };

  return (
    <div className="delivery-details-page">

      <div className="delivery-details-glow delivery-details-glow-one" />
      <div className="delivery-details-glow delivery-details-glow-two" />

      <main className="delivery-details-container">

        {/* Back */}
        <button
          type="button"
          className="delivery-details-back"
          onClick={handleBack}
          aria-label="Back"
        >
          <ArrowLeft
            size={20}
            strokeWidth={1.7}
          />
        </button>

        {/* Header */}
        <header className="delivery-details-header">

          <div className="delivery-details-logo">
            <UserRound
              size={30}
              strokeWidth={1.6}
            />
          </div>

          <p className="delivery-details-label">
            DELIVERY PARTNER REGISTRATION
          </p>

          <h1>
            Personal Details
          </h1>

          <p>
            Tell us a little about yourself to
            continue your registration.
          </p>

        </header>

        {/* Rejection Notice */}
        {rejected && rejectionReason && (
          <div className="delivery-details-rejection">

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

        {/* Form */}
        <section className="delivery-details-card">

          <form onSubmit={handleContinue}>

            {/* ============================ */}
            {/* BASIC INFORMATION */}
            {/* ============================ */}

            <div className="delivery-details-section-heading">

              <div className="delivery-details-section-icon">
                <UserRound
                  size={18}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <h2>
                  Basic Information
                </h2>

                <p>
                  Enter your personal information
                </p>
              </div>

            </div>

            <div className="delivery-details-grid">

              {/* Full Name */}
              <div className="delivery-details-field">

                <label htmlFor="fullName">
                  Full Name
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                />

              </div>

              {/* Email */}
              <div className="delivery-details-field">

                <label htmlFor="email">
                  Email Address
                </label>

                <div className="delivery-details-input-icon">

                  <Mail
                    size={17}
                    strokeWidth={1.6}
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                  />

                </div>

              </div>

              {/* Mobile */}
              <div className="delivery-details-field">

                <label htmlFor="mobile">
                  Mobile Number
                </label>

                <div className="delivery-details-mobile-input">

                  <span>
                    +91
                  </span>

                  <input
                    id="mobile"
                    type="text"
                    value={mobile}
                    disabled
                  />

                  <ShieldCheck
                    size={17}
                    strokeWidth={1.6}
                  />

                </div>

              </div>

              {/* DOB */}
              <div className="delivery-details-field">

                <label htmlFor="dob">
                  Date of Birth
                </label>

                <div className="delivery-details-input-icon">

                  <CalendarDays
                    size={17}
                    strokeWidth={1.6}
                  />

                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleChange}
                  />

                </div>

              </div>

              {/* Gender */}
              <div className="delivery-details-field">

                <label htmlFor="gender">
                  Gender
                </label>

                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">
                    Select gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>

              </div>

            </div>

            {/* ============================ */}
            {/* ADDRESS */}
            {/* ============================ */}

            <div className="delivery-details-section-heading delivery-details-address-heading">

              <div className="delivery-details-section-icon">
                <MapPin
                  size={18}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <h2>
                  Address Details
                </h2>

                <p>
                  Enter your residential address
                </p>
              </div>

            </div>

            <div className="delivery-details-grid">

              {/* Address */}
              <div className="delivery-details-field delivery-details-field-full">

                <label htmlFor="address">
                  Full Address
                </label>

                <textarea
                  id="address"
                  name="address"
                  rows="3"
                  placeholder="Enter your complete address"
                  value={formData.address}
                  onChange={handleChange}
                />

              </div>

              {/* State */}
              <div className="delivery-details-field">

                <label htmlFor="state">
                  State
                </label>

                <input
                  id="state"
                  name="state"
                  type="text"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={handleChange}
                />

              </div>

              {/* District */}
              <div className="delivery-details-field">

                <label htmlFor="district">
                  District
                </label>

                <input
                  id="district"
                  name="district"
                  type="text"
                  placeholder="Enter district"
                  value={formData.district}
                  onChange={handleChange}
                />

              </div>

              {/* Mandal */}
              <div className="delivery-details-field">

                <label htmlFor="mandal">
                  Mandal
                </label>

                <input
                  id="mandal"
                  name="mandal"
                  type="text"
                  placeholder="Enter mandal"
                  value={formData.mandal}
                  onChange={handleChange}
                />

              </div>

              {/* Village */}
              <div className="delivery-details-field">

                <label htmlFor="village">
                  Village / Town
                </label>

                <input
                  id="village"
                  name="village"
                  type="text"
                  placeholder="Enter village or town"
                  value={formData.village}
                  onChange={handleChange}
                />

              </div>

              {/* Pincode */}
              <div className="delivery-details-field">

                <label htmlFor="pincode">
                  Pincode
                </label>

                <input
                  id="pincode"
                  name="pincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit pincode"
                  value={formData.pincode}
                  onChange={(event) => {
                    const value =
                      event.target.value.replace(
                        /\D/g,
                        ""
                      );

                    if (value.length <= 6) {
                      setFormData((previous) => ({
                        ...previous,
                        pincode: value,
                      }));
                    }

                    setError("");
                  }}
                />

              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="delivery-details-error">

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
              type="submit"
              className="delivery-details-button"
            >
              Continue to Vehicle Details

              <ArrowRight
                size={18}
                strokeWidth={1.7}
              />
            </button>

          </form>

        </section>

        {/* Footer */}
        <p className="delivery-details-footer">
          AGRICONNECT • DELIVERY PARTNER VERIFICATION
        </p>

      </main>

    </div>
  );
}

export default DeliveryPartnerDetails;