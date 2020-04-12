// ----------------------------------------------------------------------------
// File Path: src/vendors/AlphaTab/listeners.js
// Description: Functions called when an AlphaTab listener is triggered
// Author: Daniel Griessler & Dan Levy
// Email: dgriessler20@gmail.com & danlevy124@gmail.com
// Created Date: 11/15/2019
// ----------------------------------------------------------------------------

// File imports
import atVars from "./variables";
import { startPlayingMusic } from "./actions";
import { store } from "../../store/reduxSetup";
import Drawer from "../P5/Drawer";
import * as sketchBehaviors from "../P5/sketchBehaviors";
import p5 from "p5";
import feedbackSketch from "../P5/sketchFeedback";
import performanceSketch from "../P5/sketchPerformance";
import { stopPitchDetection } from "../ML5/PitchDetection/actions";
import * as playerStates from "./playerStates";

/**
 * Run when AlphaTab is rendered on the screen
 */
export const alphaTabPostRenderFinished = () => {
    // All users get feedback
    atVars.getsFeedback = true;

    // Retrieves staff lines using IDs attacked to elements generated by AlphaTab
    // Note: This required editing AlphaTab.js directly
    let topLine = document.getElementById("rect_0");
    let nextLine = document.getElementById("rect_1");

    if (!atVars.isFirstRender) {
        onSubsequentRender(topLine, nextLine);
    } else {
        onFirstRender(topLine, nextLine);
    }
};

/**
 * Handles changes to AlphaTab's player state
 */
export const alphaTabPlayerStateChanged = () => {
    // Due to our page turns, the AlphaTex is re rendered and the player state is automatically "stopped" as part of the re rendering
    // We want the sheet music to keep playing though so the checks are as follows
    if (
        atVars.api.playerState !== playerStates.PLAYING &&
        atVars.playerState === playerStates.PLAYING
    ) {
        // Real stop -> stop playing the music
        stopPlayingMusic();
        resetSheetMusic();
    } else if (
        atVars.api.playerState === playerStates.PLAYING &&
        atVars.playerState === playerStates.STOPPED
    ) {
        // Real play -> play the music
        startPlayingMusic();
    } else if (atVars.playerState === playerStates.PENDING_STOP) {
        // Request was made to destroy the api -> so stop playing the music
        stopPlayingMusic();
    }
};

/**
 * Resets the time back to the beginning of the song and our tracker points at the beginning of the piece again
 * TODO: Is this function still needed?
 */
export const alphaTabPlayerFinished = () => {
    atVars.noteStreamIndex = 0;
    atVars.cumulativeTime = 0;
};

/**
 * During page turns, we only need to update a subset of variables
 */
const onSubsequentRender = (topLine, nextLine) => {
    // On a re-render, update the top line height and distance between lines which might have changed
    const { topLineHeight, distanceBetweenLines } = getSheetMusicLedgerHeights(
        topLine,
        nextLine
    );

    atVars.drawer.setTopLineAndDistanceBetween(
        topLineHeight,
        distanceBetweenLines,
        atVars.texLoaded.getStartOctave()
    );

    atVars.texLoaded.setFirstMeasurePosition();

    if (atVars.sketchBehavior === atVars.p5Obj.type) {
        // On a re render, the alpha tab surface might have changed size, so resize the p5 drawing canvas to overlay it
        let aTS = document.getElementById("aTS");
        atVars.p5Obj.resizeCanvas(aTS.clientWidth, aTS.clientHeight);
        atVars.p5Obj.clear();
    } else {
        atVars.p5Obj.remove();
        atVars.p5Obj = null;
        if (atVars.sketchBehavior === sketchBehaviors.REAL_TIME_FEEDBACK) {
            // Creates a new p5 instance which we will use for real time feedback during performance
            atVars.p5Obj = new p5(feedbackSketch);
        } else if (
            atVars.sketchBehavior === sketchBehaviors.PERFORMANCE_HIGHLIGHTING
        ) {
            // Sets up drawing for performance highlighting
            // Creates a new p5 instance which we will use for highlighting during performance overview
            atVars.p5Obj = new p5(performanceSketch);
        }
        // setup is called immediately upon creating a new p5 sketch but we need to call it explictly to give it a handle
        // to the drawer that we created. This also signals to actually create an appropriately sized canvas since Alpha Tab
        // is now actually rendered to the dom
        atVars.p5Obj.setup(atVars.drawer);
    }
};

