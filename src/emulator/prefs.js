import { BaseSettings } from '@webrcade/app-common';

export class Prefs extends BaseSettings {
  constructor(emu) {
    super(emu.getStorage());

    this.emu = emu;
    const app = emu.getApp();

    const PREFS_PREFIX = 'prefs';

    this.bilinearPath = app.getStoragePath(`${PREFS_PREFIX}.forceBilinear`);
    this.bilinearEnabled = false;
  }

  async load() {
    this.bilinearEnabled = await super.loadBool(
      this.bilinearPath,
      this.bilinearEnabled,
    );
  }

  async save() {
    await super.saveBool(this.bilinearPath, this.bilinearEnabled);
  }

  isBilinearEnabled() {
    return this.bilinearEnabled;
  }

  setBilinearEnabled(enabled) {
    this.bilinearEnabled = enabled;
  }
}
