import { goto } from "./util";
import { test, expect } from "@playwright/test";
import { glob, readFile } from "node:fs/promises";
import { load } from "nestedtext";
import { z } from "zod";
import { basename } from "node:path";

const Schema = z.object({
    md2html: z.enum(["true", "false"]),
    html2md: z.enum(["true", "false"]),
    markdown: z.string(),
    html: z.string()
});

interface Scenario {
    name: string;
    md2html: boolean;
    html2md: boolean;
    markdown: string;
    html: string;
    error?: string;
}

let scenarios: Scenario[] = [];

test.beforeAll(async () => {
    scenarios = [];

    for await (const file of await glob("tests/scenarios/*.nt")) {
        const name = basename(file, ".nt");
        const content = await readFile(file, "utf-8");
        const scenario = load(content);
        const parsed = Schema.safeParse(scenario);

        if (!parsed.success) {
            scenarios.push({
                name,
                md2html: true,
                html2md: true,
                markdown: "",
                html: "",
                error: parsed.error.message
            });
        } else {
            scenarios.push({
                name,
                md2html: parsed.data.md2html === "true",
                html2md: parsed.data.html2md === "true",
                markdown: parsed.data.markdown,
                html: parsed.data.html
            });
        }
    }
});

test('Execute scenarios', async ({ page }) => {
    expect(scenarios.length).toBeGreaterThan(0);

    for (const scenario of scenarios) {
        if (scenario.error) {
            await test.step(`${scenario.name} - Invalid scenario`, () => {
                expect(scenario.error).toBeUndefined();
            });
        } else {
            if (scenario.md2html) {
                await test.step(`${scenario.name} - MD -> HTML`, async () => {
                    // Each page will operate on its own article element since
                    // the browser session is shared across all scenarios.
                    const id = `test_${scenario.name}`;
                    await goto(page, id);
                    await expect(page.locator("#of_input")).toBeVisible();
                    await page.locator("#of_input").fill(scenario.markdown);
                    await page.locator("#of_save").click();
                    await expect(page.locator("#of_input")).toBeHidden();
                    await expect(await page.locator(`article#${id}`).innerHTML()).toBe(
                        scenario.html
                    );
                });
            }

            if (scenario.html2md) {
                await test.step(`${scenario.name} - HTML -> MD`, async () => {
                    await goto(page, "");
                    await expect(page.locator("#of_input")).toBeHidden();
                    await expect(page.locator("article.index")).toBeVisible();
                    // Set the innerHTML of the article element to the scenario's HTML
                    await page.evaluate(
                        (html) => {
                            const article = document.querySelector("article.index");
                            if (article) {
                                article.innerHTML = html;
                            }
                        },
                        scenario.html
                    );
                    await page.locator("#of_edit").click();
                    await expect(page.locator("#of_input")).toBeVisible();
                    await expect(await page.locator("#of_input").inputValue()).toBe(
                        scenario.markdown
                    );

                    // MUST return to the non-editing view
                    await page.locator("#of_cancel").click();
                    await expect(page.locator("#of_input")).toBeHidden();
                });
            }
        }
    }
});
