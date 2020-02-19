import ml5 from "ml5";
import p5 from "./sketch";
import AlphaTabRunner from "./AlphaTabRunner";

class PitchDetection {
    audioContext;
    micStream;
    pitchDetectionModel;
    label;
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
                            .catch(err => {
                                reject(`[error][PitchDetection] ${err}`);
                            });
                    })
                    .catch(err => {
                        reject();
                    });
            } else {
                reject("[warning][PitchDetection] Cannot access microphone");
            }
        });
    }

    /**
     * Sets up ML5 pitch detection
     */
    static ml5Setup() {
        // Label element to display frequency
        this.label = document.querySelector("#frequency");

        // Creates pitch detection model
        return ml5.pitchDetection("./Pitch-Detection-Model/", this.audioContext, this.micStream).ready;
    }

    /**
     * Continuously detects pitch and displays it on the screen
     * @returns The id of the current setInterval process (this can be used to stop the current setInterval process)
     */
    static startPitchDetection(fileName) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", 'http://127.0.0.1:5000/', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send("play " + fileName);

        AlphaTabRunner.noteList.clear();
        let count = 0;
        let increment = 3 * (60/56)*29
        // Run nested anonymous function every 1 ms
        return setInterval(() => {
            // console.log("time", AlphaTabRunner.api.timePosition, "tick", AlphaTabRunner.api.tickPosition);
            if (AlphaTabRunner.api.timePosition / 1000 > count + increment) {
                console.log("time", AlphaTabRunner.api.timePosition, "tick", AlphaTabRunner.api.tickPosition);
                AlphaTabRunner.api.settings.display.startBar = AlphaTabRunner.api.settings.display.startBar + 28;
                AlphaTabRunner.api.updateSettings();
                AlphaTabRunner.api.render();
                count += increment;
            }
            p5.redraw();
            // Gets the current pitch and sends it to displayMidi
            this.pitchDetectionModel.getPitch().then(frequency => {
                this.displayMidi(frequency);
            }).catch(err => {
                console.log(`[error][PitchDetection] ${err}`);
                this.displayMidi(0);
            });
        }, 1);
    }

    /**
     * Stops the detection of the pitch
     * @param {number} setIntervalID The id of the setInterval process to stop
     */
    static stopPitchDetection(setIntervalID) {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", 'http://127.0.0.1:5000/', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send("stop");
        clearInterval(setIntervalID);
        console.log(JSON.stringify(AlphaTabRunner.noteList.performanceData));
    }

    /**
     * Displays the frequency as a midi value on the piece of music
     * @param {number} frequency The frequency to convert and display
     */
    static displayMidi(frequency) {
        if (frequency) {
            // Converts frequency to midi value
            let midiNum = (Math.log(frequency / 440) / Math.log(2)) * 12 + 69;
            
            AlphaTabRunner.noteList.addNote(midiNum, AlphaTabRunner.api.timePosition / 1000);
            AlphaTabRunner.drawer.updateNote(AlphaTabRunner.noteList.average);
        } else {
            // Sentinel value of 0 used for silence
            AlphaTabRunner.noteList.addNote(0, AlphaTabRunner.api.timePosition / 1000);
            AlphaTabRunner.drawer.updateNote(AlphaTabRunner.noteList.average);
        }
    }
}

export default PitchDetection;