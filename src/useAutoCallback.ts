import { useCallback, useRef } from "react";

export const useAutoCallback = <T extends (...args: any[]) => any>(
  originCallback: T
) => {
  const ref = useRef(originCallback);
  ref.current = originCallback;

  return useCallback(((...args) => ref.current?.(...args)) as T, []);
};
