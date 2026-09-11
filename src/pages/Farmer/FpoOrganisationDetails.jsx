import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Building2,
  ArrowLeft,
  ArrowRight,
  MapPin,
  UserRound,
  Mail,
  Smartphone,
  FileText,
  AlertCircle,
  Navigation,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

import { auth, db } from "../../firebase";

import "./FpoOrganisationDetails.css";

// Prototype location data.
// Add/extend districts, mandals and villages as your project data grows.
const LOCATION_DATA = {
  Telangana: {
    districts: {
      "Hyderabad": {
        mandals: {
          "Amberpet": ["Amberpet"],
          "Khairatabad": ["Khairatabad"],
          "Secunderabad": ["Secunderabad"],
        },
      },
      "Rangareddy": {
        mandals: {
          "Shamshabad": ["Shamshabad", "Kothwalguda"],
          "Rajendranagar": ["Rajendranagar", "Budvel"],
        },
      },
      "Medchal-Malkajgiri": {
        mandals: {
          "Medchal": ["Medchal"],
          "Keesara": ["Keesara"],
        },
      },
      "Warangal": {
        mandals: {
          "Hanamkonda": ["Hanamkonda"],
          "Wardhannapet": ["Wardhannapet"],
        },
      },
      "Nalgonda": {
        mandals: {
          "Nalgonda": ["Nalgonda"],
          "Chityala": ["Chityala"],
        },
      },
    },
  },
  "Andhra Pradesh": {
    districts: {
      "Visakhapatnam": {
        mandals: {
          "Anandapuram": ["Anandapuram"],
          "Bheemunipatnam": ["Bheemunipatnam"],
        },
      },
      "Vijayawada": {
        mandals: {
          "Vijayawada Rural": ["Vijayawada Rural"],
          "Gannavaram": ["Gannavaram"],
        },
      },
      "Guntur": {
        mandals: {
          "Guntur": ["Guntur"],
          "Mangalagiri": ["Mangalagiri"],
        },
      },
    },
  },
  Karnataka: {
    districts: {
      "Bengaluru Urban": {
        mandals: {
          "Bengaluru North": ["Bengaluru North"],
          "Bengaluru South": ["Bengaluru South"],
        },
      },
      "Mysuru": {
        mandals: {
          "Mysuru": ["Mysuru"],
          "Nanjangud": ["Nanjangud"],
        },
      },
    },
  },
  "Tamil Nadu": {
    districts: {
      "Chennai": {
        mandals: {
          "Chennai": ["Chennai"],
        },
      },
      "Coimbatore": {
        mandals: {
          "Coimbatore": ["Coimbatore"],
          "Pollachi": ["Pollachi"],
        },
      },
    },
  },
  Maharashtra: {
    districts: {
      "Pune": {
        mandals: {
          "Haveli": ["Haveli"],
          "Mulshi": ["Mulshi"],
        },
      },
      "Nagpur": {
        mandals: {
          "Nagpur": ["Nagpur"],
        },
      },
    },
  },
};

const STATE_OPTIONS = Object.keys(LOCATION_DATA);

