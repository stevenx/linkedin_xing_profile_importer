const fs = require('fs');

class CVParser {
  constructor(mdPath) {
    this.mdPath = mdPath;
  }

  async parseMarkdown() {
    try {
      const content = fs.readFileSync(this.mdPath, 'utf8');
      return this.extractStructuredData(content);
    } catch (error) {
      console.error('Error parsing Markdown:', error);
      throw error;
    }
  }

  extractStructuredData(content) {
    const lines = content.split('\n');
    
    const cvData = {
      personalInfo: {},
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: []
    };

    let currentSection = null;
    let currentExperience = null;
    let currentEducation = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and horizontal rules
      if (!line || line === '---') continue;

      // Extract name from first header
      if (i < 5 && line.startsWith('#') && !cvData.personalInfo.name) {
        const headerContent = line.replace(/^#+\s*/, '');
        if (headerContent.includes('–')) {
          cvData.personalInfo.name = headerContent.split('–')[0].trim();
        } else if (!headerContent.match(/experience|education|skills|summary/i)) {
          cvData.personalInfo.name = headerContent;
        }
      }

      // Extract URL from markdown links
      const urlMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (urlMatch && i < 10) {
        const url = urlMatch[2];
        if (url.includes('linkedin.com')) {
          cvData.personalInfo.linkedin = url;
        } else {
          cvData.personalInfo.website = url;
        }
      }

      // Extract email
      const emailMatch = line.match(/([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        cvData.personalInfo.email = emailMatch[1];
      }

      // Extract phone
      const phoneMatch = line.match(/(\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})/);
      if (phoneMatch) {
        cvData.personalInfo.phone = phoneMatch[1];
      }

      // Check for section headers
      if (line.startsWith('##')) {
        const headerText = line.replace(/^#+\s*/, '').replace(/[🧑‍💻📚💼🔧]/g, '').trim().toUpperCase();
        
        if (headerText.includes('WORK') || headerText.includes('EXPERIENCE') || headerText.includes('EMPLOYMENT')) {
          currentSection = 'experience';
          continue;
        } else if (headerText.includes('EDUCATION') || headerText.includes('ACADEMIC')) {
          currentSection = 'education';
          continue;
        } else if (headerText.includes('SKILL') || headerText.includes('TECH')) {
          currentSection = 'skills';
          continue;
        } else if (headerText.includes('SUMMARY') || headerText.includes('ABOUT') || headerText.includes('PROFILE')) {
          currentSection = 'summary';
          continue;
        }
      }

      // Process experience section
      if (currentSection === 'experience') {
        // Check for job entry patterns
        if (line.startsWith('###') || (line.startsWith('**') && line.includes('–'))) {
          if (currentExperience && currentExperience.title) {
            cvData.experience.push(currentExperience);
          }
          currentExperience = {
            title: '',
            company: '',
            location: '',
            duration: '',
            description: []
          };
          
          const jobHeader = line.replace(/^###\s*/, '').replace(/\*\*/g, '');
          
          // For entries like "Since 04/2010 – Freelance Developer (Meng GmbH)"
          if (jobHeader.includes('–')) {
            const parts = jobHeader.split('–');
            currentExperience.duration = parts[0].trim();
            currentExperience.title = parts[1].trim();
          } else {
            currentExperience.title = jobHeader;
          }
        } else if (currentExperience) {
          // Handle project entries with dates
          if (line.startsWith('- **') && line.includes('**')) {
            const dateMatch = line.match(/\*\*([^*]+)\*\*/);
            if (dateMatch) {
              // This is a new project under current role
              if (currentExperience.description.length > 0 || currentExperience.company) {
                cvData.experience.push(currentExperience);
                currentExperience = {
                  title: '',
                  company: '',
                  location: '',
                  duration: dateMatch[1],
                  description: []
                };
              } else {
                currentExperience.duration = dateMatch[1];
              }
            }
          } else if (line.startsWith('**') && line.endsWith('**')) {
            // Company name in bold
            const companyName = line.replace(/\*\*/g, '');
            if (!currentExperience.company) {
              currentExperience.company = companyName;
            } else {
              currentExperience.title = companyName;
            }
          } else if (line.startsWith('_') && line.endsWith('_')) {
            // Role description in italics
            if (!currentExperience.title && currentExperience.company) {
              currentExperience.title = line.replace(/_/g, '');
            } else {
              currentExperience.description.push(line.replace(/_/g, ''));
            }
          } else if (line.match(/^[A-Z][a-z]+(,\s*[A-Z][a-z]+)*$/)) {
            // Location pattern
            currentExperience.location = line;
          } else if (line && !line.startsWith('#')) {
            // Other content becomes description
            currentExperience.description.push(line);
          }
        }
      }

      // Process education section
      if (currentSection === 'education') {
        if (line.startsWith('###') || line.match(/^\*?\*?\d{4}\s*–\s*\d{4}/)) {
          if (currentEducation && (currentEducation.degree || currentEducation.duration)) {
            cvData.education.push(currentEducation);
          }
          currentEducation = {
            degree: '',
            institution: '',
            duration: '',
            location: ''
          };
          
          // Extract duration if it's at the start
          const durationMatch = line.match(/(\d{4}\s*–\s*\d{4}|\d{2}\/\d{4}\s*–\s*\d{2}\/\d{4})/);
          if (durationMatch) {
            currentEducation.duration = durationMatch[1];
          }
        } else if (currentEducation) {
          if (line.startsWith('**') && line.endsWith('**')) {
            currentEducation.institution = line.replace(/\*\*/g, '');
          } else if (!currentEducation.degree && line) {
            currentEducation.degree = line;
          } else if (line.startsWith('- ')) {
            if (!currentEducation.location) {
              currentEducation.location = line.substring(2);
            }
          }
        }
      }

      // Process skills section  
      if (currentSection === 'skills') {
        if (line.startsWith('- ')) {
          cvData.skills.push(line.substring(2));
        } else if (line.includes(':')) {
          cvData.skills.push(line);
        }
      }

      // Process summary
      if (currentSection === 'summary' && line && !line.startsWith('#')) {
        cvData.summary += line + ' ';
      }
    }

    // Add last items
    if (currentExperience && currentExperience.title) {
      cvData.experience.push(currentExperience);
    }
    if (currentEducation && (currentEducation.degree || currentEducation.duration)) {
      cvData.education.push(currentEducation);
    }

    // Clean up
    cvData.summary = cvData.summary.trim();
    
    // Process experience to clean up
    cvData.experience = cvData.experience.filter(exp => 
      exp.title || exp.company || exp.description.length > 0
    );

    return cvData;
  }
}

module.exports = CVParser;