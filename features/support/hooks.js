const { Before } = require('@wdio/cucumber-framework');
const spectronHelper = require('../helpers/spectron_helper.js');
const uiHelper = require('../helpers/ui_helper.js');

// Start each scenario without open menus left over from the previous one.
Before({ timeout: 30 * 1000 }, async function () {
  const client = spectronHelper.getWebClient();

  await uiHelper.waitUntilGlobalLoaderIsHidden();
  await client.execute(() => {
    if (typeof app_controller !== 'undefined') {
      app_controller.hideAllMenus();
    }
  });
});
