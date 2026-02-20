const { spawn } = require('child_process');
const http = require('http');

// Helper to start a process and log its output
function startProcess(command, args, name) {
    const child = spawn(command, args, { shell: true, stdio: 'pipe' });

    child.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg.includes('http') || msg.includes('Error') || msg.includes('Ready') || msg.includes('Metro')) {
            console.log(`[${name}] ${msg}`);
        }
    });

    child.stderr.on('data', (data) => {
        // Metro logs to stderr mostly
        console.error(`[${name}] ${data.toString().trim()}`);
    });

    return child;
}

// Function to start a localtunnel and return the URL
function startTunnel(port, name) {
    return new Promise((resolve, reject) => {
        console.log(`Starting ${name} tunnel on port ${port}...`);
        // Use --yes to skip installation prompt if not installed
        const tunnel = spawn('npx', ['--yes', 'localtunnel', '--port', port.toString()], { shell: true });

        let resolved = false;

        tunnel.stdout.on('data', (data) => {
            const msg = data.toString().trim();
            console.log(`[${name} RAW] ${msg}`); // Log everything to debug
            if (msg.includes('your url is:')) {
                const url = msg.replace('your url is:', '').trim();
                console.log(`[${name}] Tunnel URL: ${url}`);
                if (!resolved) {
                    resolved = true;
                    resolve({ process: tunnel, url });
                }
            }
        });

        tunnel.stderr.on('data', (data) => {
            console.error(`[${name} ERROR] ${data.toString()}`);
        });

        // Timeout if tunnel doesn't start
        setTimeout(() => {
            if (!resolved) {
                console.error(`[${name}] Tunnel timed out`);
                // Don't reject, just let it fail or retry. 
                // Better to reject so we fail fast.
                // reject(new Error('Tunnel timed out'));
            }
        }, 10000);
    });
}

async function main() {
    // Kill existing processes on ports first
    try {
        // Windows taskkill
        spawn('taskkill', ['/F', '/IM', 'node.exe'], { shell: true });
        // Give it a moment
        await new Promise(r => setTimeout(r, 1000));
    } catch (e) { }

    console.log('Starting local server on port 5000...');
    const server = startProcess('npm', ['run', 'server:dev'], 'SERVER');

    try {
        const apiTunnel = await startTunnel(5000, 'API');
        const metroTunnel = await startTunnel(8081, 'METRO');

        console.log('\n🎉 Tunnels established!');
        console.log(`API: ${apiTunnel.url}`);
        console.log(`Metro: ${metroTunnel.url}`);
        console.log('\nIMPORTANT: If the app fails to load the bundle, open the Metro URL in your phone browser and click "Click to Continue".\n');

        const env = {
            ...process.env,
            EXPO_PUBLIC_DOMAIN: apiTunnel.url.replace('https://', '').replace('http://', ''),
            REACT_NATIVE_PACKAGER_HOSTNAME: metroTunnel.url.replace('https://', '').replace('http://', '')
        };

        console.log('Starting Expo (Tunnel Mode via Localtunnel)...');

        // We do NOT use --tunnel flag here because we are providing our own tunnel via hostname
        const expo = spawn('npx', ['expo', 'start', '--port', '8081', '--localhost'], {
            shell: true,
            stdio: 'inherit',
            env: env
        });

        expo.on('close', () => {
            server.kill();
            apiTunnel.process.kill();
            metroTunnel.process.kill();
            process.exit(0);
        });

        process.on('SIGINT', () => {
            server.kill();
            apiTunnel.process.kill();
            metroTunnel.process.kill();
            process.exit();
        });

    } catch (err) {
        console.error('Failed to set up tunnels:', err);
        process.exit(1);
    }
}

main();
