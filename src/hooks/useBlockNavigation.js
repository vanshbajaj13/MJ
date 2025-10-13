// hooks/useBlockNavigation.js
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

const useBlockNavigation = (shouldBlock, allowedRoutes = []) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAttemptingNavigation, setIsAttemptingNavigation] = useState(false);
  const [nextRoute, setNextRoute] = useState(null);
  const originalPushRef = useRef(null);
  const lastLocationRef = useRef(null);

  // Fix: Use useCallback to prevent recreation and add proper URL validation
  const canNavigate = useCallback((url) => {
    // If no URL provided, allow navigation
    if (!url) return true;
    
    try {
      // Handle string URLs
      if (typeof url === 'string') {
        // Check if it's a relative URL
        if (url.startsWith('/')) {
          const routePath = url.split('?')[0]; // Remove query params for matching
          return allowedRoutes.some(route => 
            routePath === route || routePath.startsWith(route + '/')
          );
        }
        
        // Handle full URLs - use a simpler approach without URL constructor
        if (url.startsWith('http')) {
          const routePath = new URL(url).pathname;
          return allowedRoutes.some(route => 
            routePath === route || routePath.startsWith(route + '/')
          );
        }
      }
      
      // For other cases (objects, etc.), don't block
      return true;
    } catch (e) {
      console.error('Error checking navigation:', e);
      // If there's an error, allow navigation to prevent blocking
      return true;
    }
  }, [allowedRoutes]);

  useEffect(() => {
    // Store the original push function once
    if (!originalPushRef.current) {
      originalPushRef.current = router.push;
    }

    const handleNavigation = (url, options) => {
      // Skip blocking for allowed routes or if blocking is disabled
      if (!shouldBlock || canNavigate(url)) {
        originalPushRef.current(url, options);
        return;
      }
      
      // Don't block if navigating to the same path
      try {
        const targetPath = typeof url === 'string' ? url.split('?')[0] : '';
        if (targetPath === pathname) {
          originalPushRef.current(url, options);
          return;
        }
      } catch (e) {
        // If we can't parse the URL, allow navigation
        originalPushRef.current(url, options);
        return;
      }
      
      // Block the navigation and show confirmation
      setIsAttemptingNavigation(true);
      setNextRoute(url);
    };

    // Override the router's push method
    router.push = handleNavigation;

    return () => {
      // Restore the original push function on unmount
      if (originalPushRef.current) {
        router.push = originalPushRef.current;
      }
    };
  }, [shouldBlock, pathname, canNavigate, router]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (shouldBlock) {
        event.preventDefault();
        event.returnValue = "Are you sure you want to leave? You have unsaved changes.";
        return "Are you sure you want to leave? You have unsaved changes.";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlock]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (shouldBlock) {
        // Prevent the default back behavior
        window.history.pushState(null, "", window.location.href);

        // Show confirmation dialog
        setIsAttemptingNavigation(true);
        setNextRoute(lastLocationRef.current || "/");
      }
    };

    // Store current pathname as the last location
    lastLocationRef.current = pathname;

    // Add popstate listener
    window.addEventListener("popstate", handlePopState);

    // Push current state to history
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [shouldBlock, pathname]);

  const proceedNavigation = () => {
    if (nextRoute) {
      setIsAttemptingNavigation(false);
      if (originalPushRef.current) {
        originalPushRef.current(nextRoute);
      }
      setNextRoute(null);
    }
  };

  const cancelNavigation = () => {
    setIsAttemptingNavigation(false);
    setNextRoute(null);

    // Re-insert current URL into history so that "Back" still lands on checkout
    window.history.pushState(null, "", window.location.href);
  };

  return { isAttemptingNavigation, proceedNavigation, cancelNavigation };
};

export default useBlockNavigation;