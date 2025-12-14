import { Dimensions, Platform } from "react-native";
// colors
export const width = Dimensions.get("window").width;
export const height = Dimensions.get("window").height;
// Urls
export const appVersion = "v1.0.0";
export const serverBaseUrl = "https://puresoft.ddns.net";
export const serverPublicBaseUrl = "https://puresoft.ddns.net";
export const attachmentPath = serverPublicBaseUrl + "/pick/faces/attachments/fitmap/";
export const pickServerUrl =
    serverBaseUrl +
    "/pick/faces/redirect/fitmap?connector=FITMAP.CONNECTOR&appversion=" +
    appVersion +
    "&";
export const pickPublicServerUrl =
    serverPublicBaseUrl
"/pick/faces/redirect/fitmap?connector=FITMAP.CONNECTOR&appversion=" +
    appVersion +
    "&";

export const serverAttachmentsBaseUrl =
    serverPublicBaseUrl + "/pick/faces/attachments";
export const CURRENT_SERVER = "CURRENT_SERVER";
export const CURRENT_SERVER_IP = "CURRENT_SERVER_IP";
// User
export const cur_user = "cur.user";
export const IS_LOGGED_IN = "IS_LOGGED_IN";
export const USER_NAME = "USER_NAME";
export const USER_EMAIL = "USER_EMAIL";
export const USER_PHONE = "USER_PHONE";
export const USER_MEMBER_SINCE = "USER_MEMBER_SINCE";
export const USER_PROFILE_IMAGE = "USER_PROFILE_IMAGE";
export const USER_PASSWORD = "USER_PASSWORD";
export const USER_TYPE = "USER_TYPE";
export const USER_FREE_VISITS = "USER_FREE_VISITS";
export const USE_LOCATION = "USE_LOCATION";

// Codes
export const networkError_code = 100;

// Actions
export const CHECK_LOGIN = "CHECK.LOGIN";
export const UPLOAD = "UPLOAD";
export const GET_CUSTOMERS = "GET.CUSTOMERS";
export const GET_CUSTOMER_DETAILS = "GET.CUSTOMER.DETAILS";
export const REGISTER_USER = "REGISTER.USER";
export const SAVE_PROFILE_CHANGES = "SAVE.PROFILE.CHANGES";
export const SEND_EMAIL_OTP = "SEND.EMAIL.OTP";
export const VERIFY_OTP = "VERIFY.OTP";
export const GET_CUSTOMER_INFO = "GET.CUSTOMER.INFO";
export const GET_MY_SUBSCRIPTIONS = "GET.MY.SUBSCRIPTIONS";
export const SAVE_GYM_DATA = "SAVE.GYM.DATA";
export const GET_SERVICES = "GET.SERVICES";
export const SUBSCRIBE_TO_GYM = "SUBSCRIBE.TO.GYM";
export const RESTORE_PASSWORD = "RESTORE.PASSWORD";
export const REQUEST_ENTRY = "REQUEST.ENTRY";
export const RESPOND_TO_ENTRY_REQUEST = "RESPOND.TO.ENTRY.REQUEST";
export const GET_ENTRY_REQUESTS = "GET.ENTRY.REQUESTS";
// Key for saved app language (en/ar)
export const language = "language";
