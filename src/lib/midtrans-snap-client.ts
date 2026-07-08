export type SnapResult = Record<string, unknown>;

export type SnapCallbacks = {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
};

type SnapApi = {
  pay: (token: string, callbacks?: SnapCallbacks) => void;
};

declare global {
  interface Window {
    snap?: SnapApi;
  }
}

let snapPaymentInProgress = false;

export function payWithSnap(token: string, callbacks?: SnapCallbacks) {
  if (typeof window === "undefined" || !window.snap) {
    throw new Error("Midtrans Snap belum siap.");
  }

  if (snapPaymentInProgress) {
    return false;
  }

  snapPaymentInProgress = true;

  const releasePopup = () => {
    snapPaymentInProgress = false;
  };

  try {
    window.snap.pay(token, {
      onSuccess: (result) => {
        releasePopup();
        callbacks?.onSuccess?.(result);
      },
      onPending: (result) => {
        releasePopup();
        callbacks?.onPending?.(result);
      },
      onError: (result) => {
        releasePopup();
        callbacks?.onError?.(result);
      },
      onClose: () => {
        releasePopup();
        callbacks?.onClose?.();
      },
    });
    return true;
  } catch (error) {
    releasePopup();
    throw error;
  }
}
