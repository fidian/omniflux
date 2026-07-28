import { goto, openSidebar, openSidebarSection, hashNavigate } from "./util";
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Delete button
// ---------------------------------------------------------------------------

test("Delete button removes the current page when the confirmation is accepted", async ({
    page,
}) => {
    // Create a page so there is something to delete.
    await goto(page, "delete-me");
    await page.locator(".of-input").fill("# Delete Me");
    await page.locator(".of-apply").click();
    await expect(page.locator("article#delete-me")).toBeVisible();

    // Re-open the editor and click Delete.
    await page.locator(".of-edit").click();
    page.once("dialog", async (dialog) => {
        expect(dialog.message()).toBe(
            "Are you sure you want to delete this page?"
        );
        await dialog.accept();
    });
    await page.locator(".of-delete").click();

    await expect(page.locator("article#delete-me")).toHaveCount(0);
    await expect(page.url()).not.toContain("#delete-me");
});

test("Delete button keeps the page when the confirmation is dismissed", async ({
    page,
}) => {
    await goto(page, "keep-me");
    await page.locator(".of-input").fill("# Keep Me");
    await page.locator(".of-apply").click();

    await page.locator(".of-edit").click();
    page.once("dialog", async (dialog) => {
        await dialog.dismiss();
    });
    await page.locator(".of-delete").click();

    // Editor should still be open and the page should still exist.
    await expect(page.locator(".of-input")).toBeVisible();
    await page.locator(".of-cancel").click();
    await expect(page.locator("article#keep-me")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Rename wiki
// ---------------------------------------------------------------------------

test("Rename wiki updates the document title", async ({ page }) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-rename");

    page.once("dialog", async (dialog) => {
        await dialog.accept("My Renamed Wiki");
    });
    await page.locator(".of-rename").click();

    await expect(page).toHaveTitle("My Renamed Wiki");
});

// ---------------------------------------------------------------------------
// Change page ID
// ---------------------------------------------------------------------------

test("Change page ID renames the article and updates all links to it", async ({
    page,
}) => {
    // Create the page to rename.
    await goto(page, "old-id");
    await page.locator(".of-input").fill("# Old Id");
    await page.locator(".of-apply").click();
    // URL is now #old-id

    // Create a page that links to it (hash change — no server reload).
    await hashNavigate(page, "links-to-old");
    await page.locator(".of-input").fill("See [[old-id|the page]]");
    await page.locator(".of-apply").click();
    // URL is now #links-to-old

    // Navigate back to old-id to change its ID (hash change — no server reload).
    await hashNavigate(page, "old-id");
    await openSidebar(page);
    await openSidebarSection(page, ".of-change-id");

    page.once("dialog", async (dialog) => {
        await dialog.accept("new-id");
    });
    await page.locator(".of-change-id").click();

    // After rename the URL becomes #new-id so that article is the :target.
    await expect(page.locator("article#new-id")).toBeVisible();
    await expect(page.locator("article#old-id")).toHaveCount(0);

    // Navigate to the linking article to verify its href was updated too.
    await hashNavigate(page, "links-to-old");
    await expect(
        page.locator("article#links-to-old a[href='#new-id']")
    ).toBeVisible();
});

test("Change page ID is blocked on the main index page", async ({ page }) => {
    await goto(page); // index page — currentId is empty

    await openSidebar(page);
    await openSidebarSection(page, ".of-change-id");

    page.once("dialog", async (dialog) => {
        expect(dialog.message()).toBe("The main page can't change its ID.");
        await dialog.accept();
    });
    await page.locator(".of-change-id").click();
});

test("Change page ID is blocked when the target ID is already in use", async ({
    page,
}) => {
    // Navigate to an existing default-wiki page (markdown-syntax) and attempt
    // to rename it to another existing page (rule-processing).  No page
    // creation is needed, so there are no saveEdits hash-dance race conditions.
    await goto(page, "markdown-syntax");

    // Open the sidebar and Actions section programmatically to avoid any
    // click-propagation side effects during the sidebar's CSS slide-in animation.
    await page.evaluate(() => {
        (
            document.getElementById("of-sidebar-toggle") as HTMLInputElement
        ).checked = true;
        (
            document.querySelector(
                "details:has(.of-change-id)"
            ) as HTMLDetailsElement
        ).open = true;
    });
    await expect(page.locator(".of-change-id")).toBeVisible();

    // Use a single persistent handler because multiple page.once() registrations
    // all fire for the same dialog event rather than queueing for separate ones.
    let dialogCount = 0;
    page.on("dialog", async (dialog) => {
        dialogCount++;
        if (dialogCount === 1) {
            // Prompt: supply the duplicate ID.
            await dialog.accept("rule-processing");
        } else {
            // Alert: duplicate-ID error.
            expect(dialog.message()).toBe("A page with that ID already exists.");
            await dialog.accept();
        }
    });
    await page.locator(".of-change-id").click();
    // Wait for the alert to be dismissed and state to settle.
    await expect(page).toHaveURL(/markdown-syntax/);

    // The page should still carry its original ID.
    await expect(page.locator("article#markdown-syntax")).toBeAttached();
    expect(dialogCount).toBe(2);
});

// ---------------------------------------------------------------------------
// Clear wiki
// ---------------------------------------------------------------------------

test("Clear wiki removes all pages and resets to default content when confirmed", async ({
    page,
}) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-clear");

    page.once("dialog", async (dialog) => {
        expect(dialog.message()).toBe(
            "Are you sure you want to empty this wiki?"
        );
        await dialog.accept();
    });
    await page.locator(".of-clear").click();

    // The default pages shipped with the wiki are gone.
    await expect(page.locator("article#markdown-syntax")).toHaveCount(0);
});

test("Clear wiki keeps everything when the confirmation is dismissed", async ({
    page,
}) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-clear");

    page.once("dialog", async (dialog) => {
        await dialog.dismiss();
    });
    await page.locator(".of-clear").click();

    // article#markdown-syntax still exists in the DOM.
    await expect(page.locator("article#markdown-syntax")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// Download button
// ---------------------------------------------------------------------------

test("Download button saves the wiki as an HTML file", async ({ page }) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-download");

    const downloadPromise = page.waitForEvent("download");
    await page.locator(".of-download").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.html$/);
});
