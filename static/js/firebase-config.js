const defaultFirebaseAuthDomain = "memo-app-9dd98.firebaseapp.com";
const useCurrentFirebaseAuthDomain =
  window.location.protocol === "https:" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  !window.location.hostname.endsWith(".firebaseapp.com");

const firebaseConfig = {
  apiKey: "AIzaSyDagDgJSe9WWMwYNsb7AhfrB7P_AVlfaZ0",
  authDomain: useCurrentFirebaseAuthDomain ? window.location.host : defaultFirebaseAuthDomain,
  projectId: "memo-app-9dd98",
  storageBucket: "memo-app-9dd98.firebasestorage.app",
  messagingSenderId: "999469444865",
  appId: "1:999469444865:web:a970588ac97ad453fbb500",
  measurementId: "G-921LLN7VCT"
};

window.firebaseConfig = firebaseConfig;
