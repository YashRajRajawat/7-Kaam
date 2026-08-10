const { spawn } = require('child_process');
const path = require('path');

const sdkPath = 'C:\\Users\\Yazor\\AppData\\Local\\Android\\Sdk';
const sdkManagerPath = path.join(sdkPath, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat');

console.log('🤖 Installing Android SDK 36 & Build Tools 36.0.0...');

function runSdkManager(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(sdkManagerPath, args, {
      env: { ...process.env, ANDROID_HOME: sdkPath, ANDROID_SDK_ROOT: sdkPath },
      shell: true
    });

    child.stdout.on('data', (data) => {
      const str = data.toString();
      process.stdout.write(str);
      if (str.includes('Accept?') || str.includes('y/N') || str.includes('Review licenses')) {
        child.stdin.write('y\n');
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`sdkmanager exited with code ${code}`));
    });
  });
}

async function main() {
  try {
    console.log('--- Installing Android 36 Packages ---');
    await runSdkManager(['--sdk_root=' + sdkPath, 'platforms;android-36', 'build-tools;36.0.0']);
    console.log('✅ Android SDK 36 installed successfully!');
  } catch (err) {
    console.error('❌ SDK Manager error:', err.message);
  }
}

main();
