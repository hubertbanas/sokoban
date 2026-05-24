import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import i18n from "./i18n";

beforeEach(() => {
    void i18n.changeLanguage("en");
});
