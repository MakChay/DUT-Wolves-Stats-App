/**
 * Firebase and Cloudinary configuration, read from Vite environment variables.
 *
 * Values live in .env.local (git-ignored). Firebase web config identifies the
 * project and is not a secret; security comes from Firestore/Storage rules and
 * App Check. Cloudinary API secrets must never be placed in VITE_ variables,
 * because Vite bundles them into the public client.
 */
const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
  appCheckSiteKey: env.VITE_FIREBASE_APP_CHECK_SITE_KEY ?? '',
} as const

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)

export const cloudinaryConfig = {
  cloudName: env.VITE_CLOUDINARY_CLOUD_NAME ?? '',
  uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '',
} as const

export const isCloudinaryConfigured = Boolean(cloudinaryConfig.cloudName)

export const canUploadToCloudinary = Boolean(
  cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset,
)
