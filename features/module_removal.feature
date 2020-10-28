# features/module_removal.feature

Feature: Module removal
  If a module is no longer relevant for my bible study
  I can remove that module

  Scenario: KJV removal
    Given the KJV is the only translation installed
    And I open the module installation assistant
    And I choose to remove translations
    And I select the KJV module for removal

    When the removal is completed

    Then the KJV is no longer available as a local module
    And the application has disabled buttons, because no translations are installed at this point