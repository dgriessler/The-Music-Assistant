// NPM module imports
import React, { Component } from "react";
import PropTypes from "prop-types";

// File imports
import * as colorOptions from "../choirCardColorOptions";

// Image imports
import cameraImg from "../../../../assets/icons/camera-white-fa.svg";
import { choirSelectionError } from "../../../../vendors/Firebase/logs";

// Style imports
import cardStyles from "./ChoirCard.module.scss";
import cardColorStyles from "../ChoirCardColors.module.scss";

/**
 * Renders the ChoirCard component.
 * Shows information about the choir.
 * @extends {Component}
 * @component
 * @author Dan Levy <danlevy124@gmail.com>
 */
class ChoirCard extends Component {
    /**
     * ChoirCard component state
     * @property {boolean} choirImgLoadingError - Indicates if there was an error loading the choir's image
     */
    state = {
        choirImgLoadingError: false,
    };

    /**
     * Updates state if there was an error loading the choir image
     * @function
     */
    choirImgLoadingErrorHandler = () => {
        // Logs the error
        choirSelectionError(
            null,
            "Choir image failed to load.",
            "[ChoirCard/choirImgLoadingErrorHandler]"
        );

        // Updates state
        this.setState({ choirImgLoadingError: true });
    };

    /**
     * Gets the correct header image
     * @function
     * @returns An image (JSX)
     */
    getHeaderImage = () => {
        if (!this.state.choirImgLoadingError && this.props.headerImgSrc) {
            // Returns the choir image
            return (
                <img
                    className={cardStyles.choirCardHeaderImg}
                    src={this.props.headerImgSrc}
                    loading='lazy'
                    alt='Choir'
                />
            );
        } else {
            // Returns a placeholder image
            return (
                <div
                    className={`${cardStyles.choirCardHeaderImgPlaceholder} ${
                        cardColorStyles[this.props.cardColor + "Darken"]
                    }`}>
                    <img
                        className={cardStyles.choirCardHeaderImgPlaceholderImg}
                        src={cameraImg}
                        alt='Choir'
                        onError={this.choirImgLoadingErrorHandler}
                    />
                </div>
            );
        }
    };

    /**
     * Renders the ChoirCard component
     * @returns JSX
     */
    render() {
        return (
            <div
                className={`${cardStyles.choirCard} ${cardColorStyles[this.props.cardColor]}`}
                onClick={this.props.onClick}>
                {/* Header image */}
                {this.getHeaderImage()}

                {/* Choir name */}
                <h1 className={cardStyles.choirCardName}>{this.props.name}</h1>

                {/* Choir description (if one exists) */}
                {this.props.description ? (
                    <h2 className={cardStyles.choirCardDescription}>{this.props.description}</h2>
                ) : null}
            </div>
        );
    }
}

// Prop types for the choir card component
ChoirCard.propTypes = {
    /**
     * The path to the header image
     */
    headerImgSrc: PropTypes.string,

    /**
     * The choir's name
     */
    name: PropTypes.string.isRequired,

    /**
     * The choir's description
     */
    description: PropTypes.string,

    /**
     * The card's background color.
     * See [options]{@link module:choirCardColorOptions}.
     */
    cardColor: PropTypes.oneOf([
        colorOptions.PRIMARY_BLUE,
        colorOptions.SECONDARY_BLUE,
        colorOptions.TERTIARY_BLUE,
        colorOptions.GREEN,
        colorOptions.ORANGE,
        colorOptions.RED,
    ]).isRequired,

    /**
     * Click handler for the card
     */
    onClick: PropTypes.func,
};

export default ChoirCard;
