/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2025 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const eventController = require('./event_controller.js');
const { html } = require('../helpers/ezra_helper.js');

/**
 * The MobileTabMenuController handles the fullscreen tab menu for mobile devices.
 * 
 * @category Controller
 */
class MobileTabMenuController {
  constructor() {
    this.mobileTabMenu = null;
    this.mobileTabTiles = null;
    this.mobileTabMenuCloseButton = null;
    this.tabButton = null;
    this.isInitialized = false;
  }

  init() {
    this.mobileTabMenu = document.getElementById('mobile-tab-menu');
    if (!this.mobileTabMenu) {
      console.error('Mobile tab menu element not found!');
      return;
    }
    
    this.mobileTabTiles = this.mobileTabMenu.querySelector('.mobile-tab-tiles');
    this.mobileTabMenuCloseButton = this.mobileTabMenu.querySelector('.mobile-tab-menu-close');
    this.tabButton = document.getElementById('tab-button');
    
    if (this.mobileTabMenuCloseButton) {
      this.mobileTabMenuCloseButton.addEventListener('click', () => {
        this.hideMobileTabMenu();
      });
    }

    eventController.subscribe('on-tab-menu-clicked', () => {
      this.showMobileTabMenu();
    });

    this.isInitialized = true;
    this.refreshMobileTabMenu();
  }

  showMobileTabMenu() {
    this.refreshMobileTabMenu();
    
    if (this.mobileTabMenu) {
      this.mobileTabMenu.classList.add('visible');
    }
    
    // Add active state to tab button
    if (this.tabButton) {
      this.tabButton.classList.add('active');
    }
  }

  hideMobileTabMenu() {
    if (this.mobileTabMenu) {
      this.mobileTabMenu.classList.remove('visible');
    }
    
    // Remove active state from tab button
    if (this.tabButton) {
      this.tabButton.classList.remove('active');
    }
  }

  refreshMobileTabMenu() {
    // Skip refresh if not fully initialized yet or elements aren't available
    if (!this.isInitialized || !this.mobileTabTiles) {
      return;
    }
    
    // Ensure app_controller and tab_controller are available
    if (!app_controller || !app_controller.tab_controller) {
      return;
    }
    
    const tabs = app_controller.tab_controller.getAllTabs();
    
    if (!tabs || !Array.isArray(tabs)) {
      return;
    }
    
    const selectedTabIndex = app_controller.tab_controller.getSelectedTabIndex();
    
    // Clear existing tiles
    this.mobileTabTiles.innerHTML = '';
    
    // Create tiles for each tab
    let tilesCreated = 0;
    tabs.forEach((tab, index) => {
      if (!tab) {
        return;
      }
      
      try {
        const tabTitle = this.getTabTileTitle(tab);
        const translationId = tab.getBibleTranslationId();
        
        //console.log(`Creating tile for tab ${index}: "${tabTitle}" [${translationId}]`);
        const tileElement = this.createTabTileElement(tabTitle, translationId, index === selectedTabIndex, tab);
        
        if (tileElement) {
          tileElement.addEventListener('click', () => {
            if (app_controller && app_controller.tab_controller && app_controller.tab_controller.tabs) {
              app_controller.tab_controller.tabs.tabs('select', index);
              this.hideMobileTabMenu();
            }
          });
          
          this.mobileTabTiles.appendChild(tileElement);
          tilesCreated++;
        } else {
          console.error(`Failed to create tile element for tab ${index}`);
        }
      } catch (err) {
        console.error(`Error creating tab tile ${index}:`, err);
      }
    });
    
    // Add the "New Tab" tile
    const addTabTile = this.createAddTabTileElement();
    if (addTabTile) {
      addTabTile.addEventListener('click', () => {
        if (app_controller && app_controller.tab_controller) {
          app_controller.tab_controller.addTab();
          this.hideMobileTabMenu();
        }
      });
      
      this.mobileTabTiles.appendChild(addTabTile);
    } else {
      console.error('Failed to create add tab tile element');
    }

    this.updateTabCountBadge();
  }

