// ----------------------------------------------------------------------------
// File Path: src/components/MusicSelection/MusicSelection.js
// Description: Renders the music selection component
// Author: Dan Levy
// Email: danlevy124@gmail.com
// Created Date: 2/26/2020
// ----------------------------------------------------------------------------

// NPM module imports
import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import shortid from "shortid";

// Component imports
import MusicSelectionHeader from "./MusicSelectionHeader/MusicSelectionHeader";
import MusicCard from "./MusicCard/MusicCard";
import { MetroSpinner } from "react-spinners-kit";

// File imports
import { getSheetMusic } from "../../App/musicAssistantApi";
import * as alertBarTypes from "../AlertBar/alertBarTypes";
import { musicSelectionError } from "../../vendors/Firebase/logs";
import { musicSelectedForPractice } from "../../store/actions";

// Style imports
import styles from "./MusicSelection.module.scss";

class MusicSelection extends Component {
    // Component state
    state = {
        isLoading: true,
        music: null,
        minLoadingTimeElapsed: false
    };

    // Indicates whether the component is mounted or not
    _isMounted = false;

    componentDidMount() {
        this._isMounted = true;
        this.getMusicList();
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    getMusicList = () => {
        // Starts loading
        if (this._isMounted) this.setState({ isLoading: true, minLoadingTimeElapsed: false });
        setTimeout(() => {
            if (this._isMounted) this.setState({ minLoadingTimeElapsed: true });
        }, 500);

        // Gets music
        getSheetMusic({ choirId: this.props.choirId })
            .then(snapshot => {
                if (this._isMounted)
                    this.setState({ isLoading: false, music: snapshot.data.sheet_music });
            })
            .catch(error => {
                musicSelectionError(
                    error.response.status,
                    error.response.data,
                    "[MusicSelection/getMusicList]"
                );
                this.props.showAlert(alertBarTypes.ERROR, "Error", error.response.data);
                if (this._isMounted) this.setState({ isLoading: false });
            });
    };

    viewSongClickedHandler = id => {
        this.props.musicSelected(id);
        this.props.history.push(`${this.props.match.url}/music/${id}`);
    };

    backButtonClickedHandler = () => {
        this.props.history.goBack();
    };

    createSheetMusicComponents = () => {
        // Card color options
        const colors = ["secondaryBlue", "green", "primaryBlue", "orange", "tertiaryBlue", "red"];

        // Index starts at -1 because it is incremented before its first use
        let colorIndex = -1;

        // The cards to return
        return this.state.music.map(musicPiece => {
            // Gets the next color
            colorIndex++;
            if (colorIndex >= colors.length) {
                colorIndex = 0;
            }

            return (
                <MusicCard
                    key={shortid.generate()}
                    title={musicPiece.title}
                    composers={musicPiece.composer_names}
                    cardColor={colors[colorIndex]}
                    viewSongClicked={() => this.viewSongClickedHandler(musicPiece.sheet_music_id)}
                    viewExercisesClicked={() => {}}
                />
            );
        });
    };

    render() {
        // The component to display
        let component;

        if (this.state.isLoading || !this.state.minLoadingTimeElapsed) {
            // Display a loading spinner
            component = (
                <div className={styles.musicSelectionSpinner}>
                    <MetroSpinner size={75} color='#5F9CD1' loading={true} />
                    <h1 className={styles.musicSelectionSpinnerMessage}>Loading music...</h1>
                </div>
            );
        } else {
            // Display the music cards
            component = (
                <div className={styles.musicSelectionCards}>
                    {this.createSheetMusicComponents()}
                </div>
            );
        }
        return (
            <div className={styles.musicSelection}>
                <MusicSelectionHeader
                    heading={`${this.props.choirName} - Music`}
                    backButtonClickedHandler={this.backButtonClickedHandler}
                />
                {component}
            </div>
        );
    }
}

// Prop types for the MusicControls component
MusicSelection.propTypes = {
    choirId: PropTypes.string.isRequired,
    choirName: PropTypes.string.isRequired,
    showAlert: PropTypes.func.isRequired,
    musicSelected: PropTypes.func.isRequired
};

/**
 * Gets the current state from Redux and passes it to the MusicSelection component as props
 * @param {object} state - The Redux state
 */
const mapStateToProps = state => {
    return {
        choirId: state.practice.selectedChoirId,
        choirName: state.practice.selectedChoirName
    };
};

/**
 * Passes certain redux actions to MusicSelection
 * @param {function} dispatch - The react-redux dispatch function
 */
const mapDispatchToProps = dispatch => {
    return {
        musicSelected: id => dispatch(musicSelectedForPractice(id))
    };
};

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(MusicSelection));