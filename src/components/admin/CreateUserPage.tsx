import { FormEvent, useState } from "react";
import type { TreeNode } from "../../types";
import { FolderCheckboxTree } from "./FolderCheckboxTree";
import { LoadingSpinner } from "../LoadingSpinner";

interface CreateUserPageProps {
  creatorEmail: string;
  tree: TreeNode[];
  viewId: number;
  submitting: boolean;
  error: string | null;
  success: string | null;
  onSubmit: (newUserEmail: string, folderNames: string[]) => void;
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
    onSubmit(email, Array.from(selectedFolders));
  }

  return (
    <div className="admin-panel admin-panel--wide">
      {submitting && (
        <div className="page-overlay" aria-busy="true">
          <LoadingSpinner label="Creating user account..." size="lg" />
        </div>
      )}

      <header className="admin-panel__header app-header">
        <div>
          <h1>Create standard user</h1>
          <p className="subtitle">Signed in as {creatorEmail} · View {viewId}</p>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="create-user-layout">
        <section className="card create-user-form">
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
              Select which folders this user can see, then create their account. They will receive a
              temporary password by email.
            </p>
            <button
              type="submit"
              disabled={submitting || !newUserEmail.trim() || selectedFolders.size === 0}
            >
              Create user
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
