// NPM module imports
import React from "react";
import PropTypes from "prop-types";
import { MetroSpinner } from "react-spinners-kit";

// Style imports
import styles from "./LoadingHUD.module.scss";

/**
 * Renders the LoadingHUD component.
 * This component takes up the entire screen and blocks clicks.
 * The spinner itself, however, is a small HUD.
 * This component is typically used when submitting a form or submitting some sort of data (e.g. signing in).
 * @component
 * @category Spinners
 * @author Dan Levy <danlevy124@gmail.com>
 */
const LoadingHUD = (props) => {
    // Returns JSX to render
    return (
        <div className={styles.background}>
            <div className={styles.modal}>
                {/* Spinner */}
                <MetroSpinner size={50} color="#5f9cd1" loading={true} />

                {/* Message */}
                <h3 className={styles.modalText}>{props.message}</h3>
            </div>
        </div>
    );
};

// Prop types for the LoadingHUD component
LoadingHUD.propTypes = {
    /**
     * The message to display
     */
    message: PropTypes.string.isRequired,
};

export default LoadingHUD;
