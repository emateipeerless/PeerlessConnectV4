import { useCallback, useEffect, useState } from "react";
import {
  completeOnboarding,
  createSsoUser,
  createStandardUser,
  fetchUserView,
  login,
} from "./api/client";
import { SsoBackendLogin } from "./auth/SsoBackendLogin";
import { isSsoConfigured } from "./config/sso";
import { AppTopBar } from "./components/AppTopBar";
import { SsoAppTopBar } from "./components/SsoAppTopBar";
import { CreateUserPage } from "./components/admin/CreateUserPage";
import { CreatorLoginPage } from "./components/admin/CreatorLoginPage";
import { DeviceView } from "./components/DeviceView";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { LoginForm } from "./components/LoginForm";
import { OnboardingPage } from "./components/OnboardingPage";
import { SidebarTree } from "./components/SidebarTree";
import { useTheme } from "./theme/ThemeContext";
import type { ProvisionUserType, UserViewResponse } from "./types";

type AdminScreen = "login" | "create";

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewData, setViewData] = useState<UserViewResponse | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminScreen, setAdminScreen] = useState<AdminScreen>("login");
  const [creatorEmail, setCreatorEmail] = useState<string | null>(null);
  const [creatorViewData, setCreatorViewData] = useState<UserViewResponse | null>(null);
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminSubmitLoading, setAdminSubmitLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  const isMainApp = Boolean(username && !needsOnboarding);
  const { setCustomizationEnabled } = useTheme();

  const handleSsoSuccess = useCallback((email: string) => {
    setUsername(email);
    setNeedsOnboarding(false);
    setLoginError(null);
  }, []);

  const handleSsoError = useCallback((message: string) => {
    setLoginError(message || null);
  }, []);

  const handleSsoLoadingChange = useCallback((loading: boolean) => {
    setSsoLoading(loading);
  }, []);

  useEffect(() => {
    setCustomizationEnabled(isMainApp);
  }, [isMainApp, setCustomizationEnabled]);

  useEffect(() => {
    if (!username || needsOnboarding) {
      return;
    }

    let cancelled = false;
    const activeUsername = username;

    async function loadView() {
      setViewLoading(true);
      setViewError(null);
      setViewData(null);
      setSelectedDeviceId(null);
      setSelectedDeviceName(null);

      try {
        const view = await fetchUserView(activeUsername);
        if (!cancelled) {
          setViewData(view);
        }
      } catch (err) {
        if (!cancelled) {
          setViewError(err instanceof Error ? err.message : "Failed to load folder structure");
        }
      } finally {
        if (!cancelled) {
          setViewLoading(false);
        }
      }
    }

    loadView();

    return () => {
      cancelled = true;
    };
  }, [username, needsOnboarding]);

  async function handleLogin(inputUsername: string, password: string) {
    setLoginLoading(true);
    setLoginError(null);

    try {
      const result = await login(inputUsername, password);
      const email = (result.email ?? inputUsername).trim().toLowerCase();
      setUsername(email);
      setNeedsOnboarding(Boolean(result.needsOnboarding));
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleOnboarding(payload: {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  }) {
    if (!username) return;

    setOnboardingLoading(true);
    setOnboardingError(null);

    try {
      await completeOnboarding({ email: username, ...payload });
      setNeedsOnboarding(false);
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setOnboardingLoading(false);
    }
  }

  function handleLogout() {
    setUsername(null);
    setNeedsOnboarding(false);
    setViewData(null);
    setLoginError(null);
    setOnboardingError(null);
    setViewError(null);
    setSelectedDeviceId(null);
    setSelectedDeviceName(null);
    closeAdminPanel();
  }

  function handleSelectDevice(deviceId: number, name: string) {
    setSelectedDeviceId(deviceId);
    setSelectedDeviceName(name);
  }

  function handleRetryView() {
    if (!username) return;

    setViewData(null);
    setViewError(null);
    setViewLoading(true);

    fetchUserView(username)
      .then((view) => {
        setViewData(view);
        setViewError(null);
      })
      .catch((err) => {
        setViewError(err instanceof Error ? err.message : "Failed to load folder structure");
      })
      .finally(() => {
        setViewLoading(false);
      });
  }

  function openAdminPanel() {
    setAdminOpen(true);
    setAdminScreen(creatorViewData ? "create" : "login");
    setAdminError(null);
    setAdminSuccess(null);
  }

  function closeAdminPanel() {
    setAdminOpen(false);
    setAdminScreen("login");
    setCreatorEmail(null);
    setCreatorViewData(null);
    setAdminError(null);
    setAdminSuccess(null);
    setAdminLoginLoading(false);
    setAdminSubmitLoading(false);
  }

  async function handleCreatorLogin(creatorUsername: string, password: string) {
    setAdminLoginLoading(true);
    setAdminError(null);

    try {
      await login(creatorUsername, password);
      const email = creatorUsername.trim().toLowerCase();
      const view = await fetchUserView(email);
      setCreatorEmail(email);
      setCreatorViewData(view);
      setAdminScreen("create");
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Admin sign in failed");
    } finally {
      setAdminLoginLoading(false);
    }
  }

  async function handleCreateUser(
    newUserEmail: string,
    folderNames: string[],
    userType: ProvisionUserType,
  ) {
    setAdminSubmitLoading(true);
    setAdminError(null);
    setAdminSuccess(null);

    try {
      const result =
        userType === "sso"
          ? await createSsoUser(newUserEmail, folderNames)
          : await createStandardUser(newUserEmail, folderNames);
      const folders = result.folderNames?.join(", ") ?? folderNames.join(", ");
      const emailNote =
        userType === "sso"
          ? `SSO user provisioned for ${result.email}. They can sign in with Microsoft Entra.`
          : result.emailSent === false
            ? `User created for ${result.email}, but email was not sent (SEND_EMAIL=false).`
            : `Invitation email sent to ${result.email}.`;
      setAdminSuccess(`${emailNote} Folders: ${folders}.`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAdminSubmitLoading(false);
    }
  }

  return (
    <>
      {isSsoConfigured() && (
        <SsoBackendLogin
          username={username}
          onSuccess={handleSsoSuccess}
          onError={handleSsoError}
          onLoadingChange={handleSsoLoadingChange}
        />
      )}

      {isMainApp && username && (
        isSsoConfigured() ? (
          <SsoAppTopBar username={username} onAdmin={openAdminPanel} onLogout={handleLogout} />
        ) : (
          <AppTopBar username={username} onAdmin={openAdminPanel} onLogout={handleLogout} />
        )
      )}

      {!username ? (
        <LoginForm
          loading={loginLoading}
          error={loginError}
          onLogin={handleLogin}
          ssoLoading={ssoLoading}
        />      ) : needsOnboarding ? (
        <OnboardingPage
          email={username}
          submitting={onboardingLoading}
          error={onboardingError}
          onSubmit={handleOnboarding}
        />
      ) : (
        <div className="app-shell">
          <div className="app-body">
            <aside className="sidebar">
              <div className="sidebar-header">
                <h2>Devices</h2>
              </div>

              {viewLoading && <LoadingSpinner label="Loading your folders..." />}

              {viewError && !viewLoading && (
                <div className="sidebar-error">
                  <p className="error-banner">{viewError}</p>
                  <button type="button" className="retry-button" onClick={handleRetryView}>
                    Retry
                  </button>
                </div>
              )}

              {viewData && !viewLoading && (
                <SidebarTree
                  tree={viewData.tree}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={handleSelectDevice}
                />
              )}
            </aside>

            <main className="content-panel">
              {viewLoading ? (
                <section className="device-panel empty loading-panel">
                  <LoadingSpinner label="Loading your view..." size="lg" />
                </section>
              ) : selectedDeviceId && selectedDeviceName ? (
                <DeviceView deviceId={selectedDeviceId} deviceName={selectedDeviceName} />
              ) : (
                <section className="device-panel empty">
                  <h2>No device selected</h2>
                  <p>
                    {viewData
                      ? "Expand folders in the sidebar and click a device to open its dashboard."
                      : "Your folder structure will appear in the sidebar once loading completes."}
                  </p>
                </section>
              )}
            </main>
          </div>

          {adminOpen && (
            <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="Admin panel">
              {adminScreen === "login" || !creatorViewData || !creatorEmail ? (
                <CreatorLoginPage
                  loading={adminLoginLoading}
                  error={adminError}
                  onLogin={handleCreatorLogin}
                  onClose={closeAdminPanel}
                />
              ) : (
                <CreateUserPage
                  creatorEmail={creatorEmail}
                  tree={creatorViewData.tree}
                  viewId={creatorViewData.viewId}
                  submitting={adminSubmitLoading}
                  error={adminError}
                  success={adminSuccess}
                  onSubmit={handleCreateUser}
                  onClose={closeAdminPanel}
                />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
