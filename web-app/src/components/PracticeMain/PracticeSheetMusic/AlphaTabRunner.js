// ----------------------------------------------------------------------------
// File Path: src/components/PracticeMain/PracticeSheetMusic/AlphaTabRunner.js
// Description: TODO: Write a description
// Author: Daniel Griessler
// Email: dgriessler20@gmail.com
// Created Date: 11/15/2019
// ----------------------------------------------------------------------------

// https://docs.alphatab.net/develop/  for development Documentation

import player from "./default.sf2";
import PitchDetection from "./PitchDetection";
import p5 from "p5";
import Drawer from "./Drawer";
import NoteList from "./NoteList";
import p5Sketch from "./sketch";
import { getSpecificSheetMusic, getPartSheetMusic, getExercise, userGetsFeedback } from "../../../App/musicAssistantApi";
import TexLoaded from "./TexLoaded";

/**
 * Runs AlphaTab including initialization and keeping a Drawer and NoteList instance
 */
class AlphaTabRunner {
    static HIGHLIGHT_OFF = 0;
    static HIGHLIGHT_ON = 1;
    static HIGHLIGHT_PENDING_START = 2;
    static HIGHLIGHT_PENDING_STOP = 3;

    api;
    intervalID;
    drawer;
    noteList;
    p5Obj;
    texLoaded;
    partNames;
    renderedOnce;
    playerState;
    getsFeedback;

    /**
     * Initializes the AlphaTab API
     * Displays the piece of music on the screen
     */
    static initializeAPI() {
        this.noteStream = [-1,0];
        this.noteStreamIndex = 0;
        this.cumulativeTime = 0;
        this.p5Obj = null;
        this.texLoaded = null;
        this.renderedOnce = false;
        this.barCount = 20;
        this.resetDrawPositions = true;

        // AlphaTab API settings
        let settings = {
            "player":{
                "enablePlayer":true,
                enableCursor: true,
                soundFont: player,
                scrollElement: "#wrapper"
            },
            "display": {
                layoutMode: "horizontal",
                barCount: AlphaTabRunner.barCount,
                startBar: 1
            }
        };

        // Creates the AlphaTab API
        this.api = new window.alphaTab.platform.javaScript.AlphaTabApi(
            document.querySelector("#alpha-tab-container"),
            settings
        );

        // Listener is executed when AlphaTab is rendered on the screen
        this.api.addPostRenderFinished(() => {
            this.alphaTabRenderFinished();
        });

        // Listener is executed when the player state changes (e.g. play, pause, and stop)
        this.api.addPlayerStateChanged(() => {
            this.alphaTabPlayerStateChanged();
        });

        // Listener is executed when the player finishes playing the song
        this.api.addPlayerFinished(() => {
            this.alphaTabPlayerFinished();
        });

        this.highlightMeasures = AlphaTabRunner.HIGHLIGHT_OFF;
        this.playerState = 0;
        this.getsFeedback = false;
    }

