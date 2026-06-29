import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-ipvtcpSHmCRP7pyu9WnR1Y2B8iJLe_M",
  authDomain: "any-thing-souqe.firebaseapp.com",
  projectId: "any-thing-souqe",
  storageBucket: "any-thing-souqe.firebasestorage.app",
  messagingSenderId: "475288115133",
  appId: "1:475288115133:web:fd53f7302437f2064924d4",
  measurementId: "G-801XPN09G1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();
export { app, db, auth, storage, googleProvider, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, setDoc, ref, uploadBytes, getDownloadURL, deleteObject, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged };
