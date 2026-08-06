import { goto } from "./util";
import { test, expect } from "@playwright/test";

function select(page: any, start: number, end: number) {
    return page.evaluate(
        ({ start, end }: { start: number; end: number }) => {
            const textarea = document.querySelector("textarea");
            if (!textarea) throw new Error("Textarea not found");

            // Select the text in the textarea
            textarea.setSelectionRange(start, end);
        },
        { start, end }
    );
}

function simulatePaste(page: any, data: Record<string, string>) {
    return page.evaluate(
        ({ data }: { data: Record<string, string> }) => {
            const clip = {
                getData: (type: string) => data[type] || ""
            };
            const event = new Event("paste", {
                bubbles: true,
                cancelable: true
            });
            Object.defineProperty(event, "clipboardData", {
                value: clip
            });
            const textarea = document.querySelector("textarea");
            if (!textarea) throw new Error("Textarea not found");
            textarea.dispatchEvent(event);
        },
        { data }
    );
}

// This uses keyboard shortcuts to fire native copy and paste events, which is
// the only secure way to get the browser to honor the paste event. If the
// paste event is manually fired, the browser does not honor the event.
test("Pasting plain URL without selection inserts plain URL", async ({
    page
}) => {
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await goto(page);
    await page.click(".of-edit");
    await expect(page.locator(".of-input")).toBeVisible();
    await page.locator(".of-input").fill("https://example.com/path?q=1");
    await page.locator("textarea").click();

    // Select all
    await page.keyboard.press(`${modifier}+A`);

    // Trigger the copy shortcut
    await page.keyboard.press(`${modifier}+C`);
    await page.locator(".of-input").fill("TE__ST");
    await select(page, 3, 3);
    await page.focus("textarea");

    // Trigger the paste shortcut
    await page.keyboard.press(`${modifier}+V`);
    await expect(page.locator(".of-input")).toHaveValue(
        "TE_https://example.com/path?q=1_ST"
    );
});

test("Pasting plain URL over selection creates markdown link", async ({
    page
}) => {
    await goto(page);
    await page.click(".of-edit");
    await page.locator(".of-input").fill("X Label X");
    await select(page, 2, 7);
    await simulatePaste(page, { "text/plain": "https://example.com/" });
    await expect(page.locator(".of-input")).toHaveValue(
        "X [Label](https://example.com/) X"
    );
});

test("Pasting HTML link converts to markdown via html2Md", async ({ page }) => {
    await goto(page);
    await page.click(".of-edit");
    await page.locator(".of-input").fill("");
    await simulatePaste(page, {
        "text/html": `<a href="https://example.com/">Example</a>`,
        "text/plain": "https://example.com/"
    });
    await expect(page.locator(".of-input")).toHaveValue(
        "[Example](https://example.com/)"
    );
});
