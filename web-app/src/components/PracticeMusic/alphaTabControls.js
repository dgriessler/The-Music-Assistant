import player from "./default.sf2";
import PitchDetection from "./PitchDetection";
import p5 from "p5";
import Drawer from "./Drawer";
import NoteList from "./NoteList";
import p5Sketch from "./sketch";
import {
    getSpecificSheetMusic,
    getPartSheetMusic,
    getExercise,
    userGetsFeedback,
    getSinglePartSheetMusic
} from "../../../App/musicAssistantApi";
import TexLoaded from "./TexLoaded";
import * as logs from "../../../vendors/Firebase/logs";
import { store } from "../../../store/reduxSetup";
import * as highlightingOptions from "./highlightingOptions";
import * as musicPlayerStates from "./musicPlayerStates";

// TODO: Small comment for each variable
let api; // AlphaTab API
let p5Obj;
let noteStream;
let noteStreamIndex;
let cumulativeTime;
let texLoaded;
let renderedOnce;
let barCount; // Number of bars to display at one time
let resetDrawPositions;
let drawer;
let noteList;
let highlightMeasures;
let playerState;
let getsFeedback; // Boolean indicating whether or not the user gets feedback
let sheetMusicLength;

/**
 * Initializes the AlphaTab API
 * Displays the piece of music on the screen
 */
export const initializeAPI = () => {
    setInitialVariableValues();

    // AlphaTab API settings
    let settings = {
        player: {
            enablePlayer: true,
            enableCursor: true,
            soundFont: player,
            scrollElement: "#wrapper"
        },
        display: {
            layoutMode: "horizontal",
            startBar: 1,
            barCount
        }
    };

    // Creates the AlphaTab API
    api = new window.alphaTab.platform.javaScript.AlphaTabApi(
        document.querySelector("#alpha-tab-container"),
        settings
    );

    // Listener executed when AlphaTab is rendered on the screen
    api.addPostRenderFinished(alphaTabPostRenderFinished);

    // Listener executed when the player state changes (e.g. play, pause, and stop)
    api.addPlayerStateChanged(alphaTabPlayerStateChanged);

    // Listener executed when the player finishes playing the song
    api.addPlayerFinished(alphaTabPlayerFinished);
};

/**
 * Sets global file variables to their initial values
 */
const setInitialVariableValues = () => {
    api = null;
    p5Obj = null;
    noteStream = [-1, 0];
    noteStreamIndex = 0;
    cumulativeTime = 0;
    texLoaded = null;
    renderedOnce = false;
    barCount = 20;
    resetDrawPositions = true;
    drawer = null;
    noteList = null;
    highlightMeasures = highlightingOptions.HIGHLIGHT_OFF;
    playerState = 0;
    getsFeedback = false;
    sheetMusicLength = null;
};

/**
 * Run when AlphaTab is rendered on the screen
 */
const alphaTabPostRenderFinished = () => {
    checkIfUserGetsFeedback();
    // Retrieves staff lines using IDs attacked to elements generated by AlphaTab. Required editing AlphaTab.js directly
    let topLine = document.getElementById("rect_0");
    let nextLine = document.getElementById("rect_1");
    x1(topLine, nextLine);
    x2(topLine, nextLine);
};

/**
 * TODO: Comments needed
 */
const alphaTabPlayerStateChanged = () => {
    // TODO: Why is one check != and the other ==
    if (
        api.playerState !== musicPlayerStates.PLAYING &&
        playerState === musicPlayerStates.PLAYING
    ) {
        stopPlayingMusic();
        resetSheetMusic();
    } else if (
        api.playerState === musicPlayerStates.PLAYING &&
        playerState === musicPlayerStates.STOPPED
    ) {
        startPlayingMusic();
    } else if (playerState === musicPlayerStates.PAGE_CHANGED) {
        stopPlayingMusic();
    }
    // TODO: What about an else statement?
};

/**
 * TODO: Comments needed
 */
const startPlayingMusic = () => {
    resetDrawPositions = true;
    playerState = 1;
    try {
        let topLine = document.getElementById("rect_0");
        let nextLine = document.getElementById("rect_1");
        const topLineHeight = topLine.y.animVal.value;

        const distanceBetweenLines = nextLine.y.animVal.value - topLineHeight;
        drawer.setTopLineAndDistanceBetween(
            topLineHeight + 1,
            distanceBetweenLines,
            texLoaded.getStartOctave()
        );
    } catch (error) {
        logs.sheetMusicError(null, error, "[alphaTabControls/alphaTabPlayerStateChanged]");
    }

    api.playbackRange = null;
    api.timePosition = 0;

    // Runs the pitch detection model on microphone input and displays it on the screen
    // TODO: Don't show player controls (e.g. play and pause buttons) until AlphaTab and ML5 are ready
    PitchDetection.startPitchDetection();
};

