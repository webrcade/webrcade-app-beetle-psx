import React from "react";

import {
  WebrcadeRetroApp
} from '@webrcade/app-common';

import { Emulator } from './emulator';
import { EmulatorPauseScreen } from './pause';

import './App.scss';

class App extends WebrcadeRetroApp {

  getBiosMap() {
    return {
      '8dd7d5296a650fac7319bce665a6a53c': 'scph5500.bin', // JPN
      '490f666e1afb15b7362b406ed1cea246': 'scph5501.bin', // USA
      '32736f17079d0b2b7024407c39bd3050': 'scph5502.bin', // EUR
    }
  }

  getAlternateBiosMap() {
    return {
      'c53ca5908936d412331790f4426c6c33': 'PSXONPSP660.bin',
      '81bbe60ba7a3d1cea1d48c14cbcc647b': 'ps1_rom.bin',
    };
  }

  createEmulator(app, isDebug) {
    return new Emulator(app, isDebug);
  }

  getBiosUrls(appProps) {
    return appProps.psx_bios;
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
}

export default App;