    /**
     * Run when AlphaTab is rendered on the screen
     * TODO: Fix so that it updates the variables on subsequent alphaTab renders besides the first one
     */
    static alphaTabRenderFinished() {
        if (AlphaTabRunner.playerState !== 1) {
            const data = {
                sheetMusicId: "5050284854B611EAAEC302F168716C78"
            }
            userGetsFeedback(data).then((response) => {
                AlphaTabRunner.getsFeedback = response.data["gets_feedback"];
            }).catch((error) => {
                console.log("getsfeedback", error);
            });
        }
        
        // Retrieves staff lines using IDs attacked to elements generated by AlphaTab. Required editing AlphaTab.js directly
        let topLine = document.getElementById("rect_0");
        let nextLine = document.getElementById("rect_1");
        if (this.renderedOnce) {
            // retrieves the height of the staff lines based on a relative offset to their wrapping contanier
            // used to setup the canvas so the canvas needs to be directly on top of the alphaTab container where these are stored
            const topLineHeight = topLine.y.animVal.value;
            const distanceBetweenLines = nextLine.y.animVal.value - topLineHeight;
            AlphaTabRunner.drawer.setTopLineAndDistanceBetween(topLineHeight + 1, distanceBetweenLines, AlphaTabRunner.texLoaded.getStartOctave());

            let barCursor = document.getElementsByClassName("at-cursor-bar")[0];
            AlphaTabRunner.texLoaded.firstBarMeasurePosition = {
                left: parseInt(barCursor.style.left.substring(0,barCursor.style.left.length - 2), 10),
                top: parseInt(barCursor.style.top.substring(0,barCursor.style.left.length - 2), 10),
                width: parseInt(barCursor.style.width.substring(0,barCursor.style.left.length - 2), 10),
                height: parseInt(barCursor.style.height.substring(0,barCursor.style.left.length - 2),10)
            };

            if (AlphaTabRunner.highlightMeasures === AlphaTabRunner.HIGHLIGHT_PENDING_START) {
                this.startHighlighting();
            } else if (AlphaTabRunner.highlightMeasures === AlphaTabRunner.HIGHLIGHT_PENDING_STOP) {
                this.stopHighlighting();
            }
            return;
        } else {
            this.renderedOnce = true;
        }

        // We were getting an error where rect_0 or rect_1 were null even though AlphaTab said they were rendered
        // This sets up an interval to keep waiting for them to not be null before moving on with the render process
        const lineReadyID = setInterval(() => {
            if (topLine !== null && nextLine !== null) {
                // stop interval from running
                clearInterval(lineReadyID);

                // retrieves the height of the staff lines based on a relative offset to their wrapping contanier
                // used to setup the canvas so the canvas needs to be directly on top of the alphaTab container where these are stored
                const topLineHeight = topLine.y.animVal.value;
                const distanceBetweenLines = nextLine.y.animVal.value - topLineHeight;

                let barCursor = document.getElementsByClassName("at-cursor-bar")[0];
                AlphaTabRunner.texLoaded.firstBarMeasurePosition = {
                    left: parseInt(barCursor.style.left.substring(0,barCursor.style.left.length - 2), 10),
                    top: parseInt(barCursor.style.top.substring(0,barCursor.style.left.length - 2), 10),
                    width: parseInt(barCursor.style.width.substring(0,barCursor.style.left.length - 2), 10),
                    height: parseInt(barCursor.style.height.substring(0,barCursor.style.left.length - 2),10)
                };

                // Creates a new drawer
                AlphaTabRunner.drawer = new Drawer(topLineHeight + 1, distanceBetweenLines, AlphaTabRunner.texLoaded.getStartOctave());
                
                AlphaTabRunner.p5Obj = new p5(p5Sketch);
                AlphaTabRunner.p5Obj.setup(AlphaTabRunner.drawer);

                // Prepares for microphone input sets up the pitch detection model
                PitchDetection.setupPitchDetection().then(() => {
                    console.log("[info][AlphaTabRunner] Pitch Detection is ready");
                }).catch(err => {
                    console.log(err);
                });
            } else {
                topLine = document.getElementById("rect_0");
                nextLine = document.getElementById("rect_1");
            }
        }, 3);
    }

    static alphaTabPlayerStateChanged() {
        if (AlphaTabRunner.api.playerState !== 1 && AlphaTabRunner.playerState === 1) {
            PitchDetection.stopPitchDetection(this.intervalID, "5050284854B611EAAEC302F168716C78");
            AlphaTabRunner.playerState = 0;

            p5.clear();
            AlphaTabRunner.api.settings.display.startBar = 1;
            AlphaTabRunner.api.updateSettings();
            AlphaTabRunner.api.render();

            AlphaTabRunner.noteStreamIndex = 0;
            AlphaTabRunner.cumulativeTime = 0;
        } else if (AlphaTabRunner.playerState === 0) {
            this.resetDrawPositions = true;
            AlphaTabRunner.playerState = 1;
            try {
                let topLine = document.getElementById("rect_0");
                let nextLine = document.getElementById("rect_1");
                const topLineHeight = topLine.y.animVal.value;

                const distanceBetweenLines = nextLine.y.animVal.value - topLineHeight;
                AlphaTabRunner.drawer.setTopLineAndDistanceBetween(topLineHeight + 1, distanceBetweenLines, AlphaTabRunner.texLoaded.getStartOctave());
            } catch(error) {
                console.log(error);
            }

            AlphaTabRunner.api.playbackRange = null;
            AlphaTabRunner.api.timePosition = 0;

            // Runs the pitch detection model on microphone input and displays it on the screen
            // TODO: Don't show player controls (e.g. play and pause buttons) until AlphaTab and ML5 are ready
            this.intervalID = PitchDetection.startPitchDetection();
        }
    }

    static alphaTabPlayerFinished() {
        // resets the time back to the beginning of the song and our tracker points at the beginning of the piece again
        // TODO: Fix confusion when playing/pausing quickly
        PitchDetection.stopPitchDetection(this.intervalID, "5050284854B611EAAEC302F168716C78");
        AlphaTabRunner.playerState = 0;

        p5.clear();
        AlphaTabRunner.api.settings.display.startBar = 1;
        AlphaTabRunner.api.updateSettings();
        AlphaTabRunner.api.render();
        AlphaTabRunner.noteStreamIndex = 0;
        AlphaTabRunner.cumulativeTime = 0;
    }

