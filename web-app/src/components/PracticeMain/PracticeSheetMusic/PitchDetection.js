// ----------------------------------------------------------------------------
// File Path: src/components/PracticeMain/PracticeSheetMusic/PitchDetection.js
// Description: Pitch detection API
// Author: Dan Levy & Daniel Griessler
// Email: danlevy124@gmail.com & dgriessler20@gmail.com
// Created Date: 11/15/2019
// ----------------------------------------------------------------------------

// NPM module imports
import ml5 from "ml5";

// File imports
import AlphaTabRunner from "./AlphaTabRunner";
import { addPerformance } from "../../../App/musicAssistantApi";
import {
    initializeRunningPerformance,
    updateRunningPerformance,
    closeRunningPerformance
} from "../../../App/musicAssistantApi";
import * as logs from "../../../vendors/Firebase/logs";

class PitchDetection {
    audioContext;
    micStream;
    pitchDetectionModel;
    label; // HTML element to display the frequency
    noteList;

    /**
     * Sets up pitch detection
     */
    static setupPitchDetection() {
        return new Promise((resolve, reject) => {
            // Create AudioContext instance
            this.audioContext = new AudioContext();

            // Starts microphone stream if available
            if (navigator.mediaDevices) {
                navigator.mediaDevices
                    .getUserMedia({ audio: true })
                    .then(micStream => {
                        this.micStream = micStream;

                        // Sets up ML5 pitch detection
                        this.ml5Setup()
                            .then(model => {
                                this.pitchDetectionModel = model;
                                resolve();
                            })
                            .catch(error => {
                                reject(error);
                            });
                    })
                    .catch(error => {
                        reject(error);
                    });
            } else {
                reject("Cannot access microphone.");
            }
        });
    }

    static endPitchDetection() {
        this.micStream.getTracks()[0].stop();
        this.micStream = null;
    }

    /**
     * Sets up ML5 pitch detection
     */
    static ml5Setup() {
        // Label element to display frequency
        this.label = document.querySelector("#frequency");

        // Creates pitch detection model
        return ml5.pitchDetection("/Pitch-Detection-Model/", this.audioContext, this.micStream)
            .ready;
    }

    /**
     * Continuously detects pitch and displays it on the screen
     * @returns The id of the current setInterval process (this can be used to stop the current setInterval process)
     */
    static startPitchDetection() {
        AlphaTabRunner.texLoaded.performanceId = null;
        AlphaTabRunner.noteList.clear();
        if (AlphaTabRunner.getsFeedback) {
            AlphaTabRunner.p5Obj.loop();
        }
        this.listen(0, 0);
    }

    static async pageTurn() {
        let sheetMusicId = AlphaTabRunner.texLoaded.sheetMusicId;
        if (AlphaTabRunner.texLoaded.performanceId === null) {
            let performanceData = {
                performanceData: JSON.stringify(
                    JSON.parse(JSON.stringify(AlphaTabRunner.noteList.performanceData))
                ),
                sheetMusicId,
                exerciseId: null,
                measureStart: AlphaTabRunner.texLoaded.measureStart,
                measureEnd: AlphaTabRunner.texLoaded.measureEnd,
                isDurationExercise: false
            };
            if (
                AlphaTabRunner.texLoaded.typeOfTex === "Exercise" &&
                AlphaTabRunner.texLoaded.id !== null
            ) {
                performanceData.exerciseId = AlphaTabRunner.texLoaded.id;
            }

            AlphaTabRunner.noteList.clear();

            initializeRunningPerformance(performanceData)
                .then(response => {
                    AlphaTabRunner.texLoaded.performanceId = response.data.performance_id;
                })
                .catch(error => {
                    logs.sheetMusicError(
                        error.response.status,
                        error.response.data,
                        "[PitchDetection/pageTurn]"
                    );
                });
        } else {
            let performanceData = {
                performanceData: JSON.stringify(
                    JSON.parse(JSON.stringify(AlphaTabRunner.noteList.performanceData))
                ),
                performanceId: AlphaTabRunner.texLoaded.performanceId,
                sheetMusicId
            };
            AlphaTabRunner.noteList.clear();

            updateRunningPerformance(performanceData).catch(error => {
                logs.sheetMusicError(
                    error.response.status,
                    error.response.data,
                    "[PitchDetection/pageTurn]"
                );
            });
        }
    }

