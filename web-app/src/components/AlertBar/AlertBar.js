// ----------------------------------------------------------------------------
// File Path: src/components/AuthCards/AuthBar/AuthBar.module.scss
// Description: Renders the alert bar component
// Author: Dan Levy
// Email: danlevy124@gmail.com
// Created Date: 1/20/2020
// ----------------------------------------------------------------------------

import React, { Component } from "react";
import styles from "./AlertBar.module.scss";
import closeIconWhite from "../../assets/icons/close-icon-white-fa.svg";

class AlertBar extends Component {
    state = {
        timeElapsed: false,
        transition: null,
        transitionOutTimerId: null
    };

    componentDidMount() {
        this.setState({ transition: "in" });

        const transitionOutTimerId = setTimeout(() => {
            this.setState({ transition: "out" });
        }, 5000);

        this.setState({transitionOutTimerId});
    }

    closeButttonClickedHandler = () => {
        clearTimeout(this.state.transitionOutTimerId);
        this.setState({ transition: "out" });
    }

    render() {
        let backgroundColorStyle;
        switch (this.props.type) {
            case "success":
                backgroundColorStyle = styles.alertBarSuccess;
                break;
            case "warning":
                backgroundColorStyle = styles.alertBarWarning;
                break;
            case "error":
                backgroundColorStyle = styles.alertBarError;
                break;
            default:
                backgroundColorStyle = styles.alertBarInfo;
        }

        let transitionStyle;
        switch (this.state.transition) {
            case "in":
                transitionStyle = styles.alertBarTransitionIn;
                break;
            case "out":
                transitionStyle = styles.alertBarTransitionOut;
                break;
            default:
                transitionStyle = null;
        }

        return (
            <div className={[styles.alertBar, backgroundColorStyle, transitionStyle].join(" ")}>
                <div className={styles.alertBarTopGrid}>
                    <div></div>
                    <h1 className={styles.alertBarHeading}>{this.props.heading}</h1>
                    <button className={styles.alertBarCloseButton} onClick={this.closeButttonClickedHandler} type='button'>
                        <img
                            className={styles.alertBarCloseButtonImg}
                            src={closeIconWhite}
                            alt='Close Alert Button'
                        />
                    </button>
                </div>
                <h2 className={styles.alertBarMessage}>{this.props.message}</h2>
            </div>
        );
    }
}

export default AlertBar;
