import { goto } from "./util";
import { test, expect } from "@playwright/test";

// When a user navigates to a non-existent page the editor opens pre-filled
// with a heading derived from the page ID via the id2Name() function.
//
// Rules: hyphens and underscores become spaces; each word's first letter is
// capitalised; numeric sequences at word boundaries are left as-is.

const idToTitleScenarios = [
    { id: "my-page", expectedTitle: "My Page" },
    { id: "my_page", expectedTitle: "My Page" },
    { id: "hello-world-123", expectedTitle: "Hello World 123" },
    { id: "multi--dash", expectedTitle: "Multi Dash" },
    { id: "single", expectedTitle: "Single" },
];

test("New-page editor is pre-filled with a heading derived from the page ID", async ({
    page,
}) => {
    for (const { id, expectedTitle } of idToTitleScenarios) {
        await goto(page, id);
        // Non-existent page → editor opens automatically.
        await expect(page.locator(".of-input")).toBeVisible();
        await expect(page.locator(".of-input")).toHaveValue(
            `# ${expectedTitle}\n\n`
        );
        // Cancel so the next iteration starts without a saved article.
        await page.locator(".of-cancel").click();
    }
});

test("Cancelling a new-page editor navigates back to the index page", async ({
    page,
}) => {
    await goto(page, "cancel-test-page-xyz");
    await expect(page.locator(".of-input")).toBeVisible();

    await page.locator(".of-cancel").click();

    await expect(page.locator(".of-input")).toBeHidden();
    // After cancel, location.hash is cleared → index article is visible.
    await expect(page.locator("article.index")).toBeVisible();
});
