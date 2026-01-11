const { notarize } = require('@electron/notarize');

async function notarizeApp(appOutDir, appName, appBundleId) {
  var notarized = false;
  
  try {
    await notarize({
      appBundleId: appBundleId,
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PW,
      teamId: process.env.APPLE_TEAM_ID
    });
    notarized = true;

  } catch (error) {
    console.log(error);
  }
  
  return notarized;
}

async function notarizeEzra() {
  // Get architecture from command line argument, default to x64
  const arch = process.argv[2] || 'x64';
  
  // Validate architecture
  if (arch !== 'x64' && arch !== 'arm64') {
    console.error("Error: Invalid architecture. Use 'x64' or 'arm64'");
    return process.exit(1);
  }
  
  console.log(`Notarizing for architecture: ${arch}`);
  
  var notarized = false;
  notarized = await notarizeApp(`release/Ezra Bible App-darwin-${arch}`, "Ezra Bible App", "net.ezrabibleapp.electron");
    
  if (notarized) {
    return process.exit(0);
  } else {
    return process.exit(1);
  }
}

notarizeEzra();