import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, CheckCircle2, ChevronDown, Filter, Heart, IndianRupee, LocateFixed, Menu,
  MapPin, Minus, Navigation, Package, Phone, Plus, Search, Settings,
  ShoppingBag, ShoppingCart, Star, Truck, User, X, LogOut, RefreshCw,
  Clock3, AlertCircle, CircleHelp, ArrowRight, SlidersHorizontal
} from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, doc, getDoc, onSnapshot, query, runTransaction,
  serverTimestamp, setDoc, where
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import ProduceIcon from "../../components/ProduceIcon";
import "./ConsumerDashboard.css";
import "./ConsumerCheckout.css";

const CATEGORIES = ["All", "Vegetables", "Fruits", "Grains", "Pulses", "Leafy Greens", "Spices"];
const ORDER_FILTERS = ["All", "Active", "Delivered", "Cancelled"];

const sellerIdOf = (p = {}) => p.sellerId || p.farmerId || p.fpoId || "";
const sellerTypeOf = (p = {}) => p.sellerType || (p.fpoId ? "fpo" : "individual");
const sellerNameOf = (p = {}, profile = {}) =>
  p.sellerName || p.farmerName || p.fpoName || profile.fullName || profile.name ||
  (sellerTypeOf(p) === "fpo" ? "Local FPO" : "Local Farmer");

