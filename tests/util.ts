import { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const indexUrl = `http://localhost:5173/`;

export function goto(page: Page, fragment?: string) {
    if (typeof fragment !== "string") {
        return page.goto(indexUrl);
    }

    return page.goto(`${indexUrl}#${fragment}`);
}

/**
 * Ensures the sidebar panel is slid open. Uses the hamburger label rather
 * than Escape so it works regardless of whether the editor is open.
 */
export async function openSidebar(page: Page) {
    const toggle = page.locator("#of-sidebar-toggle");

    if (!(await toggle.isChecked())) {
        await page.locator("label[for='of-sidebar-toggle']").click();
        await expect(toggle).toBeChecked();
    }
}

/**
 * Change the URL hash without triggering a full page reload.
 * Use this for navigating between pages after the first load in a test so that
 * content created in-browser is not lost.
 */
export async function hashNavigate(page: Page, id: string) {
    await page.evaluate((hash) => {
        location.hash = hash;
    }, id);
}

export async function openSidebarSection(
    page: Page,
    sectionItemSelector: string
) {
    const details = page.locator(`details:has(${sectionItemSelector})`);

    if ((await details.getAttribute("open")) === null) {
        await details.locator("summary").first().click();
    }
}
