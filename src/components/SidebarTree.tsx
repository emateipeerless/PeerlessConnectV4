import type { TreeNode } from "../types";
import { TreeNodeItem } from "./TreeNodeItem";

interface SidebarTreeProps {
  tree: TreeNode[];
  selectedDeviceId: number | null;
  onSelectDevice: (deviceId: number, name: string) => void;
}

export function SidebarTree({ tree, selectedDeviceId, onSelectDevice }: SidebarTreeProps) {
  if (!tree.length) {
    return <p className="empty-tree">No folders or devices found for this user.</p>;
  }

  return (
    <nav className="sidebar-tree" aria-label="Device folder structure">
      <ul className="tree-root">
        {tree.map((node) => (
          <TreeNodeItem
            key={`${node.type}-${node.name}-${node.deviceId ?? "folder"}`}
            node={node}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={onSelectDevice}
          />
        ))}
      </ul>
    </nav>
  );
}
