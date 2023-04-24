import React from 'react';
import { Component } from 'react';

import {
  AppDisplaySettingsTab,
  EditorScreen,
  FieldsTab,
  FieldRow,
  FieldLabel,
  FieldControl,
  TelevisionWhiteImage,
  GamepadWhiteImage,
  Switch,
  WebrcadeContext,
} from '@webrcade/app-common';

export class PsxSettingsEditor extends Component {
  constructor() {
    super();
    this.state = {
      tabIndex: null,
      focusGridComps: null,
      values: {},
    };
  }

  componentDidMount() {
    const { emulator } = this.props;

    this.setState({
      values: {
        analogMode: emulator.getAnalogMode(),
        origBilinearMode: emulator.getPrefs().isBilinearEnabled(),
        bilinearMode: emulator.getPrefs().isBilinearEnabled(),
        swapControllers: emulator.getSwapControllers(),
        ejectInsert: false,
        insert: false
      },
    });
  }

  render() {
    const { emulator, onClose } = this.props;
    const { tabIndex, values, focusGridComps } = this.state;

    const setFocusGridComps = (comps) => {
      this.setState({ focusGridComps: comps });
    };

    const setValues = (values) => {
      this.setState({ values: values });
    };

    return (
      <EditorScreen
        showCancel={true}
        onOk={() => {
          emulator.setAnalogMode(values.analogMode ? 1 : 0);
          emulator.setSwapControllers(values.swapControllers);
          emulator.setEjectInsert(values.ejectInsert);
          emulator.setInsert(values.insert);
          if (values.origBilinearMode !== values.bilinearMode) {
            emulator.getPrefs().setBilinearEnabled(values.bilinearMode);
            emulator.updateBilinearFilter();
            emulator.getPrefs().save();
          }
          onClose();
        }}
        onClose={onClose}
        focusGridComps={focusGridComps}
        onTabChange={(oldTab, newTab) => this.setState({ tabIndex: newTab })}
        tabs={[
          {
            image: GamepadWhiteImage,
            label: 'Controller Settings (Session only)',
            content: (
              <PsxSettingsTab
                emulator={emulator}
                isActive={tabIndex === 0}
                setFocusGridComps={setFocusGridComps}
                values={values}
                setValues={setValues}
              />
            ),
          },
          {
            image: TelevisionWhiteImage,
            label: 'Display Settings',
            content: (
              <AppDisplaySettingsTab
                emulator={emulator}
                isActive={tabIndex === 1}
                setFocusGridComps={setFocusGridComps}
                values={values}
                setValues={setValues}
              />
            ),
          },
        ]}
      />
    );
  }
}

class PsxSettingsTab extends FieldsTab {
  constructor() {
    super();
    this.analogModeRef = React.createRef();
    this.swapControllersRef = React.createRef();
    this.ejectInsertRef = React.createRef();
    // this.insertRef = React.createRef();
    this.gridComps = [[this.analogModeRef], [this.swapControllersRef], [this.ejectInsertRef]/*, [this.insertRef]*/];
  }

  componentDidUpdate(prevProps, prevState) {
    const { gridComps } = this;
    const { setFocusGridComps } = this.props;
    const { isActive } = this.props;

    if (isActive && isActive !== prevProps.isActive) {
      setFocusGridComps(gridComps);
    }
  }

  render() {
    const { analogModeRef, ejectInsertRef, /*insertRef,*/ swapControllersRef } = this;
    const { focusGrid } = this.context;
    const { setValues, values } = this.props;

    return (
      <>
        <FieldRow>
          <FieldLabel>Analog mode</FieldLabel>
          <FieldControl>
            <Switch
              ref={analogModeRef}
              onPad={(e) => focusGrid.moveFocus(e.type, analogModeRef)}
              onChange={(e) => {
                setValues({ ...values, ...{ analogMode: e.target.checked } });
              }}
              checked={values.analogMode}
            />
          </FieldControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>Swap controllers (1 and 2)</FieldLabel>
          <FieldControl>
            <Switch
              ref={swapControllersRef}
              onPad={(e) => focusGrid.moveFocus(e.type, swapControllersRef)}
              onChange={(e) => {
                setValues({
                  ...values,
                  ...{ swapControllers: e.target.checked },
                });
              }}
              checked={values.swapControllers}
            />
          </FieldControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>Reset disc</FieldLabel>
          <FieldControl>
            <Switch
              ref={ejectInsertRef}
              onPad={(e) => focusGrid.moveFocus(e.type, ejectInsertRef)}
              onChange={(e) => {
                setValues({
                  ...values,
                  ...{ ejectInsert: e.target.checked },
                });
              }}
              checked={values.ejectInsert}
            />
          </FieldControl>
        </FieldRow>
        {/* <FieldRow>
          <FieldLabel>Insert disc</FieldLabel>
          <FieldControl>
            <Switch
              ref={insertRef}
              onPad={(e) => focusGrid.moveFocus(e.type, insertRef)}
              onChange={(e) => {
                setValues({
                  ...values,
                  ...{ insert: e.target.checked },
                });
              }}
              checked={values.insert}
            />
          </FieldControl>
        </FieldRow> */}
      </>
    );
  }
}
PsxSettingsTab.contextType = WebrcadeContext;


