const fs = require('fs');
const path = require('path');

// List of missing service files
const missingServices = [
  'automaticOvertimeService',
  'attendanceMonitor',
  'absenceDetectionService',
  'scheduledOvertimeJob'
];

// Template for basic service file
const serviceTemplate = (serviceName) => `// ${serviceName} - Basic service implementation

class ${serviceName} {
  constructor() {
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log(\`\${serviceName} initialized\`);
      return true;
    } catch (error) {
      console.error(\`Error initializing \${serviceName}:\`, error);
      return false;
    }
  }

  async start() {
    try {
      this.isRunning = true;
      console.log(\`\${serviceName} started\`);
      return true;
    } catch (error) {
      console.error(\`Error starting \${serviceName}:\`, error);
      return false;
    }
  }

  async stop() {
    try {
      this.isRunning = false;
      console.log(\`\${serviceName} stopped\`);
      return true;
    } catch (error) {
      console.error(\`Error stopping \${serviceName}:\`, error);
      return false;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      name: '${serviceName}'
    };
  }
}

// Create singleton instance
const ${serviceName.toLowerCase()} = new ${serviceName}();

module.exports = ${serviceName.toLowerCase()};
`;

// Create missing service files
missingServices.forEach(serviceName => {
  const filePath = path.join(__dirname, 'services', `${serviceName}.js`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, serviceTemplate(serviceName));
    console.log(`Created ${serviceName}.js`);
  } else {
    console.log(`${serviceName}.js already exists`);
  }
});

console.log('All missing service files created!');
