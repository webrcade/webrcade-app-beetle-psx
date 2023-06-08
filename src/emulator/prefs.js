import {
    AppPrefs
  } from '@webrcade/app-common';

  export class Prefs extends AppPrefs {
    constructor(emu) {
      super(emu);

      this.emu = emu;
      const app = emu.getApp();

      this.gpuResolutionPath = app.getStoragePath(`${this.PREFS_PREFIX}.gpuResolution`);
      this.gpuResolution = 0;
    }

    async load() {
      await super.load();
      this.gpuResolution = await super.loadValue(this.gpuResolutionPath, 0);
    }

    async save() {
      await super.save();
      await super.saveValue(this.gpuResolutionPath, this.gpuResolution);
    }

    getGpuResolution() {
      return this.gpuResolution;
    }

    setGpuResolution(resolution) {
      this.gpuResolution = resolution;
    }
  }
