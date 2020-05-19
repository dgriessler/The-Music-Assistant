// NPM Module imports
import React, { useRef } from "react";
import PropTypes from "prop-types";
import { Switch, Route, useHistory, useRouteMatch } from "react-router-dom";
import { useSelector } from "react-redux";

// Component imports
import ChoirSelection from "../ChoirSelection/ChoirSelection";
import MusicSelection from "../MusicSelection/MusicSelection";
import Music from "../Music/Music";

// File imports
import * as alertBarTypes from "../AlertBar/alertBarTypes";

/**
 * Renders the Practice component.
 * This is the container for the practice tab.
 * @component
 * @category Practice
 * @author Dan Levy <danlevy124@gmail.com>
 */

const Practice = ({ showAlert }) => {
    /**
     * react-router-dom history
     * @type {object}
     */
    const history = useHistory();

    /**
     * react-router-dom location
     * @type {object}
     */
    const match = useRouteMatch();

    /**
     * Indicates if the browser is a mobile browser
     */
    const isMobileBrowser = useSelector((state) => state.app.isMobileBrowser);

    /**
     * The selected choir.
     * This is based on the choir that the user selects.
     * @type {object}
     * @property {string} id - The choir ID
     * @property {string} name - The choir name
     */
    const selectedChoir = useRef({
        id: "",
        name: "",
    });

    /**
     * The selected sheet music.
     * This is based on the piece of music that the user selects.
     * @type {object}
     * @property {string} id - The sheet music id
     */
    const selectedMusic = useRef({
        id: "",
    });

    /**
     * Updates the selected choir data.
     * Routes to the MusicSelection component.
     * @param {string} id - The selected choir id
     * @param {string} name - The selected choir name
     */
    const choirClickedHandler = (id, name) => {
        selectedChoir.current = { id, name };

        history.push(`${match.url}/choirs/${id}`);
    };

    /**
     * Updates the selected music data.
     * Routes to the Music component.
     * The route tells the Music component to display the practice page.
     * @param {string} id - The selected music id
     */
    const viewSongClickedHandler = (id) => {
        selectedMusic.current = { id };

        if (isMobileBrowser) {
            showMobileBrowserAlert();
        } else {
            history.push(
                `${match.url}/choirs/${selectedChoir.current.id}/music/${id}/practice`
            );
        }
    };

    /**
     * Updates the selected music data.
     * Routes to the Music component.
     * The route tells the Music component to display the performance page.
     * @param {string} id - The selected music id
     */
    const viewPerformanceClickedHandler = (id) => {
        selectedMusic.current = { id };

        if (isMobileBrowser) {
            showMobileBrowserAlert();
        } else {
            history.push(
                `${match.url}/choirs/${selectedChoir.current.id}/music/${id}/performance`
            );
        }
    };

    /**
     * Shows an alert indicating that the user cannot access the selected page on a mobile browser
     */
    const showMobileBrowserAlert = () => {
        showAlert(
            alertBarTypes.WARNING,
            "We're Sorry",
            "You can't view or play music on this mobile device due to processing limitations"
        );
    };

    // Renders the Practice component
    return (
        <Switch>
            {/* Shows the music component */}
            <Route path={`${match.url}/choirs/:choirId/music/:musicId`}>
                <Music
                    sheetMusicId={selectedMusic.current.id}
                    showAlert={showAlert}
                />
            </Route>

            {/* Shows the music selection component */}
            <Route path={`${match.url}/choirs/:choirId`}>
                <MusicSelection
                    choirId={selectedChoir.current.id}
                    choirName={selectedChoir.current.name}
                    showAlert={showAlert}
                    onViewSongClick={viewSongClickedHandler}
                    onViewPerformanceClick={viewPerformanceClickedHandler}
                />
            </Route>

            {/* Shows the choir selection component */}
            <Route path={`${match.url}`}>
                <ChoirSelection
                    showAlert={showAlert}
                    onChoirClick={choirClickedHandler}
                />
            </Route>
        </Switch>
    );
};

Practice.propTypes = {
    /**
     * Shows an alert
     */
    showAlert: PropTypes.func.isRequired,
};

export default Practice;
