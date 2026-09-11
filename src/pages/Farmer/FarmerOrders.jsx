import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import ProduceIcon from "../../components/ProduceIcon";
import "./FarmerOrders.css";

/* =========================================================
   ORDER STATUS
========================================================= */

const STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PREPARING: "preparing",
  REJECTED: "rejected",
  READY_FOR_PICKUP: "ready_for_pickup",
  ASSIGNED: "assigned",
  PICKED_UP: "picked_up",
  DELIVERED: "delivered",
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function statusLabel(status) {
  return {
    pending: "New Order",
    accepted: "Accepted",
    preparing: "Preparing",
    rejected: "Rejected",
    ready_for_pickup: "Ready for Pickup",
    assigned: "Delivery Assigned",
    picked_up: "Picked Up",
    delivered: "Delivered",
  }[status] || status;
}

function cleanText(value) {
  return String(value || "").trim();
}

/* =========================================================
   QUANTITY / WEIGHT HELPERS
========================================================= */

function quantityToKg(quantity, unit = "") {
  const q = Number(quantity || 0);
  const normalized = String(unit || "").toLowerCase().trim();

  if (!Number.isFinite(q)) return 0;

  if (
    normalized === "g" ||
    normalized === "gram" ||
    normalized === "grams"
  ) {
    return q / 1000;
  }

  if (
    normalized === "ml" ||
    normalized === "milliliter" ||
    normalized === "milliliters"
  ) {
    return q / 1000;
  }

  if (
    normalized === "quintal" ||
    normalized === "quintals" ||
    normalized === "qtl"
  ) {
    return q * 100;
  }

  if (
    normalized === "ton" ||
    normalized === "tons" ||
    normalized === "tonne" ||
    normalized === "tonnes"
  ) {
    return q * 1000;
  }

  // kg and unknown produce units are treated as kg
  return q;
}

function getOrderQuantity(order) {
  return (order?.items || []).reduce(
    (sum, item) => sum + Number(item?.quantity || 0),
    0
  );
}

function getOrderWeightKg(order) {
  return (order?.items || []).reduce(
    (sum, item) =>
      sum +
      quantityToKg(
        item?.quantity,
        item?.unit || item?.quantityUnit || "kg"
      ),
    0
  );
}

/* =========================================================
   DELIVERY PARTNER HELPERS
========================================================= */

function isPartnerOnline(partner) {
  if (!partner) return false;

  return (
    partner.isOnline === true ||
    partner.online === true ||
    partner.availability === "online" ||
    partner.status === "online" ||
    partner.status === "available"
  );
}

function getPartnerCapacityKg(partner) {
  const values = [
    partner?.vehicleCapacityKg,
    partner?.capacityKg,
    partner?.vehicle?.capacityKg,
    partner?.vehicleDetails?.capacityKg,
    partner?.vehicleCapacity,
    partner?.capacity,
  ];

  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  /*
   * Fallback for older delivery partner documents.
   * Once onboarding stores vehicle capacity consistently,
   * that value will be used automatically.
   */
  const vehicleType = String(
    partner?.vehicleType ||
      partner?.vehicle?.type ||
      partner?.vehicleDetails?.type ||
      ""
  ).toLowerCase();

  if (vehicleType.includes("truck")) return 5000;
  if (vehicleType.includes("tempo")) return 1500;
  if (vehicleType.includes("pickup")) return 1000;
  if (vehicleType.includes("auto")) return 500;
  if (vehicleType.includes("bike")) return 30;

  return 500;
}

function getPartnerCurrentLoadKg(partner) {
  const values = [
    partner?.currentLoadKg,
    partner?.currentWeightKg,
    partner?.activeLoadKg,
    partner?.currentLoad,
  ];

  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }

  return 0;
}

function getPartnerAvailableCapacityKg(partner) {
  return Math.max(
    0,
    getPartnerCapacityKg(partner) - getPartnerCurrentLoadKg(partner)
  );
}

/* =========================================================
   LOCATION HELPERS
========================================================= */

function extractCoordinates(source) {
  if (!source) return null;

  const latitude = Number(
    source.latitude ??
      source.lat ??
      source.location?.latitude ??
      source.location?.lat ??
      source.coordinates?.latitude ??
      source.coordinates?.lat
  );

  const longitude = Number(
    source.longitude ??
      source.lng ??
      source.lon ??
      source.location?.longitude ??
      source.location?.lng ??
      source.location?.lon ??
      source.coordinates?.longitude ??
      source.coordinates?.lng ??
      source.coordinates?.lon
  );

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return {
      latitude,
      longitude,
    };
  }

  return null;
}

