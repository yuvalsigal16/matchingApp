import { initializeApp } from "firebase/app";

import {
getFirestore
}
from "firebase/firestore";

const firebaseConfig = {

apiKey:
"AIzaSyDnMHtv3j388nXCrWACHRrvIwZ2QVbxLlM",

authDomain:
"travelmatchplanner.firebaseapp.com",

projectId:
"travelmatchplanner",

storageBucket:
"travelmatchplanner.firebasestorage.app",

messagingSenderId:
"200616885469",

appId:
"1:200616885469:web:8d1df3543b97b7f99d6f34",

};

const app =
initializeApp(
firebaseConfig
);

export const db =
getFirestore(
app
);