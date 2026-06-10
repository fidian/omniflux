import { Page } from "@playwright/test";

const indexUrl = `http://localhost:5173/`;

export function goto(page: Page, fragment?: string) {
    if (fragment) {
        return page.goto(`${indexUrl}#${fragment}`);
    } else {
        return page.goto(indexUrl);
    }
}
