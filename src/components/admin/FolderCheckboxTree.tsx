import { useState } from "react";
import type { TreeNode } from "../../types";

interface FolderCheckboxItemProps {
  node: TreeNode;
  selectedFolders: Set<string>;
  onToggleFolder: (name: string, checked: boolean) => void;
}

function FolderCheckboxItem({ node, selectedFolders, onToggleFolder }: FolderCheckboxItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = Boolean(node.children?.length);

  if (node.type === "folder") {
    const checked = selectedFolders.has(node.name);

    return (
      <li className="tree-node folder-node">
        <div className="tree-row folder-row folder-row--checkbox">
          <label className="folder-checkbox">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onToggleFolder(node.name, event.target.checked)}
            />
            <span className="checkbox-ui" />
          </label>
          <button
            type="button"
            className="folder-expand"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            <span className="chevron">{hasChildren ? (expanded ? "▾" : "▸") : "·"}</span>
            <span className="label">{node.name}</span>
          </button>
        </div>
        {hasChildren && expanded && (
          <ul className="tree-children">
            {node.children!.map((child) => (
              <FolderCheckboxItem
                key={`${child.type}-${child.name}-${child.deviceId ?? "folder"}`}
                node={child}
                selectedFolders={selectedFolders}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li className="tree-node device-node">
      <div className="tree-row device-row device-row--readonly">
        <span className="chevron spacer" />
        <span className="icon">⚙</span>
        <span className="label">{node.name}</span>
        <span className="device-id">#{node.deviceId}</span>
      </div>
    </li>
  );
}

interface FolderCheckboxTreeProps {
  tree: TreeNode[];
  selectedFolders: Set<string>;
  onToggleFolder: (name: string, checked: boolean) => void;
}

export function FolderCheckboxTree({ tree, selectedFolders, onToggleFolder }: FolderCheckboxTreeProps) {
  if (!tree.length) {
    return <p className="placeholder">No folders available in your view.</p>;
  }

  return (
    <nav className="sidebar-tree" aria-label="Selectable folder structure">
      <ul className="tree-root">
        {tree.map((node) => (
          <FolderCheckboxItem
            key={`${node.type}-${node.name}-${node.deviceId ?? "folder"}`}
            node={node}
            selectedFolders={selectedFolders}
            onToggleFolder={onToggleFolder}
          />
        ))}
      </ul>
    </nav>
  );
}
