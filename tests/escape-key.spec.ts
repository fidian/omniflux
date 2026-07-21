import { goto } from "./util";
import { test, expect } from "@playwright/test";

test("Escape cancels edits without saving", async ({ page }) => {
    await goto(page);
    await expect(page.locator("h1:visible")).toHaveText(
        "OmniFlux - Single-Page Wiki"
    );

    await page.locator(".of-edit").click();
    await expect(page.locator(".of-input")).toBeVisible();
    await page.locator(".of-input").fill("# Unsaved edit");

    await page.keyboard.press("Escape");

    await expect(page.locator(".of-input")).toBeHidden();
    await expect(page.locator("h1:visible")).toHaveText(
        "OmniFlux - Single-Page Wiki"
    );
});

test("Escape toggles the sidebar when not editing", async ({ page }) => {
    await goto(page);
    const sidebarToggle = page.locator("#of-sidebar-toggle");

    await expect(sidebarToggle).not.toBeChecked();
    await page.keyboard.press("Escape");
    await expect(sidebarToggle).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(sidebarToggle).not.toBeChecked();
});
