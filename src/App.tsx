import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

import { CartProvider } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { SeoProvider } from "./context/SeoContext";
import AnalyticsScripts from "./components/seo/AnalyticsScripts";
import { ThemeProvider } from "./context/ThemeContext";
import AppRoutes from "./AppRoutes";
import NoInternet from "./pages/NoInternet";
import ScrollToTop from "./components/ScrollToTop";
import { WishlistProvider } from "./context/WishlistContext";
import { UserNotificationProvider } from "./context/UserNotificationContext";
import Loader from "./components/Loader";

import { GLOBAL_COLORS } from "./utils/colors";

import { Toaster } from "react-hot-toast";
import ToastDeduplicator from "./components/ToastDeduplicator";

// Single QueryClient instance — created outside the component to avoid re-creation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Inject global colors as custom properties to easy handle color styling globally
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-start", GLOBAL_COLORS.sidebarStart);
    root.style.setProperty("--sidebar-end", GLOBAL_COLORS.sidebarEnd);
    root.style.setProperty("--primary-color", GLOBAL_COLORS.primary);
    root.style.setProperty("--primary-hover", GLOBAL_COLORS.primaryHover);
    root.style.setProperty("--primary-light", GLOBAL_COLORS.primaryLight);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <BrandingProvider>
      <SeoProvider>
      <AnalyticsScripts />
      <ThemeProvider>
      <CartProvider>
        <WishlistProvider isAuthenticated={user.isAuthenticated}>
          <UserNotificationProvider>
            <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={10}
                containerStyle={{
                  top: 24,
                  right: 20,
                  left: 20,
                  zIndex: 99999,
                }}
                toastOptions={{
                  duration: 3500,
                  style: {
                    background: "#FAF8F2",
                    color: "#172B2A",
                    border: "1px solid #E6DFD5",
                    borderRadius: "16px",
                    padding: "12px 18px",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    fontFamily: "'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    boxShadow: "0 10px 30px -4px rgba(23, 43, 42, 0.14), 0 4px 12px -2px rgba(23, 43, 42, 0.06)",
                    letterSpacing: "-0.01em",
                    maxWidth: "420px",
                  },
                  success: {
                    duration: 3200,
                    iconTheme: {
                      primary: "#0B6B6B",
                      secondary: "#FAF8F2",
                    },
                    style: {
                      background: "#FAF8F2",
                      border: "1px solid #CBE2DC",
                      color: "#172B2A",
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: "#C53030",
                      secondary: "#FAF8F2",
                    },
                    style: {
                      background: "#FAF8F2",
                      border: "1px solid #F5D0CD",
                      color: "#172B2A",
                    },
                  },
                  loading: {
                    iconTheme: {
                      primary: "#0B6B6B",
                      secondary: "#DDEDEA",
                    },
                    style: {
                      background: "#FAF8F2",
                      border: "1px solid #E6DFD5",
                      color: "#172B2A",
                    },
                  },
                }}
              />
              <ToastDeduplicator />
              {isOnline ? (
                user.isInitialLoad ? (
                  <Loader message="Panakkal Ayurveda Pharmacy" fullScreen={true} />
                ) : (
                  <AppRoutes />
                )
              ) : (
                <NoInternet />
              )}
          </UserNotificationProvider>
        </WishlistProvider>
      </CartProvider>
      </ThemeProvider>
      </SeoProvider>
    </BrandingProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ScrollToTop />
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
