import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import ProduceIcon from "../../components/ProduceIcon";
import "./ConsumerCheckout.css";

const PAYMENT_METHOD = "ONLINE";

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function generateDeliveryOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function ConsumerCheckout() {
  const [userId, setUserId] = useState("");
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentState, setPaymentState] = useState("idle");
  const [showMockPayment, setShowMockPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("UPI");
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [error, setError] = useState("");

  const [checkoutForm, setCheckoutForm] = useState({
    fullName: "",
    mobile: "",
    address: "",
    village: "",
    mandal: "",
    district: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || "");
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("status", "==", "active")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        setProducts(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (err) => console.error("Product listener:", err)
    );
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agriconnect_cart");
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("agriconnect_cart", JSON.stringify(cart));
  }, [cart]);

  const farmerGroups = useMemo(() => {
    const groups = {};

    cart.forEach((item) => {
      const key = item.farmerId || "unknown";

      if (!groups[key]) {
        groups[key] = {
          farmerId: item.farmerId,
          farmerName: item.farmerName || "Farmer",
          items: [],
          subtotal: 0,
        };
      }

      groups[key].items.push(item);
      groups[key].subtotal +=
        Number(item.price || 0) * Number(item.quantity || 0);
    });

    return Object.values(groups);
  }, [cart]);

  const totalAmount = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  function openCheckout() {
    setError("");
    setOrderSuccess(null);
    setPaymentState("idle");

    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    setShowCheckout(true);
  }

  function closeCheckout() {
    if (placingOrder) return;

    setShowCheckout(false);
    setError("");
    setPaymentState("idle");
  }

  function handleCheckoutChange(event) {
    const { name, value } = event.target;

    setCheckoutForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function processMockPayment() {
    setPaymentState("processing");

    await new Promise((resolve) => setTimeout(resolve, 1400));

    return {
      verified: true,
      paymentId: `MOCK_PAY_${Date.now()}`,
      gatewayOrderId: `MOCK_ORDER_${Date.now()}`,
      method: selectedPaymentMethod,
    };
  }

  function openMockPayment() {
    setError("");
    setPaymentState("idle");

    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    setShowMockPayment(true);
  }

  function closeMockPayment() {
    if (placingOrder) return;

    setShowMockPayment(false);
    setPaymentState("idle");
  }

  async function createPaidOrder(payment) {
    if (!userId) {
      throw new Error("Please login before placing an order.");
    }

    const requiredMobile = checkoutForm.mobile.replace(/\D/g, "");
    const requiredPincode = checkoutForm.pincode.replace(/\D/g, "");

    if (
      !checkoutForm.fullName.trim() ||
      !requiredMobile ||
      !checkoutForm.address.trim() ||
      !checkoutForm.village.trim() ||
      !checkoutForm.district.trim() ||
      !checkoutForm.state.trim() ||
      !requiredPincode
    ) {
      throw new Error("Please complete all required delivery details.");
    }

    if (requiredMobile.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number.");
    }

    if (requiredPincode.length !== 6) {
      throw new Error("Please enter a valid 6-digit pincode.");
    }

    if (!cart.length) {
      throw new Error("Your cart is empty.");
    }

    const result = await runTransaction(db, async (transaction) => {
      const productRefs = cart.map((item) =>
        doc(db, "products", item.id)
      );

      const productSnapshots = [];

      for (const ref of productRefs) {
        productSnapshots.push(await transaction.get(ref));
      }

      const latestItems = cart.map((item, index) => {
        const snapshot = productSnapshots[index];

        if (!snapshot.exists()) {
          throw new Error(
            `${item.name || "A product"} is no longer available.`
          );
        }

        const latest = snapshot.data();
        const available = Number(latest.quantity || 0);
        const requested = Number(item.quantity || 0);

        if (requested <= 0) {
          throw new Error(`Invalid quantity for ${item.name}.`);
        }

        if (requested > available) {
          throw new Error(
            `${item.name}: only ${available} ${
              latest.unit || item.unit || "unit"
            } available.`
          );
        }

        return {
          ...item,
          latestPrice: Number(latest.price ?? item.price ?? 0),
          latestUnit: latest.unit || item.unit || "kg",
          latestCategory: latest.category || item.category || "",
          latestFarmerName:
            latest.farmerName || item.farmerName || "Farmer",
        };
      });

      const finalTotal = latestItems.reduce(
        (sum, item) =>
          sum + item.latestPrice * Number(item.quantity || 0),
        0
      );

      const orderRef = doc(collection(db, "orders"));

      // One fixed OTP per order. It is generated only when the order is placed.
      const deliveryOtp = generateDeliveryOtp();

      const orderItems = latestItems.map((item) => ({
        productId: item.id,
        farmerId: item.farmerId,
        farmerName: item.latestFarmerName,
        name: item.name,
        category: item.latestCategory,
        quantity: Number(item.quantity),
        unit: item.latestUnit,
        price: item.latestPrice,
        lineTotal:
          item.latestPrice * Number(item.quantity),
      }));

      const deliveryAddress = {
        fullName: checkoutForm.fullName.trim(),
        mobile: requiredMobile,
        address: checkoutForm.address.trim(),
        village: checkoutForm.village.trim(),
        mandal: checkoutForm.mandal.trim(),
        district: checkoutForm.district.trim(),
        state: checkoutForm.state.trim(),
        pincode: requiredPincode,
      };

      transaction.set(orderRef, {
        consumerId: userId,
        consumerName: checkoutForm.fullName.trim(),
        consumerMobile: requiredMobile,
        orderType: "multi-farmer",
        status: "confirmed",
        paymentMethod: PAYMENT_METHOD,
        paymentStatus: "paid",
        paymentId: payment.paymentId,
        gatewayOrderId: payment.gatewayOrderId,
        paymentProvider: "MOCK",
        paymentMode: payment.method,
        totalAmount: finalTotal,
        itemCount: orderItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        ),
        farmerIds: [
          ...new Set(orderItems.map((item) => item.farmerId)),
        ],
        farmerCount: new Set(
          orderItems.map((item) => item.farmerId)
        ).size,
        items: orderItems,
        deliveryAddress,

        // SIH prototype delivery handover OTP.
        // The same OTP is kept for the complete delivery lifecycle.
        deliveryOtp,
        deliveryOtpStatus: "active",

        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      latestItems.forEach((item, index) => {
        const snapshot = productSnapshots[index];
        const currentQuantity = Number(
          snapshot.data().quantity || 0
        );
        const requested = Number(item.quantity || 0);

        transaction.update(productRefs[index], {
          quantity: currentQuantity - requested,
          updatedAt: serverTimestamp(),
        });
      });

      const groups = {};

      orderItems.forEach((item) => {
        if (!groups[item.farmerId]) {
          groups[item.farmerId] = {
            farmerId: item.farmerId,
            farmerName: item.farmerName,
            items: [],
            subtotal: 0,
          };
        }

        groups[item.farmerId].items.push(item);
        groups[item.farmerId].subtotal += item.lineTotal;
      });

      Object.values(groups).forEach((group) => {
        const farmerOrderRef = doc(
          collection(db, "farmerOrders")
        );

        transaction.set(farmerOrderRef, {
          parentOrderId: orderRef.id,
          consumerId: userId,
          farmerId: group.farmerId,
          farmerName: group.farmerName,
          status: "pending",
          paymentMethod: PAYMENT_METHOD,
          paymentStatus: "paid",
          paymentId: payment.paymentId,
          paymentProvider: "MOCK",
          paymentMode: payment.method,
          farmerAmount: group.subtotal,
          items: group.items,
          consumerName: checkoutForm.fullName.trim(),
          consumerMobile: requiredMobile,
          deliveryAddress,
          deliveryAgentId: null,

          // Same OTP is copied to each seller-side order so the
          // delivery request can use it at final handover.
          deliveryOtp,
          deliveryOtpStatus: "active",

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      const paymentRef = doc(collection(db, "payments"));

      transaction.set(paymentRef, {
        orderId: orderRef.id,
        consumerId: userId,
        amount: finalTotal,
        currency: "INR",
        method: payment.method,
        paymentMethod: PAYMENT_METHOD,
        provider: "MOCK",
        status: "paid",
        paymentId: payment.paymentId,
        gatewayOrderId: payment.gatewayOrderId,
        createdAt: serverTimestamp(),
      });

      const eventRef = doc(collection(db, "orderEvents"));

      transaction.set(eventRef, {
        parentOrderId: orderRef.id,
        consumerId: userId,
        type: "ORDER_PAID_AND_CONFIRMED",
        paymentStatus: "paid",
        paymentProvider: "MOCK",
        createdAt: serverTimestamp(),
      });

      return {
        orderId: orderRef.id,
        totalAmount: finalTotal,
        deliveryOtp,
      };
    });

    return result;
  }

  function placeOrder() {
    if (placingOrder) return;

    setError("");
    setOrderSuccess(null);

    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    setShowMockPayment(true);
  }

  async function completeMockPayment() {
    if (placingOrder) return;

    setError("");
    setPlacingOrder(true);

    try {
      const payment = await processMockPayment();

      if (!payment?.verified) {
        throw new Error("Mock payment could not be verified.");
      }

      setPaymentState("verified");

      const result = await createPaidOrder(payment);

      setCart([]);
      localStorage.removeItem("agriconnect_cart");

      setShowMockPayment(false);
      setShowCheckout(false);
      setOrderSuccess(result);
    } catch (err) {
      console.error("Checkout failed:", err);
      setError(
        err.message || "Unable to place the order."
      );
      setPaymentState("failed");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="consumer-checkout-button"
        disabled={!cart.length || placingOrder}
        onClick={openCheckout}
      >
        Proceed to Secure Payment · {money(totalAmount)}
      </button>

      {orderSuccess && (
        <div className="consumer-order-success">
          <div className="consumer-success-icon">✓</div>
          <span>PAYMENT SUCCESSFUL</span>
          <h3>Order confirmed</h3>
          <p>
            Order #
            {orderSuccess.orderId.slice(-8).toUpperCase()}
          </p>
          <strong className="consumer-success-total">
            {money(orderSuccess.totalAmount)}
          </strong>
          <p>Your order has been sent to the seller.</p>

          <div className="consumer-delivery-otp-card">
            <span>DELIVERY OTP</span>
            <strong>{orderSuccess.deliveryOtp}</strong>
            <p>
              Share this OTP with the delivery partner only
              when your produce reaches you.
            </p>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="consumer-checkout-overlay">
          <div className="consumer-checkout-panel">
            <div className="consumer-checkout-header">
              <div>
                <span>SECURE CHECKOUT</span>
                <h2>Complete your order</h2>
                <p>
                  Pay online before your produce is prepared.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCheckout}
                disabled={placingOrder}
                aria-label="Close checkout"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="consumer-checkout-error">
                {error}
              </div>
            )}

            <div className="consumer-checkout-content">
              <section className="consumer-checkout-section">
                <div className="consumer-section-title">
                  <span>01</span>
                  <h3>Delivery details</h3>
                </div>

                <div className="consumer-form-grid">
                  <label>
                    Full name *
                    <input
                      name="fullName"
                      value={checkoutForm.fullName}
                      onChange={handleCheckoutChange}
                      placeholder="Enter your name"
                    />
                  </label>

                  <label>
                    Mobile *
                    <input
                      name="mobile"
                      value={checkoutForm.mobile}
                      onChange={handleCheckoutChange}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile"
                    />
                  </label>

                  <label className="full">
                    Address *
                    <textarea
                      name="address"
                      value={checkoutForm.address}
                      onChange={handleCheckoutChange}
                      rows={2}
                      placeholder="House / street / landmark"
                    />
                  </label>

                  <label>
                    Village *
                    <input
                      name="village"
                      value={checkoutForm.village}
                      onChange={handleCheckoutChange}
                    />
                  </label>

                  <label>
                    Mandal
                    <input
                      name="mandal"
                      value={checkoutForm.mandal}
                      onChange={handleCheckoutChange}
                    />
                  </label>

                  <label>
                    District *
                    <input
                      name="district"
                      value={checkoutForm.district}
                      onChange={handleCheckoutChange}
                    />
                  </label>

                  <label>
                    State *
                    <input
                      name="state"
                      value={checkoutForm.state}
                      onChange={handleCheckoutChange}
                    />
                  </label>

                  <label>
                    Pincode *
                    <input
                      name="pincode"
                      value={checkoutForm.pincode}
                      onChange={handleCheckoutChange}
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </label>
                </div>
              </section>

              <section className="consumer-checkout-section">
                <div className="consumer-section-title">
                  <span>02</span>
                  <h3>Seller-wise order summary</h3>
                </div>

                <p className="consumer-section-description">
                  Your cart can contain products from multiple
                  farmers and FPOs.
                </p>

                <div className="consumer-farmer-groups">
                  {farmerGroups.map((group) => (
                    <div
                      className="consumer-farmer-group"
                      key={group.farmerId}
                    >
                      <div className="consumer-farmer-group-top">
                        <div>
                          <strong>
                            👨‍🌾 {group.farmerName}
                          </strong>
                          <span>
                            {group.items.length} item(s)
                          </span>
                        </div>

                        <b>{money(group.subtotal)}</b>
                      </div>

                      {group.items.map((item) => (
                        <div
                          className="consumer-checkout-item"
                          key={`${item.id}-${item.farmerId}`}
                        >
                          <ProduceIcon
                            name={item.name}
                            category={item.category}
                            size={30}
                          />

                          <span>
                            {item.name} · {item.quantity}{" "}
                            {item.unit || "kg"}
                          </span>

                          <b>
                            {money(
                              Number(item.price || 0) *
                                Number(item.quantity || 0)
                            )}
                          </b>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              <section className="consumer-payment-box">
                <div className="consumer-section-title">
                  <span>03</span>
                  <h3>Payment</h3>
                </div>

                <div className="consumer-online-payment">
                  <div className="consumer-payment-icon">
                    ✓
                  </div>

                  <div>
                    <strong>Online Prepaid</strong>
                    <span>
                      Secure mock payment · No cash collection
                      at delivery
                    </span>
                  </div>

                  <b>{money(totalAmount)}</b>
                </div>

                <div className="consumer-payment-note">
                  🔒 This is a simulated payment for the SIH
                  prototype. No real money is charged.
                </div>
              </section>
            </div>

            <div className="consumer-checkout-footer">
              <div>
                <span>Total payable</span>
                <strong>{money(totalAmount)}</strong>
              </div>

              <button
                type="button"
                className="consumer-pay-button"
                disabled={placingOrder || !cart.length}
                onClick={placeOrder}
              >
                {placingOrder
                  ? "Opening Payment..."
                  : `Pay ${money(totalAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMockPayment && (
        <div className="mock-payment-overlay">
          <div className="mock-payment-modal">
            <div className="mock-payment-header">
              <div>
                <span>AGRICONNECT PAY</span>
                <h3>Complete your payment</h3>
                <p>
                  Mock payment · No real money will be charged
                </p>
              </div>

              <button
                type="button"
                className="mock-payment-close"
                onClick={closeMockPayment}
                disabled={placingOrder}
                aria-label="Close payment"
              >
                ×
              </button>
            </div>

            <div className="mock-payment-amount">
              <span>Amount payable</span>
              <strong>{money(totalAmount)}</strong>
            </div>

            <div className="mock-payment-method-title">
              Choose payment method
            </div>

            <div className="mock-payment-methods">
              {[
                {
                  id: "UPI",
                  icon: "◉",
                  title: "UPI",
                  subtitle: "GPay · PhonePe · Paytm",
                },
                {
                  id: "CARD",
                  icon: "▣",
                  title: "Card",
                  subtitle: "Credit / Debit Card",
                },
                {
                  id: "NETBANKING",
                  icon: "⌂",
                  title: "Net Banking",
                  subtitle: "All major banks",
                },
              ].map((method) => (
                <button
                  type="button"
                  key={method.id}
                  className={`mock-payment-method ${
                    selectedPaymentMethod === method.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedPaymentMethod(method.id)
                  }
                  disabled={placingOrder}
                >
                  <span className="mock-method-icon">
                    {method.icon}
                  </span>

                  <span>
                    <strong>{method.title}</strong>
                    <small>{method.subtitle}</small>
                  </span>

                  <span className="mock-method-radio">
                    {selectedPaymentMethod === method.id
                      ? "✓"
                      : ""}
                  </span>
                </button>
              ))}
            </div>

            <div className="mock-payment-info">
              <span>🔒</span>
              <div>
                <strong>Demo payment</strong>
                <p>
                  This is a simulated payment for the SIH
                  prototype. No real money is charged.
                </p>
              </div>
            </div>

            {paymentState === "failed" && (
              <div className="mock-payment-error">
                Payment failed. Please try again.
              </div>
            )}

            <div className="mock-payment-actions">
              <button
                type="button"
                className="mock-cancel-button"
                onClick={closeMockPayment}
                disabled={placingOrder}
              >
                Cancel
              </button>

              <button
                type="button"
                className="mock-pay-button"
                onClick={completeMockPayment}
                disabled={placingOrder}
              >
                {placingOrder
                  ? "Processing Payment..."
                  : `Simulate Payment · ${money(totalAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
