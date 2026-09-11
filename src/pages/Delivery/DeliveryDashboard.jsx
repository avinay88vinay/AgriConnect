import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Bike, CheckCircle2, ChevronRight, CircleDollarSign, Clock3,
  Crosshair, FileText, HelpCircle, Home, LocateFixed, LogOut, MapPin,
  Menu, Navigation, Package, Phone, Route as RouteIcon, Settings,
  ShieldCheck, Truck, User, X, XCircle, AlertTriangle, Wallet, Zap
} from "lucide-react";
import {
  collection, doc, getDoc, limit, onSnapshot, query, runTransaction,
  serverTimestamp, updateDoc, addDoc, setDoc, where
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import "./DeliveryDashboard.css";

const RADIUS = 5;
const DECLINE_REASONS = ["Too far","Outside service area","Vehicle issue","Currently unavailable","Other"];

const num = (v, d=0) => { const n=Number(v); return Number.isFinite(n) ? n : d; };
const dateOf = v => v?.toDate ? v.toDate() : (v ? new Date(v) : null);
const money = v => `₹${num(v).toLocaleString("en-IN",{maximumFractionDigits:0})}`;

function coords(o={}) {
  const l=o.location||o.currentLocation||o.gps||{};
  const lat=num(o.latitude??o.lat??l.latitude??l.lat,NaN);
  const lng=num(o.longitude??o.lng??o.lon??l.longitude??l.lng,NaN);
  return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
}
function distance(a,b) {
  if(!a||!b) return null;
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function weight(r={}) {
  if(r.totalWeightKg!=null) return num(r.totalWeightKg);
  if(r.weightKg!=null) return num(r.weightKg);
  return (r.items||[]).reduce((s,i)=>{
    const q=num(i.quantity??i.qty), u=String(i.unit||"").toLowerCase();
    return s+(u.includes("g")&&!u.includes("kg")?q/1000:q);
  },0);
}
function formatAddress(v, fallback="") {
  if(typeof v === "string") return v;
  if(!v || typeof v !== "object") return fallback;
  const parts = [
    v.address,
    v.village,
    v.mandal,
    v.district,
    v.state,
    v.pincode
  ].filter(x => x != null && String(x).trim());
  return parts.length ? parts.map(String).join(", ") : fallback;
}
function pickups(r={}) {
  if(Array.isArray(r.pickupLocations)) return r.pickupLocations.map(p => ({...p, address:formatAddress(p?.address, "Pickup address")}));
  if(Array.isArray(r.pickups)) return r.pickups.map(p => ({...p, address:formatAddress(p?.address, "Pickup address")}));
  return [{
    sellerName:r.sellerName||r.farmerName||r.fpoName||"Farmer / FPO",
    address:formatAddress(r.pickupAddress||r.farmerAddress||r.fpoAddress, "Pickup location"),
    latitude:r.pickupLatitude??r.latitude,
    longitude:r.pickupLongitude??r.longitude,
    status:r.pickupStatus||"pending"
  }];
}
function address(r={}) {
  return formatAddress(
    r.deliveryAddress||r.consumerAddress||r.destinationAddress||r.consumer?.address,
    "Consumer delivery address"
  );
}
function title(r) {
  return r.orderId?`Order #${String(r.orderId).slice(-6).toUpperCase()}`:`Request #${String(r.id).slice(-6).toUpperCase()}`;
}
function statusText(s="open") {
  return ({open:"Available",request_open:"Available",accepted:"Accepted",assigned:"Assigned",
    pickup_in_progress:"Pickup in progress",picked_up:"Picked up",out_for_delivery:"Out for delivery",
    delivered:"Delivered"})[String(s).toLowerCase()]||String(s).replaceAll("_"," ");
}
function when(v) {
  const d=dateOf(v); return d&&!Number.isNaN(d.getTime())?d.toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";
}

function sellerOrderCollection(r={}) {
  return r.sellerOrderCollection || (r.sellerType === "fpo" ? "fpoOrders" : "farmerOrders");
}

function activeDeliveryStatus(r={}) {
  return String(r.deliveryStatus || r.status || "").toLowerCase();
}

// Firestore rejects undefined values, including undefined fields nested inside
// pickupLocations. Remove only undefined values before writing tracking data.
function cleanFirestore(value) {
  if (Array.isArray(value)) return value.map(cleanFirestore);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      if (v !== undefined) out[k] = cleanFirestore(v);
    });
    return out;
  }
  return value;
}

