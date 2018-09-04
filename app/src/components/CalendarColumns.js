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

const getZoomWithPinch = ({ zoom, isPinchActive, pinchScale }) => {
  const prevZoomState = new Animated.Value(0);

  const pinchZoom = applyZoomLimit(
    Animated.add(
      prevZoomState,
      Animated.multiply(PINCH_MAGNITUDE, Animated.sub(pinchScale, 1))
    )
  );

  return Animated.cond(
    isPinchActive,
    pinchZoom,
    Animated.set(prevZoomState, zoom)
  );
};

const getZoomWithSnapPoints = ({ zoomClock, zoom, isPinchEnd, isAtSnapPoint, pinchVelocity }) => {
  const shouldStart = Animated.and(isPinchEnd, Animated.not(isAtSnapPoint));

  return Animated.cond(
    shouldStart,
    AnimUtils.runSpring(zoomClock, zoom, pinchVelocity),
    zoom
  );
};

const getFocalIndex = focalX =>
  Animated.floor(Animated.divide(focalX, CELL_WIDTH));

const getOffsetX = (index, zoom) =>
  Animated.cond(
    Animated.neq(index, -1),
    Animated.multiply(-1, index, zoom, CELL_WIDTH),
    0
  );

const getColumnWidths = (index, zoom) => {
  const arr = Array.from({ length: CELL_NUM });

  return arr.map((_, i) => {
    const isZoomed = Animated.eq(index, i);

    const width = Animated.add(
      Animated.cond(
        isZoomed,
        Animated.multiply(CONTAINER_WIDTH - CELL_WIDTH, zoom),
        0
      ),
      CELL_WIDTH
    );

    return { width };
  });
};

class CalendarColumns extends Component {
  constructor(props) {
    super(props);

    // The current column that is being zoomed (none is -1)
    const indexState = props.indexState || new Animated.Value(-1);
    // The current zoom state, where 0 is closed and 1 is opened
    const zoomState = props.zoomState || new Animated.Value(0);
    // The current snap point animation clock
    const zoomClock = new Animated.Clock();

    // More state for pinch
    const pinchScale = new Animated.Value(1);
    const pinchFocalX = new Animated.Value(0);
    const pinchVelocity = new Animated.Value(0);
    const pinchState = new Animated.Value(State.UNDETERMINED);

    const isClosed = Animated.eq(zoomState, 0);
    const isOpen = Animated.eq(zoomState, 1);
    const isAtSnapPoint = Animated.or(isClosed, isOpen);

    const isPinchActive = Animated.eq(pinchState, State.ACTIVE);
    const isPinchEnd = Animated.eq(pinchState, State.END);

    const index = Animated.cond(
      Animated.and(isPinchActive, isClosed),
      Animated.set(indexState, getFocalIndex(pinchFocalX)),
      indexState
    );

    const zoomWithPinch = getZoomWithPinch({
      zoom: zoomState,
      isPinchActive,
      pinchScale
    });

    const zoomWithSnap = getZoomWithSnapPoints({
      zoom: zoomWithPinch,
      zoomClock,
      isPinchEnd,
      isAtSnapPoint,
      pinchVelocity
    });

    const pinchInterruptsClock = Animated.cond(
      Animated.and(isPinchActive, Animated.clockRunning(zoomClock)),
      Animated.stopClock(zoomClock)
    );

    const zoom = Animated.block([
      pinchInterruptsClock,
      Animated.set(zoomState, zoomWithSnap)
    ]);

    this.containerStyle = {
      transform: [
        {
          translateX: getOffsetX(index, zoom)
        }
      ]
    };

    this.columnStyles = getColumnWidths(index, zoom);

    this.onPinchEvent = Animated.event([
      {
        nativeEvent: {
          state: pinchState,
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
      <PinchGestureHandler
        ref={gestureHandlerRef}
        onGestureEvent={this.onPinchEvent}
        onHandlerStateChange={this.onPinchEvent}
      >
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
