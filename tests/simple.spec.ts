import { goto } from './util';
import { test, expect } from "@playwright/test";

test("loads correctly", async ({ page }) => {
    await goto(page);
    await expect(page).toHaveTitle(/OmniFlux/);
    await expect(page.locator("#of_toolbar")).toBeVisible();
    await expect(page.locator("h1:visible")).toHaveText("OmniFlux - Single-Page Wiki");
    await goto(page, 'markdown');
    await expect(page.locator("h1:visible")).toHaveText("Markdown Syntax");
});
