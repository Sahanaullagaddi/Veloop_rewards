const { execSync } = require('child_process');

console.log('VELoop Build Orchestrator starting...');

if (process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_STATIC_URL || process.env.PORT) {
  console.log('Detected Railway / Backend host environment. Skipping frontend React compilation.');
  process.exit(0);
}

try {
  console.log('Installing frontend dependencies...');
  execSync('npm install --prefix frontend', { stdio: 'inherit' });

  console.log('Compiling frontend application...');
  execSync('npm run build --prefix frontend', { stdio: 'inherit' });

  console.log('Frontend build finished successfully!');
} catch (err) {
  console.error('Build Orchestrator encountered an error:', err);
  process.exit(1);
}
