import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  const originalDev = import.meta.env.DEV;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("always calls console.error", () => {
    logger.error("boom");
    expect(console.error).toHaveBeenCalledWith("boom");
  });

  it("respects DEV flag for log/warn", () => {
    logger.log("dev-only");
    logger.warn("dev-only");
    // In test env, DEV is true — both should fire
    if (originalDev) {
      expect(console.log).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    }
  });
});
