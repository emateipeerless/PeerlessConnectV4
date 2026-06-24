import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useEffect, useRef } from "react";
import { ssoLogin } from "../api/client";
import { fetchMicrosoftProfile } from "./fetchMicrosoftProfile";

interface SsoBackendLoginProps {
  username: string | null;
  onSuccess: (email: string) => void;
  onError: (message: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

/**
 * After Entra redirect, MSAL marks the user authenticated in sessionStorage.
 * This component completes login against our /ssologin API (same pattern as SSOEXAMPLE
 * but with backend provisioning check).
 */
export function SsoBackendLogin({
  username,
  onSuccess,
  onError,
  onLoadingChange,
}: SsoBackendLoginProps) {
  const { instance, accounts } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const inFlight = useRef(false);

  useEffect(() => {
    if (username || !isMsalAuthenticated || accounts.length === 0 || inFlight.current) {
      return;
    }

    const account = accounts[0];
    let cancelled = false;
    inFlight.current = true;
    onLoadingChange(true);
    onError("");

    async function completeBackendLogin() {
      try {
        const profile = await fetchMicrosoftProfile(instance, account);
        const result = await ssoLogin({
          email: profile.email,
          userKey: profile.userKey,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
        });

        if (cancelled) {
          return;
        }

        const email = (result.email ?? profile.email).trim().toLowerCase();
        onSuccess(email);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Microsoft sign-in failed";
        onError(message);
        await instance.logoutRedirect({ account });
      } finally {
        inFlight.current = false;
        if (!cancelled) {
          onLoadingChange(false);
        }
      }
    }

    completeBackendLogin();

    return () => {
      cancelled = true;
    };
  }, [username, isMsalAuthenticated, accounts, instance, onSuccess, onError, onLoadingChange]);

  return null;
}