  getTabTileTitle(tab) {
    if (!tab) return '';
    
    let title = '';
    const textType = tab.getTextType();
    
    switch (textType) {
      case 'book':
        title = tab.getBookTitle() || i18n.t('bible-browser.empty-tab-title');
        break;
      case 'search_results':
        title = i18n.t('menu.search') + ': ' + tab.getSearchTerm();
        break;
      case 'tagged_verses':
        title = tab.getTaggedVersesTitle() || tab.getTagTitleList();
        // Strip HTML tags for display in tiles
        title = title.replace(/<[^>]*>/g, '');
        break;
      case 'xrefs':
        title = tab.getXrefTitle() || i18n.t('bible-browser.cross-references');
        break;
      default:
        title = i18n.t('bible-browser.empty-tab-title');
    }
    
    return title;
  }

  createTabTileElement(title, translationId, isActive, tab) {
    // Create simple DOM elements directly instead of using html template
    const tileDiv = document.createElement('div');
    tileDiv.className = 'mobile-tab-tile';
    if (isActive) tileDiv.classList.add('active');
    
    // Create close button in top-right corner
    const closeButton = document.createElement('div');
    closeButton.className = 'mobile-tab-close-button';
    
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times';
    closeButton.appendChild(closeIcon);
    
    // Add click handler to close button
    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      
      // Find index of the tab to close
      const tabs = app_controller.tab_controller.getAllTabs();
      const tabIndex = tabs.indexOf(tab);
      
      if (tabIndex !== -1) {
        // If this is the last tab, don't close it
        if (tabs.length <= 1) {
          console.log('Not closing the last tab');
          return;
        }
        
        // Use the TabController's removeTabByIndex method
        app_controller.tab_controller.removeTabByIndex(tabIndex);
        
        this.refreshMobileTabMenu();
      }
      
      return false; // Ensure the event doesn't propagate
    });
    
    // Add the close button to the tile
    tileDiv.appendChild(closeButton);
    
    // Create icon element based on tab type
    const iconElement = document.createElement('i');
    
    if (tab) {
      const textType = tab.getTextType();
      switch (textType) {
        case 'book':
          iconElement.className = 'fas fa-book-open';
          break;
        case 'search_results':
          iconElement.className = 'fas fa-search';
          break;
        case 'tagged_verses':
          iconElement.className = 'fas fa-tags';
          break;
        case 'xrefs':
          // Using chain links icon for cross-references
          iconElement.className = 'fas fa-link';
          break;
        default:
          iconElement.className = 'fas fa-file-alt';
          break;
      }
    } else {
      // Default icon if tab information isn't available
      iconElement.className = 'fas fa-file-alt';
    }
    
    // Add the icon to the tile
    tileDiv.appendChild(iconElement);
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'mobile-tab-tile-title';
    titleDiv.textContent = title;
    tileDiv.appendChild(titleDiv);
    
    if (translationId) {
      const translationDiv = document.createElement('div');
      translationDiv.className = 'mobile-tab-tile-translation';
      translationDiv.textContent = translationId;
      tileDiv.appendChild(translationDiv);
    }
    
    return tileDiv;
  }

  createAddTabTileElement() {
    // Create simple DOM elements directly
    const tileDiv = document.createElement('div');
    tileDiv.className = 'mobile-tab-tile mobile-tab-add-tile';
    
    const iconElement = document.createElement('i');
    iconElement.className = 'fas fa-plus';
    tileDiv.appendChild(iconElement);
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'mobile-tab-tile-title';
    titleDiv.textContent = i18n.t('bible-browser.open-new-tab');
    tileDiv.appendChild(titleDiv);
    
    return tileDiv;
  }

  /**
   * Updates the tab count in the tab button
   */
  updateTabCountBadge() {
    if (!this.tabButton || !app_controller || !app_controller.tab_controller) {
      return;
    }
    
    const tabCount = app_controller.tab_controller.getTabCount();
    
    // Simply set the tab count as the button content
    this.tabButton.textContent = tabCount.toString();
  }
}

module.exports = MobileTabMenuController;