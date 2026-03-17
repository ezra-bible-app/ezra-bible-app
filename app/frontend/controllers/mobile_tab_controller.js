/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2026 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

const eventController = require('./event_controller.js');

/**
 * The MobileTabMenuController handles the fullscreen tab menu for mobile devices.
 * 
 * @category Controller
 */
class MobileTabController {
  constructor() {
    this.mobileTabMenu = null;
    this.mobileTabTiles = null;
    this.mobileTabMenuCloseButton = null;
    this.tabButtons = [];
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
    
    // Initialize with the current tab buttons
    this.updateTabButtons();
    
    if (this.mobileTabMenuCloseButton) {
      this.mobileTabMenuCloseButton.addEventListener('click', () => {
        this.hideMobileTabMenu();
      });
    }

    eventController.subscribe('on-tab-menu-clicked', () => {
      this.showMobileTabMenu();
    });

    // Listen for tab added event
    eventController.subscribe('on-tab-added', (tabIndex) => {
      this.updateTabButtons();

      if (app_controller.isStartupCompleted()) {
        this.animateTabButton(tabIndex);
      }
    });

    // Listen for tab removed event
    eventController.subscribe('on-tab-removed', () => {
      // Update tab buttons array when a tab is removed
      this.updateTabButtons();
    });
    
    // Listen for the tab controller's loading completion
    eventController.subscribe('on-tab-controller-loaded', () => {
      // Ensure the correct tab is selected
      const selectedTabIndex = app_controller.tab_controller.getSelectedTabIndex();
      if (selectedTabIndex > 0) {
        setTimeout(() => {
          app_controller.tab_controller.tabs.tabs('select', selectedTabIndex);
        }, 300); // Small delay to ensure DOM is ready
      }
    });

    this.isInitialized = true;
    this.refreshMobileTabMenu();
  }

  /**
   * Update the list of tab buttons from all verse list menus
   */
  updateTabButtons() {
    this.tabButtons = [];
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.style.display = 'flex';
      this.tabButtons.push(button);
    });
    
    this.updateTabCountBadges();
  }

  showMobileTabMenu() {
    this.refreshMobileTabMenu();
    
    if (this.mobileTabMenu) {
      this.mobileTabMenu.classList.add('visible');
    }
    
    // Add active state to current tab's tab button
    const selectedTabIndex = app_controller.tab_controller.getSelectedTabIndex();
    if (this.tabButtons[selectedTabIndex]) {
      this.tabButtons[selectedTabIndex].classList.add('active');
    }
  }

  hideMobileTabMenu() {
    if (this.mobileTabMenu) {
      this.mobileTabMenu.classList.remove('visible');
    }
    
    // Remove active state from all tab buttons
    this.tabButtons.forEach(button => {
      button.classList.remove('active');
    });
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
              // Switch to the selected tab
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

    this.updateTabCountBadges();
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
    titleDiv.innerHTML = title;
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
   * Updates the tab count in all tab buttons
   */
  updateTabCountBadges() {
    if (!app_controller || !app_controller.tab_controller) {
      return;
    }
    
    const tabCount = app_controller.tab_controller.getTabCount();
    
    // Update tab count on all tab buttons
    this.tabButtons.forEach(button => {
      if (button) {
        button.setAttribute('data-tab-count', tabCount.toString());
      }
    });
  }

  /**
   * Animates the specified tab button to indicate a new tab has been added non-interactively
   * @param {number} tabIndex - The index of the tab whose button should be animated
   */
  animateTabButton(tabIndex = 0) {
    const button = this.tabButtons[tabIndex];
    if (!button) {
      return;
    }

    // Add animation class
    button.classList.add('tab-button-animation');
    
    // Remove animation class after animation completes to allow for future animations
    setTimeout(() => {
      button.classList.remove('tab-button-animation');
    }, 1000); // 1s * 2 iterations = 2s total, but we'll use 1s as timeout
  }
}

module.exports = MobileTabController;