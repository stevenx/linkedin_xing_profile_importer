require('dotenv').config();
const { chromium } = require('playwright');
const CVParser = require('./src/cvParser');

async function main() {
  console.log('LinkedIn Add ALL Experiences');
  console.log('============================\n');

  // Check environment variables
  if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
    console.error('❌ Error: LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be set in .env file');
    console.log('Please create a .env file with your LinkedIn credentials');
    console.log('See .env.example for reference');
    process.exit(1);
  }

  // Parse CV
  const cvParser = new CVParser('./cv.md');
  const cvData = await cvParser.parseMarkdown();
  
  console.log(`Found ${cvData.experience.length} experiences to add:\n`);
  cvData.experience.forEach((exp, i) => {
    console.log(`${i + 1}. ${exp.title || 'Position'} at ${exp.company || 'Company'} (${exp.duration})`);
  });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const page = await browser.newPage();

  try {
    // Login
    console.log('\n1. Logging in...');
    await page.goto('https://www.linkedin.com/login');
    
    await page.fill('input[name="session_key"]', process.env.LINKEDIN_EMAIL);
    await page.fill('input[name="session_password"]', process.env.LINKEDIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    console.log('   Waiting for login...');
    
    // Wait for login
    let loginComplete = false;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(2000);
      const url = page.url();
      if (!url.includes('/login') && !url.includes('checkpoint')) {
        loginComplete = true;
        console.log('   ✓ Login successful!');
        break;
      }
    }
    
    await page.waitForTimeout(2000);
    
    // Add each experience
    for (let i = 0; i < cvData.experience.length; i++) {
      const exp = cvData.experience[i];
      
      console.log(`\n========== EXPERIENCE ${i + 1}/${cvData.experience.length} ==========`);
      console.log('Title:', exp.title || 'No title');
      console.log('Company:', exp.company || 'No company');
      console.log('Duration:', exp.duration);
      
      // Go to add experience form
      console.log('\nGoing to add experience form...');
      await page.goto('https://www.linkedin.com/in/steven-schulz-hamburg/add-edit/POSITION/');
      await page.waitForTimeout(3000);
      
      console.log('Filling the form...\n');
      
      // Title
      if (exp.title) {
        const titleField = await page.$('input[id*="title"]');
        if (titleField) {
          await titleField.click();
          await titleField.fill('');
          await titleField.type(exp.title);
          console.log('   ✓ Title:', exp.title);
        }
      }
      
      // Employment type - Default to Freelance
      const empTypeSelect = await page.$('select[id*="employmentStatus"]');
      if (empTypeSelect) {
        await empTypeSelect.selectOption('Freelance');
        console.log('   ✓ Employment type: Freelance');
      }
      
      // Company
      if (exp.company) {
        const companyField = await page.$('input[id*="optionalCompany"]') || 
                            await page.$('input[id*="companyName"]') ||
                            await page.$('input[id*="company"]');
        if (companyField) {
          await companyField.click();
          await companyField.fill('');
          await companyField.type(exp.company);
          console.log('   ✓ Company:', exp.company);
          await page.waitForTimeout(1000);
        }
      }
      
      // Dates
      if (exp.duration) {
        console.log('   Parsing dates from:', exp.duration);
        const dateMatch = exp.duration.match(/(\d{2})\/(\d{4})\s*[–-]\s*(\w+|(\d{2})\/(\d{4}))/);
        
        if (dateMatch) {
          const startMonth = parseInt(dateMatch[1]);
          const startYear = dateMatch[2];
          const endPart = dateMatch[3];
          
          // Start month
          const startMonthSelect = await page.$('select[id*="start-date"][name="month"]');
          if (startMonthSelect) {
            await startMonthSelect.selectOption(startMonth.toString());
            console.log(`   ✓ Start: ${getMonthName(startMonth)} ${startYear}`);
          }
          
          // Start year
          const startYearSelect = await page.$('select[id*="start-date-year"]');
          if (startYearSelect) {
            await startYearSelect.selectOption(startYear);
          }
          
          // End date or currently working
          if (endPart.toLowerCase() === 'today') {
            const labels = await page.$$('label');
            for (const label of labels) {
              const text = await label.textContent();
              if (text && text.toLowerCase().includes('currently work')) {
                await label.click();
                console.log('   ✓ Currently working');
                break;
              }
            }
          } else {
            const endMatch = endPart.match(/(\d{2})\/(\d{4})/);
            if (endMatch) {
              const endMonth = parseInt(endMatch[1]);
              const endYear = endMatch[2];
              
              const endMonthSelect = await page.$('select[id*="end-date"][name="month"]');
              if (endMonthSelect) {
                await endMonthSelect.selectOption(endMonth.toString());
                console.log(`   ✓ End: ${getMonthName(endMonth)} ${endYear}`);
              }
              
              const endYearSelect = await page.$('select[id*="end-date-year"]');
              if (endYearSelect) {
                await endYearSelect.selectOption(endYear);
              }
            }
          }
        }
      }
      
      // Location type
      const locationTypeField = await page.$('input[id*="locationType"]');
      if (locationTypeField) {
        await locationTypeField.click();
        await locationTypeField.fill('');
        await locationTypeField.type('Remote');
        console.log('   ✓ Location type: Remote');
      }
      
      // Description
      if (exp.description) {
        const descField = await page.$('textarea[id*="description"]');
        if (descField) {
          await descField.click();
          await descField.fill('');
          
          const descText = Array.isArray(exp.description) 
            ? exp.description.join('\n') 
            : exp.description;
          
          await descField.type(descText);
          console.log('   ✓ Description: Added');
        }
      }
      
      console.log('\n✅ Form filled for experience', i + 1);
      console.log('\nNOTE: You need to:');
      console.log('1. Fill location manually (type "Hamburg")');
      console.log('2. Review the form');
      console.log('3. Click "Save"');
      console.log('4. Wait for save to complete');
      console.log('\nWaiting for you to save...');
      
      // Wait for user to save and return to profile
      let saved = false;
      let attempts = 0;
      
      while (!saved && attempts < 60) { // Wait up to 2 minutes
        await page.waitForTimeout(2000);
        const url = page.url();
        
        // Check if we're back on profile page (not on add/edit form)
        if (url.includes('/in/steven-schulz-hamburg/') && !url.includes('/add-edit/') && !url.includes('/edit/')) {
          saved = true;
          console.log('✓ Experience saved!');
          break;
        }
        
        attempts++;
        if (attempts % 10 === 0) {
          console.log(`Still waiting... (${attempts * 2} seconds)`);
        }
      }
      
      if (!saved) {
        console.log('⚠️  Timeout waiting for save. Moving to next experience...');
      }
      
      // Wait before adding next
      await page.waitForTimeout(2000);
    }
    
    console.log('\n🎉 ALL EXPERIENCES PROCESSED!');
    console.log(`Added ${cvData.experience.length} experiences.`);
    console.log('\nPlease review your LinkedIn profile.');
    
    // Final screenshot
    await page.goto('https://www.linkedin.com/in/steven-schulz-hamburg/');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'all-experiences-added.png', fullPage: true });
    console.log('\nFinal screenshot: all-experiences-added.png');
    
    console.log('\nBrowser stays open. Press Ctrl+C when done.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\nError:', error.message);
    await page.screenshot({ path: 'error.png' });
  }
}

function getMonthName(monthNum) {
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthNum] || monthNum;
}

main().catch(console.error);