// hooks/useBlockNavigation.js
"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const useBlockNavigation = (shouldBlock, allowedRoutes = []) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAttemptingNavigation, setIsAttemptingNavigation] = useState(false);
  const [nextRoute, setNextRoute] = useState(null);
  const originalPushRef = useRef(router.push);
  const lastLocationRef = useRef(null);

  const canNavigate = (url) => {
    try {
      const { pathname } = new URL(url, window.location.origin);
      return allowedRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );
    } catch (e) {
      // Handle relative URLs
      return allowedRoutes.some(
        (route) => url === route || url.startsWith(route + "/")
      );
    }
  };

  useEffect(() => {
    const handleNavigation = (url) => {
      if (!shouldBlock || canNavigate(url) || url === pathname) {
        originalPushRef.current(url);
        return;
      }
      setIsAttemptingNavigation(true);
      setNextRoute(url);
    };

    // Store the original push function
    originalPushRef.current = router.push;

    // Override the router's push method
    router.push = (url, options) => {
      handleNavigation(url);
    };

    return () => {
      // Restore the original push function on unmount
      if (originalPushRef.current) {
        router.push = originalPushRef.current;
      }
    };
  }, [shouldBlock, pathname, allowedRoutes]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (shouldBlock) {
        event.preventDefault();
        event.returnValue =
          "Are you sure you want to leave? You have unsaved changes.";
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
        history.pushState(null, "", window.location.href);

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
    history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [shouldBlock, pathname]);

  const proceedNavigation = () => {
    if (nextRoute) {
      setIsAttemptingNavigation(false);
      originalPushRef.current(nextRoute);
      setNextRoute(null);
    }
  };

  const cancelNavigation = () => {
    setIsAttemptingNavigation(false);
    setNextRoute(null);

    // Re-insert current URL into history so that "Back" still lands on checkout
    history.pushState(null, "", window.location.href);
  };

  return { isAttemptingNavigation, proceedNavigation, cancelNavigation };
};

export default useBlockNavigation;
