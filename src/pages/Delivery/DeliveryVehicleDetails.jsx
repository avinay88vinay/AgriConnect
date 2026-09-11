import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Truck,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import "./DeliveryVehicleDetails.css";

function DeliveryVehicleDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const mobile =
    state.mobile ||
    localStorage.getItem("agriconnect_delivery_mobile") ||
    "";

  const uid = state.uid || "";

  const applicationId =
    state.applicationId ||
    localStorage.getItem("agriconnect_delivery_applicationId") ||
    "";

  const rejected = state.rejected || false;

  const rejectionReason =
    state.rejectionReason || "";

  const personalDetails =
    state.personalDetails || {};

  const [formData, setFormData] = useState({
    vehicleType:
      state.vehicleDetails?.vehicleType || "",

    vehicleNumber:
      state.vehicleDetails?.vehicleNumber || "",

    vehicleModel:
      state.vehicleDetails?.vehicleModel || "",

    vehicleYear:
      state.vehicleDetails?.vehicleYear || "",

    ownership:
      state.vehicleDetails?.ownership || "",

    capacity:
      state.vehicleDetails?.capacity || "",

    experience:
      state.vehicleDetails?.experience || "",
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
    if (!formData.vehicleType) {
      return "Please select your vehicle type.";
    }

    if (!formData.vehicleNumber.trim()) {
      return "Please enter your vehicle registration number.";
    }

    if (!formData.vehicleModel.trim()) {
      return "Please enter your vehicle model.";
    }

    if (!formData.vehicleYear) {
      return "Please select your vehicle year.";
    }

    if (!formData.ownership) {
      return "Please select vehicle ownership.";
    }

    if (!formData.capacity) {
      return "Please select your vehicle carrying capacity.";
    }

    if (!formData.experience) {
      return "Please select your delivery experience.";
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

    navigate("/delivery/documents", {
      state: {
        uid,
        mobile,

        applicationId,

        rejected,

        rejectionReason,

        personalDetails,

        vehicleDetails: formData,
      },
    });
  };

  // =========================================
  // BACK
  // =========================================

  const handleBack = () => {
    navigate("/delivery/partner-details", {
      state: {
        uid,
        mobile,

        applicationId,

        rejected,

        rejectionReason,

        personalDetails,

        vehicleDetails: formData,
      },
    });
  };

  return (
    <div className="delivery-vehicle-page">

      <div className="delivery-vehicle-glow delivery-vehicle-glow-one" />
      <div className="delivery-vehicle-glow delivery-vehicle-glow-two" />

      <main className="delivery-vehicle-container">

        {/* Back */}
        <button
          type="button"
          className="delivery-vehicle-back"
          onClick={handleBack}
          aria-label="Back"
        >
          <ArrowLeft
            size={20}
            strokeWidth={1.7}
          />
        </button>

        {/* Header */}
        <header className="delivery-vehicle-header">

          <div className="delivery-vehicle-logo">
            <Truck
              size={30}
              strokeWidth={1.6}
            />
          </div>

          <p className="delivery-vehicle-label">
            DELIVERY PARTNER REGISTRATION
          </p>

          <h1>
            Vehicle Details
          </h1>

          <p>
            Provide the details of the vehicle you
            will use for deliveries.
          </p>

        </header>

        {/* Rejection Notice */}
        {rejected && rejectionReason && (
          <div className="delivery-vehicle-rejection">

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
        <section className="delivery-vehicle-card">

          <form onSubmit={handleContinue}>

            {/* Section heading */}
            <div className="delivery-vehicle-section-heading">

              <div className="delivery-vehicle-section-icon">
                <Truck
                  size={18}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <h2>
                  Vehicle Information
                </h2>

                <p>
                  Enter your vehicle information
                </p>
              </div>

            </div>

            <div className="delivery-vehicle-grid">

              {/* Vehicle Type */}
              <div className="delivery-vehicle-field">

                <label htmlFor="vehicleType">
                  Vehicle Type
                </label>

                <select
                  id="vehicleType"
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                >
                  <option value="">
                    Select vehicle type
                  </option>

                  <option value="Two Wheeler">
                    Two Wheeler
                  </option>

                  <option value="Three Wheeler">
                    Three Wheeler
                  </option>

                  <option value="Four Wheeler">
                    Four Wheeler
                  </option>

                  <option value="Mini Truck">
                    Mini Truck
                  </option>

                  <option value="Tractor">
                    Tractor
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>

              </div>

              {/* Vehicle Number */}
              <div className="delivery-vehicle-field">

                <label htmlFor="vehicleNumber">
                  Vehicle Registration Number
                </label>

                <input
                  id="vehicleNumber"
                  name="vehicleNumber"
                  type="text"
                  placeholder="e.g. AP 39 AB 1234"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  style={{
                    textTransform: "uppercase",
                  }}
                />

              </div>

              {/* Vehicle Model */}
              <div className="delivery-vehicle-field">

                <label htmlFor="vehicleModel">
                  Vehicle Model
                </label>

                <input
                  id="vehicleModel"
                  name="vehicleModel"
                  type="text"
                  placeholder="Enter vehicle model"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                />

              </div>

              {/* Vehicle Year */}
              <div className="delivery-vehicle-field">

                <label htmlFor="vehicleYear">
                  Manufacturing Year
                </label>

                <select
                  id="vehicleYear"
                  name="vehicleYear"
                  value={formData.vehicleYear}
                  onChange={handleChange}
                >
                  <option value="">
                    Select year
                  </option>

                  {Array.from(
                    {
                      length:
                        new Date().getFullYear() - 1989,
                    },
                    (_, index) => {
                      const year =
                        new Date().getFullYear() -
                        index;

                      return (
                        <option
                          key={year}
                          value={year}
                        >
                          {year}
                        </option>
                      );
                    }
                  )}

                </select>

              </div>

              {/* Ownership */}
              <div className="delivery-vehicle-field">

                <label htmlFor="ownership">
                  Vehicle Ownership
                </label>

                <select
                  id="ownership"
                  name="ownership"
                  value={formData.ownership}
                  onChange={handleChange}
                >
                  <option value="">
                    Select ownership
                  </option>

                  <option value="Self Owned">
                    Self Owned
                  </option>

                  <option value="Family Owned">
                    Family Owned
                  </option>

                  <option value="Rented">
                    Rented
                  </option>

                  <option value="Leased">
                    Leased
                  </option>

                </select>

              </div>

              {/* Carrying Capacity */}
              <div className="delivery-vehicle-field">

                <label htmlFor="capacity">
                  Carrying Capacity
                </label>

                <select
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                >
                  <option value="">
                    Select carrying capacity
                  </option>

                  <option value="Up to 50 kg">
                    Up to 50 kg
                  </option>

                  <option value="50 - 100 kg">
                    50 - 100 kg
                  </option>

                  <option value="100 - 250 kg">
                    100 - 250 kg
                  </option>

                  <option value="250 - 500 kg">
                    250 - 500 kg
                  </option>

                  <option value="500 kg - 1 ton">
                    500 kg - 1 ton
                  </option>

                  <option value="Above 1 ton">
                    Above 1 ton
                  </option>

                </select>

              </div>

              {/* Experience */}
              <div className="delivery-vehicle-field">

                <label htmlFor="experience">
                  Delivery Experience
                </label>

                <select
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                >
                  <option value="">
                    Select experience
                  </option>

                  <option value="Less than 1 year">
                    Less than 1 year
                  </option>

                  <option value="1 - 2 years">
                    1 - 2 years
                  </option>

                  <option value="2 - 5 years">
                    2 - 5 years
                  </option>

                  <option value="More than 5 years">
                    More than 5 years
                  </option>

                </select>

              </div>

            </div>

            {/* Verification note */}
            <div className="delivery-vehicle-note">

              <ShieldCheck
                size={18}
                strokeWidth={1.7}
              />

              <p>
                Vehicle details, including carrying
                capacity, will be verified during the
                admin approval process.
              </p>

            </div>

            {/* Error */}
            {error && (
              <div className="delivery-vehicle-error">

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
              className="delivery-vehicle-button"
            >
              Continue to Documents

              <ArrowRight
                size={18}
                strokeWidth={1.7}
              />
            </button>

          </form>

        </section>

        <p className="delivery-vehicle-footer">
          AGRICONNECT • DELIVERY PARTNER VERIFICATION
        </p>

      </main>

    </div>
  );
}

export default DeliveryVehicleDetails;