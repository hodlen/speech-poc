import { IFlyTekApiCredentials } from "./recognizor/base";

export const IFLYTEK_CREDS: IFlyTekApiCredentials = {
  appId: import.meta.env.VITE_IFLYTEK_APP_ID,
  apiKey: import.meta.env.VITE_IFLYTEK_API_KEY,
  apiSecret: import.meta.env.VITE_IFLYTEK_API_SECRET,
};
