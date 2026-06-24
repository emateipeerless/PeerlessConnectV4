import { FormEvent, useState } from "react";
import type { ProvisionUserType, TreeNode } from "../../types";
import { isSsoConfigured } from "../../config/sso";
import { FolderCheckboxTree } from "./FolderCheckboxTree";
import { LoadingSpinner } from "../LoadingSpinner";

interface CreateUserPageProps {
  creatorEmail: string;
  tree: TreeNode[];
  viewId: number;
  submitting: boolean;
  error: string | null;
  success: string | null;
  onSubmit: (newUserEmail: string, folderNames: string[], userType: ProvisionUserType) => void;
  onClose: () => void;
}

export function CreateUserPage({
  creatorEmail,
  tree,
  viewId,
  submitting,
  error,
  success,
  onSubmit,
  onClose,
}: CreateUserPageProps) {
  const [newUserEmail, setNewUserEmail] = useState("");
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [userType, setUserType] = useState<ProvisionUserType>("standard");
  const ssoAvailable = isSsoConfigured();

  function handleToggleFolder(name: string, checked: boolean) {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const email = newUserEmail.trim();
    if (!email || selectedFolders.size === 0) return;
    onSubmit(email, Array.from(selectedFolders), userType);
  }

  const isSso = userType === "sso";

  return (
    <div className="admin-panel admin-panel--wide">
      {submitting && (
        <div className="page-overlay" aria-busy="true">
          <LoadingSpinner
            label={isSso ? "Provisioning SSO user..." : "Creating user account..."}
            size="lg"
          />
        </div>
      )}

      <header className="admin-panel__header app-header">
        <div>
          <h1>Create user</h1>
          <p className="subtitle">Signed in as {creatorEmail} · View {viewId}</p>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="create-user-layout">
        <section className="card create-user-form">
          {ssoAvailable && (
            <div className="user-type-toggle" role="group" aria-label="User type">
              <button
                type="button"
                className={userType === "standard" ? "active" : ""}
                onClick={() => setUserType("standard")}
                disabled={submitting}
              >
                Standard user
              </button>
              <button
                type="button"
                className={userType === "sso" ? "active" : ""}
                onClick={() => setUserType("sso")}
                disabled={submitting}
              >
                SSO user
              </button>
            </div>
          )}

          <h2>New user email</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="new-user-email">Email address</label>
            <input
              id="new-user-email"
              type="email"
              placeholder="new.user@company.com"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              disabled={submitting}
            />
            <p className="hint">
              {isSso
                ? "Select which folders this user can see, then send activation. They will sign in with Microsoft Entra using this email — no temporary password is sent."
                : "Select which folders this user can see, then create their account. They will receive a temporary password by email."}
            </p>
            <button
              type="submit"
              disabled={submitting || !newUserEmail.trim() || selectedFolders.size === 0}
            >
              {isSso ? "Send user activation" : "Create user"}
            </button>
          </form>
          {error && <p className="message error">{error}</p>}
          {success && <p className="message success">{success}</p>}
        </section>

        <aside className="sidebar card">
          <div className="sidebar-header">
            <h2>Folder access</h2>
            <p className="meta">{selectedFolders.size} folder(s) selected</p>
          </div>
          <FolderCheckboxTree
            tree={tree}
            selectedFolders={selectedFolders}
            onToggleFolder={handleToggleFolder}
          />
        </aside>
      </div>
    </div>
  );
}
