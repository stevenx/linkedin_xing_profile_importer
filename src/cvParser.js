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
      personalInfo: {
        name: 'Steven Schulz',
        website: 'https://stevenschulz.net',
        location: 'Hamburg, Germany'
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: []
    };

    let currentSection = null;
    let currentExperience = null;
    let collectingDescription = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines when not collecting description
      if (!line && !collectingDescription) continue;

      // Check for section headers
      if (line.startsWith('###')) {
        const headerText = line.replace(/^#+\s*/, '').toUpperCase();
        
        if (headerText.includes('RECENT PROJECTS') || headerText.includes('EXPERIENCE')) {
          currentSection = 'experience';
          continue;
        } else if (headerText.includes('EDUCATION')) {
          currentSection = 'education';
          continue;
        } else if (headerText.includes('SKILLS')) {
          currentSection = 'skills';
          continue;
        }
      }

      // Process experience section
      if (currentSection === 'experience') {
        // Check for new experience entry (starts with - **)
        if (line.startsWith('- **') && line.includes('**')) {
          // Save previous experience if exists
          if (currentExperience) {
            cvData.experience.push(currentExperience);
          }
          
          // Extract duration from the line
          const durationMatch = line.match(/\*\*([^*]+)\*\*/);
          const duration = durationMatch ? durationMatch[1].trim() : '';
          
          currentExperience = {
            title: '',
            company: '',
            location: '',
            duration: duration,
            description: []
          };
          collectingDescription = false;
        } else if (currentExperience) {
          // Parse company from bold text anywhere in the line
          const boldMatch = line.match(/\*\*([^*]+)\*\*/);
          if (boldMatch) {
            const company = boldMatch[1].trim();
            // Check if location is included
            if (company.includes(',')) {
              const parts = company.split(',');
              currentExperience.company = parts[0].trim();
              currentExperience.location = parts.slice(1).join(',').trim();
            } else {
              currentExperience.company = company;
            }
            // Remove the bold part and add rest to description if any
            const restOfLine = line.replace(/\*\*[^*]+\*\*/, '').trim();
            if (restOfLine) {
              currentExperience.description.push(restOfLine);
            }
          }
          // Line with role (in italics)
          else if (line.includes('_') && line.match(/_([^_]+)_/)) {
            const roleMatch = line.match(/_([^_]+)_/);
            if (roleMatch) {
              currentExperience.title = roleMatch[1].trim();
            }
            // Remove the italic part and add rest to description if any
            const restOfLine = line.replace(/_[^_]+_/, '').trim();
            if (restOfLine) {
              currentExperience.description.push(restOfLine);
            }
          }
          // Everything else is description
          else if (line && !line.startsWith('- **')) {
            currentExperience.description.push(line);
            collectingDescription = true;
          }
          // Empty line ends description collection
          else if (!line && collectingDescription) {
            collectingDescription = false;
          }
        }
      }

      // Process other sections as needed...
    }

    // Don't forget to add the last experience
    if (currentExperience) {
      cvData.experience.push(currentExperience);
    }

    // Clean up experiences
    cvData.experience = cvData.experience.map(exp => ({
      ...exp,
      description: exp.description.filter(d => d.trim()).join(' ')
    }));

    return cvData;
  }
}

module.exports = CVParser;