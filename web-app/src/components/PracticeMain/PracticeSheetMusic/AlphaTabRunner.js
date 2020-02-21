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
import { getSpecificSheetMusic, getPartSheetMusic } from "../../../App/musicAssistantApi";
import TexLoaded from "./TexLoaded";


/**
 * Runs AlphaTab including initialization and keeping a Drawer and NoteList instance
 */
class AlphaTabRunner {
    api;
    intervalID;
    drawer;
    noteList;
    p5Obj;
    texLoaded;
    partNames;
    renderedOnce;

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

        // AlphaTab API settings
        let settings = {
            "player":{
                "enablePlayer":true,
                enableCursor: true,
                soundFont: player,
                scrollElement: "#wrapper"
            },
            "display": {
                "layoutMode": "horizontal",
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
    }

    /**
     * Run when AlphaTab is rendered on the screen
     * TODO: Fix so that it updates the variables on subsequent alphaTab renders besides the first one
     */
    static alphaTabRenderFinished() {

        // Retrieves staff lines using IDs attacked to elements generated by AlphaTab. Required editing AlphaTab.js directly
        let topLine = document.getElementById("rect_0");
        let nextLine = document.getElementById("rect_1");

        if (this.renderedOnce) {
            // retrieves the height of the staff lines based on a relative offset to their wrapping contanier
            // used to setup the canvas so the canvas needs to be directly on top of the alphaTab container where these are stored
            const topLineHeight = topLine.y.animVal.value;
            const distanceBetweenLines = nextLine.y.animVal.value - topLineHeight;
            AlphaTabRunner.drawer.setTopLineAndDistanceBetween(topLineHeight, distanceBetweenLines, AlphaTabRunner.texLoaded.getStartOctave());
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

                // TODO: Update these values on subsequent renders since we just need to update their bounds
                // Creates a new drawer and noteList
                AlphaTabRunner.drawer = new Drawer(topLineHeight + 1, distanceBetweenLines);
                
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
        if (AlphaTabRunner.api.playerState !== 1) {
            PitchDetection.stopPitchDetection(this.intervalID, "7CEEDD29533511EAAEC302F168716C78");
        } else {
            // Runs the pitch detection model on microphone input and displays it on the screen
            // TODO: Don't show player controls (e.g. play and pause buttons) until AlphaTab and ML5 are ready
            this.intervalID = PitchDetection.startPitchDetection();
        }
    }

    static alphaTabPlayerFinished() {
        // resets the time back to the beginning of the song and our tracker points at the beginning of the piece again
        // TODO: Fix confusion when playing/pausing quickly
        AlphaTabRunner.noteStreamIndex = 0;
        AlphaTabRunner.cumulativeTime = 0;
    }

    static changePart(value) {
        let trackNumber = parseInt(value.substring(1), 10);
        if (!AlphaTabRunner.texLoaded.currentTrackIndexes.includes(trackNumber)) {
            AlphaTabRunner.texLoaded.updateCurrentTrackIndexes(trackNumber);
            
            AlphaTabRunner.api.renderTracks(
                AlphaTabRunner.texLoaded.currentTrackIndexes
            );

            let data = {
                sheetMusicId: "7CEEDD29533511EAAEC302F168716C78",
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

    static changeMusic(value) {
        if (this.texLoaded === null || value === this.texLoaded) {
            return;
        } else {
            if (value === "Sheet Music") {
                AlphaTabRunner.loadTex();
            } else {
                console.log("Load exercise:", value);
            }
        }
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

    static async loadTex () {
        let data = {
            sheetMusicId: "7CEEDD29533511EAAEC302F168716C78"
        }
        getSpecificSheetMusic(data).then((response) => {
            AlphaTabRunner.texLoaded = new TexLoaded('Sheet Music', response.data.part_list, response.data.clefs)

            // TODO: Once track muting is fixed, uncomment to re add it
            let sheetMusicPartDropdown = document.getElementById("sheetMusicPart");
            // let trackVolume = document.getElementById("volumeTracks");
            // const numberOfChildren = trackVolume.children.length;
            // for (let i = 0; i < numberOfChildren; i++) {
            //     trackVolume.removeChild(trackVolume.lastElementChild);
            // }
            for (let i = 0; i < response.data.part_list.length; i++) {
                sheetMusicPartDropdown.options[i]=new Option(response.data.part_list[i], "t" + i, true, false);
                // const newTrackVolume = document.createElement('li');
                // const x = document.createElement("INPUT");
                // x.setAttribute("type", "checkbox");
                // x.checked = true;
                // newTrackVolume.appendChild(x);
                // newTrackVolume.appendChild(document.createTextNode(response.data.part_list[i]));
                // newTrackVolume.onclick = function() {
                //     AlphaTabRunner.changeTrackVolume(this.children[0].checked, this.innerText);
                // };
                // trackVolume.appendChild(newTrackVolume);
            }

            AlphaTabRunner.api.tex(response.data.sheet_music,AlphaTabRunner.texLoaded.currentTrackIndexes);

            data.partName = response.data.part_list[0];
            getPartSheetMusic(data).then((response) => {
                AlphaTabRunner.noteStream = response.data.performance_expectation;
                AlphaTabRunner.noteList = new NoteList(0);
                AlphaTabRunner.noteList.updateBounds(response.data.lower_upper[0], response.data.lower_upper[1]);
                AlphaTabRunner.texLoaded.typeOfTex = 'Sheet Music';
            }).catch((error) => {
                console.log("error", error);
            })

        }).catch((error) => {
            console.log("error", error);
        });

    }
}

export default AlphaTabRunner;
