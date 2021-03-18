class TextSizeSettings {
  constructor() {
    this._settingsObject = window.ipcSettings;
    this.openMenuButton = '.text-size-settings';
    this.menuContainer = '.text-size-menu';
    this.menuIsOpened = false;
  }

  init() {
    $(this.openMenuButton).bind('click', (event) => {
      event.stopPropagation()
      if(this.menuIsOpened) {
        this.hideTextSizeMenu();
      } else {
        this.showTextSizeMenu();
      }
    });
  }

  showTextSizeMenu() {
    console.log(`--- show ${this.menuContainer}`);
    var currentVerseListMenu = app_controller.getCurrentVerseListMenu();
    var $menuButton = currentVerseListMenu.find('.display-options-button');
    $menuButton.addClass('ui-state-active');
    var $menuContainer = currentVerseListMenu.find(this.menuContainer);

    var top_offset = $menuButton.top + $menuButton.height() + 1;
    var left_offset = $menuButton.left + $menuButton.width()/2 - $menuContainer.width()/2;    
    $menuContainer.css('top', top_offset);
    $menuContainer.css('left', left_offset);

    this.menuIsOpened = true;
    $menuContainer.show();
  }

  hideTextSizeMenu() {
    if (this.menuIsOpened) {
      console.log(`--- hide ${this.menuContainer}`);
      $('#app-container').find(this.menuContainer).hide();
      this.menuIsOpened = false;
      $('#app-container').find(this.openMenuButton).removeClass('ui-state-active');
    }
  }

}

module.exports = TextSizeSettings;