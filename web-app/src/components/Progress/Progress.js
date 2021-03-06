// NPM module imports
import React from "react";

// Image imports
import underConstruction from "../../assets/images/under-construction-hero.png";

// Style imports
import styles from "./Progress.module.scss";

/**
 * Renders the Progress component
 * @component
 * @category Progress
 * @author Dan Levy <danlevy124@gmail.com>
 */
const Progress = () => {
    // TODO: Set this component up

    // Returns the JSX to render
    return (
        <main className={styles.progress}>
            <img
                className={styles.progressHeroImg}
                src={underConstruction}
                alt="Under Construction"
            />
            <h1 className={styles.progressText}>
                This page is currently under construction.
                <br />
                Please check back soon!
            </h1>
        </main>
    );
};

export default Progress;
