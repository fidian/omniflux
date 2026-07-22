import { goto } from "./util";
import { test, expect, type Page } from "@playwright/test";

async function expectShortcutToDownload(page: Page, shortcut: string) {
    await goto(page);

    const downloadPromise = page.waitForEvent("download");
    await page.keyboard.press(shortcut);
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(
        /^OmniFlux Wiki-\d{8}-\d{6}\.html$/
    );
}

test("Control-S downloads the wiki", async ({ page }) => {
    await expectShortcutToDownload(page, "Control+S");
});

test("Command-S downloads the wiki", async ({ page }) => {
    await expectShortcutToDownload(page, "Meta+S");
});
