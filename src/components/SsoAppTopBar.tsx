import { useMsal } from "@azure/msal-react";
import { AppTopBar } from "./AppTopBar";

interface SsoAppTopBarProps {
  username: string;
  onAdmin: () => void;
  onLogout: () => void;
}

export function SsoAppTopBar({ username, onAdmin, onLogout }: SsoAppTopBarProps) {
  const { instance, accounts } = useMsal();

  function handleLogout() {
    const account = instance.getActiveAccount() ?? accounts[0];
    if (account) {
      void instance.logoutRedirect({ account });
      return;
    }

    onLogout();
  }

  return (
    <AppTopBar username={username} onAdmin={onAdmin} onLogout={handleLogout} />
  );
}