    static listen(currentSectionIndex, currentCount) {
        let increment = null;
        if (AlphaTabRunner.texLoaded !== null && AlphaTabRunner.texLoaded.lengthsPerSection !== null) {
            increment = AlphaTabRunner.texLoaded.lengthsPerSection[currentSectionIndex];

            if (AlphaTabRunner.api.timePosition / 1000 > currentCount + increment) {
                this.pageTurn();

                AlphaTabRunner.resetDrawPositions = true;
                AlphaTabRunner.p5Obj.clear();
                AlphaTabRunner.api.settings.display.startBar =
                    AlphaTabRunner.api.settings.display.startBar + AlphaTabRunner.barCount - 1;
                AlphaTabRunner.api.updateSettings();
                AlphaTabRunner.api.render();
                currentCount += increment;
            }
        }

        if (AlphaTabRunner.playerState === 1) {
            this.pitchDetectionModel
                .getPitch()
                .then(frequency => {
                    this.displayMidi(frequency);
                    this.listen(currentSectionIndex, currentCount);
                })
                .catch(error => {
                    logs.sheetMusicError(null, error, "[PitchDetection/listen]");
                    this.displayMidi(0);
                    this.listen(currentSectionIndex, currentCount);
                });

            try {
                const topLine = document.getElementById("rect_0");
                const nextLine = document.getElementById("rect_1");
                const topLineHeight = topLine.y.animVal.value;
                const distanceBetweenLines = nextLine.y.animVal.value - topLineHeight;
                if (
                    topLineHeight !== AlphaTabRunner.drawer.topLine ||
                    distanceBetweenLines !== AlphaTabRunner.drawer.distanceBetweenLines
                ) {
                    AlphaTabRunner.drawer.setTopLineAndDistanceBetween(
                        topLineHeight,
                        distanceBetweenLines,
                        AlphaTabRunner.drawer.baseOctave
                    );
                }
            } catch (error) {}
        }
    }

    /**
     * Stops the detection of the pitch
     * @param {string} sheetMusicId The id of the sheet music to submit the performance
     */
    static async stopPitchDetection(sheetMusicId) {
        if (AlphaTabRunner.getsFeedback) {
            AlphaTabRunner.p5Obj.noLoop();
        }

        let performanceData = {
            performanceData: JSON.stringify(
                JSON.parse(JSON.stringify(AlphaTabRunner.noteList.performanceData))
            ),
            sheetMusicId,
            exerciseId: null,
            measureStart: AlphaTabRunner.texLoaded.measureStart,
            measureEnd: AlphaTabRunner.texLoaded.measureEnd,
            isDurationExercise: false
        };
        if (
            AlphaTabRunner.texLoaded.typeOfTex === "Exercise" &&
            AlphaTabRunner.texLoaded.id !== null
        ) {
            performanceData.exerciseId = AlphaTabRunner.texLoaded.id;
        }

        AlphaTabRunner.noteList.clear();

        if (AlphaTabRunner.texLoaded.performanceId !== null) {
            performanceData.performanceId = AlphaTabRunner.texLoaded.performanceId;

            const currentPerformanceId = AlphaTabRunner.texLoaded.performanceId;

            closeRunningPerformance(performanceData)
                .then(response => {
                    if (AlphaTabRunner.texLoaded.performanceId === currentPerformanceId) {
                        AlphaTabRunner.texLoaded.performanceId = null;
                    }
                })
                .catch(error => {
                    logs.sheetMusicError(
                        error.response.status,
                        error.response.data,
                        "[PitchDetection/stopPitchDetection]"
                    );
                });
        } else {
            await addPerformance(performanceData);
        }
    }

    /**
     * Displays the frequency as a midi value on the piece of music
     * @param {number} frequency The frequency to convert and display
     */
    static displayMidi(frequency) {
        if (frequency) {
            // Converts frequency to midi value
            let midiNum = (Math.log(frequency / 440) / Math.log(2)) * 12 + 69;
            if (AlphaTabRunner.noteList !== null) {
                AlphaTabRunner.noteList.addNote(midiNum, AlphaTabRunner.api.timePosition / 1000);
            }
            if (AlphaTabRunner.drawer !== null) {
                AlphaTabRunner.drawer.updateNote(AlphaTabRunner.noteList.average);
            }
        } else {
            // Sentinel value of 0 used for silence
            if (AlphaTabRunner.noteList !== null) {
                AlphaTabRunner.noteList.addNote(0, AlphaTabRunner.api.timePosition / 1000);
            }
            if (AlphaTabRunner.drawer !== null) {
                AlphaTabRunner.drawer.updateNote(AlphaTabRunner.noteList.average);
            }
        }
    }
}

export default PitchDetection;
