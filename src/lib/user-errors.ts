export interface UserErrorMessage {
  title: string;
  message: string;
}

const genericSignInError: UserErrorMessage = {
  title: "We couldn’t sign you in",
  message: "Please check your details and try again. If the problem continues, contact a 10Trials owner.",
};

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return "";
}

function errorStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number(error.status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

export function signInErrorMessage(error: unknown): UserErrorMessage | null {
  const code = errorCode(error);

  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return null;
  }

  if (code.startsWith("auth/api-key-not-valid") || code === "auth/invalid-api-key") {
    return {
      title: "Sign-in needs attention",
      message: "The administration sign-in service is not configured correctly. Contact the system owner.",
    };
  }

  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  ) {
    return {
      title: "Email or password is incorrect",
      message: "Check the email address and password, then try again.",
    };
  }

  const messages: Record<string, UserErrorMessage> = {
    ADMIN_LOGIN_INVALID: {
      title: "Email or password is incorrect",
      message: "Check the administrator email and password, then try again.",
    },
    ADMIN_SESSION_INVALID: {
      title: "Your session has expired",
      message: "Sign in again to continue.",
    },
    ADMIN_OTP_INCORRECT: {
      title: "That code isn’t correct",
      message: "Check the six-digit code in your latest email and try again.",
    },
    ADMIN_OTP_EXPIRED: {
      title: "This code has expired",
      message: "Return to sign-in to request a new verification code.",
    },
    ADMIN_OTP_INVALID: {
      title: "Verification needs to restart",
      message: "This sign-in request is no longer valid. Return to sign-in and try again.",
    },
    ADMIN_OTP_ATTEMPTS_EXCEEDED: {
      title: "Too many incorrect codes",
      message: "For your security, return to sign-in and request a new code.",
    },
    ADMIN_OTP_RESEND_WAIT: {
      title: "Please wait a moment",
      message: "A code was sent recently. Wait for the countdown before requesting another.",
    },
    ADMIN_OTP_RESEND_LIMIT: {
      title: "Verification needs to restart",
      message: "The resend limit was reached. Return to sign-in to request a fresh code.",
    },
    ADMIN_OTP_DELIVERY_FAILED: {
      title: "We couldn’t send the code",
      message: "Email delivery is temporarily unavailable. Try again in a moment.",
    },
    ADMIN_OTP_UNAVAILABLE: {
      title: "Verification is unavailable",
      message: "Administrator email verification is not configured correctly. Contact the system owner.",
    },
    ADMIN_GOOGLE_INVALID: {
      title: "Google couldn’t verify this sign-in",
      message: "Choose your Google account again, or sign in with email and password.",
    },
    ADMIN_GOOGLE_NOT_PROVISIONED: {
      title: "Administrator access has not been granted",
      message: "Ask a 10Trials owner to add this email as a separate administrator account.",
    },
    ADMIN_GOOGLE_UNAVAILABLE: {
      title: "Google sign-in is unavailable",
      message: "Use your administrator email and password, or contact the system owner.",
    },
    "auth/invalid-email": {
      title: "Check the email address",
      message: "Enter a complete email address, such as name@company.com.",
    },
    "auth/user-disabled": {
      title: "This account is disabled",
      message: "Ask a 10Trials owner to reactivate your administrator account.",
    },
    "auth/too-many-requests": {
      title: "Too many sign-in attempts",
      message: "Wait a few minutes before trying again, or ask a 10Trials owner for help.",
    },
    "auth/network-request-failed": {
      title: "We couldn’t reach the sign-in service",
      message: "Check your internet connection and try again.",
    },
    "auth/popup-blocked": {
      title: "Google sign-in was blocked",
      message: "Allow pop-ups for this page, then try signing in with Google again.",
    },
    "auth/account-exists-with-different-credential": {
      title: "Use your usual sign-in method",
      message: "This email is already linked to another sign-in method. Try your email and password.",
    },
    "auth/operation-not-allowed": {
      title: "This sign-in method is unavailable",
      message: "Use another sign-in option or contact a 10Trials owner.",
    },
    ADMIN_AUTH_REQUIRED: {
      title: "Administrator access has not been granted",
      message: "Sign in with an administrator account to continue.",
    },
    ADMIN_INACTIVE: {
      title: "Administrator access is inactive",
      message: "Ask a 10Trials owner to reactivate this account.",
    },
    ADMIN_ROLE_INVALID: {
      title: "Your access needs attention",
      message: "Ask a 10Trials owner to review your administrator role.",
    },
    AUTH_SERVICE_UNAVAILABLE: {
      title: "Sign-in is temporarily unavailable",
      message: "Wait a moment and try again. Your account has not been changed.",
    },
    NETWORK_ERROR: {
      title: "The administration service is unavailable",
      message: "Check your connection and try again in a moment.",
    },
  };

  return messages[code] ?? genericSignInError;
}

export function accessErrorMessage(error: unknown): UserErrorMessage {
  if (!error) {
    return {
      title: "Administrator access required",
      message: "Sign in with a different account or ask a 10Trials owner for access.",
    };
  }
  return (
    signInErrorMessage(error) ?? {
      title: "Administrator access required",
      message: "Sign in with a different account or ask a 10Trials owner for access.",
    }
  );
}

export function requestErrorMessage(error: unknown): string {
  const code = errorCode(error);
  const messages: Record<string, string> = {
    ADMIN_EMAIL_IN_USE: "That email is already used by another administrator.",
    ADMIN_PROVISIONING_FAILED: "We couldn’t add this administrator right now. Try again in a moment.",
    ADMIN_UPDATE_FAILED: "We couldn’t update this administrator right now. Try again in a moment.",
    ADMIN_NOT_FOUND: "This administrator could not be found. Refresh the page and try again.",
    LAST_OWNER_REQUIRED: "There must always be at least one active owner. Add another owner before changing this one.",
    VALIDATION_ERROR: "Check the information you entered and try again.",
    ADJUSTMENT_REQUIRED: "Enter a change to sessions or questions before saving.",
    USER_NOT_FOUND: "This learner could not be found. They may no longer be available.",
    ACCOUNT_NOT_RESTORABLE: "This learner account cannot be restored from its current state.",
    JOB_NOT_FOUND: "This background task is no longer available to retry.",
    JOB_NOT_RETRYABLE: "Only failed or cancelled background tasks can be retried.",
  };
  if (messages[code]) return messages[code];
  if (code === "NETWORK_ERROR") {
    return "We couldn’t connect to the administration service. Check your connection and try again.";
  }
  if (code === "ADMIN_PERMISSION_REQUIRED") {
    return "Your administrator role does not allow this action. Ask an owner if you need access.";
  }
  if (code === "AUTH_REQUIRED" || code === "RECENT_AUTH_REQUIRED") {
    return "Your session has expired. Sign in again to continue.";
  }
  if ((errorStatus(error) ?? 0) >= 500) {
    return "Something went wrong on our side. Try again in a moment.";
  }
  return "We couldn’t complete this request. Try again, or contact a 10Trials owner if it continues.";
}
