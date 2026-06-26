import { useState, type CSSProperties } from "react";
import type { TreeNode } from "../types";

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedDeviceId: number | null;
  onSelectDevice: (deviceId: number, name: string) => void;
}

export function TreeNodeItem({
  node,
  depth,
  selectedDeviceId,
  onSelectDevice,
}: TreeNodeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = Boolean(node.children?.length);
  const isFolder = node.type === "folder";
  const nestedRowStyle: CSSProperties | undefined =
    depth > 0 ? { paddingInlineStart: `${0.5 + depth * 1.25}rem` } : undefined;

  if (isFolder) {
    return (
      <li className="tree-node folder-node">
        <button
          type="button"
          className="tree-row folder-row"
          style={nestedRowStyle}
          data-depth={depth}
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
                depth={depth + 1}
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
        style={nestedRowStyle}
        data-depth={depth}
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
