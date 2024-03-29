import {
  RetroAppWrapper,
  Controller,
  Controllers,
  FetchAppData,
  KeyCodeToControlMapping,
  Unzip,
  CIDS,
  KCODES,
  LOG,
} from '@webrcade/app-common';
import { Prefs } from './prefs';

class PsxKeyCodeToControlMapping extends KeyCodeToControlMapping {
  constructor() {
    super({
      [KCODES.ENTER]: CIDS.START,
      [KCODES.SHIFT]: CIDS.SELECT,
      [KCODES.ESCAPE]: CIDS.ESCAPE,
      [KCODES.ARROW_UP]: CIDS.UP,
      [KCODES.ARROW_DOWN]: CIDS.DOWN,
      [KCODES.ARROW_RIGHT]: CIDS.RIGHT,
      [KCODES.ARROW_LEFT]: CIDS.LEFT,
      [KCODES.S]: CIDS.Y, // Triangle
      [KCODES.X]: CIDS.B, // Circle
      [KCODES.Z]: CIDS.A, // Cross
      [KCODES.A]: CIDS.X, // Square
      [KCODES.Q]: CIDS.LTRIG, // L2
      [KCODES.W]: CIDS.LBUMP, // L1
      [KCODES.E]: CIDS.RBUMP, // R1
      [KCODES.R]: CIDS.RTRIG, // R2
    });
  }
}

export class Emulator extends RetroAppWrapper {
  constructor(app, debug = false) {
    super(app, debug);

    this.analogMode = this.getProps().analog;
    this.swapControllers = false;
    this.ejectInsert = false;
    this.insert = false;
    this.prefs = new Prefs(this);

    // Allow game saves to persist after loading state
    this.saveManager.setDisableGameSaveOnStateLoad(false);

    LOG.info('## Initial analog mode: ' + this.analogMode);
  }

  RA_DIR = '/home/web_user/retroarch/';
  RA_SYSTEM_DIR = this.RA_DIR + 'system/';

  SLOT0_NAME = 'game.srm';
  SLOT1_NAME = 'game.1.mcr';
  SAVE_NAME = 'sav';

  getScriptUrl() {
    return 'js/mednafen_psx_libretro.js';
  }

  createControllers() {
    return new Controllers([
      new Controller(new PsxKeyCodeToControlMapping()),
      new Controller(),
      new Controller(),
      new Controller(),
    ]);
  }

  getControllerIndex(index) {
      let controller = index;
      if (this.swapControllers) {
        if (controller === 0) controller = 1;
        else if (controller === 1) controller = 0;
      }
      return controller;
  }

  async saveState() {
    const { saveStatePath, started } = this;
    const { FS, Module } = window;

    try {
      if (!started) {
        return;
      }

      // Save to files
      Module._cmd_savefiles();

      let files = [];

      const slot0 = `/home/web_user/retroarch/userdata/saves/${this.SLOT0_NAME}`;
      let slot0Save = null;
      try {
        slot0Save = FS.readFile(slot0);
      } catch (e) {}
      let slot1 = `/home/web_user/retroarch/userdata/saves/${this.SLOT1_NAME}`;
      let slot1Save = null;
      try {
        slot1Save = FS.readFile(slot1);
      } catch (e) {}

      if (slot0Save || slot1Save) {
        if (slot0Save) {
          LOG.info('found slot0 file.');
          files.push({
            name: this.SLOT0_NAME,
            content: slot0Save,
          });
        }
        if (slot1Save) {
          LOG.info('found slot1 file.');
          files.push({
            name: this.SLOT1_NAME,
            content: slot1Save,
          });
        }

        if (await this.getSaveManager().checkFilesChanged(files)) {
          LOG.info('saving state.');

          await this.getSaveManager().save(
            saveStatePath,
            files,
            this.saveMessageCallback,
          );
        }
      }
    } catch (e) {
      LOG.error('Error persisting save state: ' + e);
    }
  }

