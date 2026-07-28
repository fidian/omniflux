import { goto, openSidebar, openSidebarSection, hashNavigate } from "./util";
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Index panel
// ---------------------------------------------------------------------------

test("Index panel lists every article and updates when pages are created or edited", async ({
    page,
}) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-index");

    // The default wiki has at least the Markdown Syntax page in the index.
    await expect(
        page.locator(".of-index a[href='#markdown-syntax']")
    ).toBeVisible();

    // Creating a new page should add it to the index immediately.
    await goto(page, "index-test-page");
    await page.locator(".of-input").fill("# Index Test Page");
    await page.locator(".of-apply").click();

    await openSidebar(page);
    await openSidebarSection(page, ".of-index");
    await expect(
        page.locator(".of-index a[href='#index-test-page']")
    ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Backlinks panel
// ---------------------------------------------------------------------------

test("Backlinks lists articles that contain a link to the current page", async ({
    page,
}) => {
    // Create a page that links to another.
    await goto(page, "backlink-source");
    await page.locator(".of-input").fill("Points to [[backlink-target]]");
    await page.locator(".of-apply").click();

    // Create the target page.
    await goto(page, "backlink-target");
    await page.locator(".of-input").fill("# Backlink Target");
    await page.locator(".of-apply").click();

    // We are already on #backlink-target — check backlinks.
    await openSidebar(page);
    await openSidebarSection(page, ".of-backlinks");
    await expect(
        page.locator(".of-backlinks a[href='#backlink-source']")
    ).toBeVisible();
});

test("Backlinks shows 'No pages link here.' when nothing links to the current page", async ({
    page,
}) => {
    // Create an isolated page that no other page references.
    await goto(page, "isolated-page-abc123");
    await page.locator(".of-input").fill("# Isolated Page");
    await page.locator(".of-apply").click();

    await openSidebar(page);
    await openSidebarSection(page, ".of-backlinks");
    await expect(page.locator(".of-backlinks")).toHaveText(
        "No pages link here."
    );
});

// ---------------------------------------------------------------------------
// Broken links panel
// ---------------------------------------------------------------------------

test("Broken links panel highlights links to non-existent pages", async ({
    page,
}) => {
    await goto(page);

    // The default wiki ships with an intentionally broken link.
    await expect(page.locator("body")).toHaveClass(/of-broken-flag/);

    // The link should be recorded in the .of-broken section regardless of
    // whether the accordion panel is expanded.
    await expect(
        page.locator(".of-broken a[href='#intentionally-missing-page']")
    ).toBeAttached();
});

test("Broken links panel clears when the missing page is created", async ({
    page,
}) => {
    await goto(page);
    await expect(page.locator("body")).toHaveClass(/of-broken-flag/);

    // Navigate via hash change (no server reload) to preserve in-browser state.
    await hashNavigate(page, "intentionally-missing-page");
    await page.locator(".of-input").fill("# No Longer Missing");
    await page.locator(".of-apply").click();

    await expect(page.locator("body")).not.toHaveClass(/of-broken-flag/);
    await expect(
        page.locator(".of-broken a[href='#intentionally-missing-page']")
    ).not.toBeAttached();
});