/**
 * TODO: Comments needed
 */
const stopPlayingMusic = () => {
    PitchDetection.stopPitchDetection(store.getState().practice.selectedSheetMusicId);
    playerState = 0;

    resetSheetMusic();
};

/**
 * TODO: Comments needed
 */
const resetSheetMusic = () => {
    p5Obj.clear();
    api.settings.display.startBar = 1;
    api.settings.display.barCount = 20;
    api.updateSettings();
    api.render();

    noteStreamIndex = 0;
    cumulativeTime = 0;
};

/**
 * Checks if the user gets feedback
 * This is used for user testing
 */
const checkIfUserGetsFeedback = () => {
    // TODO: Why do we need to check if the player is playing?
    if (playerState !== musicPlayerStates.PLAYING) {
        userGetsFeedback({ sheetMusicId: store.getState().practice.selectedSheetMusicId })
            .then(response => {
                getsFeedback = response.data.gets_feedback;
            })
            .catch(error => {
                logs.sheetMusicError(null, error, "[alphaTabControls/alphaTabRenderFinished]");
            });
    }
};

/**
 * TODO: This code needs more comments
 * Once commented, we can split the code up more
 */
const x1 = (topLine, nextLine) => {
    if (this.renderedOnce) {
        // Retrieves the height of the staff lines based on a relative offset to their wrapping contanier
        // Used to set up the canvas so the canvas needs to be directly on top of the alphaTab container where these are stored
        const topLineHeight = topLine.y.animVal.value;
        const distanceBetweenLines = nextLine.y.animVal.value - topLineHeight;
        drawer.setTopLineAndDistanceBetween(
            topLineHeight + 1,
            distanceBetweenLines,
            texLoaded.getStartOctave()
        );

        let barCursor = document.querySelector(".at-cursor-bar");
        texLoaded.firstBarMeasurePosition = {
            left: parseInt(barCursor.style.left.substring(0, barCursor.style.left.length - 2), 10),
            top: parseInt(barCursor.style.top.substring(0, barCursor.style.left.length - 2), 10),
            width: parseInt(
                barCursor.style.width.substring(0, barCursor.style.left.length - 2),
                10
            ),
            height: parseInt(
                barCursor.style.height.substring(0, barCursor.style.left.length - 2),
                10
            )
        };

        let aTS = document.getElementById("aTS");
        p5Obj.resizeCanvas(aTS.clientWidth, aTS.clientHeight);

        if (highlightMeasures === highlightingOptions.HIGHLIGHT_PENDING_START) {
            startHighlighting();
        } else if (highlightMeasures === highlightingOptions.HIGHLIGHT_PENDING_STOP) {
            stopHighlighting();
        }
        return;
    } else {
        renderedOnce = true;
        highlightMeasures = highlightingOptions.HIGHLIGHT_OFF;
    }
};

/**
 * TODO: This code needs more comments
 * Once commented,we can split the code up more
 */
const x2 = (topLine, nextLine) => {
    // We were getting an error where rect_0 or rect_1 were null even though AlphaTab said they were rendered
    // This sets up an interval to keep waiting for them to not be null before moving on with the render process
    const lineReadyID = setInterval(() => {
        if (topLine !== null && nextLine !== null) {
            // stop interval from running
            clearInterval(lineReadyID);

            // Retrieves the height of the staff lines based on a relative offset to their wrapping contanier
            // Used to setup the canvas so the canvas needs to be directly on top of the alphaTab container where these are stored
            const topLineHeight = topLine.y.animVal.value;
            const distanceBetweenLines = nextLine.y.animVal.value - topLineHeight;

            let barCursor = document.getElementsByClassName("at-cursor-bar")[0];
            texLoaded.firstBarMeasurePosition = {
                left: parseInt(
                    barCursor.style.left.substring(0, barCursor.style.left.length - 2),
                    10
                ),
                top: parseInt(
                    barCursor.style.top.substring(0, barCursor.style.left.length - 2),
                    10
                ),
                width: parseInt(
                    barCursor.style.width.substring(0, barCursor.style.left.length - 2),
                    10
                ),
                height: parseInt(
                    barCursor.style.height.substring(0, barCursor.style.left.length - 2),
                    10
                )
            };

            // Creates a new drawer
            drawer = new Drawer(
                topLineHeight + 1,
                distanceBetweenLines,
                texLoaded.getStartOctave()
            );

            p5Obj = new p5(p5Sketch);
            p5Obj.setup(drawer);

            // Prepares for microphone input sets up the pitch detection model
            PitchDetection.setupPitchDetection().catch(error => {
                logs.sheetMusicError(null, error, "[alphaTabControls/alphaTabRenderFinished]");
            });
        } else {
            topLine = document.getElementById("rect_0");
            nextLine = document.getElementById("rect_1");
        }
    }, 500);
};

