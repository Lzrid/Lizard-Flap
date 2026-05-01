import { SETTINGS_KEY } from "../../config";
import { isValidName, sanitizeName } from "../../utils/name";

interface StoredSettings {
  muted?: boolean;
  playerName?: string;
}

export class Settings {
  muted: boolean;
  playerName: string;

  constructor(private readonly storage: Storage = window.localStorage) {
    const data = this.load();
    this.muted = data.muted ?? false;
    const stored = data.playerName ?? "";
    this.playerName = isValidName(stored) ? stored : "";
  }

  setMuted(value: boolean): void {
    this.muted = value;
    this.save();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Returns the sanitized name that was actually stored, or "" if rejected. */
  setPlayerName(name: string): string {
    const clean = sanitizeName(name);
    if (!isValidName(clean)) {
      this.playerName = "";
      this.save();
      return "";
    }
    this.playerName = clean;
    this.save();
    return clean;
  }

  hasName(): boolean {
    return this.playerName.length > 0;
  }

  private load(): StoredSettings {
    try {
      const raw = this.storage.getItem(SETTINGS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as StoredSettings;
    } catch {
      return {};
    }
  }

  private save(): void {
    try {
      this.storage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ muted: this.muted, playerName: this.playerName }),
      );
    } catch {
      // ignore
    }
  }
}
