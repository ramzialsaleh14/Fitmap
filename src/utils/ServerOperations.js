import { Platform } from "react-native";
import * as FileSystem from 'expo-file-system';
import * as Constants from "./Constants";
import * as Commons from "./Commons";

const httpTimeout = (ms, promise) =>
    new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error("timeout"));
        }, ms);
        promise.then(resolve, reject);
    });

export const httpRequest = async (url) => {
    /* Send request */
    const TIMEOUT = 20000;

    const response = await httpTimeout(
        TIMEOUT,
        fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }).catch((error) => {
            console.error(error);
            return Constants.networkError_code;
        })
    ).catch((error) => {
        return Constants.networkError_code;
    });

    // Check if response is valid before trying to parse JSON
    if (response === Constants.networkError_code || !response || typeof response.json !== 'function') {
        console.error('Invalid response, cannot parse JSON:', response);
        return Constants.networkError_code;
    }

    const json = await response.json();
    return json;
};

export const ping = async (url, timeout) => {
    const response = await httpTimeout(
        timeout,
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "action=",
        })
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error("HTTP response status not code 200 as expected.");
                }
            })
            .catch((error) => {
                console.error(error);
                return Constants.networkError_code;
            })
    ).catch((error) => {
        console.log(error);
        return Constants.networkError_code;
    });
    return response;
};

// Helper function to convert Arabic numbers to English numbers
const convertArabicToEnglishNumbers = (text) => {
    if (!text || typeof text !== 'string') return text;

    const result = text
        .replace(/١/g, '1')
        .replace(/٢/g, '2')
        .replace(/٣/g, '3')
        .replace(/٤/g, '4')
        .replace(/٥/g, '5')
        .replace(/٦/g, '6')
        .replace(/٧/g, '7')
        .replace(/٨/g, '8')
        .replace(/٩/g, '9')
        .replace(/٠/g, '0');

    if (result !== text) {
        console.log(`Arabic numbers converted: "${text}" → "${result}"`);
    }

    return result;
};

// Helper function to convert .m4a file extensions to .mp3
const convertM4aToMp3 = (text) => {
    if (!text || typeof text !== 'string') return text;

    const result = text.replace(/\.m4a$/gi, '.mp3');

    return result;
};// Enhanced encodeURIComponent that handles Arabic numbers and file extensions
const safeEncodeURIComponent = (value) => {
    const stringValue = String(value || '');
    const convertedNumbers = convertArabicToEnglishNumbers(stringValue);
    const convertedExtensions = convertM4aToMp3(convertedNumbers);
    return encodeURIComponent(convertedExtensions);
};

export const pickHttpRequest = async (params) => {
    /* Send request */
    // Convert Arabic numbers to English numbers in the entire params string
    params = convertArabicToEnglishNumbers(params);
    // Convert .m4a extensions to .mp3 in the entire params string
    params = convertM4aToMp3(params);

    const TIMEOUT = 20000;
    const user = safeEncodeURIComponent(await Commons.getFromAS("userID"));
    const url = Constants.pickServerUrl + params + "&currentuser=" + user;

    console.log(url);

    const response = await httpTimeout(
        TIMEOUT,
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params,
        }).catch((error) => {
            console.error(error);
            return Constants.networkError_code;
        })
    ).catch((error) => {
        return Constants.networkError_code;
    });

    return response;
};

export const pickUploadHttpRequest = async (file) => {
    /* Send request */
    const TIMEOUT = 45000;
    const url = `${Constants.serverBaseUrl}/pick/faces/redirect/fitmap?connector=FITMAP.CONNECTOR&action=upload&fileupload=y&fname=${file.name}`;

    console.log('Uploading file to URL:', url);
    console.log('File details:', file);

    // Defensive check: ensure local files exist and are non-zero before uploading
    try {
        if (file && file.uri && file.uri.startsWith('file')) {
            const fileObj = new FileSystem.File(file.uri);
            const exists = fileObj.exists;
            const size = fileObj.size;
            console.log('Local file info before upload:', { exists, size });
            if (!exists || size === 0) {
                console.error('File missing or zero-sized, aborting upload', { exists, size });
                return { ok: false, error: 'file_missing_or_zero_size' };
            }
        }
    } catch (e) {
        console.warn('Could not stat local file before upload', e);
        // continue - try upload; server may accept streaming of content URIs
    }

    const formData = new FormData();
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
    });

    try {
        const response = await Promise.race([
            fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT)),
        ]);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Upload successful:', responseData);
        return responseData;
    } catch (error) {
        console.error('Upload error:', error);
        return Constants.networkError_code;
    }

};


