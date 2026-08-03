import { goto, openSidebar, openSidebarSection } from "./util";
import { test, expect } from "@playwright/test";

// These scenarios exercise the immediate feedback shown before results appear.
// query === "" clears the results; 1–2 chars show a "too short" hint.
const shortQueryScenarios = [
    { query: "a", expected: "Not enough characters to search." },
    { query: "ab", expected: "Not enough characters to search." },
];

test("Search shows feedback for queries that are too short to run", async ({
    page,
}) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-search");

    for (const { query, expected } of shortQueryScenarios) {
        await page.locator(".of-search").fill(query);
        await expect(page.locator(".of-search-results")).toHaveText(expected);
    }
});

test("Search clears results when the query is emptied", async ({ page }) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-search");

    // Start with a valid query so results appear, then clear it.
    await page.locator(".of-search").fill("markdown");
    await expect(page.locator(".of-search-results a")).not.toHaveCount(0);

    await page.locator(".of-search").fill("");
    await expect(page.locator(".of-search-results")).toBeEmpty();
});

test("Search finds articles containing the query text", async ({ page }) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-search");

    // "markdown" appears in the Markdown Syntax page that ships with the wiki.
    await page.locator(".of-search").fill("markdown");
    await expect(page.locator(".of-search-results a")).not.toHaveCount(0);
});

test("Search is case insensitive", async ({ page }) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-search");

    await page.locator(".of-search").fill("MARKDOWN");
    await expect(page.locator(".of-search-results a")).not.toHaveCount(0);
});

test("Multi-word search requires all terms to appear in the same article", async ({
    page,
}) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-search");

    // Both words exist somewhere in the wiki — results should appear.
    await page.locator(".of-search").fill("markdown syntax");
    await expect(page.locator(".of-search-results a")).not.toHaveCount(0);

    // Add a word that almost certainly appears in no page.
    await page.locator(".of-search").fill("markdown xyznotawordxyz");
    await expect(page.locator(".of-search-results a")).toHaveCount(0);
});

test("Search shows 'No results.' when nothing matches", async ({ page }) => {
    await goto(page);
    await openSidebar(page);
    await openSidebarSection(page, ".of-search");

    await page.locator(".of-search").fill("xyznotawordxyz");
    await expect(page.locator(".of-search-results")).toHaveText("No results.");
});
