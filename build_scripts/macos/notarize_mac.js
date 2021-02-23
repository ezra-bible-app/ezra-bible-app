const { notarize } = require('electron-notarize');

async function notarizeApp(appOutDir, appName, appBundleId) {
  var notarized = false;
  
  try {
    await notarize({
      appBundleId: appBundleId,
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PW,
    });
    notarized = true;

  } catch (error) {
    console.log(error);
  }
  
  return notarized;
};

async function notarizeEzra() {
    var notarized = false;
    notarized = await notarizeApp("release/Ezra Bible App-darwin-x64", "Ezra Bible App", "net.ezra-project.electronapp");
    
    if (notarized) {
        return process.exit(0);
    } else {
        return process.exit(1);
    }
}

notarizeEzra();