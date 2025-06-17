import type { IconType } from "react-icons";

export interface SettingsItem {
  id: string;
  path: string;
  label: string;
  description: string;
  icon: IconType;
  disabled?: boolean;
}
