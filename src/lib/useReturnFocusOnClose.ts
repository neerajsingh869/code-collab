import { useEffect, useRef, type RefObject } from "react";

// A panel's close button unmounts along with the panel, which leaves focus on
// <body> and sends a keyboard user back to the top of the page. Hand focus
// back to whatever opened the panel instead.
export const useReturnFocusOnClose = (
  isOpen: boolean,
  trigger: RefObject<HTMLElement | null>,
) => {
  const wasOpen = useRef(isOpen);

  useEffect(() => {
    if (wasOpen.current && !isOpen) trigger.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen, trigger]);
};
