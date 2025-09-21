require('dotenv').config();
const { chromium } = require('playwright');
const CVParser = require('./src/cvParser');

async function waitAndType(page, selector, text, delay = 100) {
  const element = await page.locator(selector).first();
  await element.click();
  await page.waitForTimeout(delay);
  await element.fill('');
  await element.type(text, { delay: 50 });
  return element;
}

async function selectDropdownOption(page, selector, value) {
  try {
    // If selector is already a locator object, use it directly
    let dropdown;
    if (typeof selector === 'string') {
      dropdown = await page.locator(selector).first();
    } else {
      dropdown = selector;
    }

    // For select elements, use selectOption
    const tagName = await dropdown.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await dropdown.selectOption(value);
    } else {
      // For custom dropdowns
      await dropdown.click();
      await page.waitForTimeout(200);
      await dropdown.fill(value);
      await page.waitForTimeout(100);
      await page.keyboard.press('Enter');
    }
  } catch (e) {
    console.log('  ⚠️ Could not select dropdown option:', e.message);
  }
}

async function main() {
  console.log('XING Profile Automation - Adding Experience from CV');
  console.log('====================================================\n');

  // Check command line arguments for start index and max entries
  const args = process.argv.slice(2);
  const startIndex = args[0] ? parseInt(args[0]) - 1 : 0; // Convert to 0-based index
  const maxEntries = args[1] ? parseInt(args[1]) : null;

  // Parse CV
  const cvParser = new CVParser('./cv.md');
  const cvData = await cvParser.parseMarkdown();

  console.log('Found', cvData.experience.length, 'experience entries in CV');

  if (startIndex > 0) {
    console.log(`\n📌 Starting from entry #${startIndex + 1}`);
  }
  if (maxEntries) {
    console.log(`📌 Will process maximum ${maxEntries} entries`);
  }

  console.log('\nExperience entries to add:');
  cvData.experience.forEach((exp, index) => {
    const marker = index < startIndex ? '✓' : (maxEntries && index >= startIndex + maxEntries ? '⏭️' : '📝');
    console.log(`\n${marker} ${index + 1}. ${exp.title} at ${exp.company}`);
    console.log(`   Duration: ${exp.duration}`);
  });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 }
  });

  const page = await context.newPage();

  try {
    // Login to XING
    console.log('\n📝 Logging in to XING...');
    await page.goto('https://login.xing.com/');

    // Accept cookies if banner appears
    try {
      // Wait a bit for cookie banner to appear
      await page.waitForTimeout(2000);

      // Try multiple selectors from yxing.json
      const cookieSelectors = [
        "[data-testid='uc-accept-all-button']",
        "#usercentrics-root [data-testid='uc-accept-all-button']",
        "text=Akzeptieren",
        "button:has-text('Akzeptieren')"
      ];

      for (const selector of cookieSelectors) {
        try {
          const cookieButton = await page.locator(selector).first();
          if (await cookieButton.isVisible({ timeout: 1000 })) {
            console.log('🍪 Accepting cookies with selector:', selector);
            await cookieButton.click();
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log('⚠️ Cookie banner not found or already accepted');
    }

    // Fill login credentials
    console.log('📧 Entering credentials...');

    if (!process.env.XING_EMAIL || !process.env.XING_PASSWORD) {
      console.error('❌ Error: XING_EMAIL and XING_PASSWORD must be set in .env file');
      console.log('Please create a .env file with your XING credentials');
      process.exit(1);
    }

    await page.locator("[data-qa='username']").click();
    await page.locator("[data-qa='username']").fill(process.env.XING_EMAIL);

    await page.locator("[data-qa='password']").click();
    await page.locator("[data-qa='password']").fill(process.env.XING_PASSWORD);

    // Click login button
    await page.locator("[data-qa='login-form'] > button").click();

    console.log('⏳ Waiting for login to complete...');
    // Wait for navigation to jobs page (as shown in yxing.json)
    await page.waitForURL('**/jobs/**', { timeout: 10000 }).catch(() => {
      // If not redirected to jobs, wait for any XING page
      return page.waitForURL('https://www.xing.com/**');
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✨ Adding experience entries...\n');

    // Calculate end index
    const endIndex = maxEntries ? Math.min(startIndex + maxEntries, cvData.experience.length) : cvData.experience.length;

    // Process each experience entry starting from startIndex
    for (let i = startIndex; i < endIndex; i++) {
      const exp = cvData.experience[i];
      console.log(`\n[${i+1}/${cvData.experience.length}] Adding: ${exp.title} at ${exp.company}`);

      // Navigate directly to add employee page
      console.log('  📍 Navigating to add employee form...');
      await page.goto('https://www.xing.com/profile/my_profile/timeline/add/employee');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Fill in the position/title
      console.log('  📝 Filling position:', exp.title);
      try {
        // Try different selectors for position input
        let positionInput = await page.locator('[placeholder*="Berufsbezeichnung"]').first();
        if (!await positionInput.isVisible()) {
          positionInput = await page.locator('[placeholder*="Position"]').first();
        }
        if (!await positionInput.isVisible()) {
          positionInput = await page.locator('input[id^="downshift"][id$="-input"]').first();
        }
        if (await positionInput.isVisible()) {
          await positionInput.click();
          await positionInput.fill(exp.title);
        }
      } catch (e) {
        console.log('  ⚠️ Could not fill position field');
      }

      // Select employment type (Freiberuflich = 13)
      console.log('  📋 Setting employment type: Freiberuflich');
      try {
        const employmentDropdown = await page.locator('select[name="employment"]').first();
        if (await employmentDropdown.isVisible()) {
          await employmentDropdown.selectOption('13');
        }
      } catch (e) {
        console.log('  ⚠️ Could not set employment type');
      }

      // Select career level (Mit Berufserfahrung = 3)
      console.log('  🎯 Setting career level: Mit Berufserfahrung');
      try {
        const careerDropdown = await page.locator('select[name="careerLevel"]').first();
        if (await careerDropdown.isVisible()) {
          await careerDropdown.selectOption('3');
        }
      } catch (e) {
        console.log('  ⚠️ Could not set career level');
      }

      // Select discipline (IT und Softwareentwicklung = 1011)
      console.log('  💼 Setting discipline: IT und Softwareentwicklung');
      try {
        const disciplineDropdown = await page.locator('select[name="discipline"]').first();
        if (await disciplineDropdown.isVisible()) {
          await disciplineDropdown.selectOption('1011');
        }
      } catch (e) {
        console.log('  ⚠️ Could not set discipline');
      }

      // Parse dates from duration
      let startMonth = '1';
      let startYear = '2020';
      let endMonth = '';
      let endYear = '';
      let isCurrentPosition = false;

      if (exp.duration) {
        // Parse dates like "09/2024 – today" or "06/2024 – 12/2024"
        const datePattern = /(\d{2})\/(\d{4})\s*[–-]\s*(today|heute|(\d{2})\/(\d{4}))/i;
        const match = exp.duration.match(datePattern);

        if (match) {
          startMonth = parseInt(match[1]).toString();
          startYear = match[2];

          if (match[3] && (match[3].toLowerCase() === 'today' || match[3].toLowerCase() === 'heute')) {
            isCurrentPosition = true;
          } else if (match[4] && match[5]) {
            endMonth = parseInt(match[4]).toString();
            endYear = match[5];
          }
        }
      }

      // Fill start date
      console.log(`  📅 Setting dates: ${startMonth}/${startYear} - ${isCurrentPosition ? 'current' : endMonth + '/' + endYear}`);

      try {
        // Find start date selects by data-qa attributes
        const startMonthSelect = await page.locator('select[data-qa="startDate-month-dropdown"]').first();
        const startYearSelect = await page.locator('select[data-qa="startDate-year-dropdown"]').first();

        if (await startMonthSelect.isVisible()) {
          console.log(`  Setting start month: ${startMonth}`);
          await startMonthSelect.selectOption(startMonth);
        }

        if (await startYearSelect.isVisible()) {
          console.log(`  Setting start year: ${startYear}`);
          await startYearSelect.selectOption(startYear);
        }
      } catch (e) {
        console.log('  ⚠️ Could not set start date:', e.message);
      }

      if (isCurrentPosition) {
        // Leave checkbox checked for current positions
        console.log('  ✅ Keeping as current position');
      } else if (endMonth && endYear) {
        try {
          // First uncheck the "I currently work here" checkbox
          console.log('  Unchecking current position checkbox...');
          const currentCheckbox = await page.locator('input[type="checkbox"]:not([name="primaryOccupation"])').first();
          if (await currentCheckbox.isVisible() && await currentCheckbox.isChecked()) {
            await currentCheckbox.uncheck();
            await page.waitForTimeout(1000); // Wait for end date fields to appear
          }

          // Now set end date
          const endMonthSelect = await page.locator('select[data-qa="endDate-month-dropdown"]').first();
          const endYearSelect = await page.locator('select[data-qa="endDate-year-dropdown"]').first();

          if (await endMonthSelect.isVisible()) {
            console.log(`  Setting end month: ${endMonth}`);
            await endMonthSelect.selectOption(endMonth);
          }

          if (await endYearSelect.isVisible()) {
            console.log(`  Setting end year: ${endYear}`);
            await endYearSelect.selectOption(endYear);
          }
        } catch (e) {
          console.log('  ⚠️ Could not set end date:', e.message);
        }
      }

      // Add description field - click the button first, then fill
      if (exp.description) {
        console.log('  📝 Adding description');
        try {
          // First check if description field is already visible
          let descriptionArea = await page.locator('textarea[data-qa="text-area"]').first();

          // If not visible, click the "Add description" button
          if (!await descriptionArea.isVisible({ timeout: 1000 })) {
            const addDescriptionButton = await page.locator('button[data-qa="addable-field-button"]:has-text("Beschreibung")').first();
            if (await addDescriptionButton.isVisible()) {
              console.log('  Clicking add description button...');
              await addDescriptionButton.click();
              await page.waitForTimeout(1000);
            }
          }

          // Now fill the description
          descriptionArea = await page.locator('textarea[data-qa="text-area"]').first();
          if (await descriptionArea.isVisible()) {
            await descriptionArea.click();
            await descriptionArea.fill(exp.description.substring(0, 1000)); // Allow more characters
          }
        } catch (e) {
          console.log('  ⚠️ Could not add description:', e.message);
        }
      }

      // Fill company name
      console.log('  🏢 Setting company:', exp.company);
      try {
        // Try different selectors for company input
        let companyInput = await page.locator('[placeholder*="Unternehmen"]').first();
        if (!await companyInput.isVisible()) {
          companyInput = await page.locator('[placeholder*="Company"]').first();
        }
        if (!await companyInput.isVisible()) {
          // Look for the second downshift input (usually company)
          const allInputs = await page.locator('input[id^="downshift"][id$="-input"]').all();
          if (allInputs.length > 1) {
            companyInput = allInputs[1];
          }
        }
        if (companyInput && await companyInput.isVisible()) {
          await companyInput.click();
          await companyInput.fill(exp.company);
          await page.waitForTimeout(1000);

          // Try to select from dropdown if available
          const firstSuggestion = await page.locator('[id*="downshift"][id*="item-0"]').first();
          if (await firstSuggestion.isVisible()) {
            await firstSuggestion.click();
          }
        }
      } catch (e) {
        console.log('  ⚠️ Could not fill company field');
      }

      // Set company industry (Internet, IT = 90000.597414)
      console.log('  🏭 Setting company industry: Internet, IT');
      try {
        const industryDropdown = await page.locator('select[name="companyIndustry"]').first();
        if (await industryDropdown.isVisible()) {
          await industryDropdown.selectOption('90000.597414');
          await page.waitForTimeout(500);

          // Set second level industry (Internet, Onlinemedien = 90700.ffda8d)
          const secondLevelDropdown = await page.locator('select[data-qa="timeline-edit-industry-second-level"]').first();
          if (await secondLevelDropdown.isVisible()) {
            await secondLevelDropdown.selectOption('90700.ffda8d');
          }
        }
      } catch (e) {
        console.log('  ⚠️ Could not set company industry');
      }

      // Set location to Hamburg
      console.log('  📍 Setting location: Hamburg');
      try {
        const locationInput = await page.locator('input[name="location"]').first();
        if (await locationInput.isVisible()) {
          await locationInput.click();
          await locationInput.fill('Hamburg');
          await page.waitForTimeout(1000);

          // Try to select from dropdown suggestions
          const firstSuggestion = await page.locator('[id*="downshift"][id*="item-0"]').first();
          if (await firstSuggestion.isVisible()) {
            await firstSuggestion.click();
          }
        }
      } catch (e) {
        console.log('  ⚠️ Could not set location');
      }

      // Uncheck "Hauptberufliche Tätigkeit" checkbox before saving
      try {
        const primaryOccupationCheckbox = await page.locator('input[name="primaryOccupation"]').first();
        if (await primaryOccupationCheckbox.isVisible() && await primaryOccupationCheckbox.isChecked()) {
          console.log('  Unchecking primary occupation checkbox...');
          await primaryOccupationCheckbox.uncheck();
          await page.waitForTimeout(500);
        }
      } catch (e) {
        console.log('  ⚠️ Could not uncheck primary occupation');
      }

      // Save the entry
      console.log('  💾 Saving entry...');
      const saveButton = await page.locator("[data-testid='profile-timeline-entry-form-done']").first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        console.log('  ✅ Entry saved!');
        await page.waitForTimeout(3000);
      } else {
        console.log('  ⚠️ Could not find save button');
      }

      // Wait before adding next entry
      if (i < endIndex - 1) {
        console.log('  ⏳ Waiting before next entry...');
        await page.waitForTimeout(2000);
      }
    }

    console.log('\n✨ Automation complete!');
    console.log(`Added ${endIndex - startIndex} entries (${startIndex + 1} to ${endIndex} of ${cvData.experience.length})`);

    if (endIndex < cvData.experience.length) {
      console.log(`\n📌 Remaining entries: ${cvData.experience.length - endIndex}`);
      console.log(`To continue, run: node xing-profile-automation.js ${endIndex + 1}`);
    }

    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({ path: 'xing-profile-updated.png', fullPage: true });
    console.log('Screenshot saved: xing-profile-updated.png');

    console.log('\n🌐 Browser stays open for review.');
    console.log('Press Ctrl+C to exit.');
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'xing-error.png' });
    console.log('Error screenshot saved: xing-error.png');
  }
}

main().catch(console.error);