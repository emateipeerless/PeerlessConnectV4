import { useState } from "react";
import type { TreeNode } from "../types";

interface TreeNodeItemProps {
  node: TreeNode;
  selectedDeviceId: number | null;
  onSelectDevice: (deviceId: number, name: string) => void;
}

export function TreeNodeItem({ node, selectedDeviceId, onSelectDevice }: TreeNodeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = Boolean(node.children?.length);
  const isFolder = node.type === "folder";

  if (isFolder) {
    return (
      <li className="tree-node folder-node">
        <button
          type="button"
          className="tree-row folder-row"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <span className="chevron">{hasChildren ? (expanded ? "▾" : "▸") : "·"}</span>
          <span className="icon">📁</span>
          <span className="label">{node.name}</span>
        </button>
        {hasChildren && expanded && (
          <ul className="tree-children">
            {node.children!.map((child) => (
              <TreeNodeItem
                key={`${child.type}-${child.name}-${child.deviceId ?? "folder"}`}
                node={child}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={onSelectDevice}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const isSelected = node.deviceId === selectedDeviceId;

  return (
    <li className="tree-node device-node">
      <button
        type="button"
        className={`tree-row device-row ${isSelected ? "selected" : ""}`}
        onClick={() => onSelectDevice(node.deviceId!, node.name)}
      >
        <span className="chevron spacer" />
        <span className="icon">⚙</span>
        <span className="label">{node.name}</span>
        <span className="device-id">#{node.deviceId}</span>
      </button>
    </li>
  );
}