/**
 * On the first render, isFirstRender will be false and this will signal an initial setup of the variables
 */
const onFirstRender = async (topLine, nextLine) => {
    atVars.isFirstRender = false;

    // We were getting an error where rect_0 or rect_1 were null even though AlphaTab said they were rendered
    // This sets up an interval to keep waiting for them to not be null before moving on with the render process
    const lineReadyID = setInterval(() => {
        if (topLine !== null && nextLine !== null) {
            // stop interval from running
            clearInterval(lineReadyID);

            atVars.texLoaded.setFirstMeasurePosition();

            // Sets up drawing
            initializeFeedbackDrawer(topLine, nextLine);

            if (atVars.sketchBehavior === sketchBehaviors.REAL_TIME_FEEDBACK) {
                // Creates a new p5 instance which we will use for real time feedback during performance
                atVars.p5Obj = new p5(feedbackSketch);
                // setup is called immediately upon creating a new p5 sketch but we need to call it explictly to give it a handle
                // to the drawer that we created. This also signals to actually create an appropriately sized canvas since Alpha Tab
                // is now actually rendered to the dom
                atVars.p5Obj.setup(atVars.drawer);
            } else {
                // Sets up drawing for performance highlighting
                // Creates a new p5 instance which we will use for highlighting during performance overview
                atVars.p5Obj = new p5(performanceSketch);
                // setup is called immediately upon creating a new p5 sketch but we need to call it explictly to give it a handle
                // to the drawer that we created. This also signals to actually create an appropriately sized canvas since Alpha Tab
                // is now actually rendered to the dom
                atVars.p5Obj.setup(atVars.drawer);
            }
        } else {
            // keeps trying to retrieve the top line and next line of the Alpha Tab music until they are loaded in the dom
            topLine = document.getElementById("rect_0");
            nextLine = document.getElementById("rect_1");
        }
    }, 500);
};

/**
 * Creates an instance of the of the the drawer
 * @param {object} topLine - The top line DOM element
 * @param {object} nextLine - The next line DOM element
 */
const initializeFeedbackDrawer = (topLine, nextLine) => {
    const { topLineHeight, distanceBetweenLines } = getSheetMusicLedgerHeights(
        topLine,
        nextLine
    );
    // Creates a new drawer using the top line height, distance between lines, and start octave of the music to decide
    // how high to draw the notes for feedback
    atVars.drawer = new Drawer(
        topLineHeight + 1,
        distanceBetweenLines,
        atVars.texLoaded.getStartOctave()
    );
};

/**
 * Stops playing the music
 * Shuts off pitch detection (this does not turn the microphone off)
 * Resets the sheet music (this is due to pagination)
 */
const stopPlayingMusic = () => {
    // Stops the pitch detection
    stopPitchDetection(store.getState().practice.selectedSheetMusicId);

    // Changes player state to stopped
    atVars.playerState = playerStates.STOPPED;

    // Resets the sheet music back to the beginning
    resetSheetMusic();
};

/**
 * Gets the top line height and distance between ledger lines based on the sheet music
 * @param {object} topLine
 * @param {object} nextLine
 * @returns - An object containing the top line height and distance between lines
 */
const getSheetMusicLedgerHeights = (topLine, nextLine) => {
    // Retrieves the height of the staff lines based on a relative offset to their wrapping contanier
    // Used to setup the p5Obj canvas so the canvas needs to be directly on top of the alphaTab container where these are stored
    const topLineHeight = topLine.y.animVal.value;
    return {
        topLineHeight: topLine.y.animVal.value,
        distanceBetweenLines: nextLine.y.animVal.value - topLineHeight,
    };
};

/**
 * Clears the p5 drawing for real-time feedback
 * Resets the sheet music back to the beginning
 */
const resetSheetMusic = () => {
    // Clears the p5 drawing
    atVars.p5Obj.clear();

    // Resets the sheet music
    atVars.api.settings.display.startBar = 1;
    atVars.api.settings.display.barCount = atVars.barCount;
    atVars.api.updateSettings();
    atVars.api.render();

    // Resets the progress through expected performance
    atVars.noteStreamIndex = 0;
    atVars.cumulativeTime = 0;
};
