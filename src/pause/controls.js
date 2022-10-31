import React from 'react';

import { ControlsTab } from '@webrcade/app-common';

export class GamepadControlsTab extends ControlsTab {
  render() {
    return (
      <>
        {this.renderControl('start', 'Start')}
        {this.renderControl('select', 'Select')}
        {this.renderControl('dpad', 'D-pad')}
        {this.renderControl('lanalog', 'D-pad')}
        {this.renderControl('b', 'Circle')}
        {this.renderControl('a', 'Cross')}
        {this.renderControl('y', 'Triangle')}
        {this.renderControl('x', 'Square')}
        {this.renderControl('lbump', 'L1')}
        {this.renderControl('ltrig', 'L2')}
        {this.renderControl('rbump', 'R1')}
        {this.renderControl('rtrig', 'R2')}
      </>
    );
  }
}

export class GamepadAnalogControlsTab extends ControlsTab {
  render() {
    return (
      <>
        {this.renderControl('start', 'Start')}
        {this.renderControl('select', 'Select')}
        {this.renderControl('dpad', 'D-pad')}
        {this.renderControl('lanalog', 'Left analog')}
        {this.renderControl('ranalog', 'Right analog')}
        {this.renderControl('b', 'Circle')}
        {this.renderControl('a', 'Cross')}
        {this.renderControl('y', 'Triangle')}
        {this.renderControl('x', 'Square')}
        {this.renderControl('lbump', 'L1')}
        {this.renderControl('ltrig', 'L2')}
        {this.renderControl('rbump', 'R1')}
        {this.renderControl('rtrig', 'R2')}
      </>
    );
  }
}

export class KeyboardControlsTab extends ControlsTab {
  render() {
    return (
      <>
        {this.renderKey('Enter', 'Start')}
        {this.renderKey('ShiftRight', 'Select')}
        {this.renderKey('ArrowUp', 'D-pad (Up)')}
        {this.renderKey('ArrowDown', 'D-pad (Down)')}
        {this.renderKey('ArrowLeft', 'D-pad (Left)')}
        {this.renderKey('ArrowRight', 'D-pad (Right)')}
        {this.renderKey('KeyX', 'Circle')}
        {this.renderKey('KeyZ', 'Cross')}
        {this.renderKey('KeyS', 'Triangle')}
        {this.renderKey('KeyA', 'Square')}
        {this.renderKey('KeyQ', 'L2')}
        {this.renderKey('KeyW', 'L1')}
        {this.renderKey('KeyE', 'R1')}
        {this.renderKey('KeyR', 'R2')}
      </>
    );
  }
}
