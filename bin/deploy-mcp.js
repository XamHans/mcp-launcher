#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');
const os = require('os');

const distPath = path.join(__dirname, '../dist/server/index.js');
const srcPath = path.join(__dirname, '../src/server/index.ts');
const packageJson = require('../package.json');

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
    help: args.includes('--help') || args.includes('-h'),
    version: args.includes('--version') || args.includes('-v'),
    project: getFlagValue(args, '--project', '-p'),
    'api-key': getFlagValue(args, '--api-key', '-k'),
    port: getFlagValue(args, '--port'),
    'no-browser': args.includes('--no-browser'),
    'save-config': args.includes('--save-config') || args.includes('-s'),
    ci: args.includes('--ci')
};

function getFlagValue(args, ...flags) {
    for (const flag of flags) {
        const index = args.indexOf(flag);
        if (index !== -1 && args[index + 1]) {
            return args[index + 1];
        }
    }
    return null;
}

// Help text
if (flags.help) {
    console.log(`
🚀 MCP Launcher v${packageJson.version}

Deploy MCP (Model Context Protocol) servers to Google Cloud Run

USAGE:
    npx mcp-launcher [OPTIONS]

OPTIONS:
    -p, --project <id>      Google Cloud Project ID
    -k, --api-key <key>     Anthropic API Key (optional, for agent features)
    --port <number>         Server port (default: 3000)
    --no-browser            Don't open browser automatically
    -s, --save-config       Save configuration to .env file
    --ci                    Run in CI mode (no interactive prompts)
    -h, --help              Show this help message
    -v, --version           Show version number

EXAMPLES:
    # Interactive mode (prompts for missing values)
    npx mcp-launcher

    # With project ID and API key
    npx mcp-launcher --project my-project --api-key sk-ant-...

    # Save configuration for future runs
    npx mcp-launcher --project my-project --save-config

    # Run on different port without opening browser
    npx mcp-launcher --port 8080 --no-browser

ENVIRONMENT VARIABLES:
    You can also set these in a .env file or environment:
    - GOOGLE_PROJECT_ID     Required: Your GCP project ID
    - ANTHROPIC_API_KEY     Optional: For agent/audit features
    - PORT                  Optional: Server port (default: 3000)
    - CI                    Optional: Disable browser auto-open

DOCUMENTATION:
    https://github.com/yourusername/mcp-launcher#readme
`);
    process.exit(0);
}

// Version
if (flags.version) {
    console.log(packageJson.version);
    process.exit(0);
}

// Display welcome banner
console.log('🚀 MCP Launcher');
console.log('   Deploy MCP servers to Google Cloud Run\n');

// Create readline interface for prompts
function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// Prompt function that returns a Promise
function askQuestion(rl, question, defaultValue = '', isPassword = false) {
    return new Promise((resolve) => {
        const promptText = defaultValue 
            ? `${question} [${isPassword ? '****' : defaultValue}]: `
            : `${question}: `;
        
        rl.question(promptText, (answer) => {
            resolve(answer.trim() || defaultValue);
        });
    });
}

// Find existing .env file
function findEnvFile() {
    const locations = [
        path.join(process.cwd(), '.env'),
        path.join(os.homedir(), '.mcp-launcher', '.env'),
        path.join(__dirname, '..', '.env')
    ];
    
    for (const location of locations) {
        if (fs.existsSync(location)) {
            return location;
        }
    }
    return null;
}

// Load existing .env file
function loadEnvFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return {};
    
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    });
    
    return env;
}

// Save to .env file
function saveEnvFile(filePath, vars) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    let content = '# MCP Launcher Configuration\n';
    content += `# Generated on ${new Date().toISOString()}\n\n`;
    
    if (vars.GOOGLE_PROJECT_ID) {
        content += `# Required: Your Google Cloud Project ID\n`;
        content += `GOOGLE_PROJECT_ID=${vars.GOOGLE_PROJECT_ID}\n\n`;
    }
    
    if (vars.ANTHROPIC_API_KEY) {
        content += `# Optional: Your Anthropic API Key (for agent features)\n`;
        content += `ANTHROPIC_API_KEY=${vars.ANTHROPIC_API_KEY}\n\n`;
    }
    
    content += `# Optional: Server port (default: 3000)\n`;
    content += `# PORT=3000\n\n`;
    
    content += `# Optional: Set to 'true' to disable browser auto-open\n`;
    content += `# CI=false\n`;
    
    fs.writeFileSync(filePath, content);
    console.log(`💾 Configuration saved to: ${filePath}\n`);
}

