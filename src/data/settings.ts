import { LibrarySettingsProps } from "../types/se";

/**
 * ライブラリ設定値
 */
export class LibrarySettings {
	localTimerTimeout: number = 5000;
	update(object: LibrarySettingsProps): void {
		Object.assign(this, object);
	}
}

export const Settings = new LibrarySettings();
