import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Edit3,
  Eye,
  Home,
  IndianRupee,
  Leaf,
  LogOut,
  Mail,
  MapPin,
  Mic,
  Package,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  Star,
  Truck,
  BrainCircuit,
  RefreshCw,
  ShoppingBag,
  Sprout,
  TrendingUp,
  User,
  Warehouse,
  Wheat,
  X,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { signOut } from "firebase/auth";

import { auth, db } from "../../firebase";
import ProduceIcon from "../../components/ProduceIcon";

import "./IndividualFarmerDashboard.css";


/* =========================================================
   CONSTANTS
========================================================= */

const PRODUCT_CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Grains",
  "Pulses",
  "Leafy Greens",
  "Spices",
  "Other",
];

const PRODUCT_UNITS = [
  "kg",
  "quintal",
  "ton",
  "piece",
  "dozen",
];

// Standard produce catalog for Individual Farmers.
const PRODUCE_CATALOG = [
  { name: "Tomato", category: "Vegetables", aliases: ["tomato", "tomatoes", "టమాటా", "టమాటాలు", "టమాట"] },
  { name: "Potato", category: "Vegetables", aliases: ["potato", "potatoes", "ఆలుగడ్డ", "ఆలుగడ్డలు"] },
  { name: "Onion", category: "Vegetables", aliases: ["onion", "onions", "ఉల్లిపాయ", "ఉల్లిపాయలు"] },
  { name: "Carrot", category: "Vegetables", aliases: ["carrot", "carrots", "క్యారెట్", "క్యారెట్లు"] },
  { name: "Brinjal", category: "Vegetables", aliases: ["brinjal", "eggplant", "వంకాయ", "వంకాయలు"] },
  { name: "Cabbage", category: "Vegetables", aliases: ["cabbage", "క్యాబేజీ"] },
  { name: "Cauliflower", category: "Vegetables", aliases: ["cauliflower", "కాలీఫ్లవర్"] },
  { name: "Spinach", category: "Leafy Greens", aliases: ["spinach", "పాలకూర"] },
  { name: "Lady Finger", category: "Vegetables", aliases: ["lady finger", "okra", "బెండకాయ", "బెండకాయలు"] },
  { name: "Cucumber", category: "Vegetables", aliases: ["cucumber", "కీరదోస", "దోసకాయ"] },
  { name: "Green Chilli", category: "Vegetables", aliases: ["green chilli", "green chili", "పచ్చిమిర్చి"] },
  { name: "Capsicum", category: "Vegetables", aliases: ["capsicum", "bell pepper", "క్యాప్సికమ్"] },
  { name: "Bottle Gourd", category: "Vegetables", aliases: ["bottle gourd", "sorakaya", "సొరకాయ"] },
  { name: "Bitter Gourd", category: "Vegetables", aliases: ["bitter gourd", "kakarakaya", "కాకరకాయ"] },
  { name: "Ridge Gourd", category: "Vegetables", aliases: ["ridge gourd", "beerakaya", "బీరకాయ"] },
  { name: "Pumpkin", category: "Vegetables", aliases: ["pumpkin", "గుమ్మడికాయ"] },
  { name: "Radish", category: "Vegetables", aliases: ["radish", "ముల్లంగి"] },
  { name: "Beetroot", category: "Vegetables", aliases: ["beetroot", "beet", "బీట్‌రూట్"] },
  { name: "Peas", category: "Vegetables", aliases: ["peas", "pea", "బఠాణీ"] },
  { name: "Beans", category: "Vegetables", aliases: ["beans", "bean", "చిక్కుడు"] },
  { name: "Apple", category: "Fruits", aliases: ["apple", "apples", "ఆపిల్", "ఆపిల్స్"] },
  { name: "Banana", category: "Fruits", aliases: ["banana", "bananas", "అరటి", "అరటిపండ్లు"] },
  { name: "Mango", category: "Fruits", aliases: ["mango", "mangoes", "మామిడి", "మామిడిపండ్లు"] },
  { name: "Orange", category: "Fruits", aliases: ["orange", "oranges", "నారింజ"] },
  { name: "Papaya", category: "Fruits", aliases: ["papaya", "బొప్పాయి"] },
  { name: "Guava", category: "Fruits", aliases: ["guava", "జామ", "జామపండు"] },
  { name: "Pomegranate", category: "Fruits", aliases: ["pomegranate", "దానిమ్మ"] },
  { name: "Grapes", category: "Fruits", aliases: ["grapes", "grape", "ద్రాక్ష"] },
  { name: "Watermelon", category: "Fruits", aliases: ["watermelon", "పుచ్చకాయ"] },
  { name: "Muskmelon", category: "Fruits", aliases: ["muskmelon", "ఖర్బూజ"] },
  { name: "Pineapple", category: "Fruits", aliases: ["pineapple", "అనాస"] },
  { name: "Lemon", category: "Fruits", aliases: ["lemon", "lemons", "నిమ్మ", "నిమ్మకాయ"] },
  { name: "Sweet Lime", category: "Fruits", aliases: ["sweet lime", "mosambi", "బత్తాయి"] },
  { name: "Rice", category: "Grains", aliases: ["rice", "బియ్యం", "వరి"] },
  { name: "Wheat", category: "Grains", aliases: ["wheat", "గోధుమ"] },
  { name: "Maize", category: "Grains", aliases: ["maize", "corn", "మొక్కజొన్న"] },
  { name: "Chickpeas", category: "Pulses", aliases: ["chickpeas", "chickpea", "సెనగలు"] },
  { name: "Red Gram", category: "Pulses", aliases: ["red gram", "toor dal", "కందులు"] },
  { name: "Turmeric", category: "Spices", aliases: ["turmeric", "పసుపు"] },
  { name: "Ginger", category: "Spices", aliases: ["ginger", "అల్లం"] },
  { name: "Garlic", category: "Spices", aliases: ["garlic", "వెల్లుల్లి"] },
];

const VOICE_UNIT_ALIASES = [
  { key: "quintal", aliases: ["quintal", "quintals", "క్వింటాల్", "క్వింటాళ్లు", "క్వింటాళ్ల"] },
  { key: "ton", aliases: ["ton", "tons", "tonne", "tonnes", "టన్ను", "టన్నులు"] },
  { key: "kg", aliases: ["kg", "kgs", "kilogram", "kilograms", "kilo", "kilos", "కిలో", "కిలోలు", "కిలోగ్రామ్"] },
  { key: "piece", aliases: ["piece", "pieces", "పీస్", "పీసులు"] },
  { key: "dozen", aliases: ["dozen", "డజన్"] },
];

const normalizeVoiceText = (value = "") =>
  String(value).toLowerCase().replace(/[,.!?;:]/g, " ").replace(/\s+/g, " ").trim();

const findVoiceProduct = (text = "") => {
  const normalized = normalizeVoiceText(text);
  return PRODUCE_CATALOG
    .slice()
    .sort((a, b) => Math.max(...b.aliases.map((x) => x.length)) - Math.max(...a.aliases.map((x) => x.length)))
    .find((item) => item.aliases.some((alias) => normalized.includes(normalizeVoiceText(alias)))) || null;
};

const findVoiceUnit = (text = "") => {
  const normalized = normalizeVoiceText(text);
  return VOICE_UNIT_ALIASES.find((item) => item.aliases.some((alias) => normalized.includes(normalizeVoiceText(alias))))?.key || null;
};

const parseVoiceProduce = (transcript = "") => {
  const text = normalizeVoiceText(transcript);
  const product = findVoiceProduct(text);
  const unit = findVoiceUnit(text);
  const quantityMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|kilos?|quintals?|quintal|tons?|tonnes?|pieces?|piece|dozen|కిలో(?:లు)?|క్వింటా(?:ల్|ళ్లు|ళ్ల)|టన్ను(?:లు)?|పీసులు?)/i);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : "";

  let price = null;
  const pricePatterns = [
    /(?:₹|rs\.?|rupees?|రూపాయలు?|రూపాయలకు?)\s*(\d+(?:\.\d+)?)/i,
    /(?:kg|kilo|కిలో|per kg|కిలోకు|కిలోకి)\s*(?:₹|rs\.?|rupees?|రూపాయలు?)?\s*(\d+(?:\.\d+)?)/i,
  ];
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) { price = Number(match[1]); break; }
  }

  return {
    productName: product?.name || "",
    category: product?.category || "",
    quantity,
    unit: unit || "kg",
    price: price ?? "",
  };
};

const EMPTY_PRODUCT = {
  name: "",
  category: "",
  price: "",
  quantity: "",
  unit: "kg",
  description: "",
};


/* =========================================================
   HELPERS
========================================================= */

const getProfileId = (state) =>
  state?.profileId ||
  localStorage.getItem("farmer_profile_id") ||
  "";

const getMobile = (state) =>
  state?.mobile ||
  localStorage.getItem("farmer_mobile") ||
  "";

const capitalizeWords = (value = "") =>
  String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

const displayName = (value = "") =>
  value ? capitalizeWords(value) : "Registered Farmer";

