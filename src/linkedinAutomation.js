const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class LinkedInAutomation {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async initialize(headless = false) {
    this.browser = await chromium.launch({
      headless: headless,
      slowMo: 50 // Slow down operations to appear more human-like
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    this.page = await this.context.newPage();
  }

  async login() {
    console.log('Logging into LinkedIn...');
    await this.page.goto('https://www.linkedin.com/login');
    
    // Fill in login credentials
    await this.page.fill('input[name="session_key"]', this.email);
    await this.page.fill('input[name="session_password"]', this.password);
    
    // Click login button
    await this.page.click('button[type="submit"]');
    
    console.log('Waiting for login to complete...');
    console.log('If prompted for verification, please complete it on your phone.');
    
    // Wait for successful login by checking for /feed URL
    try {
      await this.page.waitForURL('**/feed', { 
        timeout: 120000, // Wait up to 2 minutes for manual verification
        waitUntil: 'networkidle' 
      });
      console.log('Successfully logged into LinkedIn!');
    } catch (error) {
      // Alternative: wait for profile link to appear
      try {
        await this.page.waitForSelector('a[href*="/in/"]', { timeout: 120000 });
        console.log('Successfully logged into LinkedIn!');
      } catch (innerError) {
        throw new Error('Login timeout. Please try again.');
      }
    }
    
    // Give the page a moment to fully load
    await this.page.waitForTimeout(2000);
  }

  async navigateToProfile() {
    console.log('Navigating to profile experience section...');
    
    // Go directly to the experience details page
    const profileUrl = 'https://www.linkedin.com/in/steven-schulz-hamburg/details/experience/';
    console.log('Going to:', profileUrl);
    
    await this.page.goto(profileUrl, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(3000);
    console.log('Experience details page loaded.');
  }

  async updatePersonalInfo(personalInfo) {
    console.log('Updating personal information...');
    
    // Click on edit intro button
    const editIntroButton = await this.page.$('button[aria-label*="Edit intro"]');
    if (editIntroButton) {
      await editIntroButton.click();
      await this.page.waitForTimeout(2000);
      
      // Update name if provided
      if (personalInfo.name) {
        const firstNameInput = await this.page.$('input[name="firstName"]');
        const lastNameInput = await this.page.$('input[name="lastName"]');
        
        if (firstNameInput && lastNameInput) {
          const nameParts = personalInfo.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          await firstNameInput.fill(firstName);
          await lastNameInput.fill(lastName);
        }
      }
      
      // Save changes
      await this.page.click('button[data-control-name="save"]');
      await this.page.waitForTimeout(2000);
    }
  }

  async updateSummary(summary) {
    if (!summary) return;
    
    console.log('Updating summary...');
    
    // Click on About section edit button
    const aboutSection = await this.page.$('section[data-section="about"]');
    if (aboutSection) {
      const editButton = await aboutSection.$('button[aria-label*="Edit about"]');
      if (editButton) {
        await editButton.click();
        await this.page.waitForTimeout(2000);
        
        // Fill in summary
        const summaryTextarea = await this.page.$('textarea[name="description"]');
        if (summaryTextarea) {
          await summaryTextarea.fill(summary);
        }
        
        // Save changes
        await this.page.click('button[data-control-name="save"]');
        await this.page.waitForTimeout(2000);
      }
    }
  }

  async addExperience(experienceList) {
    console.log('Adding experience entries...');
    
    // First navigate to experience section if not there
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/details/experience/')) {
      await this.page.goto('https://www.linkedin.com/in/steven-schulz-hamburg/details/experience/');
      await this.page.waitForTimeout(3000);
    }
    
    for (let i = 0; i < experienceList.length && i < 5; i++) { // Limit to first 5 for testing
      const experience = experienceList[i];
      
      console.log(`\nAdding experience ${i + 1}:`, experience.title || experience.company);
      
      try {
        // Look for "Add position" or "+" button
        const addButton = await this.page.$('button:has-text("Add position")') ||
                         await this.page.$('button[aria-label*="Add position"]') ||
                         await this.page.$('button[aria-label*="Add experience"]');
        
        if (addButton) {
          await addButton.click();
          console.log('Clicked add button');
          await this.page.waitForTimeout(2000);
          
          // Fill in experience details
          const titleInput = await this.page.$('input[name="title"]');
          if (titleInput && experience.title) {
            await titleInput.fill(experience.title);
          }
          
          const companyInput = await this.page.$('input[name="companyName"]');
          if (companyInput && experience.company) {
            await companyInput.fill(experience.company);
            await this.page.waitForTimeout(1000);
            
            // Select first suggestion if available
            const firstSuggestion = await this.page.$('.search-typeahead__hit');
            if (firstSuggestion) {
              await firstSuggestion.click();
            }
          }
          
          // Parse duration for start and end dates
          if (experience.duration) {
            const dateMatch = experience.duration.match(/(\w+\s+\d{4})\s*-\s*(\w+\s+\d{4}|Present)/i);
            if (dateMatch) {
              // Handle start date
              const startDate = this.parseDate(dateMatch[1]);
              if (startDate) {
                await this.selectDate('startMonth', startDate.month);
                await this.selectDate('startYear', startDate.year);
              }
              
              // Handle end date
              if (dateMatch[2].toLowerCase() === 'present') {
                const currentlyWorkingCheckbox = await this.page.$('input[name="currentlyWorkHere"]');
                if (currentlyWorkingCheckbox) {
                  await currentlyWorkingCheckbox.check();
                }
              } else {
                const endDate = this.parseDate(dateMatch[2]);
                if (endDate) {
                  await this.selectDate('endMonth', endDate.month);
                  await this.selectDate('endYear', endDate.year);
                }
              }
            }
          }
          
          // Add description
          if (experience.description && experience.description.length > 0) {
            const descriptionTextarea = await this.page.$('textarea[name="description"]');
            if (descriptionTextarea) {
              const descriptionText = experience.description.join('\n• ');
              await descriptionTextarea.fill('• ' + descriptionText);
            }
          }
          
          // Save experience
          await this.page.click('button[data-control-name="save"]');
          await this.page.waitForTimeout(3000);
        }
      }
    }
  }

  async addEducation(educationList) {
    console.log('Adding education...');
    
    for (const education of educationList) {
      // Click on add education button
      const educationSection = await this.page.$('section[data-section="education"]');
      if (educationSection) {
        const addButton = await educationSection.$('button[aria-label*="Add education"]');
        if (addButton) {
          await addButton.click();
          await this.page.waitForTimeout(2000);
          
          // Fill in education details
          const schoolInput = await this.page.$('input[name="schoolName"]');
          if (schoolInput && education.institution) {
            await schoolInput.fill(education.institution);
            await this.page.waitForTimeout(1000);
            
            // Select first suggestion if available
            const firstSuggestion = await this.page.$('.search-typeahead__hit');
            if (firstSuggestion) {
              await firstSuggestion.click();
            }
          }
          
          const degreeInput = await this.page.$('input[name="degree"]');
          if (degreeInput && education.degree) {
            await degreeInput.fill(education.degree);
          }
          
          // Parse duration for dates
          if (education.duration) {
            const dateMatch = education.duration.match(/(\d{4})\s*-\s*(\d{4})/);
            if (dateMatch) {
              await this.selectDate('startYear', dateMatch[1]);
              await this.selectDate('endYear', dateMatch[2]);
            }
          }
          
          // Save education
          await this.page.click('button[data-control-name="save"]');
          await this.page.waitForTimeout(3000);
        }
      }
    }
  }

  async addSkills(skillsList) {
    console.log('Adding skills...');
    
    // Navigate to skills section
    const skillsSection = await this.page.$('section[data-section="skills"]');
    if (skillsSection) {
      const addButton = await skillsSection.$('button[aria-label*="Add skills"]');
      if (addButton) {
        await addButton.click();
        await this.page.waitForTimeout(2000);
        
        // Add each skill
        for (const skill of skillsList) {
          const skillInput = await this.page.$('input[placeholder*="skill"]');
          if (skillInput) {
            await skillInput.fill(skill);
            await this.page.waitForTimeout(1000);
            
            // Select from suggestions or press Enter
            const suggestion = await this.page.$('.search-typeahead__hit');
            if (suggestion) {
              await suggestion.click();
            } else {
              await skillInput.press('Enter');
            }
            await this.page.waitForTimeout(500);
          }
        }
        
        // Save skills
        await this.page.click('button[data-control-name="save"]');
        await this.page.waitForTimeout(2000);
      }
    }
  }

  async selectDate(selectName, value) {
    const select = await this.page.$(`select[name="${selectName}"]`);
    if (select) {
      await select.selectOption(value.toString());
    }
  }

  parseDate(dateStr) {
    const months = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12,
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
      'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
      'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    
    const match = dateStr.match(/(\w+)\s+(\d{4})/i);
    if (match) {
      const monthName = match[1].toLowerCase();
      const year = match[2];
      
      if (months[monthName]) {
        return {
          month: months[monthName],
          year: year
        };
      }
    }
    
    return null;
  }

  async takeScreenshot(filename) {
    const screenshotDir = path.join(__dirname, '..', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const filepath = path.join(screenshotDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    console.log(`Screenshot saved: ${filepath}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = LinkedInAutomation;