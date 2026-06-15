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

export function payWithSnap(token: string, callbacks?: SnapCallbacks) {
  if (typeof window === "undefined" || !window.snap) {
    throw new Error("Midtrans Snap belum siap.");
  }

  window.snap.pay(token, callbacks);
}