/**
 * Assumes destroys api if initialized, destroys p5Obj if initialized, stops microphone input if on
 */
export const destroy = () => {
    if (playerState === musicPlayerStates.PLAYING) {
        // Stops the player
        playerState = musicPlayerStates.PAGE_CHANGED;
        api.stop();
    }

    // Returns a promise that waits for AlphaTab to stop playing
    return new Promise(resolve => {
        // Waits for the player state to change before destroying the api
        const intervalId = setInterval(() => {
            if (playerState === 0) {
                // Stops the interval
                clearInterval(intervalId);

                if (PitchDetection.micStream && PitchDetection.micStream !== null) {
                    // Ends pitch detection
                    PitchDetection.endPitchDetection();
                }
                if (api !== null) {
                    // Destroys the AlphaTab api
                    api.destroy();
                }
                if (p5Obj !== null) {
                    // Removes the p5 canvas
                    p5Obj.remove();
                }

                // Resets the global file variable values
                setInitialVariableValues();

                // Resolves the promise
                resolve();
            }
        }, 500);
    });
};

/**
 * Resets the time back to the beginning of the song and our tracker points at the beginning of the piece again
 */
const alphaTabPlayerFinished = () => {
    noteStreamIndex = 0;
    cumulativeTime = 0;
};

/**
 * TODO: Comments needed
 * @param {string} partName - The part name to change to
 */
export const changePart = partName => {
    let trackNumber = parseInt(partName.substring(1), 10);
    if (!texLoaded.currentTrackIndexes.includes(trackNumber)) {
        texLoaded.updateCurrentTrackIndexes(trackNumber);

        api.renderTracks([api.score.tracks[texLoaded.currentTrackIndexes[0]]]);

        let data = {
            sheetMusicId: store.getState().practice.selectedSheetMusicId,
            partName: texLoaded.partNames[trackNumber]
        };
        getPartSheetMusic(data)
            .then(response => {
                noteStream = response.data.performance_expectation;
                noteList.updateBounds(response.data.lower_upper[0], response.data.lower_upper[1]);
                texLoaded.typeOfTex = "Sheet Music";
            })
            .catch(error => {
                logs.sheetMusicError(
                    error.response.status,
                    error.response.data,
                    "[alphaTabControls/changePart]"
                );
            });
    }
};

/**
 * TODO: Comments needed
 */
const startHighlighting = () => {
    highlightMeasures = highlightingOptions.HIGHLIGHT_ON;
    p5Obj.loop();
};

/**
 * TODO: Comments needed
 */
const stopHighlighting = () => {
    highlightMeasures = highlightingOptions.HIGHLIGHT_OFF;
    p5Obj.noLoop();
    p5Obj.redraw();
};

/**
 * TODO: Comments needed
 * @param {*} value
 * @param {*} measureStart
 * @param {*} measureEnd
 */
export const changeMusic = async (value, measureStart, measureEnd) => {
    if (this.texLoaded !== null && value === this.texLoaded.typeOfTex) {
        return;
    } else {
        if (value === "sheetMusic") {
            highlightMeasures = highlightingOptions.HIGHLIGHT_PENDING_STOP;
            api.settings.display.barCount = barCount;
            api.updateSettings();
            await loadTex();
        } else if (value === "myPart") {
            highlightMeasures = highlightingOptions.HIGHLIGHT_PENDING_STOP;
            api.settings.display.barCount = barCount;
            api.updateSettings();
            await this.loadJustMyPart();
        } else if (value === "performance") {
            highlightMeasures = highlightingOptions.HIGHLIGHT_PENDING_START;
            api.settings.display.barCount = sheetMusicLength !== null ? sheetMusicLength : barCount;
            api.updateSettings();
            await loadTex();
        } else if (value === "exercise" && measureStart && measureEnd) {
            highlightMeasures = highlightingOptions.HIGHLIGHT_PENDING_STOP;
            api.settings.display.barCount = barCount;
            api.updateSettings();
            await loadExercise(measureStart, measureEnd);
        } else {
            console.log("not recognized: ", value);
        }
    }
};

