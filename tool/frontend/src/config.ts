const env = (window as any).__ENV__ || {};

export const config = {
  ASGARDEO_CLIENT_ID: env.VITE_ASGARDEO_CLIENT_ID || import.meta.env.VITE_ASGARDEO_CLIENT_ID,
  ASGARDEO_BASE_URL:  env.VITE_ASGARDEO_BASE_URL  || import.meta.env.VITE_ASGARDEO_BASE_URL,
  RTI_TRACKER_SERVER_URL: env.VITE_RTI_TRACKER_SERVER_URL || import.meta.env.VITE_RTI_TRACKER_SERVER_URL,
  FILE_STORAGE_BASE_URL: env.VITE_FILE_STORAGE_BASE_URL || import.meta.env.VITE_FILE_STORAGE_BASE_URL,
};

if (!config.ASGARDEO_CLIENT_ID || !config.ASGARDEO_BASE_URL) {
  console.error("Missing Asgardeo configuration.");
}