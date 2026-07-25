import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { EditModeProvider, useEditMode } from "./useEditMode";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EditModeProvider>{children}</EditModeProvider>
);

describe("useEditMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to false when nothing stored", () => {
    const { result } = renderHook(() => useEditMode(), { wrapper });
    expect(result.current.isEditMode).toBe(false);
  });

  it("reads initial value from localStorage", () => {
    localStorage.setItem("editMode", "true");
    const { result } = renderHook(() => useEditMode(), { wrapper });
    expect(result.current.isEditMode).toBe(true);
  });

  it("toggles edit mode and persists to localStorage", () => {
    const { result } = renderHook(() => useEditMode(), { wrapper });

    act(() => result.current.toggleEditMode());
    expect(result.current.isEditMode).toBe(true);
    expect(localStorage.getItem("editMode")).toBe("true");

    act(() => result.current.toggleEditMode());
    expect(result.current.isEditMode).toBe(false);
    expect(localStorage.getItem("editMode")).toBe("false");
  });

  it("setEditMode assigns explicit value", () => {
    const { result } = renderHook(() => useEditMode(), { wrapper });
    act(() => result.current.setEditMode(true));
    expect(result.current.isEditMode).toBe(true);
    act(() => result.current.setEditMode(false));
    expect(result.current.isEditMode).toBe(false);
  });

  it("throws when used outside provider", () => {
    // Silence expected React error boundary log
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useEditMode())).toThrow(
      /must be used within an EditModeProvider/
    );
    spy.mockRestore();
  });
});
