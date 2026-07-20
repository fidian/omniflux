import { goto } from './util';
import { test, expect } from "@playwright/test";

test("editing and deleting new page", async ({ page }) => {
    await goto(page);
    await expect(page).toHaveTitle(/OmniFlux/);
    await page.click(".of-edit");
    await page.fill("textarea", "Go to a [new page](#new-page)!");
    await page.click(".of-save");
    await expect(page.url()).not.toContain("#new-page");
    await page.click("a:has-text('new page')");
    await expect(page.locator("textarea")).toBeVisible();
    await expect(page.url()).toContain("#new-page");
    await page.fill("textarea", "This is the new page.");
    await page.click(".of-save");
    await expect(page.locator("article#new-page p")).toHaveText("This is the new page.");
    await expect(page.url()).toContain("#new-page");
    await page.click(".of-edit");
    await page.fill("textarea", "");
    await page.click(".of-save");
    await expect(page.locator("article#new-page")).toHaveCount(0);
    await expect(page.url()).not.toContain("#new-page");
});