    static changePart(value) {
        let trackNumber = parseInt(value.substring(1), 10);
        if (!AlphaTabRunner.texLoaded.currentTrackIndexes.includes(trackNumber)) {
            AlphaTabRunner.texLoaded.updateCurrentTrackIndexes(trackNumber);
            
            AlphaTabRunner.api.renderTracks(
                [AlphaTabRunner.api.score.tracks[AlphaTabRunner.texLoaded.currentTrackIndexes[0]]]
            );

            let data = {
                sheetMusicId: "5050284854B611EAAEC302F168716C78",
                partName: AlphaTabRunner.texLoaded.partNames[trackNumber]
            };
            getPartSheetMusic(data).then((response) => {
                AlphaTabRunner.noteStream = response.data.performance_expectation;
                AlphaTabRunner.noteList.updateBounds(response.data.lower_upper[0], response.data.lower_upper[1]);
                AlphaTabRunner.texLoaded.typeOfTex = 'Sheet Music';
            }).catch((error) => {
                console.log("error", error);
            });
        }
    }

    static startHighlighting() {
        AlphaTabRunner.highlightMeasures = AlphaTabRunner.HIGHLIGHT_ON;
        p5.loop();
    }

    static stopHighlighting() {
        AlphaTabRunner.highlightMeasures = AlphaTabRunner.HIGHLIGHT_OFF;
        p5.noLoop();
        p5.redraw();
    }

    static changeMusic(value, measureStart, measureEnd) {
        if (this.texLoaded === null || value === this.texLoaded) {
            return;
        } else {
            if (value === "sheetMusic") {
                AlphaTabRunner.highlightMeasures = AlphaTabRunner.HIGHLIGHT_PENDING_STOP;
                AlphaTabRunner.loadTex();
            } else if (value === "performance") {
                if (AlphaTabRunner.texLoaded.typeOfTex === 'Exercise') {
                    AlphaTabRunner.highlightMeasures = AlphaTabRunner.HIGHLIGHT_PENDING_START;
                    AlphaTabRunner.loadTex();
                } else {
                    this.startHighlighting();
                }
            } else if (value === "exercise" && measureStart && measureEnd) {
                AlphaTabRunner.highlightMeasures = AlphaTabRunner.HIGHLIGHT_PENDING_STOP;
                AlphaTabRunner.loadExercise(measureStart, measureEnd);
            } else {
                console.log("not recognized: ", value);
            }
        }
    }

    static timeToMeasureNumber(currentPosition, currentMeasure, measureToLength) {
        const EPSILON = 0.01;
        let tempCurrentPosition = currentPosition;
        let tempCurrentMeasure = currentMeasure;
        while (tempCurrentPosition > EPSILON) {
            tempCurrentPosition -= measureToLength[tempCurrentMeasure - 1];
            tempCurrentMeasure++;
        }
        return tempCurrentMeasure;
    }

    static getPlaybackRange() {
        const measureToLength = AlphaTabRunner.texLoaded.measureLengths;
        let playbackMeasures = null;
        if (measureToLength !== null) { 
            if (AlphaTabRunner.api.playbackRange !== null) {
                // TODO: figure out how to switch if the endTick is less than the startTick
                // let startTick = AlphaTabRunner.api.playbackRange.startTick;
                // let endTick = AlphaTabRunner.api.playbackRange.endTick;
                // if (endTick < startTick) {
                //     let temp = startTick;
                //     startTick = endTick;
                //     endTick = temp;
                // }

                playbackMeasures = [];
                let currentPosition = AlphaTabRunner.api.timePosition / 1000;
                let comparePosition = currentPosition;
                if (currentPosition === 0) {
                    AlphaTabRunner.api.timePosition = measureToLength[0];
                    comparePosition = AlphaTabRunner.api.tickPosition;
                }
                let ratio = AlphaTabRunner.api.tickPosition / comparePosition;
                let targetEndTime = (AlphaTabRunner.api.playbackRange.endTick / ratio) - currentPosition;
                let currentMeasure = 1;
                currentMeasure = this.timeToMeasureNumber(currentPosition, currentMeasure, measureToLength);
                playbackMeasures.push(currentMeasure);

                currentPosition = targetEndTime;
                currentMeasure = this.timeToMeasureNumber(currentPosition, currentMeasure, measureToLength);
                playbackMeasures.push(currentMeasure - 1);
            }
        }
        return playbackMeasures;
    }

    // static changeTrackVolume(isChecked, name) {
    //     if (AlphaTabRunner.texLoaded) {
    //         let partIndex = AlphaTabRunner.texLoaded.partNames.indexOf(name);
    //         if (partIndex > -1) {
    //             AlphaTabRunner.texLoaded.mutedTracks[partIndex] = !isChecked;
    //             let muteTrackList = [];
    //             let playTrackList = [];
    //             for (let i = 0; i < AlphaTabRunner.texLoaded.mutedTracks.length; i++) {
    //                 if (AlphaTabRunner.texLoaded.mutedTracks[i]) {
    //                     muteTrackList.push(i);
    //                 } else {
    //                     playTrackList.push(i);
    //                 }
    //             }
    //             // AlphaTabRunner.api.changeTrackMute(muteTrackList, true);
    //             // AlphaTabRunner.api.changeTrackMute(playTrackList, false);
    //             AlphaTabRunner.api.changeTrackMute([partIndex], !isChecked)
    //         }
    //     }
        
