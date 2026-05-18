import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";

import {
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";

import { auth } from "../../firebase";

WebBrowser.maybeCompleteAuthSession();

/**
 * Google Authentication Hook (Firebase + Expo)
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] =
    Google.useAuthRequest({
      webClientId:
        "686734513306-p22tbgjspd1lrt38b96fm6j2u68656nj.apps.googleusercontent.com",
      androidClientId:
        "686734513306-17ui6s2mr953nm7dlcc9kc0o0n8qmfie.apps.googleusercontent.com",
    });

  useEffect(() => {
    const handleGoogleLogin = async () => {
      try {
        if (response?.type === "success") {
          const { id_token } = response.params;

          const credential =
            GoogleAuthProvider.credential(id_token);

          const userCredential =
            await signInWithCredential(auth, credential);

          console.log("✅ Google login success:", {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName,
            photo: userCredential.user.photoURL,
          });
        }
      } catch (error) {
        console.log("Google login error:", error);
      }
    };

    handleGoogleLogin();
  }, [response]);

  return {
    promptAsync,
    request,
  };
}