// Check for gcloud
function checkCommand(command) {
    return new Promise((resolve) => {
        const check = spawn(command, ['--version'], { stdio: 'pipe' });
        check.on('error', () => resolve(false));
        check.on('close', (code) => resolve(code === 0));
    });
}

async function main() {
    // Check prerequisites first
    const hasGcloud = await checkCommand('gcloud');
    const hasDocker = await checkCommand('docker');
    
    if (!hasGcloud) {
        console.error('❌ Google Cloud SDK (gcloud) is not installed or not in PATH.');
        console.error('   Install from: https://cloud.google.com/sdk/docs/install\n');
        process.exit(1);
    }
    
    if (!hasDocker) {
        console.error('❌ Docker is not installed or not running.');
        console.error('   Install from: https://docs.docker.com/get-docker/\n');
        process.exit(1);
    }
    
    console.log('✅ Prerequisites checked (gcloud, docker)\n');
    
    // Try to load existing .env
    const envFilePath = findEnvFile();
    const existingEnv = loadEnvFile(envFilePath);
    
    // Determine configuration values
    let config = {
        GOOGLE_PROJECT_ID: flags.project || process.env.GOOGLE_PROJECT_ID || existingEnv.GOOGLE_PROJECT_ID,
        ANTHROPIC_API_KEY: flags['api-key'] || process.env.ANTHROPIC_API_KEY || existingEnv.ANTHROPIC_API_KEY,
        PORT: flags.port || process.env.PORT || existingEnv.PORT || '3000'
    };
    
    // Interactive prompts if not in CI mode and values are missing
    const isCI = flags.ci || process.env.CI === 'true';
    
    if (!isCI && !flags.ci) {
        const rl = createRL();
        
        // Prompt for Project ID if missing
        if (!config.GOOGLE_PROJECT_ID) {
            console.log('📋 Configuration needed:\n');
            config.GOOGLE_PROJECT_ID = await askQuestion(
                rl,
                'Google Cloud Project ID',
                existingEnv.GOOGLE_PROJECT_ID
            );
            
            if (!config.GOOGLE_PROJECT_ID) {
                console.error('\n❌ Google Cloud Project ID is required');
                rl.close();
                process.exit(1);
            }
        }
        
        // Prompt for API Key if missing (optional)
        if (!config.ANTHROPIC_API_KEY) {
            const apiKey = await askQuestion(
                rl,
                'Anthropic API Key (optional, press Enter to skip)',
                existingEnv.ANTHROPIC_API_KEY,
                true
            );
            config.ANTHROPIC_API_KEY = apiKey;
        }
        
        rl.close();
        
        // Offer to save configuration
        if (flags['save-config'] || (!envFilePath && (config.GOOGLE_PROJECT_ID || config.ANTHROPIC_API_KEY))) {
            console.log('');
            const saveRl = createRL();
            const shouldSave = await askQuestion(saveRl, 'Save this configuration to .env file? (y/N)', 'n');
            saveRl.close();
            
            if (shouldSave.toLowerCase() === 'y' || shouldSave.toLowerCase() === 'yes') {
                const savePath = path.join(process.cwd(), '.env');
                saveEnvFile(savePath, config);
            }
        }
    } else if (!config.GOOGLE_PROJECT_ID) {
        // CI mode without required values
        console.error('❌ Missing required configuration: GOOGLE_PROJECT_ID');
        console.error('   Provide via --project flag or GOOGLE_PROJECT_ID environment variable\n');
        process.exit(1);
    }
    
    // Set environment variables
    process.env.GOOGLE_PROJECT_ID = config.GOOGLE_PROJECT_ID;
    if (config.ANTHROPIC_API_KEY) {
        process.env.ANTHROPIC_API_KEY = config.ANTHROPIC_API_KEY;
    }
    process.env.PORT = config.PORT;
    
    if (flags['no-browser'] || flags.ci) {
        process.env.CI = 'true';
    }
    
    // Display configuration (hide API key)
    console.log('\n📊 Configuration:');
    console.log(`   Project ID: ${config.GOOGLE_PROJECT_ID}`);
    console.log(`   API Key: ${config.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Not set'}`);
    console.log(`   Port: ${config.PORT}`);
    console.log(`   Browser: ${process.env.CI === 'true' ? 'Disabled' : 'Auto-open'}\n`);
    
    // Start the server
    if (fs.existsSync(distPath)) {
        console.log('🚀 Starting server...\n');
        require(distPath);
    } else {
        console.log('📦 Running in development mode with ts-node...\n');
        const child = spawn('npx', ['ts-node', srcPath], {
            stdio: 'inherit',
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        child.on('close', (code) => {
            process.exit(code);
        });
    }
}

main().catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
