import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// =========================================
// SPLASH / MAIN FLOW
// =========================================

import Splash from "./pages/Splash/Splash";
import LanguageSelection from "./pages/LanguageSelection/LanguageSelection";
import RoleSelection from "./pages/RoleSelection/RoleSelection";
import FarmerType from "./pages/FarmerType/FarmerType";

// =========================================
// FARMER
// =========================================

import IndividualFarmerLogin from "./pages/Farmer/IndividualFarmerLogin";
import IndividualFarmerDetails from "./pages/Farmer/IndividualFarmerDetails";
import IndividualFarmerDashboard from "./pages/Farmer/IndividualFarmerDashboard";

import FpoLogin from "./pages/Farmer/FpoLogin";
import FpoOrganisationDetails from "./pages/Farmer/FpoOrganisationDetails";
import FpoMemberFarmers from "./pages/Farmer/FpoMemberFarmers";
import FpoDocuments from "./pages/Farmer/FpoDocuments";
import FpoReview from "./pages/Farmer/FpoReview";
import FpoWaitingForApproval from "./pages/Farmer/FpoWaitingForApproval";
import FpoDashboard from "./pages/Farmer/FpoDashboard";

// =========================================
// CONSUMER
// =========================================

import ConsumerLogin from "./pages/Consumer/ConsumerLogin";
import ConsumerDetails from "./pages/Consumer/ConsumerDetails";
import ConsumerDashboard from "./pages/Consumer/ConsumerDashboard";

// NEW: Consumer Order Tracking
import ConsumerOrderTracking from "./pages/Consumer/ConsumerOrderTracking";

// =========================================
// DELIVERY PARTNER
// =========================================

import DeliveryLogin from "./pages/Delivery/DeliveryLogin";
import DeliveryPartnerDetails from "./pages/Delivery/DeliveryPartnerDetails";
import DeliveryVehicleDetails from "./pages/Delivery/DeliveryVehicleDetails";
import DeliveryDocuments from "./pages/Delivery/DeliveryDocuments";
import DeliveryReview from "./pages/Delivery/DeliveryReview";
import DeliveryWaitingForApproval from "./pages/Delivery/DeliveryWaitingForApproval";
import DeliveryDashboard from "./pages/Delivery/DeliveryDashboard";

// =========================================
// ADMIN
// =========================================

import AdminLogin from "./pages/Admin/AdminLogin";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminFarmerReview from "./pages/Admin/AdminFarmerReview";
import AdminFpoReview from "./pages/Admin/AdminFpoReview";
import AdminDeliveryReview from "./pages/Admin/AdminDeliveryReview";

// =========================================
// COMMON
// =========================================

import WaitingForApproval from "./pages/Common/WaitingForApproval";

function App() {
  return (
<BrowserRouter basename={import.meta.env.BASE_URL}>      <Routes>

        {/* =====================================
            MAIN AGRICONNECT FLOW
        ====================================== */}

        {/* Main Splash */}
        <Route
          path="/"
          element={<Splash />}
        />

        {/* Language Selection */}
        <Route
          path="/language"
          element={<LanguageSelection />}
        />

        {/* Role Selection */}
        <Route
          path="/roles"
          element={<RoleSelection />}
        />

        {/* Farmer Type */}
        <Route
          path="/farmer-type"
          element={<FarmerType />}
        />


        {/* =====================================
            INDIVIDUAL FARMER
        ====================================== */}

        {/* Individual Farmer Login */}
        <Route
          path="/login/farmer/individual"
          element={<IndividualFarmerLogin />}
        />

        {/* Individual Farmer Details */}
        <Route
          path="/farmer/details"
          element={<IndividualFarmerDetails />}
        />

        {/* Individual Farmer Dashboard */}
        <Route
          path="/farmer/dashboard"
          element={<IndividualFarmerDashboard />}
        />


        {/* =====================================
            FPO
        ====================================== */}

        {/* FPO Login */}
        <Route
          path="/login/farmer/fpo"
          element={<FpoLogin />}
        />

        {/* FPO Organisation Details */}
        <Route
          path="/fpo/organisation-details"
          element={<FpoOrganisationDetails />}
        />

        {/* FPO Member Farmers */}
        <Route
          path="/fpo/member-farmers"
          element={<FpoMemberFarmers />}
        />

        {/* FPO Documents */}
        <Route
          path="/fpo/documents"
          element={<FpoDocuments />}
        />

        {/* FPO Review & Submit */}
        <Route
          path="/fpo/review"
          element={<FpoReview />}
        />

        {/* FPO Waiting for Approval */}
        <Route
          path="/fpo/waiting-approval"
          element={<FpoWaitingForApproval />}
        />

        {/* FPO Dashboard */}
        <Route
          path="/fpo/dashboard"
          element={<FpoDashboard />}
        />


        {/* =====================================
            CONSUMER
        ====================================== */}

        {/* Consumer Login */}
        <Route
          path="/login/consumer"
          element={<ConsumerLogin />}
        />

        {/* Consumer Details - New Users */}
        <Route
          path="/consumer/details"
          element={<ConsumerDetails />}
        />

        {/* Consumer Dashboard */}
        <Route
          path="/consumer/dashboard"
          element={<ConsumerDashboard />}
        />

        {/* Consumer Order Tracking */}
        <Route
          path="/consumer/orders"
          element={<ConsumerOrderTracking />}
        />


        {/* =====================================
            DELIVERY PARTNER
        ====================================== */}

        {/* Delivery Partner Login */}
        <Route
          path="/login/delivery"
          element={<DeliveryLogin />}
        />

        {/* Delivery Partner Personal Details */}
        <Route
          path="/delivery/partner-details"
          element={<DeliveryPartnerDetails />}
        />

        {/* Delivery Partner Vehicle Details */}
        <Route
          path="/delivery/vehicle-details"
          element={<DeliveryVehicleDetails />}
        />

        {/* Delivery Partner Documents */}
        <Route
          path="/delivery/documents"
          element={<DeliveryDocuments />}
        />

        {/* Delivery Partner Review & Submit */}
        <Route
          path="/delivery/review"
          element={<DeliveryReview />}
        />

        {/* Delivery Partner Waiting for Approval */}
        <Route
          path="/delivery/waiting-approval"
          element={<DeliveryWaitingForApproval />}
        />

        {/* Delivery Partner Dashboard */}
        <Route
          path="/delivery/dashboard"
          element={<DeliveryDashboard />}
        />


        {/* =====================================
            INDIVIDUAL FARMER WAITING
        ====================================== */}

        <Route
          path="/waiting-approval"
          element={<WaitingForApproval />}
        />


        {/* =====================================
            ADMIN FLOW
        ====================================== */}

        {/* Admin Entry → Same AgriConnect Splash */}
        <Route
          path="/admin-entry"
          element={
            <Splash nextPath="/admin" />
          }
        />

        {/* Admin Login */}
        <Route
          path="/admin"
          element={<AdminLogin />}
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        {/* Individual Farmer Application Review */}
        <Route
          path="/admin/farmer/:applicationId"
          element={<AdminFarmerReview />}
        />

        {/* FPO Application Review */}
        <Route
          path="/admin/fpo/:applicationId"
          element={<AdminFpoReview />}
        />

        {/* Delivery Partner Application Review */}
        <Route
          path="/admin/delivery/:applicationId"
          element={<AdminDeliveryReview />}
        />


        {/* =====================================
            FALLBACK
        ====================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;