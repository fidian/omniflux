import { goto } from "./util";
import { test, expect, Page } from "@playwright/test";

// A word that cannot wrap, so the column count sets the table's width.
const word = "Unbreakablecolumn";

function table(columns: number) {
    const row = (cell: string) => `|${` ${cell} |`.repeat(columns)}`;

    return [row("Head"), row("---"), row(word)].join("\n");
}

/**
 * Replace the index page with a paragraph followed by tables and report where
 * everything landed.
 */
async function layout(page: Page, width: number, ...columns: number[]) {
    await page.setViewportSize({ width, height: 700 });
    await goto(page);
    await page.click(".of-edit");
    await page.fill(
        "textarea",
        ["Paragraph", ...columns.map(table)].join("\n\n")
    );
    await page.click(".of-apply");
    await expect(page.locator("article:visible table")).toHaveCount(
        columns.length
    );

    return page.evaluate(() => {
        const box = (el: Element) => {
            const { left, right } = el.getBoundingClientRect();

            return { left, right, scrolls: el.scrollWidth > el.clientWidth };
        };
        const root = document.documentElement;

        return {
            pageWidth: root.clientWidth,
            pageScrolls: root.scrollWidth > root.clientWidth,
            text: box(document.querySelector("article.index p")!),
            tables: [...document.querySelectorAll("article.index table")].map(
                box
            )
        };
    });
}

test("wide table grows past the article margins", async ({ page }) => {
    const { pageWidth, pageScrolls, text, tables } = await layout(
        page,
        1900,
        7
    );
    const [wide] = tables;

    expect(wide.left).toBeLessThan(text.left);
    expect(wide.right).toBeGreaterThan(text.right);
    expect(wide.left).toBeGreaterThan(0);
    expect(wide.right).toBeLessThan(pageWidth);
    expect(wide.scrolls).toBe(false);
    expect(pageScrolls).toBe(false);

    // Centered on the text
    expect(text.left - wide.left).toBeCloseTo(wide.right - text.right, 0);
});

test("table wider than the window scrolls inside the window", async ({
    page
}) => {
    const { pageWidth, pageScrolls, text, tables } = await layout(
        page,
        1900,
        40
    );
    const [huge] = tables;

    expect(huge.left).toBeLessThan(text.left);
    expect(huge.left).toBeGreaterThan(0);
    expect(huge.right).toBeLessThan(pageWidth);
    expect(huge.scrolls).toBe(true);
    expect(pageScrolls).toBe(false);
});

test("table that fits stays within the article", async ({ page }) => {
    const { text, tables } = await layout(page, 1900, 2);
    const [narrow] = tables;

    expect(narrow.left).toBeCloseTo(text.left, 0);
    expect(narrow.right).toBeCloseTo(text.right, 0);
    expect(narrow.scrolls).toBe(false);
});

test("wide table scrolls when the window has no margins", async ({ page }) => {
    const { pageScrolls, text, tables } = await layout(page, 600, 7);
    const [wide] = tables;

    expect(wide.left).toBeCloseTo(text.left, 0);
    expect(wide.right).toBeCloseTo(text.right, 0);
    expect(wide.scrolls).toBe(true);
    expect(pageScrolls).toBe(false);
});
