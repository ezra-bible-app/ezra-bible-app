# features/module_installation.feature

Feature: Module installation
  In order to study bible text
  I first install a bible module

  Scenario: KJV installation
    Given I open the module installation assistant
    And I choose to add translations
    And I select the CrossWire repository
    And I select the English language
    And I select the KJV module

    When the installation is completed

    Then the KJV is available as a local module
    And the KJV is selected as the current translation
    And the relevant buttons in the menu are enabled