import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

/**
 * UC-01 — Application Submission happy path
 *
 * Covers:
 *  1. Demo-login as applicant
 *  2. Navigate to "Нова апликација"
 *  3. Step 1 — Conference details
 *  4. Step 2 — Budget
 *  5. Step 3 — Document upload (invitation letter)
 *  6. Step 4 — Review & submit
 *  7. Assert redirect to /applicant and submitted application visible
 *
 * Prerequisites:
 *   - demo.applicant@finki.ukim.edu.mk exists in Supabase (seeded)
 *   - `npx playwright install chromium` has been run
 */

const DEMO_APPLICANT_LABEL = "Демо најава (Апликант)";

test.describe("UC-01 — Grant Application Submission", () => {
  // Temp file path for the fake invitation letter
  let fakePdfPath: string;

  test.beforeAll(() => {
    // Create a minimal fake PDF file for the document upload step.
    // The real OCR / storage pipeline is not exercised in this test.
    fakePdfPath = path.join(os.tmpdir(), "test-invitation.pdf");
    fs.writeFileSync(fakePdfPath, "%PDF-1.4 fake invitation letter for e2e test");
  });

  test.afterAll(() => {
    if (fs.existsSync(fakePdfPath)) fs.unlinkSync(fakePdfPath);
  });

  test("applicant can log in, fill the 4-step form, and submit an application", async ({
    page,
  }) => {
    // ── 1. Login ──────────────────────────────────────────────────────────
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "STGS — ФИНКИ" })).toBeVisible();

    // Click the demo applicant button and wait for redirect
    await page.getByRole("button", { name: DEMO_APPLICANT_LABEL }).click();
    await page.waitForURL("**/applicant", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Мои апликации" })).toBeVisible();

    // ── 2. Open new application form ──────────────────────────────────────
    await page.getByRole("link", { name: "+ Нова апликација" }).click();
    await page.waitForURL("**/applicant/applications/new");
    await expect(
      page.getByRole("heading", { name: "Нова апликација за научно патување" })
    ).toBeVisible();

    // ── 3. Step 1 — Conference Details ────────────────────────────────────
    // Verify we are on Step 1
    await expect(page.getByText("Конференција")).toBeVisible();

    await page
      .getByPlaceholder("нпр. IEEE EUROCON 2026")
      .fill("IEEE EUROCON 2026 — E2E Test");

    await page
      .getByPlaceholder("нпр. Белград, Србија")
      .fill("Белград, Србија");

    // Travel dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 60);
    const returnDate = new Date(tomorrow);
    returnDate.setDate(returnDate.getDate() + 4);

    const startStr = tomorrow.toISOString().split("T")[0];
    const endStr = returnDate.toISOString().split("T")[0];

    // Fill date inputs by their sequential appearance on the page
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(startStr);
    await dateInputs.nth(1).fill(endStr);

    await page
      .getByPlaceholder("Опишете ја научната вредност и целта на учеството...")
      .fill(
        "Презентација на прифатен труд на тема машинско учење и неговата примена во компјутерски мрежи."
      );

    // Advance to Step 2
    await page.getByRole("button", { name: "Следно" }).click();
    await expect(page.getByText("Буџет")).toBeVisible();

    // ── 4. Step 2 — Budget ────────────────────────────────────────────────
    const numberInputs = page.locator('input[type="number"]');

    // Accommodation
    await numberInputs.nth(0).fill("15000");
    // Transport
    await numberInputs.nth(1).fill("8000");
    // Registration fee
    await numberInputs.nth(2).fill("12000");

    // Verify the total is displayed (35 000 МКД)
    await expect(page.getByText("35.000")).toBeVisible();

    // Advance to Step 3
    await page.getByRole("button", { name: "Следно" }).click();
    await expect(page.getByText("Документи")).toBeVisible();

    // ── 5. Step 3 — Documents (invitation letter required) ────────────────
    // Find the hidden file input. The component renders a <select> for doc type
    // and an <input type="file">. We pick the invitation_letter type first.
    const docTypeSelect = page.locator("select").first();
    await docTypeSelect.selectOption("invitation_letter");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(fakePdfPath);

    // Wait for the upload to register (the component shows a file list entry)
    await expect(page.getByText("test-invitation.pdf")).toBeVisible({
      timeout: 15_000,
    });

    // Advance to Step 4
    await page.getByRole("button", { name: "Следно" }).click();
    await expect(page.getByText("Преглед")).toBeVisible();

    // ── 6. Step 4 — Review & Submit ───────────────────────────────────────
    // The review page should show the conference name
    await expect(
      page.getByText("IEEE EUROCON 2026 — E2E Test")
    ).toBeVisible();

    // Submit the application
    await page.getByRole("button", { name: "Поднеси апликација" }).click();

    // ── 7. Assert success — redirect to /applicant with the new entry ─────
    await page.waitForURL("**/applicant", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Мои апликации" })).toBeVisible();

    // The newly submitted application should appear in the list
    await expect(
      page.getByText("IEEE EUROCON 2026 — E2E Test")
    ).toBeVisible();

    // Its status badge should indicate "Поднесена" (submitted)
    await expect(page.getByText("Поднесена").first()).toBeVisible();
  });
});
