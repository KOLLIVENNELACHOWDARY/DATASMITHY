// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config.jsx';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Sign in with email ────────────────────────────────────────────────────
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  // ── Sign up with email ────────────────────────────────────────────────────
  const signup = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch(e) {
      console.error('Sign out error:', e);
      throw e;
    }
  };

  // ── Google sign in ────────────────────────────────────────────────────────
  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  // ── Password reset ────────────────────────────────────────────────────────
  const resetPassword = (email) =>
    sendPasswordResetEmail(auth, email);

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    loginWithGoogle,
    resetPassword,
    // Aliases for compatibility
    signOut:  logout,
    signIn:   login,
    register: signup,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}