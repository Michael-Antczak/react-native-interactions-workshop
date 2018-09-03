import React, { Component } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

import * as AnimUtils from '../AnimUtils';
import * as theme from '../theme';

const {
  CELL_NUM,
  CELL_WIDTH,
  CONTAINER_WIDTH,
  PINCH_MAGNITUDE
} = theme.calendar;

// Constrain value to [0, 1]
const applyZoomLimit = a => AnimUtils.limit(a, 0, 1);

const getZoomWithPinch = pinchScale => applyZoomLimit(
  Animated.multiply(PINCH_MAGNITUDE, Animated.sub(pinchScale, 1))
);

const getColumnWidths = zoom => {
  const arr = Array.from({ length: CELL_NUM });

  return arr.map(() => {
    const width = Animated.add(
      Animated.multiply(CONTAINER_WIDTH - CELL_WIDTH, zoom),
      CELL_WIDTH
    );

    return { width };
  });
};

class CalendarColumns extends Component {
  constructor(props) {
    super(props);

    // The current column that is being zoomed (none is -1)
    //const indexState = props.indexState || new Animated.Value(-1);
    // The current zoom state, where 0 is closed and 1 is opened
    //const zoomState = props.zoomState || new Animated.Value(0);

    const pinchScale = new Animated.Value(1);
    const pinchFocalX = new Animated.Value(0);
    const pinchVelocity = new Animated.Value(0);

    const zoom = getZoomWithPinch(pinchScale);

    this.containerStyle = {};
    this.columnStyles = getColumnWidths(zoom);

    this.onPinchEvent = Animated.event([
      {
        nativeEvent: {
          scale: pinchScale,
          velocity: pinchVelocity,
          focalX: pinchFocalX
        }
      }
    ]);
  }

  render() {
    const { gestureHandlerRef, children } = this.props;

    return (
      <PinchGestureHandler ref={gestureHandlerRef} onGestureEvent={this.onPinchEvent}>
        <Animated.View style={[styles.container, this.containerStyle]}>
          {this.columnStyles.map((style, index) => (
            <Animated.View style={[styles.column, style]} key={index}>
              {children ? children(index) : null}
            </Animated.View>
          ))}
        </Animated.View>
      </PinchGestureHandler>
    );
  }
}

const styles = {
  container: {
    flexGrow: 1,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden'
  },
  column: {
    flexGrow: 1,
    flexShrink: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingLeft: 2,
    paddingRight: 2,
    borderRightWidth: theme.sizes.hairline,
    borderRightColor: theme.colors.stroke,
    width: CELL_WIDTH
  }
};

export default CalendarColumns;
