/* ----------------------------------------------------------------------------
// File Path: src/pages/Primary/Primary.js
// Description: Renders the primary page
// Author: Dan Levy
// Email: danlevy124@gmail.com
// Created Date: 12/30/2019
---------------------------------------------------------------------------- */

// NPM module imports
import React, { Component } from "react";
import shortid from "shortid";
import { Switch, Route } from "react-router-dom";
import { connect } from "react-redux";

// Component imports
import Header from "../../components/Header/Header";
import MobileNav from "../../components/MobileNav/MobileNav";
import SideNav from "../../components/SideNav/SideNav";
import ChoirSelection from "../../components/ChoirSelection/ChoirSelection";
import MusicSelection from "../../components/MusicSelection/MusicSelection";
import AlertBar from "../../components/AlertBar/AlertBar";
import Home from "../../components/Home/Home";
import Music from "../../components/Music/Music";
import Progress from "../../components/Progress/Progress";
import ChoirMembers from "../../components/ChoirMembers/ChoirMembers";
import Footer from "../../components/Footer/Footer";

// File imports
import { signOut } from "../../store/actions";
import * as choirSelectionRoutingOptions from "../../components/ChoirSelection/routingOptions";
import * as alertBarTypes from "../../components/AlertBar/alertBarTypes";

// Image imports
import homeIconBlue from "../../assets/icons/home-icon-blue.svg";
import practiceIconBlue from "../../assets/icons/practice-icon-blue.svg";
import progressIconBlue from "../../assets/icons/progress-icon-blue.svg";
import choirIconBlue from "../../assets/icons/choir-icon-blue.svg";
import homeIconWhite from "../../assets/icons/home-icon-white.svg";
import practiceIconWhite from "../../assets/icons/practice-icon-white.svg";
import progressIconWhite from "../../assets/icons/progress-icon-white.svg";
import choirIconWhite from "../../assets/icons/choir-icon-white.svg";

// Style imports
import styles from "./Primary.module.scss";

class Primary extends Component {
    constructor(props) {
        super(props);

        // Component state
        this.state = {
            isMobile: window.innerWidth < 768,
            showMobileNav: false,
            alertData: null,
            mainNavTabs: this.getMainNavTabs(),
        };
    }

    // Indicates whether the component is mounted or not
    _isMounted = false;

    /**
     * Creates an event listener for window resize
     */
    componentDidMount() {
        this.showAlert(
            alertBarTypes.INFO,
            "A Reminder",
            "Please use HEADPHONES when practicing! The piano interferes with your analysis."
        );
        this._isMounted = true;
        window.addEventListener("resize", this.handleWindowResize);
    }

    /**
     * Removes the window event resize event listener
     */
    componentWillUnmount() {
        this._isMounted = false;
        window.removeEventListener("resize", this.handleWindowResize);
    }

    getMainNavTabs = () => {
        const tabs = [];
        tabs.push(this.getMainNavTab("Home", "/home", homeIconBlue, homeIconWhite, false));
        tabs.push(
            this.getMainNavTab("Practice", "/practice", practiceIconBlue, practiceIconWhite, true)
        );
        tabs.push(
            this.getMainNavTab("Progress", "/progress", progressIconBlue, progressIconWhite, false)
        );
        tabs.push(this.getMainNavTab("Choirs", "/choirs", choirIconBlue, choirIconWhite, false));
        return tabs;
    };

    /**
     * Creates a main nav tab
     * @param {string} name - The tab name
     * @param {string} blueIcon - A blue version of the icon
     * @param {string} whiteIcon - A white version of the icon
     * @param {boolean} isCurrent - Whether or not the tab is the current tab
     * @returns - A tab object
     */
    getMainNavTab = (name, route, blueIcon, whiteIcon, isCurrentTab) => {
        return {
            key: shortid.generate(),
            name,
            route,
            blueIcon,
            whiteIcon,
            isCurrentTab,
        };
    };

    /**
     * Updates state when the window resizes
     */
    handleWindowResize = () => {
        this.setState({ isMobile: window.innerWidth < 768 });
    };