function distanceKm(a = {}, b = {}) {
  const lat1 = Number(a.latitude), lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude), lon2 = Number(b.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const r = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function statusLabel(status = "") {
  return String(status).replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function isActiveOrder(status = "") {
  return !["delivered", "cancelled", "rejected"].includes(String(status).toLowerCase());
}

function ConsumerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [sellerProfiles, setSellerProfiles] = useState({});
  const [consumerProfile, setConsumerProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] = useState("home");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("nearest");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [minRating, setMinRating] = useState("");
  const [availabilityOnly, setAvailabilityOnly] = useState(true);

  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    fullName: "", mobile: "", address: "", village: "", mandal: "",
    district: "", state: "", pincode: "", paymentMethod: "ONLINE"
  });

  const [profileForm, setProfileForm] = useState({
    fullName: "", mobile: "", email: "", address: "", village: "",
    mandal: "", district: "", state: "", pincode: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [orderFilter, setOrderFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Auth + consumer profile. Registration/login data automatically flows into dashboard and checkout.
  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser || null);
      if (!currentUser) {
        setConsumerProfile(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "consumerProfiles", currentUser.uid));
        const data = snap.exists() ? snap.data() : {};
        const merged = {
          fullName: data.fullName || currentUser.displayName || "",
          mobile: data.mobile || currentUser.phoneNumber || "",
          email: data.email || currentUser.email || "",
          ...data,
        };
        setConsumerProfile(merged);
        setProfileForm({
          fullName: merged.fullName || "", mobile: merged.mobile || "",
          email: merged.email || "", address: merged.fullAddress || merged.address || "",
          village: merged.village || "", mandal: merged.mandal || "",
          district: merged.district || "", state: merged.state || "", pincode: merged.pincode || ""
        });
        setCheckoutForm(prev => ({
          ...prev,
          fullName: merged.fullName || prev.fullName,
          mobile: merged.mobile || prev.mobile,
          address: merged.fullAddress || merged.address || prev.address,
          village: merged.village || prev.village, mandal: merged.mandal || prev.mandal,
          district: merged.district || prev.district, state: merged.state || prev.state,
          pincode: merged.pincode || prev.pincode
        }));
      } catch (e) {
        console.error("Consumer profile error", e);
      }
    });
  }, []);

  // Live active products. Farmer/FPO dashboards write here; consumer sees changes automatically.
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "products"), where("status", "==", "active"));
    return onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, e => {
      console.error(e); setError("Unable to load fresh produce."); setLoading(false);
    });
  }, []);

  // Live consumer orders.
  useEffect(() => {
    if (!user?.uid) { setOrders([]); setOrdersLoading(false); return; }
    setOrdersLoading(true);
    const q = query(collection(db, "orders"), where("consumerId", "==", user.uid));
    return onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const aa = a.createdAt?.seconds || 0, bb = b.createdAt?.seconds || 0;
        return bb - aa;
      });
      setOrders(rows); setOrdersLoading(false);
    }, e => { console.error(e); setOrdersLoading(false); });
  }, [user]);

  // Load seller profiles for actual distance/rating/name. Supports individual farmers and FPOs.
  useEffect(() => {
    const sellers = [...new Set(products.map(sellerIdOf).filter(Boolean))];
    if (!sellers.length) { setSellerProfiles({}); return; }
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(sellers.map(async id => {
        const product = products.find(p => sellerIdOf(p) === id);
        const type = sellerTypeOf(product);
        const collectionName = type === "fpo" ? "fpoProfiles" : "farmerProfiles";
        try {
          const snap = await getDoc(doc(db, collectionName, id));
          if (snap.exists()) map[id] = { ...snap.data(), sellerType: type };
        } catch (e) { console.warn("Seller profile unavailable", id, e); }
      }));
      if (!cancelled) setSellerProfiles(map);
    })();
    return () => { cancelled = true; };
  }, [products]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("agriconnect_cart") || "{}");
      if (saved && typeof saved === "object") setCart(saved);
    } catch { /* ignore malformed local cart */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("agriconnect_cart", JSON.stringify(cart));
  }, [cart]);

  const enrichProduct = (product) => {
    const id = sellerIdOf(product);
    const profile = sellerProfiles[id] || {};
    const type = sellerTypeOf(product);
    return {
      ...product,
      sellerId: id,
      sellerType: type,
      sellerName: sellerNameOf(product, profile),
      sellerProfile: profile,
      distance: distanceKm(consumerProfile?.location, profile.location || product.location),
      rating: Number(profile.rating || product.sellerRating || product.rating) > 0
        ? Number(profile.rating || product.sellerRating || product.rating) : null
    };
  };

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = products.map(enrichProduct).filter(p => {
      const name = String(p.name || p.productName || "");
      const seller = String(p.sellerName || "");
      const matchesSearch = !term || name.toLowerCase().includes(term) || seller.toLowerCase().includes(term);
      const matchesCategory = category === "All" || String(p.category || "").toLowerCase() === category.toLowerCase();
      const stock = Number(p.quantity ?? p.stock ?? 0);
      const matchesAvailability = !availabilityOnly || stock > 0;
      const matchesPrice = !maxPrice || Number(p.price || 0) <= Number(maxPrice);
      const matchesDistance = !maxDistance || (p.distance !== null && p.distance <= Number(maxDistance));
      const matchesRating = !minRating || (p.rating !== null && p.rating >= Number(minRating));
      return matchesSearch && matchesCategory && matchesAvailability && matchesPrice && matchesDistance && matchesRating;
    });
    rows.sort((a, b) => {
      if (sortBy === "price") return Number(a.price || 0) - Number(b.price || 0);
      if (sortBy === "rating") return Number(b.rating || 0) - Number(a.rating || 0);
      if (sortBy === "stock") return Number(b.quantity || b.stock || 0) - Number(a.quantity || a.stock || 0);
      return (a.distance ?? 999999) - (b.distance ?? 999999);
    });
    return rows;
  }, [products, sellerProfiles, consumerProfile, search, category, availabilityOnly, maxPrice, maxDistance, minRating, sortBy]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartCount = cartItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.price || 0), 0);
  const deliveryFee = cartItems.length ? 30 : 0;
  const grandTotal = cartTotal + deliveryFee;

  const sellerGroups = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const key = item.sellerId || sellerIdOf(item) || item.sellerName;
      if (!groups[key]) groups[key] = {
        sellerId: item.sellerId || sellerIdOf(item), sellerType: sellerTypeOf(item),
        sellerName: item.sellerName || sellerNameOf(item), items: [], total: 0
      };
      groups[key].items.push(item);
      groups[key].total += Number(item.quantity || 0) * Number(item.price || 0);
    });
    return Object.values(groups);
  }, [cartItems]);

  const activeOrders = useMemo(() => orders.filter(o => isActiveOrder(o.status)), [orders]);
  const deliveredOrders = useMemo(() => orders.filter(o => String(o.status).toLowerCase() === "delivered"), [orders]);
  const nearbySellers = useMemo(() => new Set(filteredProducts.map(p => p.sellerId).filter(Boolean)).size, [filteredProducts]);
  const filteredOrders = useMemo(() => {
    if (orderFilter === "Active") return activeOrders;
    if (orderFilter === "Delivered") return deliveredOrders;
    if (orderFilter === "Cancelled") return orders.filter(o => ["cancelled", "rejected"].includes(String(o.status).toLowerCase()));
    return orders;
  }, [orders, orderFilter, activeOrders, deliveredOrders]);

  const notifications = useMemo(() => orders.slice(0, 8).map(o => ({
    id: o.id,
    title: `Order ${statusLabel(o.status || "confirmed")}`,
    text: `Order #${o.id.slice(0, 8)} is ${statusLabel(o.status || "confirmed").toLowerCase()}.`,
    time: o.updatedAt || o.createdAt
  })), [orders]);

  const recommendedProducts = useMemo(() => {
    const boughtCategories = {};
    orders.forEach(o => (o.items || []).forEach(i => { boughtCategories[i.category] = (boughtCategories[i.category] || 0) + Number(i.quantity || 1); }));
    return [...filteredProducts].sort((a, b) => (boughtCategories[b.category] || 0) - (boughtCategories[a.category] || 0)).slice(0, 4);
  }, [orders, filteredProducts]);

  const goTo = (section) => {
    setActiveSection(section);
    setNotificationsOpen(false);
    setProfileOpen(false);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const openSettings = () => {
    setProfileMenuOpen(true);
    goTo("settings");
  };

  // Browser fallback: opens a pre-filled WhatsApp message.
  // Production auto-send requires an approved WhatsApp Business Cloud API/backend.
  const notifyFarmerOnWhatsApp = (phone, orderId, items, total) => {
    const clean = String(phone || "").replace(/\D/g, "");
    if (!clean) return;
    const normalized = clean.length === 10 ? `91${clean}` : clean;
    const text = [
      "AgriConnect - New Order",
      `Order ID: ${orderId}`,
      "Items:",
      ...items.map(i => `• ${i.name} - ${i.quantity} ${i.unit} - ${money(i.lineTotal)}`),
      `Seller total: ${money(total)}`,
      "Please open your AgriConnect dashboard to accept and prepare the order."
    ].join("\n");
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const addToCart = (product) => {
    const available = Number(product.quantity ?? product.stock ?? 0);
    if (available <= 0) return;
    const key = `${product.id}_${sellerIdOf(product)}`;
    setCart(prev => {
      const current = prev[key];
      return { ...prev, [key]: {
        ...product, cartKey: key, availableQuantity: available,
        quantity: Math.min(Number(current?.quantity || 0) + 1, available)
      }};
    });
  };

  const changeCartQuantity = (key, amount) => {
    setCart(prev => {
      const current = prev[key]; if (!current) return prev;
      const next = Number(current.quantity || 0) + amount;
      if (next <= 0) { const copy = { ...prev }; delete copy[key]; return copy; }
      const available = Number(current.availableQuantity ?? current.quantity ?? 0);
      return { ...prev, [key]: { ...current, quantity: Math.min(next, available) } };
    });
  };

  const removeFromCart = key => setCart(prev => { const copy = { ...prev }; delete copy[key]; return copy; });

  const openCheckout = () => {
    if (!cartItems.length) return;
    setShowCart(false); setOrderSuccess(null); setError(""); setShowCheckout(true);
  };

  const updateCheckout = e => setCheckoutForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const updateProfile = e => setProfileForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const saveProfile = async e => {
    e?.preventDefault();
    if (!user?.uid) return;
    setSavingProfile(true); setError("");
    try {
      const payload = {
        ...profileForm,
        fullAddress: profileForm.address,
        updatedAt: serverTimestamp(),
        email: profileForm.email || user.email || ""
      };
      await setDoc(doc(db, "consumerProfiles", user.uid), payload, { merge: true });
      setConsumerProfile(p => ({ ...(p || {}), ...payload }));
      setCheckoutForm(p => ({ ...p, fullName: profileForm.fullName, mobile: profileForm.mobile, address: profileForm.address, village: profileForm.village, mandal: profileForm.mandal, district: profileForm.district, state: profileForm.state, pincode: profileForm.pincode }));
      setError("");
    } catch (e) { console.error(e); setError("Unable to save your profile right now."); }
    finally { setSavingProfile(false); }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) { setError("Location is not supported by this browser."); return; }
    setLocationSaving(true); setError("");
    navigator.geolocation.getCurrentPosition(async pos => {
      const location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      try {
        await setDoc(doc(db, "consumerProfiles", user.uid), { location, updatedAt: serverTimestamp() }, { merge: true });
        setConsumerProfile(p => ({ ...(p || {}), location }));
      } catch (e) { console.error(e); setError("Could not save your location."); }
      finally { setLocationSaving(false); }
    }, () => { setLocationSaving(false); setError("Location permission was not granted."); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const placeOrder = async e => {
    e.preventDefault();
    if (!user?.uid) { setError("Please log in before placing an order."); return; }
    if (!cartItems.length) { setError("Your cart is empty."); return; }
    const required = ["fullName", "mobile", "address", "district", "state", "pincode"];
    if (required.some(k => !String(checkoutForm[k] || "").trim())) { setError("Please complete all required delivery details."); return; }
    if (!/^\d{10}$/.test(checkoutForm.mobile.trim())) { setError("Please enter a valid 10-digit mobile number."); return; }
    if (!/^\d{6}$/.test(checkoutForm.pincode.trim())) { setError("Please enter a valid 6-digit pincode."); return; }
    setPlacingOrder(true); setError("");
    try {
      // Prototype payment confirmation. Production should verify a real gateway payment on the server/webhook.
      const paymentResult = { verified: true, paymentId: `DEMO_PAY_${Date.now()}`, gatewayOrderId: `DEMO_GATEWAY_${Date.now()}` };
      if (!paymentResult.verified) throw new Error("Payment could not be verified.");

      // Generate the consumer delivery OTP once per parent order.
      // It is shown to the consumer only when the order reaches Out for Delivery.
      const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));

      const result = await runTransaction(db, async transaction => {
        const refs = cartItems.map(i => doc(db, "products", i.id));
        const snaps = [];
        for (const ref of refs) snaps.push(await transaction.get(ref));

        const latest = cartItems.map((item, idx) => {
          const snap = snaps[idx];
          if (!snap.exists()) throw new Error(`${item.name || "A product"} is no longer available.`);
          const data = snap.data();
          const available = Number(data.quantity ?? data.stock ?? 0);
          const requested = Number(item.quantity || 0);
          if (requested <= 0) throw new Error(`Invalid quantity for ${item.name}.`);
          if (requested > available) throw new Error(`${item.name}: only ${available} ${data.unit || item.unit || "kg"} available.`);
          const sid = sellerIdOf(data) || sellerIdOf(item);
          const stype = sellerTypeOf(data) || sellerTypeOf(item);
          return { ...item, data, sellerId: sid, sellerType: stype, sellerName: sellerNameOf(data, sellerProfiles[sid] || {}), price: Number(data.price ?? item.price ?? 0), unit: data.unit || item.unit || "kg", category: data.category || item.category || "" };
        });

        const orderItems = latest.map(i => ({
          productId: i.id, sellerId: i.sellerId, sellerType: i.sellerType,
          farmerId: i.sellerType === "individual" ? i.sellerId : "",
          fpoId: i.sellerType === "fpo" ? i.sellerId : "",
          sellerName: i.sellerName, farmerName: i.sellerType === "individual" ? i.sellerName : "",
          fpoName: i.sellerType === "fpo" ? i.sellerName : "", name: i.name || i.productName,
          category: i.category, quantity: Number(i.quantity), unit: i.unit, price: i.price,
          lineTotal: i.price * Number(i.quantity)
        }));
        const itemsTotal = orderItems.reduce((s, i) => s + i.lineTotal, 0);
        const totalAmount = itemsTotal + 30;
        const deliveryAddress = {
          fullName: checkoutForm.fullName.trim(), mobile: checkoutForm.mobile.trim(), address: checkoutForm.address.trim(),
          village: checkoutForm.village.trim(), mandal: checkoutForm.mandal.trim(), district: checkoutForm.district.trim(),
          state: checkoutForm.state.trim(), pincode: checkoutForm.pincode.trim(), location: consumerProfile?.location || null
        };
        const orderRef = doc(collection(db, "orders"));
        const sellerIds = [...new Set(orderItems.map(i => i.sellerId).filter(Boolean))];
        const sellerTypes = [...new Set(orderItems.map(i => i.sellerType).filter(Boolean))];

        transaction.set(orderRef, {
          consumerId: user.uid, consumerName: checkoutForm.fullName.trim(), consumerMobile: checkoutForm.mobile.trim(),
          orderType: sellerIds.length > 1 ? "multi-seller" : "single-seller", status: "confirmed",
          paymentMethod: "ONLINE", paymentStatus: "paid", paymentId: paymentResult.paymentId, gatewayOrderId: paymentResult.gatewayOrderId,
          itemsTotal, deliveryFee: 30, totalAmount, itemCount: orderItems.reduce((s, i) => s + i.quantity, 0),
          sellerIds, sellerTypes,
          farmerIds: [...new Set(orderItems.map(i => i.farmerId).filter(Boolean))],
          fpoIds: [...new Set(orderItems.map(i => i.fpoId).filter(Boolean))],
          sellerCount: sellerIds.length, farmerCount: orderItems.filter(i => i.sellerType === "individual").map(i => i.sellerId).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).length,
          items: orderItems, deliveryAddress, consumerLocation: consumerProfile?.location || null,
          deliveryOtp, deliveryOtpStatus: "active", deliveryOtpVerified: false,
          createdAt: serverTimestamp(), paidAt: serverTimestamp(), updatedAt: serverTimestamp()
        });

        snaps.forEach((snap, idx) => {
          const current = Number(snap.data().quantity ?? snap.data().stock ?? 0);
          const requested = Number(cartItems[idx].quantity || 0);
          transaction.update(refs[idx], { quantity: current - requested, updatedAt: serverTimestamp() });
        });

        // Keep farmerOrders for current farmer dashboard compatibility; FPO records use fpoOrders.
        const grouped = {};
        orderItems.forEach(item => {
          const key = item.sellerId || "unknown";
          if (!grouped[key]) grouped[key] = { ...item, items: [], total: 0 };
          grouped[key].items.push(item); grouped[key].total += item.lineTotal;
        });
        const sellerOrderIds = [];
        const whatsappRecipients = [];
        Object.values(grouped).forEach(group => {
          const col = group.sellerType === "fpo" ? "fpoOrders" : "farmerOrders";
          const ref = doc(collection(db, col));
          const sellerProfile = sellerProfiles[group.sellerId] || {};
          const whatsappNumber = sellerProfile.whatsappNumber || sellerProfile.mobile || sellerProfile.phone || group.mobile || group.phone || "";
          transaction.set(ref, {
            parentOrderId: orderRef.id, consumerId: user.uid, sellerId: group.sellerId, sellerType: group.sellerType,
            farmerId: group.farmerId || (group.sellerType === "individual" ? group.sellerId : ""),
            fpoId: group.fpoId || (group.sellerType === "fpo" ? group.sellerId : ""),
            sellerName: group.sellerName, farmerName: group.farmerName || "", fpoName: group.fpoName || "",
            status: "pending", paymentMethod: "ONLINE", paymentStatus: "paid", paymentId: paymentResult.paymentId,
            sellerAmount: group.total, farmerAmount: group.sellerType === "individual" ? group.total : 0,
            items: group.items, consumer: { fullName: checkoutForm.fullName.trim(), mobile: checkoutForm.mobile.trim() },
            deliveryAddress, deliveryOtp, deliveryOtpStatus: "active", deliveryOtpVerified: false,
            deliveryAgentId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
          });
          sellerOrderIds.push(ref.id);
          if (group.sellerType === "individual" && whatsappNumber) {
            whatsappRecipients.push({ phone: whatsappNumber, items: group.items, total: group.total });
          }
        });
        const paymentRef = doc(collection(db, "payments"));
        transaction.set(paymentRef, { orderId: orderRef.id, consumerId: user.uid, amount: totalAmount, itemsTotal, deliveryFee: 30, currency: "INR", method: "ONLINE", status: "paid", paymentId: paymentResult.paymentId, gatewayOrderId: paymentResult.gatewayOrderId, createdAt: serverTimestamp() });
        const eventRef = doc(collection(db, "orderEvents"));
        transaction.set(eventRef, { orderId: orderRef.id, consumerId: user.uid, type: "ORDER_PAID_AND_CONFIRMED", paymentStatus: "paid", sellerOrderIds, createdAt: serverTimestamp() });
        return { orderId: orderRef.id, sellerCount: sellerIds.length, total: totalAmount, whatsappRecipients };
      });
      setOrderSuccess(result);
      setCart({});
      // Fallback browser notification to each individual farmer's WhatsApp number.
      // For true automatic sending without user interaction, connect this callback to a server-side WhatsApp Business API.
      result.whatsappRecipients?.forEach(r => notifyFarmerOnWhatsApp(r.phone, result.orderId, r.items, r.total));
    } catch (e) { console.error(e); setError(e.message || "Unable to place your order."); }
    finally { setPlacingOrder(false); }
  };

  const logout = async () => { try { await signOut(auth); } catch (e) { console.error(e); } };

  const renderSeller = product => {
    const p = enrichProduct(product);
    return <>
      <div className="consumer-seller-row"><span>{p.sellerType === "fpo" ? "🏢" : "👨‍🌾"}</span><strong>{p.sellerName}</strong></div>
      <div className="consumer-seller-meta">
        <span><MapPin size={13}/>{p.distance === null ? "Distance unavailable" : p.distance < 1 ? `${Math.round(p.distance * 1000)} m away` : `${p.distance.toFixed(1)} km away`}</span>
        <span><Star size={13} fill="currentColor"/>{p.rating ? p.rating.toFixed(1) : p.sellerType === "fpo" ? "New FPO" : "New Farmer"}</span>
      </div>
    </>;
  };

  return (
    <div className="consumer-dashboard">
      <header className="consumer-topbar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={24}/></button>
        <button className="consumer-brand" onClick={() => goTo("home")}>
          <span className="consumer-brand-icon">🌱</span>
          <span><strong>AgriConnect</strong><small>Farm to Home</small></span>
        </button>
        <div className="consumer-header-search">
          <Search size={17}/>
          <input value={search} onChange={e => setSearch(e.target.value)} onFocus={() => activeSection !== "browse" && goTo("browse")} placeholder="Search vegetables, fruits, grains..." aria-label="Search produce"/>
        </div>
        <div className="consumer-top-actions">
          <button className="consumer-icon-btn" onClick={() => setNotificationsOpen(v => !v)} aria-label="Notifications"><Bell size={19}/>{notifications.length > 0 && <i/>}</button>
          <button className="consumer-cart-button" onClick={() => setShowCart(true)}><ShoppingCart size={18}/><span>Cart</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
          <button className="consumer-profile-trigger" onClick={() => setProfileOpen(v => !v)}><span>{(consumerProfile?.fullName || user?.displayName || "C").slice(0,1).toUpperCase()}</span><ChevronDown size={15}/></button>
        </div>
        {notificationsOpen && <div className="consumer-popover notification-popover"><div className="popover-title"><strong>Notifications</strong><span>{notifications.length}</span></div>{notifications.length ? notifications.map(n => <button key={n.id} onClick={() => { setNotificationsOpen(false); navigate("/consumer/orders"); }}><Bell size={15}/><span><strong>{n.title}</strong><small>{n.text}</small></span></button>) : <p>No new notifications.</p>}</div>}
        {profileOpen && <div className="consumer-popover profile-popover"><strong>{consumerProfile?.fullName || user?.displayName || "Consumer"}</strong><span>{consumerProfile?.email || user?.email || ""}</span><button onClick={() => goTo("profile")}><User size={15}/> View Profile</button><button onClick={openSettings}><Settings size={15}/> Settings</button><button onClick={logout}><LogOut size={15}/> Logout</button></div>}
      </header>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}/>}
      <aside className={`consumer-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-head">
          <button className="consumer-brand sidebar-brand" onClick={() => goTo("home")}>
            <span className="consumer-brand-icon">🌱</span><span><strong>AgriConnect</strong><small>Farm to Home</small></span>
          </button>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><X size={21}/></button>
        </div>
        <div className="sidebar-menu">
          <button className={activeSection === "home" ? "active" : ""} onClick={() => goTo("home")}><Package size={18}/> Home</button>
          <button className={activeSection === "browse" ? "active" : ""} onClick={() => goTo("browse")}><ShoppingBag size={18}/> Browse Produce</button>
          <button className={activeSection === "orders" ? "active" : ""} onClick={() => navigate("/consumer/orders")}><Package size={18}/> My Orders</button>
          <button onClick={() => { setShowCart(true); setSidebarOpen(false); }}><ShoppingCart size={18}/> Cart {cartCount > 0 && <b>{cartCount}</b>}</button>
          <button onClick={() => { setNotificationsOpen(true); setSidebarOpen(false); }}><Bell size={18}/> Notifications {notifications.length > 0 && <b>{notifications.length}</b>}</button>
          <div className="sidebar-parent">
            <button className={activeSection === "profile" || activeSection === "settings" ? "active" : ""} onClick={() => setProfileMenuOpen(v => !v)}><User size={18}/> Profile <ChevronDown size={15} className={profileMenuOpen ? "rotate" : ""}/></button>
            {profileMenuOpen && <div className="sidebar-submenu"><button onClick={() => goTo("profile")}>View Profile</button><button onClick={openSettings}>Settings</button></div>}
          </div>
          <button className={activeSection === "help" ? "active" : ""} onClick={() => goTo("help")}><CircleHelp size={18}/> Help & Support</button>
        </div>
        <button className="sidebar-logout" onClick={logout}><LogOut size={18}/> Logout</button>
      </aside>

      <main className="consumer-main">
        {error && (
          <div className="consumer-error">
            <AlertCircle size={17}/>
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={15}/></button>
          </div>
        )}

        {/* ========================= HOME PAGE ========================= */}
        {activeSection === "home" && (
          <>
            <section id="consumer-home" className="consumer-hero">
              <div className="hero-copy">
                <span className="hero-kicker">🌾 FRESH • VERIFIED • LOCAL</span>
                <h1>Fresh from the farm,<br/><em>directly to you.</em></h1>
                <p>Quality produce from verified farmers and FPOs at fair prices, delivered to your doorstep.</p>

                <div className="hero-location">
                  <MapPin size={17}/>
                  <span>
                    Delivering to{" "}
                    <strong>
                      {consumerProfile?.district || consumerProfile?.village || "your location"}
                      {consumerProfile?.state ? `, ${consumerProfile.state}` : ""}
                    </strong>
                  </span>
                </div>

                <div className="hero-actions">
                  <button className="primary-btn" onClick={() => goTo("browse")}>
                    <ShoppingBag size={17}/> Browse Fresh Produce
                  </button>
                  <button className="secondary-btn" onClick={() => navigate("/consumer/orders")}>
                    View My Orders <ArrowRight size={16}/>
                  </button>
                </div>

                <div className="hero-points">
                  <span>✓ Verified sellers</span>
                  <span>✓ Multiple sources</span>
                  <span>✓ Doorstep delivery</span>
                </div>
              </div>

              <div className="hero-visual">
                <img
                  className="hero-real-image"
                  src="/images/agri-hero.png"
                  alt="Fresh vegetables growing on a local farm"
                />
                <div className="hero-image-overlay"/>
                <div className="hero-image-caption">
                  <strong>From local farms</strong>
                  <span>Fresh produce • Fair prices • Trusted sellers</span>
                </div>
              </div>
            </section>

            <section className="content-section recommendation-section">
              <div className="section-heading">
                <div>
                  <span>PERSONALIZED</span>
                  <h2>Recommended for you</h2>
                  <p>Fresh choices based on your recent activity.</p>
                </div>
                <button onClick={() => goTo("browse")}>
                  View all <ArrowRight size={15}/>
                </button>
              </div>

              <div className="mini-product-grid">
                {recommendedProducts.length
                  ? recommendedProducts.map(p => (
                      <button
                        className="mini-product"
                        key={`${p.id}_${p.sellerId}`}
                        onClick={() => {
                          setSearch(p.name || p.productName || "");
                          goTo("browse");
                        }}
                      >
                        <ProduceIcon name={p.name || p.productName} category={p.category} size={42}/>
                        <span>
                          <strong>{p.name || p.productName}</strong>
                          <small>{money(p.price)} / {p.unit || "kg"}</small>
                        </span>
                        <ArrowRight size={15}/>
                      </button>
                    ))
                  : <div className="inline-empty">Browse produce to get personalized recommendations from your activity.</div>}
              </div>
            </section>

            <section className="content-section feature-strip">
              <div>
                <Truck/>
                <strong>Doorstep delivery</strong>
                <span>Track your order after pickup.</span>
              </div>
              <div>
                <CheckCircle2/>
                <strong>Verified sellers</strong>
                <span>Farmers and FPOs are onboarded through verification.</span>
              </div>
              <div>
                <Heart/>
                <strong>Fair farm-to-home buying</strong>
                <span>Compare sellers and choose what suits you.</span>
              </div>
            </section>

            <section className="content-section home-extra-grid">
              <div className="why-choose">
                <div className="section-heading compact-heading"><div><span>WHY AGRICONNECT</span><h2>Good food builds better lives</h2></div></div>
                <div className="why-grid">
                  <div><span>🌱</span><strong>Fresh & Healthy</strong><small>Farm-fresh produce.</small></div>
                  <div><span>🤝</span><strong>Support Farmers</strong><small>Direct farm purchase.</small></div>
                  <div><span>💚</span><strong>Fair Prices</strong><small>Compare without middlemen.</small></div>
                  <div><span>🌾</span><strong>Wide Variety</strong><small>Farmers and FPOs together.</small></div>
                  <div><span>♻️</span><strong>Local & Sustainable</strong><small>Stronger communities.</small></div>
                </div>
              </div>
              <div className="category-home-card">
                <div className="section-heading compact-heading"><div><span>SHOP SMART</span><h2>Shop by Category</h2></div><button onClick={() => goTo("browse")}>View all <ArrowRight size={14}/></button></div>
                <div className="home-category-grid">
                  {CATEGORIES.filter(c => c !== "All").map(c => <button key={c} onClick={() => { setCategory(c); goTo("browse"); }}><span>{c === "Vegetables" ? "🍅" : c === "Fruits" ? "🍌" : c === "Grains" ? "🌾" : c === "Pulses" ? "🥜" : c === "Leafy Greens" ? "🥬" : "🌶️"}</span><strong>{c}</strong></button>)}
                </div>
              </div>
            </section>

            <section className="content-section seasonal-card">
              <div><span>SEASONAL FRESH PICKS</span><h2>Bring the best of the season to your table.</h2><p>Explore fresh produce currently listed by nearby farmers and FPOs.</p><button onClick={() => goTo("browse")}>Explore Now <ArrowRight size={15}/></button></div>
              <div className="seasonal-visual">🥕 🍅 🥬 🍌</div>
            </section>
          </>
        )}

        {/* ========================= BROWSE PAGE ========================= */}
        {activeSection === "browse" && (
          <section id="consumer-browse" className="content-section browse-section standalone-page">
            <div className="page-top-heading">
              <div>
                <span>FRESH PRODUCE</span>
                <h1>Browse Produce</h1>
                <p>Compare farmers and FPOs by price, distance, availability and actual ratings.</p>
              </div>
              <button className="back-home-btn" onClick={() => goTo("home")}>← Home</button>
            </div>

            <div className="browse-toolbar">
              <div className="browse-search">
                <Search size={17}/>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search vegetables, fruits, grains, farmers..."
                />
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="nearest">Nearest</option>
                <option value="price">Lowest Price</option>
                <option value="rating">Highest Rated</option>
                <option value="stock">Availability</option>
              </select>
            </div>

            <div className="category-scroll">
              {CATEGORIES.map(c => (
                <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>

            <div className="browse-filter-row">
              <button className="filter-toggle" onClick={() => setShowFilters(v => !v)}>
                <SlidersHorizontal size={16}/> Filters
              </button>
              <span>{filteredProducts.length} produce listings</span>
            </div>

            {showFilters && (
              <div className="advanced-filters">
                <label>
                  Max Price
                  <input type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="₹"/>
                </label>
                <label>
                  Max Distance (km)
                  <input type="number" min="0" value={maxDistance} onChange={e => setMaxDistance(e.target.value)} placeholder="km"/>
                </label>
                <label>
                  Minimum Rating
                  <select value={minRating} onChange={e => setMinRating(e.target.value)}>
                    <option value="">Any</option>
                    <option value="4">4+</option>
                    <option value="4.5">4.5+</option>
                  </select>
                </label>
                <label className="filter-check">
                  <input type="checkbox" checked={availabilityOnly} onChange={e => setAvailabilityOnly(e.target.checked)}/>
                  Available only
                </label>
                <button onClick={() => {
                  setMaxPrice("");
                  setMaxDistance("");
                  setMinRating("");
                  setAvailabilityOnly(true);
                }}>Reset</button>
              </div>
            )}

            {loading ? (
              <div className="dashboard-empty"><RefreshCw className="spin"/><h3>Loading fresh produce...</h3></div>
            ) : filteredProducts.length === 0 ? (
              <div className="dashboard-empty">
                <Package size={36}/>
                <h3>No produce found</h3>
                <p>Try another category, seller or filter.</p>
              </div>
            ) : (
              <div className="consumer-product-grid">
                {filteredProducts.map(product => {
                  const key = `${product.id}_${sellerIdOf(product)}`;
                  const inCart = cart[key];
                  const stock = Number(product.quantity ?? product.stock ?? 0);

                  return (
                    <article className="consumer-product-card" key={key}>
                      <div className="product-card-top">
                        <div className="product-icon-wrap">
                          <ProduceIcon name={product.name || product.productName} category={product.category} size={48}/>
                        </div>
                        <span className={stock > 0 ? "stock-badge" : "stock-badge out"}>
                          {stock > 0 ? "Available" : "Out of stock"}
                        </span>
                      </div>

                      <span className="product-category">{product.category || "Produce"}</span>
                      <h3>{product.name || product.productName}</h3>
                      {renderSeller(product)}

                      <div className="product-price">
                        <strong>{money(product.price)}</strong>
                        <span>/ {product.unit || "kg"}</span>
                      </div>

                      <div className="product-stock">
                        {stock.toLocaleString("en-IN")} {product.unit || "kg"} available
                      </div>

                      {inCart ? (
                        <div className="product-qty-control">
                          <button onClick={() => changeCartQuantity(key, -1)}><Minus size={15}/></button>
                          <strong>{inCart.quantity} {product.unit || "kg"}</strong>
                          <button onClick={() => addToCart(product)} disabled={inCart.quantity >= stock}>
                            <Plus size={15}/>
                          </button>
                        </div>
                      ) : (
                        <button className="add-product-btn" onClick={() => addToCart(product)} disabled={stock <= 0}>
                          <Plus size={17}/> Add to Cart
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ========================= ORDERS PAGE ========================= */}
        {activeSection === "orders" && (
          <section id="consumer-orders" className="content-section orders-section standalone-page">
            <div className="page-top-heading">
              <div>
                <span>YOUR ORDERS</span>
                <h1>My Orders</h1>
                <p>Follow every order from confirmation to doorstep delivery.</p>
              </div>
              <button className="back-home-btn" onClick={() => goTo("home")}>← Home</button>
            </div>

            <div className="order-tabs">
              {ORDER_FILTERS.map(f => (
                <button key={f} className={orderFilter === f ? "active" : ""} onClick={() => setOrderFilter(f)}>
                  {f}
                </button>
              ))}
            </div>

            {ordersLoading ? (
              <div className="dashboard-empty"><RefreshCw className="spin"/> Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="dashboard-empty">
                <Package size={35}/>
                <h3>No {orderFilter.toLowerCase()} orders</h3>
                <p>Your placed orders will appear here in realtime.</p>
                <button className="primary-green-btn" onClick={() => goTo("browse")}>Browse Produce</button>
              </div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map(order => (
                  <button className="order-card" key={order.id} onClick={() => setSelectedOrder(order)}>
                    <div className="order-icon"><Package size={22}/></div>
                    <div className="order-main">
                      <div>
                        <strong>Order #{order.id.slice(0, 10)}</strong>
                        <span>{order.itemCount || (order.items || []).length} items</span>
                      </div>
                      <small>{statusLabel(order.status || "confirmed")}</small>
                      <div className="order-progress">
                        <span className="filled"/>
                        <span className={isActiveOrder(order.status) ? "filled" : ""}/>
                        <span className={String(order.status).toLowerCase() === "delivered" ? "filled" : ""}/>
                      </div>
                    </div>
                    <strong>{money(order.totalAmount)}</strong>
                    <ArrowRight size={17}/>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ========================= PROFILE PAGE ========================= */}
        {activeSection === "profile" && (
          <section id="consumer-profile" className="content-section profile-section standalone-page">
            <div className="page-top-heading">
              <div>
                <span>ACCOUNT</span>
                <h1>My Profile</h1>
                <p>Your registered details are used automatically during checkout.</p>
              </div>
              <button className="back-home-btn" onClick={() => goTo("home")}>← Home</button>
            </div>

            <form className="farmer-style-profile" onSubmit={saveProfile}>
              <div className="profile-summary-header">
                <div className="profile-avatar-large">
                  {(profileForm.fullName || "C").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <span className="profile-role">CONSUMER ACCOUNT</span>
                  <h2>{profileForm.fullName || "Consumer"}</h2>
                  <p>{profileForm.email || user?.email || "Registered AgriConnect user"}</p>
                </div>
                <div className="profile-verified">
                  <CheckCircle2 size={17}/>
                  <span>Verified Account</span>
                </div>
              </div>

              <div className="profile-block">
                <div className="profile-block-heading">
                  <User size={18}/>
                  <div><strong>Personal Details</strong><span>Your registered account information</span></div>
                </div>

                <div className="profile-form-grid">
                  <label>Full Name<input name="fullName" value={profileForm.fullName} onChange={updateProfile}/></label>
                  <label>Mobile<input name="mobile" value={profileForm.mobile} onChange={updateProfile}/></label>
                  <label>Email<input name="email" value={profileForm.email} onChange={updateProfile}/></label>
                </div>
              </div>

              <div className="profile-block">
                <div className="profile-block-heading">
                  <MapPin size={18}/>
                  <div><strong>Delivery Address</strong><span>Used for your orders and delivery</span></div>
                </div>

                <div className="profile-form-grid">
                  <label>State<input name="state" value={profileForm.state} onChange={updateProfile}/></label>
                  <label>District<input name="district" value={profileForm.district} onChange={updateProfile}/></label>
                  <label>Mandal / Taluk<input name="mandal" value={profileForm.mandal} onChange={updateProfile}/></label>
                  <label>Village / City<input name="village" value={profileForm.village} onChange={updateProfile}/></label>
                  <label>Pincode<input name="pincode" maxLength={6} value={profileForm.pincode} onChange={updateProfile}/></label>
                  <label className="full-field">Full Address<textarea name="address" rows="3" value={profileForm.address} onChange={updateProfile}/></label>
                </div>
              </div>

              <div className="profile-block profile-location-block">
                <div className="profile-block-heading">
                  <LocateFixed size={18}/>
                  <div><strong>Location</strong><span>Used to calculate nearby farmers/FPO distance</span></div>
                </div>

                <div className="profile-location">
                  <div>
                    <LocateFixed size={19}/>
                    <span>
                      <strong>Saved GPS location</strong>
                      <small>
                        {consumerProfile?.location
                          ? `${Number(consumerProfile.location.latitude).toFixed(5)}, ${Number(consumerProfile.location.longitude).toFixed(5)}`
                          : "GPS location not saved yet"}
                      </small>
                    </span>
                  </div>
                  <button type="button" onClick={captureLocation} disabled={locationSaving}>
                    {locationSaving ? "Saving..." : "Use Current Location"}
                  </button>
                </div>
              </div>

              <div className="profile-actions">
                <button className="save-profile-btn" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
                <button type="button" className="logout-profile-btn" onClick={logout}>
                  <LogOut size={15}/> Logout
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ========================= SETTINGS PAGE ========================= */}
        {activeSection === "settings" && (
          <section className="content-section profile-section standalone-page">
            <div className="page-top-heading">
              <div><span>ACCOUNT SETTINGS</span><h1>Settings</h1><p>Update your personal and delivery details anytime.</p></div>
              <button className="back-home-btn" onClick={() => goTo("profile")}>← View Profile</button>
            </div>
            <form className="farmer-style-profile" onSubmit={saveProfile}>
              <div className="profile-block">
                <div className="profile-block-heading"><Settings size={18}/><div><strong>Update Personal Details</strong><span>Changes are saved to your AgriConnect consumer profile.</span></div></div>
                <div className="profile-form-grid">
                  <label>Full Name<input name="fullName" value={profileForm.fullName} onChange={updateProfile}/></label>
                  <label>Mobile<input name="mobile" value={profileForm.mobile} onChange={updateProfile}/></label>
                  <label>Email<input name="email" value={profileForm.email} onChange={updateProfile}/></label>
                </div>
              </div>
              <div className="profile-block">
                <div className="profile-block-heading"><MapPin size={18}/><div><strong>Delivery Address</strong><span>Keep your delivery details accurate.</span></div></div>
                <div className="profile-form-grid">
                  <label>State<input name="state" value={profileForm.state} onChange={updateProfile}/></label>
                  <label>District<input name="district" value={profileForm.district} onChange={updateProfile}/></label>
                  <label>Mandal / Taluk<input name="mandal" value={profileForm.mandal} onChange={updateProfile}/></label>
                  <label>Village / City<input name="village" value={profileForm.village} onChange={updateProfile}/></label>
                  <label>Pincode<input name="pincode" maxLength="6" value={profileForm.pincode} onChange={updateProfile}/></label>
                  <label className="full-field">Full Address<textarea name="address" rows="3" value={profileForm.address} onChange={updateProfile}/></label>
                </div>
              </div>
              <div className="profile-block">
                <div className="profile-block-heading"><LocateFixed size={18}/><div><strong>Location</strong><span>Used for nearby seller distance calculations.</span></div></div>
                <div className="profile-location"><div><LocateFixed size={19}/><span><strong>Saved GPS location</strong><small>{consumerProfile?.location ? `${Number(consumerProfile.location.latitude).toFixed(5)}, ${Number(consumerProfile.location.longitude).toFixed(5)}` : "GPS location not saved yet"}</small></span></div><button type="button" onClick={captureLocation} disabled={locationSaving}>{locationSaving ? "Saving..." : "Use Current Location"}</button></div>
              </div>
              <div className="profile-actions"><button className="save-profile-btn" disabled={savingProfile}>{savingProfile ? "Saving..." : "Save Changes"}</button></div>
            </form>
          </section>
        )}

        {/* ========================= HELP PAGE ========================= */}
        {activeSection === "help" && (
          <section id="consumer-help" className="content-section help-page standalone-page">
            <div className="page-top-heading">
              <div>
                <span>SUPPORT</span>
                <h1>Help & Support</h1>
                <p>We are here to help with orders, payments and delivery issues.</p>
              </div>
              <button className="back-home-btn" onClick={() => goTo("home")}>← Home</button>
            </div>

            <div className="help-grid">
              {[
                ["Order not received", "Report an order that has not reached you.", Package],
                ["Wrong product", "Tell us if the delivered product is different.", AlertCircle],
                ["Missing item", "Report an item missing from your order.", ShoppingBag],
                ["Damaged produce", "Report damaged or poor-condition produce.", AlertCircle],
                ["Payment issue", "Get help with a payment or order amount.", IndianRupee],
                ["Delivery issue", "Report a delivery partner or tracking problem.", Truck]
              ].map(([title, description, Icon]) => (
                <button
                  className="help-card"
                  key={title}
                  onClick={() => setError(`Support request selected: ${title}. Admin support workflow can process this request.`)}
                >
                  <div><Icon size={19}/></div>
                  <strong>{title}</strong>
                  <span>{description}</span>
                  <ArrowRight size={15}/>
                </button>
              ))}
            </div>

            <div className="help-contact-card">
              <CircleHelp size={28}/>
              <div>
                <strong>Need more help?</strong>
                <p>Select an issue above. Your support request will be handled by the AgriConnect admin team.</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="consumer-mobile-nav">
        {[
          ["home", "Home", Package],
          ["browse", "Browse", ShoppingBag],
          ["orders", "Orders", Package],
          ["profile", "Profile", User],
          ["help", "Help", CircleHelp]
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            className={activeSection === id ? "active" : ""}
            onClick={() => goTo(id)}
          >
            <Icon size={19}/>
            <span>{label}</span>
          </button>
        ))}
        <button className="mobile-cart-nav" onClick={() => setShowCart(true)}>
          <ShoppingCart size={19}/>
          <span>Cart</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </nav>

      {showCart && <div className="consumer-modal-overlay" onMouseDown={e => e.target === e.currentTarget && setShowCart(false)}><aside className="consumer-cart-panel"><div className="modal-header"><div><span>YOUR CART</span><h2>Fresh produce</h2></div><button onClick={() => setShowCart(false)}><X size={18}/></button></div>{!cartItems.length ? <div className="dashboard-empty"><ShoppingCart size={38}/><h3>Your cart is empty</h3><p>Add produce from farmers or FPOs to continue.</p><button className="primary-btn" onClick={() => {setShowCart(false);goTo("browse");}}>Browse Produce</button></div> : <><div className="cart-groups">{sellerGroups.map(group => <div className="cart-seller-group" key={group.sellerId}><div className="cart-seller-head"><span>{group.sellerType === "fpo" ? "🏢" : "👨‍🌾"}</span><strong>{group.sellerName}</strong><small>{group.sellerType === "fpo" ? "FPO" : "Farmer"}</small></div>{group.items.map(item => <div className="cart-item" key={item.cartKey}><ProduceIcon name={item.name || item.productName} category={item.category} size={36}/><div><strong>{item.name || item.productName}</strong><small>{money(item.price)} / {item.unit || "kg"}</small><div className="cart-qty"><button onClick={() => changeCartQuantity(item.cartKey,-1)}><Minus size={13}/></button><b>{item.quantity}</b><button onClick={() => addToCart(item)} disabled={item.quantity >= Number(item.availableQuantity || 0)}><Plus size={13}/></button><button className="remove" onClick={() => removeFromCart(item.cartKey)}>Remove</button></div></div><strong>{money(Number(item.quantity) * Number(item.price))}</strong></div>)}</div>)}</div><div className="cart-summary"><div><span>Items</span><strong>{cartCount}</strong></div><div><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><div><span>Delivery</span><strong>{money(deliveryFee)}</strong></div><div className="total"><span>Total</span><strong>{money(grandTotal)}</strong></div><button className="checkout-btn" onClick={openCheckout}>Proceed to Checkout <ArrowRight size={16}/></button></div></>}</aside></div>}

      {showCheckout && <div className="consumer-modal-overlay" onMouseDown={e => e.target === e.currentTarget && !placingOrder && setShowCheckout(false)}><aside className="consumer-checkout-panel"><div className="modal-header"><div><span>CHECKOUT</span><h2>{orderSuccess ? "Order confirmed" : "Complete your order"}</h2></div><button onClick={() => !placingOrder && setShowCheckout(false)} disabled={placingOrder}><X size={18}/></button></div>{orderSuccess ? <div className="order-success-screen"><div className="success-circle"><CheckCircle2 size={40}/></div><span>ORDER PLACED SUCCESSFULLY</span><h2>Fresh produce is on its way.</h2><p>Order ID: <strong>{orderSuccess.orderId}</strong></p><p>Your order is split across <strong>{orderSuccess.sellerCount}</strong> seller{orderSuccess.sellerCount !== 1 ? "s" : ""}.</p><strong className="success-total">{money(orderSuccess.total)}</strong><button className="checkout-btn" onClick={() => {setShowCheckout(false);setOrderSuccess(null);navigate("/consumer/orders");}}>Track My Order</button></div> : <form className="checkout-form" onSubmit={placeOrder}><section className="checkout-section"><div className="checkout-heading"><MapPin size={18}/><div><strong>Delivery Address</strong><span>We will use this address for doorstep delivery.</span></div></div><div className="checkout-grid"><label>Full Name *<input name="fullName" value={checkoutForm.fullName} onChange={updateCheckout}/></label><label>Mobile *<input name="mobile" maxLength={10} inputMode="numeric" value={checkoutForm.mobile} onChange={updateCheckout}/></label><label className="full-field">Full Address *<textarea name="address" rows="3" value={checkoutForm.address} onChange={updateCheckout}/></label><label>Village / City<input name="village" value={checkoutForm.village} onChange={updateCheckout}/></label><label>Mandal / Taluk<input name="mandal" value={checkoutForm.mandal} onChange={updateCheckout}/></label><label>District *<input name="district" value={checkoutForm.district} onChange={updateCheckout}/></label><label>State *<input name="state" value={checkoutForm.state} onChange={updateCheckout}/></label><label>Pincode *<input name="pincode" maxLength={6} inputMode="numeric" value={checkoutForm.pincode} onChange={updateCheckout}/></label></div><div className="checkout-location-note"><LocateFixed size={16}/>{consumerProfile?.location ? "GPS location saved for delivery distance calculation." : "Save your GPS location in Profile for better distance calculation."}</div></section><section className="checkout-section"><div className="checkout-heading"><ShoppingBag size={18}/><div><strong>Seller-wise Order Summary</strong><span>Your cart can contain products from multiple farmers and FPOs.</span></div></div>{sellerGroups.map(g => <div className="checkout-seller-summary" key={g.sellerId}><div><strong>{g.sellerType === "fpo" ? "🏢" : "👨‍🌾"} {g.sellerName}</strong><span>{g.items.length} item{g.items.length !== 1 ? "s" : ""}</span></div><strong>{money(g.total)}</strong></div>)}</section><section className="checkout-section"><div className="checkout-heading"><IndianRupee size={18}/><div><strong>Payment</strong><span>Prototype uses prepaid demo verification.</span></div></div><div className="payment-selected"><CheckCircle2 size={19}/><div><strong>Online Prepaid Payment</strong><span>Payment verified before stock is reduced.</span></div></div></section><div className="checkout-total-bar"><div><span>Items</span><strong>{money(cartTotal)}</strong></div><div><span>Delivery</span><strong>{money(deliveryFee)}</strong></div><div className="grand"><span>Total</span><strong>{money(grandTotal)}</strong></div><button className="checkout-btn" disabled={placingOrder}>{placingOrder ? "Processing Payment..." : `Pay ${money(grandTotal)}`}</button></div></form>}</aside></div>}

      {selectedOrder && <div className="consumer-modal-overlay" onMouseDown={e => e.target === e.currentTarget && setSelectedOrder(null)}><aside className="order-detail-panel"><div className="modal-header"><div><span>ORDER DETAILS</span><h2>#{selectedOrder.id.slice(0, 10)}</h2></div><button onClick={() => setSelectedOrder(null)}><X size={18}/></button></div><div className="tracking-status"><div className="tracking-icon"><Truck size={28}/></div><div><strong>{statusLabel(selectedOrder.status || "confirmed")}</strong><span>{selectedOrder.status === "delivered" ? "Your order has been delivered." : "Your order is moving through the delivery process."}</span></div></div><div className="tracking-timeline">{["confirmed", "accepted", "preparing", "assigned", "picked_up", "out_for_delivery", "delivered"].map((s, i) => { const current = ["confirmed","accepted","preparing","assigned","picked_up","out_for_delivery","delivered"].indexOf(String(selectedOrder.status || "confirmed").toLowerCase()); return <div key={s} className={i <= current ? "done" : ""}><span>{i <= current ? "✓" : i + 1}</span><strong>{statusLabel(s)}</strong></div>; })}</div><div className="order-detail-items">{(selectedOrder.items || []).map((item, i) => <div key={`${item.productId}-${i}`}><ProduceIcon name={item.name} category={item.category} size={30}/><span><strong>{item.name}</strong><small>{item.quantity} {item.unit} × {money(item.price)} • {item.sellerName}</small></span><strong>{money(item.lineTotal)}</strong></div>)}</div><div className="order-detail-total"><span>Total paid</span><strong>{money(selectedOrder.totalAmount)}</strong></div><div className="delivery-contact"><Truck size={18}/><div><strong>{selectedOrder.deliveryAgentName || "Delivery partner will be assigned soon."}</strong><small>{selectedOrder.deliveryAgentPhone ? `Contact: ${selectedOrder.deliveryAgentPhone}` : "You will see partner details here after assignment."}</small></div>{selectedOrder.deliveryAgentPhone && <a href={`tel:${selectedOrder.deliveryAgentPhone}`}><Phone size={16}/></a>}</div></aside></div>}
    </div>
  );
}

export default ConsumerDashboard;