/**
 * TODO: Comments needed
 * @param {*} currentPosition
 * @param {*} currentMeasure
 * @param {*} measureToLength
 */
export const timeToMeasureNumber = (currentPosition, currentMeasure, measureToLength) => {
    const EPSILON = 0.01;
    let tempCurrentPosition = currentPosition;
    let tempCurrentMeasure = currentMeasure;
    while (tempCurrentPosition > EPSILON) {
        tempCurrentPosition -= measureToLength[tempCurrentMeasure - 1];
        tempCurrentMeasure++;
    }
    return tempCurrentMeasure;
};

/**
 * TODO: Comments needed
 */
export const getPlaybackRange = () => {
    const measureToLength = texLoaded.measureLengths;
    let playbackMeasures = null;
    if (measureToLength !== null) {
        if (api.playbackRange !== null) {
            playbackMeasures = [];
            let currentPosition = api.timePosition / 1000;
            let comparePosition = currentPosition;
            if (currentPosition === 0) {
                api.timePosition = measureToLength[0];
                comparePosition = api.tickPosition;
            }
            let ratio = api.tickPosition / comparePosition;
            let targetEndTime =
                api.playbackRange.endTick / ratio - api.playbackRange.startTick / ratio;
            let currentMeasure = 1;
            currentMeasure = this.timeToMeasureNumber(
                currentPosition,
                currentMeasure,
                measureToLength
            );
            playbackMeasures.push(currentMeasure);

            currentPosition = targetEndTime;
            currentMeasure = this.timeToMeasureNumber(
                currentPosition,
                currentMeasure,
                measureToLength
            );
            playbackMeasures.push(currentMeasure - 1);
        }
    }
    return playbackMeasures;
};

// /**
//  * TODO: Comments needed
//  * @param {*} isChecked
//  * @param {*} name
//  */
// const changeTrackVolume = (isChecked, name) => {
//     if (texLoaded) {
//         let partIndex = texLoaded.partNames.indexOf(name);
//         if (partIndex > -1) {
//             texLoaded.mutedTracks[partIndex] = !isChecked;
//             let muteTrackList = [];
//             let playTrackList = [];
//             for (let i = 0; i < texLoaded.mutedTracks.length; i++) {
//                 if (texLoaded.mutedTracks[i]) {
//                     muteTrackList.push(i);
//                 } else {
//                     playTrackList.push(i);
//                 }
//             }
//             // api.changeTrackMute(muteTrackList, true);
//             // api.changeTrackMute(playTrackList, false);
//             api.changeTrackMute([partIndex], !isChecked)
//         }
//     }
// }

/**
 * TODO: Comments needed
 */
export const loadJustMyPart = async () => {
    let texToDisplay = document.getElementById("texToDisplay");
    texToDisplay.options[3] = null;

    try {
        const singlePartResponse = await getSinglePartSheetMusic({
            sheetMusicId: store.getState().practice.selectedSheetMusicId
        });
        texLoaded.update(
            "Sheet Music",
            singlePartResponse.data.part_list,
            singlePartResponse.data.clefs,
            singlePartResponse.data.part,
            null,
            1,
            1
        );
        texLoaded.updateCurrentTrackIndexes(0);
        api.tex(singlePartResponse.data.sheet_music, texLoaded.currentTrackIndexes);

        this.updateDropdown(singlePartResponse.data.part_list);

        noteStream = singlePartResponse.data.performance_expectation;
        noteList.clear();
        noteList.updateBounds(
            singlePartResponse.data.lower_upper[0],
            singlePartResponse.data.lower_upper[1]
        );
        texLoaded.setMeasureLengths(singlePartResponse.data.measure_lengths, barCount);
        sheetMusicLength = texLoaded.measureLengths.length;
        texLoaded.updateLengthsPerSection(1, texLoaded.measureLengths.length + 1, barCount);
        texLoaded.typeOfTex = "Sheet Music";
    } catch (error) {
        logs.sheetMusicError(
            error.response.status,
            error.response.data,
            "[alphaTabControls/loadJustMyPart]"
        );
    }
};

/**
 * TODO: Comments needed
 */
