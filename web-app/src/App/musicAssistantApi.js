/* ----------------------------------------------------------------------------
// File Path: src/App/App.js
// Description: Server API for The Music Assistant
// Author: Dan Levy
// Email: danlevy124@gmail.com
// Created Date: 2/8/2020
---------------------------------------------------------------------------- */

import axios from "axios";

axios.defaults.baseURL = "https://server.music-assistant.com/";
// axios.defaults.timeout = 3000;

/**
 * Sets the Axios auth token
 * @param {string} authToken - The auth token to use for API requests
 */
export const setAxiosAuthToken = authToken => {
    axios.defaults.headers.common["Authorization"] = authToken;
};

/**
 * Gets the current user's first and last name
 */
export const getUser = () => {
    return axios.get("/person");
};

/**
 * Adds a user to the database
 * @param {object} data
 * @param {string} data.firstName - The user's first name
 * @param {string} data.lastName - The user's last name
 */
export const addUser = data => {
    return axios.post("/person", data);
};

/**
 * Updates a user in the database
 * @param {object} data
 * @param {string} data.firstName - The user's first name
 * @param {string} data.lastName - The user's last name
 */
export const updateUser = data => {
    return axios.put("/person", data);
};

/**
 * Adds a choir to the database
 * @param {object} data
 * @param {string} data.choirName - The name of the choir
 * @param {string} data.description - A description of the choir
 * @param {string} data.memberType - The member type of the member creating the choir
 * @param {string} memberRole - The member role of the member creating the choir
 */
export const addChoir = data => {
    return axios.post("/choir", data);
};

/**
 * Gets the choirs that this user is a part of
 */
export const getUsersChoirs = () => {
    return axios.get("/choir");
};

/**
 * Gets the given choir members
 * @param {object} data
 * @param {string} data.choirId - The choir ID retrieve
 */
export const getChoirMembers = data => {
    return axios.request({
        method: "GET",
        url: "/choir/members",
        params: data
    });
};

/**
 * Accepts a given choir member into the given choir
 * @param {object} data
 * @param {object} data.memberId - The member ID of the member to accept
 * @param {string} data.choirId - The choir ID retrieve
 */
export const acceptChoirMember = data => {
    return axios.put("/member/accept", data);
};

/**
 * Rejects a given choir member from entering the given choir
 * @param {object} data
 * @param {object} data.memberId - The member ID of the member to reject
 * @param {string} data.choirId - The choir ID retrieve
 */
export const rejectChoirMember = data => {
    return axios.put("/member/reject", data);
};

/**
 * Gets pending members of the given choir
 * @param {object} data
 * @param {string} data.choirId - The choir ID of the choir to get pending members from
 */
export const getPendingMembers = data => {
    return axios.request({
        method: "GET",
        url: "/member/pending",
        params: data
    });
};

/**
 * Adds the user as a pending member of the given choir
 * @param {object} data
 * @param {string} data.memberType - The member type that you are attempting to join as
 * @param {string} data.memberRole - The member role that you are attempting to join as
 * @param {string} data.accessCode - The access code for the choir you are attempting to join
 */
export const joinChoir = data => {
    return axios.post("/member", data);
};

/**
 * Gets all sheet music for a choir receiving {
 *   hex(sheet_music_id) - Hexed sheet music id for specific sheet music retrieval later
 *   title - title of sheet music
 *   composer_names - composer names
 * }
 * @param data
 * @param data.choirId - Will get all sheet music with this choir id which the user has access to
 */
export const getSheetMusic = data => {
    return axios.request({
        method: 'GET',
        url: `/sheet-music`,
        params: data,
      });
}

/**
 * Gets a specific piece of sheet music receiving {
 *  sheet_music: (Alpha-Tex-Encoding),
 *  part_list: (Parts that a person can perform)
 *  clefs: (Array with value for each track. Each track value is an array with clefs for each staff)
 * }
 * @param {object} data
 * @param {string} data.sheetMusicId - The sheet music id to retrieve
 */
export const getSpecificSheetMusic = data => {
    return axios.request({
        method: "GET",
        url: "/sheet-music/specific",
        params: data
    });
};

/**
 * Gets a specific part from a specific piece of sheet music receiving {
 *  performance_expectation: (Array of pairs of numbers: midi_value, duration)
 *  lower_upper: (2 valued array representing the lower and upper bound for the sheet music)
 *  measure_lengths: (one value per array representing length in seconds)
 * }
 * @param {object} data
 * @param {string} data.sheetMusicId - The sheet music id to retrieve
 * @param {string} data.partName - The name of the part to be retrieved
 */
export const getPartSheetMusic = data => {
    return axios.request({
        method: "GET",
        url: "/sheet-music/part",
        params: data
    });
};

/**
 * Adds a performance for the current user for the provided sheet music
 * @param {Object} data 
 * @param {string} data.performanceData - The performance data to be added
 * @param {string} data.sheetMusicId - The sheet music id to add the performance to
 */
export const addPerformance = data => {
    return axios.post("/performance", data);
};

/**
 * Updates a choir member
 * Must be an admin of the choir to update a member
 * @param {object} data
 * @param {string} data.memberId
 * @param {string} data.memberType
 * @param {string} data.memberRole
 */
export const constUpdateMember = data => {
    return axios.put("/member/update", data);
};

/**
 * Deletes a choir member
 * Must be an admin of the choir to update a member
 * @param {object} data
 * @param {string} data.memberId
 */
export const deleteMember = data => {
    return axios.delete("/member", data);
};

/**
 * Gets all performances for the user for a given piece of sheet music
 * @param {object} data
 * @param {string} data.sheetMusicId
 */
export const getUsersPerformancesForSheetMusic = data => {
    return axios.request({
        method: "GET",
        url: "/performance/all",
        params: data
    });
};