const displayValue = (
  value,
  fallback = "Not provided"
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value);
};

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN")}`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return "Recently";

  try {
    let date;

    if (typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (Number.isNaN(date.getTime())) {
      return "Recently";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
};



const getOrderStatus = (order = {}) =>
  String(
    order.farmerStatus ||
    order.status ||
    order.orderStatus ||
    "pending"
  ).toLowerCase();

const formatOrderStatus = (status = "pending") => {
  const labels = {
    pending: "Pending",
    new: "New",
    confirmed: "Confirmed",
    accepted: "Accepted",
    preparing: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    assigned: "Partner Assigned",
    picked_up: "Picked Up",
    pickedup: "Picked Up",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[String(status).toLowerCase()] || capitalizeWords(status);
};

const getConsumerName = (order = {}) =>
  order.consumerName ||
  order.customerName ||
  order.consumer?.fullName ||
  order.customer?.fullName ||
  order.consumer?.name ||
  order.customer?.name ||
  "Consumer";

const getOrderItems = (order = {}) =>
  Array.isArray(order.items) ? order.items : [];

const getOrderItemSummary = (order = {}) => {
  const items = getOrderItems(order);
  if (!items.length) return "Produce order";
  const first = items[0];
  const label = first.name || first.productName || "Produce";
  return items.length > 1
    ? `${label} + ${items.length - 1} more`
    : label;
};

const getOrderFarmerTotal = (order = {}) =>
  getOrderItems(order).reduce(
    (sum, item) =>
      sum +
      Number(
        item.farmerAmount ??
        item.totalPrice ??
        item.subtotal ??
        Number(item.price || 0) * Number(item.quantity || 0)
      ),
    0
  );

const formatAddressValue = (address) => {
  if (!address) return "Address not provided";

  if (typeof address === "string" || typeof address === "number") {
    return String(address);
  }

  if (typeof address !== "object") {
    return "Address not provided";
  }

  // Consumer address can be stored as a Firestore map/object.
  // Never render the object directly in JSX.
  return [
    address.address,
    address.village,
    address.mandal,
    address.district,
    address.state,
    address.pincode,
  ]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map((value) => String(value))
    .join(", ") || "Address not provided";
};

const getOrderAddress = (order = {}) =>
  formatAddressValue(
    order.deliveryAddress ||
    order.address ||
    order.consumerAddress ||
    order.shippingAddress ||
    order.consumer?.address ||
    order.customer?.address
  );

const getPartnerName = (partner = {}) =>
  partner.fullName ||
  partner.name ||
  partner.displayName ||
  "Delivery Partner";

const getPartnerRating = (partner = {}) => {
  const rating = Number(partner.rating ?? partner.averageRating ?? 0);
  return rating > 0 ? rating.toFixed(1) : "New";
};

const getPartnerVehicle = (partner = {}) =>
  partner.vehicleType ||
  partner.vehicle ||
  partner.vehicleNumber ||
  "Delivery Vehicle";

const getCoordinates = (value) => {
  if (!value) return null;
  const latitude = Number(value.latitude ?? value.lat);
  const longitude = Number(value.longitude ?? value.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const haversineKm = (a, b) => {
  const p1 = getCoordinates(a);
  const p2 = getCoordinates(b);
  if (!p1 || !p2) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(p2.latitude - p1.latitude);
  const dLon = toRad(p2.longitude - p1.longitude);
  const lat1 = toRad(p1.latitude);
  const lat2 = toRad(p2.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const quantityToKg = (quantity, unit) => {
  const value = Number(quantity || 0);
  const normalized = String(unit || "kg").toLowerCase();
  if (!Number.isFinite(value)) return 0;
  if (normalized === "g" || normalized === "gram" || normalized === "grams") return value / 1000;
  if (normalized === "quintal" || normalized === "quintals") return value * 100;
  if (normalized === "ton" || normalized === "tons" || normalized === "tonne" || normalized === "tonnes") return value * 1000;
  return normalized === "kg" || normalized === "kgs" || normalized === "kilogram" || normalized === "kilograms" ? value : 0;
};

const getOrderWeightKg = (order = {}) =>
  getOrderItems(order).reduce(
    (sum, item) => sum + quantityToKg(item.quantity, item.unit),
    0
  );

const getOrderQuantity = (order = {}) =>
  getOrderItems(order).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const getPartnerCapacityKg = (partner = {}) => {
  const explicit = Number(
    partner.availableCapacityKg ??
    partner.capacityKg ??
    partner.vehicleCapacityKg ??
    partner.capacity ??
    0
  );
  if (explicit > 0) return explicit;

  const type = String(partner.vehicleType || partner.vehicle || "").toLowerCase();
  const defaults = [
    ["truck", 5000], ["pickup", 1000], ["van", 500],
    ["car", 200], ["auto", 100], ["bike", 15], ["scooter", 15],
  ];
  return defaults.find(([key]) => type.includes(key))?.[1] || 50;
};

const getPartnerCurrentLoadKg = (partner = {}) =>
  Number(partner.currentLoadKg ?? partner.currentLoad ?? partner.loadKg ?? 0) || 0;

const getPartnerAvailableCapacityKg = (partner = {}) =>
  Math.max(getPartnerCapacityKg(partner) - getPartnerCurrentLoadKg(partner), 0);

const isPartnerOnline = (partner = {}) => {
  const status = String(partner.status || partner.availability || "").toLowerCase();
  if (partner.isOnline === true || partner.online === true) return true;
  return ["online", "available", "active", "ready"].includes(status);
};

const getFarmCoordinates = (profile = {}) =>
  getCoordinates(
    profile.location ||
    profile.currentLocation ||
    profile.farmLocation
  ) || getCoordinates({
    latitude: profile.latitude,
    longitude: profile.longitude,
  });

const getConsumerCoordinates = (order = {}) =>
  getCoordinates(order.deliveryLocation || order.consumer?.location || order.customer?.location);

const getPickupAddress = (profile = {}) =>
  profile.address ||
  profile.personalDetails?.address ||
  [
    profile.personalDetails?.village || profile.village,
    profile.personalDetails?.mandal || profile.mandal,
    profile.personalDetails?.district || profile.district,
    profile.personalDetails?.state || profile.state,
    profile.personalDetails?.pincode || profile.pincode,
  ].filter(Boolean).join(", ") ||
  "Farm pickup location";

const getDeliveryAddress = (order = {}) =>
  order.deliveryAddress ||
  order.address ||
  order.consumerAddress ||
  order.shippingAddress ||
  order.consumer?.address ||
  order.customer?.address ||
  "Consumer delivery address";


/* =========================================================
   COMPONENT
========================================================= */

function IndividualFarmerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state || {};

  const mobile = getMobile(routeState);
  const routeProfileId = getProfileId(routeState);

  /* =======================================================
     STATE
  ======================================================= */

  const [profileId, setProfileId] = useState(routeProfileId);
  const [farmerProfile, setFarmerProfile] = useState(null);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [farmerOrderRecords, setFarmerOrderRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const [error, setError] = useState("");

  const [showProfileMenu, setShowProfileMenu] =
    useState(false);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showProductModal, setShowProductModal] =
    useState(false);

  const [showProfileModal, setShowProfileModal] =
    useState(false);

  const [showSettingsModal, setShowSettingsModal] =
    useState(false);

  const [showOverviewModal, setShowOverviewModal] =
    useState(false);

  const [overviewType, setOverviewType] = useState("");

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [productForm, setProductForm] =
    useState(EMPTY_PRODUCT);

  const [settingsForm, setSettingsForm] =
    useState({});

  const [savingSettings, setSavingSettings] =
    useState(false);

  const [savingProduct, setSavingProduct] =
    useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("te-IN");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [showVoiceReview, setShowVoiceReview] = useState(false);
  const recognitionRef = useState(() => ({ current: null }))[0];
  const voiceTranscriptRef = useState(() => ({ current: "" }))[0];

  const [productSearch, setProductSearch] =
    useState("");

  const [productCategory, setProductCategory] =
    useState("All");

  const [showProduceDropdown, setShowProduceDropdown] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState("home");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryRequests, setDeliveryRequests] = useState([]);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModal, setOrderModal] = useState(null);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);
  const [aiPriceHint, setAiPriceHint] = useState(null);



  /* =======================================================
     VOICE INPUT
  ======================================================= */

  useEffect(() => {
    voiceTranscriptRef.current = voiceTranscript;
  }, [voiceTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = voiceLanguage;

    recognition.onstart = () => { setIsListening(true); setError(""); };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceTranscript(transcript);
      const parsed = parseVoiceProduce(transcript);
      setProductForm((previous) => ({
        ...previous,
        ...(parsed.productName ? { name: parsed.productName } : {}),
        ...(parsed.category ? { category: parsed.category } : {}),
        ...(parsed.quantity !== "" ? { quantity: parsed.quantity } : {}),
        ...(parsed.unit ? { unit: parsed.unit } : {}),
        ...(parsed.price !== "" ? { price: parsed.price } : {}),
      }));
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone permission is required for voice input.");
      } else if (event.error === "no-speech") {
        setError("No speech detected. Please try again.");
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      if (voiceTranscriptRef.current.trim()) {
        setShowVoiceReview(true);
      }
    };
    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [voiceLanguage]);

  const startVoiceInput = () => {
    if (!voiceSupported) {
      setError("Voice input is not supported in this browser. Please use a supported browser such as Chrome.");
      return;
    }
    setError("");
    setVoiceTranscript("");
    try { recognitionRef.current?.start(); } catch (recognitionError) {
      if (recognitionError?.name !== "InvalidStateError") setError("Unable to start voice input. Please try again.");
    }
  };

  const stopVoiceInput = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  };

  /* =======================================================
     SAVE LOCAL IDENTITY
  ======================================================= */

  useEffect(() => {
    if (mobile) {
      localStorage.setItem(
        "farmer_mobile",
        mobile
      );
    }

    if (routeProfileId) {
      localStorage.setItem(
        "farmer_profile_id",
        routeProfileId
      );

      setProfileId(routeProfileId);
    }
  }, [mobile, routeProfileId]);


  /* =======================================================
     LOAD FARMER PROFILE
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!mobile && !routeProfileId) {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);

        const resolvedProfileId =
          routeProfileId ||
          `farmer_${mobile}`;

        const profileRef = doc(
          db,
          "farmerProfiles",
          resolvedProfileId
        );

        const profileSnapshot =
          await getDoc(profileRef);

        if (profileSnapshot.exists()) {
          const data =
            profileSnapshot.data();

          if (!cancelled) {
            setFarmerProfile(data);
            setProfileId(resolvedProfileId);

            localStorage.setItem(
              "farmer_profile_id",
              resolvedProfileId
            );
          }

          setProfileLoading(false);
          return;
        }

        const applicationId =
          routeState.applicationId ||
          localStorage.getItem(
            "farmer_application_id"
          );

        if (applicationId) {
          const applicationSnapshot =
            await getDoc(
              doc(
                db,
                "farmerApplications",
                applicationId
              )
            );

          if (applicationSnapshot.exists()) {
            const data =
              applicationSnapshot.data();

            const finalProfileId =
              data.profileId ||
              resolvedProfileId;

            if (!cancelled) {
              setFarmerProfile({
                ...data,
                profileId: finalProfileId,
                mobile:
                  data.mobile || mobile,
              });

              setProfileId(finalProfileId);
            }
          }
        }
      } catch (firebaseError) {
        console.error(
          "Farmer profile error:",
          firebaseError
        );

        if (!cancelled) {
          setError(
            "Unable to load your registered details."
          );
        }
      }

      if (!cancelled) {
        setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [
    mobile,
    routeProfileId,
    routeState.applicationId,
  ]);


  /* =======================================================
     PRODUCTS LISTENER
  ======================================================= */

  useEffect(() => {
    if (!profileId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const productsQuery = query(
      collection(db, "products"),
      where("farmerId", "==", profileId)
    );

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        data.sort((a, b) => {
          const aTime =
            a.createdAt?.seconds || 0;

          const bTime =
            b.createdAt?.seconds || 0;

          return bTime - aTime;
        });

        setProducts(data);
        setLoading(false);
      },
      (firebaseError) => {
        console.error(
          "Products listener error:",
          firebaseError
        );

        setError(
          "Unable to load your produce."
        );

        setProducts([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profileId]);


  /* =======================================================
     FARMER ORDERS LISTENER

     IMPORTANT:
     The farmer dashboard uses farmerOrders as the authoritative
     seller-side order collection. The parent orders collection is
     owned by the consumer and is intentionally not used here.
  ======================================================= */

  useEffect(() => {
    if (!profileId) {
      setFarmerOrderRecords([]);
      setOrders([]);
      return;
    }

    const farmerOrdersQuery = query(
      collection(db, "farmerOrders"),
      where("farmerId", "==", profileId)
    );

    const unsubscribe = onSnapshot(
      farmerOrdersQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });

        setFarmerOrderRecords(data);
        setOrders(data);
      },
      (firebaseError) => {
        console.error(
          "Farmer orders listener error:",
          firebaseError
        );

        setFarmerOrderRecords([]);
        setOrders([]);
        setError(
          "Unable to load your orders. Please check your Firebase Firestore rules."
        );
      }
    );

    return () => unsubscribe();
  }, [profileId]);

  /* =======================================================
     DELIVERY PARTNERS
     Platform matching reads live partner availability,
     GPS and vehicle capacity. Farmers never select a partner.
  ======================================================= */

  useEffect(() => {
    setDeliveryLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, "deliveryAgents"),
      (snapshot) => {
        const data = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((partner) => {
            const status = String(
              partner.status || partner.availability || ""
            ).toLowerCase();
            return !["blocked", "inactive"].includes(status);
          });

        setDeliveryPartners(data);
        setDeliveryLoading(false);
      },
      (firebaseError) => {
        console.warn("Delivery partners listener:", firebaseError.message);
        setDeliveryPartners([]);
        setDeliveryLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =======================================================
     LIVE DELIVERY REQUESTS
     Used only to show platform-managed delivery progress.
  ======================================================= */

  useEffect(() => {
    if (!profileId) {
      setDeliveryRequests([]);
      return;
    }

    const requestsQuery = query(
      collection(db, "deliveryRequests"),
      where("farmerId", "==", profileId)
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });
        setDeliveryRequests(data);
      },
      (firebaseError) => {
        console.warn("Delivery requests listener:", firebaseError.message);
        setDeliveryRequests([]);
      }
    );

    return () => unsubscribe();
  }, [profileId]);

  /* =======================================================
     LIVE FARMER NOTIFICATIONS
     Supports:
       farmerNotifications/{docId}
     with farmerId + title/message/type/read.
  ======================================================= */

  useEffect(() => {
    if (!profileId) {
      setLiveNotifications([]);
      return;
    }

    setNotificationsLoading(true);

    const notificationsQuery = query(
      collection(db, "farmerNotifications"),
      where("farmerId", "==", profileId)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          })
          .slice(0, 10);

        setLiveNotifications(data);
        setNotificationsLoading(false);
      },
      (firebaseError) => {
        console.warn(
          "Farmer notifications listener:",
          firebaseError.message
        );
        setLiveNotifications([]);
        setNotificationsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profileId]);

  /* =======================================================
     PLATFORM-MANAGED DELIVERY MATCHING
  ======================================================= */

  const createDeliveryRequest = async (order) => {
    if (!order?.id || !profileId) {
      throw new Error("Order or farmer profile could not be identified.");
    }

    const requestId = `${profileId}_${order.id}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const requestRef = doc(db, "deliveryRequests", requestId);

    const existingSnapshot = await getDoc(requestRef);
    if (existingSnapshot.exists()) {
      const existing = existingSnapshot.data();
      if (
        ["open", "request_open", "assigned", "picked_up", "in_transit"].includes(
          String(existing.requestStatus || existing.status || "").toLowerCase()
        )
      ) {
        return existing;
      }
    }

    const pickupLocation = getFarmCoordinates(farmerProfile);
    const consumerLocation = getConsumerCoordinates(order);
    const totalWeightKg = getOrderWeightKg(order);
    const totalQuantity = getOrderQuantity(order);
    const serviceRadiusKm = Number(
      farmerProfile?.deliveryServiceRadiusKm ??
      farmerProfile?.settings?.deliveryServiceRadiusKm ??
      10
    );

    const eligible = deliveryPartners
      .map((partner) => {
        const partnerLocation = getCoordinates(
          partner.currentLocation ||
          partner.location ||
          partner.gpsLocation
        );
        const distanceKm = pickupLocation && partnerLocation
          ? haversineKm(pickupLocation, partnerLocation)
          : null;
        const capacityKg = getPartnerAvailableCapacityKg(partner);
        const online = isPartnerOnline(partner);
        const withinRadius =
          distanceKm !== null ? distanceKm <= serviceRadiusKm : false;
        const capacityOk =
          totalWeightKg > 0 ? capacityKg >= totalWeightKg : capacityKg > 0;

        return {
          partner,
          distanceKm,
          capacityKg,
          eligible: online && withinRadius && capacityOk,
        };
      })
      .filter((item) => item.eligible)
      .sort(
        (a, b) =>
          (a.distanceKm ?? Number.MAX_SAFE_INTEGER) -
          (b.distanceKm ?? Number.MAX_SAFE_INTEGER)
      );

    const eligiblePartnerIds = eligible.map((item) => item.partner.id);
    const now = serverTimestamp();

    const requestData = {
      orderId: order.id,
      parentOrderId: order.id,
      sellerOrderId: order.sellerOrderId || order.farmerOrderId || "",
      sellerOrderCollection: "farmerOrders",
      sellerType: "individual",
      sellerId: profileId,
      farmerId: profileId,
      farmerName,
      farmerMobile,
      pickupLocation: pickupLocation || null,
      pickupAddress: getPickupAddress(farmerProfile),
      consumerId: order.consumerId || order.customerId || order.consumer?.id || order.customer?.id || "",
      consumerName: getConsumerName(order),
      consumerMobile: order.consumerMobile || order.customerMobile || order.consumer?.mobile || order.customer?.mobile || "",
      deliveryLocation: consumerLocation || null,
      deliveryAddress: getDeliveryAddress(order),
      deliveryOtp: order.deliveryOtp || order.consumerDeliveryOtp || order.consumer?.deliveryOtp || "",
      items: getOrderItems(order),
      totalQuantity,
      totalWeightKg,
      orderAmount: Number(order.farmerAmount || order.totalAmount || getOrderFarmerTotal(order) || 0),
      status: "open",
      requestStatus: "open",
      deliveryStatus: "request_open",
      matching: {
        requiredWeightKg: totalWeightKg,
        requiredQuantity: totalQuantity,
        serviceRadiusKm,
        matchingVersion: 1,
        matchingMode: "platform",
        eligibleCount: eligiblePartnerIds.length,
        calculatedAt: now,
        noEligibleReason:
          eligiblePartnerIds.length === 0
            ? "No online partner with GPS and sufficient capacity is currently eligible."
            : "",
      },
      eligiblePartnerIds,
      notifiedPartnerIds: [],
      deliveryAgentId: null,
      assignedDeliveryAgentId: null,
      deliveryAgentName: "",
      deliveryAgentMobile: "",
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(requestRef, requestData, { merge: false });

    if (eligiblePartnerIds.length) {
      await Promise.all(
        eligible.map(({ partner, distanceKm, capacityKg }) =>
          addDoc(collection(db, "deliveryNotifications"), {
            deliveryAgentId: partner.id,
            deliveryRequestId: requestRef.id,
            orderId: order.id,
            farmerId: profileId,
            farmerName,
            pickupAddress: requestData.pickupAddress,
            deliveryAddress: requestData.deliveryAddress,
            consumerName: requestData.consumerName,
            totalWeightKg,
            totalQuantity,
            availableCapacityKg: capacityKg,
            pickupDistanceKm: distanceKm,
            status: "new",
            read: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        )
      );

      await updateDoc(requestRef, {
        notifiedPartnerIds: eligiblePartnerIds,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      ...requestData,
      id: requestRef.id,
      notifiedPartnerIds: eligiblePartnerIds,
    };
  };

  const getDeliveryRequestForOrder = (order) =>
    deliveryRequests.find(
      (request) =>
        String(request.orderId || request.parentOrderId) === String(order?.id)
    );

  const openOrderDetails = (order) => {

    setOrderModal(order);
    setShowOrderModal(true);
    setError("");
  };

  const closeOrderDetails = () => {
    setShowOrderModal(false);
    setOrderModal(null);
  };

  const updateFarmerOrderStatus = async (nextStatus) => {
    if (!orderModal?.id) return;

    const allowedTransitions = {
      pending: ["accepted"],
      new: ["accepted"],
      confirmed: ["accepted"],
      accepted: ["preparing"],
      preparing: ["ready_for_pickup"],
    };

    const current = getOrderStatus(orderModal);
    if (!allowedTransitions[current]?.includes(nextStatus)) {
      setError(
        `You cannot move this order from ${formatOrderStatus(current)} to ${formatOrderStatus(nextStatus)}.`
      );
      return;
    }

    setUpdatingOrderStatus(true);
    setError("");

    try {
      const update = {
        farmerStatus: nextStatus,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      };

      // Seller-side order is the farmer's authoritative order record.
      const farmerOrdersQuery = query(
        collection(db, "farmerOrders"),
        where("orderId", "==", orderModal.id),
        where("farmerId", "==", profileId)
      );

      const snapshot = await new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(
          farmerOrdersQuery,
          (value) => {
            unsubscribe();
            resolve(value);
          },
          (err) => {
            unsubscribe();
            reject(err);
          }
        );
      });

      await Promise.all(
        snapshot.docs.map((item) =>
          updateDoc(doc(db, "farmerOrders", item.id), update)
        )
      );

      // Parent order update may be restricted by Firestore ownership rules.
      // Do not block the delivery request if that update is denied.
      try {
        await updateDoc(doc(db, "orders", orderModal.id), update);
      } catch (parentOrderError) {
        console.warn(
          "Parent order status sync skipped:",
          parentOrderError.message
        );
      }

      if (nextStatus === "ready_for_pickup") {
        await createDeliveryRequest({
          ...orderModal,
          ...update,
          id: orderModal.id,
        });
      }

      setOrderModal((previous) =>
        previous ? { ...previous, ...update } : previous
      );
    } catch (statusError) {
      console.error("Order status update error:", statusError);
      setError(statusError.message || "Unable to update order status.");
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  /* =======================================================
     PROFILE DATA
  ======================================================= */

  const personal =
    farmerProfile?.personalDetails || {};

  const farm =
    farmerProfile?.farmDetails || {};

  const farmerName = displayName(
    personal.fullName ||
      farmerProfile?.fullName ||
      "Registered Farmer"
  );

  const farmerMobile =
    personal.mobile ||
    farmerProfile?.mobile ||
    mobile;

  const farmerEmail =
    personal.email ||
    farmerProfile?.email ||
    "";

  const farmerDob =
    personal.dob ||
    farmerProfile?.dob ||
    "";

  const farmerGender =
    personal.gender ||
    farmerProfile?.gender ||
    "";

  const farmerState =
    personal.state ||
    farmerProfile?.state ||
    "";

  const farmerDistrict =
    personal.district ||
    farmerProfile?.district ||
    "";

  const farmerMandal =
    personal.mandal ||
    farmerProfile?.mandal ||
    "";

  const farmerVillage =
    personal.village ||
    farmerProfile?.village ||
    "";

  const farmerPincode =
    personal.pincode ||
    farmerProfile?.pincode ||
    "";

  const farmerAddress =
    personal.address ||
    farmerProfile?.address ||
    "";

  const farmName =
    farm.farmName ||
    farmerProfile?.farmName ||
    "Not provided";

  const farmType =
    farm.farmType ||
    farmerProfile?.farmType ||
    "Not provided";

  const landArea =
    farm.landArea ||
    farmerProfile?.landArea ||
    "";

  const landUnit =
    farm.landUnit ||
    farmerProfile?.landUnit ||
    "acres";

  const crops =
    farm.crops ||
    farmerProfile?.crops ||
    "Not provided";

  const irrigation =
    farm.irrigation ||
    farmerProfile?.irrigation ||
    "Not provided";


  const locationText =
    [
      farmerVillage,
      farmerMandal,
      farmerDistrict,
      farmerState,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Location not provided";


  /* =======================================================
     SETTINGS FORM
  ======================================================= */

  useEffect(() => {
    setSettingsForm({
      fullName: farmerName,
      email: farmerEmail,
      dob: farmerDob,
      gender: farmerGender,

      address: farmerAddress,
      state: farmerState,
      district: farmerDistrict,
      mandal: farmerMandal,
      village: farmerVillage,
      pincode: farmerPincode,

      farmName,
      farmType,
      landArea,
      landUnit,
      crops,
      irrigation,
      latitude: farmerProfile?.location?.latitude ?? farmerProfile?.location?.lat ?? "",
      longitude: farmerProfile?.location?.longitude ?? farmerProfile?.location?.lng ?? "",
      minimumOrderValue:
        farmerProfile?.minimumOrderValue ??
        farmerProfile?.settings?.minimumOrderValue ??
        0,
    });
  }, [
    farmerName,
    farmerEmail,
    farmerDob,
    farmerGender,
    farmerAddress,
    farmerState,
    farmerDistrict,
    farmerMandal,
    farmerVillage,
    farmerPincode,
    farmName,
    farmType,
    landArea,
    landUnit,
    crops,
    irrigation,
  ]);


  /* =======================================================
     FILTERED PRODUCTS
  ======================================================= */

  const filteredProducts =
    useMemo(() => {
      const search =
        productSearch
          .toLowerCase()
          .trim();

      return products.filter(
        (product) => {
          const matchesSearch =
            !search ||
            String(
              product.name || ""
            )
              .toLowerCase()
              .includes(search);

          const matchesCategory =
            productCategory === "All" ||
            product.category ===
              productCategory;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      products,
      productSearch,
      productCategory,
    ]);


  /* =======================================================
     MERGED ORDER VIEW
     Parent order data + farmer-side workflow status.
  ======================================================= */

  const effectiveOrders = useMemo(() => {
    return farmerOrderRecords
      .map((record) => ({
        ...record,
        id: record.parentOrderId || record.orderId || record.id,
        farmerOrderId: record.id,
        parentOrderId: record.parentOrderId || record.orderId || record.id,
      }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }, [farmerOrderRecords]);

  /* =======================================================
     DASHBOARD STATS
  ======================================================= */

  const activeProducts =
    products.filter(
      (product) =>
        product.status === "active" &&
        Number(product.quantity || 0) > 0
    );

  const availableStock =
    products.reduce(
      (total, product) =>
        total +
        Number(product.quantity || 0),
      0
    );

  const newOrders =
    effectiveOrders.filter(
      (order) =>
        order.status === "pending" ||
        order.status === "new"
    );

  const completedOrders =
    effectiveOrders.filter(
      (order) =>
        order.status === "completed" ||
        order.status === "delivered"
    );

  const earnings =
    completedOrders.reduce(
      (total, order) =>
        total +
        Number(
          order.farmerAmount ||
          order.totalAmount ||
          0
        ),
      0
    );

  const lowStockProducts =
    products.filter(
      (product) => {
        const quantity =
          Number(product.quantity || 0);

        return quantity > 0 && quantity <= 5;
      }
    );


  /* =======================================================
     AI DEMAND FORECAST
     Prototype version:
     - Uses recent order movement when available.
     - Uses a small local default-demand dataset when there
       is not enough order history.
     - Designed so a live market/AI API can replace the
       defaults later without changing the UI.
  ======================================================= */

  const DEFAULT_DEMAND = {
    tomato: 85,
    onion: 70,
    potato: 65,
    carrot: 50,
    brinjal: 45,
    eggplant: 45,
    cabbage: 40,
    cauliflower: 42,
    spinach: 35,
    okra: 48,
    cucumber: 55,
    "green chilli": 38,
    chilli: 38,
    capsicum: 32,
    pumpkin: 30,
    apple: 45,
    banana: 75,
    mango: 60,
    orange: 50,
    rice: 90,
    wheat: 80,
    maize: 55,
    ragi: 40,
    turmeric: 30,
    ginger: 36,
    garlic: 44,
  };

  const demandForecast = useMemo(() => {
    const now = Date.now();
    const windowMs = 30 * 24 * 60 * 60 * 1000;

    return products
      .map((product) => {
        let sold30 = 0;

        effectiveOrders.forEach((order) => {
          const created = order.createdAt?.toDate
            ? order.createdAt.toDate().getTime()
            : order.createdAt?.seconds
            ? order.createdAt.seconds * 1000
            : new Date(order.createdAt || 0).getTime();

          if (!created || now - created > windowMs) return;

          (order.items || []).forEach((item) => {
            const sameProduct =
              String(item.productId || item.id || "") === String(product.id) ||
              (String(item.name || "").toLowerCase() === String(product.name || "").toLowerCase() &&
                String(item.farmerId || profileId) === String(profileId));

            if (sameProduct) sold30 += Number(item.quantity || 0);
          });
        });

        const productKey = String(product.name || "").toLowerCase().trim();
        const defaultWeeklyDemand = Number(DEFAULT_DEMAND[productKey] || 30);
        const weeklyForecast = sold30 > 0
          ? Math.max(Math.ceil((sold30 / 30) * 7), 1)
          : defaultWeeklyDemand;

        const current = Number(product.quantity || 0);
        const suggested = Math.max(weeklyForecast - current, 0);

        let demand = "Low";
        if (weeklyForecast >= Math.max(current, 1)) demand = "High";
        else if (weeklyForecast >= Math.max(current * 0.5, 1)) demand = "Medium";

        return {
          ...product,
          sold30,
          weeklyForecast,
          suggested,
          demand,
          isPrototypeDemand: sold30 === 0,
        };
      })
      .sort((a, b) => b.weeklyForecast - a.weeklyForecast);
  }, [products, effectiveOrders, profileId]);

  const forecastHighCount = demandForecast.filter((item) => item.demand === "High").length;


  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const notifications =
    useMemo(() => {
      const list = [];

      liveNotifications.forEach((notification) => {
        list.push({
          id: `live-${notification.id}`,
          title: notification.title || "Farmer notification",
          message: notification.message || "You have a new update.",
          type: notification.type || "info",
        });
      });

      newOrders.forEach((order) => {
        list.push({
          id: `order-${order.id}`,
          title: "New consumer order",
          message: `Order #${String(order.id).slice(0, 8)} is waiting for your action.`,
          type: "info",
        });
      });

      if (activeProducts.length === 0) {
        list.push({
          id: "no-products",
          title: "Add your first produce",
          message:
            "List your fresh produce so consumers can discover it.",
          type: "info",
        });
      }

      products.forEach((product) => {
        const quantity = Number(product.quantity || 0);

        if (quantity > 0 && quantity <= 5) {
          list.push({
            id: `low-${product.id}`,
            title: "Low stock alert",
            message:
              `${product.name} has only ${quantity} ${product.unit || "kg"} remaining.`,
            type: "warning",
          });
        }

        if (quantity === 0) {
          list.push({
            id: `out-${product.id}`,
            title: "Out of stock",
            message:
              `${product.name} is currently unavailable.`,
            type: "warning",
          });
        }
      });

      if (farmerProfile?.status === "approved") {
        list.push({
          id: "account-active",
          title: "Farmer account active",
          message:
            "Your AgriConnect farmer profile is verified.",
          type: "success",
        });
      }

      return list.slice(0, 10);
    }, [
      liveNotifications,
      newOrders,
      activeProducts.length,
      products,
      farmerProfile?.status,
    ]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const scrollToSection =
    (section) => {
      setActiveSection(section);
      setSidebarOpen(false);

      const element =
        document.getElementById(
          `farmer-${section}`
        );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    };


  /* =======================================================
     OVERVIEW
  ======================================================= */

  const overviewData = {
    products: {
      title: "Active Products",
      subtitle:
        "Produce currently available to consumers",
      icon: Package,
      action: "Manage My Produce",
      section: "produce",
    },

    stock: {
      title: "Available Stock",
      subtitle:
        "Current stock across your produce",
      icon: Warehouse,
      action: "View My Produce",
      section: "produce",
    },

    orders: {
      title: "New Orders",
      subtitle:
        "Orders waiting for your action",
      icon: ShoppingBag,
      action: "View Orders",
      section: "orders",
    },

    earnings: {
      title: "Earnings",
      subtitle:
        "Your completed order earnings",
      icon: TrendingUp,
      action: "View Earnings",
      section: "earnings",
    },
  };

  const openOverview =
    (type) => {
      setOverviewType(type);
      setShowOverviewModal(true);
    };

  const closeOverview = () => {
    setShowOverviewModal(false);
    setOverviewType("");
  };

  const goFromOverview =
    (section) => {
      closeOverview();

      setTimeout(() => {
        scrollToSection(section);
      }, 100);
    };


  /* =======================================================
     PROFILE / SETTINGS
  ======================================================= */

  const openProfile = () => {
    setShowProfileMenu(false);
    setShowNotifications(false);
    setShowProfileModal(true);
  };

  const openSettings = () => {
    setShowProfileMenu(false);
    setShowNotifications(false);
    setShowSettingsModal(true);
  };


  /* =======================================================
     SETTINGS CHANGE
  ======================================================= */

  const handleSettingsChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setSettingsForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );

      setError("");
    };



  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location services are not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettingsForm((previous) => ({
          ...previous,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setError("");
      },
      (locationError) => {
        setError(
          locationError.code === 1
            ? "Location permission was denied."
            : "Unable to get your current location."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  const saveSettings =
    async (event) => {
      event.preventDefault();

      if (!profileId) {
        setError(
          "Farmer profile could not be identified."
        );
        return;
      }

      if (
        !settingsForm.fullName?.trim()
      ) {
        setError(
          "Please enter your full name."
        );
        return;
      }

      if (
        !settingsForm.pincode ||
        !/^\d{6}$/.test(
          settingsForm.pincode
        )
      ) {
        setError(
          "Please enter a valid 6-digit pincode."
        );
        return;
      }

      if (
        !settingsForm.farmName?.trim()
      ) {
        setError(
          "Please enter your farm name."
        );
        return;
      }

      setSavingSettings(true);
      setError("");

      try {
        const updatedPersonal = {
          ...personal,

          fullName:
            settingsForm.fullName.trim(),

          email:
            settingsForm.email?.trim() || "",

          dob:
            settingsForm.dob || "",

          gender:
            settingsForm.gender || "",

          mobile:
            farmerMobile,

          address:
            settingsForm.address?.trim() || "",

          state:
            settingsForm.state || "",

          district:
            settingsForm.district || "",

          mandal:
            settingsForm.mandal?.trim() || "",

          village:
            settingsForm.village?.trim() || "",

          pincode:
            settingsForm.pincode.trim(),
        };

        const updatedFarm = {
          ...farm,

          farmName:
            settingsForm.farmName.trim(),

          farmType:
            settingsForm.farmType || "",

          landArea:
            Number(
              settingsForm.landArea || 0
            ),

          landUnit:
            settingsForm.landUnit ||
            "acres",

          crops:
            settingsForm.crops?.trim() || "",

          irrigation:
            settingsForm.irrigation || "",
        };

        const updateData = {
          personalDetails:
            updatedPersonal,

          farmDetails:
            updatedFarm,

          fullName:
            updatedPersonal.fullName,

          email:
            updatedPersonal.email,

          state:
            updatedPersonal.state,

          district:
            updatedPersonal.district,

          mandal:
            updatedPersonal.mandal,

          village:
            updatedPersonal.village,

          pincode:
            updatedPersonal.pincode,

          farmName:
            updatedFarm.farmName,

          farmType:
            updatedFarm.farmType,

          landArea:
            updatedFarm.landArea,

          landUnit:
            updatedFarm.landUnit,

          crops:
            updatedFarm.crops,

          irrigation:
            updatedFarm.irrigation,

          minimumOrderValue:
            Number(settingsForm.minimumOrderValue || 0),

          settings: {
            ...(farmerProfile?.settings || {}),
            minimumOrderValue:
              Number(settingsForm.minimumOrderValue || 0),
          },

          updatedAt:
            serverTimestamp(),
        };

        await setDoc(
          doc(db, "farmerProfiles", profileId),
          updateData,
          { merge: true }
        );

        const applicationId =
          routeState.applicationId ||
          localStorage.getItem(
            "farmer_application_id"
          );

        if (applicationId) {
          try {
            await updateDoc(
              doc(
                db,
                "farmerApplications",
                applicationId
              ),
              updateData
            );
          } catch (applicationError) {
            console.warn(
              "Application sync skipped:",
              applicationError.message
            );
          }
        }

        setFarmerProfile(
          (previous) => ({
            ...previous,
            ...updateData,
          })
        );

        setShowSettingsModal(false);

      } catch (firebaseError) {
        console.error(
          "Settings update error:",
          firebaseError
        );

        setError(
          firebaseError.message ||
          "Unable to save your settings."
        );
      }

      setSavingSettings(false);
    };


  /* =======================================================
     PRODUCT MODAL
  ======================================================= */

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      ...EMPTY_PRODUCT,
    });
    setError("");
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";
    setShowVoiceReview(false);
    setShowProduceDropdown(false);
    setAiPriceHint(null);
    setShowProductModal(true);
  };

  const openEditProduct =
    (product) => {
      setEditingProduct(product);

      setProductForm({
        name: product.name || "",
        category:
          product.category || "",
        price:
          product.price ?? "",
        quantity:
          product.quantity ?? "",
        unit:
          product.unit || "kg",
        description:
          product.description || "",
      });

      setError("");
      setVoiceTranscript("");
      voiceTranscriptRef.current = "";
      setShowVoiceReview(false);
      setAiPriceHint(null);
      setShowProductModal(true);
    };

  const handleProductChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setProductForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );

      setError("");
    };



  const getAIPriceRecommendation = () => {
    const name = String(productForm.name || "").trim().toLowerCase();
    const sameProducts = products.filter(
      (item) => String(item.name || "").trim().toLowerCase() === name
    );
    const prices = sameProducts
      .map((item) => Number(item.price))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (prices.length) {
      const average = prices.reduce((a, b) => a + b, 0) / prices.length;
      return {
        price: Math.round(average * 0.95 * 100) / 100,
        source: "your recent AgriConnect listing data",
      };
    }

    const catalogHints = {
      tomato: 35,
      potato: 30,
      onion: 32,
      carrot: 45,
      brinjal: 38,
      cabbage: 28,
      cauliflower: 45,
      spinach: 25,
      "green chilli": 70,
      mango: 80,
      banana: 45,
      rice: 55,
      wheat: 40,
      maize: 30,
      turmeric: 120,
      ginger: 100,
      garlic: 130,
    };

    const key = Object.keys(catalogHints).find((item) => name.includes(item));
    return key
      ? {
          price: catalogHints[key],
          source: "prototype market baseline",
        }
      : null;
  };

  const applyAIPriceRecommendation = () => {
    const recommendation = getAIPriceRecommendation();
    if (!recommendation) {
      setError("AI price recommendation is not available for this produce yet.");
      return;
    }
    setAiPriceHint(recommendation);
    setProductForm((previous) => ({
      ...previous,
      price: recommendation.price,
    }));
  };

  /* =======================================================
     SAVE PRODUCT
  ======================================================= */

  const saveProduct =
    async (event) => {
      event.preventDefault();

      setError("");

      if (!profileId) {
        setError(
          "Farmer profile could not be identified."
        );
        return;
      }

      if (
        !productForm.name.trim()
      ) {
        setError(
          "Please enter the produce name."
        );
        return;
      }

      if (!productForm.category) {
        setError(
          "Please select a category."
        );
        return;
      }

      if (
        productForm.price === "" ||
        Number(productForm.price) < 0
      ) {
        setError(
          "Please enter a valid price."
        );
        return;
      }

      if (
        productForm.quantity === "" ||
        Number(productForm.quantity) < 0
      ) {
        setError(
          "Please enter a valid quantity."
        );
        return;
      }

      setSavingProduct(true);

      try {
        const quantity =
          Number(productForm.quantity);

        const cleanName =
          productForm.name.trim();

        const productData = {
          sellerId:
            profileId,

          sellerType:
            "individual",

          farmerId:
            profileId,

          farmerName:
            farmerName,

          farmerMobile:
            farmerMobile,

          name:
            cleanName,

          category:
            productForm.category,

          price:
            Number(productForm.price),

          quantity,

          unit:
            productForm.unit,

          description:
            productForm.description.trim(),

          iconKey:
            cleanName.toLowerCase(),

          iconCategory:
            productForm.category,

          status:
            quantity > 0
              ? "active"
              : "inactive",

          updatedAt:
            serverTimestamp(),
        };

        if (editingProduct) {
          await updateDoc(
            doc(db, "products", editingProduct.id),
            productData
          );
        } else {
          const duplicate = products.find(
            (item) =>
              String(item.farmerId) === String(profileId) &&
              String(item.name || "").trim().toLowerCase() === cleanName.toLowerCase() &&
              String(item.unit || "kg").toLowerCase() === String(productForm.unit || "kg").toLowerCase()
          );

          if (duplicate) {
            const mergedQuantity =
              Number(duplicate.quantity || 0) + quantity;

            await updateDoc(
              doc(db, "products", duplicate.id),
              {
                ...productData,
                quantity: mergedQuantity,
                status: mergedQuantity > 0 ? "active" : "inactive",
                createdAt: duplicate.createdAt || serverTimestamp(),
              }
            );
          } else {
            await addDoc(
              collection(db, "products"),
              {
                ...productData,
                createdAt: serverTimestamp(),
              }
            );
          }
        }

        setShowVoiceReview(false);
        setShowProductModal(false);
        setEditingProduct(null);
        setProductForm({
          ...EMPTY_PRODUCT,
        });
        setVoiceTranscript("");
        voiceTranscriptRef.current = "";

      } catch (firebaseError) {
        console.error(
          "Save product error:",
          firebaseError
        );

        setError(
          firebaseError.message ||
          "Unable to save your produce."
        );
      }

      setSavingProduct(false);
    };


  /* =======================================================
     STOCK
  ======================================================= */

  const updateStock =
    async (
      product,
      amount
    ) => {
      const current =
        Number(product.quantity || 0);

      const newQuantity =
        Math.max(
          0,
          current + amount
        );

      try {
        await updateDoc(
          doc(
            db,
            "products",
            product.id
          ),
          {
            quantity:
              newQuantity,

            status:
              newQuantity > 0
                ? "active"
                : "inactive",

            updatedAt:
              serverTimestamp(),
          }
        );
      } catch (firebaseError) {
        console.error(
          firebaseError
        );

        setError(
          "Unable to update stock."
        );
      }
    };


  /* =======================================================
     TOGGLE PRODUCT
  ======================================================= */

  const toggleProduct =
    async (product) => {
      try {
        const newStatus =
          product.status ===
          "active"
            ? "inactive"
            : "active";

        await updateDoc(
          doc(
            db,
            "products",
            product.id
          ),
          {
            status:
              newStatus,

            updatedAt:
              serverTimestamp(),
          }
        );
      } catch (firebaseError) {
        console.error(
          firebaseError
        );

        setError(
          "Unable to update product status."
        );
      }
    };


  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout =
    async () => {
      try {
        await signOut(auth);

        localStorage.removeItem(
          "farmer_mobile"
        );

        localStorage.removeItem(
          "farmer_profile_id"
        );

        localStorage.removeItem(
          "farmer_application_id"
        );

        navigate(
          "/login/farmer/individual"
        );
      } catch (logoutError) {
        console.error(
          logoutError
        );
      }
    };


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    profileLoading &&
    !farmerProfile
  ) {
    return (
      <div className="farmer-dashboard-loading">
        <div className="dashboard-loading-mark">
          <Leaf size={25} />
        </div>

        <h2>AgriConnect</h2>

        <p>
          Loading your farmer dashboard...
        </p>
      </div>
    );
  }


  /* =======================================================
     OVERVIEW CONTENT
  ======================================================= */

  const renderOverviewDetails =
    () => {
      if (overviewType === "products") {
        return (
          <>
            <div className="overview-detail-summary">
              <div className="overview-summary-icon">
                <Package size={21} />
              </div>

              <div>
                <span>
                  Active Products
                </span>

                <strong>
                  {activeProducts.length}
                </strong>

                <p>
                  Products currently visible
                  to consumers.
                </p>
              </div>
            </div>

            <div className="overview-mini-stats">
              <div>
                <span>Total Products</span>
                <strong>
                  {products.length}
                </strong>
              </div>

              <div>
                <span>Low Stock</span>
                <strong>
                  {lowStockProducts.length}
                </strong>
              </div>
            </div>

            <div className="overview-detail-list">
              {activeProducts.length === 0 ? (
                <div className="overview-empty">
                  <Package size={25} />

                  <strong>
                    No active products
                  </strong>

                  <p>
                    Add fresh produce to start
                    selling.
                  </p>
                </div>
              ) : (
                activeProducts
                  .slice(0, 6)
                  .map((product) => (
                    <div
                      className="overview-product-row"
                      key={product.id}
                    >
                      <div className="overview-product-icon">
                        <ProduceIcon
                          name={product.name}
                          category={
                            product.category
                          }
                          size={25}
                        />
                      </div>

                      <div className="overview-row-main">
                        <strong>
                          {displayName(
                            product.name
                          )}
                        </strong>

                        <span>
                          {displayValue(
                            product.category
                          )}
                        </span>
                      </div>

                      <div className="overview-row-value">
                        <strong>
                          {product.quantity}{" "}
                          {product.unit}
                        </strong>

                        <span>
                          {formatMoney(
                            product.price
                          )}
                          /{product.unit}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        );
      }


      if (overviewType === "stock") {
        return (
          <>
            <div className="overview-detail-summary">
              <div className="overview-summary-icon">
                <Warehouse size={21} />
              </div>

              <div>
                <span>
                  Available Stock
                </span>

                <strong>
                  {availableStock.toLocaleString(
                    "en-IN"
                  )}
                </strong>

                <p>
                  Total quantity across
                  all listed produce.
                </p>
              </div>
            </div>

            <div className="overview-mini-stats">
              <div>
                <span>Products</span>
                <strong>
                  {products.length}
                </strong>
              </div>

              <div>
                <span>Low Stock</span>
                <strong>
                  {lowStockProducts.length}
                </strong>
              </div>

              <div>
                <span>Active</span>
                <strong>
                  {activeProducts.length}
                </strong>
              </div>
            </div>

            <div className="overview-detail-list">
              {products.length === 0 ? (
                <div className="overview-empty">
                  <Warehouse size={25} />

                  <strong>
                    No stock information
                  </strong>

                  <p>
                    Add produce to track stock.
                  </p>
                </div>
              ) : (
                products
                  .slice(0, 7)
                  .map((product) => (
                    <div
                      className="overview-stock-row"
                      key={product.id}
                    >
                      <div className="overview-product-icon">
                        <ProduceIcon
                          name={product.name}
                          category={
                            product.category
                          }
                          size={23}
                        />
                      </div>

                      <div className="overview-row-main">
                        <strong>
                          {displayName(
                            product.name
                          )}
                        </strong>

                        <span>
                          {product.status ===
                          "active"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <strong className="stock-number">
                        {Number(
                          product.quantity || 0
                        ).toLocaleString(
                          "en-IN"
                        )}{" "}
                        {product.unit}
                      </strong>
                    </div>
                  ))
              )}
            </div>
          </>
        );
      }


      if (overviewType === "orders") {
        return (
          <>
            <div className="overview-detail-summary">
              <div className="overview-summary-icon">
                <ShoppingBag size={21} />
              </div>

              <div>
                <span>
                  New Orders
                </span>

                <strong>
                  {newOrders.length}
                </strong>

                <p>
                  Orders waiting for your
                  action.
                </p>
              </div>
            </div>

            <div className="overview-mini-stats">
              <div>
                <span>Total Orders</span>
                <strong>
                  {effectiveOrders.length}
                </strong>
              </div>

              <div>
                <span>Completed</span>
                <strong>
                  {completedOrders.length}
                </strong>
              </div>
            </div>

            <div className="overview-detail-list">
              {newOrders.length === 0 ? (
                <div className="overview-empty">
                  <ShoppingBag size={25} />

                  <strong>
                    No new orders
                  </strong>

                  <p>
                    New consumer orders will
                    appear here.
                  </p>
                </div>
              ) : (
                newOrders
                  .slice(0, 6)
                  .map((order) => (
                    <div
                      className="overview-order-row"
                      key={order.id}
                    >
                      <div className="overview-order-icon">
                        <ShoppingBag size={17} />
                      </div>

                      <div className="overview-row-main">
                        <strong>
                          Order #
                          {String(
                            order.id
                          ).slice(0, 8)}
                        </strong>

                        <span>
                          {displayName(
                            order.status ||
                              "Pending"
                          )}
                        </span>
                      </div>

                      <strong>
                        {formatMoney(
                          order.farmerAmount ||
                            order.totalAmount ||
                            0
                        )}
                      </strong>
                    </div>
                  ))
              )}
            </div>
          </>
        );
      }


      const averageEarning =
        completedOrders.length
          ? earnings /
            completedOrders.length
          : 0;

      return (
        <>
          <div className="overview-detail-summary earnings-summary">
            <div className="overview-summary-icon">
              <IndianRupee size={21} />
            </div>

            <div>
              <span>
                Completed Earnings
              </span>

              <strong>
                {formatMoney(earnings)}
              </strong>

              <p>
                Earnings from delivered
                and completed orders.
              </p>
            </div>
          </div>

          <div className="overview-mini-stats">
            <div>
              <span>Completed Orders</span>

              <strong>
                {completedOrders.length}
              </strong>
            </div>

            <div>
              <span>Total Orders</span>

              <strong>
                {orders.length}
              </strong>
            </div>

            <div>
              <span>Average Order</span>

              <strong>
                {formatMoney(
                  averageEarning
                )}
              </strong>
            </div>
          </div>

          <div className="overview-earnings-note">
            <TrendingUp size={18} />

            <span>
              Your earnings update automatically
              as orders are completed.
            </span>
          </div>
        </>
      );
    };


  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <div className="farmer-dashboard">


      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="farmer-topbar">
        <div className="farmer-topbar-inner">

          <button
            className="farmer-brand"
            onClick={() =>
              scrollToSection("home")
            }
          >
            <span className="farmer-brand-icon">
              <Leaf size={21} />
            </span>

            <span className="farmer-brand-name">
              AgriConnect
            </span>
          </button>

          <nav className="farmer-main-nav" aria-label="Farmer navigation">
            {[
              ["home", Home, "Home"],
              ["produce", Package, "My Produce"],
              ["orders", ShoppingBag, "Orders"],
              ["earnings", IndianRupee, "Earnings"],
              ["forecast", BrainCircuit, "AI Forecast"],
            ].map(([section, Icon, label]) => (
              <button
                key={section}
                type="button"
                className={activeSection === section ? "active" : ""}
                onClick={() => scrollToSection(section)}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <button
            className={`farmer-menu-toggle ${sidebarOpen ? "active" : ""}`}
            onClick={() => {
              setSidebarOpen((value) => !value);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            aria-label="Open farmer navigation"
            aria-expanded={sidebarOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {sidebarOpen && (
            <button
              className="farmer-sidebar-backdrop"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            />
          )}

          <aside className={`farmer-sidebar ${sidebarOpen ? "open" : ""}`}>
            <div className="farmer-sidebar-head">
              <button
                className="farmer-sidebar-brand"
                onClick={() => scrollToSection("home")}
              >
                <span className="farmer-sidebar-brand-icon">
                  <Leaf size={20} />
                </span>
                <span>
                  <strong>AgriConnect</strong>
                  <small>Farmer Dashboard</small>
                </span>
              </button>

              <button
                className="farmer-sidebar-close"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
              >
                <X size={19} />
              </button>
            </div>

            <div className="farmer-sidebar-menu">
              {[
                ["home", Home, "Home"],
                ["produce", Package, "My Produce"],
                ["orders", ShoppingBag, "Orders"],
                ["earnings", IndianRupee, "Earnings"],
                ["forecast", BrainCircuit, "AI Forecast"],
              ].map(([section, Icon, label]) => (
                <button
                  key={section}
                  className={activeSection === section ? "active" : ""}
                  onClick={() => scrollToSection(section)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="farmer-sidebar-footer">
              <div className="farmer-sidebar-tip">
                <Sprout size={18} />
                <span>
                  <strong>Smart Farming</strong>
                  <small>Manage produce and grow your market.</small>
                </span>
              </div>

              <button
                className="farmer-sidebar-logout"
                onClick={async () => {
                  try {
                    await signOut(auth);
                  } finally {
                    navigate("/");
                  }
                }}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          <div className="farmer-topbar-actions">

            {/* Notifications */}

            <div className="farmer-action-wrapper">

              <button
                className="farmer-icon-button"
                onClick={() => {
                  setShowNotifications(
                    (value) => !value
                  );

                  setShowProfileMenu(false);
                }}
              >
                <Bell size={17} />

                {notifications.length > 0 && (
                  <span className="notification-dot">
                    {notifications.length > 9
                      ? "9+"
                      : notifications.length}
                  </span>
                )}
              </button>


              {showNotifications && (
                <div className="farmer-popover notification-popover">

                  <div className="popover-heading">

                    <div>
                      <strong>
                        Notifications
                      </strong>

                      <span>
                        Farmer updates
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setShowNotifications(
                          false
                        )
                      }
                    >
                      <X size={15} />
                    </button>

                  </div>


                  <div className="notification-list">

                    {notifications.length === 0 ? (
                      <div className="empty-notification">
                        <CheckCircle2 size={21} />

                        <p>
                          You're all caught up.
                        </p>
                      </div>
                    ) : (
                      notifications.map(
                        (notification) => (
                          <div
                            className="notification-item"
                            key={notification.id}
                          >
                            <div
                              className={`notification-item-icon ${notification.type}`}
                            >
                              {notification.type ===
                              "warning" ? (
                                <CircleAlert size={16} />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                            </div>

                            <div>
                              <strong>
                                {notification.title}
                              </strong>

                              <p>
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        )
                      )
                    )}

                  </div>
                </div>
              )}

            </div>


            {/* Profile */}

            <div className="farmer-profile-wrapper">

              <button
                className="farmer-profile-button"
                onClick={() => {
                  setShowProfileMenu(
                    (value) => !value
                  );

                  setShowNotifications(false);
                }}
              >
                <span className="farmer-profile-avatar">
                  <User size={16} />
                </span>

                <span className="farmer-profile-name">
                  {farmerName}
                </span>

                <ChevronDown size={14} />
              </button>


              {showProfileMenu && (
                <div className="farmer-profile-menu">

                  <div className="profile-menu-user">

                    <div className="profile-menu-avatar">
                      <User size={18} />
                    </div>

                    <div>
                      <strong>
                        {farmerName}
                      </strong>

                      <span>
                        Individual Farmer
                      </span>
                    </div>

                  </div>

                  <div className="menu-divider" />

                  <button onClick={openProfile}>
                    <User size={15} />
                    Profile
                  </button>

                  <button onClick={openSettings}>
                    <Settings size={15} />
                    Settings
                  </button>

                  <div className="menu-divider" />

                  <button
                    className="logout-menu-button"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    Logout
                  </button>

                </div>
              )}

            </div>

          </div>
        </div>
      </header>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="farmer-dashboard-error">

          <CircleAlert size={17} />

          <span>{error}</span>

          <button
            onClick={() =>
              setError("")
            }
          >
            <X size={15} />
          </button>

        </div>
      )}


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="farmer-dashboard-main">


        {/* =================================================
            HERO
        ================================================= */}

        <section
          id="farmer-home"
          className="farmer-hero-section"
        >

          <div className="farmer-hero-content">

            <p className="farmer-eyebrow">
              FARMER DASHBOARD
            </p>

            <h1>
              Welcome,
              <span>
                {" "}
                {farmerName}
              </span>
            </h1>

            <p className="farmer-hero-description">
              Manage your farm produce, track orders,
              and connect directly with consumers
              through AgriConnect.
            </p>

            <div className="farmer-location-line">
              <MapPin size={15} />

              <span>
                {locationText}
              </span>
            </div>

          </div>


          <div className="farmer-hero-side">

            <div className="hero-side-label">
              REGISTERED FARM
            </div>

            <strong>
              {displayName(farmName)}
            </strong>

            <span>
              {farmType}
            </span>

          </div>

        </section>


        {/* =================================================
            OVERVIEW
        ================================================= */}

        <section className="farmer-overview-section">

          <div className="dashboard-section-title">

            <div>
              <p>OVERVIEW</p>

              <h2>
                Your farm at a glance
              </h2>
            </div>

            <span>
              Click a card for details
            </span>

          </div>


          <div className="farmer-stat-grid">


            <button
              className="farmer-stat-card clickable"
              onClick={() =>
                openOverview("products")
              }
            >
              <div className="stat-icon">
                <Package size={19} />
              </div>

              <div className="stat-card-content">
                <span>
                  Active Products
                </span>

                <strong>
                  {activeProducts.length}
                </strong>

                <small>
                  Listed for consumers
                </small>
              </div>

              <Eye
                className="stat-view-icon"
                size={15}
              />
            </button>


            <button
              className="farmer-stat-card clickable"
              onClick={() =>
                openOverview("stock")
              }
            >
              <div className="stat-icon">
                <Warehouse size={19} />
              </div>

              <div className="stat-card-content">
                <span>
                  Available Stock
                </span>

                <strong>
                  {availableStock.toLocaleString(
                    "en-IN"
                  )}
                </strong>

                <small>
                  Total quantity listed
                </small>
              </div>

              <Eye
                className="stat-view-icon"
                size={15}
              />
            </button>


            <button
              className="farmer-stat-card clickable"
              onClick={() =>
                openOverview("orders")
              }
            >
              <div className="stat-icon">
                <ShoppingBag size={19} />
              </div>

              <div className="stat-card-content">
                <span>
                  New Orders
                </span>

                <strong>
                  {newOrders.length}
                </strong>

                <small>
                  Awaiting action
                </small>
              </div>

              <Eye
                className="stat-view-icon"
                size={15}
              />
            </button>


            <button
              className="farmer-stat-card clickable"
              onClick={() =>
                openOverview("earnings")
              }
            >
              <div className="stat-icon">
                <IndianRupee size={19} />
              </div>

              <div className="stat-card-content">
                <span>
                  Earnings
                </span>

                <strong>
                  {formatMoney(earnings)}
                </strong>

                <small>
                  Completed orders
                </small>
              </div>

              <Eye
                className="stat-view-icon"
                size={15}
              />
            </button>

          </div>

        </section>


        {/* =================================================
            QUICK ACTION
        ================================================= */}

        <section className="farmer-quick-section">

          <div className="farmer-quick-card">

            <div className="quick-icon">
              <Plus size={22} />
            </div>

            <div>
              <strong>
                Have fresh produce to sell?
              </strong>

              <p>
                Add your produce and make it available
                to consumers on the AgriConnect marketplace.
              </p>
            </div>

            <button
              onClick={openAddProduct}
            >
              Add Produce
              <Plus size={15} />
            </button>

          </div>

        </section>


        {/* =================================================
            PRODUCE
        ================================================= */}

        <section
          id="farmer-produce"
          className="farmer-content-section"
        >

          <div className="dashboard-section-title">

            <div>
              <p>MY PRODUCE</p>

              <h2>
                Manage your produce
              </h2>
            </div>

            <button
              className="primary-action-button"
              onClick={openAddProduct}
            >
              <Plus size={16} />
              Add Produce
            </button>

          </div>


          <div className="produce-filter-bar">

            <div className="produce-search">

              <Search size={16} />

              <input
                value={productSearch}
                onChange={(event) =>
                  setProductSearch(
                    event.target.value
                  )
                }
                placeholder="Search your produce..."
              />

            </div>


            <div className="category-filters">

              <button
                className={
                  productCategory === "All"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setProductCategory("All")
                }
              >
                All
              </button>

              {PRODUCT_CATEGORIES.map(
                (category) => (
                  <button
                    key={category}
                    className={
                      productCategory ===
                      category
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setProductCategory(
                        category
                      )
                    }
                  >
                    {category}
                  </button>
                )
              )}

            </div>

          </div>


          {loading ? (
            <div className="produce-loading">
              Loading your produce...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-produce">

              <div className="empty-produce-icon">
                <Leaf size={26} />
              </div>

              <h3>
                No produce listed yet
              </h3>

              <p>
                Add your first produce to start
                selling directly to consumers.
              </p>

              <button
                onClick={openAddProduct}
              >
                <Plus size={16} />
                Add Your First Produce
              </button>

            </div>
          ) : (
            <div className="produce-grid">

              {filteredProducts.map(
                (product) => {

                  const quantity =
                    Number(
                      product.quantity || 0
                    );

                  const available =
                    product.status ===
                      "active" &&
                    quantity > 0;

                  return (
                    <article
                      className="produce-card"
                      key={product.id}
                    >

                      <div className="produce-card-top">

                        <div className="produce-icon-box">

                          <ProduceIcon
                            name={product.name}
                            category={
                              product.category
                            }
                            size={31}
                          />

                        </div>

                        <span
                          className={
                            available
                              ? "stock-status available"
                              : "stock-status unavailable"
                          }
                        >
                          {available
                            ? "Available"
                            : "Out of Stock"}
                        </span>

                      </div>


                      <div className="produce-card-info">

                        <p>
                          {product.category}
                        </p>

                        <h3>
                          {displayName(
                            product.name
                          )}
                        </h3>

                        <strong>
                          {formatMoney(
                            product.price
                          )}

                          <span>
                            / {product.unit}
                          </span>
                        </strong>

                      </div>


                      <div className="produce-stock">

                        <div>
                          <span>
                            Current Stock
                          </span>

                          <strong>
                            {quantity}{" "}
                            {product.unit}
                          </strong>
                        </div>


                        <div className="stock-controls">

                          <button
                            onClick={() =>
                              updateStock(
                                product,
                                -1
                              )
                            }
                            disabled={
                              quantity <= 0
                            }
                          >
                            −
                          </button>

                          <button
                            onClick={() =>
                              updateStock(
                                product,
                                1
                              )
                            }
                          >
                            +
                          </button>

                        </div>

                      </div>


                      <div className="produce-card-actions">

                        <button
                          onClick={() =>
                            openEditProduct(
                              product
                            )
                          }
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            toggleProduct(
                              product
                            )
                          }
                        >
                          {available
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                      </div>


                      <div className="produce-card-date">
                        Updated{" "}
                        {formatDate(
                          product.updatedAt ||
                            product.createdAt
                        )}
                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>


        {/* =================================================
            ORDERS
        ================================================= */}

        <section
          id="farmer-orders"
          className="farmer-content-section"
        >

          <div className="dashboard-section-title">

            <div>
              <p>ORDERS</p>

              <h2>
                Recent orders
              </h2>
            </div>

            <span>
              {effectiveOrders.length} total
            </span>

          </div>


          {effectiveOrders.length === 0 ? (
            <div className="empty-dashboard-panel">

              <div>
                <ShoppingBag size={24} />
              </div>

              <h3>
                No orders yet
              </h3>

              <p>
                Orders from consumers will appear here
                once your produce is purchased.
              </p>

            </div>
          ) : (
            <div className="orders-list">

              {effectiveOrders
                .slice(0, 8)
                .map((order) => (
                  <button
                    type="button"
                    className="farmer-order-row farmer-order-row-clickable"
                    key={order.id}
                    onClick={() => openOrderDetails(order)}
                  >
                    <div className="order-product-mark">
                      <ShoppingBag size={17} />
                    </div>

                    <div className="order-main-info">
                      <strong>
                        Order #{String(order.id).slice(0, 8)}
                      </strong>
                      <span>
                        {getConsumerName(order)} • {getOrderItemSummary(order)}
                      </span>
                    </div>

                    <div className="order-row-right">
                      <strong>
                        {formatMoney(
                          order.farmerAmount ||
                          order.totalAmount ||
                          getOrderFarmerTotal(order)
                        )}
                      </strong>
                      <span className={`order-status-pill ${getOrderStatus(order)}`}>
                        {formatOrderStatus(getOrderStatus(order))}
                      </span>
                    </div>

                    <ArrowRight size={15} />
                  </button>
                ))}

            </div>
          )}

        </section>


        {/* =================================================
            EARNINGS
        ================================================= */}

        <section
          id="farmer-earnings"
          className="farmer-content-section"
        >

          <div className="dashboard-section-title">

            <div>
              <p>EARNINGS</p>

              <h2>
                Your earnings
              </h2>
            </div>

          </div>


          <div className="earnings-panel">

            <div className="earnings-main">

              <span>
                COMPLETED ORDER EARNINGS
              </span>

              <strong>
                {formatMoney(earnings)}
              </strong>

              <p>
                Your completed order earnings will
                update automatically as orders are delivered.
              </p>

            </div>

            <div className="earnings-icon">
              <TrendingUp size={28} />
            </div>

          </div>


          <div className="earnings-summary-grid">

            <div>
              <CheckCircle2 size={18} />

              <span>
                Completed Orders
              </span>

              <strong>
                {completedOrders.length}
              </strong>
            </div>

            <div>
              <ShoppingBag size={18} />

              <span>
                Total Orders
              </span>

              <strong>
                {orders.length}
              </strong>
            </div>

            <div>
              <IndianRupee size={18} />

              <span>
                Average Order
              </span>

              <strong>
                {formatMoney(
                  completedOrders.length
                    ? earnings /
                        completedOrders.length
                    : 0
                )}
              </strong>
            </div>

          </div>

        </section>

        {/* =================================================
            AI DEMAND FORECAST
        ================================================= */}

        <section
          id="farmer-forecast"
          className="farmer-content-section farmer-enhanced-section"
        >
          <div className="dashboard-section-title">
            <div>
              <p>AI DEMAND FORECAST</p>
              <h2>Plan your next harvest</h2>
              <span>Demand is shown as a simple list so you can quickly decide what to grow or stock.</span>
            </div>
            <div className="forecast-badge">
              <BrainCircuit size={14} />
              {forecastHighCount} high-demand items
            </div>
          </div>

          {demandForecast.length === 0 ? (
            <div className="empty-dashboard-panel">
              <p>Add produce to generate a demand forecast.</p>
            </div>
          ) : (
            <div className="forecast-list-wrap">
              <div className="forecast-list-header">
                <span>PRODUCE</span>
                <span>EXPECTED DEMAND</span>
                <span>YOUR STOCK</span>
                <span>DEMAND LEVEL</span>
                <span>RECOMMENDED STOCK</span>
              </div>

              <div className="forecast-list">
                {demandForecast.slice(0, 12).map((item) => (
                  <div className="forecast-list-row" key={item.id}>
                    <div className="forecast-list-produce">
                      <ProduceIcon name={item.name} category={item.category} size={34} />
                      <div>
                        <strong>{displayName(item.name)}</strong>
                        <small>{item.category || "Produce"}</small>
                      </div>
                    </div>

                    <div className="forecast-list-value">
                      <strong>{item.weeklyForecast || 0} {item.unit || "kg"}</strong>
                      <small>next 7 days</small>
                    </div>

                    <div className="forecast-list-value">
                      <strong>{Number(item.quantity || 0).toLocaleString("en-IN")} {item.unit || "kg"}</strong>
                      <small>{item.sold30 || 0} sold in 30 days</small>
                    </div>

                    <div>
                      <span className={`forecast-demand ${item.demand.toLowerCase()}`}>
                        {item.demand}
                      </span>
                    </div>

                    <div className="forecast-recommendation">
                      {item.suggested > 0 ? (
                        <><strong>+{item.suggested} {item.unit || "kg"}</strong><small>Add to stock</small></>
                      ) : (
                        <><strong>Stock sufficient</strong><small>No increase needed</small></>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          
        </section>


        {/* =================================================
            REGISTERED DETAILS
        ================================================= */}

        <section className="farmer-content-section registered-details-section">

          <div className="dashboard-section-title">

            <div>
              <p>
                FARMER PROFILE
              </p>

              <h2>
                Your Registered Details
              </h2>

              <span>
                Your verified farmer information
              </span>
            </div>

            <button
              className="outline-action-button"
              onClick={openProfile}
            >
              <User size={14} />
              View Profile
            </button>

          </div>


          <div className="registered-details-grid">

            {/* LOCATION */}

            <div className="registered-detail-item">

              <div className="registered-detail-icon">
                <MapPin size={20} />
              </div>

              <div className="registered-detail-content">

                <span>
                  Location
                </span>

                <strong>
                  {locationText}
                </strong>
                {farmerProfile?.location && (
                  <small className="registered-gps-label">
                    GPS location saved
                  </small>
                )}

              </div>

            </div>


            {/* FARM */}

            <div className="registered-detail-item">

              <div className="registered-detail-icon">
                <Sprout size={20} />
              </div>

              <div className="registered-detail-content">

                <span>
                  Farm
                </span>

                <strong>
                  {displayName(
                    farmName
                  )}
                </strong>

              </div>

            </div>


            {/* LAND */}

            <div className="registered-detail-item">

              <div className="registered-detail-icon">
                <Warehouse size={20} />
              </div>

              <div className="registered-detail-content">

                <span>
                  Land Area
                </span>

                <strong>
                  {landArea
                    ? `${landArea} ${landUnit}`
                    : "Not provided"}
                </strong>

              </div>

            </div>


            {/* CROPS */}

            <div className="registered-detail-item">

              <div className="registered-detail-icon">
                <Wheat size={20} />
              </div>

              <div className="registered-detail-content">

                <span>
                  Main Crops
                </span>

                <strong>
                  {crops}
                </strong>

              </div>

            </div>


            {/* MOBILE */}

            <div className="registered-detail-item">

              <div className="registered-detail-icon">
                <Phone size={20} />
              </div>

              <div className="registered-detail-content">

                <span>
                  Mobile
                </span>

                <strong>
                  {farmerMobile
                    ? `+91 ${farmerMobile}`
                    : "Not provided"}
                </strong>

              </div>

            </div>


            {/* STATUS */}

            <div className="registered-detail-item">

              <div className="registered-detail-icon verified">
                <CheckCircle2 size={20} />
              </div>

              <div className="registered-detail-content">

                <span>
                  Verification
                </span>

                <strong className="verified-text">
                  {farmerProfile?.status ===
                  "approved"
                    ? "Verified Farmer"
                    : "Registered"}
                </strong>

              </div>

            </div>

          </div>

        </section>

      </main>



      {/* =================================================
          ORDER DETAILS + DELIVERY ASSIGNMENT MODAL
      ================================================= */}

      {showOrderModal && orderModal && (
        <div
          className="farmer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeOrderDetails();
          }}
        >
          <div className="farmer-order-modal">
            <div className="farmer-modal-header">
              <div>
                <p>ORDER DETAILS</p>
                <h2>Order #{String(orderModal.id).slice(0, 8)}</h2>
                <span>
                  {getConsumerName(orderModal)} · {formatDate(orderModal.createdAt)}
                </span>
              </div>
              <button onClick={closeOrderDetails}>
                <X size={18} />
              </button>
            </div>

            <div className="order-detail-top">
              <div>
                <span>Status</span>
                <strong className={`order-status-pill ${getOrderStatus(orderModal)}`}>
                  {formatOrderStatus(getOrderStatus(orderModal))}
                </strong>
              </div>
              <div>
                <span>Farmer Earnings</span>
                <strong>
                  {formatMoney(
                    orderModal.farmerAmount ||
                    getOrderFarmerTotal(orderModal) ||
                    orderModal.totalAmount ||
                    0
                  )}
                </strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>
                  {displayName(orderModal.paymentStatus || orderModal.payment?.status || "Pending")}
                </strong>
              </div>
            </div>

            <div className="order-detail-section">
              <div className="order-detail-section-title">
                <ShoppingBag size={16} />
                <strong>Consumer & Items</strong>
              </div>

              <div className="order-consumer-box">
                <div>
                  <span>Consumer</span>
                  <strong>{getConsumerName(orderModal)}</strong>
                </div>
                <div>
                  <span>Delivery Address</span>
                  <strong>{getOrderAddress(orderModal)}</strong>
                </div>
              </div>

              <div className="order-items-list">
                {getOrderItems(orderModal).length === 0 ? (
                  <p className="order-empty-text">Item details are not available.</p>
                ) : (
                  getOrderItems(orderModal).map((item, index) => (
                    <div className="order-item-row" key={`${item.productId || item.id || item.name}-${index}`}>
                      <ProduceIcon
                        name={item.name || item.productName || "Produce"}
                        category={item.category || ""}
                        size={27}
                      />
                      <div>
                        <strong>{displayName(item.name || item.productName || "Produce")}</strong>
                        <span>
                          {Number(item.quantity || 0)} {item.unit || "kg"} × {formatMoney(item.price || 0)}
                        </span>
                      </div>
                      <strong>
                        {formatMoney(
                          item.totalPrice ??
                          item.subtotal ??
                          Number(item.price || 0) * Number(item.quantity || 0)
                        )}
                      </strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="order-detail-section">
              <div className="order-detail-section-title">
                <Truck size={16} />
                <div>
                  <strong>Platform Managed Delivery</strong>
                  <span>
                    AgriConnect automatically matches an eligible delivery partner.
                  </span>
                </div>
              </div>

              {(() => {
                const request = getDeliveryRequestForOrder(orderModal);
                const status = String(
                  request?.deliveryStatus || request?.status || ""
                ).toLowerCase();

                return (
                  <div
                    className="assigned-partner-box"
                    style={{
                      alignItems: "flex-start",
                      gap: "12px",
                      background: "rgba(28,91,61,0.05)",
                    }}
                  >
                    <div className="delivery-partner-avatar">
                      {request?.deliveryAgentId ? <Truck size={19} /> : <RefreshCw size={19} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <strong>
                        {request?.deliveryAgentId
                          ? request.deliveryAgentName || "Delivery Partner Assigned"
                          : request
                          ? status === "request_open" || status === "open"
                            ? request.eligiblePartnerIds?.length
                              ? `${request.eligiblePartnerIds.length} eligible partner(s) notified`
                              : "Waiting for an eligible delivery partner"
                            : "Matching delivery partners..."
                          : "Delivery matching starts when the order is ready"}
                      </strong>

                      <span style={{ display: "block", marginTop: "4px" }}>
                        {request?.deliveryAgentId
                          ? request.deliveryAgentMobile || "Partner accepted the delivery request."
                          : request?.matching?.noEligibleReason ||
                            "Partners are matched using online status, pickup distance, GPS and vehicle capacity."}
                      </span>
                    </div>

                    {request?.deliveryAgentId ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <BrainCircuit size={18} />
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="order-detail-section">
              <div className="order-detail-section-title">
                <RefreshCw size={16} />
                <div>
                  <strong>Order Progress</strong>
                  <span>Move the order through the farmer workflow.</span>
                </div>
              </div>

              <div className="order-status-timeline">
                {["pending", "accepted", "preparing", "ready_for_pickup", "assigned", "picked_up", "delivered", "completed"].map(
                  (status, index) => {
                    const current = getOrderStatus(orderModal);
                    const currentIndex = ["pending", "accepted", "preparing", "ready_for_pickup", "assigned", "picked_up", "delivered", "completed"].indexOf(current);
                    const reached = index <= currentIndex;
                    return (
                      <div className={`order-timeline-step ${reached ? "reached" : ""}`} key={status}>
                        <span>{reached ? <CheckCircle2 size={14} /> : index + 1}</span>
                        <small>{formatOrderStatus(status)}</small>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="order-next-actions">
                {getOrderStatus(orderModal) === "pending" ||
                getOrderStatus(orderModal) === "new" ||
                getOrderStatus(orderModal) === "confirmed" ? (
                  <button
                    type="button"
                    className="primary-modal-button"
                    disabled={updatingOrderStatus}
                    onClick={() => updateFarmerOrderStatus("accepted")}
                  >
                    Accept Order
                  </button>
                ) : null}

                {getOrderStatus(orderModal) === "accepted" ? (
                  <button
                    type="button"
                    className="primary-modal-button"
                    disabled={updatingOrderStatus}
                    onClick={() => updateFarmerOrderStatus("preparing")}
                  >
                    Mark Preparing
                  </button>
                ) : null}

                {getOrderStatus(orderModal) === "preparing" ? (
                  <button
                    type="button"
                    className="primary-modal-button"
                    disabled={updatingOrderStatus}
                    onClick={() => updateFarmerOrderStatus("ready_for_pickup")}
                  >
                    Ready for Pickup
                  </button>
                ) : null}

                {getOrderStatus(orderModal) === "ready_for_pickup" ? (
                  <span className="order-action-hint">
                    Platform delivery matching is active. The first eligible partner to accept will be assigned automatically.
                  </span>
                ) : null}

                {["assigned", "picked_up", "delivered", "completed"].includes(getOrderStatus(orderModal)) ? (
                  <span className="order-action-hint">
                    Delivery progress is managed by the platform and delivery partner.
                  </span>
                ) : null}
              </div>
            </div>

            <div className="profile-modal-footer">
              <button
                className="secondary-modal-button"
                onClick={closeOrderDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          OVERVIEW MODAL
      ================================================= */}

      {showOverviewModal && (
        <div
          className="farmer-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeOverview();
            }
          }}
        >

          <div className="overview-details-modal">

            <div className="farmer-modal-header">

              <div>

                <p>
                  FARM OVERVIEW
                </p>

                <h2>
                  {
                    overviewData[
                      overviewType
                    ]?.title
                  }
                </h2>

                <span>
                  {
                    overviewData[
                      overviewType
                    ]?.subtitle
                  }
                </span>

              </div>

              <button
                onClick={closeOverview}
              >
                <X size={18} />
              </button>

            </div>


            {renderOverviewDetails()}


            <div className="overview-modal-footer">

              <button
                className="overview-close-button"
                onClick={closeOverview}
              >
                Close
              </button>

              <button
                className="overview-action-button"
                onClick={() =>
                  goFromOverview(
                    overviewData[
                      overviewType
                    ]?.section
                  )
                }
              >
                {
                  overviewData[
                    overviewType
                  ]?.action
                }

                <ArrowRight size={15} />
              </button>

            </div>

          </div>

        </div>
      )}


      {/* =================================================
          PROFILE MODAL
      ================================================= */}

      {showProfileModal && (
        <div
          className="farmer-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowProfileModal(
                false
              );
            }
          }}
        >

          <div className="farmer-profile-modal">

            <div className="farmer-modal-header">

              <div>

                <p>
                  FARMER PROFILE
                </p>

                <h2>
                  Your Profile
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowProfileModal(
                    false
                  )
                }
              >
                <X size={18} />
              </button>

            </div>


            <div className="profile-modal-hero">

              <div className="profile-modal-avatar">
                <User size={27} />
              </div>

              <div>

                <h3>
                  {farmerName}
                </h3>

                <p>
                  Individual Farmer
                </p>

              </div>

              <span>

                <CheckCircle2 size={14} />

                {farmerProfile?.status ===
                "approved"
                  ? "Verified"
                  : "Registered"}

              </span>

            </div>


            <div className="profile-info-section">

              <div className="profile-info-title">
                PERSONAL
              </div>

              <div className="profile-info-grid">

                <div>
                  <Phone size={15} />

                  <span>
                    Mobile
                  </span>

                  <strong>
                    {farmerMobile
                      ? `+91 ${farmerMobile}`
                      : "Not provided"}
                  </strong>
                </div>


                <div>
                  <Mail size={15} />

                  <span>
                    Email
                  </span>

                  <strong>
                    {farmerEmail ||
                      "Not provided"}
                  </strong>
                </div>


                <div>
                  <CalendarDays size={15} />

                  <span>
                    Date of Birth
                  </span>

                  <strong>
                    {farmerDob ||
                      "Not provided"}
                  </strong>
                </div>


                <div>
                  <User size={15} />

                  <span>
                    Gender
                  </span>

                  <strong>
                    {farmerGender ||
                      "Not provided"}
                  </strong>
                </div>

              </div>

            </div>


            <div className="profile-info-section">

              <div className="profile-info-title">
                FARM
              </div>

              <div className="profile-info-grid">

                <div>
                  <Sprout size={15} />

                  <span>
                    Farm Name
                  </span>

                  <strong>
                    {displayName(
                      farmName
                    )}
                  </strong>
                </div>


                <div>
                  <Leaf size={15} />

                  <span>
                    Farm Type
                  </span>

                  <strong>
                    {farmType}
                  </strong>
                </div>


                <div>
                  <Package size={15} />

                  <span>
                    Land Area
                  </span>

                  <strong>
                    {landArea
                      ? `${landArea} ${landUnit}`
                      : "Not provided"}
                  </strong>
                </div>


                <div>
                  <Wheat size={15} />

                  <span>
                    Main Crops
                  </span>

                  <strong>
                    {crops}
                  </strong>
                </div>

              </div>

            </div>


            <div className="profile-info-section">

              <div className="profile-info-title">
                LOCATION
              </div>

              <div className="profile-location-box">

                <MapPin size={18} />

                <div>

                  <strong>
                    {locationText}
                  </strong>

                  <span>
                    {farmerPincode
                      ? `Pincode: ${farmerPincode}`
                      : ""}
                  </span>

                  {farmerAddress && (
                    <p>
                      {farmerAddress}
                    </p>
                  )}

                </div>

              </div>

            </div>


            <div className="profile-modal-footer">

              <button
                className="secondary-modal-button"
                onClick={() => {
                  setShowProfileModal(false);
                  openSettings();
                }}
              >
                <Settings size={15} />
                Edit in Settings
              </button>

              <button
                className="primary-modal-button"
                onClick={() =>
                  setShowProfileModal(false)
                }
              >
                Done
              </button>

            </div>

          </div>

        </div>
      )}


      {/* =================================================
          SETTINGS MODAL
      ================================================= */}

      {showSettingsModal && (
        <div
          className="farmer-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowSettingsModal(
                false
              );
            }
          }}
        >

          <div className="farmer-settings-modal">

            <div className="farmer-modal-header">

              <div>

                <p>
                  ACCOUNT SETTINGS
                </p>

                <h2>
                  Update your details
                </h2>

                <span>
                  Keep your farmer profile up to date.
                </span>

              </div>

              <button
                onClick={() =>
                  setShowSettingsModal(
                    false
                  )
                }
              >
                <X size={18} />
              </button>

            </div>


            <form
              className="settings-form"
              onSubmit={saveSettings}
            >

              {/* PERSONAL */}

              <div className="settings-section">

                <div className="settings-section-heading">

                  <User size={17} />

                  <div>
                    <strong>
                      Personal Details
                    </strong>

                    <span>
                      Basic account information
                    </span>
                  </div>

                </div>


                <div className="settings-grid">

                  <label>
                    Full Name

                    <input
                      name="fullName"
                      value={
                        settingsForm.fullName ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <label>
                    Mobile Number

                    <div className="settings-input-locked">

                      <Phone size={15} />

                      <input
                        value={
                          farmerMobile
                            ? `+91 ${farmerMobile}`
                            : ""
                        }
                        disabled
                      />

                      <span>
                        Verified
                      </span>

                    </div>

                  </label>


                  <label>
                    Email Address

                    <input
                      name="email"
                      type="email"
                      value={
                        settingsForm.email ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                      placeholder="name@example.com"
                    />
                  </label>


                  <label>
                    Date of Birth

                    <input
                      name="dob"
                      type="date"
                      value={
                        settingsForm.dob ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <label>
                    Gender

                    <select
                      name="gender"
                      value={
                        settingsForm.gender ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
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
                  </label>

                </div>

              </div>


              {/* LOCATION */}

              <div className="settings-section">

                <div className="settings-section-heading">

                  <MapPin size={17} />

                  <div>
                    <strong>
                      Farm Location
                    </strong>

                    <span>
                      Your registered farm location
                    </span>
                  </div>

                </div>


                <div className="settings-grid">

                  <label>
                    State

                    <input
                      name="state"
                      value={
                        settingsForm.state ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <label>
                    District

                    <input
                      name="district"
                      value={
                        settingsForm.district ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <label>
                    Mandal / Taluk

                    <input
                      name="mandal"
                      value={
                        settingsForm.mandal ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <label>
                    Village

                    <input
                      name="village"
                      value={
                        settingsForm.village ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <label>
                    Pincode

                    <input
                      name="pincode"
                      inputMode="numeric"
                      maxLength={6}
                      value={
                        settingsForm.pincode ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <div className="settings-location-actions settings-full">
                    <button
                      type="button"
                      className="outline-action-button"
                      onClick={captureCurrentLocation}
                    >
                      <MapPin size={15} />
                      Use Current GPS Location
                    </button>
                    <span>
                      {settingsForm.latitude && settingsForm.longitude
                        ? `Saved: ${settingsForm.latitude}, ${settingsForm.longitude}`
                        : "No GPS coordinates saved"}
                    </span>
                  </div>

                  <label className="settings-full">
                    Address / Landmark

                    <textarea
                      name="address"
                      rows={3}
                      value={
                        settingsForm.address ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>

                </div>

              </div>


              {/* FARM */}

              <div className="settings-section">

                <div className="settings-section-heading">

                  <Sprout size={17} />

                  <div>
                    <strong>
                      Farm Details
                    </strong>

                    <span>
                      Information about your farm
                    </span>
                  </div>

                </div>


                <div className="settings-grid">

                  <label>
                    Farm Name

                    <input
                      name="farmName"
                      value={
                        settingsForm.farmName ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <label>
                    Farm Type

                    <select
                      name="farmType"
                      value={
                        settingsForm.farmType ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    >
                      <option value="">
                        Select farm type
                      </option>

                      <option value="Organic">
                        Organic
                      </option>

                      <option value="Conventional">
                        Conventional
                      </option>

                      <option value="Mixed">
                        Mixed
                      </option>

                      <option value="Natural Farming">
                        Natural Farming
                      </option>
                    </select>
                  </label>


                  <label>
                    Land Area

                    <input
                      name="landArea"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        settingsForm.landArea ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    />
                  </label>


                  <label>
                    Land Unit

                    <select
                      name="landUnit"
                      value={
                        settingsForm.landUnit ||
                        "acres"
                      }
                      onChange={
                        handleSettingsChange
                      }
                    >
                      <option value="acres">
                        Acres
                      </option>

                      <option value="hectares">
                        Hectares
                      </option>

                      <option value="guntas">
                        Guntas
                      </option>
                    </select>
                  </label>


                  <label className="settings-full">
                    Main Crops

                    <input
                      name="crops"
                      value={
                        settingsForm.crops ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                      placeholder="Tomato, Rice, Mango..."
                    />
                  </label>


                  <label>
                    Minimum Order Value

                    <div className="input-prefix">
                      <span>₹</span>
                      <input
                        name="minimumOrderValue"
                        type="number"
                        min="0"
                        step="1"
                        value={settingsForm.minimumOrderValue ?? 0}
                        onChange={handleSettingsChange}
                      />
                    </div>
                  </label>

                  <label className="settings-full">
                    Irrigation Method

                    <select
                      name="irrigation"
                      value={
                        settingsForm.irrigation ||
                        ""
                      }
                      onChange={
                        handleSettingsChange
                      }
                    >
                      <option value="">
                        Select irrigation method
                      </option>

                      <option value="Drip Irrigation">
                        Drip Irrigation
                      </option>

                      <option value="Sprinkler">
                        Sprinkler
                      </option>

                      <option value="Borewell">
                        Borewell
                      </option>

                      <option value="Canal">
                        Canal
                      </option>

                      <option value="Rainfed">
                        Rainfed
                      </option>

                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </label>

                </div>

              </div>


              <div className="settings-footer">

                <p>
                  Your mobile number is linked to
                  your farmer account and cannot be
                  changed here.
                </p>

                <div>

                  <button
                    type="button"
                    className="settings-cancel"
                    onClick={() =>
                      setShowSettingsModal(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="settings-save"
                    disabled={
                      savingSettings
                    }
                  >
                    {savingSettings ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save size={15} />
                        Save Changes
                      </>
                    )}
                  </button>

                </div>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* =================================================
          PRODUCT MODAL
      ================================================= */}

      {showProductModal && (
        <div
          className="product-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowVoiceReview(false);
              setShowProductModal(false);
            }
          }}
        >

          <div className="product-modal">

            <div className="product-modal-header">

              <div>
                <p>
                  {editingProduct
                    ? "UPDATE PRODUCE"
                    : "ADD NEW PRODUCE"}
                </p>

                <h2>
                  {editingProduct
                    ? "Update your produce"
                    : "List fresh produce"}
                </h2>
              </div>

              <button
                onClick={() => {
                  setShowVoiceReview(false);
                  setShowProductModal(false);
                }}
              >
                <X size={18} />
              </button>

            </div>


            <div className="product-preview">

              <div className="product-preview-icon">

                <ProduceIcon
                  name={
                    productForm.name ||
                    "produce"
                  }
                  category={
                    productForm.category
                  }
                  size={36}
                />

              </div>

              <div>

                <span>
                  PRODUCT PREVIEW
                </span>

                <strong>
                  {productForm.name
                    ? displayName(
                        productForm.name
                      )
                    : "Your produce"}
                </strong>

                <p>
                  {productForm.category ||
                    "Select a category"}
                </p>

              </div>

            </div>


            <form
              className="product-form"
              onSubmit={saveProduct}
            >

              <div className="product-form-grid">

                <div className="product-field full">

                  <label>
                    Produce Name
                    <span>*</span>
                  </label>

                  <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                    <div
                      className="product-select produce-custom-select"
                      style={{ flex: 1, position: "relative" }}
                    >
                      <button
                        type="button"
                        className="produce-select-trigger"
                        onClick={() =>
                          setShowProduceDropdown((value) => !value)
                        }
                        aria-haspopup="listbox"
                        aria-expanded={showProduceDropdown}
                      >
                        {productForm.name ? (
                          <>
                            <ProduceIcon
                              name={productForm.name}
                              category={productForm.category}
                              size={28}
                            />
                            <span>{productForm.name}</span>
                          </>
                        ) : (
                          <span className="produce-select-placeholder">
                            Select produce
                          </span>
                        )}
                        <ChevronDown
                          size={15}
                          className={
                            showProduceDropdown
                              ? "produce-select-chevron open"
                              : "produce-select-chevron"
                          }
                        />
                      </button>

                      {showProduceDropdown && (
                        <div
                          className="produce-options-menu"
                          role="listbox"
                        >
                          {PRODUCE_CATALOG.map((item) => (
                            <button
                              key={item.name}
                              type="button"
                              className={
                                productForm.name === item.name
                                  ? "produce-option active"
                                  : "produce-option"
                              }
                              onClick={() => {
                                setProductForm((previous) => ({
                                  ...previous,
                                  name: item.name,
                                  category: item.category,
                                }));
                                setShowProduceDropdown(false);
                                setError("");
                              }}
                              role="option"
                              aria-selected={productForm.name === item.name}
                            >
                              <span className="produce-option-icon">
                                <ProduceIcon
                                  name={item.name}
                                  category={item.category}
                                  size={28}
                                />
                              </span>
                              <span className="produce-option-text">
                                <strong>{item.name}</strong>
                                <small>{item.category}</small>
                              </span>
                              {productForm.name === item.name && (
                                <CheckCircle2 size={15} />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={isListening ? stopVoiceInput : startVoiceInput}
                      title={isListening ? "Stop voice input" : "Speak produce details"}
                      style={{
                        minWidth: "48px",
                        border: "1px solid currentColor",
                        borderRadius: "10px",
                        background: isListening ? "rgba(180, 55, 55, 0.10)" : "transparent",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isListening ? <X size={17} /> : <Mic size={17} />}
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setVoiceLanguage("te-IN")} style={{ fontSize: "12px", cursor: "pointer", fontWeight: voiceLanguage === "te-IN" ? 700 : 400 }}>
                      తెలుగు
                    </button>
                    <button type="button" onClick={() => setVoiceLanguage("en-IN")} style={{ fontSize: "12px", cursor: "pointer", fontWeight: voiceLanguage === "en-IN" ? 700 : 400 }}>
                      English
                    </button>
                    {!voiceSupported && <small>Voice input needs a supported browser.</small>}
                  </div>

                  {voiceTranscript && (
                    <div style={{
                      marginTop: "9px",
                      padding: "9px 11px",
                      borderRadius: "9px",
                      background: "rgba(28, 91, 61, 0.06)",
                      border: "1px solid rgba(28, 91, 61, 0.14)"
                    }}>
                      <small style={{ display: "block" }}>
                        Heard: “{voiceTranscript}”
                      </small>
                      <button
                        type="button"
                        onClick={() => setShowVoiceReview(true)}
                        style={{
                          marginTop: "7px",
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "12px"
                        }}
                      >
                        Review voice details →
                      </button>
                    </div>
                  )}

                </div>


                <div className="product-field">

                  <label>
                    Category
                    <span>*</span>
                  </label>

                  <div className="product-select">

                    <select
                      name="category"
                      value={
                        productForm.category
                      }
                      onChange={
                        handleProductChange
                      }
                    >
                      <option value="">
                        Select category
                      </option>

                      {PRODUCT_CATEGORIES.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown size={15} />

                  </div>

                </div>


                <div className="product-field">

                  <label>
                    Unit
                  </label>

                  <div className="product-select">

                    <select
                      name="unit"
                      value={
                        productForm.unit
                      }
                      onChange={
                        handleProductChange
                      }
                    >
                      {PRODUCT_UNITS.map(
                        (unit) => (
                          <option
                            key={unit}
                            value={unit}
                          >
                            {unit}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown size={15} />

                  </div>

                </div>


                <div className="product-field">

                  <label>
                    Price per Unit
                    <span>*</span>
                  </label>

                  <div className="input-prefix">

                    <span>₹</span>

                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        productForm.price
                      }
                      onChange={
                        handleProductChange
                      }
                      placeholder="0.00"
                    />

                  </div>

                  <div className="ai-price-row">
                    <button
                      type="button"
                      className="ai-price-button"
                      onClick={applyAIPriceRecommendation}
                    >
                      <BrainCircuit size={14} />
                      AI Recommended Price
                    </button>
                    {aiPriceHint && (
                      <span>
                        Suggested ₹{aiPriceHint.price}/{productForm.unit} · {aiPriceHint.source}
                      </span>
                    )}
                  </div>

                </div>


                <div className="product-field">

                  <label>
                    Available Quantity
                    <span>*</span>
                  </label>

                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      productForm.quantity
                    }
                    onChange={
                      handleProductChange
                    }
                    placeholder="0"
                  />

                </div>


                <div className="product-field full">

                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    rows={4}
                    value={
                      productForm.description
                    }
                    onChange={
                      handleProductChange
                    }
                    placeholder="Tell consumers about freshness, quality, harvesting details..."
                  />

                </div>

              </div>


              <style>{`
                .produce-select-trigger {
                  width: 100%;
                  min-height: 48px;
                  border: 0;
                  background: transparent;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  padding: 0 13px;
                  cursor: pointer;
                  text-align: left;
                  color: inherit;
                  font: inherit;
                }

                .produce-select-trigger > span:not(.produce-select-placeholder) {
                  flex: 1;
                }

                .produce-select-placeholder {
                  flex: 1;
                  opacity: 0.55;
                }

                .produce-select-chevron {
                  flex-shrink: 0;
                  transition: transform 160ms ease;
                }

                .produce-select-chevron.open {
                  transform: rotate(180deg);
                }

                .produce-options-menu {
                  position: absolute;
                  left: 0;
                  right: 0;
                  top: calc(100% + 6px);
                  z-index: 10001;
                  max-height: 310px;
                  overflow-y: auto;
                  padding: 6px;
                  background: #fff;
                  border: 1px solid rgba(28, 91, 61, 0.14);
                  border-radius: 12px;
                  box-shadow: 0 18px 45px rgba(20, 35, 27, 0.16);
                }

                .produce-option {
                  width: 100%;
                  border: 0;
                  background: transparent;
                  border-radius: 9px;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  padding: 8px 9px;
                  cursor: pointer;
                  color: inherit;
                  text-align: left;
                  font: inherit;
                }

                .produce-option:hover,
                .produce-option.active {
                  background: rgba(28, 91, 61, 0.07);
                }

                .produce-option-icon {
                  width: 38px;
                  height: 38px;
                  border-radius: 9px;
                  background: #f2f7f2;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                }

                .produce-option-text {
                  min-width: 0;
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                }

                .produce-option-text strong {
                  font-size: 14px;
                }

                .produce-option-text small {
                  font-size: 11px;
                  opacity: 0.58;
                }
              `}</style>

              {showVoiceReview && (
                <div
                  className="voice-review-overlay"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setShowVoiceReview(false);
                    }
                  }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                    background: "rgba(20, 35, 27, 0.48)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="voice-review-title"
                    style={{
                      width: "min(460px, 100%)",
                      background: "#fff",
                      borderRadius: "18px",
                      boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
                      overflow: "hidden",
                      animation: "voiceReviewPop 180ms ease-out",
                    }}
                  >
                    <div style={{
                      padding: "20px 20px 16px",
                      borderBottom: "1px solid rgba(28, 91, 61, 0.10)",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}>
                      <div>
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          fontSize: "11px",
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          opacity: 0.65,
                          marginBottom: "6px",
                        }}>
                          <Mic size={13} />
                          Voice Input
                        </div>
                        <h3
                          id="voice-review-title"
                          style={{ margin: 0, fontSize: "22px" }}
                        >
                          Review voice details
                        </h3>
                        <p style={{
                          margin: "6px 0 0",
                          fontSize: "13px",
                          opacity: 0.68,
                          lineHeight: 1.5,
                        }}>
                          Please verify the details before adding your produce.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowVoiceReview(false)}
                        title="Close review"
                        aria-label="Close voice review"
                        style={{
                          width: "34px",
                          height: "34px",
                          flexShrink: 0,
                          border: "none",
                          borderRadius: "9px",
                          background: "rgba(28, 91, 61, 0.07)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <div style={{ padding: "18px 20px 20px" }}>
                      <div style={{
                        padding: "12px 13px",
                        borderRadius: "11px",
                        background: "rgba(28, 91, 61, 0.055)",
                        border: "1px solid rgba(28, 91, 61, 0.12)",
                        marginBottom: "14px",
                      }}>
                        <small style={{ opacity: 0.62 }}>You said</small>
                        <strong style={{
                          display: "block",
                          marginTop: "4px",
                          fontSize: "13px",
                          lineHeight: 1.55,
                          fontWeight: 600,
                        }}>
                          “{voiceTranscript}”
                        </strong>
                      </div>

                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                      }}>
                        {[
                          ["Produce", productForm.name || "Not detected"],
                          ["Category", productForm.category || "Not detected"],
                          [
                            "Quantity",
                            productForm.quantity !== ""
                              ? `${productForm.quantity} ${productForm.unit}`
                              : "Not detected",
                          ],
                          [
                            "Price",
                            productForm.price !== ""
                              ? `₹${productForm.price} / ${productForm.unit}`
                              : "Not detected",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            style={{
                              padding: "12px",
                              border: "1px solid rgba(28, 91, 61, 0.11)",
                              borderRadius: "11px",
                            }}
                          >
                            <small style={{ opacity: 0.58 }}>{label}</small>
                            <strong style={{
                              display: "block",
                              marginTop: "4px",
                              fontSize: "14px",
                            }}>
                              {value}
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "9px",
                        marginTop: "18px",
                      }}>
                        <button
                          type="button"
                          className="cancel-product-button"
                          onClick={() => setShowVoiceReview(false)}
                        >
                          Edit Details
                        </button>

                        <button
                          type="button"
                          className="save-product-button"
                          onClick={() => {
                            setShowVoiceReview(false);
                            saveProduct({ preventDefault: () => {} });
                          }}
                          disabled={savingProduct}
                        >
                          {savingProduct
                            ? "Saving..."
                            : "Confirm & Add Produce"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <style>{`
                    @keyframes voiceReviewPop {
                      from {
                        opacity: 0;
                        transform: translateY(10px) scale(0.97);
                      }
                      to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                      }
                    }
                  `}</style>
                </div>
              )}

              <div className="product-modal-footer">

                <p>
                  {voiceTranscript
                    ? "Voice details filled automatically. Please check all fields before adding the produce."
                    : "Tip: tap the microphone and say: 10 quintals of tomatoes, 35 rupees per kilo."}
                </p>

                <p>
                  Quantity 0 automatically marks
                  the product as out of stock.
                </p>

                <div>

                  <button
                    type="button"
                    className="cancel-product-button"
                    onClick={() => {
                      setShowVoiceReview(false);
                      setShowProductModal(false);
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-product-button"
                    disabled={
                      savingProduct
                    }
                  >
                    {savingProduct
                      ? "Saving..."
                      : editingProduct
                      ? "Update Produce"
                      : "Add Produce"}
                  </button>

                </div>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="farmer-dashboard-footer">

        <div>
          <Leaf size={16} />

          <strong>
            AgriConnect
          </strong>
        </div>

        <span>
          Connecting farmers directly with consumers.
        </span>

      </footer>

    </div>
  );
}

export default IndividualFarmerDashboard;