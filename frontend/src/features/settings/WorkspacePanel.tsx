// ─── Workspace Settings Panel ─────────────────────────────────────────────────
// Displays and configures the physical directory where the agent has read/write permissions.

import { FolderTree } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import './WorkspacePanel.css';

export function WorkspacePanel() {
    const { workspacePath, setWorkspacePath } = useWorkspaceStore();

    return (
        <div className="workspace-panel">
            <p className="workspace-panel-title">
                <FolderTree size={16} /> 工作区设定 (Workspace)
            </p>
            <p className="workspace-panel-desc">
                在此设定 Cyber-Scholar 的默认工作目录。Agent 将拥有该目录及其子目录的完整读写权限。
                (仅保存在本地设备)
            </p>

            <div className="workspace-field">
                <input
                    type="text"
                    className="workspace-input"
                    value={workspacePath}
                    onChange={(e) => setWorkspacePath(e.target.value)}
                    placeholder="例如：C:\Users\25336\Desktop\UniHelper\workspace"
                />
            </div>

            <p className="workspace-hint">
                * 请确保该路径在您的系统中真实存在。未来所有的项目文件、论文缓存及代码产物都将默认存放在此。
            </p>
        </div>
    );
}
