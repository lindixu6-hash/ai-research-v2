/**
 * 防抖 Hook
 * 延迟执行函数，减少频繁调用
 */
import { useRef, useCallback } from 'react';

export function useDebounce(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  return debouncedCallback;
}

/**
 * 防抖 Hook（带立即执行选项）
 */
export function useDebounceImmediate(callback, delay = 300) {
  const timeoutRef = useRef(null);
  const lastCallRef = useRef(0);

  const debouncedCallback = useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      callback(...args);
      lastCallRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastCallRef.current = Date.now();
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);

  return debouncedCallback;
}
