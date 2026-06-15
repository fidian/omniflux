import { Page } from "@playwright/test";

const indexUrl = `http://localhost:5173/`;

export function goto(page: Page, fragment?: string) {
    if (typeof fragment !== "string") {
        return page.goto(indexUrl);
    }

    return page.goto(`${indexUrl}#${fragment}`);
}
