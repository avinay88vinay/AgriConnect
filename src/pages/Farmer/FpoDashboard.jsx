import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  Truck,
  IndianRupee,
  Bell,
  Building2,
  Settings,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  X,
  Leaf,
  BarChart3,
  Boxes,
  UserRound,
  UserRoundPlus,
  IdCard,
  Sprout,
  Ruler,
  Mic,
  Languages,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  getDocs,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { signOut, signInAnonymously } from "firebase/auth";
import { auth, db } from "../../firebase";
import "./FpoDashboard.css";
const EMPTY_FARMER = {
  name: "",
  mobile: "",
  memberId: "",
  village: "",
  district: "",
  crop: "",
  landArea: "",
};

const EMPTY_PRODUCT = {
  productName: "",
  category: "",
  price: "",
  unit: "kg",
  stock: "",
  farmerId: "",
  location: "",
  description: "",
  voiceLanguage: "en-IN",
};

const NAV = [
  ["overview", "Overview", LayoutDashboard],
  ["farmers", "Farmers", Users],
  ["products", "Products", Package],
  ["orders", "Orders", ShoppingBag],
  ["delivery", "Delivery", Truck],
  ["earnings", "Earnings", IndianRupee],
  ["profile", "FPO Profile", Building2],
];



const PRODUCE_OPTIONS = [
  { name: "Tomato", category: "Vegetables", icon: "🍅" },
  { name: "Potato", category: "Vegetables", icon: "🥔" },
  { name: "Onion", category: "Vegetables", icon: "🧅" },
  { name: "Carrot", category: "Vegetables", icon: "🥕" },
  { name: "Brinjal", category: "Vegetables", icon: "🍆" },
  { name: "Cabbage", category: "Vegetables", icon: "🥬" },
  { name: "Cauliflower", category: "Vegetables", icon: "🥦" },
  { name: "Chilli", category: "Vegetables", icon: "🌶️" },
  { name: "Spinach", category: "Leafy Greens", icon: "🥬" },
  { name: "Rice", category: "Grains", icon: "🌾" },
  { name: "Wheat", category: "Grains", icon: "🌾" },
  { name: "Maize", category: "Grains", icon: "🌽" },
  { name: "Mango", category: "Fruits", icon: "🥭" },
  { name: "Banana", category: "Fruits", icon: "🍌" },
  { name: "Papaya", category: "Fruits", icon: "🧡" },
];

const DEFAULT_MARKET_PRICES = [
  { productName: "Tomato", marketPrice: 32 },
  { productName: "Potato", marketPrice: 28 },
  { productName: "Onion", marketPrice: 35 },
  { productName: "Carrot", marketPrice: 42 },
  { productName: "Brinjal", marketPrice: 38 },
  { productName: "Chilli", marketPrice: 55 },
];

const DEFAULT_DEMAND_FORECASTS = [
  { productName: "Tomato", demand: 120, trend: "up", confidence: "92%", recommendation: "Increase stock before weekend demand." },
  { productName: "Onion", demand: 95, trend: "up", confidence: "88%", recommendation: "Keep additional stock ready." },
  { productName: "Potato", demand: 82, trend: "stable", confidence: "85%", recommendation: "Maintain the current stock level." },
  { productName: "Carrot", demand: 68, trend: "up", confidence: "81%", recommendation: "Plan a small stock increase." },
];

const getProduce = (name = "") =>
  PRODUCE_OPTIONS.find((item) => item.name.toLowerCase() === name.toLowerCase());

const getAiRecommendedPrice = (productName, marketPrices = []) => {
  const name = String(productName || "").toLowerCase();
  const match = marketPrices.find(
    (m) => String(m.productName || m.crop || "").toLowerCase() === name
  );
  if (match) {
    return Number(match.recommendedPrice ?? match.marketPrice ?? match.modalPrice ?? 0);
  }
  const fallback = DEFAULT_MARKET_PRICES.find(
    (m) => String(m.productName).toLowerCase() === name
  );
  return Number(fallback?.marketPrice || 0);
};

const getOrderDisplayStatus = (order = {}) => {
  const overall = normalizeStatus(order.status || "");
  const delivery = normalizeStatus(order.deliveryStatus || "");
  const fpo = normalizeStatus(order.fpoStatus || "");
  if (["delivered", "completed"].includes(overall) || ["delivered", "completed"].includes(delivery)) return "delivered";
  if (["picked_up", "pickedup", "out_for_delivery", "in_transit"].includes(overall) || ["picked_up", "pickedup", "out_for_delivery", "in_transit"].includes(delivery)) return overall || delivery;
  return fpo || overall || "pending";
};

const getOrderAmount = (order = {}) =>
  Number(order.sellerAmount ?? order.fpoTotal ?? order.farmerAmount ?? order.totalAmount ?? order.total ?? 0);

const getOrderItems = (order = {}) => Array.isArray(order.items) ? order.items : [];

const text = (v, fallback = "—") => {
  if (v === undefined || v === null || String(v).trim() === "") return fallback;
  return String(v);
};