    /**
     * Shows or hides the hamburger menu based on window size
     */
    handleShowHamburgerMenu = () => {
        this.setState((prevState) => ({
            showMobileNav: !prevState.showMobileNav,
        }));
    };

    /**
     * Gets confirmation from user and then signs the user out
     */
    signOutClickedHandler = () => {
        if (window.confirm("Do you want to sign out?")) {
            this.props.signOut();
        }
    };

    navLinkClickedHandler = (key) => {
        if (this._isMounted) {
            this.setState((prevState) => {
                const oldTabs = [...prevState.mainNavTabs];
                const newTabs = oldTabs.map((tab) => {
                    const newTab = { ...tab };
                    if (tab.key === key) {
                        newTab.isCurrentTab = true;
                    } else {
                        newTab.isCurrentTab = false;
                    }
                    return newTab;
                });
                return { mainNavTabs: newTabs };
            });
        }
    };

    /**
     * Sets alertData in state when a new alert is triggered
     */
    showAlert = (type, heading, message) => {
        this.setState({
            alertData: { type, heading, message },
        });
    };

    /**
     * Sets alertData to null in state when the alert is done
     */
    alertIsDoneHandler = () => {
        this.setState({ alertData: null });
    };

    /**
     * Renders the Primary component
     */
    render() {
        let mainNav = null;
        let footer = null;
        if (this.state.isMobile) {
            mainNav = (
                <MobileNav
                    tabs={this.state.mainNavTabs}
                    show={this.state.showMobileNav}
                    navLinkClicked={(key) => {
                        this.handleShowHamburgerMenu();
                        this.navLinkClickedHandler(key);
                    }}
                    signOutClicked={this.signOutClickedHandler}
                />
            );

            footer = <Footer />;
        } else {
            mainNav = (
                <SideNav
                    tabs={this.state.mainNavTabs}
                    signOutClicked={this.signOutClickedHandler}
                    navLinkClicked={this.navLinkClickedHandler}
                />
            );
        }

        // Returns the JSX to display
        return (
            <div className={styles.primary}>
                {this.state.alertData ? (
                    <AlertBar
                        type={this.state.alertData.type}
                        heading={this.state.alertData.heading}
                        message={this.state.alertData.message}
                        done={this.alertIsDoneHandler}
                    />
                ) : null}
                <Header
                    hamburgerMenuClicked={this.handleShowHamburgerMenu}
                    isMobile={this.state.isMobile}
                />
                {mainNav}
                <Switch>
                    <Route path='/practice/choirs/:choirId/music/:musicId'>
                        <Music showAlert={this.showAlert} />
                    </Route>
                    <Route path='/practice/choirs/:choirId'>
                        <MusicSelection showAlert={this.showAlert} />
                    </Route>
                    <Route path='/choirs/:choirId'>
                        <ChoirMembers showAlert={this.showAlert} />
                    </Route>
                    <Route path='/practice'>
                        <ChoirSelection
                            routing={choirSelectionRoutingOptions.MUSIC_SELECTION}
                            showAlert={this.showAlert}
                        />
                    </Route>
                    <Route path='/progress'>
                        <Progress />
                    </Route>
                    <Route path='/choirs'>
                        <ChoirSelection
                            routing={choirSelectionRoutingOptions.CHOIR_MEMBERS}
                            showAlert={this.showAlert}
                        />
                    </Route>
                    <Route path='/home'>
                        <Home />
                    </Route>
                </Switch>
                {footer}
            </div>
        );
    }
}

/**
 * Gets the current state from Redux and passes it to the Primary component as props
 * @param {object} state - The Redux state
 */
const mapStateToProps = (state) => {
    return {
        isStartupDone: state.startup.isDone,
        isAuthenticated: state.auth.isAuthenticated,
        isAuthFlowComplete: state.auth.isAuthFlowComplete,
    };
};

/**
 * Passes certain redux actions to Primary
 * @param {function} dispatch - The react-redux dispatch function
 */
const mapDispatchToProps = (dispatch) => {
    return {
        signOut: () => dispatch(signOut()),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Primary);
