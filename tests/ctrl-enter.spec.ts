import { goto } from "./util";
import { test, expect } from "@playwright/test";

test("Ctrl+Enter starts editing when not in edit mode", async ({ page }) => {
    await goto(page);
    await expect(page.locator(".of-input")).toBeHidden();

    await page.keyboard.press("Control+Enter");

    await expect(page.locator(".of-input")).toBeVisible();
    await page.locator(".of-cancel").click();
});

test("Ctrl+Enter saves edits when the editor is open", async ({ page }) => {
    await goto(page, "ctrl-enter-page");
    // Navigating to a new page opens the editor automatically.
    await page.locator(".of-input").fill("# Ctrl Enter Page");

    await page.keyboard.press("Control+Enter");

    await expect(page.locator(".of-input")).toBeHidden();
    await expect(page.locator("article#ctrl-enter-page h1")).toHaveText(
        "Ctrl Enter Page"
    );
});

test("Meta+Enter (Cmd+Enter) also starts editing and saves", async ({
    page
}) => {
    await goto(page);
    await expect(page.locator(".of-input")).toBeHidden();

    await page.keyboard.press("Meta+Enter");
    await expect(page.locator(".of-input")).toBeVisible();

    await page.locator(".of-input").fill("# Meta Enter Test");
    await page.keyboard.press("Meta+Enter");

    await expect(page.locator(".of-input")).toBeHidden();
    await expect(page.locator("article.index h1")).toHaveText(
        "Meta Enter Test"
    );
});
