// ----------------------------------------------------------------------------
// File Path: src/vendors/P5/sketchFeedback.js
// Description: P5 sketch wrapper for real time feedback
// Author: Daniel Griessler & Dan Levy
// Email: dgriessler20@gmail.com & danlevy124@gmail.com
// Created Date: 11/15/2019
// ----------------------------------------------------------------------------

/**
 * P5 sketch wrapper for real time feedback
 * @module sketchFeedback
 * @author Daniel Griessler <dgriessler20@gmail.com> & Dan Levy <danlevy124@gmail.com>
 */

// File imports
import atVars from "../AlphaTab/variables";
import * as sketchBehaviors from "./sketchBehaviors";

/**
 * Wrapper for local p5 setup and draw functions
 * @param {sketch} p Sketch object that will include all of the functions that will be called by p5
 */
const p5FeedbackSketch = (p) => {
    p.type = sketchBehaviors.REAL_TIME_FEEDBACK;
    // how much space to add around note for drawing lines, obtained by guess and check
    const EXTRA_BAR_VARIANCE = 7;

    // document elements retrieved from the document
    let barCursor;
    let alphaTabSurface;
    let sideNavElementWidth;

    // wraps together the Alpha tab container and p5's canvas
    let wrapper;

    // provided by reference which is updated in other functions
    let drawer;

    // reference to p5's canvas when created. It should overlay the AlphaTab canvas
    let canvas;

    // how large to draw the notehead
    // TODO: Dynamically change based on scale of music
    let circleSize = 10;

    // stores last two XY coordinates of notes drawn
    let previousPos = [-1, -1, -1, -1];

    // stores the last recorded midi value and its time
    let lastPitchAndTime = [-1, -1];

    /**
     * This function is called twice. Once, upon initialization p5 calls it which we use to tell p5 to stop looping
     * Then, AlphaTab will call setup when its done being rendered. Then, the canvas can be setup for drawing since
     * the canvas overlays the AlphaTab container
     * @param {Drawer} drawerGiven - p5 will not provide this but atVars provides a reference to the Drawer being used
     */
    p.setup = function (drawerGiven) {
        if (drawerGiven === undefined) {
            p.noLoop();
            return;
        }
        drawer = drawerGiven;
        // Retrieved by attaching unique IDs to elements generated by AlphaTab. Required editing AlphaTab.js directly
        barCursor = document.getElementById("bC");
        alphaTabSurface = document.getElementById("aTS");
        const sideNavElement = document.querySelector("#side-nav");
        sideNavElementWidth =
            sideNavElement !== null ? sideNavElement.clientWidth : 0;
        wrapper = document.getElementById("alpha-tab-wrapper");

        // creates a canvas that overlaps the alphaTabSurface. Position is absolute for the canvas by default
        canvas = p.createCanvas(
            alphaTabSurface.clientWidth,
            alphaTabSurface.clientHeight
        );
        const x = 0;
        const y = 0;
        canvas.position(x, y);
        canvas.parent("sketch-holder");
    };

    /**
     * Draws the canvas on the screen. Requires that the canvas is not undefined ie setup has run
     * TODO: Handle sheet music scale
     */
    p.draw = function () {
        if (!atVars.getsFeedback) {
            return;
        }

        if (atVars && atVars.shouldResetDrawPositions) {
            previousPos[0] = -1;
            previousPos[1] = -1;
            previousPos[2] = -1;
            previousPos[3] = -1;
            atVars.shouldResetDrawPositions = false;
            barCursor = document.getElementById("bC");
            alphaTabSurface = document.getElementById("aTS");
        }

        // handles clearing ahead and drawing line behind the note head
        if (previousPos[0] !== -1 && previousPos[1] !== -1) {
            // fills with white
            p.fill("#F8F8F8");

            // draws clearing rectangle with total height of alpha tab from previous X position to the end
            p.rect(
                previousPos[0],
                0,
                alphaTabSurface.clientWidth - previousPos[0],
                alphaTabSurface.clientHeight
            );

            // don't draw silence which has special value -1 or if we don't have a previous point
            if (
                drawer &&
                drawer.note.midiVal >= 0 &&
                previousPos[2] !== -1 &&
                previousPos[3] !== -1
            ) {
                // If there is any confusion in the player then this will help keep the drawing at the right height
                if (previousPos[0] < previousPos[2]) {
                    let topLine = document.getElementById("rect_0");
                    let nextLine = document.getElementById("rect_1");
                    if (
                        topLine &&
                        topLine.y &&
                        topLine.y.animVal &&
                        topLine.y.animVal.value &&
                        nextLine &&
                        nextLine.y &&
                        nextLine.y.animVal &&
                        nextLine.y.animVal.value
                    ) {
                        const topLineHeight = topLine.y.animVal.value;
                        const distanceBetweenLines =
                            nextLine.y.animVal.value - topLineHeight;
                        drawer.setTopLineAndDistanceBetween(
                            topLineHeight,
                            distanceBetweenLines,
                            drawer.baseOctave
                        );
                    }
                }
                if (atVars.noteStream[atVars.noteStreamIndex] === -1) {
                    // singing should be silent
                    p.stroke(255, 0, 0);
                } else {
                    let diff = Math.abs(
                        lastPitchAndTime[0] -
                            atVars.noteStream[atVars.noteStreamIndex]
                    );

                    // fill with green if really close
                    if (diff < 1) {
                        p.stroke(0, 255, 0);
                    } else if (diff < 2) {
                        // yellow if farther away
                        p.stroke("#CCCC00");
                    } else {
                        // and red if too far or singing when should be silent
                        p.stroke(255, 0, 0);
                    }
                }

                p.strokeWeight(3);
                p.line(
                    previousPos[0],
                    previousPos[1],
                    previousPos[2],
                    previousPos[3]
                );
                p.noStroke();
            }
            previousPos[2] = previousPos[0];
            previousPos[3] = previousPos[1];
        }

        // dont draw the outline of the shape, note: you need to turn stroke on to draw lines as we do below.
        p.noStroke();

        if (drawer) {
            lastPitchAndTime[0] = drawer.note.midiVal;
            lastPitchAndTime[1] = atVars.api.timePosition / 1000;
            while (
                lastPitchAndTime[1] >
                atVars.cumulativeTime +
                    atVars.noteStream[atVars.noteStreamIndex + 1]
            ) {
                atVars.cumulativeTime +=
                    atVars.noteStream[atVars.noteStreamIndex + 1];
                atVars.noteStreamIndex += 2;
            }

            let currentHeight = drawer.noteHeight;
            previousPos[1] = currentHeight;

            // fills with pink
            p.fill(255, 0, 255);

            // Binds x position to the bar cursor
            let posX =
                barCursor.getClientRects()[0].left.valueOf() -
                sideNavElementWidth +
                wrapper.scrollLeft -
                27;

            // TODO: Handle resizing scale
            // places sharp if present beside the note. These magic values were calculated via trial and error
            let sharpPos = [posX - 14, currentHeight + 3.5];
            previousPos[0] = sharpPos[0] - EXTRA_BAR_VARIANCE;

            // silence has Sentinel value -1 so only draw when not silent
            if (drawer.note.midiVal >= 0) {
                // actually draws note circle at the given position
                p.ellipse(posX, currentHeight, circleSize, circleSize);

                // TODO Handle resizing scale
                // Adds sharp symbol if needed
                if (drawer.note.isSharp) {
                    p.text("#", sharpPos[0], sharpPos[1]);
                }

                // Adds ledger lines above or below the staff
                if (drawer.belowOrAbove !== 0) {
                    let isIncreasing = drawer.belowOrAbove > 0;
                    p.stroke(0);
                    p.strokeWeight(1);
                    let height = isIncreasing
                        ? drawer.topLine
                        : drawer.firstLine - drawer.distanceBetweenLines;
                    for (let i = 0; i < Math.abs(drawer.belowOrAbove); i++) {
                        if (isIncreasing) {
                            height -= drawer.distanceBetweenLines;
                        } else {
                            height += drawer.distanceBetweenLines;
                        }
                        p.line(
                            posX - EXTRA_BAR_VARIANCE,
                            height,
                            posX + EXTRA_BAR_VARIANCE,
                            height
                        );
                    }
                    p.noStroke();
                }
            }
        }
    };
};

export default p5FeedbackSketch;
