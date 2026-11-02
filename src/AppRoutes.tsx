import React, { lazy, Suspense } from "react";
import {
  Routes,
  Route,
  useLocation,
  Outlet,
  Navigate,
} from "react-router-dom";
import { useEffect, useRef } from "react";

/* ==================== CONTEXT HOOKS ==================== */
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";
import PageSeo from "./components/seo/PageSeo";

/* ==================== GLOBAL COMPONENTS ==================== */
// Kept eager: needed immediately for every customer route, and small.
import Navbar from "./components/Navbar";
import Loader from "./components/Loader";

/* ==================== AUTH ==================== */
// Kept eager: tiny, and Login is the very first thing an unauthenticated visit needs.
import Login from "./login/Login";
import ProtectedRoute from "./login/ProtectedRoute";
import RequireStaffPermission from "./login/RequireStaffPermission";

/* ==================== NOTIFICATIONS ==================== */
// Kept eager: providers, not pages — needed to wrap the route tree itself.
import { NotificationProvider } from "./context/NotificationContext";
import { UserNotificationProvider } from "./context/UserNotificationContext";
import { StaffPermissionProvider } from "./context/StaffPermissionContext";

/* ==================== LAZY-LOADED ROUTE PAGES ====================
 * Every actual page is loaded on demand instead of bundled into the initial
 * download — a customer opening the storefront no longer pays for the admin,
 * super-admin, and staff dashboards' combined JS (previously all ~40 page
 * components here were eager imports, so visiting "/" downloaded the entire
 * app up front). React.lazy + the <Suspense> below split each into its own
 * chunk, fetched only when its route is actually visited. */

/* ── Dashboards ── */
const Admindashboard = lazy(() => import("./dashboard/Admindashboard"));
const SuperAdminDashboard = lazy(() => import("./dashboard/SuperAdminDashboard"));
const Customerdashboard = lazy(() => import("./dashboard/Customerdashboard"));
const StaffDashboard = lazy(() => import("./dashboard/StaffDashboard"));

/* ── Admin ── */
const UserManagementPage = lazy(() => import("./users/UserManagementPage"));
const CustomerManagementPage = lazy(() => import("./users/CustomerManagementPage"));

const Listcategory = lazy(() => import("./categories/Listcategory"));
const CategoryAttributes = lazy(() => import("./categories/CategoryAttributes"));
const LegacyCatalogRedirect = lazy(() => import("./catalog/LegacyCatalogRedirect"));

const AdminOrderManagement = lazy(() => import("./dashboard/AdminOrderManagement"));
const AdminProfile = lazy(() => import("./dashboard/AdminProfile"));
const CouponManagement = lazy(() => import("./dashboard/CouponManagement"));
const NotificationManagement = lazy(() => import("./dashboard/NotificationManagement"));
const ReportsAnalytics = lazy(() => import("./dashboard/ReportsAnalytics"));
const StaffManagement = lazy(() => import("./dashboard/StaffManagement"));
const StaffProfile = lazy(() => import("./dashboard/StaffProfile"));
const StaffDashboardHome = lazy(() => import("./dashboard/StaffDashboardHome"));
const AuditLog = lazy(() => import("./dashboard/AuditLog"));
const WarehouseSettings = lazy(() => import("./dashboard/WarehouseSettings"));
const StaticPagesManager = lazy(() => import("./dashboard/StaticPagesManager"));
const CustomerTransactions = lazy(() => import("./dashboard/CustomerTransactions"));
const CustomerActivityTracker = lazy(() => import("./dashboard/CustomerActivityTracker"));
const PaymentTransactionLogs = lazy(() => import("./dashboard/PaymentTransactionLogs"));
const AdminOrderPage = lazy(() => import("./dashboard/AdminOrderPage"));
const SuperAdminMonitoring = lazy(() => import("./dashboard/SuperAdminMonitoring"));
const AdminProductStockManagement = lazy(() => import("./dashboard/AdminProductStockManagement"));

/* ── Customer ── */
const ProductDetailPage = lazy(() => import("./cart/ProductDetailPage"));

const Cartpage = lazy(() => import("./cart/Cartpage"));
const CheckoutPage = lazy(() => import("./cart/CheckoutPage"));

