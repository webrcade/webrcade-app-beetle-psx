import {
  registerAudioResume,
  AppWrapper,
  DisplayLoop,
  // FetchAppData,
  CIDS,
  LOG,
} from '@webrcade/app-common';

export class Emulator extends AppWrapper {
  constructor(app, debug = false) {
    super(app, debug);

    window.emulator = this;
    window.readyAudioContext = null;

    this.romBytes = null;
    this.biosBuffers = null;
    this.escapeCount = -1;
    this.audioPlaying = false;
  }

  RA_DIR = '/home/web_user/retroarch/';
  RA_SYSTEM_DIR = this.RA_DIR + 'system/';
  ROM = this.RA_DIR + 'game.chd';

  setRoms(frontendArray, biosBuffers, romBytes) {
    this.frontendArray = frontendArray;
    this.biosBuffers = biosBuffers;
    this.romBytes = romBytes;
  }

  createAudioProcessor() {
    return null;
  }

  async onShowPauseMenu() {}

  async saveState() {}

  pollControls() {
    const { controllers } = this;

    controllers.poll();

    for (let i = 0; i < 4; i++) {
      // Hack to reduce likelihood of accidentally bringing up menu
      if (
        controllers.isControlDown(0 /*i*/, CIDS.ESCAPE) &&
        (this.escapeCount === -1 || this.escapeCount < 60)
      ) {
        if (this.pause(true)) {
          controllers
            .waitUntilControlReleased(0 /*i*/, CIDS.ESCAPE)
            .then(() => this.showPauseMenu());
          return;
        }
      }
    }
  }

  loadEmscriptenModule(canvas) {
    const {
      app,
      /*biosBuffers,*/ frontendArray,
      RA_DIR /*RA_SYSTEM_DIR, ROM*/,
    } = this;

    return new Promise((resolve, reject) => {
      window.Module = {
        canvas: canvas,
        noInitialRun: true,
        onAbort: (msg) => app.exit(msg),
        onExit: () => app.exit(),
        onRuntimeInitialized: () => {
          const f = () => {
            // Enable show message
            this.setShowMessageEnabled(true);
            if (window.readyAudioContext) {
              if (window.readyAudioContext.state !== 'running') {
                app.setShowOverlay(true);
                registerAudioResume(
                  window.readyAudioContext,
                  (running) => {
                    if (running) {
                      window.Module._rwebaudio_enable();
                      window.Module._cmd_audio_reinit();
                      this.audioPlaying = true;
                    }
                    setTimeout(() => app.setShowOverlay(!running), 50);
                  },
                  500,
                );
              } else {
                window.Module._rwebaudio_enable();
                window.Module._cmd_audio_reinit();
                this.audioPlaying = true;
              }
            } else {
              setTimeout(f, 1000);
            }
          };
          setTimeout(f, 1000);
          resolve();
        },
        preInit: function () {
          const FS = window.FS;

          // Load the frontend resources
          const BrowserFS = window.BrowserFS;

          if (frontendArray) {
            const mfs = new BrowserFS.FileSystem.MountableFileSystem();
            const frontend = new BrowserFS.FileSystem.ZipFS(
              new Buffer.from(frontendArray),
            );
            mfs.mount(RA_DIR + 'bundle', frontend);
            BrowserFS.initialize(mfs);
            const BFS = new BrowserFS.EmscriptenFS();
            FS.mount(BFS, { root: '/home' }, '/home');
          } else {
            FS.mkdir('/home/web_user/retroarch');
          }
          FS.mkdir('/home/web_user/retroarch/system');
          FS.mkdir('/home/web_user/retroarch/userdata');
          FS.mkdir('/home/web_user/retroarch/userdata/system');
        },
      };

      const script = document.createElement('script');
      document.body.appendChild(script);
      script.src = 'js/mednafen_psx_libretro.js';
    });
  }

  async loadState() {}

  onPause(p) {
    if (!p) {
      if (window.readyAudioContext) {
        window.readyAudioContext.resume();
        console.log(window.readyAudioContext);
        window.Module._rwebaudio_enable();
        window.Module._cmd_audio_reinit();
      }
    }
  }

  wait(time) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }

  async onStart(canvas) {
    const { app, /*biosBuffers,*/ debug, /*RA_DIR,*/ ROM } = this;
    const { FS, Module } = window;

    try {
      this.canvas = canvas;

      if (this.romBytes.byteLength === 0) {
        throw new Error('The size is invalid (0 bytes).');
      }

      // Copy BIOS files
      for (let bios in this.biosBuffers) {
        const bytes = this.biosBuffers[bios];
        const path = '/home/web_user/retroarch/userdata/system/' + bios;
        FS.writeFile(path, bytes);
        const res = FS.analyzePath(path, true);
        console.log(res.exists);
      }

      FS.writeFile(ROM, this.romBytes);
      this.romBytes = null;

      await this.wait(2000);

      // const start = Date.now();
      // const hashFile = Module.cwrap('hash_generate_from_file', 'null', ['number', 'string']);
      // hashFile(28, ROM);
      // alert("### hashTime: " + (Date.now() - start) / 1000.0);

      await this.wait(10000);

      window.readyAudioContext = new window.AudioContext();
      window.readyAudioContext.resume();
      console.log(window.readyAudioContext);

      try {
        //Module.callMain();
        Module.callMain(['-v', ROM]);
        //Module.resumeMainLoop();
      } catch (e) {
        LOG.error(e);
      }

      setTimeout(() => {
        app.setState({ loadingMessage: null });
      }, 50);

      const frameRate = 60; // TODO: Determine proper framerate
      this.displayLoop = new DisplayLoop(
        frameRate,
        true,
        debug,
        true /* force native */,
      );

      Module.setCanvasSize(canvas.offsetWidth, canvas.offsetHeight);
      window.onresize = () => {
        Module.setCanvasSize(canvas.offsetWidth, canvas.offsetHeight);
      };

      // Start the display loop
      this.displayLoop.start(() => {
        this.pollControls();
        Module._emscripten_mainloop();
      });
    } catch (e) {
      LOG.error(e);
      app.exit(e);
    }
  }
}
