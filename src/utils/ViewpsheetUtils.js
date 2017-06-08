/**
 * @file A collection of utility functions related to generating viewpsheets
 */

// in pixels, will be scaled when printing
export const PAGE_WIDTH = 800;
export const PAGE_HEIGHT = PAGE_WIDTH * 11 / 8.5;

// .25" margin for 8.5x11 page
export const PAGE_MARGIN = PAGE_WIDTH / 34;
export const WIDGET_MARGIN = 5;

// each quadrant corresponds with a stuntsheet
export const QUADRANT_HEIGHT = PAGE_HEIGHT / 2 - PAGE_MARGIN * 2;
export const QUADRANT_WIDTH = PAGE_WIDTH / 2 - PAGE_MARGIN * 2;

// (x,y) coordinates for each quadrant
export const LEFT_RIGHT_QUADRANTS = [
    {
        x: PAGE_MARGIN,
        y: PAGE_MARGIN,
    },
    {
        x: PAGE_WIDTH / 2 + PAGE_MARGIN,
        y: PAGE_MARGIN,
    },
    {
        x: PAGE_MARGIN,
        y: PAGE_HEIGHT / 2 + PAGE_MARGIN,
    },
    {
        x: PAGE_WIDTH / 2 + PAGE_MARGIN,
        y: PAGE_HEIGHT / 2 + PAGE_MARGIN,
    },
];
export const TOP_BOTTOM_QUADRANTS = [0, 2, 1, 3].map(i => LEFT_RIGHT_QUADRANTS[i]);

// font size of sheet label
export const SHEET_LABEL_SIZE = 36;
// font size of east sideline label
export const EAST_LABEL_SIZE = 10;

// heights of the widgets, not including any margins. each widget should
// space itself out from relevant borders.
let totalHeight = QUADRANT_HEIGHT - SHEET_LABEL_SIZE;
let widgetHeights = [
    SHEET_LABEL_SIZE,
    totalHeight * 1/5,
    totalHeight * 2/5,
    totalHeight * 2/5,
];

// information for the dot continuities widget
export const dotTypeWidget = {
    x: 0,
    y: widgetHeights[0] + WIDGET_MARGIN,
    width: QUADRANT_WIDTH,
    height: widgetHeights[1] - 2 * WIDGET_MARGIN,
};

// information for the individual continuities widget
export const individualWidget = {
    x: 0,
    y: dotTypeWidget.y + dotTypeWidget.height + WIDGET_MARGIN,
    width: QUADRANT_WIDTH / 2 - WIDGET_MARGIN,
    height: widgetHeights[2] - 2 * WIDGET_MARGIN,
};

// information for the movement diagram widget
export const movementWidget = _.extend({}, individualWidget, {
    x: QUADRANT_WIDTH / 2 + WIDGET_MARGIN,
    // account for east label
    height: individualWidget.height - EAST_LABEL_SIZE - 2,
});

// information for the nearby dots widget
export const nearbyWidget = {
    x: 0,
    y: individualWidget.y + individualWidget.height + WIDGET_MARGIN,
    width: QUADRANT_WIDTH,
    height: widgetHeights[3] - WIDGET_MARGIN,
};

export const ORIENTATIONS = {
    default: "Same as stuntsheet",
    east: "Always East Up",
    west: "Always West Up",
};