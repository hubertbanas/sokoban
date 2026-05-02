import { expect, test } from "vitest";
import { cn } from "./classnames";

test("joins class names with spaces", () => {
    expect(cn("board", "active", "highlight")).toBe("board active highlight");
});

test("returns an empty string when no class names are provided", () => {
    expect(cn()).toBe("");
});
