import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
