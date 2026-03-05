// ─── Workspace Zustand Store ────────────────────────────────────────────────
// Manages the absolute system path that the agent will use as its secure root directory.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
    /** The absolute path to the local directory (e.g., C:\Users\xxx\Desktop\Workspace) */
    workspacePath: string;
    setWorkspacePath: (path: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            workspacePath: 'C:\\Users\\25336\\Desktop\\UniHelper\\workspace',
            setWorkspacePath: (path: string) => set({ workspacePath: path }),
        }),
        {
            name: 'cyber-scholar-workspace',
        }
    )
);
