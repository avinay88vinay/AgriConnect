import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CheckCircle2, Clock3, MapPin, Package, Phone,
  RefreshCw, Truck, X, ArrowLeft, ShoppingBag, Sparkles
} from "lucide-react";
import {
  collection, onSnapshot, orderBy, query, where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import "./ConsumerOrderTracking.css";

const STEPS = [
  ["pending", "Order Placed", "Your order has been received."],
  ["accepted", "Accepted", "Farmer/FPO accepted your order."],
  ["preparing", "Preparing", "Your produce is being prepared."],
  ["ready_for_pickup", "Ready for Pickup", "Waiting for platform delivery pickup."],
  ["assigned", "Delivery Assigned", "A delivery partner has accepted the delivery."],
  ["picked_up", "Picked Up", "Your produce has been collected."],
  ["out_for_delivery", "Out for Delivery", "Your order is on the way."],
  ["delivered", "Delivered", "Order delivered successfully."]
];

const money = v => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const label = s => String(s || "").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

function rank(status) {
  const s = String(status || "pending").toLowerCase();
  if (s === "completed") return 7;
  if (s === "delivered") return 7;
  if (s === "out_for_delivery") return 6;
  if (s === "picked_up") return 5;
  if (s === "assigned") return 4;
  if (s === "ready") return 3;
  if (s === "ready_for_pickup") return 3;
  if (s === "preparing") return 2;
  if (s === "accepted" || s === "confirmed") return 1;
  return 0;
}

function statusForOrder(order) {
  const s = String(order?.status || "pending").toLowerCase();
  if (s === "confirmed") return "accepted";
  if (s === "ready") return "ready_for_pickup";
  if (s === "completed") return "delivered";
  return s;
}

function isActive(o) {
  return !["delivered", "completed", "cancelled", "rejected"].includes(
    String(o.status || "").toLowerCase()
  );
}

export default function ConsumerOrderTracking() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, u => setUser(u || null)), []);

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setSellerOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubs = [];

    const q1 = query(
      collection(db, "orders"),
      where("consumerId", "==", user.uid)
    );

    unsubs.push(onSnapshot(q1, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
        return bt - at;
      });
      setOrders(rows);
      setLoading(false);
    }, e => {
      console.error(e);
      setError("Unable to load your orders.");
      setLoading(false);
    }));

    // Keep this page readable with the current consumer Firestore permissions.
    // The parent `orders` document is the consumer-facing source of truth.
    // Seller-side collections can be secured separately without breaking tracking.
    setSellerOrders([]);
    return () => unsubs.forEach(fn => fn());
  }, [user?.uid]);

  const mergedOrders = useMemo(() => {
    return orders.map(parent => {
      const rawStatus = String(parent?.status || "pending").toLowerCase();
      const status =
        rawStatus === "confirmed" ? "accepted" :
        rawStatus === "ready" ? "ready_for_pickup" :
        rawStatus === "completed" ? "delivered" :
        rawStatus;

      return {
        ...parent,
        status,
        sellerOrders: [],
        deliveryAgentId:
          parent.deliveryAgentId ||
          parent.assignedDeliveryAgentId ||
          null,
        deliveryAgentName: parent.deliveryAgentName || "",
        deliveryAgentMobile:
          parent.deliveryAgentMobile ||
          parent.deliveryAgentPhone ||
          "",
        deliveryOtp:
          parent.deliveryOtp ||
          parent.consumerDeliveryOtp ||
          ""
      };
    });
  }, [orders]);
  const visible = useMemo(() => {
    if (filter === "active") return mergedOrders.filter(isActive);
    if (filter === "delivered") {
      return mergedOrders.filter(o =>
        ["delivered", "completed"].includes(String(o.status).toLowerCase())
      );
    }
    return mergedOrders;
  }, [mergedOrders, filter]);

  const selectedOrder =
    mergedOrders.find(o => o.id === selected?.id) || selected;

  const currentRank = rank(selectedOrder?.status);
  const otpVisible =
    String(selectedOrder?.status || "").toLowerCase() === "out_for_delivery" ||
    String(selectedOrder?.status || "").toLowerCase() === "delivered";

  const orderItems = Array.isArray(selectedOrder?.items)
    ? selectedOrder.items
    : (selectedOrder?.items && typeof selectedOrder.items === "object"
      ? Object.values(selectedOrder.items)
      : []);
  const sellerCount = Array.isArray(selectedOrder?.sellerOrders)
    ? selectedOrder.sellerOrders.length
    : 0;

  const activeCount = mergedOrders.filter(isActive).length;
  const deliveredCount = mergedOrders.filter(o =>
    ["delivered", "completed"].includes(String(o.status || "").toLowerCase())
  ).length;
  const totalSpent = mergedOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount || o.amount || 0),
    0
  );

  if (!user) {
    return <div className="consumer-orders-page"><div className="orders-empty">Please login to view your orders.</div></div>;
  }

  return (
    <div className="consumer-orders-page">
      <header className="orders-header">
        <div className="orders-topline">
          <button
            className="orders-brand"
            type="button"
            onClick={() => navigate("/consumer/dashboard")}
            aria-label="Back to Consumer Dashboard"
          >
            <span className="orders-brand-icon"><ShoppingBag size={18}/></span>
            <span>AgriConnect</span>
          </button>

          <div className="orders-header-actions">
            <button
              className="orders-back"
              type="button"
              onClick={() => navigate("/consumer/dashboard")}
            >
              <ArrowLeft size={16}/> Dashboard
            </button>
            <button
              className="orders-refresh"
              type="button"
              onClick={() => window.location.reload()}
              title="Refresh orders"
            >
              <RefreshCw size={16}/> Refresh
            </button>
          </div>
        </div>

        <div className="orders-heading">
          <div className="orders-heading-copy">
            <span className="orders-kicker"><Sparkles size={13}/> LIVE ORDER TRACKING</span>
            <h1>My Orders</h1>
            <p>Track every farmer and FPO order from acceptance to doorstep delivery.</p>
          </div>
          <div className="orders-live-pill"><span/> Live updates</div>
        </div>

        <div className="orders-summary">
          <div className="summary-card">
            <span className="summary-icon"><Package size={18}/></span>
            <div><strong>{mergedOrders.length}</strong><small>Total orders</small></div>
          </div>
          <div className="summary-card">
            <span className="summary-icon active"><Truck size={18}/></span>
            <div><strong>{activeCount}</strong><small>In progress</small></div>
          </div>
          <div className="summary-card">
            <span className="summary-icon done"><CheckCircle2 size={18}/></span>
            <div><strong>{deliveredCount}</strong><small>Delivered</small></div>
          </div>
          <div className="summary-card">
            <span className="summary-icon money">₹</span>
            <div><strong>{money(totalSpent)}</strong><small>Total spent</small></div>
          </div>
        </div>
      </header>

      <div className="orders-tabs">
        <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active</button>
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All Orders</button>
        <button className={filter === "delivered" ? "active" : ""} onClick={() => setFilter("delivered")}>Delivered</button>
      </div>

      {error && <div className="orders-error"><AlertCircle size={17}/>{error}</div>}

      {loading ? (
        <div className="orders-empty">Loading orders...</div>
      ) : visible.length === 0 ? (
        <div className="orders-empty">
          <Package size={42}/>
          <h3>No orders here</h3>
          <p>Your realtime order history will appear here.</p>
        </div>
      ) : (
        <div className="orders-grid">
          <div className="orders-list">
            <div className="list-heading">
              <div>
                <span>YOUR ORDERS</span>
                <strong>{visible.length} {visible.length === 1 ? "order" : "orders"}</strong>
              </div>
              <small>Tap an order to view details</small>
            </div>
            {visible.map(order => {
              const status = statusForOrder(order);
              const liveStatus = String(order.status || status).toLowerCase();
              return (
                <button
                  key={order.id}
                  className={`order-list-card ${selectedOrder?.id === order.id ? "selected" : ""}`}
                  onClick={() => setSelected(order)}
                >
                  <div className="order-card-top">
                    <span className="order-id">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <b className={`status-chip status-${liveStatus}`}>{label(liveStatus)}</b>
                  </div>
                  <div className="order-card-middle">
                    <Package size={19}/>
                    <div>
                      <strong>{orderItemsForCard(order)}</strong>
                      <small>
                        {sellerCount || order.farmerIds?.length || order.fpoIds?.length || 1} seller
                        {(sellerCount || order.farmerIds?.length || order.fpoIds?.length || 1) !== 1 ? "s" : ""}
                      </small>
                    </div>
                  </div>
                  <div className="order-card-bottom">
                    <span>{money(order.totalAmount || order.amount)}</span>
                    <span>{order.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "Recent"}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedOrder && (
            <section className="order-details">
              <div className="details-top">
                <div>
                  <span className="details-label">ORDER DETAILS</span>
                  <h2>#{selectedOrder.id.slice(0, 10).toUpperCase()}</h2>
                </div>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close order details"><X size={19}/></button>
              </div>

              <div className="status-banner">
                <div className="status-banner-icon"><Truck size={22}/></div>
                <div>
                  <span>Current status</span>
                  <strong>{label(selectedOrder.status)}</strong>
                </div>
                <span className="status-live-dot"/>
              </div>

              <div className="timeline">
                {STEPS.map(([key, title, text], i) => {
                  const done = currentRank >= rank(key);
                  const current = selectedOrder.status === key;
                  return (
                    <div className={`timeline-step ${done ? "done" : ""} ${current ? "current" : ""}`} key={key}>
                      <div className="timeline-dot">
                        {done ? <CheckCircle2 size={17}/> : <Clock3 size={16}/>}
                      </div>
                      <div>
                        <strong>{title}</strong>
                        <p>{current ? text : done ? "Completed" : "Waiting"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {otpVisible && selectedOrder.deliveryOtp && (
                <div className="otp-card">
                  <span>DELIVERY OTP</span>
                  <strong>{String(selectedOrder.deliveryOtp)}</strong>
                  <p>Share this OTP with the delivery partner only when your order arrives.</p>
                </div>
              )}

              {selectedOrder.deliveryAgentName && (
                <div className="agent-card">
                  <div className="agent-icon"><Truck size={21}/></div>
                  <div>
                    <span>Delivery Partner</span>
                    <strong>{selectedOrder.deliveryAgentName}</strong>
                  </div>
                  {selectedOrder.deliveryAgentMobile && (
                    <a href={`tel:${selectedOrder.deliveryAgentMobile}`} aria-label="Call delivery partner">
                      <Phone size={18}/>
                    </a>
                  )}
                </div>
              )}

              {selectedOrder.deliveryAddress && (
                <div className="address-card">
                  <MapPin size={19}/>
                  <div>
                    <span>Delivery Address</span>
                    <strong>{formatAddress(selectedOrder.deliveryAddress)}</strong>
                  </div>
                </div>
              )}

              <div className="items-card">
                <div className="items-title">Items</div>
                {orderItems.map((item, i) => (
                  <div className="item-row" key={`${item.productId || item.id || i}`}>
                    <span>{item.productName || item.name || "Produce"} × {item.quantity || item.qty || 1}</span>
                    <strong>{money(item.total || item.amount || (Number(item.price || 0) * Number(item.quantity || item.qty || 1)))}</strong>
                  </div>
                ))}
              </div>

              {sellerCount > 1 && (
                <div className="split-note">
                  This order contains <b>{sellerCount}</b> farmer/FPO seller orders. Delivery is managed by AgriConnect.
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function formatAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  if (typeof address !== "object") return String(address);

  return [
    address.address,
    address.village,
    address.mandal,
    address.district,
    address.state,
    address.pincode
  ].filter(Boolean).join(", ");
}

function orderItemsForCard(order) {
  const items = Array.isArray(order?.items)
    ? order.items
    : (order?.items && typeof order.items === "object"
      ? Object.values(order.items)
      : []);
  if (!items.length) return "Produce order";
  const first = items[0]?.productName || items[0]?.name || "Produce";
  return items.length === 1 ? first : `${first} + ${items.length - 1} more`;
}
