import React from 'react';
import { Component } from 'react';

import {
  AlbumWhiteImage,
  EditorScreen,
  FieldsTab,
  FieldRow,
  FieldLabel,
  FieldControl,
  ImageButton,
  PlayArrowBlackImage,
  PlayArrowWhiteImage,
  Resources,
  WebrcadeContext,
  TEXT_IDS,
} from '@webrcade/app-common';

export class DiscSelectionEditor extends Component {
  constructor() {
    super();
    this.state = {
      tabIndex: null,
      focusGridComps: null,
      values: {},
    };
  }

  componentDidMount() { }

  render() {
    const { app, onClose } = this.props;
    const { tabIndex, values, focusGridComps } = this.state;

    const setFocusGridComps = (comps) => {
      this.setState({ focusGridComps: comps });
    };

    const setValues = (values) => {
      this.setState({ values: values });
    };

    return (
      <EditorScreen
        showCancel={false}
        okLabel={Resources.getText(TEXT_IDS.CANCEL)}
        onOk={() => { app.exit(0); }}
        onClose={onClose}
        focusGridComps={focusGridComps}
        onTabChange={(oldTab, newTab) => this.setState({ tabIndex: newTab })}
        tabs={[
          {
            image: AlbumWhiteImage,
            label: 'Disc Selection',
            content: (
              <DiscSelectionTab
                app={app}
                isActive={tabIndex === 0}
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

class DiscSelectionTab extends FieldsTab {
  constructor() {
    super();

    this.gridComps = null;
  }

  componentDidUpdate(prevProps, prevState) {
    const { setFocusGridComps } = this.props;
    const { app, isActive } = this.props;

    if (!this.gridComps) {
      const comps = [];
      for (let i = 0; i < app.discs.length; i++) {
        comps.push([React.createRef()])
      }
      this.gridComps = comps;
      setTimeout(() => {
        comps[0][0].current.focus();
      });
    }

    if (isActive && isActive !== prevProps.isActive) {
      setFocusGridComps(this.gridComps);
    }
  }

  render() {
    const { gridComps } = this;
    const { focusGrid } = this.context;
    const { app } = this.props;

    const fields = [];

    if (gridComps) {
      for (let i = 0; i < app.discs.length; i++) {
        fields.push(
          <FieldRow>
            <FieldLabel>{Resources.getText(TEXT_IDS.SELECT_DISC, (i + 1))}</FieldLabel>
            <FieldControl>
              <div>
                <ImageButton
                  ref={gridComps[i][0]}
                  imgSrc={PlayArrowBlackImage}
                  hoverImgSrc={PlayArrowWhiteImage}
                  label={Resources.getText(TEXT_IDS.LOAD)}
                  onPad={e => focusGrid.moveFocus(e.type, gridComps[i][0])}
                  onClick={() => {app.start(i)}}
                />
              </div>
            </FieldControl>
          </FieldRow>
        )
      }
    }

    return (
      <>
        {fields}
      </>
    );
  }
}
DiscSelectionTab.contextType = WebrcadeContext;
