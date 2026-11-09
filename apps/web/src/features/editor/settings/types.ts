import type { EditorSettings } from "../core/settings";

export type SettingsTab = "ai" | "timeline" | "interface" | "storage";

export type SettingsTestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; message: string }
  | { status: "warn"; message: string }
  | { status: "error"; message: string };

export interface SettingsSectionsProps {
  tab: SettingsTab;
  draft: EditorSettings;
  draftId: string | null;
  projectPath: string | null;
  test: SettingsTestState;
  onTest: () => void;
  onChange: (next: EditorSettings) => void;
}