    // }

    static async loadExercise(measureStart, measureEnd) {
        let texToDisplay = document.getElementById("texToDisplay");
        texToDisplay.options[2]=new Option("Exercise", "exercise", false, true);

        let data = {
            sheetMusicId: "5050284854B611EAAEC302F168716C78",
            trackNumber: AlphaTabRunner.texLoaded.currentTrackIndexes[0] + 1,
            staffNumber: 1,
            measureStart,
            measureEnd,
            isDurationExercise: false
        }

        getExercise(data).then((response) => {
            AlphaTabRunner.texLoaded.update('Exercise', response.data.part_list, response.data.clefs, response.data.part, response.data.exerciseId, measureStart, measureEnd);
            AlphaTabRunner.api.tex(response.data.sheet_music, AlphaTabRunner.texLoaded.currentTrackIndexes);

            this.updateDropdown(response.data.part_list);

            AlphaTabRunner.noteStream = response.data.performance_expectation;
            AlphaTabRunner.noteList.clear();
            AlphaTabRunner.noteList.updateBounds(response.data.lower_upper[0], response.data.lower_upper[1]);
            AlphaTabRunner.texLoaded.setMeasureLengths(response.data.measure_lengths, AlphaTabRunner.barCount);
        }).catch((error) => {
            console.log("error_e", error);
        });
    }

    static updateDropdown(partList) {
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
                sheetMusicPartDropdown.options[i]=new Option(partList[i], "t" + i, false, false);

                // const newTrackVolume = document.createElement('li');
                // const x = document.createElement("INPUT");
                // x.setAttribute("type", "checkbox");
                // x.checked = true;
                // newTrackVolume.appendChild(x);
                // newTrackVolume.appendChild(document.createTextNode(partList[i]));
                // newTrackVolume.onclick = function() {
                //     AlphaTabRunner.changeTrackVolume(this.children[0].checked, this.innerText);
                // };
                // trackVolume.appendChild(newTrackVolume);
            }
            for (; i < sheetMusicPartDropdown.options.length; i++) {
                sheetMusicPartDropdown.options[i] = null;
            }
        }
    }

    static async loadTex () {      
        let texToDisplay = document.getElementById("texToDisplay");
        texToDisplay.options[2]=null;

        let data = {
            sheetMusicId: "5050284854B611EAAEC302F168716C78"
        }
        getSpecificSheetMusic(data).then((response) => {
            let partList = response.data.part_list;
            if (AlphaTabRunner.texLoaded === null) {
                AlphaTabRunner.texLoaded = new TexLoaded('Sheet Music', partList, response.data.clefs, response.data.part, null, 1, 1);
            } else {
                AlphaTabRunner.texLoaded.update('Sheet Music', partList, response.data.clefs, response.data.part, null, 1, 1);
            }
            
            this.updateDropdown(partList);

            
            for (let i = 0; i < partList.length; i++) {
                if (partList[i] === AlphaTabRunner.texLoaded.myPart) {
                    AlphaTabRunner.texLoaded.updateCurrentTrackIndexes(i);
                    let sheetMusicPartDropdown = document.getElementById("sheetMusicPart");
                    if (sheetMusicPartDropdown) {
                        sheetMusicPartDropdown[i].selected = true;
                    }
                    break;
                }
            }

            AlphaTabRunner.api.tex(response.data.sheet_music,AlphaTabRunner.texLoaded.currentTrackIndexes);

            data.partName = response.data.part_list[AlphaTabRunner.texLoaded.currentTrackIndexes[0]];
            getPartSheetMusic(data).then((response) => {
                AlphaTabRunner.noteStream = response.data.performance_expectation;
                AlphaTabRunner.noteList = new NoteList(0);

                AlphaTabRunner.noteList.updateBounds(response.data.lower_upper[0], response.data.lower_upper[1]);
                AlphaTabRunner.texLoaded.setMeasureLengths(response.data.measure_lengths, AlphaTabRunner.barCount);
                AlphaTabRunner.texLoaded.measureEnd = AlphaTabRunner.texLoaded.measureLengths.length + 1;
                AlphaTabRunner.texLoaded.typeOfTex = 'Sheet Music';
            }).catch((error) => {
                console.log("error", error);
            });

        }).catch((error) => {
            console.log("error", error);
        });
    }
}

export default AlphaTabRunner;
