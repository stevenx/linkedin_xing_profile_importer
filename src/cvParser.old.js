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
    const lines = content.split('\n').map(line => line.trim());
    
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
    let inCodeBlock = false;
    let inYamlFrontmatter = false;
    let yamlStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle YAML frontmatter
      if (i === 0 && line === '---') {
        inYamlFrontmatter = true;
        yamlStartIndex = i;
        continue;
      }
      if (inYamlFrontmatter && line === '---' && i > yamlStartIndex) {
        inYamlFrontmatter = false;
        continue;
      }
      if (inYamlFrontmatter) continue;
      
      // Skip code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      // Check for section headers (# or ## headers)
      if (line.startsWith('#')) {
        const headerText = line.replace(/^#+\s*/, '').toUpperCase();
        
        if (headerText.includes('EXPERIENCE') || headerText.includes('WORK') || headerText.includes('EMPLOYMENT')) {
          currentSection = 'experience';
          continue;
        } else if (headerText.includes('EDUCATION') || headerText.includes('ACADEMIC')) {
          currentSection = 'education';
          continue;
        } else if (headerText.includes('SKILL')) {
          currentSection = 'skills';
          continue;
        } else if (headerText.includes('CERTIFICATION') || headerText.includes('CERTIFICATE')) {
          currentSection = 'certifications';
          continue;
        } else if (headerText.includes('LANGUAGE')) {
          currentSection = 'languages';
          continue;
        } else if (headerText.includes('SUMMARY') || headerText.includes('ABOUT') || headerText.includes('PROFILE')) {
          currentSection = 'summary';
          continue;
        } else if (headerText.includes('CONTACT') || headerText.includes('PERSONAL')) {
          currentSection = 'personal';
          continue;
        }
      }

      // Extract personal info
      if (!currentSection || currentSection === 'personal') {
        // Extract email
        const emailMatch = line.match(/([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch && !cvData.personalInfo.email) {
          cvData.personalInfo.email = emailMatch[1];
        }

        // Extract phone
        const phoneMatch = line.match(/(\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})/);
        if (phoneMatch && !cvData.personalInfo.phone) {
          cvData.personalInfo.phone = phoneMatch[1];
        }

        // Extract LinkedIn URL
        const linkedinMatch = line.match(/(linkedin\.com\/in\/[a-zA-Z0-9-]+)/i);
        if (linkedinMatch && !cvData.personalInfo.linkedin) {
          cvData.personalInfo.linkedin = `https://${linkedinMatch[1]}`;
        }

        // Extract name (usually a header at the top)
        if (i < 10 && line && !line.includes('@') && !line.match(/^\d/) && !cvData.personalInfo.name && line !== '---') {
          const cleanName = line.replace(/^#+\s*/, '').replace(/[*_]/g, '');
          // Check if it looks like a name (contains "–" or is a header)
          if (cleanName.length > 2 && cleanName.length < 100 && (line.startsWith('#') || cleanName.includes('–'))) {
            cvData.personalInfo.name = cleanName.split('–')[0].trim();
          }
        }
      }

      // Process summary section
      if (currentSection === 'summary' && line && !line.startsWith('#')) {
        cvData.summary += line + ' ';
      }

      // Process experience section
      if (currentSection === 'experience') {
        // Check for new job entry (### headers or bold text)
        if (line.startsWith('###') || (line.startsWith('**') && line.endsWith('**'))) {
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
          currentExperience.title = jobHeader;
        } else if (currentExperience) {
          // Look for company and duration info
          if (line.includes(' at ') || line.includes(' @ ')) {
            const parts = line.split(/ at | @ /);
            if (parts.length > 1) {
              currentExperience.company = parts[1].trim();
            }
          } else if (this.isDuration(line)) {
            currentExperience.duration = line;
          } else if (this.isLocation(line)) {
            currentExperience.location = line;
          } else if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
            currentExperience.description.push(line.replace(/^[-*•]\s*/, ''));
          } else if (line && currentExperience.description.length === 0 && !currentExperience.company) {
            // Might be company on next line
            currentExperience.company = line;
          }
        }
      }

      // Process education section
      if (currentSection === 'education') {
        if (line.startsWith('###') || (line.startsWith('**') && line.endsWith('**'))) {
          if (currentEducation && currentEducation.degree) {
            cvData.education.push(currentEducation);
          }
          currentEducation = {
            degree: '',
            institution: '',
            duration: '',
            location: ''
          };
          
          const eduHeader = line.replace(/^###\s*/, '').replace(/\*\*/g, '');
          currentEducation.degree = eduHeader;
        } else if (currentEducation) {
          if (this.isUniversity(line) && !currentEducation.institution) {
            currentEducation.institution = line;
          } else if (this.isDuration(line)) {
            currentEducation.duration = line;
          } else if (this.isLocation(line)) {
            currentEducation.location = line;
          } else if (line && !currentEducation.institution) {
            currentEducation.institution = line;
          }
        }
      }

      // Process skills section
      if (currentSection === 'skills') {
        if (line && !line.startsWith('#')) {
          // Handle bullet points
          if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
            const skill = line.replace(/^[-*•]\s*/, '').trim();
            if (skill) cvData.skills.push(skill);
          } else if (line.includes(',') || line.includes('|') || line.includes(';')) {
            // Handle comma/pipe separated skills
            const skills = line.split(/[,;|]/).map(s => s.trim()).filter(s => s);
            cvData.skills.push(...skills);
          } else if (line) {
            // Single skill per line
            cvData.skills.push(line);
          }
        }
      }

      // Process certifications
      if (currentSection === 'certifications' && line && !line.startsWith('#')) {
        if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
          cvData.certifications.push(line.replace(/^[-*•]\s*/, ''));
        } else if (line) {
          cvData.certifications.push(line);
        }
      }

      // Process languages
      if (currentSection === 'languages' && line && !line.startsWith('#')) {
        if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
          cvData.languages.push(line.replace(/^[-*•]\s*/, ''));
        } else if (line) {
          cvData.languages.push(line);
        }
      }
    }

    // Add last items
    if (currentExperience && currentExperience.title) {
      cvData.experience.push(currentExperience);
    }
    if (currentEducation && currentEducation.degree) {
      cvData.education.push(currentEducation);
    }

    // Clean up
    cvData.summary = cvData.summary.trim();
    cvData.skills = [...new Set(cvData.skills)]; // Remove duplicates

    return cvData;
  }

  isDuration(line) {
    // Matches date patterns like "Jan 2020 - Present", "2019-2021", "2019 – 2021", etc.
    return /(\b\d{4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b).*(-|–|—|to).*(\b\d{4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b|Present|Current)/i.test(line);
  }

  isLocation(line) {
    // Simple location detection
    return /\b([A-Z][a-z]+,\s*[A-Z]{2}|[A-Z][a-z]+,\s*[A-Z][a-z]+)\b/.test(line) && line.length < 50;
  }

  isUniversity(line) {
    const universityKeywords = ['University', 'College', 'Institute', 'School', 'Academy'];
    return universityKeywords.some(keyword => line.includes(keyword));
  }
}

module.exports = CVParser;