async function reverseGeocode(latitude, longitude) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      latitude
    )}&lon=${encodeURIComponent(longitude)}&addressdetails=1&zoom=18`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Unable to reverse geocode current location.");
  }

  return response.json();
}

function FpoOrganisationDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const incomingState = location.state || {};

  const {
    mobile = "",
    uid = "",
    applicationId = "",
    status = "",
    rejected = false,
    rejectionReason = "",
    isNewUser = true,
    organisation: previousOrganisation = null,
    gpsLocation: incomingGpsLocation = null,
  } = incomingState;

  const isRejected =
    rejected || status?.toLowerCase() === "rejected";

  const [formData, setFormData] = useState({
    fpoName: "",
    registrationNumber: "",
    fpoType: "",
    establishmentYear: "",
    address: "",
    state: "",
    district: "",
    mandal: "",
    village: "",
    pincode: "",
    email: "",
    authorizedPerson: "",
    designation: "",
    mobile: mobile || "",
  });

  const [gpsLocation, setGpsLocation] = useState(
    incomingGpsLocation || previousOrganisation?.gpsLocation || null
  );

  const [gpsStatus, setGpsStatus] = useState(
    incomingGpsLocation || previousOrganisation?.gpsLocation
      ? "Location saved"
      : "Location not captured"
  );

  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dropdowns use the local location dataset, but always keep the
  // GPS-detected value as an option even when that place is not yet
  // present in our prototype dataset.
  const districtOptions = useMemo(() => {
    const configuredDistricts = formData.state
      ? Object.keys(
          LOCATION_DATA[formData.state]?.districts || {}
        )
      : [];

    return Array.from(
      new Set(
        [
          ...configuredDistricts,
          formData.district,
        ].filter(Boolean)
      )
    );
  }, [formData.state, formData.district]);

  const mandalOptions = useMemo(() => {
    const configuredMandals =
      formData.state && formData.district
        ? Object.keys(
            LOCATION_DATA[formData.state]?.districts?.[
              formData.district
            ]?.mandals || {}
          )
        : [];

    return Array.from(
      new Set(
        [
          ...configuredMandals,
          formData.mandal,
        ].filter(Boolean)
      )
    );
  }, [formData.state, formData.district, formData.mandal]);

  const villageOptions = useMemo(() => {
    const configuredVillages =
      formData.state &&
      formData.district &&
      formData.mandal
        ? LOCATION_DATA[formData.state]?.districts?.[
            formData.district
          ]?.mandals?.[formData.mandal] || []
        : [];

    return Array.from(
      new Set(
        [
          ...configuredVillages,
          formData.village,
        ].filter(Boolean)
      )
    );
  }, [
    formData.state,
    formData.district,
    formData.mandal,
    formData.village,
  ]);

  // =========================================
  // LOAD PREVIOUS ORGANISATION DATA
  // =========================================

  useEffect(() => {
    const loadPreviousData = async () => {
      if (!isRejected) {
        if (mobile) {
          setFormData((prev) => ({
            ...prev,
            mobile,
          }));
        }
        return;
      }

      if (!applicationId) {
        setError("Unable to find your previous FPO application.");
        return;
      }

      try {
        setLoadingData(true);
        setError("");

        const applicationRef = doc(
          db,
          "fpoApplications",
          applicationId
        );

        const applicationSnap = await getDoc(applicationRef);

        if (!applicationSnap.exists()) {
          setError(
            "Your previous FPO application could not be found."
          );
          setLoadingData(false);
          return;
        }

        const data = applicationSnap.data();

        const organisation =
          data.organisation || previousOrganisation || {};

        const savedGps =
          organisation.gpsLocation ||
          data.gpsLocation ||
          incomingGpsLocation ||
          null;

        setFormData({
          fpoName: organisation.fpoName || "",
          registrationNumber:
            organisation.registrationNumber || "",
          fpoType: organisation.fpoType || "",
          establishmentYear:
            organisation.establishmentYear || "",
          address: organisation.address || "",
          state: organisation.state || "",
          district: organisation.district || "",
          mandal: organisation.mandal || "",
          village: organisation.village || "",
          pincode: organisation.pincode || "",
          email: organisation.email || "",
          authorizedPerson:
            organisation.authorizedPerson || "",
          designation: organisation.designation || "",
          mobile: organisation.mobile || mobile || "",
        });

        if (savedGps) {
          setGpsLocation(savedGps);
          setGpsStatus("Location saved");
        }

        setLoadingData(false);
      } catch (err) {
        console.error(
          "Error loading FPO application:",
          err
        );

        setLoadingData(false);
        setError(
          "Unable to load your previous application. Please try again."
        );
      }
    };

    loadPreviousData();
  }, [
    applicationId,
    isRejected,
    mobile,
    previousOrganisation,
    incomingGpsLocation,
  ]);

  // =========================================
  // GPS
  // =========================================

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("Location is not supported by this browser.");
      setError(
        "Current location is not supported on this device/browser."
      );
      return;
    }

    setLocationLoading(true);
    setGpsStatus("Getting your current location...");
    setError("");
    setSuccess("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(
          position.coords.latitude.toFixed(7)
        );
        const longitude = Number(
          position.coords.longitude.toFixed(7)
        );

        const nextLocation = {
          latitude,
          longitude,
          accuracy: position.coords.accuracy
            ? Number(position.coords.accuracy.toFixed(1))
            : null,
          capturedAt: new Date().toISOString(),
        };

        setGpsLocation(nextLocation);
        setGpsStatus("Location captured. Filling address...");

        try {
          // Reverse geocoding: coordinates -> readable address
          const data = await reverseGeocode(
            latitude,
            longitude
          );

          const address = data?.address || {};

          const detectedState =
            address.state ||
            address.state_district ||
            "";

          const detectedDistrict =
            address.state_district ||
            address.county ||
            address.district ||
            "";

          const detectedMandal =
            address.municipality ||
            address.city_district ||
            address.subdistrict ||
            address.taluk ||
            address.town ||
            "";

          const detectedVillage =
            address.village ||
            address.hamlet ||
            address.suburb ||
            address.town ||
            address.city ||
            "";

          const detectedPincode =
            address.postcode || "";

          const detectedAddress =
            data?.display_name ||
            [
              address.house_number,
              address.road,
              detectedVillage,
              detectedDistrict,
              detectedState,
              detectedPincode,
            ]
              .filter(Boolean)
              .join(", ");

          // Match detected values against our dropdown options.
          // If a value isn't present in the prototype list,
          // keep the field editable instead of forcing an incorrect option.
          const matchedState = STATE_OPTIONS.find(
            (state) =>
              state.toLowerCase() ===
              detectedState.toLowerCase()
          ) || "";

          const detectedDistricts = matchedState
            ? Object.keys(
                LOCATION_DATA[matchedState]?.districts || {}
              )
            : [];

          const matchedDistrict =
            detectedDistricts.find(
              (district) =>
                district.toLowerCase() ===
                detectedDistrict.toLowerCase()
            ) ||
            detectedDistrict ||
            "";

          const detectedMandals =
            matchedState && matchedDistrict
              ? Object.keys(
                  LOCATION_DATA[matchedState]?.districts?.[
                    matchedDistrict
                  ]?.mandals || {}
                )
              : [];

          const matchedMandal =
            detectedMandals.find(
              (mandal) =>
                mandal.toLowerCase() ===
                detectedMandal.toLowerCase()
            ) ||
            detectedMandal ||
            "";

          const detectedVillages =
            matchedState &&
            matchedDistrict &&
            matchedMandal
              ? LOCATION_DATA[matchedState]?.districts?.[
                  matchedDistrict
                ]?.mandals?.[matchedMandal] || []
              : [];

          const matchedVillage =
            detectedVillages.find(
              (village) =>
                village.toLowerCase() ===
                detectedVillage.toLowerCase()
            ) ||
            detectedVillage ||
            "";

          setFormData((prev) => ({
            ...prev,
            address: detectedAddress || prev.address,
            state: matchedState || prev.state,
            district: matchedDistrict || prev.district,
            mandal: matchedMandal || prev.mandal,
            village: matchedVillage || prev.village,
            pincode:
              /^\d{6}$/.test(detectedPincode)
                ? detectedPincode
                : prev.pincode,
          }));

          setGpsStatus(
            "Current location captured & address filled"
          );
          setSuccess(
            "Address details were automatically filled from your current location. Please verify them before continuing."
          );
        } catch (geocodeError) {
          console.error(
            "Reverse geocoding error:",
            geocodeError
          );

          setGpsStatus(
            "Location captured, but address could not be filled"
          );

          setError(
            "GPS location was captured, but the address could not be detected automatically. Please enter the address manually."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        console.error("GPS error:", err);

        let message =
          "Unable to get your current location. Please allow location permission and try again.";

        if (err.code === 1) {
          message =
            "Location permission was denied. Please allow location access and try again.";
        } else if (err.code === 2) {
          message =
            "Current location is unavailable. Please check GPS/location services.";
        } else if (err.code === 3) {
          message =
            "Location request timed out. Please try again.";
        }

        setGpsStatus("Location not captured");
        setError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // =========================================
  // INPUT
  // =========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "state") {
      setFormData((prev) => ({
        ...prev,
        state: value,
        district: "",
        mandal: "",
        village: "",
      }));
    } else if (name === "district") {
      setFormData((prev) => ({
        ...prev,
        district: value,
        mandal: "",
        village: "",
      }));
    } else if (name === "mandal") {
      setFormData((prev) => ({
        ...prev,
        mandal: value,
        village: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    setError("");
    setSuccess("");
  };

  // =========================================
  // MOBILE
  // =========================================

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    if (value.length <= 10) {
      setFormData((prev) => ({
        ...prev,
        mobile: value,
      }));

      setError("");
      setSuccess("");
    }
  };

  // =========================================
  // PINCODE
  // =========================================

  const handlePincodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    if (value.length <= 6) {
      setFormData((prev) => ({
        ...prev,
        pincode: value,
      }));

      setError("");
      setSuccess("");
    }
  };

  // =========================================
  // ESTABLISHMENT YEAR
  // =========================================

  const handleYearChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    if (value.length <= 4) {
      setFormData((prev) => ({
        ...prev,
        establishmentYear: value,
      }));

      setError("");
      setSuccess("");
    }
  };

  // =========================================
  // SUBMIT
  // =========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const requiredFields = [
      "fpoName",
      "registrationNumber",
      "fpoType",
      "establishmentYear",
      "address",
      "state",
      "district",
      "mandal",
      "village",
      "pincode",
      "email",
      "authorizedPerson",
      "designation",
      "mobile",
    ];

    const emptyField = requiredFields.some(
      (field) => !String(formData[field] || "").trim()
    );

    if (emptyField) {
      setError("Please complete all required fields.");
      return;
    }

    if (!gpsLocation?.latitude || !gpsLocation?.longitude) {
      setError(
        "Please use Current Location and capture the FPO location before continuing."
      );
      return;
    }

    const currentYear = new Date().getFullYear();
    const establishmentYear = Number(
      formData.establishmentYear
    );

    if (
      formData.establishmentYear.length !== 4 ||
      establishmentYear < 1900 ||
      establishmentYear > currentYear
    ) {
      setError(
        `Please enter a valid establishment year between 1900 and ${currentYear}.`
      );
      return;
    }

    if (formData.mobile.length !== 10) {
      setError(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (formData.pincode.length !== 6) {
      setError(
        "Please enter a valid 6-digit pincode."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      // -----------------------------------------
      // 1. Keep the organisation details in the
      //    browser so the registration flow is
      //    not lost while moving between steps.
      // -----------------------------------------

      const organisationData = {
        ...formData,
        gpsLocation,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
      };

      const draftKey = applicationId
        ? `agriconnect_fpo_registration_${applicationId}`
        : `agriconnect_fpo_registration_${formData.mobile}`;

      localStorage.setItem(
        draftKey,
        JSON.stringify({
          organisation: organisationData,
          uid: uid || auth.currentUser?.uid || "",
          mobile: formData.mobile,
          applicationId,
          savedAt: new Date().toISOString(),
        })
      );

      // -----------------------------------------
      // 2. Try to create a Firebase session.
      //    If Anonymous Auth is disabled, do not
      //    block the user from continuing.
      // -----------------------------------------

      let currentUser = auth.currentUser;
      let currentUid =
        uid || currentUser?.uid || "";

      if (!currentUser) {
        try {
          const credential =
            await signInAnonymously(auth);

          currentUser = credential.user;
          currentUid = currentUser.uid;
        } catch (authError) {
          console.warn(
            "Firebase anonymous session unavailable. Continuing with registration flow:",
            authError
          );
        }
      }

      // -----------------------------------------
      // 3. If Firebase auth is available and we
      //    already have an application ID, save
      //    the organisation details as a draft.
      // -----------------------------------------

      if (currentUser && applicationId) {
        try {
          const applicationRef = doc(
            db,
            "fpoApplications",
            applicationId
          );

          await setDoc(
            applicationRef,
            {
              uid: currentUid,
              mobile: formData.mobile,
              role: "fpo",
              organisation: organisationData,
              status: isRejected
                ? "rejected"
                : "draft",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (saveError) {
          // Do not stop the registration flow if
          // Firestore draft permission is unavailable.
          console.warn(
            "FPO draft could not be saved to Firestore:",
            saveError
          );
        }
      }

      console.log(
        "FPO Organisation details saved locally:",
        organisationData
      );

      setLoading(false);

      setSuccess(
        "Organisation details saved. Moving to member farmers..."
      );

      setTimeout(() => {
        navigate("/fpo/member-farmers", {
          state: {
            ...incomingState,

            organisation: organisationData,

            gpsLocation,

            uid: currentUid,
            mobile: formData.mobile,
            applicationId,
            status,
            rejected: isRejected,
            isNewUser: !isRejected,
            rejectionReason,
          },
        });
      }, 250);
    } catch (err) {
      console.error(
        "FPO organisation save error:",
        err
      );

      setLoading(false);

      setError(
        err.message ||
          "Unable to save the organisation details. Please try again."
      );
    }
  };

  // =========================================
  // BACK
  // =========================================

  const handleBack = () => {
    navigate("/login/farmer/fpo");
  };

  return (
    <div className="fpo-org-page">
      <div className="fpo-org-glow fpo-org-glow-one"></div>
      <div className="fpo-org-glow fpo-org-glow-two"></div>

      <main className="fpo-org-container">
        <button
          type="button"
          className="fpo-org-back"
          onClick={handleBack}
          aria-label="Back"
        >
          <ArrowLeft size={19} strokeWidth={1.8} />
        </button>

        <div className="fpo-org-header">
          <div className="fpo-org-logo">
            <Building2 size={28} strokeWidth={1.7} />
          </div>

          <p className="fpo-org-label">
            FPO / ORGANIZATION
          </p>

          <h1>
            Organisation <span>Details</span>
          </h1>

          <p className="fpo-org-subtitle">
            {isRejected
              ? "Update your FPO details and resubmit your application"
              : "Tell us about your Farmer Producer Organization"}
          </p>
        </div>

        {isRejected && (
          <div
            className="fpo-org-info"
            style={{ marginBottom: "18px" }}
          >
            <AlertCircle size={18} strokeWidth={1.7} />

            <p>
              <strong>
                Your previous application was rejected.
              </strong>

              {rejectionReason && (
                <>
                  <br />
                  Reason: {rejectionReason}
                </>
              )}

              <br />
              Please update the required details and
              continue with the resubmission process.
            </p>
          </div>
        )}

        <div className="fpo-org-progress">
          <div className="progress-step active">
            <span>1</span>
            <p>Organisation</p>
          </div>

          <div className="progress-line"></div>

          <div className="progress-step">
            <span>2</span>
            <p>Farmers</p>
          </div>

          <div className="progress-line"></div>

          <div className="progress-step">
            <span>3</span>
            <p>Documents</p>
          </div>
        </div>

        {loadingData ? (
          <section className="fpo-org-card">
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
              }}
            >
              <p>Loading your FPO details...</p>
            </div>
          </section>
        ) : (
          <section className="fpo-org-card">
            <form onSubmit={handleSubmit}>
              {/* Organisation Information */}
              <div className="form-section">
                <div className="form-section-title">
                  <Building2 size={18} />

                  <div>
                    <h2>Organisation Information</h2>
                    <p>Basic details about your FPO</p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field full-width">
                    <label>
                      FPO Name <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="fpoName"
                      placeholder="Enter official FPO name"
                      value={formData.fpoName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      Registration Number <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="registrationNumber"
                      placeholder="Enter registration number"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      FPO Type <span>*</span>
                    </label>

                    <select
                      name="fpoType"
                      value={formData.fpoType}
                      onChange={handleChange}
                    >
                      <option value="">
                        Select FPO type
                      </option>
                      <option value="Farmer Producer Company">
                        Farmer Producer Company
                      </option>
                      <option value="Farmer Producer Organisation">
                        Farmer Producer Organisation
                      </option>
                      <option value="Cooperative">
                        Cooperative
                      </option>
                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>
                      Year of Establishment <span>*</span>
                    </label>

                    <input
                      type="tel"
                      inputMode="numeric"
                      name="establishmentYear"
                      placeholder="e.g. 2020"
                      value={formData.establishmentYear}
                      onChange={handleYearChange}
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>

              {/* Registered Address */}
              <div className="form-section">
                <div className="form-section-title">
                  <MapPin size={18} />

                  <div>
                    <h2>Registered Address</h2>
                    <p>
                      Enter the official address and capture
                      the FPO location
                    </p>
                  </div>
                </div>

                {/* Current Location */}
                <div className="fpo-gps-card">
                  <div className="fpo-gps-icon">
                    <Navigation
                      size={19}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="fpo-gps-content">
                    <div>
                      <h3>Current Location</h3>

                      <p
                        className={
                          gpsLocation
                            ? "gps-success-text"
                            : ""
                        }
                      >
                        {gpsStatus}
                      </p>

                      {gpsLocation && (
                        <small>
                          {gpsLocation.latitude.toFixed(6)},{" "}
                          {gpsLocation.longitude.toFixed(6)}
                          {gpsLocation.accuracy
                            ? ` • ±${Math.round(
                                gpsLocation.accuracy
                              )}m`
                            : ""}
                        </small>
                      )}
                    </div>

                    <button
                      type="button"
                      className="fpo-gps-button"
                      onClick={captureCurrentLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <>
                          <RefreshCw
                            size={15}
                            className="gps-spin"
                          />
                          Getting...
                        </>
                      ) : gpsLocation ? (
                        <>
                          <RefreshCw size={15} />
                          Refresh
                        </>
                      ) : (
                        <>
                          <Navigation size={15} />
                          Use Current Location
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="fpo-gps-hint">
                  Your GPS location is used to automatically detect and
                  fill the registered address. Please verify the detected
                  details before continuing.
                </p>

                <div className="form-grid">
                  <div className="form-field full-width">
                    <label>
                      Registered Address <span>*</span>
                    </label>

                    <textarea
                      name="address"
                      placeholder="Enter complete registered address"
                      value={formData.address}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>

                  {/* State */}
                  <div className="form-field select-field">
                    <label>
                      State <span>*</span>
                    </label>

                    <div className="select-wrap">
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                      >
                        <option value="">
                          Select state
                        </option>

                        {STATE_OPTIONS.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={16}
                        className="select-arrow"
                      />
                    </div>
                  </div>

                  {/* District */}
                  <div className="form-field select-field">
                    <label>
                      District <span>*</span>
                    </label>

                    <div className="select-wrap">
                      <select
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        disabled={!formData.state}
                      >
                        <option value="">
                          {formData.state
                            ? "Select district"
                            : "Select state first"}
                        </option>

                        {districtOptions.map((district) => (
                          <option
                            key={district}
                            value={district}
                          >
                            {district}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={16}
                        className="select-arrow"
                      />
                    </div>
                  </div>

                  {/* Mandal */}
                  <div className="form-field select-field">
                    <label>
                      Mandal <span>*</span>
                    </label>

                    <div className="select-wrap">
                      <select
                        name="mandal"
                        value={formData.mandal}
                        onChange={handleChange}
                        disabled={!formData.district}
                      >
                        <option value="">
                          {formData.district
                            ? "Select mandal"
                            : "Select district first"}
                        </option>

                        {mandalOptions.map((mandal) => (
                          <option key={mandal} value={mandal}>
                            {mandal}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={16}
                        className="select-arrow"
                      />
                    </div>
                  </div>

                  {/* Village */}
                  <div className="form-field select-field">
                    <label>
                      Village <span>*</span>
                    </label>

                    <div className="select-wrap">
                      <select
                        name="village"
                        value={formData.village}
                        onChange={handleChange}
                        disabled={!formData.mandal}
                      >
                        <option value="">
                          {formData.mandal
                            ? "Select village"
                            : "Select mandal first"}
                        </option>

                        {villageOptions.map((village) => (
                          <option
                            key={village}
                            value={village}
                          >
                            {village}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={16}
                        className="select-arrow"
                      />
                    </div>
                  </div>

                  {/* Pincode */}
                  <div className="form-field">
                    <label>
                      Pincode <span>*</span>
                    </label>

                    <input
                      type="tel"
                      inputMode="numeric"
                      name="pincode"
                      placeholder="6-digit pincode"
                      value={formData.pincode}
                      onChange={handlePincodeChange}
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              {/* Authorized Person */}
              <div className="form-section">
                <div className="form-section-title">
                  <UserRound size={18} />

                  <div>
                    <h2>Authorized Person</h2>
                    <p>
                      Person responsible for this FPO account
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>
                      Authorized Person <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="authorizedPerson"
                      placeholder="Enter full name"
                      value={formData.authorizedPerson}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-field select-field">
                    <label>
                      Designation <span>*</span>
                    </label>

                    <div className="select-wrap">
                      <select
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                      >
                        <option value="">
                          Select designation
                        </option>
                        <option value="CEO">CEO</option>
                        <option value="Director">
                          Director
                        </option>
                        <option value="President">
                          President
                        </option>
                        <option value="Secretary">
                          Secretary
                        </option>
                        <option value="Authorized Representative">
                          Authorized Representative
                        </option>
                      </select>

                      <ChevronDown
                        size={16}
                        className="select-arrow"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="form-section">
                <div className="form-section-title">
                  <Mail size={18} />

                  <div>
                    <h2>Contact Details</h2>
                    <p>
                      Official FPO communication details
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>
                      Email <span>*</span>
                    </label>

                    <div className="input-with-icon">
                      <Mail
                        size={17}
                        strokeWidth={1.7}
                      />

                      <input
                        type="email"
                        name="email"
                        placeholder="Enter official email"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label>
                      Registered Mobile <span>*</span>
                    </label>

                    <div className="mobile-field">
                      <div className="mobile-code">+91</div>

                      <div className="mobile-divider"></div>

                      <Smartphone
                        size={17}
                        strokeWidth={1.7}
                      />

                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="10-digit mobile"
                        value={formData.mobile}
                        onChange={handleMobileChange}
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="fpo-org-info">
                <FileText
                  size={17}
                  strokeWidth={1.7}
                />

                <p>
                  You will add your member farmers and required
                  documents in the next steps. Your FPO will be
                  submitted for admin verification after
                  completing all steps.
                </p>
              </div>

              {error && (
                <div className="fpo-org-error">
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="fpo-org-info"
                  style={{ marginTop: "14px" }}
                >
                  <CheckCircle2 size={17} />
                  <p>{success}</p>
                </div>
              )}

              <button
                type="submit"
                className="fpo-org-next-button"
                disabled={loading || locationLoading}
              >
                <span>
                  {loading
                    ? "Saving..."
                    : isRejected
                    ? "Continue to Resubmit"
                    : "Continue to Farmers"}
                </span>

                {!loading && (
                  <ArrowRight
                    size={18}
                    strokeWidth={1.8}
                  />
                )}
              </button>
            </form>
          </section>
        )}

        <p className="fpo-org-footer">
          AgriConnect • FPO Verification
        </p>
      </main>
    </div>
  );
}

export default FpoOrganisationDetails;
