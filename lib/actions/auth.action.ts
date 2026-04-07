"use server";

import { adminAuth, adminDb } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Set session cookie
export async function setSessionCookie(idToken: string) {
  try {
    const cookieStore = await cookies();

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION * 1000, // milliseconds
    });

    console.log("✓ Session cookie created successfully");

    // Set cookie in the browser
    cookieStore.set("session", sessionCookie, {
      maxAge: SESSION_DURATION,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    console.log("✓ Session cookie set in response");
  } catch (error) {
    console.error("✗ Error setting session cookie:", error);
    throw error;
  }
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    // check if user exists in db
    const userRecord = await adminDb.collection("users").doc(uid).get();
    if (userRecord.exists)
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };

    // save user to db
    await adminDb.collection("users").doc(uid).set({
      name,
      email,
      // profileURL,
      // resumeURL,
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle Firebase specific errors
    if (error.code === "auth/email-already-exists") {
      return {
        success: false,
        message: "This email is already in use",
      };
    }

    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  console.log("→ Sign-in attempt for:", email);

  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    if (!userRecord) {
      console.log("✗ User not found:", email);
      return {
        success: false,
        message: "User does not exist. Create an account.",
      };
    }

    console.log("✓ User found:", userRecord.uid);

    try {
      await setSessionCookie(idToken);
    } catch (cookieError: any) {
      console.error("✗ Session cookie creation failed:", cookieError);
      return {
        success: false,
        message: "Failed to create session. Please try again.",
      };
    }

    console.log("✓ Sign-in successful for:", email);
    return {
      success: true,
      message: "Signed in successfully.",
    };
  } catch (error: any) {
    console.error("✗ Sign-in error:", error);

    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    console.log("⚠ No session cookie found");
    return null;
  }

  console.log("✓ Session cookie found, verifying...");

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    console.log("✓ Session cookie verified for user:", decodedClaims.uid);

    // get user info from db
    const userRecord = await adminDb
      .collection("users")
      .doc(decodedClaims.uid)
      .get();

    if (!userRecord.exists) {
      console.log("✗ User record not found in database");
      return null;
    }

    console.log("✓ User record retrieved:", userRecord.id);

    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User;
  } catch (error) {
    console.error("✗ Session verification failed:", error);

    // Invalid or expired session
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