const MyOrdersPage = lazy(() => import("./orders/MyOrdersPage"));
const WhishlistPage = lazy(() => import("./pages/WishlistPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));

const AboutPage = lazy(() => import("./pages/static/AboutPage"));
const TermsPage = lazy(() => import("./pages/static/TermsPage"));
const HelpPage = lazy(() => import("./pages/static/HelpPage"));
const ContactPage = lazy(() => import("./pages/static/ContactPage"));
const ShippingPolicyPage = lazy(() => import("./pages/static/ShippingPolicyPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/static/PrivacyPolicyPage"));

/* ── Misc ── */
const Home = lazy(() => import("./home/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* Shown while a lazy route chunk is downloading */
const RouteFallback = () => (
  <Loader message="Loading page..." fullScreen={true} />
);

/* ======================================================= */
/* ==================== CUSTOMER LAYOUT ================== */
/* ======================================================= */

const CustomerLayout = () => {
  const { logout, user } = useAuth();
  const { cartItems } = useCart();
  const { pathname } = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent global window scrollbar by locking body/html scroll
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  }, [pathname]);

  // If still in initial load on a slow connection, do not render customer navbar until auth resolves
  if (user.isInitialLoad) {
    return null;
  }

  // Privileged roles (Admin, Super Admin, Staff) must never see the customer-facing layout when authenticated.
  // CRITICAL: ONLY redirect if user is actively authenticated. Unauthenticated visitors/customers opening
  // shared links must ALWAYS see the customer storefront layout, never get bounced to /admin-dashboard or /login.
  if (user.isAuthenticated && user.role) {
    const role = user.role.toUpperCase();
    if (role === "SUPER_ADMIN") return <Navigate to="/super-admin-dashboard" replace />;
    if (role === "ADMIN") return <Navigate to="/admin-dashboard" replace />;
    if (role === "STAFF") return <Navigate to="/staff-dashboard" replace />;
  }

  return (
    <UserNotificationProvider>
      <Navbar
        user={user}
        role={user.role}
        cartItemCount={cartItems.length}
        handleLogout={logout}
      />

      {/* Locked inside-scroll wrapper container under the fixed Navbar */}
      <div ref={scrollContainerRef} className="h-screen overflow-y-auto overflow-x-hidden w-full max-w-full select-text scrollbar-thin bg-[#FAF8F2]">
        <Suspense
          fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F2]">
              <Loader fullScreen={false} message="Loading content..." />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </UserNotificationProvider>
  );
};

/**
 * Redirects already-authenticated privileged users away from the login page.
 * Prevents admins from pressing back and landing on /login.
 */
const LoginGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user.isInitialLoad) return null;

  if (user.isAuthenticated && user.role) {
    const role = user.role.toUpperCase();
    if (role === "SUPER_ADMIN") return <Navigate to="/super-admin-dashboard" replace />;
    if (role === "ADMIN") return <Navigate to="/admin-dashboard" replace />;
    if (role === "STAFF") return <Navigate to="/staff-dashboard" replace />;
  }
  return <>{children}</>;
};

/* ======================================================= */
/* ==================== MAIN ROUTES ====================== */
/* ======================================================= */

