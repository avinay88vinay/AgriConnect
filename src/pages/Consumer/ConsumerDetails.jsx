import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  LoaderCircle,
  MapPin,
} from "lucide-react";

import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase";

import "./ConsumerDetails.css";

/* =========================================================
   STATES + DISTRICTS
========================================================= */

const INDIAN_STATES = {
  "Andhra Pradesh": [
    "Alluri Sitharama Raju",
    "Anakapalli",
    "Ananthapuramu",
    "Annamayya",
    "Bapatla",
    "Chittoor",
    "East Godavari",
    "Eluru",
    "Guntur",
    "Kakinada",
    "Krishna",
    "Kurnool",
    "Nandyal",
    "NTR",
    "Palnadu",
    "Prakasam",
    "Srikakulam",
    "Sri Potti Sriramulu Nellore",
    "Sri Sathya Sai",
    "Tirupati",
    "Visakhapatnam",
    "Vizianagaram",
    "West Godavari",
    "YSR Kadapa",
  ],

  Telangana: [
    "Adilabad",
    "Bhadradri Kothagudem",
    "Hanamkonda",
    "Hyderabad",
    "Jagtial",
    "Jangaon",
    "Jayashankar Bhupalpally",
    "Jogulamba Gadwal",
    "Kamareddy",
    "Karimnagar",
    "Khammam",
    "Mahabubabad",
    "Mahbubnagar",
    "Mancherial",
    "Medak",
    "Medchal-Malkajgiri",
    "Nagarkurnool",
    "Nalgonda",
    "Nirmal",
    "Nizamabad",
    "Peddapalli",
    "Rajanna Sircilla",
    "Rangareddy",
    "Sangareddy",
    "Siddipet",
    "Suryapet",
    "Vikarabad",
    "Wanaparthy",
    "Warangal",
    "Yadadri Bhuvanagiri",
  ],

  Karnataka: [
    "Bagalkot",
    "Ballari",
    "Belagavi",
    "Bengaluru Rural",
    "Bengaluru Urban",
    "Bidar",
    "Chamarajanagar",
    "Chikkaballapur",
    "Chikkamagaluru",
    "Chitradurga",
    "Dakshina Kannada",
    "Davanagere",
    "Dharwad",
    "Gadag",
    "Hassan",
    "Haveri",
    "Kalaburagi",
    "Kodagu",
    "Kolar",
    "Koppal",
    "Mandya",
    "Mysuru",
    "Raichur",
    "Ramanagara",
    "Shivamogga",
    "Tumakuru",
    "Udupi",
    "Uttara Kannada",
    "Vijayapura",
    "Yadgir",
  ],

  Maharashtra: [
    "Ahmednagar",
    "Akola",
    "Amravati",
    "Aurangabad",
    "Beed",
    "Bhandara",
    "Buldhana",
    "Chandrapur",
    "Dhule",
    "Gadchiroli",
    "Gondia",
    "Hingoli",
    "Jalgaon",
    "Jalna",
    "Kolhapur",
    "Latur",
    "Mumbai City",
    "Mumbai Suburban",
    "Nagpur",
    "Nanded",
    "Nashik",
    "Osmanabad",
    "Palghar",
    "Parbhani",
    "Pune",
    "Raigad",
    "Ratnagiri",
    "Sangli",
    "Satara",
    "Sindhudurg",
    "Solapur",
    "Thane",
    "Wardha",
    "Washim",
    "Yavatmal",
  ],

  "Tamil Nadu": [
    "Ariyalur",
    "Chengalpattu",
    "Chennai",
    "Coimbatore",
    "Cuddalore",
    "Dharmapuri",
    "Dindigul",
    "Erode",
    "Kallakurichi",
    "Kancheepuram",
    "Karur",
    "Krishnagiri",
    "Madurai",
    "Mayiladuthurai",
    "Nagapattinam",
    "Namakkal",
    "Nilgiris",
    "Perambalur",
    "Pudukkottai",
    "Salem",
    "Thanjavur",
    "Theni",
    "Thoothukudi",
    "Tiruchirappalli",
    "Tirunelveli",
    "Tiruppur",
    "Tiruvallur",
    "Tiruvannamalai",
    "Vellore",
    "Viluppuram",
    "Virudhunagar",
  ],

  Kerala: [
    "Alappuzha",
    "Ernakulam",
    "Idukki",
    "Kannur",
    "Kasaragod",
    "Kollam",
    "Kottayam",
    "Kozhikode",
    "Malappuram",
    "Palakkad",
    "Pathanamthitta",
    "Thiruvananthapuram",
    "Thrissur",
    "Wayanad",
  ],

  Odisha: [
    "Angul",
    "Balangir",
    "Balasore",
    "Bargarh",
    "Bhadrak",
    "Boudh",
    "Cuttack",
    "Dhenkanal",
    "Gajapati",
    "Ganjam",
    "Jagatsinghpur",
    "Jajpur",
    "Jharsuguda",
    "Kalahandi",
    "Kandhamal",
    "Kendrapara",
    "Koraput",
    "Mayurbhanj",
    "Nabarangpur",
    "Nayagarh",
    "Puri",
    "Rayagada",
    "Sambalpur",
    "Sundargarh",
  ],

  Gujarat: [
    "Ahmedabad",
    "Amreli",
    "Anand",
    "Bharuch",
    "Bhavnagar",
    "Gandhinagar",
    "Jamnagar",
    "Junagadh",
    "Kheda",
    "Kutch",
    "Mehsana",
    "Navsari",
    "Patan",
    "Rajkot",
    "Surat",
    "Vadodara",
    "Valsad",
  ],

  Rajasthan: [
    "Ajmer",
    "Alwar",
    "Banswara",
    "Baran",
    "Barmer",
    "Bharatpur",
    "Bhilwara",
    "Bikaner",
    "Bundi",
    "Chittorgarh",
    "Dausa",
    "Jaipur",
    "Jaisalmer",
    "Jalore",
    "Jhalawar",
    "Jhunjhunu",
    "Jodhpur",
    "Kota",
    "Nagaur",
    "Pali",
    "Sawai Madhopur",
    "Sikar",
    "Sirohi",
    "Tonk",
    "Udaipur",
  ],

  "Uttar Pradesh": [
    "Agra",
    "Aligarh",
    "Ayodhya",
    "Azamgarh",
    "Bareilly",
    "Bijnor",
    "Etawah",
    "Ghaziabad",
    "Gorakhpur",
    "Jhansi",
    "Kanpur Nagar",
    "Lucknow",
    "Mathura",
    "Meerut",
    "Moradabad",
    "Prayagraj",
    "Varanasi",
  ],

  Delhi: [
    "Central Delhi",
    "East Delhi",
    "New Delhi",
    "North Delhi",
    "North East Delhi",
    "North West Delhi",
    "South Delhi",
    "South East Delhi",
    "South West Delhi",
    "West Delhi",
  ],
};

