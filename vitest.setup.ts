import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL's built-in auto-cleanup only kicks in when it finds a global `afterEach`,
// which doesn't exist here since vitest.config.ts doesn't set test.globals.
afterEach(cleanup);
