import { useCallback, useState } from "react";

export const MAX_ERROR_RETRIES = 2;

interface UseErrorRetryResult {
  retryCount: number;
  canDismiss: boolean;
  onRetry: (retryFn: () => void) => void;
}

export function useErrorRetry(): UseErrorRetryResult {
  const [retryCount, setRetryCount] = useState(0);
  const canDismiss = retryCount < MAX_ERROR_RETRIES;

  const onRetry = useCallback(
    (retryFn: () => void): void => {
      if (!canDismiss) {
        return;
      }
      setRetryCount((count) => count + 1);
      retryFn();
    },
    [canDismiss],
  );

  return { retryCount, canDismiss, onRetry };
}