const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* ===================== ADMIN ROUTES (ADMIN & SUPER_ADMIN) ===================== */}
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute
            requiredRoles={["ADMIN", "SUPER_ADMIN"]}
            unauthenticatedRedirectTo="/login"
          >
            <NotificationProvider>
              <StaffPermissionProvider>
                <Admindashboard />
              </StaffPermissionProvider>
            </NotificationProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        {/* Combined Admin/Staff + Customer Management */}
        <Route path="manage-user" element={<UserManagementPage />} />
        <Route path="manage-customers" element={<CustomerManagementPage />} />
        {/* Unified Catalog Management (Category + Product merge) */}
        <Route path="manage-catalog" element={<Listcategory />} />
        <Route path="manage-catalog/attributes/:categoryId" element={<CategoryAttributes />} />
        <Route path="products" element={<AdminProductStockManagement />} />
        {/* Legacy paths — kept working as redirects for existing bookmarks */}
        <Route path="manage-categories/add-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/list-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/attributes/:categoryId" element={<LegacyCatalogRedirect toSuffix="manage-catalog/attributes/:categoryId" />} />
        <Route path="manage-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/add-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/list-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="product-management" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="order-management" element={<AdminOrderManagement />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="coupon-management" element={<CouponManagement />} />
        <Route path="notifications" element={<NotificationManagement />} />
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="warehouse" element={<WarehouseSettings />} />
        <Route path="homepage" element={<Navigate to="/admin-dashboard" replace />} />
        <Route path="content-pages" element={<StaticPagesManager />} />
        <Route path="staff-management" element={<StaffManagement />} />
        <Route
          path="customer-transactions"
          element={<CustomerTransactions />}
        />
        <Route path="customer-activity" element={<CustomerActivityTracker />} />
        <Route path="payment-logs" element={<PaymentTransactionLogs />} />
        <Route path="place-order" element={<AdminOrderPage />} />
      </Route>

      {/* ===================== SUPER ADMIN ROUTES (SUPER_ADMIN role only) ===================== */}
      <Route
        path="/super-admin-dashboard"
        element={
          <ProtectedRoute
            requiredRoles={["SUPER_ADMIN"]}
            unauthenticatedRedirectTo="/login"
          >
            <NotificationProvider>
              <StaffPermissionProvider>
                <SuperAdminDashboard />
              </StaffPermissionProvider>
            </NotificationProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="manage-user" element={<UserManagementPage />} />
        <Route path="manage-customers" element={<CustomerManagementPage />} />
        {/* Unified Catalog Management (Category + Product merge) */}
        <Route path="manage-catalog" element={<Listcategory />} />
        <Route path="manage-catalog/attributes/:categoryId" element={<CategoryAttributes />} />
        <Route path="products" element={<AdminProductStockManagement />} />
        {/* Legacy paths — kept working as redirects for existing bookmarks */}
        <Route path="manage-categories/add-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/list-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/attributes/:categoryId" element={<LegacyCatalogRedirect toSuffix="manage-catalog/attributes/:categoryId" />} />
        <Route path="manage-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/add-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/list-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="product-management" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="order-management" element={<AdminOrderManagement />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="coupon-management" element={<CouponManagement />} />
        <Route path="notifications" element={<NotificationManagement />} />
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="warehouse" element={<WarehouseSettings />} />
        <Route path="homepage" element={<Navigate to="/super-admin-dashboard" replace />} />
        <Route path="content-pages" element={<StaticPagesManager />} />
        <Route
          path="customer-transactions"
          element={<CustomerTransactions />}
        />
        <Route path="customer-activity" element={<CustomerActivityTracker />} />
        <Route path="payment-logs" element={<PaymentTransactionLogs />} />
        <Route path="place-order" element={<AdminOrderPage />} />
        <Route path="monitoring" element={<SuperAdminMonitoring />} />
      </Route>

      {/* ===================== STAFF ROUTES ===================== */}
      <Route
        path="/staff-dashboard"
        element={
          <ProtectedRoute
            requiredRoles={["STAFF"]}
            unauthenticatedRedirectTo="/login"
          >
            <NotificationProvider>
              <StaffPermissionProvider>
                <StaffDashboard />
              </StaffPermissionProvider>
            </NotificationProvider>
          </ProtectedRoute>
        }
      >
        <Route path="profile" element={<StaffProfile />} />
        <Route index element={<StaffDashboardHome />} />
        {/* Permission requirements below mirror StaffDashboard.tsx's buildNav() —
            keep both in sync: buildNav decides which sidebar links a staff member
            sees, these guards decide what happens if they (or an old bookmark)
            reach the route directly without that permission. */}
        {/* Unified Catalog Management (Category + Product merge) */}
        <Route
          path="manage-catalog"
          element={
            <RequireStaffPermission
              anyOf={["CATEGORY_VIEW", "CATEGORY_ADD", "CATEGORY_EDIT", "CATEGORY_DELETE", "PRODUCT_VIEW", "PRODUCT_ADD", "PRODUCT_EDIT", "PRODUCT_DELETE"]}
            >
              <Listcategory />
            </RequireStaffPermission>
          }
        />
        <Route
          path="manage-catalog/attributes/:categoryId"
          element={
            <RequireStaffPermission
              anyOf={["CATEGORY_VIEW", "CATEGORY_ADD", "CATEGORY_EDIT", "CATEGORY_DELETE", "PRODUCT_VIEW", "PRODUCT_ADD", "PRODUCT_EDIT", "PRODUCT_DELETE"]}
            >
              <CategoryAttributes />
            </RequireStaffPermission>
          }
        />
        <Route
          path="products"
          element={
            <RequireStaffPermission
              anyOf={["PRODUCT_VIEW", "PRODUCT_ADD", "PRODUCT_EDIT", "PRODUCT_DELETE"]}
            >
              <AdminProductStockManagement />
            </RequireStaffPermission>
          }
        />
        {/* Legacy paths — kept working as redirects for existing bookmarks */}
        <Route path="manage-categories/add-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/list-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/attributes/:categoryId" element={<LegacyCatalogRedirect toSuffix="manage-catalog/attributes/:categoryId" />} />
        <Route path="manage-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/add-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/list-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="product-management" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route
          path="order-management"
          element={
            <RequireStaffPermission anyOf={["ORDER_VIEW", "ORDER_UPDATE"]}>
              <AdminOrderManagement />
            </RequireStaffPermission>
          }
        />
        <Route
          path="place-order"
          element={
            <RequireStaffPermission anyOf={["ORDER_CREATE"]}>
              <AdminOrderPage />
            </RequireStaffPermission>
          }
        />
        {/* Notifications has no dedicated permission — unconditionally in buildNav's Settings group */}
        <Route path="notifications" element={<NotificationManagement />} />
        <Route
          path="customer-transactions"
          element={
            <RequireStaffPermission anyOf={["ORDER_VIEW"]}>
              <CustomerTransactions />
            </RequireStaffPermission>
          }
        />
        <Route
          path="coupon-management"
          element={
            <RequireStaffPermission anyOf={["COUPON_VIEW", "COUPON_ADD", "COUPON_EDIT", "COUPON_DELETE"]}>
              <CouponManagement />
            </RequireStaffPermission>
          }
        />
        <Route
          path="reports"
          element={
            <RequireStaffPermission anyOf={["ANALYTICS_VIEW"]}>
              <ReportsAnalytics />
            </RequireStaffPermission>
          }
        />
        <Route
          path="warehouse"
          element={
            <RequireStaffPermission anyOf={["SETTINGS_VIEW", "SETTINGS_EDIT"]}>
              <WarehouseSettings />
            </RequireStaffPermission>
          }
        />
        <Route path="homepage" element={<Navigate to="/staff-dashboard" replace />} />
        <Route
          path="content-pages"
          element={
            <RequireStaffPermission anyOf={["BANNER_VIEW", "BANNER_ADD", "BANNER_EDIT", "BANNER_DELETE"]}>
              <StaticPagesManager />
            </RequireStaffPermission>
          }
        />
        <Route
          path="customer-activity"
          element={
            <RequireStaffPermission anyOf={["CUSTOMER_ACTIVITY_VIEW"]}>
              <CustomerActivityTracker />
            </RequireStaffPermission>
          }
        />
        <Route
          path="payment-logs"
          element={
            <RequireStaffPermission anyOf={["PAYMENT_VIEW"]}>
              <PaymentTransactionLogs />
            </RequireStaffPermission>
          }
        />
      </Route>

      {/* ===================== CUSTOMER ROUTES ===================== */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Customerdashboard />} />
        <Route path="/discounts" element={<Navigate to="/" replace />} />
        <Route path="/products" element={<Navigate to="/" replace />} />
        <Route path="/categories/:slug" element={<Navigate to="/" replace />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terms-and-conditions" element={<Navigate to="/terms" replace />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
        <Route path="/shipping-and-returns" element={<Navigate to="/shipping-policy" replace />} />
        <Route path="/shipping" element={<Navigate to="/shipping-policy" replace />} />
        <Route path="/returns" element={<Navigate to="/shipping-policy" replace />} />
        <Route path="/returns-policy" element={<Navigate to="/shipping-policy" replace />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />

        <Route
          path="/cart"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <Cartpage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/WishlistPage"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <WhishlistPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/wishlist"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <WhishlistPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/myorders"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transactions"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <TransactionHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/order-success"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <OrderSuccess />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ===================== INVOICE ROUTE (all authenticated roles) ===================== */}
      <Route
        path="/invoice/:orderId"
        element={
          <ProtectedRoute>
            <InvoicePage />
          </ProtectedRoute>
        }
      />

      {/* ===================== AUTH ROUTES ===================== */}
      {/* /signup replaced by CustomerAuthModal — redirect to home */}
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route
        path="/login"
        element={
          <LoginGuard>
            <Login />
          </LoginGuard>
        }
      />

      {/* ===================== FALLBACK ===================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
};

export default AppRoutes;