const loadExercise = async (measureStart, measureEnd) => {
    let texToDisplay = document.getElementById("texToDisplay");
    texToDisplay.options[3] = new Option("Exercise", "exercise", false, true);

    let data = {
        sheetMusicId: store.getState().practice.selectedSheetMusicId,
        trackNumber: texLoaded.currentTrackIndexes[0] + 1,
        staffNumber: 1,
        measureStart,
        measureEnd,
        isDurationExercise: false
    };

    const exerciseResponse = await getExercise(data);
    try {
        texLoaded.update(
            "Exercise",
            exerciseResponse.data.part_list,
            exerciseResponse.data.clefs,
            exerciseResponse.data.part,
            exerciseResponse.data.exerciseId,
            measureStart,
            measureEnd
        );
        api.tex(exerciseResponse.data.sheet_music, texLoaded.currentTrackIndexes);

        this.updateDropdown(exerciseResponse.data.part_list);

        noteStream = exerciseResponse.data.performance_expectation;
        noteList.clear();
        noteList.updateBounds(
            exerciseResponse.data.lower_upper[0],
            exerciseResponse.data.lower_upper[1]
        );
        texLoaded.setMeasureLengths(exerciseResponse.data.measure_lengths, barCount);
    } catch (error) {
        logs.sheetMusicError(
            error.response.status,
            error.response.data,
            "[alphaTabControls/loadExercise]"
        );
    }
};

/**
 * TODO: This function likely will be removed when UI updates are made
 */
export const updateDropdown = partList => {
    // TODO: Once track muting is fixed, uncomment to re add it
    // let trackVolume = document.getElementById("volumeTracks");
    // const numberOfChildren = trackVolume.children.length;
    // for (let i = 0; i < numberOfChildren; i++) {
    //     trackVolume.removeChild(trackVolume.lastElementChild);
    // }
    let sheetMusicPartDropdown = document.getElementById("sheetMusicPart");
    if (sheetMusicPartDropdown) {
        let i = 0;
        for (; i < partList.length; i++) {
            sheetMusicPartDropdown.options[i] = new Option(partList[i], "t" + i, false, false);

            // const newTrackVolume = document.createElement('li');
            // const x = document.createElement("INPUT");
            // x.setAttribute("type", "checkbox");
            // x.checked = true;
            // newTrackVolume.appendChild(x);
            // newTrackVolume.appendChild(document.createTextNode(partList[i]));
            // newTrackVolume.onclick = function() {
            //     changeTrackVolume(this.children[0].checked, this.innerText);
            // };
            // trackVolume.appendChild(newTrackVolume);
        }
        let optionsLength = sheetMusicPartDropdown.options.length;
        let lastIndex = i;
        for (; i < optionsLength; i++) {
            sheetMusicPartDropdown.options[lastIndex] = null;
        }
    }
};

/**
 * TODO: Comments needed
 */
const loadTex = async () => {
    let texToDisplay = document.getElementById("texToDisplay");
    texToDisplay.options[3] = null;

    let data = {
        sheetMusicId: store.getState().practice.selectedSheetMusicId
    };

    try {
        const sheetMusicResponse = await getSpecificSheetMusic(data);
        let partList = sheetMusicResponse.data.part_list;
        if (texLoaded === null) {
            texLoaded = new TexLoaded(
                "Sheet Music",
                partList,
                sheetMusicResponse.data.clefs,
                sheetMusicResponse.data.part,
                null,
                1,
                1,
                store.getState().practice.selectedSheetMusicId
            );
        } else {
            texLoaded.update(
                "Sheet Music",
                partList,
                sheetMusicResponse.data.clefs,
                sheetMusicResponse.data.part,
                null,
                1,
                1
            );
        }

        this.updateDropdown(partList);

        for (let i = 0; i < partList.length; i++) {
            if (partList[i] === texLoaded.myPart) {
                texLoaded.updateCurrentTrackIndexes(i);
                let sheetMusicPartDropdown = document.getElementById("sheetMusicPart");
                if (sheetMusicPartDropdown) {
                    sheetMusicPartDropdown[i].selected = true;
                }
                break;
            }
        }

        api.tex(sheetMusicResponse.data.sheet_music, texLoaded.currentTrackIndexes);

        data.partName = sheetMusicResponse.data.part_list[texLoaded.currentTrackIndexes[0]];

        const partResponse = await getPartSheetMusic(data);
        noteStream = partResponse.data.performance_expectation;
        noteList = new NoteList(0);

        noteList.updateBounds(partResponse.data.lower_upper[0], partResponse.data.lower_upper[1]);
        texLoaded.setMeasureLengths(partResponse.data.measure_lengths, barCount);
        sheetMusicLength = texLoaded.measureLengths.length;
        texLoaded.updateLengthsPerSection(1, texLoaded.measureLengths.length + 1, barCount);
        texLoaded.typeOfTex = "Sheet Music";
    } catch (error) {
        logs.sheetMusicError(
            error.response.status,
            error.response.data,
            "[alphaTabControls/loadTex]"
        );
    }
};