const money = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const dateText = (value) => {
  if (!value) return "Recently";
  try {
    const d = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
};

const normalizeStatus = (status = "") =>
  String(status).toLowerCase().replace(/[\s-]+/g, "_");

const getSellerId = (fpo) =>
  fpo?.id ||
  fpo?.uid ||
  auth.currentUser?.uid ||
  "";

function FPODashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [section, setSection] = useState("overview");
  const [authUid, setAuthUid] = useState(auth.currentUser?.uid || "");
  const [profile, setProfile] = useState({});
  const [farmers, setFarmers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [marketPrices, setMarketPrices] = useState([]);
  const [demandForecasts, setDemandForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [farmerSearch, setFarmerSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [showProductModal, setShowProductModal] = useState(false);
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState(null);
  const [farmerForm, setFarmerForm] = useState(EMPTY_FARMER);
  const [savingFarmer, setSavingFarmer] = useState(false);
  const [produceOpen, setProduceOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [savingProduct, setSavingProduct] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);

  // The registration screens currently pass organisation data through
  // React Router state. This dashboard accepts that data, while also
  // supporting a Firestore fpoProfiles/{uid} document when one exists.
  const routeOrganisation = location.state?.organisation || {};
  const routeMobile = location.state?.mobile || "";
  const currentUid = authUid || location.state?.uid || "";

  const sellerId = useMemo(
    () => currentUid || profile.uid || profile.id || "",
    [currentUid, profile]
  );

  // Firestore rules require authentication. If the FPO login did not create
  // a session, use Anonymous Auth for this prototype. The authenticated UID
  // becomes the FPO seller ID for FPO-owned collections.
  useEffect(() => {
    if (auth.currentUser) return;

    let cancelled = false;

    const ensureFpoSession = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("FPO authentication error:", e);
        if (!cancelled) {
          setError(
            "FPO session could not be created. Enable Anonymous sign-in in Firebase Authentication."
          );
        }
      }
    };

    ensureFpoSession();
    return () => { cancelled = true; };
  }, []);

  // Firebase auth can resolve after the first render. Keep the dashboard
  // bound to the real authenticated UID so realtime listeners start reliably.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthUid(user?.uid || location.state?.uid || "");
    });
    return unsubscribe;
  }, [location.state?.uid]);

  // Capture FPO GPS location after login. Location is stored separately so
  // it does not overwrite the verified organisation profile.
  useEffect(() => {
    if (!sellerId || !navigator.geolocation) return undefined;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Number(position.coords.accuracy || 0),
          capturedAt: serverTimestamp(),
        };
        setGpsLocation(coords);
        try {
          await setDoc(doc(db, "fpoLocations", sellerId), {
            fpoId: sellerId,
            ...coords,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          console.error("FPO GPS save error:", e);
        }
      },
      (e) => {
        console.warn("FPO GPS permission/location error:", e);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );

    return undefined;
  }, [sellerId]);

  // -----------------------------
  // PROFILE
  // -----------------------------
  useEffect(() => {
    setLoading(true);
    setError("");

    const profileId = currentUid || routeOrganisation.uid || "";
    if (!profileId) {
      setProfile({
        ...routeOrganisation,
        mobile: routeMobile || routeOrganisation.mobile || "",
      });
      setLoading(false);
      return undefined;
    }

    const unsubProfile = onSnapshot(
      doc(db, "fpoProfiles", profileId),
      (snap) => {
        const data = snap.exists() ? { id: snap.id, ...snap.data() } : {};
        setProfile({
          ...routeOrganisation,
          ...data,
          mobile: data.mobile || routeMobile || routeOrganisation.mobile || "",
          uid: data.uid || profileId,
        });
        setLoading(false);
      },
      () => {
        setProfile({
          ...routeOrganisation,
          mobile: routeMobile || routeOrganisation.mobile || "",
          uid: profileId,
        });
        setLoading(false);
      }
    );

    return () => unsubProfile();
  }, [currentUid, routeMobile, JSON.stringify(routeOrganisation)]);

  // Registration currently keeps organisation/member data in the FPO
  // registration flow. If an approved application exists, hydrate the
  // dashboard from it as a fallback as well.
  useEffect(() => {
    const mobile = profile.mobile || routeMobile || routeOrganisation.mobile;
    if (!mobile) return undefined;

    let cancelled = false;
    const loadApplication = async () => {
      try {
        const queries = [
          getDocs(query(collection(db, "fpoApplications"), where("mobile", "==", mobile))),
          getDocs(query(collection(db, "fpoApplications"), where("organisation.mobile", "==", mobile))),
        ];

        if (authUid) {
          queries.push(
            getDocs(query(collection(db, "fpoApplications"), where("uid", "==", authUid)))
          );
        }

        const snapshots = await Promise.all(queries);
        if (cancelled) return;

        const rowMap = new Map();
        snapshots.flatMap((snap) => snap.docs).forEach((d) => {
          rowMap.set(d.id, { id: d.id, ...d.data() });
        });

        const rows = [...rowMap.values()];
        if (!rows.length) return;
        const approved = rows.find((r) => r.status === "approved") || rows[0];
        if (!approved) return;
        setProfile((previous) => ({
          ...previous,
          ...approved.organisation,
          ...approved,
          uid: approved.uid || approved.fpoId || previous.uid || approved.id,
          mobile: approved.mobile || approved.organisation?.mobile || mobile,
        }));
        if (Array.isArray(approved.farmers) && approved.farmers.length) {
          setFarmers((previous) => {
            const map = new Map(previous.map((x) => [x.memberId || x.id, x]));
            approved.farmers.forEach((f) => map.set(f.memberId || f.id || f.mobile, { ...f, fpoId: sellerId }));
            return [...map.values()];
          });
        }
      } catch (e) {
        // fpoApplications is optional in the current prototype.
      }
    };
    loadApplication();
    return () => { cancelled = true; };
  }, [profile.mobile, routeMobile, routeOrganisation.mobile, sellerId]);

  useEffect(() => {
    if (!sellerId) return undefined;
    return onSnapshot(
      doc(db, "fpoLocations", sellerId),
      (snap) => {
        if (snap.exists()) setGpsLocation(snap.data());
      },
      () => {}
    );
  }, [sellerId]);

  // -----------------------------
  // REALTIME DATA
  // -----------------------------
  useEffect(() => {
    if (!sellerId) return undefined;

    const unsubscribers = [];

    // Member farmers: support both the intended fpoFarmers collection
    // and the generic farmers collection used by existing prototypes.
    const farmerQueries = [
      query(collection(db, "fpoFarmers"), where("fpoId", "==", sellerId)),
      query(collection(db, "farmers"), where("fpoId", "==", sellerId)),
    ];

    let fpoFarmerData = [];
    let genericFarmerData = [];

    const publishFarmers = () => {
      const routeFarmers = Array.isArray(location.state?.farmers) ? location.state.farmers : [];
      const map = new Map();
      [...routeFarmers, ...fpoFarmerData, ...genericFarmerData].forEach((item) => {
        const key = item.id || item.memberId || `${item.mobile}-${item.name}`;
        map.set(key, { ...item, fpoId: item.fpoId || sellerId });
      });
      setFarmers([...map.values()]);
    };

    farmerQueries.forEach((q, index) => {
      unsubscribers.push(
        onSnapshot(
          q,
          (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            if (index === 0) fpoFarmerData = rows;
            else genericFarmerData = rows;
            publishFarmers();
          },
          () => {
            if (index === 0) fpoFarmerData = [];
            else genericFarmerData = [];
            publishFarmers();
          }
        )
      );
    });

    // Shared products collection. This is the same source used by the
    // consumer dashboard, so FPO product changes propagate automatically.
    unsubscribers.push(
      onSnapshot(
        query(collection(db, "products"), where("sellerId", "==", sellerId)),
        (snap) =>
          setProducts(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          ),
        () => setProducts([])
      )
    );

    // Keep seller-side and parent order records separate, then merge them by
    // parentOrderId. This prevents duplicate rows and lets delivery updates
    // on the parent order flow back into the FPO dashboard in realtime.
    let sellerOrderRows = [];
    let parentOrderRows = [];
    const publishOrders = () => {
      const parentById = new Map(parentOrderRows.map((row) => [row.id, row]));
      const merged = sellerOrderRows.map((seller) => {
        const parent = parentById.get(seller.parentOrderId) || parentById.get(seller.id) || {};
        return {
          ...parent,
          ...seller,
          id: seller.id,
          parentOrderId: seller.parentOrderId || parent.id || seller.id,
          status: parent.status || seller.status,
          deliveryStatus: parent.deliveryStatus || seller.deliveryStatus,
          deliveryAgentId: parent.deliveryAgentId || seller.deliveryAgentId,
          deliveryAgentName: parent.deliveryAgentName || seller.deliveryAgentName,
          deliveryAgentMobile: parent.deliveryAgentMobile || seller.deliveryAgentMobile,
          updatedAt: parent.updatedAt || seller.updatedAt,
        };
      });
      const sellerParentIds = new Set(merged.map((row) => row.parentOrderId || row.id));
      parentOrderRows.forEach((parent) => {
        if (parent.fpoIds?.includes?.(sellerId) && !sellerParentIds.has(parent.id)) {
          merged.push(parent);
        }
      });
      setOrders(merged.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    };

    unsubscribers.push(
      onSnapshot(
        query(collection(db, "fpoOrders"), where("fpoId", "==", sellerId)),
        (snap) => {
          sellerOrderRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          publishOrders();
        },
        () => { sellerOrderRows = []; publishOrders(); }
      )
    );

    unsubscribers.push(
      onSnapshot(
        query(collection(db, "orders"), where("fpoIds", "array-contains", sellerId)),
        (snap) => {
          parentOrderRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          publishOrders();
        },
        () => { parentOrderRows = []; publishOrders(); }
      )
    );

    unsubscribers.push(
      onSnapshot(
        query(collection(db, "fpoNotifications"), where("fpoId", "==", sellerId)),
        (snap) =>
          setNotifications(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          ),
        () => setNotifications([])
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, "deliveryAgents"),
        (snap) =>
          setDeliveryAgents(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          ),
        () => setDeliveryAgents([])
      )
    );

    // Optional live market-price source. If not populated, the UI derives
    // a useful local comparison from product marketPrice fields.
    unsubscribers.push(
      onSnapshot(
        collection(db, "marketPrices"),
        (snap) =>
          setMarketPrices(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          ),
        () => setMarketPrices([])
      )
    );

    // Optional AI forecast source. If not populated, forecast cards are
    // calculated from current product/order data without fake API calls.
    unsubscribers.push(
      onSnapshot(
        query(collection(db, "demandForecasts"), where("sellerId", "==", sellerId)),
        (snap) =>
          setDemandForecasts(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          ),
        () => setDemandForecasts([])
      )
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [sellerId]);

  // -----------------------------
  // DERIVED DATA
  // -----------------------------
  const activeProducts = products.filter(
    (p) => p.status !== "inactive" && p.active !== false
  );

  const pendingOrders = orders.filter((o) =>
    ["pending", "new", "placed", "confirmed", "accepted", "preparing"].includes(getOrderDisplayStatus(o))
  );

  const completedOrders = orders.filter((o) =>
    ["completed", "delivered"].includes(getOrderDisplayStatus(o))
  );

  const totalSales = completedOrders.reduce(
    (sum, order) => sum + getOrderAmount(order),
    0
  );

  const unreadNotifications = notifications.filter(
    (n) => n.read !== true
  ).length;

  const farmerById = useMemo(() => {
    const map = {};
    farmers.forEach((farmer) => {
      map[farmer.id] = farmer;
      if (farmer.memberId) map[farmer.memberId] = farmer;
    });
    return map;
  }, [farmers]);

  const farmerProducts = useMemo(() => {
    const map = {};
    products.forEach((product) => {
      const key = product.farmerId || product.memberId || "shared";
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [products]);

  const filteredProducts = products.filter((p) =>
    `${p.productName || ""} ${p.category || ""}`
      .toLowerCase()
      .includes(productSearch.toLowerCase())
  );

  const groupedProducts = useMemo(() => {
    const groups = {};
    filteredProducts.forEach((product) => {
      const category = product.category || getProduce(product.productName)?.category || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(product);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProducts]);

  const filteredFarmers = farmers.filter((f) =>
    `${f.name || ""} ${f.mobile || ""} ${f.memberId || ""} ${f.crop || ""}`
      .toLowerCase()
      .includes(farmerSearch.toLowerCase())
  );

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "all") return true;
    return normalizeStatus(o.fpoStatus || o.status) === orderFilter;
  });

  // -----------------------------
  // MARKET PRICE + AI FORECAST
  // -----------------------------
  const getMarketPrice = (product) => {
    const name = String(product.productName || "").toLowerCase();
    const exact = marketPrices.find(
      (m) => String(m.productName || m.crop || "").toLowerCase() === name
    );
    const fallback = DEFAULT_MARKET_PRICES.find(
      (m) => String(m.productName).toLowerCase() === name
    );
    return Number(
      exact?.marketPrice ??
      exact?.modalPrice ??
      exact?.recommendedPrice ??
      product.marketPrice ??
      product.mandiPrice ??
      product.marketRate ??
      fallback?.marketPrice ??
      0
    );
  };

  const forecastRows = useMemo(() => {
    if (demandForecasts.length) {
      return demandForecasts.map((f) => ({
        productName: f.productName || f.crop || "Product",
        demand: Number(f.predictedDemand ?? f.expectedDemand ?? f.demand ?? 0),
        trend: f.trend || (Number(f.predictedDemand || 0) > Number(f.currentDemand || 0) ? "up" : "stable"),
        confidence: f.confidence ?? "AI",
        recommendation: f.recommendation || "Review stock before the next demand cycle.",
      }));
    }

    if (activeProducts.length) {
      return activeProducts.slice(0, 6).map((product) => {
        const productOrders = orders.filter((o) =>
          JSON.stringify(o).toLowerCase().includes(
            String(product.productName || "").toLowerCase()
          )
        ).length;
        const demand = Math.max(
          Number(productOrders) * 5,
          Math.round(Number(product.stock || 0) * 0.6)
        );
        return {
          productName: product.productName || "Product",
          demand,
          trend: demand > Number(product.stock || 0) ? "up" : "stable",
          confidence: "Live",
          recommendation:
            demand > Number(product.stock || 0)
              ? "Increase stock"
              : "Stock level looks healthy",
        };
      });
    }

    return DEFAULT_DEMAND_FORECASTS;
  }, [demandForecasts, activeProducts, orders]);

  // -----------------------------
  // FARMER CRUD
  // -----------------------------
  const openAddFarmer = () => {
    setEditingFarmer(null);
    setFarmerForm(EMPTY_FARMER);
    setShowFarmerModal(true);
    setError("");
  };

  const openEditFarmer = (farmer) => {
    setEditingFarmer(farmer);
    setFarmerForm({
      name: farmer.name || "",
      mobile: farmer.mobile || "",
      memberId: farmer.memberId || "",
      village: farmer.village || "",
      district: farmer.district || "",
      crop: farmer.crop || farmer.mainCrop || "",
      landArea: farmer.landArea ?? "",
    });
    setShowFarmerModal(true);
    setError("");
  };

  const saveFarmer = async (event) => {
    event.preventDefault();

    if (!sellerId) {
      setError("FPO session is not available. Please login again.");
      return;
    }

    const required = [
      "name",
      "mobile",
      "memberId",
      "village",
      "district",
      "crop",
      "landArea",
    ];

    if (required.some((key) => !String(farmerForm[key] ?? "").trim())) {
      setError("Please complete all farmer details.");
      return;
    }

    if (!/^\d{10}$/.test(String(farmerForm.mobile))) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSavingFarmer(true);
    setError("");

    const payload = {
      name: farmerForm.name.trim(),
      mobile: farmerForm.mobile.trim(),
      memberId: farmerForm.memberId.trim(),
      village: farmerForm.village.trim(),
      district: farmerForm.district.trim(),
      crop: farmerForm.crop.trim(),
      mainCrop: farmerForm.crop.trim(),
      landArea: Number(farmerForm.landArea),
      fpoId: sellerId,
      fpoName: profile.fpoName || routeOrganisation.fpoName || "",
      status: editingFarmer?.status || "registered",
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingFarmer?.id) {
        await updateDoc(doc(db, "fpoFarmers", editingFarmer.id), payload);
      } else {
        const snap = await getDocs(
          query(collection(db, "fpoFarmers"), where("fpoId", "==", sellerId))
        );

        const duplicate = snap.docs.find((d) => {
          const data = d.data();
          return (
            data.memberId === payload.memberId ||
            data.mobile === payload.mobile
          );
        });

        if (duplicate) {
          await updateDoc(doc(db, "fpoFarmers", duplicate.id), {
            ...payload,
            createdAt: duplicate.data().createdAt || serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, "fpoFarmers"), {
            ...payload,
            createdAt: serverTimestamp(),
          });
        }
      }

      setShowFarmerModal(false);
      setEditingFarmer(null);
      setFarmerForm(EMPTY_FARMER);
    } catch (firebaseError) {
      console.error("FPO farmer save error:", firebaseError);
      setError(
        "Unable to save farmer. Check Firestore permissions for fpoFarmers."
      );
    } finally {
      setSavingFarmer(false);
    }
  };

  const removeFarmer = async (farmer) => {
    if (!farmer?.id) return;

    if (
      !window.confirm(
        `Remove ${farmer.name || "this farmer"} from the FPO?`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "fpoFarmers", farmer.id));
    } catch (firebaseError) {
      console.error("FPO farmer delete error:", firebaseError);
      setError("Unable to remove farmer. Check Firestore permissions.");
    }
  };

  // -----------------------------
  // PRODUCT CRUD
  // -----------------------------
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);
    setProduceOpen(false);
    setShowProductModal(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      productName: product.productName || "",
      category: product.category || "",
      price: product.price ?? "",
      unit: product.unit || "kg",
      stock: product.stock ?? "",
      farmerId: product.farmerId || "",
      location: product.location || profile.village || "",
      description: product.description || "",
    });
    setShowProductModal(true);
  };

  const VOICE_PRODUCE_ALIASES = {
    tomato: "Tomato", tomatoes: "Tomato", "టమాటా": "Tomato", "టమాటాలు": "Tomato",
    potato: "Potato", potatoes: "Potato", "బంగాళాదుంప": "Potato",
    onion: "Onion", onions: "Onion", "ఉల్లిపాయ": "Onion", "ఉల్లిపాయలు": "Onion",
    carrot: "Carrot", "క్యారెట్": "Carrot",
    brinjal: "Brinjal", eggplant: "Brinjal", "వంకాయ": "Brinjal",
    cabbage: "Cabbage", "క్యాబేజీ": "Cabbage",
    cauliflower: "Cauliflower", "కాలీఫ్లవర్": "Cauliflower",
    chilli: "Chilli", chili: "Chilli", "మిరప": "Chilli", "మిరపకాయ": "Chilli",
    spinach: "Spinach", "పాలకూర": "Spinach",
    rice: "Rice", "బియ్యం": "Rice", wheat: "Wheat", "గోధుమ": "Wheat",
    maize: "Maize", corn: "Maize", "మొక్కజొన్న": "Maize",
    mango: "Mango", "మామిడి": "Mango", banana: "Banana", "అరటి": "Banana",
    papaya: "Papaya", "బొప్పాయి": "Papaya",
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = productForm.voiceLanguage === "te-IN" ? "te-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!spoken) return;
      const clean = spoken.toLowerCase().replace(/[.,!?]/g, "").trim();
      const alias = VOICE_PRODUCE_ALIASES[clean];
      const match = getProduce(alias || spoken);

      setProductForm((previous) => ({
        ...previous,
        productName: match?.name || alias || spoken,
        category: match?.category || previous.category,
      }));
      setError("");
    };

    recognition.onerror = () => {
      setError("Could not understand the voice input. Please try again.");
    };
    recognition.start();
  };

  const applyProduce = (name) => {
    const produce = getProduce(name);
    setProductForm((previous) => ({
      ...previous,
      productName: produce?.name || name,
      category: produce?.category || previous.category,
    }));
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!sellerId) {
      setError("FPO session is not available. Please login again.");
      return;
    }

    if (!productForm.productName.trim() || productForm.price === "" || productForm.stock === "") {
      setError("Please enter product name, price and stock.");
      return;
    }

    setSavingProduct(true);
    setError("");

    const farmer = farmerById[productForm.farmerId];

    const payload = {
      productName: productForm.productName.trim(),
      category: productForm.category.trim(),
      price: Number(productForm.price),
      unit: productForm.unit,
      stock: Number(productForm.stock),
      sellerId,
      sellerType: "fpo",
      fpoId: sellerId,
      status: editingProduct?.status || "active",
      location: productForm.location.trim() || profile.village || profile.district || "",
      description: productForm.description.trim(),
      farmerId: farmer?.id || productForm.farmerId || "",
      farmerName: farmer?.name || "",
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), payload);
      } else {
        const duplicateQuery = query(
          collection(db, "products"),
          where("sellerId", "==", sellerId),
          where("farmerId", "==", payload.farmerId),
          where("productName", "==", payload.productName)
        );
        const duplicateSnap = await getDocs(duplicateQuery);
        const sameUnit = duplicateSnap.docs.find((d) => (d.data().unit || "kg") === payload.unit);
        if (sameUnit) {
          await updateDoc(doc(db, "products", sameUnit.id), { ...payload, createdAt: sameUnit.data().createdAt || serverTimestamp() });
        } else {
          await addDoc(collection(db, "products"), {
            ...payload,
            createdAt: serverTimestamp(),
          });
        }
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm(EMPTY_PRODUCT);
    } catch (firebaseError) {
      console.error("FPO product save error:", firebaseError);
      setError("Unable to save product. Please check Firestore permissions.");
    } finally {
      setSavingProduct(false);
    }
  };

  const toggleProduct = async (product) => {
    try {
      await updateDoc(doc(db, "products", product.id), {
        status: product.status === "inactive" ? "active" : "inactive",
        updatedAt: serverTimestamp(),
      });
    } catch (firebaseError) {
      console.error(firebaseError);
      setError("Unable to update product status.");
    }
  };

  const removeProduct = async (product) => {
    if (!window.confirm(`Remove ${product.productName || "this product"}?`)) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
    } catch (firebaseError) {
      console.error(firebaseError);
      setError("Unable to remove product.");
    }
  };

  // Create one platform delivery request when an FPO order becomes ready.
  // Delivery partners listen to the shared deliveryRequests collection, so
  // no partner-specific eligibility is required to make the order visible.
  const createFpoDeliveryRequest = async (order) => {
    if (!order?.id || !sellerId) return;

    const parentOrderId = order.parentOrderId || order.id;
    const requestId = `${sellerId}_${parentOrderId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const requestRef = doc(db, "deliveryRequests", requestId);
    const existing = await getDocs(
      query(collection(db, "deliveryRequests"), where("orderId", "==", parentOrderId))
    );

    const existingOpen = existing.docs.find((item) => {
      const data = item.data();
      return (data.sellerId === sellerId || data.fpoId === sellerId) &&
        ["open", "request_open", "assigned", "picked_up", "in_transit"].includes(
          normalizeStatus(data.status || data.requestStatus || data.deliveryStatus)
        );
    });
    if (existingOpen) return { id: existingOpen.id, ...existingOpen.data() };

    const items = getOrderItems(order);
    const totalQuantity = items.reduce(
      (sum, item) => sum + Number(item.quantity ?? item.qty ?? 0),
      0
    );
    const totalWeightKg = Number(
      order.totalWeightKg ??
      order.weightKg ??
      items.reduce((sum, item) => {
        const quantity = Number(item.quantity ?? item.qty ?? 0);
        const unit = String(item.unit || "kg").toLowerCase();
        return sum + (unit.includes("g") && !unit.includes("kg") ? quantity / 1000 : quantity);
      }, 0)
    );

    const pickupLocation = gpsLocation
      ? {
          latitude: Number(gpsLocation.latitude),
          longitude: Number(gpsLocation.longitude),
        }
      : null;
    const pickupAddress =
      profile.address ||
      profile.fullAddress ||
      [profile.village, profile.district, profile.state].filter(Boolean).join(", ") ||
      "FPO pickup location";
    const deliveryAddress =
      order.deliveryAddress?.address ||
      order.deliveryAddress?.fullAddress ||
      order.deliveryAddress ||
      order.consumerAddress ||
      "Consumer delivery address";

    const requestData = {
      orderId: parentOrderId,
      parentOrderId,
      sellerOrderId: order.fpoOrderId || order.id,
      sellerOrderCollection: "fpoOrders",
      sellerType: "fpo",
      sellerId,
      fpoId: sellerId,
      fpoName: profile.fpoName || routeOrganisation.fpoName || "FPO",
      farmerId: sellerId,
      farmerName: profile.fpoName || routeOrganisation.fpoName || "FPO",
      farmerMobile: profile.mobile || routeMobile || routeOrganisation.mobile || "",
      sellerName: profile.fpoName || routeOrganisation.fpoName || "FPO",
      pickupLocation,
      pickupAddress,
      consumerId: order.consumerId || order.customerId || order.consumer?.id || order.customer?.id || "",
      consumerName: order.consumerName || order.customerName || order.consumer?.fullName || order.consumer?.name || "Consumer",
      consumerMobile: order.consumerMobile || order.customerMobile || order.consumer?.mobile || order.customer?.mobile || "",
      deliveryLocation: order.deliveryLocation || order.consumerLocation || null,
      deliveryAddress,
      deliveryOtp: order.deliveryOtp || order.consumerDeliveryOtp || order.consumer?.deliveryOtp || "",
      items,
      totalQuantity,
      totalWeightKg,
      orderAmount: getOrderAmount(order),
      status: "open",
      requestStatus: "open",
      deliveryStatus: "request_open",
      eligiblePartnerIds: [],
      notifiedPartnerIds: [],
      deliveryAgentId: null,
      assignedDeliveryAgentId: null,
      deliveryAgentName: "",
      deliveryAgentMobile: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(requestRef, requestData, { merge: false });

    // Inform every registered delivery partner. This notification is separate
    // from visibility: even an offline partner will see the request later.
    if (deliveryAgents.length) {
      await Promise.all(
        deliveryAgents.map((partner) =>
          addDoc(collection(db, "deliveryNotifications"), {
            deliveryAgentId: partner.id,
            deliveryRequestId: requestRef.id,
            orderId: parentOrderId,
            sellerType: "fpo",
            sellerId,
            fpoId: sellerId,
            fpoName: requestData.fpoName,
            pickupAddress,
            deliveryAddress,
            consumerName: requestData.consumerName,
            totalWeightKg,
            totalQuantity,
            status: "new",
            read: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        )
      );
    }

    return { ...requestData, id: requestRef.id };
  };

  // FPO controls the order only up to ready_for_pickup.
  // Keep both seller-side `status` and `fpoStatus` in sync so the FPO
  // dashboard, delivery flow and consumer timeline can read the same state.
  const updateFpoOrderStatus = async (order, nextStatus) => {
    const allowed = ["accepted", "preparing", "ready_for_pickup"];
    if (!allowed.includes(nextStatus) || !sellerId || !order?.id) return;

    const data = {
      fpoStatus: nextStatus,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      // Parent order is the consumer-facing order. Seller order can have a
      // different document ID, so always use parentOrderId when available.
      const parentOrderId = order.parentOrderId || order.id;
      await updateDoc(doc(db, "orders", parentOrderId), data);

      // Seller-side FPO order: keep its status in sync.
      const fpoOrderId = order.fpoOrderId || order.id;
      try {
        await updateDoc(doc(db, "fpoOrders", fpoOrderId), data);
      } catch (e) {
        console.warn("FPO seller-order update skipped:", e);
      }

      if (nextStatus === "ready_for_pickup") {
        await createFpoDeliveryRequest({ ...order, ...data });
      }

      await addDoc(collection(db, "fpoNotifications"), {
        fpoId: sellerId,
        title: "Order status updated",
        message: `Order ${order.id.slice(0, 8)} is now ${nextStatus.replaceAll("_", " ")}.`,
        type: "order",
        orderId: order.parentOrderId || order.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (firebaseError) {
      console.error("FPO order status error:", firebaseError);
      setError(
        firebaseError?.code === "permission-denied"
          ? "Order update blocked by Firestore rules. Publish the latest FPO rules."
          : "Unable to update order status. Please try again."
      );
    }
  };

  const markNotificationRead = async (notification) => {
    try {
      await updateDoc(doc(db, "fpoNotifications", notification.id), {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (firebaseError) {
      console.error(firebaseError);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth.currentUser) await signOut(auth);
    } finally {
      navigate("/login/farmer/fpo");
    }
  };

  const SECTION_TITLES = {
    overview: "Overview", farmers: "Farmers", products: "Products", orders: "Orders",
    delivery: "Delivery", earnings: "Earnings", notifications: "Notifications",
    profile: "FPO Profile", settings: "Settings",
  };
  const sectionTitle = SECTION_TITLES[section] || "Overview";

  return (
    <div className="fpo-dashboard">
      {showSidebar && (
        <button
          className="fpo-sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setShowSidebar(false)}
        />
      )}
      <aside className={`fpo-sidebar ${showSidebar ? "open" : ""}`}>
        <div className="fpo-brand">
          <div className="fpo-brand-mark"><Leaf size={24} /></div>
          <div>
            <strong>AgriConnect</strong>
            <span>FPO Portal</span>
          </div>
        </div>

        <nav className="fpo-nav">
          {NAV.map(([key, label, Icon]) => (
            <button
              key={key}
              className={`fpo-nav-item ${section === key ? "active" : ""}`}
              onClick={() => { setSection(key); setShowSidebar(false); }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "notifications" && unreadNotifications > 0 && (
                <b>{unreadNotifications}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="fpo-sidebar-bottom">
          <div className="fpo-mini-profile">
            <div className="fpo-avatar"><Building2 size={18} /></div>
            <div>
              <strong>{text(profile.fpoName, "Your FPO")}</strong>
              <span>{text(profile.district, "FPO Account")}</span>
            </div>
          </div>
          <button className="fpo-logout" onClick={handleLogout}>
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      <main className="fpo-main">
        <header className="fpo-topbar">
          <div className="fpo-topbar-title">
            <button
              className={`fpo-menu-toggle ${showSidebar ? "active" : ""}`}
              onClick={() => setShowSidebar((value) => !value)}
              title="Menu"
              aria-label={showSidebar ? "Close dashboard menu" : "Open dashboard menu"}
              aria-expanded={showSidebar}
            >
              <span></span><span></span><span></span>
            </button>

            <div className="fpo-topbar-brand">
              <span className="fpo-topbar-brand-icon"><Leaf size={17} /></span>
              <span>
                <strong>AgriConnect</strong>
                <small>FPO Portal</small>
              </span>
            </div>

            <div className="fpo-topbar-heading">
              <p className="fpo-eyebrow">FPO MANAGEMENT</p>
              <h1>{sectionTitle}</h1>
            </div>
          </div>
          <div className="fpo-top-actions">
            <span className="fpo-live"><span /> Live Data</span>
            <button className="fpo-icon-btn fpo-notification-btn" onClick={() => { setSection("notifications"); setShowSidebar(false); }} title="Notifications">
              <Bell size={18} />
              {unreadNotifications > 0 && <b>{unreadNotifications > 9 ? "9+" : unreadNotifications}</b>}
            </button>
            <div className="fpo-profile-wrap">
              <button className="fpo-profile-menu" onClick={() => setShowProfileMenu((value) => !value)} title="FPO Profile">
                <span className="fpo-header-avatar"><Building2 size={16} /></span>
                <span className="fpo-header-profile-text">
                  <strong>{text(profile.fpoName, "FPO")}</strong>
                  <small>{text(profile.authorizedPerson, "Profile")}</small>
                </span>
                <ChevronDown size={15} />
              </button>

              {showProfileMenu && (
                <div className="fpo-profile-dropdown">
                  <div className="fpo-profile-dropdown-head">
                    <div className="fpo-profile-dropdown-avatar"><Building2 size={20} /></div>
                    <div>
                      <strong>{text(profile.fpoName, "Your FPO")}</strong>
                      <span>{text(profile.authorizedPerson, "FPO Account")}</span>
                    </div>
                  </div>
                  <div className="fpo-profile-dropdown-actions">
                    <button type="button" onClick={() => { setSection("profile"); setShowProfileMenu(false); }}>
                      <UserRound size={16} /> Profile
                    </button>
                    <button type="button" onClick={() => { setSection("settings"); setShowProfileMenu(false); }}>
                      <Settings size={16} /> Settings
                    </button>
                    <button type="button" className="logout" onClick={() => { setShowProfileMenu(false); handleLogout(); }}>
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button className="fpo-icon-btn" onClick={() => window.location.reload()} title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {error && (
          <div className="fpo-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={16} /></button>
          </div>
        )}

        {section === "overview" && (
          <section className="fpo-page-content">
            <div className="fpo-hero">
              <img className="fpo-hero-image" src="/images/fpo-hero.png" alt="FPO farmers working together" />
              <div className="fpo-hero-overlay" />
              <div className="fpo-hero-copy">
                <span className="fpo-hero-kicker">AGRICONNECT • FPO MANAGEMENT</span>
                <h2>Grow together.<br />Sell smarter.</h2>
                <p>Manage member farmers, products, orders and earnings from one place — with AI-assisted demand insights and market intelligence.</p>
                <div className="fpo-hero-chips"><span>AI Demand Forecast</span><span>Live Orders</span><span>Platform Delivery</span></div>
              </div>
            </div>

            <div className="fpo-stats-grid">
              <Stat icon={Users} label="Member Farmers" value={farmers.length} />
              <Stat icon={Package} label="Active Products" value={activeProducts.length} />
              <Stat icon={ShoppingBag} label="Pending Orders" value={pendingOrders.length} />
              <Stat icon={IndianRupee} label="Completed Sales" value={money(totalSales)} />
            </div>

            <div className="fpo-two-col">
              <section className="fpo-card ai-card">
                <div className="fpo-card-head">
                  <div>
                    <span className="fpo-section-label">AI INSIGHT</span>
                    <h3><Sparkles size={18} /> Demand Forecasting</h3>
                  </div>
                  <span className="fpo-ai-badge">AI</span>
                </div>
                <p className="fpo-card-sub">
                  Forecast signals help the FPO plan stock before demand rises.
                </p>
                <div className="forecast-list">
                  {forecastRows.length === 0 ? (
                    <Empty icon={Sparkles} title="No forecast yet" text="Add products and order data to generate demand signals." />
                  ) : (
                    forecastRows.map((row, index) => (
                      <div className="forecast-row" key={`${row.productName}-${index}`}>
                        <div className="forecast-icon"><SproutIcon /></div>
                        <div className="forecast-main">
                          <strong>{row.productName}</strong>
                          <span>Expected demand: {row.demand || "—"} units</span>
                        </div>
                        <div className={`forecast-trend ${row.trend === "up" ? "up" : "stable"}`}>
                          {row.trend === "up" ? <TrendingUp size={16} /> : <BarChart3 size={15} />}
                          {row.trend}
                        </div>
                        <small>{row.recommendation}</small>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="fpo-card">
                <div className="fpo-card-head">
                  <div>
                    <span className="fpo-section-label">PRICE INTELLIGENCE</span>
                    <h3><IndianRupee size={18} /> Market Price</h3>
                  </div>
                  <span className="fpo-data-badge">LIVE / DATA</span>
                </div>
                <p className="fpo-card-sub">
                  Compare your selling price with the available market-rate data.
                </p>
                <div className="market-list">
                  {(activeProducts.length ? activeProducts.slice(0, 6) : DEFAULT_MARKET_PRICES).map((item, index) => {
                    const product = activeProducts.length ? item : { productName: item.productName, price: 0, unit: "kg" };
                    const market = activeProducts.length ? getMarketPrice(product) : item.marketPrice;
                    const own = Number(product.price || 0);
                    const difference = activeProducts.length ? market - own : 0;
                    return (
                      <div className="market-row" key={`${product.productName}-${index}`}>
                        <div>
                          <strong>{product.productName}</strong>
                          <span>{activeProducts.length ? `Your price: ${money(own)}/${product.unit || "unit"}` : "Current market reference"}</span>
                        </div>
                        <div className="market-price">
                          <strong>{money(market)}</strong>
                          <span>Market</span>
                        </div>
                        <div className={`price-diff ${difference >= 0 ? "positive" : "negative"}`}>
                          {activeProducts.length ? (
                            <>
                              {difference >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {money(Math.abs(difference))}
                            </>
                          ) : <span>Demo</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="fpo-card">
              <div className="fpo-card-head">
                <div>
                  <span className="fpo-section-label">OPERATIONS</span>
                  <h3>Recent Orders</h3>
                </div>
                <button className="fpo-link-btn" onClick={() => setSection("orders")}>View all <ChevronRight size={15} /></button>
              </div>
              <OrderTable orders={orders.slice(0, 5)} onStatus={updateFpoOrderStatus} />
            </section>
          </section>
        )}

        {section === "farmers" && (
          <section className="fpo-page-content">
            <div className="fpo-section-toolbar">
              <div>
                <h2>Member Farmers</h2>
                <p>Manage the farmers registered under this FPO.</p>
              </div>
              <div className="fpo-toolbar-actions">
                <div className="fpo-search"><Search size={17} /><input value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} placeholder="Search farmer..." /></div>
                <button className="fpo-primary-btn" onClick={openAddFarmer}><UserRoundPlus size={17} /> Add Farmer</button>
              </div>
            </div>
            <div className="farmer-grid">
              {filteredFarmers.map((farmer) => (
                <article className="farmer-card" key={farmer.id || farmer.memberId}>
                  <div className="farmer-card-top">
                    <div className="farmer-avatar"><UserRound size={21} /></div>
                    <div>
                      <h3>{text(farmer.name, "Member Farmer")}</h3>
                      <span>{text(farmer.memberId, "No Member ID")}</span>
                    </div>
                  </div>
                  <div className="farmer-info-grid">
                    <InfoItem icon={Phone} label="Mobile" value={text(farmer.mobile)} />
                    <InfoItem icon={MapPin} label="Village" value={text(farmer.village)} />
                    <InfoItem icon={MapPin} label="District" value={text(farmer.district)} />
                    <InfoItem icon={Leaf} label="Main Crop" value={text(farmer.crop || farmer.mainCrop)} />
                    <InfoItem icon={BarChart3} label="Land Area" value={`${text(farmer.landArea, "0")} acres`} />
                    <InfoItem icon={Package} label="Products" value={farmerProducts[farmer.id] || farmerProducts[farmer.memberId] || 0} />
                  </div>
                  <div className="farmer-card-footer">
                    <span className="member-status"><CheckCircle2 size={13} /> {text(farmer.status, "Registered")}</span>
                    <span>{dateText(farmer.createdAt || farmer.registeredAt)}</span>
                  </div>
                  <div className="farmer-card-actions">
                    <button type="button" onClick={() => openEditFarmer(farmer)}><Pencil size={14} /> Edit</button>
                    <button type="button" className="danger" onClick={() => removeFarmer(farmer)}><Trash2 size={14} /> Remove</button>
                  </div>
                  <div className="farmer-products-line">
                    {products.filter((p) => p.farmerId === farmer.id || p.memberId === farmer.memberId).slice(0, 3).map((p) => <span key={p.id}>{p.productName}</span>)}
                    {!products.some((p) => p.farmerId === farmer.id || p.memberId === farmer.memberId) && <em>No products linked yet</em>}
                  </div>
                </article>
              ))}
              {filteredFarmers.length === 0 && <Empty icon={Users} title="No member farmers found" text="Farmers added during FPO registration will appear here." />}
            </div>
          </section>
        )}

        {section === "products" && (
          <section className="fpo-page-content">
            <div className="fpo-section-toolbar">
              <div>
                <h2>FPO Products</h2>
                <p>Products added here are shared with the Consumer Dashboard in realtime.</p>
              </div>
              <div className="fpo-toolbar-actions">
                <div className="fpo-search"><Search size={17} /><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search product..." /></div>
                <button className="fpo-primary-btn" onClick={openAddProduct}><Plus size={17} /> Add Product</button>
              </div>
            </div>
            <div className="product-category-list">
              {groupedProducts.map(([category, categoryProducts]) => (
                <section className="product-category-section" key={category}>
                  <div className="product-category-head">
                    <div><span className="fpo-section-label">CATEGORY</span><h3>{category}</h3></div>
                    <span>{categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="product-grid">
                    {categoryProducts.map((product) => (
                      <article className={`product-card ${product.status === "inactive" ? "inactive" : ""}`} key={product.id}>
                        <div className="product-emoji">{getProduce(product.productName)?.icon || "🌱"}</div>
                        <div className="product-card-body">
                          <div className="product-head">
                            <div><h3>{text(product.productName, "Product")}</h3><span>{text(product.category, "General")}</span></div>
                            <span className={`status-pill ${product.status === "inactive" ? "off" : "on"}`}>{product.status === "inactive" ? "Inactive" : "Active"}</span>
                          </div>
                          <div className="product-price">{money(product.price)} <small>/{product.unit || "unit"}</small></div>
                          <div className="product-meta">
                            <span><Boxes size={15} /> Stock: {Number(product.stock || 0)}</span>
                            {product.farmerName && <span><UserRound size={15} /> {product.farmerName}</span>}
                          </div>
                          <div className="product-actions">
                            <button onClick={() => openEditProduct(product)}><Pencil size={15} /> Edit</button>
                            <button onClick={() => toggleProduct(product)}>{product.status === "inactive" ? "Activate" : "Deactivate"}</button>
                            <button className="danger" onClick={() => removeProduct(product)}><Trash2 size={15} /></button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              {filteredProducts.length === 0 && <Empty icon={Package} title="No products yet" text="Add the FPO's produce to make it available to consumers." />}
            </div>
          </section>
        )}

        {section === "orders" && (
          <section className="fpo-page-content">
            <div className="fpo-section-toolbar">
              <div><h2>Orders</h2><p>FPO controls the order until it is ready for pickup.</p></div>
              <select className="fpo-filter" value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}>
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="preparing">Preparing</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <section className="fpo-card"><OrderTable orders={filteredOrders} onStatus={updateFpoOrderStatus} /></section>
          </section>
        )}

        {section === "delivery" && (
          <section className="fpo-page-content">
            <div className="fpo-card delivery-hero">
              <div className="delivery-icon"><Truck size={30} /></div>
              <div>
                <span className="fpo-section-label">PLATFORM MANAGED</span>
                <h2>AgriConnect handles delivery assignment</h2>
                <p>
                  FPO prepares the order and marks it <strong>Ready for Pickup</strong>.
                  The platform then assigns a delivery partner. FPO does not manually assign a driver.
                </p>
              </div>
            </div>
            <div className="fpo-card">
              <div className="fpo-card-head"><div><h3>Delivery Partners</h3><p className="fpo-card-sub">Partners available to the platform.</p></div></div>
              <div className="delivery-grid">
                {deliveryAgents.map((agent) => (
                  <div className="delivery-card" key={agent.id}>
                    <div className="delivery-avatar"><Truck size={19} /></div>
                    <div><strong>{text(agent.name, "Delivery Partner")}</strong><span>{text(agent.mobile)} • {text(agent.status, "available")}</span></div>
                  </div>
                ))}
                {deliveryAgents.length === 0 && <Empty icon={Truck} title="No delivery data" text="Delivery assignment is managed by the AgriConnect platform." />}
              </div>
            </div>
          </section>
        )}

        {section === "earnings" && (
          <section className="fpo-page-content">
            <div className="fpo-stats-grid">
              <Stat icon={IndianRupee} label="Completed Sales" value={money(totalSales)} />
              <Stat icon={ShoppingBag} label="Completed Orders" value={completedOrders.length} />
              <Stat icon={Clock3} label="Pending Orders" value={pendingOrders.length} />
              <Stat icon={TrendingUp} label="Active Products" value={activeProducts.length} />
            </div>
            <section className="fpo-card">
              <div className="fpo-card-head"><div><span className="fpo-section-label">SALES SUMMARY</span><h3>Order-wise earnings</h3></div></div>
              <OrderTable orders={completedOrders} onStatus={updateFpoOrderStatus} compact />
            </section>
          </section>
        )}

        {section === "notifications" && (
          <section className="fpo-page-content">
            <div className="fpo-section-toolbar"><div><h2>Notifications</h2><p>Orders, stock and platform updates.</p></div></div>
            <div className="notification-list">
              {notifications.map((notification) => (
                <button className={`notification-card ${notification.read ? "" : "unread"}`} key={notification.id} onClick={() => markNotificationRead(notification)}>
                  <div className="notification-icon"><Bell size={18} /></div>
                  <div><strong>{text(notification.title, "Notification")}</strong><p>{text(notification.message, "You have a new AgriConnect update.")}</p><span>{dateText(notification.createdAt)}</span></div>
                  {!notification.read && <i />}
                </button>
              ))}
              {notifications.length === 0 && <Empty icon={Bell} title="You're all caught up" text="New FPO notifications will appear here." />}
            </div>
          </section>
        )}

        {section === "profile" && (
          <section className="fpo-page-content">
            <div className="profile-hero">
              <div className="profile-logo"><Building2 size={30} /></div>
              <div><span className="fpo-section-label">FPO / ORGANIZATION</span><h2>{text(profile.fpoName, "AgriConnect FPO")}</h2><p>{text(profile.fpoType, "Farmer Producer Organization")}</p></div>
            </div>
            <div className="profile-grid">
              <ProfileBlock title="Organisation Details" icon={Building2}>
                <ProfileItem label="FPO Name" value={profile.fpoName} />
                <ProfileItem label="Registration Number" value={profile.registrationNumber} />
                <ProfileItem label="FPO Type" value={profile.fpoType} />
              </ProfileBlock>
              <ProfileBlock title="Registered Address" icon={MapPin}>
                <ProfileItem label="Address" value={profile.address} />
                <ProfileItem label="Village" value={profile.village} />
                <ProfileItem label="Mandal" value={profile.mandal} />
                <ProfileItem label="District" value={profile.district} />
                <ProfileItem label="State" value={profile.state} />
              </ProfileBlock>
              <ProfileBlock title="Authorized Person" icon={UserRound}>
                <ProfileItem label="Name" value={profile.authorizedPerson} />
                <ProfileItem label="Designation" value={profile.designation} />
              </ProfileBlock>
              <ProfileBlock title="Contact Details" icon={Mail}>
                <ProfileItem label="Official Email" value={profile.email} />
                <ProfileItem label="Registered Mobile" value={profile.mobile} />
              </ProfileBlock>
            </div>
          </section>
        )}

        {section === "settings" && (
          <section className="fpo-page-content">
            <div className="fpo-card settings-card">
              <div className="settings-icon"><Settings size={23} /></div>
              <div><h3>Dashboard Settings</h3><p>Realtime sync is enabled for FPO products, orders and notifications.</p></div>
            </div>
            <div className="fpo-card">
              <div className="setting-row"><div><strong>Realtime product sync</strong><span>Consumer Dashboard receives FPO product changes from the shared products collection.</span></div><span className="setting-on">ON</span></div>
              <div className="setting-row"><div><strong>Platform-managed delivery</strong><span>Delivery assignment starts after the FPO marks an order Ready for Pickup.</span></div><span className="setting-on">ON</span></div>
              <div className="setting-row"><div><strong>AI demand insights</strong><span>Forecast cards use demandForecasts data when available and live product/order signals otherwise.</span></div><span className="setting-on">ON</span></div>
            </div>
          </section>
        )}
      </main>

      {showFarmerModal && (
        <div
          className="fpo-modal-backdrop"
          onMouseDown={() => setShowFarmerModal(false)}
        >
          <div
            className="fpo-modal farmer-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="fpo-modal-head">
              <div>
                <span className="fpo-section-label">FPO MEMBER</span>
                <h2>{editingFarmer ? "Update Farmer" : "Add Member Farmer"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowFarmerModal(false)}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveFarmer}>
              <div className="farmer-modal-intro">
                <div className="farmer-modal-icon">
                  <UserRoundPlus size={23} />
                </div>
                <div>
                  <strong>Member farmer details</strong>
                  <span>
                    Same fields used in the FPO registration flow.
                  </span>
                </div>
              </div>

              <div className="farmer-form-grid">
                <label className="full">
                  Farmer Name<span>*</span>
                  <div className="input-icon-wrap">
                    <UserRound size={16} />
                    <input
                      value={farmerForm.name}
                      onChange={(e) =>
                        setFarmerForm({ ...farmerForm, name: e.target.value })
                      }
                      placeholder="Enter farmer full name"
                      required
                    />
                  </div>
                </label>

                <label>
                  Mobile Number<span>*</span>
                  <div className="farmer-mobile-wrap">
                    <b>+91</b>
                    <i></i>
                    <Phone size={15} />
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      value={farmerForm.mobile}
                      onChange={(e) =>
                        setFarmerForm({
                          ...farmerForm,
                          mobile: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="10-digit mobile"
                      required
                    />
                  </div>
                </label>

                <label>
                  Farmer / Member ID<span>*</span>
                  <div className="input-icon-wrap">
                    <IdCard size={16} />
                    <input
                      value={farmerForm.memberId}
                      onChange={(e) =>
                        setFarmerForm({
                          ...farmerForm,
                          memberId: e.target.value,
                        })
                      }
                      placeholder="Enter member ID"
                      required
                    />
                  </div>
                </label>

                <label>
                  Village<span>*</span>
                  <div className="input-icon-wrap">
                    <MapPin size={16} />
                    <input
                      value={farmerForm.village}
                      onChange={(e) =>
                        setFarmerForm({
                          ...farmerForm,
                          village: e.target.value,
                        })
                      }
                      placeholder="Enter village"
                      required
                    />
                  </div>
                </label>

                <label>
                  District<span>*</span>
                  <input
                    value={farmerForm.district}
                    onChange={(e) =>
                      setFarmerForm({
                        ...farmerForm,
                        district: e.target.value,
                      })
                    }
                    placeholder="Enter district"
                    required
                  />
                </label>

                <label>
                  Main Crop<span>*</span>
                  <div className="input-icon-wrap">
                    <Sprout size={16} />
                    <input
                      value={farmerForm.crop}
                      onChange={(e) =>
                        setFarmerForm({
                          ...farmerForm,
                          crop: e.target.value,
                        })
                      }
                      placeholder="Example: Tomato"
                      required
                    />
                  </div>
                </label>

                <label>
                  Land Area<span>*</span>
                  <div className="land-input-wrap">
                    <Ruler size={16} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={farmerForm.landArea}
                      onChange={(e) =>
                        setFarmerForm({
                          ...farmerForm,
                          landArea: e.target.value,
                        })
                      }
                      placeholder="Example: 3"
                      required
                    />
                    <small>acres</small>
                  </div>
                </label>
              </div>

              <div className="fpo-modal-actions">
                <button
                  type="button"
                  className="fpo-secondary-btn"
                  onClick={() => setShowFarmerModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="fpo-primary-btn"
                  disabled={savingFarmer}
                >
                  <UserRoundPlus size={16} />
                  {savingFarmer
                    ? "Saving..."
                    : editingFarmer
                    ? "Update Farmer"
                    : "Add Farmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fpo-modal-backdrop" onMouseDown={() => setShowProductModal(false)}>
          <div className="fpo-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="fpo-modal-head"><div><span className="fpo-section-label">PRODUCT MANAGEMENT</span><h2>{editingProduct ? "Edit Product" : "Add Product"}</h2></div><button onClick={() => { setShowProductModal(false); setProduceOpen(false); }}><X size={19} /></button></div>
            <form onSubmit={saveProduct}>
              <div className="product-preview">
                <div className="product-preview-icon">{getProduce(productForm.productName)?.icon || "🌱"}</div>
                <div>
                  <span>PRODUCT PREVIEW</span>
                  <strong>{productForm.productName || "Your produce"}</strong>
                  <small>{productForm.category || "Select a category"}</small>
                </div>
              </div>

              <div className="produce-name-field">
                <label>Produce Name<span>*</span></label>
                <div className="produce-name-row">
                  <div className="produce-select-wrap">
                    <button
                      type="button"
                      className={`produce-select-trigger ${productForm.productName ? "has-value" : ""}`}
                      onClick={() => setProduceOpen((value) => !value)}
                    >
                      {getProduce(productForm.productName)?.icon && (
                        <span className="produce-trigger-icon">
                          {getProduce(productForm.productName).icon}
                        </span>
                      )}
                      <span>{productForm.productName || "Select produce"}</span>
                      <ChevronRight className="produce-select-chevron" size={18} />
                    </button>

                    {produceOpen && (
                      <div className="produce-dropdown">
                        {PRODUCE_OPTIONS.map((item) => (
                          <button
                            type="button"
                            key={item.name}
                            className={`produce-option ${productForm.productName === item.name ? "selected" : ""}`}
                            onClick={() => {
                              applyProduce(item.name);
                              setProduceOpen(false);
                            }}
                          >
                            <span className="produce-option-icon">{item.icon}</span>
                            <span>
                              <strong>{item.name}</strong>
                              <small>{item.category}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" className="voice-btn" onClick={startVoiceInput} title="Voice input">
                    <Mic size={22} />
                  </button>
                </div>
                <div className="language-switch">
                  <button
                    type="button"
                    className={productForm.voiceLanguage !== "te-IN" ? "selected" : ""}
                    onClick={() => setProductForm({ ...productForm, voiceLanguage: "en-IN" })}
                  >English</button>
                  <button
                    type="button"
                    className={productForm.voiceLanguage === "te-IN" ? "selected" : ""}
                    onClick={() => setProductForm({ ...productForm, voiceLanguage: "te-IN" })}
                  >తెలుగు</button>
                </div>
              </div>

              <div className="modal-grid">
                <label>Category<span>*</span>
                  <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} required>
                    <option value="">Select category</option>
                    {[...new Set(PRODUCE_OPTIONS.map((x) => x.category))].map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label>Unit
                  <select value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}>
                    <option>kg</option><option>quintal</option><option>piece</option><option>litre</option><option>dozen</option>
                  </select>
                </label>

                <label>Price per Unit<span>*</span>
                  <div className="price-input-wrap"><span>₹</span><input type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} placeholder="0.00" required /></div>
                </label>

                <label>Available Quantity<span>*</span>
                  <input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} placeholder="0" required />
                </label>

                <div className="ai-price-row">
                  <button type="button" className="ai-price-btn" onClick={() => {
                    const recommended = getAiRecommendedPrice(productForm.productName, marketPrices);
                    if (recommended > 0) {
                      setProductForm({ ...productForm, price: recommended });
                      setError("");
                    } else {
                      setError("Select a supported produce to get an AI market-price suggestion.");
                    }
                  }}>
                    <Sparkles size={16} /> AI Recommended Price
                  </button>
                  {getAiRecommendedPrice(productForm.productName, marketPrices) > 0 && (
                    <span>Suggested: {money(getAiRecommendedPrice(productForm.productName, marketPrices))}/{productForm.unit || "kg"}</span>
                  )}
                </div>

                <label className="full">Description
                  <textarea value={productForm.description || ""} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Tell consumers about freshness, quality, harvesting details..." />
                </label>

                <label className="full">Member Farmer
                  <select value={productForm.farmerId} onChange={(e) => setProductForm({ ...productForm, farmerId: e.target.value })}>
                    <option value="">FPO / Shared Stock</option>
                    {farmers.map((f) => <option key={f.id} value={f.id}>{f.name} — {f.memberId}</option>)}
                  </select>
                </label>

                <label className="full">Location
                  <input value={productForm.location} onChange={(e) => setProductForm({ ...productForm, location: e.target.value })} placeholder="Village / District" />
                </label>
              </div>

              <div className="product-modal-tip">
                <span>Tip: tap the microphone and say the produce name in Telugu or English.</span>
                <span>Quantity 0 automatically marks the product out of stock.</span>
              </div>
              <div className="fpo-modal-actions">
                <button type="button" className="fpo-secondary-btn" onClick={() => { setShowProductModal(false); setProduceOpen(false); }}>Cancel</button>
                <button className="fpo-primary-btn" disabled={savingProduct}>
                  {savingProduct ? "Saving..." : editingProduct ? "Update Produce" : "Add Produce"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="fpo-stat-card"><div className="fpo-stat-icon"><Icon size={20} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function InfoItem({ icon: Icon, label, value }) {
  return <div className="info-item"><Icon size={15} /><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function ProfileBlock({ title, icon: Icon, children }) {
  return <section className="profile-block"><div className="profile-block-head"><div><Icon size={18} /><h3>{title}</h3></div></div><div className="profile-items">{children}</div></section>;
}

function ProfileItem({ label, value }) {
  return <div className="profile-item"><span>{label}</span><strong>{text(value)}</strong></div>;
}

function Empty({ icon: Icon, title, text: description }) {
  return <div className="fpo-empty"><Icon size={27} /><h3>{title}</h3><p>{description}</p></div>;
}

function SproutIcon() {
  return <span className="sprout-mini">🌱</span>;
}

function OrderTable({ orders, onStatus, compact = false }) {
  const [expanded, setExpanded] = useState(null);

  if (!orders.length) {
    return <Empty icon={ShoppingBag} title="No orders found" text="Orders will appear here when consumers place them." />;
  }

  const nextStatus = (order) => {
    const status = getOrderDisplayStatus(order);
    if (["pending", "new", "placed", "confirmed"].includes(status)) return "accepted";
    if (status === "accepted") return "preparing";
    if (status === "preparing") return "ready_for_pickup";
    return null;
  };

  return (
    <div className={`order-table-wrap ${compact ? "compact" : ""}`}>
      <table className="order-table">
        <thead><tr><th>Order</th><th>Consumer</th><th>Items</th><th>Amount</th><th>Status</th><th>Delivery</th><th>Action</th></tr></thead>
        <tbody>
          {orders.map((order) => {
            const status = getOrderDisplayStatus(order);
            const next = nextStatus(order);
            const items = getOrderItems(order);
            const displayOrderId = order.parentOrderId || order.id;
            const isOpen = expanded === displayOrderId;
            return (
              <React.Fragment key={displayOrderId}>
                <tr>
                  <td><button className="order-id-btn" onClick={() => setExpanded(isOpen ? null : displayOrderId)}>#{String(displayOrderId).slice(0, 8)} <small>{dateText(order.createdAt)}</small></button></td>
                  <td>
                    <strong>{text(order.consumerName || order.customerName || order.consumer?.fullName || order.consumer?.name, "Consumer")}</strong>
                    <small>{text(order.consumerMobile || order.customerMobile || order.consumer?.mobile, "Mobile not available")}</small>
                  </td>
                  <td><strong>{items.length || 0}</strong><small>{items.slice(0, 2).map((item) => item.productName || item.name || "Item").join(", ") || "View details"}</small></td>
                  <td><strong>{money(getOrderAmount(order))}</strong></td>
                  <td><span className={`status-pill ${status === "ready_for_pickup" ? "ready" : status === "delivered" ? "done" : "pending"}`}>{status.replaceAll("_", " ")}</span></td>
                  <td>
                    {order.deliveryAgentName || order.deliveryPartnerName ? (
                      <span className="tracking-mini"><Truck size={12} />{order.deliveryAgentName || order.deliveryPartnerName}<small>{text(order.deliveryStatus, "assigned")}</small></span>
                    ) : status === "ready_for_pickup" ? (
                      <span className="platform-text">Waiting for platform pickup</span>
                    ) : (
                      <span className="platform-text">Not assigned</span>
                    )}
                  </td>
                  <td className="order-actions-cell">
                    <button className="details-btn" onClick={() => setExpanded(isOpen ? null : displayOrderId)}>{isOpen ? "Hide" : "Details"}</button>
                    {next ? <button className="table-action" onClick={() => onStatus(order, next)}>{next.replaceAll("_", " ")}</button> : <span className="platform-text">{status === "ready_for_pickup" ? "Platform pickup" : status === "delivered" ? "Completed" : "—"}</span>}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="order-detail-row">
                    <td colSpan="7">
                      <div className="order-detail-panel">
                        <div className="order-detail-head"><div><span className="fpo-section-label">ORDER DETAILS</span><h4>#{String(displayOrderId).slice(0, 8)}</h4></div><span className={`status-pill ${status === "delivered" ? "done" : "ready"}`}>{status.replaceAll("_", " ")}</span></div>
                        <div className="order-detail-grid">
                          <div><span>Consumer</span><strong>{text(order.consumerName || order.consumer?.fullName || order.consumer?.name, "Consumer")}</strong><small>{text(order.consumerMobile || order.consumer?.mobile, "Mobile not available")}</small></div>
                          <div><span>Payment</span><strong>{text(order.paymentStatus, "paid")}</strong><small>{text(order.paymentMethod, "ONLINE")}</small></div>
                          <div><span>Delivery</span><strong>{text(order.deliveryAgentName || order.deliveryPartnerName, "Platform assignment pending")}</strong><small>{text(order.deliveryStatus, status === "ready_for_pickup" ? "waiting_for_pickup" : "—").replaceAll("_", " ")}</small></div>
                          <div><span>Seller Earnings</span><strong>{money(getOrderAmount(order))}</strong><small>FPO share</small></div>
                          <div className="order-detail-wide"><span>Delivery Address</span><strong>{text(order.deliveryAddress?.address || order.deliveryAddress?.fullAddress || order.deliveryAddress, "Address not available")}</strong></div>
                          <div className="order-detail-wide"><span>Items</span><div className="order-items-list">{items.length ? items.map((item, index) => <span key={`${displayOrderId}-item-${index}`}>{text(item.productName || item.name, "Item")} × {Number(item.quantity ?? item.qty ?? 1)} {text(item.unit, "unit")} — {money(item.total ?? (Number(item.price || 0) * Number(item.quantity ?? item.qty ?? 1)))}</span>) : <span>No item details available</span>}</div></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default FPODashboard;