export default function DeliveryDashboard(){
  const navigate=useNavigate(), location=useLocation(), state=location.state||{};
  const [user,setUser]=useState(auth.currentUser), [profile,setProfile]=useState(null);
  const [requests,setRequests]=useState([]), [mine,setMine]=useState([]), [notifications,setNotifications]=useState([]);
  const [active,setActive]=useState(null), [selected,setSelected]=useState(null);
  const [section,setSection]=useState("overview"), [sidebar,setSidebar]=useState(false), [profileMenu,setProfileMenu]=useState(false);
  const [declineOpen,setDeclineOpen]=useState(false), [issueOpen,setIssueOpen]=useState(false);
  const [declineReason,setDeclineReason]=useState(DECLINE_REASONS[0]), [issueType,setIssueType]=useState("Farmer unavailable"), [issueNote,setIssueNote]=useState("");
  const [otp,setOtp]=useState(""), [online,setOnline]=useState(false), [busy,setBusy]=useState(false), [gpsBusy,setGpsBusy]=useState(false);
  const [msg,setMsg]=useState(""), [err,setErr]=useState("");

  useEffect(()=>auth.onAuthStateChanged(setUser),[]);
  const id=user?.uid||auth.currentUser?.uid||"";
  const mobile=profile?.mobile||profile?.phone||profile?.mobileNumber||state.mobile||localStorage.getItem("agriconnect_delivery_mobile")||"";
  const name=profile?.fullName||profile?.name||profile?.partnerName||state.name||"Delivery Partner";
  const capacity=num(profile?.vehicleCapacityKg??profile?.vehicleCapacity??profile?.capacityKg??profile?.capacity,0);
  const load=num(profile?.currentLoadKg??profile?.currentLoad??profile?.loadKg,0);
  const free=Math.max(capacity-load,0);
  const radius=num(profile?.serviceRadiusKm??profile?.maximumPickupDistanceKm??profile?.maxPickupDistanceKm??profile?.radiusKm,RADIUS);
  const myCoords=useMemo(()=>coords(profile||{}),[profile]);

  /*
    ALL READY DELIVERY REQUESTS are visible to every delivery partner.
    Availability, GPS/radius and vehicle capacity are informational only;
    they must never hide a valid open request from the Available Deliveries
    list. Firestore transaction below still prevents double assignment.
  */
  const eligible=useMemo(()=>requests.map(r=>{
    const p=pickups(r)[0];
    const d=myCoords&&coords(p)
      ? distance(myCoords,coords(p))
      : r.distanceKm!=null
        ? num(r.distanceKm)
        : null;
    const w=weight(r);
    const okCapacity=capacity<=0||w<=free;
    const okRadius=d==null ? true : d<=radius;
    return {
      ...r,
      _weight:w,
      _distance:d,
      _capacityOk:okCapacity,
      _radiusOk:okRadius
    };
  }).filter(r=>
    ["open","request_open"].includes(String(r.status||r.requestStatus||"open").toLowerCase()) &&
    !r.assignedDeliveryAgentId &&
    !r.deliveryAgentId
  ),[requests,myCoords,capacity,free,radius]);

  useEffect(()=>{
    if(!id)return;
    let stop=false;
    (async()=>{
      try{
        const s=await getDoc(doc(db,"deliveryAgents",id));
        if(s.exists()&&!stop){
          const p={id:s.id,...s.data()};
          setProfile(p);
          setOnline(Boolean(p.online??p.isOnline));
          return;
        }
      }catch(e){
        console.error("Unable to load delivery agent profile:", e);
      }
      if(!stop)setProfile({id,uid:id,mobile,fullName:state.name||"Delivery Partner"});
    })();
    return()=>{stop=true};
  },[id]);

  /*
    LIVE DELIVERY REQUESTS

    Do not depend only on eligiblePartnerIds here.

    A delivery partner may:
      - go online after the farmer created the request
      - update GPS after the request was created
      - become available after another request is completed

    Therefore the dashboard listens to all open requests and
    performs the final radius/capacity/online filtering locally.
    First-accept-wins is still enforced by the Firestore transaction.
  */
  useEffect(()=>{
    if(!id)return;

    const requestsQuery = query(
      collection(db,"deliveryRequests"),
      where("status","in",["open","request_open"])
    );

    return onSnapshot(
      requestsQuery,
      s=>setRequests(
        s.docs.map(d=>({id:d.id,...d.data()}))
      ),
      e=>{
        console.error("Delivery requests listener error:",e);
        setRequests([]);
        setErr("Unable to load delivery requests. Check Firestore rules/indexes.");
      }
    );
  },[id]);

  useEffect(()=>{
    if(!id)return;
    return onSnapshot(query(collection(db,"deliveryRequests"),where("assignedDeliveryAgentId","==",id),limit(100)),
      s=>setMine(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[id]);

  useEffect(()=>{
    if(!id)return;
    return onSnapshot(query(collection(db,"deliveryNotifications"),where("deliveryAgentId","==",id),limit(100)),
      s=>setNotifications(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(dateOf(b.createdAt)?.getTime()||0)-(dateOf(a.createdAt)?.getTime()||0))),()=>{});
  },[id]);

  const success=t=>{setErr("");setMsg(t);setTimeout(()=>setMsg(""),3500)};
  const failure=t=>{setMsg("");setErr(t);setTimeout(()=>setErr(""),5000)};
  const nav=s=>{setSection(s);setSidebar(false);setProfileMenu(false);setSelected(null)};

  const toggleOnline=async()=>{
    if(!id)return failure("Delivery partner account is not authenticated.");
    try{setBusy(true);const n=!online;await setDoc(doc(db,"deliveryAgents",id),{uid:id,mobile,name,online:n,isOnline:n,updatedAt:serverTimestamp()},{merge:true});setOnline(n);setProfile(p=>({...p,online:n,isOnline:n}));success(n?"You are online. Nearby eligible requests can reach you.":"You are offline.");}
    catch(e){console.error("Online status Firebase error:",e);failure(`Unable to update online status: ${e.code||e.message||"Unknown error"}`);}finally{setBusy(false)}
  };

  const updateGPS=()=>{
    if(!id)return failure("Delivery partner account is not authenticated.");
    if(!navigator.geolocation)return failure("Location is not supported by this browser.");
    setGpsBusy(true);navigator.geolocation.getCurrentPosition(async p=>{
      const latitude=p.coords.latitude,longitude=p.coords.longitude;
      try{await setDoc(doc(db,"deliveryAgents",id),{uid:id,mobile,name,latitude,longitude,location:{latitude,longitude},locationUpdatedAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});setProfile(x=>({...x,latitude,longitude,location:{latitude,longitude}}));success("Current location updated.");}
      catch(e){console.error("GPS Firebase save error:",e);failure(`Location found but Firebase could not save it: ${e.code||e.message||"Unknown error"}`);}
      finally{setGpsBusy(false)}
    },()=>{setGpsBusy(false);failure("Please allow location permission.");},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
  };

  // FIRST ACCEPT WINS: Firestore transaction guarantees only one partner wins.
  const accept=async(r)=>{
    if(!id)return failure("Delivery partner account is not authenticated.");
    try{
      setBusy(true);

      let acceptedRequest=null;

      await runTransaction(db,async(t)=>{
        const rr=doc(db,"deliveryRequests",r.id);
        const s=await t.get(rr);

        if(!s.exists())throw Error("NOT_FOUND");

        const x=s.data();
        const st=String(x.status||"open").toLowerCase();

        if(
          !["open","request_open"].includes(st) ||
          x.assignedDeliveryAgentId ||
          x.deliveryAgentId
        ){
          throw Error("TAKEN");
        }

        const collectionName=sellerOrderCollection(x);
        const sellerOrderId=x.sellerOrderId;

        t.update(rr,{
          status:"assigned",
          requestStatus:"assigned",
          deliveryStatus:"assigned",

          deliveryAgentId:id,
          assignedDeliveryAgentId:id,
          deliveryAgentName:name,
          deliveryAgentMobile:mobile,

          acceptedAt:serverTimestamp(),
          assignedAt:serverTimestamp(),
          updatedAt:serverTimestamp()
        });

        // Update parent order when available.
        if(x.orderId){
          t.update(doc(db,"orders",x.orderId),{
            deliveryAgentId:id,
            assignedDeliveryAgentId:id,
            deliveryAgentName:name,
            deliveryAgentMobile:mobile,
            deliveryStatus:"assigned",
            status:"assigned",
            updatedAt:serverTimestamp()
          });
        }

        // Update the authoritative seller-side order.
        if(sellerOrderId){
          t.update(doc(db,collectionName,sellerOrderId),{
            deliveryAgentId:id,
            assignedDeliveryAgentId:id,
            deliveryAgentName:name,
            deliveryAgentMobile:mobile,
            deliveryStatus:"assigned",
            status:"assigned",
            updatedAt:serverTimestamp()
          });
        }

        acceptedRequest={
          ...x,
          id:r.id,
          status:"assigned",
          requestStatus:"assigned",
          deliveryStatus:"assigned",
          deliveryAgentId:id,
          assignedDeliveryAgentId:id,
          deliveryAgentName:name,
          deliveryAgentMobile:mobile
        };
      });

      // Mark the notification responded to, but don't fail the assignment
      // if an old notification document has a different schema.
      try{
        const note=notifications.find(
          n=>n.deliveryRequestId===r.id||n.requestId===r.id
        );

        if(note?.id){
          await updateDoc(doc(db,"deliveryNotifications",note.id),{
            status:"accepted",
            read:true,
            acceptedAt:serverTimestamp(),
            updatedAt:serverTimestamp()
          });
        }
      }catch(notificationError){
        console.warn("Notification update failed:",notificationError);
      }

      // Keep delivery agent load in sync.
      try{
        await setDoc(doc(db,"deliveryAgents",id),{
          uid:id,
          online:true,
          isOnline:true,
          currentLoadKg:load+weight(r),
          currentLoad:load+weight(r),
          updatedAt:serverTimestamp()
        },{merge:true});
      }catch(loadError){
        console.warn("Could not update partner load:",loadError);
      }

      setProfile(p=>p?{
        ...p,
        currentLoadKg:load+weight(r),
        currentLoad:load+weight(r)
      }:p);

      setActive(acceptedRequest);
      nav("active");
      success("Delivery accepted. You are now assigned.");
    }catch(e){
      console.error(e);
      failure(
        e.message==="TAKEN"
          ? "Another delivery partner accepted this request first."
          : e.message==="NOT_FOUND"
            ? "This delivery request no longer exists."
            : `Unable to accept delivery: ${e.code||e.message||"Unknown error"}`
      );
    }finally{
      setBusy(false);
    }
  };

  const decline=async()=>{
    if(!selected)return;
    try{
      setBusy(true);
      const note = notifications.find(
        n => n.deliveryRequestId === selected.id || n.requestId === selected.id
      );
      if(note?.id){
        await updateDoc(doc(db,"deliveryNotifications",note.id),{
          status:"declined",
          read:true,
          declineReason,
          declinedAt:serverTimestamp(),
          updatedAt:serverTimestamp()
        });
      }else{
        console.warn("No matching notification found for declined request.");
      }
      setDeclineOpen(false);setSelected(null);
      success("Declined. The request remains available to other partners.");
    }catch(e){failure(`Unable to record decline: ${e.code||e.message||"Unknown error"}`);}
    finally{setBusy(false)}
  };

  const pickup=async(r,index)=>{
    const ps=pickups(r).map(x=>({...x}));

    if(!ps[index])return;

    ps[index].status="picked_up";

    const all=ps.every(x=>x.status==="picked_up");

    const nextStatus=all
      ?"out_for_delivery"
      :"pickup_in_progress";

    try{
      setBusy(true);

      // First update the delivery request itself. This is the
      // authoritative delivery-tracking document and must succeed.
      await runTransaction(db,async(t)=>{
        const rr=doc(db,"deliveryRequests",r.id);
        const snap=await t.get(rr);

        if(!snap.exists())throw Error("NOT_FOUND");

        const current=snap.data();

        if(
          current.assignedDeliveryAgentId!==id &&
          current.deliveryAgentId!==id
        ){
          throw Error("NOT_ASSIGNED");
        }

        t.update(rr,cleanFirestore({
          pickupLocations:ps,
          status:nextStatus,
          requestStatus:nextStatus,
          deliveryStatus:nextStatus,
          ...(all?{pickedUpAt:serverTimestamp(),outForDeliveryAt:serverTimestamp()}:{ }),
          updatedAt:serverTimestamp()
        }));
      });

      // Sync the related order documents separately. A permission/schema
      // problem in one seller-side document must not undo the pickup update.
      const syncData={
        status:nextStatus,
        deliveryStatus:nextStatus,
        ...(all?{pickedUpAt:serverTimestamp(),outForDeliveryAt:serverTimestamp()}:{ }),
        updatedAt:serverTimestamp()
      };

      if(r.orderId){
        try{
          await updateDoc(doc(db,"orders",r.orderId),syncData);
        }catch(orderError){
          console.warn("Parent order tracking sync failed:",orderError);
        }
      }

      if(r.sellerOrderId){
        const collectionName=sellerOrderCollection(r);
        try{
          await updateDoc(doc(db,collectionName,r.sellerOrderId),{
            ...syncData,
            status:all?"picked_up":"assigned"
          });
        }catch(sellerError){
          console.warn("Seller order tracking sync failed:",sellerError);
        }
      }

      const updated={...r,pickupLocations:ps,status:nextStatus,deliveryStatus:nextStatus};
      setActive(updated);

      success(
        all
          ?"All pickups complete. Deliver to consumer."
          :"Pickup confirmed."
      );
    }catch(e){
      console.error("Pickup update failed:",e);
      failure(
        e.message==="NOT_ASSIGNED"
          ?"This delivery is no longer assigned to you."
          :e.code==="permission-denied"
            ?"You are not permitted to update this delivery. Please sign in again."
            :"Unable to update pickup."
      );
    }finally{
      setBusy(false);
    }
  };

  const resolveDeliveryOtp = async (request) => {
    const directOtp =
      request?.consumerDeliveryOtp ||
      request?.deliveryOtp ||
      request?.consumer?.deliveryOtp ||
      request?.otp ||
      "";

    if (directOtp) return String(directOtp);

    // Delivery requests created before the OTP was copied onto the
    // request document can still resolve the OTP from the authoritative
    // consumer order / seller order created at checkout.
    const parentOrderId = request?.orderId || request?.parentOrderId || "";
    const sellerOrderId = request?.sellerOrderId || "";
    const sellerCollection = sellerOrderCollection(request);

    const refs = [];
    if (parentOrderId) refs.push({ type: "parent", ref: doc(db, "orders", parentOrderId) });
    if (sellerOrderId) refs.push({ type: "seller", ref: doc(db, sellerCollection, sellerOrderId) });

    if (!refs.length) return "";

    const snapshots = await Promise.all(
      refs.map(async ({ type, ref }) => {
        try {
          const snap = await getDoc(ref);
          return { type, snap };
        } catch (error) {
          // One related order may be inaccessible because of Firestore
          // ownership rules. Try the other source instead of failing OTP.
          console.warn(`Unable to read ${type} order for delivery OTP:`, error?.message || error);
          return { type, snap: null };
        }
      })
    );

    for (const { snap } of snapshots) {
      if (!snap?.exists()) continue;
      const data = snap.data() || {};
      const resolved =
        data.deliveryOtp ||
        data.consumerDeliveryOtp ||
        data.consumer?.deliveryOtp ||
        data.otp ||
        "";
      if (resolved) return String(resolved);
    }

    return "";
  };

  const complete=async()=>{
    if(!active)return;

    if(otp.length!==4){
      return failure("Enter the 4-digit consumer OTP.");
    }

    let expected="";
    try{
      expected=await resolveDeliveryOtp(active);
    }catch(error){
      console.error("Delivery OTP lookup failed:",error);
    }

    if(!expected){
      return failure(
        "Delivery OTP is not available for this order. The consumer must have a valid OTP generated at checkout."
      );
    }

    if(String(expected)!==String(otp).trim()){
      return failure("Invalid delivery OTP.");
    }

    try{
      setBusy(true);

      // First mark the delivery request as delivered. Keep this transaction
      // limited to fields allowed by the current deliveryRequests rules.
      await runTransaction(db,async(t)=>{
        const rr=doc(db,"deliveryRequests",active.id);
        const snap=await t.get(rr);

        if(!snap.exists())throw Error("NOT_FOUND");

        const current=snap.data();

        if(
          current.assignedDeliveryAgentId!==id &&
          current.deliveryAgentId!==id
        ){
          throw Error("NOT_ASSIGNED");
        }

        const currentStatus=activeDeliveryStatus(current);

        if(
          ![
            "picked_up",
            "out_for_delivery",
            "pickup_in_progress"
          ].includes(currentStatus)
        ){
          throw Error("INVALID_STATUS");
        }

        t.update(rr,{
          status:"delivered",
          requestStatus:"delivered",
          deliveryStatus:"delivered",
          deliveredAt:serverTimestamp(),
          updatedAt:serverTimestamp()
        });
      });

      // Sync the parent consumer order separately so a parent-order
      // permission issue cannot roll back the successful delivery update.
      if(active.orderId || active.parentOrderId){
        const parentOrderId=active.orderId || active.parentOrderId;
        try{
          await updateDoc(doc(db,"orders",parentOrderId),{
            status:"delivered",
            deliveryStatus:"delivered",
            deliveredAt:serverTimestamp(),
            updatedAt:serverTimestamp()
          });
        }catch(parentError){
          console.warn("Parent order delivery sync failed:",parentError);
        }
      }

      // Seller-side order keeps the OTP verification flag where the
      // existing farmerOrders rules explicitly permit it. FPO rules in the
      // current project only permit delivery status/timestamp fields.
      if(active.sellerOrderId){
        const collectionName=sellerOrderCollection(active);
        try{
          const sellerUpdate={
            status:"delivered",
            deliveryStatus:"delivered",
            deliveredAt:serverTimestamp(),
            updatedAt:serverTimestamp(),
            ...(collectionName==="farmerOrders"
              ? {deliveryOtpVerified:true,otpVerifiedAt:serverTimestamp()}
              : {})
          };
          await updateDoc(doc(db,collectionName,active.sellerOrderId),sellerUpdate);
        }catch(sellerError){
          console.warn("Seller order delivery sync failed:",sellerError);
        }
      }

      // Release the load carried by this partner.
      try{
        const remainingLoad=Math.max(
          load-weight(active),
          0
        );

        await setDoc(doc(db,"deliveryAgents",id),{
          currentLoadKg:remainingLoad,
          currentLoad:remainingLoad,
          updatedAt:serverTimestamp()
        },{merge:true});

        setProfile(p=>p?{
          ...p,
          currentLoadKg:remainingLoad,
          currentLoad:remainingLoad
        }:p);
      }catch(loadError){
        console.warn("Could not release vehicle load:",loadError);
      }

      setActive(null);
      setOtp("");
      nav("overview");
      success("Delivery completed successfully. OTP verified.");
    }catch(e){
      console.error(e);

      failure(
        e.message==="NOT_ASSIGNED"
          ?"This delivery is no longer assigned to you."
          :e.message==="INVALID_STATUS"
            ?"This delivery is not ready to be completed."
            :e.code==="permission-denied"
              ?"You are not permitted to complete this delivery. Please sign in again."
              :"Unable to complete delivery."
      );
    }finally{
      setBusy(false);
    }
  };

  const issue=async()=>{
    const r=active||selected;if(!r)return;
    try{setBusy(true);await addDoc(collection(db,"complaints"),{type:"delivery_issue",issueType,description:issueNote.trim(),requestId:r.id,orderId:r.orderId||"",deliveryAgentId:id,deliveryAgentName:name,status:"open",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});setIssueOpen(false);setIssueNote("");success("Issue reported to AgriConnect admin.");}
    catch(e){failure("Unable to submit issue.");}finally{setBusy(false)}
  };

  const logout=async()=>{try{await auth.signOut()}catch(e){}navigate("/login/delivery")};
  const unreadNotifications=notifications.filter(n=>n.read!==true && !["accepted","declined"].includes(String(n.status||"").toLowerCase()));
  const derivedActive=useMemo(
    ()=>mine
      .filter(x=>[id].includes(x.assignedDeliveryAgentId||x.deliveryAgentId))
      .filter(x=>["assigned","pickup_in_progress","picked_up","out_for_delivery"].includes(activeDeliveryStatus(x)))
      .sort((a,b)=>(dateOf(b.assignedAt||b.acceptedAt||b.updatedAt)?.getTime()||0)-(dateOf(a.assignedAt||a.acceptedAt||a.updatedAt)?.getTime()||0))[0]||null,
    [mine,id]
  );
  useEffect(()=>{
    if(!active&&derivedActive)setActive(derivedActive);
  },[derivedActive,active]);
  const completed=mine.filter(x=>["delivered","completed"].includes(String(x.status||"").toLowerCase()));
  const todayStart=new Date();todayStart.setHours(0,0,0,0);
  const today=completed.filter(x=>(dateOf(x.updatedAt||x.createdAt)?.getTime()||0)>=todayStart.getTime());
  const earnings=today.reduce((s,x)=>s+num(x.deliveryEarning??x.deliveryFee??x.partnerEarning??x.earnings),0);

  const sidebarUI=<>
    {sidebar&&<button className="delivery-sidebar-backdrop" onClick={()=>setSidebar(false)}/>}
    <aside className={`delivery-sidebar ${sidebar?"open":""}`}>
      <div className="delivery-sidebar-head"><div className="delivery-user-mini"><div className="delivery-avatar">{name[0]}</div><div><b>{name}</b><small>{mobile}</small></div></div><button onClick={()=>setSidebar(false)}><X size={18}/></button></div>
      <nav>
        {[
          ["overview",Home,"Overview"],["available",Zap,"Available Deliveries"],["my",Package,"My Deliveries"],
          ["active",Navigation,"Active Delivery"],["earnings",Wallet,"Earnings"],["notifications",Bell,"Notifications"],
          ["profile",User,"Profile"],["settings",Settings,"Settings"],["support",HelpCircle,"Help & Support"]
        ].map(([s,I,l])=><button key={s} className={section===s?"active":""} onClick={()=>nav(s)}><I size={18}/>{l}{s==="available"&&eligible.length>0?<em>{eligible.length}</em>:s==="notifications"&&unreadNotifications.length>0?<em>{unreadNotifications.length}</em>:null}</button>)}
      </nav>
      <div className="delivery-safe"><ShieldCheck size={18}/><span><b>Verified Partner</b>Drive safely & deliver responsibly.</span></div>
    </aside>
  </>;

  const top=<header className="delivery-topbar">
    <div className="top-left"><button className={`delivery-menu-toggle ${sidebar?"active":""}`} onClick={()=>setSidebar(x=>!x)}><span/><span/><span/></button><div className="brand"><div><Truck size={21}/></div><span><b>AgriConnect</b><small>Delivery Partner</small></span></div></div>
    <div className="top-actions"><button className={`online-toggle ${online?"on":""}`} onClick={toggleOnline} disabled={busy}><i/> {online?"Online":"Offline"}</button>
      <button className="icon-btn" onClick={()=>nav("notifications")}><Bell size={19}/>{unreadNotifications.length>0&&<em>{Math.min(9,unreadNotifications.length)}</em>}</button>
      <div className="profile-wrap"><button className="profile-btn" onClick={()=>setProfileMenu(x=>!x)}><span className="delivery-avatar">{name[0]}</span><b>{name.split(" ")[0]}</b></button>{profileMenu&&<div className="profile-menu"><button onClick={()=>nav("profile")}><User size={16}/>Profile</button><button onClick={()=>nav("settings")}><Settings size={16}/>Settings</button><button onClick={logout}><LogOut size={16}/>Logout</button></div>}</div>
    </div>
  </header>;

  const card=r=><article className="request-card" key={r.id}>
    <div className="request-head"><div><label>NEW DELIVERY</label><h3>{title(r)}</h3><small><Clock3 size={13}/>{when(r.createdAt)}</small></div><div className="request-money"><small>Estimated earning</small><b>{money(r.estimatedEarnings??r.deliveryEarning??r.deliveryFee)}</b></div></div>
    <div className="request-route"><div className="route-line"/><div><i className="route-dot pickup-dot"/><span><small>PICKUP {pickups(r).length>1?`• ${pickups(r).length} STOPS`:""}</small><b>{pickups(r)[0]?.sellerName||"Farmer / FPO"}</b><p>{pickups(r)[0]?.address||"Pickup location"}</p></span></div><div><i className="route-dot drop-dot"/><span><small>DELIVERY</small><b>{r.consumerName||r.consumer?.fullName||"Consumer"}</b><p>{address(r)}</p></span></div></div>
    <div className="meta"><span><MapPin size={14}/>{r._distance!=null?`${r._distance.toFixed(1)} km pickup`:"Distance calculating"}</span><span><Package size={14}/>{r._weight.toFixed(1)} kg</span><span><Truck size={14}/>{capacity?`${free.toFixed(0)} kg free`:"Capacity unset"}</span><span><Clock3 size={14}/>{r.estimatedTime||r.estimatedEta||"ETA unavailable"}</span></div>
    {pickups(r).length>1&&<div className="batch-note"><RouteIcon size={15}/>Smart batch: {pickups(r).length} pickup stops grouped into this delivery.</div>}
    <div className="request-buttons"><button className="secondary" onClick={()=>{setSelected(r);nav("available")}}>View Details <ChevronRight size={15}/></button><button className="decline" onClick={()=>{setSelected(r);setDeclineOpen(true)}}>Decline</button><button className="primary" onClick={()=>accept(r)} disabled={busy}><CheckCircle2 size={16}/>Accept Delivery</button></div>
  </article>;

  const activeUI=r=>{
    if(!r)return <div className="empty"><Navigation size={28}/><h3>No active delivery</h3><p>Accept a delivery request to start a route.</p><button className="primary" onClick={()=>nav("available")}>View Available Deliveries</button></div>;
    const ps=pickups(r), all=ps.every(x=>x.status==="picked_up");
    return <div className="active-card"><div className="active-head"><div><label>ACTIVE</label><h3>{title(r)}</h3><small><i className="live-dot"/>{statusText(r.deliveryStatus||r.status)}</small></div><button className="issue" onClick={()=>setIssueOpen(true)}><AlertTriangle size={15}/>Report Issue</button></div>
      <div className="stops">{ps.map((p,i)=><div className="stop" key={i}><div className={`stop-num ${p.status==="picked_up"?"done":""}`}>{p.status==="picked_up"?<CheckCircle2 size={17}/>:i+1}</div><div><small>PICKUP {i+1}</small><b>{p.sellerName||p.farmerName||p.fpoName||"Farmer / FPO"}</b><p>{p.address||"Pickup address"}</p><div className="stop-buttons"><button className="map" onClick={()=>{const c=coords(p);if(c)window.open(`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`,"_blank")}}><Navigation size={14}/>Navigate</button>{p.status!=="picked_up"&&<button className="pickup" onClick={()=>pickup(r,i)} disabled={busy}><CheckCircle2 size={14}/>Confirm Pickup</button>}</div></div></div>)}
      <div className="stop consumer"><div className={`stop-num ${all?"ready":"locked"}`}><Home size={16}/></div><div><small>FINAL DELIVERY</small><b>{r.consumerName||r.consumer?.fullName||"Consumer"}</b><p>{address(r)}</p><div className="stop-buttons"><button className="map" disabled={!all} onClick={()=>{const c=coords(r.consumerLocation||r.deliveryLocation||{});if(c)window.open(`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`,"_blank")}}><Navigation size={14}/>Navigate</button><button className="map" onClick={()=>{const p=r.consumerMobile||r.consumer?.mobile||r.mobile;if(p)window.location.href=`tel:${p}`}}><Phone size={14}/>Call Consumer</button></div></div></div></div>
      {all&&<div className="complete-box"><b>Ready for consumer delivery</b><p>Ask the consumer for the 4-digit OTP generated for this order before marking delivered.</p><div><input value={otp} maxLength={4} inputMode="numeric" placeholder="4-digit OTP" onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,4))}/><button className="primary" onClick={complete} disabled={busy}><ShieldCheck size={16}/>Verify & Deliver</button></div></div>}
      <div className="route-summary"><span><RouteIcon size={17}/>Route <b>{r.totalDistanceKm!=null?`${num(r.totalDistanceKm).toFixed(1)} km`:"Calculating"}</b></span><span><Clock3 size={17}/>ETA <b>{r.estimatedTime||r.estimatedEta||"Unavailable"}</b></span><span><CircleDollarSign size={17}/>Earnings <b>{money(r.estimatedEarnings??r.deliveryEarning??r.deliveryFee)}</b></span></div>
    </div>;
  };

  const overview=<div className="page"><div className="welcome"><div><label>DELIVERY PARTNER</label><h1>Welcome, <span>{name.split(" ")[0]}</span> 👋</h1><p>{online?"You're online. Nearby eligible requests can reach you.":"You're offline. Go online to receive nearby requests."}</p></div><button className="location-btn" onClick={updateGPS} disabled={gpsBusy}><LocateFixed size={17}/>{gpsBusy?"Updating...":"Update Location"}</button></div>
    <div className="stats"><Stat I={Zap} label="Available" value={eligible.length} sub="requests near you"/><Stat I={Package} label="Today's Deliveries" value={today.length} sub="completed"/><Stat I={CircleDollarSign} label="Today's Earnings" value={money(earnings)} sub="completed deliveries"/><Stat I={Truck} label="Available Capacity" value={capacity?`${free.toFixed(0)} kg`:"Set"} sub={capacity?`of ${capacity} kg`:"vehicle capacity"}/></div>
    <div className="two-cols"><section className="panel"><Head title="Available Deliveries" eyebrow="SMART MATCHING" action="View all" onClick={()=>nav("available")}/>{eligible.slice(0,2).map(card)}{!eligible.length&&<div className="empty compact"><Truck size={24}/><h3>No requests right now</h3><p>Stay online. Requests matching your location and capacity will appear here.</p></div>}</section>
    <section className="panel"><Head title="Vehicle Capacity" eyebrow="YOUR VEHICLE"/><div className="capacity"><div style={{width:capacity?`${Math.min(100,load/capacity*100)}%`:"0%"}}/></div><div className="capacity-values"><span>Current load <b>{load.toFixed(0)} kg</b></span><span>Available <b>{capacity?`${free.toFixed(0)} kg`:"—"}</b></span></div><p className="rule"><ShieldCheck size={15}/>Capacity is shown for planning; it does not hide delivery requests.</p><button className="secondary full" onClick={()=>nav("profile")}>View vehicle details</button></section></div>
    <section className="panel"><Head title="Current Delivery" eyebrow="ACTIVE TRIP"/>{activeUI(active)}</section></div>;

  function Stat({I,label,value,sub}){return <div className="stat"><div><I size={20}/></div><span>{label}</span><b>{value}</b><small>{sub}</small></div>}
  function Head({title:tx,eyebrow,action,onClick}){return <div className="panel-head"><div><label>{eyebrow}</label><h2>{tx}</h2></div>{action&&<button onClick={onClick}>{action}<ChevronRight size={14}/></button>}</div>}

  const available=<div className="page"><div className="page-head"><div><label>SMART DELIVERY MATCHING</label><h1>Available Deliveries</h1><p>All ready-for-pickup requests are shown to delivery partners.</p></div><button className={`go-online ${online?"on":""}`} onClick={toggleOnline}><i/>{online?"You're Online":"Go Online"}</button></div><div className="matching"><Zap size={20}/><span><b>First Accept Wins</b><small>All eligible partners can receive the request. The first successful Firestore transaction gets the assignment.</small></span></div>{selected? <div className="panel detail"><button className="back" onClick={()=>setSelected(null)}>← Back</button><Head title={title(selected)} eyebrow="DELIVERY REQUEST"/><div className="detail-grid"><div><b>Pickup stops</b>{pickups(selected).map((p,i)=><p key={i}><strong>{i+1}. {p.sellerName||"Farmer / FPO"}</strong><br/>{p.address}</p>)}</div><div><b>Consumer</b><p>{selected.consumerName||selected.consumer?.fullName||"Consumer"}<br/>{address(selected)}</p></div></div><div className="request-buttons"><button className="decline" onClick={()=>setDeclineOpen(true)}>Decline</button><button className="primary" onClick={()=>accept(selected)}><CheckCircle2 size={16}/>Accept Delivery</button></div></div>:<div className="requests">{eligible.map(card)}{!eligible.length&&<div className="empty"><Truck size={28}/><h3>No eligible deliveries</h3><p>All open ready-for-pickup requests are shown. GPS, online status and capacity are displayed for information only.</p><button className="primary" onClick={updateGPS}><LocateFixed size={16}/>Update Location</button></div>}</div>}</div>;

  const myUI=<div className="page"><div className="page-head"><div><label>DELIVERY HISTORY</label><h1>My Deliveries</h1><p>Assigned and completed delivery requests.</p></div></div><div className="table-panel"><div className="table-wrap"><table><thead><tr><th>Order</th><th>Pickup</th><th>Consumer</th><th>Weight</th><th>Status</th><th>Earnings</th></tr></thead><tbody>{mine.map(r=><tr key={r.id}><td><b>{title(r)}</b><small>{when(r.updatedAt||r.createdAt)}</small></td><td>{pickups(r).length} stop{pickups(r).length!==1?"s":""}</td><td>{r.consumerName||r.consumer?.fullName||"Consumer"}</td><td>{weight(r).toFixed(1)} kg</td><td><mark>{statusText(r.status)}</mark></td><td>{money(r.deliveryEarning??r.deliveryFee??r.estimatedEarnings)}</td></tr>)}</tbody></table></div>{!mine.length&&<div className="empty"><Package size={28}/><h3>No deliveries yet</h3><p>Accepted requests will appear here.</p></div>}</div></div>;

  const earningsUI=<div className="page"><div className="page-head"><div><label>PAYOUTS</label><h1>Earnings</h1><p>Track completed delivery earnings.</p></div></div><div className="earning-banner"><Wallet size={27}/><span><small>Total recorded earnings</small><b>{money(mine.reduce((s,x)=>s+num(x.deliveryEarning??x.deliveryFee??x.partnerEarning??x.earnings),0))}</b></span></div><div className="earning-grid"><div className="panel"><span>Today</span><b>{money(earnings)}</b></div><div className="panel"><span>Completed Today</span><b>{today.length}</b></div><div className="panel"><span>Active</span><b>{mine.filter(x=>["accepted","assigned","pickup_in_progress","picked_up","out_for_delivery"].includes(String(x.status||"").toLowerCase())).length}</b></div></div></div>;

  const notificationsUI=<div className="page"><div className="page-head"><div><label>UPDATES</label><h1>Notifications</h1><p>New delivery requests and AgriConnect updates.</p></div></div><div className="notification-list">{notifications.map(n=><div className="notification" key={n.id}><div><Bell size={18}/></div><span><b>{n.title||String(n.type||"AgriConnect update").replaceAll("_"," ")}</b><p>{n.message||n.description||"You have a new notification."}</p><small>{when(n.createdAt)}</small></span></div>)}{!notifications.length&&<div className="empty"><Bell size={28}/><h3>No notifications</h3><p>Eligible delivery requests will appear here.</p></div>}</div></div>;

  const profileUI=<div className="page"><div className="page-head"><div><label>PARTNER ACCOUNT</label><h1>Profile</h1><p>Identity, vehicle and delivery eligibility.</p></div></div><div className="profile-grid"><section className="panel profile-card"><div className="profile-header"><div className="delivery-avatar big">{name[0]}</div><span><h2>{name}</h2><small>{mobile}</small><mark><ShieldCheck size={13}/>Verified Partner</mark></span></div><div className="info-grid">{[["Name",name],["Mobile",mobile||"—"],["Vehicle",profile?.vehicleType||profile?.vehicle||"Not set"],["Capacity",capacity?`${capacity} kg`:"Not set"],["Service radius",`${radius} km`],["License",profile?.licenseNumber||profile?.drivingLicense||"Not available"]].map(([a,b])=><span key={a}><small>{a}</small><b>{b}</b></span>)}</div></section><section className="panel"><Head title="Live Matching" eyebrow="PREFERENCES"/><div className="pref"><span><b>Online availability</b><small>Receive all open delivery requests.</small></span><button className={`switch ${online?"on":""}`} onClick={toggleOnline}><i/></button></div><div className="pref"><span><b>Current location</b><small>{myCoords?`${myCoords.lat.toFixed(4)}, ${myCoords.lng.toFixed(4)}`:"Not available"}</small></span><button className="small-icon" onClick={updateGPS}><Crosshair size={17}/></button></div></section></div></div>;

  const settingsUI=<div className="page"><div className="page-head"><div><label>PREFERENCES</label><h1>Settings</h1></div></div><div className="settings">{[["Notifications","Nearby eligible requests appear in your notification feed."],["Location matching",`Pickup radius: ${radius} km (informational).`],["Capacity filter",capacity?`Capacity is informational; requests are not hidden by weight.`:"Set your vehicle capacity during registration."]].map(([a,b])=><div key={a}><Settings size={18}/><span><b>{a}</b><small>{b}</small></span><mark>ACTIVE</mark></div>)}</div></div>;

  const supportUI=<div className="page"><div className="page-head"><div><label>SUPPORT</label><h1>Help & Support</h1><p>Report problems during a delivery.</p></div></div><div className="support-grid"><section className="panel"><AlertTriangle size={22}/><h3>Delivery issue</h3><p>Farmer unavailable, product mismatch, consumer unavailable, wrong address or vehicle problem.</p><button className="secondary" onClick={()=>active?setIssueOpen(true):failure("Open an active delivery first.")}>Report Issue</button></section><section className="panel"><HelpCircle size={22}/><h3>Partner support</h3><p>Contact AgriConnect support for account, verification or payment issues.</p><a className="secondary link" href="tel:1800000000">Call Support</a></section></div></div>;

  let body=section==="overview"?overview:section==="available"?available:section==="active"?<div className="page"><div className="page-head"><div><label>ROUTE & PICKUP</label><h1>Active Delivery</h1><p>Complete every pickup, then verify consumer OTP.</p></div></div>{activeUI(active)}</div>:section==="my"?myUI:section==="earnings"?earningsUI:section==="notifications"?notificationsUI:section==="profile"?profileUI:section==="settings"?settingsUI:supportUI;

  return <div className="delivery-dashboard">{sidebarUI}{top}<main>{msg&&<div className="toast success"><CheckCircle2 size={16}/>{msg}<button onClick={()=>setMsg("")}><X size={14}/></button></div>}{err&&<div className="toast error"><XCircle size={16}/>{err}<button onClick={()=>setErr("")}><X size={14}/></button></div>}{body}</main>
    {declineOpen&&<div className="modal-bg"><div className="modal"><div className="modal-head"><h2>Why are you declining?</h2><button onClick={()=>setDeclineOpen(false)}><X size={18}/></button></div>{DECLINE_REASONS.map(x=><label className={declineReason===x?"reason selected":"reason"} key={x}><input type="radio" checked={declineReason===x} onChange={()=>setDeclineReason(x)}/>{x}</label>)}<div className="modal-actions"><button className="secondary" onClick={()=>setDeclineOpen(false)}>Cancel</button><button className="decline" onClick={decline} disabled={busy}>Decline</button></div></div></div>}
    {issueOpen&&<div className="modal-bg"><div className="modal"><div className="modal-head"><h2>Report Delivery Issue</h2><button onClick={()=>setIssueOpen(false)}><X size={18}/></button></div><label className="field">Issue type<select value={issueType} onChange={e=>setIssueType(e.target.value)}>{["Farmer unavailable","Product mismatch","Product damaged","Consumer unavailable","Wrong address","Vehicle problem","Payment issue","Other"].map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Details<textarea rows="4" value={issueNote} onChange={e=>setIssueNote(e.target.value)} placeholder="Describe the problem..."/></label><div className="modal-actions"><button className="secondary" onClick={()=>setIssueOpen(false)}>Cancel</button><button className="primary" onClick={issue} disabled={busy}><FileText size={16}/>Submit Issue</button></div></div></div>}
  </div>;
}