export const checkLogin = async (email, password) => {
    /* Request params */
    let params = "";
    params += `action=${Constants.CHECK_LOGIN}`;
    params += `&EMAIL=${safeEncodeURIComponent(email)}`;
    params += `&PASSWORD=${safeEncodeURIComponent(password)}`;

    /* Send request */
    const response = await pickHttpRequest(params);

    /* Check response */
    if (response === Constants.networkError_code) {
        return null;
    }
    if (response.ok) {
        return await response.json();
    }

    return null;
};

export const registerUser = async (name, email, phone, password) => {
    /* Request params */
    let params = "";
    params += `action=${Constants.REGISTER_USER}`;
    params += `&NAME=${safeEncodeURIComponent(name)}`;
    params += `&EMAIL=${safeEncodeURIComponent(email)}`;
    params += `&PHONE=${safeEncodeURIComponent(phone)}`;
    params += `&PASSWORD=${safeEncodeURIComponent(password)}`;

    /* Send request */
    const response = await pickHttpRequest(params);

    /* Check response */
    if (response === Constants.networkError_code) {
        return null;
    }
    if (response.ok) {
        return await response.json();
    }

    return null;
};

export const saveProfileChanges = async (email, name, phone, photo) => {
    /* Request params */
    let params = "";
    params += `action=${Constants.SAVE_PROFILE_CHANGES}`;
    params += `&EMAIL=${safeEncodeURIComponent(email)}`;
    params += `&NAME=${safeEncodeURIComponent(name)}`;
    params += `&PHONE=${safeEncodeURIComponent(phone)}`;

    // If photo is provided, include it
    if (photo) {
        params += `&PHOTO=${safeEncodeURIComponent(photo)}`;
    }

    /* Send request */
    const response = await pickHttpRequest(params);

    /* Check response */
    if (response === Constants.networkError_code) {
        return { res: false, msg: 'Network error. Please check your connection.' };
    }
    if (response.ok) {
        return await response.json();
    }

    return { res: false, msg: 'Failed to update profile. Please try again.' };
};

export const sendEmailOtp = async (email) => {
    /* Request params */
    let params = "";
    params += `action=${Constants.SEND_EMAIL_OTP}`;
    params += `&EMAIL=${safeEncodeURIComponent(email)}`;

    /* Send request */
    const response = await pickHttpRequest(params);

    /* Check response */
    if (response === Constants.networkError_code) {
        return { res: false, msg: 'Network error. Please check your connection.' };
    }
    if (response.ok) {
        return await response.json();
    }

    return { res: false, msg: 'Failed to send OTP. Please try again.' };
};

export const verifyOtp = async (email, otp) => {
    /* Request params */
    let params = "";
    params += `action=${Constants.VERIFY_OTP}`;
    params += `&EMAIL=${safeEncodeURIComponent(email)}`;
    params += `&OTP=${safeEncodeURIComponent(otp)}`;

    /* Send request */
    const response = await pickHttpRequest(params);

    /* Check response */
    if (response === Constants.networkError_code) {
        return { res: false, msg: 'Network error. Please check your connection.' };
    }
    if (response.ok) {
        return await response.json();
    }

    return { res: false, msg: 'Failed to verify OTP. Please try again.' };
};

export const getCustomers = async (category = '') => {
    /* Request params */
    let params = "";
    params += `action=${Constants.GET_CUSTOMERS}`;
    params += `&CATEGORY=${safeEncodeURIComponent(category)}`;

    /* Send request */
    const response = await pickHttpRequest(params);

    /* Check response */
    if (response === Constants.networkError_code) {
        return { res: false, msg: 'Network error. Please check your connection.', data: [] };
    }
    if (response.ok) {
        const jsonResponse = await response.json();
        // Ensure we return an array
        if (Array.isArray(jsonResponse)) {
            return { res: true, data: jsonResponse };
        }
        return { res: true, data: jsonResponse.data || [] };
    }

    return { res: false, msg: 'Failed to fetch gyms.', data: [] };
};

export const getCustomerDetails = async (customer, branch) => {
    /* Request params */
    let params = "";
    params += `action=${Constants.GET_CUSTOMER_DETAILS}`;
    params += `&CUSTOMER=${safeEncodeURIComponent(customer)}`;
    params += `&BRANCH=${safeEncodeURIComponent(branch)}`;

    /* Send request */
    const response = await pickHttpRequest(params);

    /* Check response */
    if (response === Constants.networkError_code) {
        return null;
    }
    if (response.ok) {
        return await response.json();
    }

    return null;
};




