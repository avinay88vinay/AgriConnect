import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ShieldCheck, LayoutDashboard, Users, Building2, UserRound, Truck,
  Package, ShoppingCart, MapPinned, CreditCard, MessageSquareWarning,
  Bell, BarChart3, Settings, Clock3, CheckCircle2, XCircle, FileCheck2,
  LogOut, ChevronRight, RefreshCw, AlertCircle, Menu, X, Search,
  TrendingUp, CircleDollarSign, Activity
} from "lucide-react";

import { collection, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  // =========================================
  // STATE
  // =========================================

  const [farmerApplications, setFarmerApplications] =
    useState([]);

  const [fpoApplications, setFpoApplications] =
    useState([]);

  const [deliveryApplications, setDeliveryApplications] =
    useState([]);

  const [farmerLoaded, setFarmerLoaded] =
    useState(false);

  const [fpoLoaded, setFpoLoaded] =
    useState(false);

  const [deliveryLoaded, setDeliveryLoaded] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("farmer");

  const loading =
    !farmerLoaded ||
    !fpoLoaded ||
    !deliveryLoaded;

  // =========================================
  // FARMER APPLICATIONS
  // =========================================

  useEffect(() => {
    const farmerRef = collection(
      db,
      "farmerApplications"
    );

    const unsubscribe = onSnapshot(
      farmerRef,
      (snapshot) => {
        const applications =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        applications.sort((a, b) => {
          const aTime =
            a.createdAt?.seconds ||
            a.updatedAt?.seconds ||
            a.submittedAt?.seconds ||
            0;

          const bTime =
            b.createdAt?.seconds ||
            b.updatedAt?.seconds ||
            b.submittedAt?.seconds ||
            0;

          return bTime - aTime;
        });

        setFarmerApplications(
          applications
        );

        setFarmerLoaded(true);

        console.log(
          "Farmer applications:",
          applications
        );
      },
      (error) => {
        console.error(
          "Farmer applications error:",
          error
        );

        setErrorMessage(
          "Unable to load farmer applications. Please check Firebase permissions."
        );

        setFarmerLoaded(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================
  // FPO APPLICATIONS
  // =========================================

  useEffect(() => {
    const fpoRef = collection(
      db,
      "fpoApplications"
    );

    const unsubscribe = onSnapshot(
      fpoRef,
      (snapshot) => {
        const applications =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        applications.sort((a, b) => {
          const aTime =
            a.createdAt?.seconds ||
            a.updatedAt?.seconds ||
            a.submittedAt?.seconds ||
            0;

          const bTime =
            b.createdAt?.seconds ||
            b.updatedAt?.seconds ||
            b.submittedAt?.seconds ||
            0;

          return bTime - aTime;
        });

        setFpoApplications(
          applications
        );

        setFpoLoaded(true);

        console.log(
          "FPO applications:",
          applications
        );
      },
      (error) => {
        console.error(
          "FPO applications error:",
          error
        );

        setErrorMessage(
          "Unable to load FPO applications. Please check Firebase permissions."
        );

        setFpoLoaded(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================
  // DELIVERY APPLICATIONS
  // =========================================

  useEffect(() => {
    const deliveryRef = collection(
      db,
      "deliveryApplications"
    );

    const unsubscribe = onSnapshot(
      deliveryRef,
      (snapshot) => {
        const applications =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        applications.sort((a, b) => {
          const aTime =
            a.updatedAt?.seconds ||
            a.createdAt?.seconds ||
            a.submittedAt?.seconds ||
            0;

          const bTime =
            b.updatedAt?.seconds ||
            b.createdAt?.seconds ||
            b.submittedAt?.seconds ||
            0;

          return bTime - aTime;
        });

        setDeliveryApplications(
          applications
        );

        setDeliveryLoaded(true);

        console.log(
          "Delivery applications:",
          applications
        );
      },
      (error) => {
        console.error(
          "Delivery applications error:",
          error
        );

        setErrorMessage(
          "Unable to load delivery applications. Please check Firebase permissions."
        );

        setDeliveryLoaded(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================
  // FARMER COUNTS
  // =========================================

  const farmerCounts = useMemo(() => {
    return {
      total: farmerApplications.length,

      pending:
        farmerApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "pending"
        ).length,

      approved:
        farmerApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "approved"
        ).length,

      rejected:
        farmerApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "rejected"
        ).length,
    };
  }, [farmerApplications]);

  // =========================================
  // FPO COUNTS
  // =========================================

  const fpoCounts = useMemo(() => {
    return {
      total: fpoApplications.length,

      pending:
        fpoApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "pending"
        ).length,

      approved:
        fpoApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "approved"
        ).length,

      rejected:
        fpoApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "rejected"
        ).length,
    };
  }, [fpoApplications]);

  // =========================================
  // DELIVERY COUNTS
  // =========================================

  const deliveryCounts = useMemo(() => {
    return {
      total: deliveryApplications.length,

      pending:
        deliveryApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "pending"
        ).length,

      approved:
        deliveryApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "approved"
        ).length,

      rejected:
        deliveryApplications.filter(
          (item) =>
            String(item.status || "")
              .toLowerCase() === "rejected"
        ).length,
    };
  }, [deliveryApplications]);

  // =========================================
  // PENDING APPLICATIONS
  // =========================================

  const pendingFarmerApplications =
    useMemo(() => {
      return farmerApplications.filter(
        (application) =>
          String(application.status || "")
            .toLowerCase() === "pending"
      );
    }, [farmerApplications]);

  const pendingFpoApplications =
    useMemo(() => {
      return fpoApplications.filter(
        (application) =>
          String(application.status || "")
            .toLowerCase() === "pending"
      );
    }, [fpoApplications]);

  const pendingDeliveryApplications =
    useMemo(() => {
      return deliveryApplications.filter(
        (application) =>
          String(application.status || "")
            .toLowerCase() === "pending"
      );
    }, [deliveryApplications]);

  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      navigate("/admin", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Admin logout error:",
        error
      );

      navigate("/admin", {
        replace: true,
      });
    }
  };

  // =========================================
  // DATE FORMAT
  // =========================================

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Recently";
    }

    try {
      let date;

      if (
        typeof timestamp.toDate ===
        "function"
      ) {
        date = timestamp.toDate();
      } else if (
        timestamp.seconds
      ) {
        date = new Date(
          timestamp.seconds * 1000
        );
      } else if (
        timestamp instanceof Date
      ) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }

      if (
        Number.isNaN(date.getTime())
      ) {
        return "Recently";
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "Recently";
    }
  };

  // =========================================
  // STATUS CLASS
  // =========================================

  const getStatusClass = (status) => {
    const value =
      String(status || "")
        .toLowerCase()
        .trim();

    if (
      value === "approved" ||
      value === "rejected" ||
      value === "pending"
    ) {
      return value;
    }

    return "pending";
  };


  // All Admin sections live inside this component.
  // Navigation changes only activeSection; it does not create new routes/pages.
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const goTo = (section) => {
    setActiveSection(section);
    setSidebarOpen(false);
    setProfileMenuOpen(false);
    setSearchTerm("");
  };

  const totalApplications =
    farmerCounts.total + fpoCounts.total + deliveryCounts.total;
  const totalPending =
    farmerCounts.pending + fpoCounts.pending + deliveryCounts.pending;
  const totalApproved =
    farmerCounts.approved + fpoCounts.approved + deliveryCounts.approved;
  const totalRejected =
    farmerCounts.rejected + fpoCounts.rejected + deliveryCounts.rejected;
  const approvalRate = totalApplications
    ? Math.round((totalApproved / totalApplications) * 100)
    : 0;

  // UI-only sample data for sections where the current Admin backend
  // does not expose a dedicated management view yet. Nothing is written
  // to Firebase by these arrays.
  const mockData = {
    consumers: [
      ["C-1001", "Ravi Kumar", "Guntur", "8", "Active"],
      ["C-1002", "Anjali Reddy", "Vijayawada", "5", "Active"],
      ["C-1003", "Suresh Babu", "Tenali", "11", "Active"],
      ["C-1004", "Priya Sharma", "Hyderabad", "3", "Inactive"],
    ],
    products: [
      ["P-101", "Tomatoes", "Green Valley FPO", "Vegetables", "1,250 kg", "₹32/kg", "Available"],
      ["P-102", "Rice", "Krishna FPO", "Grains", "3,500 kg", "₹58/kg", "Available"],
      ["P-103", "Chillies", "Guntur Farmers", "Vegetables", "780 kg", "₹96/kg", "Available"],
      ["P-104", "Mangoes", "AP Mango FPO", "Fruits", "620 kg", "₹72/kg", "Low Stock"],
    ],
    orders: [
      ["ORD-501", "Ravi Kumar", "3", "₹1,240", "Delivered", "10 Sep 2026"],
      ["ORD-502", "Anjali Reddy", "2", "₹860", "Processing", "10 Sep 2026"],
      ["ORD-503", "Suresh Babu", "5", "₹2,410", "Out for Delivery", "09 Sep 2026"],
      ["ORD-504", "Priya Sharma", "1", "₹420", "Pending", "09 Sep 2026"],
    ],
    deliveries: [
      ["DLV-301", "Ramesh", "ORD-501", "Guntur → Vijayawada", "Delivered"],
      ["DLV-302", "Kiran", "ORD-503", "Tenali → Guntur", "Out for Delivery"],
      ["DLV-303", "Mahesh", "ORD-498", "Vijayawada → Guntur", "Assigned"],
      ["DLV-304", "Arjun", "ORD-497", "Guntur → Tenali", "Available"],
    ],
    payments: [
      ["PAY-701", "ORD-501", "Ravi Kumar", "₹1,240", "UPI", "Paid"],
      ["PAY-702", "ORD-502", "Anjali Reddy", "₹860", "Card", "Paid"],
      ["PAY-703", "ORD-503", "Suresh Babu", "₹2,410", "UPI", "Paid"],
      ["PAY-704", "ORD-504", "Priya Sharma", "₹420", "Cash on Delivery", "Pending"],
    ],
    complaints: [
      ["CMP-201", "Order arrived late", "Anjali Reddy", "Medium", "Open"],
      ["CMP-202", "Product quality issue", "Ravi Kumar", "High", "Investigating"],
      ["CMP-203", "Payment not reflected", "Suresh Babu", "High", "Resolved"],
    ],
  };

  const navItems = [
    ["dashboard", "Dashboard", LayoutDashboard, 0],
    ["farmers", "Farmers", Users, farmerCounts.pending],
    ["fpos", "FPOs", Building2, fpoCounts.pending],
    ["consumers", "Consumers", UserRound, 0],
    ["delivery-partners", "Delivery Partners", Truck, deliveryCounts.pending],
    ["products", "Products / Produce", Package, 0],
    ["orders", "Orders", ShoppingCart, 0],
    ["deliveries", "Deliveries", MapPinned, 0],
    ["payments", "Payments", CreditCard, 0],
    ["complaints", "Complaints / Disputes", MessageSquareWarning, 2],
    ["notifications", "Notifications", Bell, 3],
    ["reports", "Reports / Analytics", BarChart3, 0],
    ["settings", "Settings", Settings, 0],
  ];

  const titles = {
    dashboard: ["Admin Dashboard", "Overall AgriConnect platform overview and management."],
    farmers: ["Farmers", "Review and manage farmer applications."],
    fpos: ["FPOs", "Review and manage Farmer Producer Organisation applications."],
    consumers: ["Consumers", "Monitor consumer activity across the platform."],
    "delivery-partners": ["Delivery Partners", "Review and manage delivery partner applications."],
    products: ["Products / Produce", "Monitor produce listed by farmers and FPOs."],
    orders: ["Orders", "Monitor platform orders and their current status."],
    deliveries: ["Deliveries", "Monitor delivery assignments and routes."],
    payments: ["Payments", "Monitor payment activity and settlement status."],
    complaints: ["Complaints / Disputes", "Track issues requiring administrative attention."],
    notifications: ["Notifications", "Review important platform notifications."],
    reports: ["Reports / Analytics", "Platform performance and operational analytics."],
    settings: ["Settings", "Administrative preferences and controls."],
  };

  const filterRows = (rows) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(q))
    );
  };

  const renderVerification = (type, showAll = false) => {
    const config = {
      farmer: {
        applications: showAll ? farmerApplications : pendingFarmerApplications,
        Icon: UserRound, cls: "farmer", empty: "No Pending Farmer Applications",
        route: (id) => `/admin/farmer/${id}`
      },
      fpo: {
        applications: showAll ? fpoApplications : pendingFpoApplications,
        Icon: Building2, cls: "fpo", empty: "No Pending FPO Applications",
        route: (id) => `/admin/fpo/${id}`
      },
      delivery: {
        applications: showAll ? deliveryApplications : pendingDeliveryApplications,
        Icon: Truck, cls: "delivery", empty: "No Pending Delivery Applications",
        route: (id) => `/admin/delivery/${id}`
      }
    }[type];

    const { applications, Icon, cls, empty, route } = config;

    if (!applications.length) {
      return (
        <div className="admin-empty-state">
          <Icon size={35} />
          <h3>{showAll ? `No ${type} applications found` : empty}</h3>
          <p>{showAll ? "No records are available in this view." : "All applications in this queue have been reviewed."}</p>
        </div>
      );
    }

    return (
      <div className="admin-application-list">
        {applications.map((application) => {
          const status = getStatusClass(application.status);

          if (type === "farmer") {
            const personal = application.personalDetails || {};
            const farm = application.farmDetails || {};
            return (
              <div className="admin-application-card" key={application.id}>
                <div className="admin-application-main">
                  <div className={`admin-application-icon ${cls}`}><Icon size={22} /></div>
                  <div className="admin-application-info">
                    <div className="admin-title-row">
                      <h3>{personal.fullName || application.fullName || application.name || "Individual Farmer"}</h3>
                      <span className={`admin-status ${status}`}>{status}</span>
                    </div>
                    <p>Mobile: {application.mobile || personal.mobile || "—"}</p>
                    <div className="admin-meta">
                      <span>Farm: {farm.farmName || application.farmName || "—"}</span>
                      <span>Location: {application.location?.district || personal.district || application.location?.state || personal.state || "—"}</span>
                      <span>Submitted: {formatDate(application.createdAt || application.updatedAt || application.submittedAt)}</span>
                    </div>
                  </div>
                </div>
                <button className="admin-review-btn" onClick={() => navigate(route(application.id))}>
                  Review <ChevronRight size={17} />
                </button>
              </div>
            );
          }

          if (type === "fpo") {
            const organisation = application.organisation || {};
            const farmers = Array.isArray(application.farmers) ? application.farmers : [];
            return (
              <div className="admin-application-card" key={application.id}>
                <div className="admin-application-main">
                  <div className={`admin-application-icon ${cls}`}><Icon size={22} /></div>
                  <div className="admin-application-info">
                    <div className="admin-title-row">
                      <h3>{organisation.fpoName || "FPO Organisation"}</h3>
                      <span className={`admin-status ${status}`}>{status}</span>
                    </div>
                    <p>Reg. No: {organisation.registrationNumber || "Not provided"}</p>
                    <div className="admin-meta">
                      <span><Users size={13} /> {farmers.length} members</span>
                      <span>Mobile: {application.mobile || "—"}</span>
                      <span>Submitted: {formatDate(application.createdAt || application.updatedAt || application.submittedAt)}</span>
                    </div>
                  </div>
                </div>
                <button className="admin-review-btn" onClick={() => navigate(route(application.id))}>
                  Review <ChevronRight size={17} />
                </button>
              </div>
            );
          }

          const personal = application.personalDetails || {};
          const vehicle = application.vehicleDetails || {};
          return (
            <div className="admin-application-card" key={application.id}>
              <div className="admin-application-main">
                <div className={`admin-application-icon ${cls}`}><Icon size={22} /></div>
                <div className="admin-application-info">
                  <div className="admin-title-row">
                    <h3>{personal.fullName || application.fullName || "Delivery Partner"}</h3>
                    <span className={`admin-status ${status}`}>{status}</span>
                  </div>
                  <p>Mobile: {application.mobile || personal.mobile || "—"}</p>
                  <div className="admin-meta">
                    <span>Vehicle: {vehicle.vehicleType || "—"}</span>
                    <span>Number: {vehicle.vehicleNumber || "—"}</span>
                    <span>Submitted: {formatDate(application.submittedAt || application.updatedAt || application.createdAt)}</span>
                  </div>
                </div>
              </div>
              <button className="admin-review-btn" onClick={() => navigate(route(application.id))}>
                Review <ChevronRight size={17} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-loading-card">
          <RefreshCw size={34} className="admin-loading-icon" />
          <h2>Loading Admin Dashboard</h2>
          <p>Connecting to AgriConnect applications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      <header className="admin-dashboard-header">
        <div className="admin-header-inner">
          <button className="admin-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open admin menu">
            <Menu size={20} />
          </button>

          <div className="admin-brand">
            <div className="admin-brand-icon"><ShieldCheck size={21} /></div>
            <div>
              <strong>AgriConnect</strong>
              <span>Administration Portal</span>
            </div>
          </div>

          <div className="admin-header-right">
            <div className="admin-header-search">
              <Search size={16} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search current section..." />
            </div>
            <div className="admin-secure-badge"><ShieldCheck size={14} /> Secure Admin</div>
            <div className="admin-profile-wrap">
              <button className="admin-profile-btn" onClick={() => setProfileMenuOpen((v) => !v)}>
                <UserRound size={17} /><span>Admin</span>
              </button>
              {profileMenuOpen && (
                <div className="admin-profile-menu">
                  <button onClick={() => goTo("settings")}><Settings size={15} /> Settings</button>
                  <button onClick={handleLogout}><LogOut size={15} /> Logout</button>
                </div>
              )}
            </div>
            <button className="admin-logout-btn" onClick={handleLogout}><LogOut size={17} /> Logout</button>
          </div>
        </div>
      </header>

      {sidebarOpen && <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="admin-shell">
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="admin-sidebar-top">
            <div className="admin-sidebar-title">ADMIN MENU</div>
            <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
          </div>

          <nav className="admin-sidebar-nav">
            {navItems.map(([id, label, Icon, badge]) => (
              <button key={id} className={`admin-nav-item ${activeSection === id ? "active" : ""}`} onClick={() => goTo(id)}>
                <Icon size={18} /><span>{label}</span>{badge > 0 && <em>{badge}</em>}
              </button>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-security">
              <ShieldCheck size={17} />
              <div><strong>Secure Admin</strong><span>Management access</span></div>
            </div>
            <button className="admin-sidebar-logout" onClick={handleLogout}><LogOut size={17} /> Logout</button>
          </div>
        </aside>

        <main className="admin-dashboard-main">
          {errorMessage && (
            <div className="admin-error-banner"><AlertCircle size={18} /><span>{errorMessage}</span></div>
          )}

          <section className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">ADMINISTRATION</span>
              <h1>{titles[activeSection][0]}</h1>
              <p>{titles[activeSection][1]}</p>
            </div>
            <div className="admin-heading-total"><span>Total Applications</span><strong>{totalApplications}</strong></div>
          </section>

          {activeSection === "dashboard" && (
            <>
              <section className="admin-stats-grid">
                <Stat icon={Users} cls="farmer" label="Farmer Applications" value={farmerCounts.total} note="Individual farmers" />
                <Stat icon={Building2} cls="fpo" label="FPO Applications" value={fpoCounts.total} note="Organisations" />
                <Stat icon={Truck} cls="delivery" label="Delivery Partners" value={deliveryCounts.total} note="Delivery applications" />
                <Stat icon={Clock3} cls="pending" label="Pending Review" value={totalPending} note="Require admin action" />
                <Stat icon={CheckCircle2} cls="approved" label="Approved" value={totalApproved} note="Verified applications" />
              </section>

              <section className="admin-dashboard-panels">
                <div className="admin-panel-card">
                  <PanelHeading icon={Activity} eyebrow="OVERVIEW" title="Platform Snapshot" />
                  <div className="admin-overview-grid">
                    <div><Users size={17} /><span>Farmers</span><strong>{farmerCounts.total}</strong></div>
                    <div><Building2 size={17} /><span>FPOs</span><strong>{fpoCounts.total}</strong></div>
                    <div><UserRound size={17} /><span>Consumers</span><strong>{mockData.consumers.length}</strong></div>
                    <div><Truck size={17} /><span>Delivery Partners</span><strong>{deliveryCounts.total}</strong></div>
                  </div>
                </div>
                <div className="admin-panel-card">
                  <PanelHeading icon={TrendingUp} eyebrow="HEALTH" title="Verification Performance" />
                  <div className="admin-progress-row"><span>Approval rate</span><strong>{approvalRate}%</strong></div>
                  <div className="admin-progress"><span style={{ width: `${approvalRate}%` }} /></div>
                  <div className="admin-health-list">
                    <div><Clock3 size={15} /><span>Pending</span><strong>{totalPending}</strong></div>
                    <div><CheckCircle2 size={15} /><span>Approved</span><strong>{totalApproved}</strong></div>
                    <div><XCircle size={15} /><span>Rejected</span><strong>{totalRejected}</strong></div>
                  </div>
                </div>
              </section>

              <section className="admin-applications-section">
                <div className="admin-section-header">
                  <div><span className="admin-eyebrow">APPLICATIONS</span><h2>Verification Queue</h2></div>
                  <div className="admin-tabs">
                    <button className={activeTab === "farmer" ? "active" : ""} onClick={() => setActiveTab("farmer")}><Users size={15} /> Farmers <span>{farmerCounts.pending}</span></button>
                    <button className={activeTab === "fpo" ? "active" : ""} onClick={() => setActiveTab("fpo")}><Building2 size={15} /> FPO <span>{fpoCounts.pending}</span></button>
                    <button className={activeTab === "delivery" ? "active" : ""} onClick={() => setActiveTab("delivery")}><Truck size={15} /> Delivery <span>{deliveryCounts.pending}</span></button>
                  </div>
                </div>
                {renderVerification(activeTab)}
              </section>

              <section className="admin-summary-grid">
                <Summary label="FPO Pending" value={fpoCounts.pending} icon={Clock3} />
                <Summary label="FPO Approved" value={fpoCounts.approved} icon={CheckCircle2} />
                <Summary label="FPO Rejected" value={fpoCounts.rejected} icon={XCircle} />
                <Summary label="Farmer Pending" value={farmerCounts.pending} icon={FileCheck2} />
                <Summary label="Farmer Approved" value={farmerCounts.approved} icon={CheckCircle2} />
                <Summary label="Farmer Rejected" value={farmerCounts.rejected} icon={XCircle} />
                <Summary label="Delivery Pending" value={deliveryCounts.pending} icon={Truck} />
                <Summary label="Delivery Approved" value={deliveryCounts.approved} icon={CheckCircle2} />
                <Summary label="Delivery Rejected" value={deliveryCounts.rejected} icon={XCircle} />
              </section>
            </>
          )}

          {activeSection === "farmers" && (
            <ManagementVerification type="farmer" activeTab={activeTab} setActiveTab={setActiveTab} renderVerification={renderVerification} total={farmerCounts.total} pending={farmerCounts.pending} />
          )}

          {activeSection === "fpos" && (
            <ManagementVerification type="fpo" activeTab={activeTab} setActiveTab={setActiveTab} renderVerification={renderVerification} total={fpoCounts.total} pending={fpoCounts.pending} />
          )}

          {activeSection === "delivery-partners" && (
            <ManagementVerification type="delivery" activeTab={activeTab} setActiveTab={setActiveTab} renderVerification={renderVerification} total={deliveryCounts.total} pending={deliveryCounts.pending} />
          )}

          {activeSection === "consumers" && (
            <DataTable title="Consumer Directory" subtitle="Consumer accounts and platform activity" icon={UserRound}
              columns={["ID", "Name", "Location", "Orders", "Status"]} rows={filterRows(mockData.consumers)} />
          )}

          {activeSection === "products" && (
            <DataTable title="Produce Catalogue" subtitle="Products currently visible on the marketplace" icon={Package}
              columns={["ID", "Produce", "Seller", "Category", "Stock", "Price", "Status"]} rows={filterRows(mockData.products)} />
          )}

          {activeSection === "orders" && (
            <DataTable title="Order Management" subtitle="Recent marketplace orders" icon={ShoppingCart}
              columns={["Order ID", "Customer", "Items", "Amount", "Status", "Date"]} rows={filterRows(mockData.orders)} />
          )}

          {activeSection === "deliveries" && (
            <DataTable title="Delivery Operations" subtitle="Assigned delivery jobs and routes" icon={MapPinned}
              columns={["Delivery ID", "Agent", "Order", "Route", "Status"]} rows={filterRows(mockData.deliveries)} />
          )}

          {activeSection === "payments" && (
            <DataTable title="Payment Monitoring" subtitle="Payment activity across recent orders" icon={CreditCard}
              columns={["Payment ID", "Order", "Customer", "Amount", "Method", "Status"]} rows={filterRows(mockData.payments)} />
          )}

          {activeSection === "complaints" && (
            <DataTable title="Complaints & Disputes" subtitle="Issues requiring administrative attention" icon={MessageSquareWarning}
              columns={["Complaint", "Subject", "User", "Priority", "Status"]} rows={filterRows(mockData.complaints)} />
          )}

          {activeSection === "notifications" && (
            <section className="admin-applications-section">
              <div className="admin-section-header"><div><span className="admin-eyebrow">SYSTEM</span><h2>Recent Notifications</h2></div><Bell size={20} /></div>
              <div className="admin-notification-list">
                {[
                  ["New farmer application", "A farmer application is waiting for verification.", "Verification · 12 min ago"],
                  ["Delivery update", "Order ORD-503 is out for delivery.", "Delivery · 28 min ago"],
                  ["Complaint raised", "A new product quality complaint needs review.", "Complaint · 1 hr ago"],
                ].map(([title, detail, meta]) => (
                  <div className="admin-notification-card" key={title}>
                    <div className="admin-notification-icon"><Bell size={18} /></div>
                    <div><strong>{title}</strong><p>{detail}</p><span>{meta}</span></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === "reports" && (
            <>
              <section className="admin-stats-grid admin-report-stats">
                <Stat icon={TrendingUp} cls="approved" label="Approval Rate" value={`${approvalRate}%`} note="Across applications" />
                <Stat icon={Clock3} cls="pending" label="Pending Reviews" value={totalPending} note="Need action" />
                <Stat icon={Users} cls="farmer" label="Farmers" value={farmerCounts.total} note="Applications" />
                <Stat icon={Building2} cls="fpo" label="FPOs" value={fpoCounts.total} note="Applications" />
              </section>
              <section className="admin-dashboard-panels">
                <ReportCard title="Verification Report" icon={BarChart3}
                  rows={[
                    ["Farmers", farmerCounts.total, `${farmerCounts.approved} approved`],
                    ["FPOs", fpoCounts.total, `${fpoCounts.approved} approved`],
                    ["Delivery Partners", deliveryCounts.total, `${deliveryCounts.approved} approved`],
                  ]} />
                <ReportCard title="Marketplace Snapshot" icon={CircleDollarSign}
                  rows={[
                    ["Sample Products", mockData.products.length, "Catalogue view"],
                    ["Sample Orders", mockData.orders.length, "Recent orders"],
                    ["Sample Payments", mockData.payments.length, "Recent payments"],
                  ]} />
              </section>
            </>
          )}

          {activeSection === "settings" && (
            <section className="admin-applications-section">
              <div className="admin-section-header"><div><span className="admin-eyebrow">ADMINISTRATION</span><h2>Settings</h2></div><Settings size={20} /></div>
              <div className="admin-settings-grid">
                <Setting title="Admin Security" text="Protected administrator access is enabled." status="Enabled" />
                <Setting title="Application Verification" text="Farmer, FPO and delivery applications use the existing review workflow." status="Active" />
                <Setting title="Realtime Monitoring" text="Existing Firebase application listeners remain active." status="Connected" />
                <Setting title="Mock Management Sections" text="Sample values shown in unavailable sections are UI-only and are not written to Firebase." status="UI Only" />
              </div>
            </section>
          )}

          <footer className="admin-dashboard-footer">
            <span>AgriConnect Administration</span>
            <span>Platform management & monitoring system</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, cls, label, value, note }) {
  return <div className="admin-stat-card"><div className={`admin-stat-icon ${cls}`}><Icon size={21} /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>;
}

function Summary({ icon: Icon, label, value }) {
  return <div className="admin-summary-card"><div className="admin-summary-icon"><Icon size={19} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function PanelHeading({ icon: Icon, eyebrow, title }) {
  return <div className="admin-panel-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div><Icon size={19} /></div>;
}

function ManagementVerification({ type, activeTab, setActiveTab, renderVerification, total, pending }) {
  const allKey = `${type}-all`;
  return (
    <section className="admin-applications-section">
      <div className="admin-section-header">
        <div><span className="admin-eyebrow">{type === "fpo" ? "FPO MANAGEMENT" : type.toUpperCase()}</span><h2>{type === "delivery" ? "Delivery Partner Applications" : `${type === "fpo" ? "FPO" : "Farmer"} Applications`}</h2></div>
        <div className="admin-section-count">{total} Total · {pending} Pending</div>
      </div>
      <div className="admin-filter-pills">
        <button className={activeTab === type ? "active" : ""} onClick={() => setActiveTab(type)}>Pending</button>
        <button className={activeTab === allKey ? "active" : ""} onClick={() => setActiveTab(allKey)}>All Applications</button>
      </div>
      {renderVerification(type, activeTab === allKey)}
    </section>
  );
}

function DataTable({ title, subtitle, icon: Icon, columns, rows }) {
  return (
    <section className="admin-applications-section admin-table-section">
      <div className="admin-section-header"><div><span className="admin-eyebrow">MANAGEMENT</span><h2>{title}</h2><p className="admin-section-subtitle">{subtitle}</p></div><Icon size={21} /></div>
      <div className="admin-table-wrap">
        <table className="admin-data-table">
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{j === row.length - 1 ? <span className={`admin-table-status ${String(cell).toLowerCase().replace(/\s+/g, "-")}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function ReportCard({ title, icon: Icon, rows }) {
  return <div className="admin-panel-card admin-report-card"><PanelHeading icon={Icon} eyebrow="REPORTS" title={title} />{rows.map(([label, value, note]) => <div className="admin-report-row" key={label}><span>{label}</span><strong>{value}</strong><em>{note}</em></div>)}</div>;
}

function Setting({ title, text, status }) {
  return <div className="admin-setting-card"><div><strong>{title}</strong><p>{text}</p></div><span className="admin-setting-status">{status}</span></div>;
}

export default AdminDashboard;
