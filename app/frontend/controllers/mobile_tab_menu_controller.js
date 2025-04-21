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
      return;
    }
    
    // Ensure app_controller and tab_controller are available
    if (!app_controller || !app_controller.tab_controller) {
      console.warn('Tab controller not available yet, skipping tab menu refresh');
      return;
    }
    
    try {
      const tabs = app_controller.tab_controller.getAllTabs();
      if (!tabs || !Array.isArray(tabs)) {
        console.warn('No tabs available yet, skipping tab menu refresh');
        return;
      }
      
      const selectedTabIndex = app_controller.tab_controller.getSelectedTabIndex();
      
      // Clear existing tiles
      this.mobileTabTiles.innerHTML = '';
      
      // Create tiles for each tab
      tabs.forEach((tab, index) => {
        if (!tab) return; // Skip if tab is null
        
        try {
          const tabTitle = this.getTabTileTitle(tab);
          const translationId = tab.getBibleTranslationId();
          
          const tileElement = this.createTabTile(tabTitle, translationId, index === selectedTabIndex);
          
          if (tileElement) {
            tileElement.addEventListener('click', () => {
              if (app_controller && app_controller.tab_controller && app_controller.tab_controller.tabs) {
                app_controller.tab_controller.tabs.tabs('select', index);
                this.hideMobileTabMenu();
              }
            });
            
            this.mobileTabTiles.appendChild(tileElement);
          }
        } catch (err) {
          console.error('Error creating tab tile:', err);
        }
      });
      
      // Add the "New Tab" tile
      try {
        const addTabTile = this.createAddTabTile();
        if (addTabTile) {
          addTabTile.addEventListener('click', () => {
            if (app_controller && app_controller.tab_controller) {
              app_controller.tab_controller.addTab();
              this.hideMobileTabMenu();
            }
          });
          
          this.mobileTabTiles.appendChild(addTabTile);
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
      switch (tab.getTextType()) {
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

  createTabTile(title, translationId, isActive) {
    try {
      const tileTemplate = html`
        <div class="mobile-tab-tile ${isActive ? 'active' : ''}">
          <div class="mobile-tab-tile-title">${title}</div>
          ${translationId ? html`<div class="mobile-tab-tile-translation">${translationId}</div>` : ''}
        </div>
      `;
      
      const tileElement = document.createElement('div');
      tileElement.innerHTML = tileTemplate;
      return tileElement.firstElementChild;
    } catch (err) {
      console.error('Error in createTabTile:', err);
      return null;
    }
  }

  createAddTabTile() {
    try {
      const tileTemplate = html`
        <div class="mobile-tab-tile mobile-tab-add-tile">
          <i class="fas fa-plus"></i>
          <div class="mobile-tab-tile-title">${i18n.t('bible-browser.open-new-tab')}</div>
        </div>
      `;
      
      const tileElement = document.createElement('div');
      tileElement.innerHTML = tileTemplate;
      return tileElement.firstElementChild;
    } catch (err) {
      console.error('Error in createAddTabTile:', err);
      return null;
    }
  }
}

module.exports = MobileTabMenuController;