const STATE_OPTIONS = Object.keys(INDIAN_STATES).sort();

/* =========================================================
   HELPERS
========================================================= */

const normalise = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/\bdistrict\b/g, "")
    .replace(/\bmandal\b/g, "")
    .replace(/\btaluk\b/g, "")
    .replace(/\btahsil\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const findBestMatch = (value, options) => {
  if (!value) return "";

  const normalized = normalise(value);

  const exact = options.find(
    (item) => normalise(item) === normalized
  );

  if (exact) return exact;

  return (
    options.find((item) => {
      const option = normalise(item);

      return (
        option.includes(normalized) ||
        normalized.includes(option)
      );
    }) || ""
  );
};

const findState = (data) => {
  const values = [
    data.principalSubdivision,
    data.state,
    data.state_district,
  ].filter(Boolean);

  for (const value of values) {
    const match = findBestMatch(value, STATE_OPTIONS);

    if (match) return match;
  }

  return "";
};

const findDistrict = (data, state) => {
  const options = INDIAN_STATES[state] || [];

  if (!options.length) {
    return data.district || data.county || "";
  }

  const values = [
    data.district,
    data.county,
    data.state_district,
  ].filter(Boolean);

  for (const value of values) {
    const match = findBestMatch(value, options);

    if (match) return match;
  }

  return "";
};

const buildAddress = (data) => {
  const parts = [
    data.locality,
    data.city,
    data.town,
    data.village,
    data.district,
    data.principalSubdivision,
    data.postcode,
  ];

  return [...new Set(parts.filter(Boolean))].join(", ");
};

/* =========================================================
   COMPONENT
========================================================= */

function ConsumerDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state || {};

  const mobile =
    routeState.mobile ||
    localStorage.getItem("consumer_mobile") ||
    "";

  const uid =
    routeState.uid ||
    auth.currentUser?.uid ||
    "";

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    dob: "",
    gender: "",
    address: "",
    state: "",
    district: "",
    mandal: "",
    village: "",
    pincode: "",
  });

  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const districts = useMemo(() => {
    return INDIAN_STATES[formData.state] || [];
  }, [formData.state]);

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleStateChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      state: event.target.value,
      district: "",
    }));

    setError("");
    setSuccess("");
  };

  /* =======================================================
     CURRENT LOCATION
  ======================================================= */

  const useCurrentLocation = () => {
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setError(
        "Location is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const gpsLocation = {
            latitude,
            longitude,
          };

          setCurrentLocation(gpsLocation);

          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );

          if (!response.ok) {
            throw new Error("Address lookup failed.");
          }

          const data = await response.json();

          const detectedState = findState(data);

          const detectedDistrict = findDistrict(
            data,
            detectedState
          );

          const detectedMandal =
            data.city_district ||
            data.locality ||
            data.city ||
            data.town ||
            "";

          const detectedVillage =
            data.village ||
            data.suburb ||
            data.locality ||
            data.city ||
            data.town ||
            "";

          setFormData((previous) => ({
            ...previous,

            state:
              detectedState || previous.state,

            district:
              detectedDistrict || previous.district,

            mandal:
              detectedMandal || previous.mandal,

            village:
              detectedVillage || previous.village,

            pincode:
              data.postcode || previous.pincode,

            address:
              buildAddress(data) ||
              previous.address,
          }));

          setSuccess(
            "Current location detected. Please verify the address before saving."
          );
        } catch (geocodeError) {
          console.error(
            "Consumer reverse geocoding error:",
            geocodeError
          );

          setSuccess(
            "GPS location captured. Please complete the address manually."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (locationError) => {
        setLocationLoading(false);

        if (locationError.code === 1) {
          setError(
            "Location permission was denied. Please allow location access."
          );
        } else if (locationError.code === 2) {
          setError(
            "Your location could not be determined."
          );
        } else if (locationError.code === 3) {
          setError(
            "Location request timed out. Please try again."
          );
        } else {
          setError(
            "Unable to access your current location."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!formData.email.trim()) {
      return "Please enter your email address.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      return "Please enter a valid email address.";
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

    if (!formData.state) {
      return "Please select your state.";
    }

    if (!formData.district) {
      return "Please select your district.";
    }

    if (!formData.mandal.trim()) {
      return "Please enter your mandal.";
    }

    if (!formData.village.trim()) {
      return "Please enter your village or city.";
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      return "Please enter a valid 6-digit pincode.";
    }

    return "";
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const currentUid =
      uid || auth.currentUser?.uid;

    if (!currentUid) {
      setError(
        "Your login session has expired. Please login again."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const profileData = {
        uid: currentUid,
        mobile,

        ...formData,

        location: currentLocation || null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(
          db,
          "consumerProfiles",
          currentUid
        ),
        profileData,
        { merge: true }
      );

      await setDoc(
        doc(
          db,
          "consumerLoginIndex",
          mobile
        ),
        {
          mobile,
          uid: currentUid,
          profileId: currentUid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      localStorage.setItem(
        "consumer_mobile",
        mobile
      );

      localStorage.setItem(
        "consumer_profile_id",
        currentUid
      );

      navigate("/consumer/dashboard", {
        state: {
          uid: currentUid,
          mobile,
          profileId: currentUid,
          newUser: true,
        },
      });
    } catch (submitError) {
      console.error(
        "Consumer details error:",
        submitError
      );

      setError(
        "Unable to save your details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="consumer-details-page">

      <div className="consumer-details-glow consumer-details-glow-one" />
      <div className="consumer-details-glow consumer-details-glow-two" />

      <main className="consumer-details-container">

        <button
          type="button"
          className="consumer-details-back"
          onClick={() =>
            navigate("/login/consumer")
          }
        >
          <ArrowLeft size={22} />
        </button>

        <header className="consumer-details-header">

          <div className="consumer-details-logo">
            <MapPin size={30} />
          </div>

          <p className="consumer-details-label">
            CONSUMER
          </p>

          <h1>Personal Details</h1>

          <p>
            Complete your profile to continue
            with AgriConnect.
          </p>

        </header>

        <section className="consumer-details-card">

          <form onSubmit={handleSubmit}>

            {/* NAME */}

            <div className="consumer-details-field full-width">
              <label>Full Name</label>

              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>

            {/* EMAIL */}

            <div className="consumer-details-field full-width">
              <label>Email Address</label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
              />
            </div>

            {/* MOBILE */}

            <div className="consumer-details-field full-width">
              <label>Mobile Number</label>

              <div className="consumer-details-mobile">
                <span>+91</span>

                <input
                  value={mobile}
                  readOnly
                />

                <CheckCircle2 size={18} />
              </div>
            </div>

            {/* DOB + GENDER */}

            <div className="consumer-details-row">

              <div className="consumer-details-field">
                <label>Date of Birth</label>

                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                />
              </div>

              <div className="consumer-details-field">
                <label>Gender</label>

                <select
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

            {/* LOCATION */}

            <div className="consumer-location-card">

              <div className="consumer-location-icon">
                <Crosshair size={20} />
              </div>

              <div className="consumer-location-content">

                <strong>
                  Use my current location
                </strong>

                <p>
                  Automatically detect your State,
                  District, Mandal, Village, Pincode
                  and address.
                </p>

                {currentLocation && (
                  <span>
                    <CheckCircle2 size={14} />
                    Location captured
                  </span>
                )}

              </div>

              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="consumer-location-spin"
                    />
                    Detecting...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Use Current Location
                  </>
                )}
              </button>

            </div>

            {currentLocation && (
              <div className="consumer-coordinates-card">

                <MapPin size={16} />

                <div>
                  <strong>
                    GPS coordinates saved
                  </strong>

                  <span>
                    {currentLocation.latitude.toFixed(6)}
                    {" , "}
                    {currentLocation.longitude.toFixed(6)}
                  </span>
                </div>

              </div>
            )}

            {/* ADDRESS */}

            <div className="consumer-details-field full-width">
              <label>Address</label>

              <textarea
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                placeholder="House number, street, landmark"
              />
            </div>

            {/* STATE */}

            <div className="consumer-details-row">

              <div className="consumer-details-field">
                <label>State</label>

                <div className="consumer-select-wrapper">

                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleStateChange}
                  >
                    <option value="">
                      Select state
                    </option>

                    {STATE_OPTIONS.map((state) => (
                      <option
                        key={state}
                        value={state}
                      >
                        {state}
                      </option>
                    ))}

                  </select>

                  <ChevronDown size={16} />

                </div>
              </div>

              {/* DISTRICT */}

              <div className="consumer-details-field">
                <label>District</label>

                <div className="consumer-select-wrapper">

                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!formData.state}
                  >
                    <option value="">
                      Select district
                    </option>

                    {districts.map((district) => (
                      <option
                        key={district}
                        value={district}
                      >
                        {district}
                      </option>
                    ))}

                  </select>

                  <ChevronDown size={16} />

                </div>
              </div>

            </div>

            {/* MANDAL + VILLAGE */}

            <div className="consumer-details-row">

              <div className="consumer-details-field">
                <label>Mandal / Taluk</label>

                <input
                  name="mandal"
                  value={formData.mandal}
                  onChange={handleChange}
                  placeholder="Enter mandal"
                />
              </div>

              <div className="consumer-details-field">
                <label>Village / City</label>

                <input
                  name="village"
                  value={formData.village}
                  onChange={handleChange}
                  placeholder="Enter village or city"
                />
              </div>

            </div>

            {/* PINCODE */}

            <div className="consumer-details-field full-width">
              <label>Pincode</label>

              <input
                name="pincode"
                inputMode="numeric"
                maxLength={6}
                value={formData.pincode}
                onChange={(event) => {
                  const value =
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                  setFormData((previous) => ({
                    ...previous,
                    pincode: value,
                  }));

                  setError("");
                }}
                placeholder="Enter 6-digit pincode"
              />
            </div>

            {error && (
              <div className="consumer-details-error">
                {error}
              </div>
            )}

            {success && (
              <div className="consumer-details-success">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="consumer-details-submit"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : "Continue"}

              {!loading && (
                <CheckCircle2 size={20} />
              )}
            </button>

            <div className="consumer-details-note">
              Your delivery location will be securely
              stored and reused during checkout.
            </div>

          </form>

        </section>

        <p className="consumer-details-footer">
          AGRICONNECT • FROM FARM TO YOUR HOME
        </p>

      </main>
    </div>
  );
}

export default ConsumerDetails;