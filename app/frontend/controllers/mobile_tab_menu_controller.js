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
    console.log('Initializing MobileTabMenuController');
    
    this.mobileTabMenu = document.getElementById('mobile-tab-menu');
    if (!this.mobileTabMenu) {
      console.error('Mobile tab menu element not found!');
      return;
    }
    
    this.mobileTabTiles = this.mobileTabMenu.querySelector('.mobile-tab-tiles');
    this.mobileTabMenuCloseButton = this.mobileTabMenu.querySelector('.mobile-tab-menu-close');
    this.tabButton = document.getElementById('tab-button');
    
    if (this.tabButton) {
      console.log('Tab button found');
    } else {
      console.error('Tab button not found!');
    }

    if (this.mobileTabMenuCloseButton) {
      this.mobileTabMenuCloseButton.addEventListener('click', () => {
        console.log('Mobile tab menu close button clicked');
        this.hideMobileTabMenu();
      });
    }

    eventController.subscribe('on-tab-menu-clicked', () => {
      console.log('on-tab-menu-clicked event received');
      this.showMobileTabMenu();
    });

    eventController.subscribe('on-tab-added', () => {
      this.refreshMobileTabMenu();
      this.updateTabCountBadge();
    });

    // Subscribe to the event when a tab is removed
    eventController.subscribe('on-tab-removed', () => {
      this.refreshMobileTabMenu();
      this.updateTabCountBadge();
    });

    eventController.subscribe('on-tab-selected', () => {
      this.refreshMobileTabMenu();
    });

    eventController.subscribe('on-bible-text-loaded', () => {
      this.refreshMobileTabMenu();
    });

    eventController.subscribe('on-locale-changed', () => {
      this.refreshMobileTabMenu();
    });
    
    // Add direct click handler as a fallback
    if (this.tabButton) {
      this.tabButton.addEventListener('click', () => {
        console.log('Tab button clicked directly');
        this.showMobileTabMenu();
      });
    }

    // Let's delay the initial refresh until the application is fully loaded
    setTimeout(() => {
      this.isInitialized = true;
      this.refreshMobileTabMenu();
      this.updateTabCountBadge();
      console.log('MobileTabMenuController initialized');
    }, 1000);
  }

  showMobileTabMenu() {
    console.log('Showing mobile tab menu');
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
    console.log('Hiding mobile tab menu');
    
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
      console.log('Mobile tab menu not yet initialized, skipping refresh');
      return;
    }
    
    // Ensure app_controller and tab_controller are available
    if (!app_controller || !app_controller.tab_controller) {
      console.warn('Tab controller not available yet, skipping tab menu refresh');
      return;
    }
    
    try {
      const tabs = app_controller.tab_controller.getAllTabs();
      console.log('Retrieved tabs:', tabs ? tabs.length : 0);
      
      if (!tabs || !Array.isArray(tabs)) {
        console.warn('No tabs available yet, skipping tab menu refresh');
        return;
      }
      
      const selectedTabIndex = app_controller.tab_controller.getSelectedTabIndex();
      console.log('Selected tab index:', selectedTabIndex);
      
      // Clear existing tiles
      this.mobileTabTiles.innerHTML = '';
      
      // Create tiles for each tab
      let tilesCreated = 0;
      tabs.forEach((tab, index) => {
        if (!tab) {
          console.log(`Tab ${index} is null, skipping`);
          return;
        }
        
        try {
          const tabTitle = this.getTabTileTitle(tab);
          const translationId = tab.getBibleTranslationId();
          
          console.log(`Creating tile for tab ${index}: "${tabTitle}" [${translationId}]`);
          
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
      
      console.log(`Created ${tilesCreated} tab tiles`);
      
      // Add the "New Tab" tile
      try {
        console.log('Creating add tab tile');
        const addTabTile = this.createAddTabTileElement();
        if (addTabTile) {
          addTabTile.addEventListener('click', () => {
            if (app_controller && app_controller.tab_controller) {
              app_controller.tab_controller.addTab();
              this.hideMobileTabMenu();
            }
          });
          
          this.mobileTabTiles.appendChild(addTabTile);
          console.log('Add tab tile created and appended');
        } else {
          console.error('Failed to create add tab tile element');
        }
      } catch (err) {
        console.error('Error creating add tab tile:', err);
      }
    } catch (err) {
      console.error('Error refreshing mobile tab menu:', err);
    }
  }

  getTabTileTitle(tab) {
    if (!tab) return '';
    
    let title = '';
    
    try {
      const textType = tab.getTextType();
      console.log(`Getting title for tab with text type: ${textType}`);
      
      switch (textType) {
        case 'book':
          title = tab.getBookTitle() || i18n.t('bible-browser.default-header');
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
          title = i18n.t('bible-browser.default-header');
      }
    } catch (err) {
      console.error('Error getting tab title:', err);
      title = i18n.t('bible-browser.default-header');
    }
    
    return title;
  }

  createTabTileElement(title, translationId, isActive, tab) {
    try {
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
      
      // Add click handler to close button (empty for now)
      closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        
        // Empty implementation for now
        console.log('Close button clicked for tab');
        
        return false;
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
    } catch (err) {
      console.error('Error in createTabTileElement:', err);
      return null;
    }
  }

  createAddTabTileElement() {
    try {
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
    } catch (err) {
      console.error('Error in createAddTabTileElement:', err);
      return null;
    }
  }

  /**
   * Updates the tab count directly in the tab button
   */
  updateTabCountBadge() {
    if (!this.tabButton || !app_controller || !app_controller.tab_controller) {
      return;
    }
    
    try {
      const tabCount = app_controller.tab_controller.getTabCount();
      
      // Simply set the tab count as the button content
      this.tabButton.textContent = tabCount.toString();
      
    } catch (err) {
      console.error('Error updating tab count:', err);
    }
  }
}

module.exports = MobileTabMenuController;