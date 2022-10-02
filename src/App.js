import {
  blobToStr,
  md5,
  setMessageAnchorId,
  settings,
  FetchAppData,
  Resources,
  WebrcadeApp,
  LOG,
  TEXT_IDS,
} from '@webrcade/app-common';
import { Emulator } from './emulator';
import { EmulatorPauseScreen } from './pause';

import './App.scss';

class App extends WebrcadeApp {
  emulator = null;

  // TODO: Support alternative BIOS files

  BIOS = {
    '8dd7d5296a650fac7319bce665a6a53c': 'scph5500.bin', // JPN
    '490f666e1afb15b7362b406ed1cea246': 'scph5501.bin', // USA
    '32736f17079d0b2b7024407c39bd3050': 'scph5502.bin', // EUR
  };

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
    const biosBuffers = {};
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
      const name = this.BIOS[md5Hash];

      if (name) {
        biosBuffers[name] = new Uint8Array(await blob.arrayBuffer());
      }
    }

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

  componentDidMount() {
    super.componentDidMount();

    setMessageAnchorId('canvas');

    // Create the emulator
    if (this.emulator === null) {
      this.emulator = new Emulator(this, this.isDebug());
    }

    const { appProps, emulator, ModeEnum } = this;

    try {
      // Get the uid
      const uid = appProps.uid;
      if (!uid) throw new Error('A unique identifier was not found for the game.');

      // Get the ROM location that was specified
      const rom = appProps.rom;
      if (!rom) throw new Error('A ROM file was not specified.');

      const bios = appProps.psx_bios;
      if (!bios) throw new Error('BIOS file(s) were not specified.');

      let biosBuffers = null;
      let frontend = null;

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
        .then(() => new FetchAppData(rom).fetch())
        .then((response) => this.fetchResponseBuffer(response))
        .then((bytes) => {
          emulator.setRoms(uid, frontend, biosBuffers, bytes);
          return bytes;
        })
        .then(() =>
          this.setState({
            mode: ModeEnum.LOADED,
            loadingMessage: 'Starting',
            /*loadingPercent: null*/
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
    const { ModeEnum } = this;

    return (
      <>
        {super.render()}
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