  async loadState() {
    const { saveStatePath } = this;
    const { FS } = window;

    // Write the save state (if applicable)
    try {
      const slot0 = `/home/web_user/retroarch/userdata/saves/${this.SLOT0_NAME}`;
      const slot0Res = FS.analyzePath(slot0, true);
      const slot1 = `/home/web_user/retroarch/userdata/saves/${this.SLOT1_NAME}`;
      const slot1Res = FS.analyzePath(slot1, true);

      if (!slot0Res.exists && !slot1Res.exists) {
        // Load
        const files = await this.getSaveManager().load(
          saveStatePath,
          this.loadMessageCallback,
        );

        if (files) {
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (f.name === this.SLOT0_NAME) {
              LOG.info('writing slot0 file');
              FS.writeFile(slot0, f.content);
            }
            if (f.name === this.SLOT1_NAME) {
              LOG.info('writing slot1 file');
              FS.writeFile(slot1, f.content);
            }
          }

          // Cache the initial files
          await this.getSaveManager().checkFilesChanged(files);
        }
      }
    } catch (e) {
      LOG.error('Error loading save state: ' + e);
    }
  }

  async onWriteAdditionalFiles() {
    const { FS } = window;
    const props = this.getProps();

    // Write .SBI file (if applicable)
    const sbiFiles = props.sbi;
    if (this.discIndex != null && sbiFiles && this.discIndex < sbiFiles.length) {
      try {
        const uz = new Unzip().setDebug(true);
        const res = await new FetchAppData(sbiFiles[this.discIndex]).fetch();
        let blob = await res.blob();
        // Unzip it
        blob = await uz.unzip(blob, ['.sbi']);
        // Convert to array buffer
        const arrayBuffer = await new Response(blob).arrayBuffer();
        // Write to file system
        const u8array = new Uint8Array(arrayBuffer);
        FS.writeFile(this.RA_DIR + "game.sbi", u8array);
        LOG.info("## Successfully wrote .sbi file.");
      } catch (e) {
        LOG.error(e);
      }
    }
  }

  applyGameSettings() {
    const props = this.getProps();
    const { Module } = window;

    let options = 0;
    // multi-tap
    if (props.multitap) {
      LOG.info('## multitap on');
      options |= this.OPT1;
    } else {
      LOG.info('## multitap off');
    }
    // analog
    if (this.analogMode) {
      LOG.info('## analog on');
      options |= this.OPT2;
    } else {
      LOG.info('## analog off');
    }
    // Alternate BIOS files
    for (let bios in this.biosBuffers) {
      if (bios === 'PSXONPSP660.bin') {
        options |= this.OPT3;
        LOG.info('## using bios: ' + bios);
      } else if (bios === 'ps1_rom.bin') {
        options |= this.OPT4;
        LOG.info('## using bios: ' + bios);
      }
    }
    // Skip BIOS
    if (props.skipBios) {
      options |= this.OPT5;
      LOG.info('## skip BIOS on');
    }
    // Disable memory card one
    if (props.disableMemCard1) {
      options |= this.OPT6;
      LOG.info('## disable memory card 1');
    }

    // Eject
    if (this.ejectInsert) {
      this.ejectInsert = false;
      options |= this.OPT7;
      LOG.info('## eject');
    }

    // Eject
    if (this.insert) {
      this.insert = false;
      options |= this.OPT8;
      LOG.info('## insert');
    }

    if (this.prefs.getGpuResolution() === 1) {
      options |= this.OPT15; // 2x
    }

    Module._wrc_set_options(options);
  }

  getSwapControllers() {
    return this.swapControllers;
  }

  setSwapControllers(swap) {
    this.swapControllers = swap;
  }

  getAnalogMode() {
    return this.analogMode;
  }

  setAnalogMode(analog) {
    const isAnalog = analog === 1;
    LOG.info('## Game setAnalogMode: ' + isAnalog);
    this.analogMode = isAnalog;
    this.applyGameSettings();
  }

  setEjectInsert(val) {
    this.ejectInsert = val;
    LOG.info("## setEjectInsert: " + val);
    if (val) {
      this.applyGameSettings();

      setTimeout(() => {
        this.setInsert(true);
      }, 1000);
    }
  }

  setInsert(val) {
    this.insert = val;
    LOG.info("## setInsert: " + val);
    if (val) {
      this.applyGameSettings();
    }
  }

  isForceAspectRatio() {
    return false;
  }

  getDefaultAspectRatio() {
    return 1.333;
  }

  resizeScreen(canvas) {
    this.canvas = canvas;
    // // Determine the zoom level
    // let zoomLevel = 0;
    // if (this.getProps().zoomLevel) {
    //   zoomLevel = this.getProps().zoomLevel;
    // }

    // const size = 96 + zoomLevel;
    // canvas.style.setProperty('width', `${size}vw`, 'important');
    // canvas.style.setProperty('height', `${size}vh`, 'important');
    // canvas.style.setProperty('max-width', `calc(${size}vh*1.22)`, 'important');
    // canvas.style.setProperty('max-height', `calc(${size}vw*0.82)`, 'important');
    this.updateScreenSize();
  }

  getShotAspectRatio() { return this.getDefaultAspectRatio(); }
}
