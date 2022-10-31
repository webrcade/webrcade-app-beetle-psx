import {
  blobToStr,
  md5,
  removeEmptyArrayItems,
  setMessageAnchorId,
  settings,
  FetchAppData,
  Resources,
  UrlUtil,
  WebrcadeApp,
  LOG,
  TEXT_IDS,
} from '@webrcade/app-common';
import { Emulator } from './emulator';
import { EmulatorPauseScreen } from './pause';
import { DiscSelectionEditor } from './selectdisc';

import './App.scss';

class App extends WebrcadeApp {
  emulator = null;

  ALT_BIOS = {
    c53ca5908936d412331790f4426c6c33: 'PSXONPSP660.bin',
    '81bbe60ba7a3d1cea1d48c14cbcc647b': 'ps1_rom.bin',
  };

  BIOS = {
    '8dd7d5296a650fac7319bce665a6a53c': 'scph5500.bin', // JPN
    '490f666e1afb15b7362b406ed1cea246': 'scph5501.bin', // USA
    '32736f17079d0b2b7024407c39bd3050': 'scph5502.bin', // EUR
  };

  MODE_DISC_SELECT = 'discSelectionMode';

  constructor() {
    super();

    this.state.mode = null;
  }

  async loadBrowserFs() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      document.body.appendChild(script);
      script.onload = () => {
        resolve();
      };
      script.src = 'js/browserfs.min.js';
    });
  }

  async loadFrontend() {
    // Fetch frontend
    const fad = new FetchAppData('frontend.zip');
    const res = await fad.fetch();
    const blob = await res.blob();
    return new Uint8Array(await new Response(blob).arrayBuffer());
  }

  async fetchBios(bios) {
    let biosBuffers = {};
    for (let i = 0; i < bios.length; i++) {
      const biosUrl = bios[i];
      if (biosUrl.trim().length === 0) {
        continue;
      }

      const fad = new FetchAppData(biosUrl);
      const res = await fad.fetch();
      const blob = await res.blob();
      const blobStr = await blobToStr(blob);
      const md5Hash = md5(blobStr);
      let name = this.BIOS[md5Hash];
      if (!name) {
        name = this.ALT_BIOS[md5Hash];
      }
      if (name) {
        biosBuffers[name] = new Uint8Array(await blob.arrayBuffer());
      }
    }

    let haveBuffers = false;
    for (let p in this.ALT_BIOS) {
      const f = this.ALT_BIOS[p];
      for (let n in biosBuffers) {
        if (f === n) {
          const buff = biosBuffers[n];
          biosBuffers = {};
          biosBuffers[n] = buff;
          haveBuffers = true;
          break;
        }
      }
    }

    if (!haveBuffers) {
      for (let p in this.BIOS) {
        const f = this.BIOS[p];
        let found = false;
        for (let n in biosBuffers) {
          if (f === n) {
            found = true;
            break;
          }
        }
        if (!found) throw new Error(`Unable to find BIOS file: ${f}`);
      }
    }

    console.log(biosBuffers);

    return biosBuffers;
  }

  // TODO: Move this to common
  async fetchResponseBuffer(response) {
    const length = response.headers.get('Content-Length');
    if (length) {
      let array = new Uint8Array(length);
      let at = 0;
      let reader = response.body.getReader();
      for (;;) {
        let { done, value } = await reader.read();
        if (done) {
          break;
        }
        array.set(value, at);
        at += value.length;
        const progress = ((at / length).toFixed(2) * 100).toFixed(0);
        this.setState({ loadingPercent: progress | 0 });
      }
      try {
        return array;
      } finally {
        array = null;
      }
    } else {
      const blob = await response.blob();
      return new Uint8Array(await new Response(blob).arrayBuffer());
    }
  }

  getExtension(url, fad, res) {
    let filename = fad.getFilename(res);
    if (!filename) {
      filename = UrlUtil.getFileName(url);
    }
    if (filename) {
      const comps = filename.split('.');
      if (comps.length > 1) {
        return comps[comps.length - 1].toLowerCase();
      }
    }
    return null;
  }

  start(discIndex) {
    setMessageAnchorId('canvas');

    const { bios, discs, emulator, uid, ModeEnum } = this;

    this.setState({ mode: ModeEnum.LOADING });

    try {
      let biosBuffers = null;
      let frontend = null;
      let extension = null;

      const discUrl = discs[discIndex];
      const fad = new FetchAppData(discUrl);

      // Load Emscripten and ROM binaries
      settings
        .load()
        .then(() => emulator.loadEmscriptenModule(this.canvas))
        .then(() => this.fetchBios(bios))
        .then((b) => {
          biosBuffers = b;
        })
        // .then(() => settings.setBilinearFilterEnabled(true))
        // .then(() => settings.setVsyncEnabled(false))
        // .then(() => this.loadBrowserFs())
        // .then(() => this.loadFrontend())
        // .then((f) => {frontend = f})
        .then(() => fad.fetch())
        .then((response) => {
          extension = this.getExtension(discUrl, fad, response);
          return response;
        })
        .then((response) => this.fetchResponseBuffer(response))
        .then((bytes) => {
          emulator.setRoms(uid, frontend, biosBuffers, bytes, extension);
          return bytes;
        })
        .then(() =>
          this.setState({
            mode: ModeEnum.LOADED,
            loadingMessage: 'Loading',
          }),
        )
        .catch((msg) => {
          LOG.error(msg);
          this.exit(
            msg ? msg : Resources.getText(TEXT_IDS.ERROR_RETRIEVING_GAME),
          );
        });
    } catch (e) {
      this.exit(e);
    }
  }

  componentDidMount() {
    super.componentDidMount();

    const { appProps } = this;

    // Create the emulator
    if (this.emulator === null) {
      try {
        this.emulator = new Emulator(this, this.isDebug());

        // Get the uid
        this.uid = appProps.uid;
        if (!this.uid)
          throw new Error('A unique identifier was not found for the game.');

        // Get the discs location that was specified
        this.discs = appProps.discs;
        if (this.discs) this.discs = removeEmptyArrayItems(this.discs);
        if (!this.discs || this.discs.length === 0)
          throw new Error('A disc was not specified.');

        this.bios = appProps.psx_bios;
        if (this.bios) this.bios = removeEmptyArrayItems(this.bios);
        if (!this.bios || this.bios.length === 0)
          throw new Error('BIOS file(s) were not specified.');

        if (this.discs.length > 1) {
          this.setState({ mode: this.MODE_DISC_SELECT });
        } else {
          this.start(0);
        }
      } catch (msg) {
        LOG.error(msg);
        this.exit(
          msg ? msg : Resources.getText(TEXT_IDS.ERROR_RETRIEVING_GAME),
        );
      }
    }
  }

  async onPreExit() {
    try {
      await super.onPreExit();
      if (!this.isExitFromPause()) {
        await this.emulator.saveState();
      }
    } catch (e) {
      LOG.error(e);
    }
  }

  componentDidUpdate() {
    const { mode } = this.state;
    const { ModeEnum, emulator, canvas } = this;

    if (mode === ModeEnum.LOADED) {
      window.focus();
      // Start the emulator
      emulator.start(canvas);
    }
  }

  renderPauseScreen() {
    const { appProps, emulator } = this;

    return (
      <EmulatorPauseScreen
        emulator={emulator}
        appProps={appProps}
        closeCallback={() => this.resume()}
        exitCallback={() => {
          this.exitFromPause();
        }}
        isEditor={this.isEditor}
        isStandalone={this.isStandalone}
      />
    );
  }

  renderCanvas() {
    return (
      <canvas
        ref={(canvas) => {
          this.canvas = canvas;
        }}
        id="canvas"
      ></canvas>
    );
  }

  render() {
    const { errorMessage, loadingMessage, mode } = this.state;
    const { ModeEnum, MODE_DISC_SELECT } = this;

    return (
      <>
        {super.render()}
        {mode === MODE_DISC_SELECT && this.discs ? (
          <DiscSelectionEditor app={this} />
        ) : null}
        {mode === ModeEnum.LOADING || (loadingMessage && !errorMessage)
          ? this.renderLoading()
          : null}
        {mode === ModeEnum.PAUSE ? this.renderPauseScreen() : null}
        {this.renderCanvas()}
        {/* {mode === ModeEnum.LOADED || mode === ModeEnum.PAUSE
          ? this.renderCanvas()
          : null} */}
      </>
    );
  }
}

export default App;