function getFarmerCoordinates(profile) {
  if (!profile) return null;

  return (
    extractCoordinates(profile) ||
    extractCoordinates(profile.location) ||
    extractCoordinates(profile.currentLocation) ||
    extractCoordinates(profile.farmLocation)
  );
}

function getPartnerCoordinates(partner) {
  if (!partner) return null;

  return (
    extractCoordinates(partner) ||
    extractCoordinates(partner.location) ||
    extractCoordinates(partner.currentLocation) ||
    extractCoordinates(partner.gpsLocation)
  );
}

function getDeliveryCoordinates(address) {
  if (!address) return null;

  return (
    extractCoordinates(address) ||
    extractCoordinates(address.location) ||
    extractCoordinates(address.coordinates)
  );
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getPickupAddress(profile, order) {
  return (
    profile?.location?.fullAddress ||
    profile?.location?.address ||
    profile?.address ||
    profile?.farmAddress ||
    order?.pickupAddress ||
    "Farmer pickup location"
  );
}

function getDeliveryAddress(order) {
  const address = order?.deliveryAddress;

  if (!address) {
    return "Consumer delivery address";
  }

  if (typeof address === "string") {
    return address;
  }

  return [
    address.fullAddress,
    address.address,
    address.village,
    address.mandal,
    address.district,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

/* =========================================================
   DELIVERY REQUEST ID
========================================================= */

function createSafeRequestId(farmerId, orderId) {
  return `${farmerId}_${orderId}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
}

/* =========================================================
   COMPONENT
========================================================= */

export default function FarmerOrders() {
  const [farmerId, setFarmerId] = useState("");
  const [farmerProfile, setFarmerProfile] = useState(null);

  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [deliveryRequests, setDeliveryRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFarmerId(user?.uid || "");
    });

    return unsubscribe;
  }, []);

  /* =======================================================
     FARMER PROFILE
  ======================================================= */

  useEffect(() => {
    if (!farmerId) {
      setFarmerProfile(null);
      return;
    }

    const profileRef = doc(db, "farmerProfiles", farmerId);

    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setFarmerProfile({
            id: snapshot.id,
            ...snapshot.data(),
          });
        } else {
          setFarmerProfile(null);
        }
      },
      (err) => {
        console.error("Farmer profile error:", err);
      }
    );

    return unsubscribe;
  }, [farmerId]);

  /* =======================================================
     FARMER ORDERS
  ======================================================= */

  useEffect(() => {
    if (!farmerId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const q = query(
      collection(db, "farmerOrders"),
      where("farmerId", "==", farmerId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        data.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;

          return bTime - aTime;
        });

        setOrders(data);
        setLoading(false);
      },
      (err) => {
        console.error("Farmer orders error:", err);

        setError(
          "Orders could not be loaded. Please check Firestore rules."
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [farmerId]);

  /* =======================================================
     DELIVERY PARTNERS
  ======================================================= */

  useEffect(() => {
    if (!farmerId) {
      setDeliveryPartners([]);
      return;
    }

    const q = query(collection(db, "deliveryAgents"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const partners = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((partner) => {
            const status = String(
              partner.status || ""
            ).toLowerCase();

            return status !== "blocked" && status !== "inactive";
          });

        setDeliveryPartners(partners);
      },
      (err) => {
        console.error("Delivery partners error:", err);
      }
    );

    return unsubscribe;
  }, [farmerId]);

  /* =======================================================
     DELIVERY REQUESTS
  ======================================================= */

  useEffect(() => {
    if (!farmerId) {
      setDeliveryRequests([]);
      return;
    }

    const q = query(
      collection(db, "deliveryRequests"),
      where("farmerId", "==", farmerId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const requests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setDeliveryRequests(requests);
      },
      (err) => {
        console.error("Delivery requests error:", err);
      }
    );

    return unsubscribe;
  }, [farmerId]);

  /* =======================================================
     DELIVERY REQUEST FOR ORDER
  ======================================================= */

  function getDeliveryRequestForOrder(order) {
    if (!order) return null;

    return (
      deliveryRequests.find(
        (request) =>
          request.sellerOrderId === order.id ||
          request.orderId === order.parentOrderId ||
          request.parentOrderId === order.parentOrderId
      ) || null
    );
  }

  /* =======================================================
     CREATE DELIVERY REQUEST
  ======================================================= */

  async function createDeliveryRequest(order) {
    if (!order?.id || !farmerId) {
      return null;
    }

    const requestId = createSafeRequestId(
      farmerId,
      order.id
    );

    const requestRef = doc(
      db,
      "deliveryRequests",
      requestId
    );

    try {
      /*
       * Check whether a request already exists.
       */
      const existingSnapshot = await getDoc(requestRef);

      if (existingSnapshot.exists()) {
        const existing = existingSnapshot.data();

        const existingStatus = String(
          existing.status || ""
        ).toLowerCase();

        const existingRequestStatus = String(
          existing.requestStatus || ""
        ).toLowerCase();

        const existingDeliveryStatus = String(
          existing.deliveryStatus || ""
        ).toLowerCase();

        /*
         * Never recreate an active or completed request.
         */
        const protectedStatuses = [
          "open",
          "request_open",
          "assigned",
          "picked_up",
          "in_transit",
          "delivered",
          "completed",
        ];

        if (
          protectedStatuses.includes(existingStatus) ||
          protectedStatuses.includes(existingRequestStatus) ||
          protectedStatuses.includes(existingDeliveryStatus)
        ) {
          return {
            id: requestId,
            ...existing,
          };
        }
      }

      const pickupLocation =
        getFarmerCoordinates(farmerProfile);

      const deliveryLocation =
        getDeliveryCoordinates(
          order.deliveryAddress
        );

      const totalQuantity = getOrderQuantity(order);
      const totalWeightKg = getOrderWeightKg(order);

      /*
       * Platform service radius.
       * Can later be controlled by admin/settings.
       */
      const serviceRadiusKm = Number(
        farmerProfile?.deliveryRadiusKm ||
          farmerProfile?.serviceRadiusKm ||
          10
      );

      /*
       * Find eligible partners.
       */
      const eligible = deliveryPartners
        .map((partner) => {
          if (!isPartnerOnline(partner)) {
            return null;
          }

          const partnerLocation =
            getPartnerCoordinates(partner);

          if (!partnerLocation) {
            return null;
          }

          /*
           * Vehicle capacity check.
           */
          const availableCapacity =
            getPartnerAvailableCapacityKg(
              partner
            );

          if (
            totalWeightKg > 0 &&
            availableCapacity < totalWeightKg
          ) {
            return null;
          }

          /*
           * Distance check.
           */
          let distance = null;

          if (pickupLocation) {
            distance = distanceKm(
              pickupLocation.latitude,
              pickupLocation.longitude,
              partnerLocation.latitude,
              partnerLocation.longitude
            );

            if (distance > serviceRadiusKm) {
              return null;
            }
          }

          return {
            partner,
            distance,
            availableCapacity,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          /*
           * Nearest partner first.
           */
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;

          return a.distance - b.distance;
        });

      const eligiblePartnerIds = eligible.map(
        (item) => item.partner.id
      );

      const pickupAddress =
        getPickupAddress(
          farmerProfile,
          order
        );

      const deliveryAddress =
        getDeliveryAddress(order);

      const requestData = {
        orderId: order.parentOrderId || "",
        parentOrderId: order.parentOrderId || "",

        sellerOrderId: order.id,
        sellerOrderCollection: "farmerOrders",

        sellerType: "individual",
        sellerId: farmerId,

        farmerId,
        farmerName:
          order.farmerName ||
          farmerProfile?.fullName ||
          farmerProfile?.name ||
          "Farmer",

        farmerMobile:
          order.farmerMobile ||
          farmerProfile?.mobile ||
          "",

        pickupLocation: pickupLocation || null,
        pickupAddress,

        consumerId: order.consumerId || "",
        consumerName:
          order.consumerName ||
          order.consumer?.fullName ||
          "Consumer",

        consumerMobile:
          order.consumerMobile ||
          order.consumer?.mobile ||
          "",

        deliveryLocation:
          deliveryLocation || null,

        deliveryAddress,

        items: order.items || [],

        totalQuantity,
        totalWeightKg,

        orderAmount: orderTotal(order),

        status: "open",
        requestStatus: "open",
        deliveryStatus: "request_open",

        matching: {
          requiredWeightKg: totalWeightKg,
          requiredQuantity: totalQuantity,

          matchingVersion: 1,
          matchingMode: "platform",

          eligibleCount:
            eligiblePartnerIds.length,

          serviceRadiusKm,

          calculatedAt: serverTimestamp(),
        },

        eligiblePartnerIds,
        notifiedPartnerIds: [],

        deliveryAgentId: null,
        assignedDeliveryAgentId: null,

        deliveryAgentName: "",
        deliveryAgentMobile: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      /*
       * Create request.
       */
      await setDoc(
        requestRef,
        requestData,
        { merge: false }
      );

      /*
       * Notify eligible partners.
       */
      if (eligiblePartnerIds.length > 0) {
        const notificationPromises =
          eligible.map(async ({ partner }) => {
            return addDoc(
              collection(
                db,
                "deliveryNotifications"
              ),
              {
                deliveryAgentId: partner.id,

                deliveryRequestId: requestId,

                orderId:
                  order.parentOrderId || "",

                parentOrderId:
                  order.parentOrderId || "",

                sellerOrderId: order.id,

                sellerOrderCollection:
                  "farmerOrders",

                sellerType: "individual",
                sellerId: farmerId,

                farmerId,

                farmerName:
                  order.farmerName ||
                  farmerProfile?.fullName ||
                  farmerProfile?.name ||
                  "Farmer",

                pickupAddress,

                consumerId:
                  order.consumerId || "",

                consumerName:
                  order.consumerName ||
                  "Consumer",

                deliveryAddress,

                totalQuantity,
                totalWeightKg,

                orderAmount:
                  orderTotal(order),

                status: "new",
                read: false,

                createdAt:
                  serverTimestamp(),

                updatedAt:
                  serverTimestamp(),
              }
            );
          });

        await Promise.all(
          notificationPromises
        );

        await updateDoc(
          requestRef,
          {
            notifiedPartnerIds:
              eligiblePartnerIds,

            notifiedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );
      }

      /*
       * Add order event.
       */
      if (order.parentOrderId) {
        try {
          await addDoc(
            collection(db, "orderEvents"),
            {
              parentOrderId:
                order.parentOrderId,

              farmerOrderId: order.id,

              farmerId,

              type: "DELIVERY_REQUEST_CREATED",

              status:
                STATUS.READY_FOR_PICKUP,

              deliveryRequestId:
                requestId,

              eligiblePartnerCount:
                eligiblePartnerIds.length,

              createdAt:
                serverTimestamp(),
            }
          );
        } catch (eventError) {
          console.warn(
            "Order event could not be created:",
            eventError
          );
        }
      }

      return {
        id: requestId,
        ...requestData,
      };
    } catch (err) {
      console.error(
        "Delivery request creation failed:",
        err
      );

      throw err;
    }
  }

  /* =======================================================
     CHANGE ORDER STATUS
  ======================================================= */

  async function changeStatus(
    order,
    nextStatus
  ) {
    if (!order?.id || busyId) return;

    setBusyId(order.id);
    setError("");

    try {
      /*
       * Update farmer-side order.
       */
      await updateDoc(
        doc(db, "farmerOrders", order.id),
        {
          status: nextStatus,

          updatedAt:
            serverTimestamp(),

          ...(nextStatus ===
          STATUS.ACCEPTED
            ? {
                acceptedAt:
                  serverTimestamp(),
              }
            : {}),

          ...(nextStatus ===
          STATUS.PREPARING
            ? {
                preparingAt:
                  serverTimestamp(),
              }
            : {}),

          ...(nextStatus ===
          STATUS.READY_FOR_PICKUP
            ? {
                readyAt:
                  serverTimestamp(),

                readyForPickupAt:
                  serverTimestamp(),
              }
            : {}),

          ...(nextStatus ===
          STATUS.REJECTED
            ? {
                rejectedAt:
                  serverTimestamp(),
              }
            : {}),
        }
      );

      /*
       * Create order event.
       */
      if (order.parentOrderId) {
        try {
          await addDoc(
            collection(db, "orderEvents"),
            {
              parentOrderId:
                order.parentOrderId,

              farmerOrderId:
                order.id,

              farmerId,

              type:
                `FARMER_${nextStatus
                  .toUpperCase()
                  .replace(/-/g, "_")}`,

              status: nextStatus,

              createdAt:
                serverTimestamp(),
            }
          );
        } catch (eventError) {
          console.warn(
            "Could not create order event:",
            eventError
          );
        }
      }

      /*
       * When farmer marks the order ready,
       * start platform-managed delivery matching.
       */
      if (
        nextStatus ===
        STATUS.READY_FOR_PICKUP
      ) {
        await createDeliveryRequest(
          {
            ...order,
            status: nextStatus,
          }
        );
      }

      setSelectedOrder(null);
    } catch (err) {
      console.error(err);

      if (
        nextStatus ===
        STATUS.READY_FOR_PICKUP
      ) {
        setError(
          "Order was updated, but delivery matching could not be started. Please check Firestore rules and delivery partner data."
        );
      } else {
        setError(
          "Unable to update this order."
        );
      }
    } finally {
      setBusyId("");
    }
  }

  /* =======================================================
     ORDER TOTAL
  ======================================================= */

  function orderTotal(order) {
    if (
      typeof order?.farmerAmount ===
      "number"
    ) {
      return order.farmerAmount;
    }

    return (order?.items || []).reduce(
      (sum, item) =>
        sum +
        Number(item?.price || 0) *
          Number(item?.quantity || 0),
      0
    );
  }

  /* =======================================================
     ACTIVE / HISTORY
  ======================================================= */

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          ![
            STATUS.REJECTED,
            STATUS.DELIVERED,
          ].includes(order.status)
      ),
    [orders]
  );

  const historyOrders = useMemo(
    () =>
      orders.filter((order) =>
        [
          STATUS.REJECTED,
          STATUS.DELIVERED,
        ].includes(order.status)
      ),
    [orders]
  );

  const visibleOrders =
    activeTab === "active"
      ? activeOrders
      : historyOrders;

  /* =======================================================
     LOGIN CHECK
  ======================================================= */

  if (!farmerId) {
    return (
      <div className="farmer-orders-page">
        <div className="farmer-orders-empty">
          <div className="fo-empty-icon">
            👨‍🌾
          </div>

          <h2>
            Farmer login required
          </h2>

          <p>
            Please sign in with your
            farmer account to view
            orders.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="farmer-orders-page">

      {/* HEADER */}
      <header className="fo-header">
        <div>
          <div className="fo-eyebrow">
            AGRICONNECT · FARMER
          </div>

          <h1>Orders</h1>

          <p>
            Manage consumer orders and
            prepare produce for pickup.
          </p>
        </div>

        <div className="fo-stat">
          <strong>
            {activeOrders.length}
          </strong>

          <span>
            Active orders
          </span>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div className="fo-error">
          {error}
        </div>
      )}

      {/* TABS */}
      <div className="fo-tabs">
        <button
          className={
            activeTab === "active"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("active")
          }
        >
          Active{" "}
          <b>
            {activeOrders.length}
          </b>
        </button>

        <button
          className={
            activeTab === "history"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("history")
          }
        >
          History{" "}
          <b>
            {historyOrders.length}
          </b>
        </button>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="fo-loading">
          Loading orders...
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="farmer-orders-empty">
          <div className="fo-empty-icon">
            📦
          </div>

          <h2>
            {activeTab === "active"
              ? "No active orders"
              : "No order history"}
          </h2>

          <p>
            {activeTab === "active"
              ? "New consumer orders will appear here."
              : "Completed and rejected orders will appear here."}
          </p>
        </div>
      ) : (
        <div className="fo-order-grid">

          {visibleOrders.map((order) => {
            const deliveryRequest =
              getDeliveryRequestForOrder(
                order
              );

            const deliveryStatus =
              deliveryRequest?.deliveryStatus ||
              deliveryRequest?.status ||
              "";

            return (
              <article
                className="fo-order-card"
                key={order.id}
              >

                {/* CARD HEADER */}
                <div className="fo-card-head">
                  <div>
                    <span className="fo-order-number">
                      ORDER #
                      {order.id
                        .slice(-7)
                        .toUpperCase()}
                    </span>

                    <h2>
                      {order.consumerName ||
                        "Consumer"}
                    </h2>
                  </div>

                  <span
                    className={`fo-status fo-${
                      order.status ||
                      "pending"
                    }`}
                  >
                    {statusLabel(
                      order.status
                    )}
                  </span>
                </div>

                {/* ITEMS */}
                <div className="fo-items">
                  {(order.items || []).map(
                    (item, index) => (
                      <div
                        className="fo-item"
                        key={`${
                          item.productId ||
                          item.name
                        }-${index}`}
                      >
                        <div className="fo-item-icon">
                          <ProduceIcon
                            name={item.name}
                            category={
                              item.category
                            }
                            size={32}
                          />
                        </div>

                        <div className="fo-item-info">
                          <strong>
                            {item.name}
                          </strong>

                          <span>
                            {item.quantity}{" "}
                            {item.unit ||
                              "kg"}{" "}
                            ×{" "}
                            {money(
                              item.price
                            )}
                          </span>
                        </div>

                        <b>
                          {money(
                            Number(
                              item.price ||
                                0
                            ) *
                              Number(
                                item.quantity ||
                                  0
                              )
                          )}
                        </b>
                      </div>
                    )
                  )}
                </div>

                {/* META */}
                <div className="fo-card-meta">
                  <div>
                    <span>
                      Consumer
                    </span>

                    <strong>
                      {order.consumerMobile ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Your earnings
                    </span>

                    <strong className="fo-earnings">
                      {money(
                        orderTotal(order)
                      )}
                    </strong>
                  </div>
                </div>

                {/* ADDRESS */}
                <div className="fo-address">
                  <span>
                    📍 Delivery address
                  </span>

                  <p>
                    {order
                      .deliveryAddress
                      ?.address ||
                      order
                        .deliveryAddress
                        ?.fullAddress ||
                      "Address available at checkout"}

                    {order
                      .deliveryAddress
                      ?.village
                      ? `, ${order.deliveryAddress.village}`
                      : ""}

                    {order
                      .deliveryAddress
                      ?.district
                      ? `, ${order.deliveryAddress.district}`
                      : ""}
                  </p>
                </div>

                {/* DELIVERY STATUS */}
                {deliveryRequest && (
                  <div className="fo-address">
                    <span>
                      🚚 Platform Delivery
                    </span>

                    <p>
                      {deliveryStatus ===
                      "request_open"
                        ? deliveryRequest
                            .eligiblePartnerIds
                            ?.length > 0
                          ? `Request sent to ${deliveryRequest.eligiblePartnerIds.length} eligible delivery partner${
                              deliveryRequest
                                .eligiblePartnerIds
                                .length === 1
                                ? ""
                                : "s"
                            }.`
                          : "Waiting for an eligible delivery partner."
                        : deliveryStatus ===
                          "assigned"
                        ? `Delivery partner assigned${
                            deliveryRequest
                              .deliveryAgentName
                              ? `: ${deliveryRequest.deliveryAgentName}`
                              : "."
                          }`
                        : deliveryStatus ===
                          "picked_up"
                        ? "Produce has been picked up."
                        : deliveryStatus ===
                          "delivered"
                        ? "Produce delivered successfully."
                        : "Platform is managing delivery."}
                    </p>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="fo-actions">

                  <button
                    className="fo-secondary"
                    onClick={() =>
                      setSelectedOrder(
                        order
                      )
                    }
                  >
                    View Details
                  </button>

                  {/* PENDING */}
                  {order.status ===
                    STATUS.PENDING && (
                    <>
                      <button
                        className="fo-reject"
                        disabled={
                          busyId ===
                          order.id
                        }
                        onClick={() =>
                          changeStatus(
                            order,
                            STATUS.REJECTED
                          )
                        }
                      >
                        Reject
                      </button>

                      <button
                        className="fo-primary"
                        disabled={
                          busyId ===
                          order.id
                        }
                        onClick={() =>
                          changeStatus(
                            order,
                            STATUS.ACCEPTED
                          )
                        }
                      >
                        {busyId ===
                        order.id
                          ? "Updating..."
                          : "Accept Order"}
                      </button>
                    </>
                  )}

                  {/* ACCEPTED */}
                  {order.status ===
                    STATUS.ACCEPTED && (
                    <button
                      className="fo-primary"
                      disabled={
                        busyId ===
                        order.id
                      }
                      onClick={() =>
                        changeStatus(
                          order,
                          STATUS.PREPARING
                        )
                      }
                    >
                      {busyId ===
                      order.id
                        ? "Updating..."
                        : "Start Preparing"}
                    </button>
                  )}

                  {/* PREPARING */}
                  {order.status ===
                    STATUS.PREPARING && (
                    <button
                      className="fo-primary"
                      disabled={
                        busyId ===
                        order.id
                      }
                      onClick={() =>
                        changeStatus(
                          order,
                          STATUS.READY_FOR_PICKUP
                        )
                      }
                    >
                      {busyId ===
                      order.id
                        ? "Starting Delivery..."
                        : "Mark Ready for Pickup"}
                    </button>
                  )}

                  {/* READY */}
                  {order.status ===
                    STATUS.READY_FOR_PICKUP && (
                    <div className="fo-waiting">
                      {deliveryRequest
                        ? "🚚 Platform is finding a delivery partner"
                        : "🚚 Starting delivery partner matching..."}
                    </div>
                  )}

                  {/* ASSIGNED */}
                  {order.status ===
                    STATUS.ASSIGNED && (
                    <div className="fo-waiting">
                      🚚 Delivery partner assigned
                    </div>
                  )}

                  {/* PICKED UP */}
                  {order.status ===
                    STATUS.PICKED_UP && (
                    <div className="fo-waiting">
                      📦 Produce picked up ·
                      Delivery in progress
                    </div>
                  )}

                  {/* DELIVERED */}
                  {order.status ===
                    STATUS.DELIVERED && (
                    <div className="fo-waiting">
                      ✅ Order delivered
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================
          ORDER DETAILS MODAL
      ===================================================== */}

      {selectedOrder && (
        <div
          className="fo-modal-backdrop"
          onClick={() =>
            setSelectedOrder(null)
          }
        >
          <div
            className="fo-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}
            <div className="fo-modal-head">
              <div>
                <span>
                  ORDER DETAILS
                </span>

                <h2>
                  #
                  {selectedOrder.id
                    .slice(-7)
                    .toUpperCase()}
                </h2>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ×
              </button>
            </div>

            {/* CONSUMER */}
            <div className="fo-detail-section">
              <h3>
                Consumer
              </h3>

              <p>
                {selectedOrder.consumerName ||
                  "Consumer"}
              </p>

              <p>
                {selectedOrder.consumerMobile ||
                  "Mobile not available"}
              </p>
            </div>

            {/* PRODUCE */}
            <div className="fo-detail-section">
              <h3>
                Produce
              </h3>

              {(selectedOrder.items ||
                []).map(
                (item, index) => (
                  <div
                    className="fo-detail-item"
                    key={index}
                  >
                    <ProduceIcon
                      name={item.name}
                      category={
                        item.category
                      }
                      size={27}
                    />

                    <span>
                      {item.name}
                    </span>

                    <b>
                      {item.quantity}{" "}
                      {item.unit ||
                        "kg"}
                    </b>

                    <strong>
                      {money(
                        Number(
                          item.price ||
                            0
                        ) *
                          Number(
                            item.quantity ||
                              0
                          )
                      )}
                    </strong>
                  </div>
                )
              )}
            </div>

            {/* DELIVERY */}
            <div className="fo-detail-section">
              <h3>
                Delivery
              </h3>

              <p>
                {selectedOrder
                  .deliveryAddress
                  ?.address ||
                  selectedOrder
                    .deliveryAddress
                    ?.fullAddress ||
                  "Address available at checkout"}
              </p>

              {(() => {
                const request =
                  getDeliveryRequestForOrder(
                    selectedOrder
                  );

                if (!request) {
                  return (
                    <p>
                      🚚 Platform-managed
                      delivery
                    </p>
                  );
                }

                return (
                  <>
                    <p>
                      <strong>
                        Status:
                      </strong>{" "}
                      {statusLabel(
                        request.deliveryStatus ||
                          request.status
                      )}
                    </p>

                    {request.deliveryAgentName && (
                      <p>
                        <strong>
                          Delivery Partner:
                        </strong>{" "}
                        {
                          request.deliveryAgentName
                        }
                      </p>
                    )}

                    {request.deliveryAgentMobile && (
                      <p>
                        <strong>
                          Partner Mobile:
                        </strong>{" "}
                        {
                          request.deliveryAgentMobile
                        }
                      </p>
                    )}

                    {request
                      .eligiblePartnerIds
                      ?.length > 0 &&
                      !request.deliveryAgentId && (
                        <p>
                          🚚 Request sent to{" "}
                          {
                            request
                              .eligiblePartnerIds
                              .length
                          } eligible partner
                          {request
                            .eligiblePartnerIds
                            .length !== 1
                            ? "s"
                            : ""}
                          .
                        </p>
                      )}
                  </>
                );
              })()}
            </div>

            {/* TOTAL */}
            <div className="fo-modal-total">
              <span>
                Your earnings
              </span>

              <strong>
                {money(
                  orderTotal(
                    selectedOrder
                  )
                )}
              </strong>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}