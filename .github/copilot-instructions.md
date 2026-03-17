
# Ezra Bible App - GitHub Copilot Instructions

This file contains instructions and context for GitHub Copilot to assist with development on the Ezra Bible App project.

## Project Overview

Ezra Bible App is a cross-platform Bible study application focusing on topical study based on keywords/tags. It is built using:
- **Desktop**: Electron framework
- **Mobile**: Cordova framework (Android)
- **Language**: JavaScript (ES6)
- **Database**: SQLite with Sequelize ORM
- **UI**: HTML, CSS, jQuery, jQuery UI
- **Bible modules**: SWORD library via [node-sword-interface](https://github.com/ezra-bible-app/node-sword-interface)

### Key Features
- Bible translation management (SWORD modules)
- Verse tagging and categorization
- Topical study with tag-based organization
- Note-taking on verses
- Module search functionality
- Cross-platform support (Windows, macOS, Linux, Android, Chromebook)

## Architecture

### Backend vs Frontend Separation
- **Backend** (Electron main process / Cordova nodejs process):
  - SWORD library interaction via node-sword-interface
  - SQLite database access via Sequelize
  - Application settings management
  - Located in: `app/backend/`

- **Frontend** (Electron renderer process / Android WebView):
  - UI components and controllers
  - Event-driven architecture using Pub/Sub pattern
  - Located in: `app/frontend/`

- **Communication**: Inter-Process Communication (IPC) via `app/backend/ipc/` and `app/frontend/ipc/`

### Key Directories
- `app/backend/` - Backend logic (database, IPC handlers, SWORD interface)
- `app/frontend/` - Frontend controllers and components
- `app/lib/` - Shared libraries
- `app/templates/` - Pug templates for UI rendering
- `features/` - Cucumber feature files for end-to-end testing
- `locales/` - Internationalization files (i18next)
- `build_scripts/` - Build and packaging scripts
- `package_config/` - Configuration for different package formats

### Design Patterns
- **Controllers**: Manage components and interact with backend (e.g., `AppController`, `TagsController`, `NotesController`)
- **Components**: Represent specific UI elements (e.g., options menu, book selection)
- **Events**: Pub/Sub pattern via `eventController` for loose coupling (events documented in `app/frontend/event_types.js`)
- **Models**: Sequelize models in `app/backend/database/models/` represent database tables

## JavaScript Coding Standards

### Style Guidelines
- **Always** use single quotes for strings
- Use 2 spaces for indentation (not tabs)
- **Do not** use optional chaining operator (`?.`) in code
- Add semicolons at end of statements
- Follow ESLint configuration in `.eslintrc.json`

### Examples
```javascript
// Good
const myString = 'Hello World';
if (obj && obj.property) {
  console.log(obj.property);
}

// Bad
const myString = "Hello World";  // Don't use double quotes
if (obj?.property) {  // Don't use optional chaining
  console.log(obj.property);
}
```

## General Guidelines

### License Headers
**Do not** update or reformat license headers in existing files when making changes.

For example, these lines must remain unchanged:
```
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
```

### Product Names and Terms
When working with translations or documentation, **do not translate**:
- "Ezra Bible App" (product name)
- "Strong's" (biblical reference system)
- "CrossWire Bible Society"
- "SWORD" (library name)

## Building and Testing

### Prerequisites
- Node.js v18.x (compatibility with other versions not guaranteed)
- Platform-specific build tools (see `BUILD.md` for details)

### Testing Philosophy
- **Prefer manual testing**: Changes should be verified manually by running the application
- Automated tests (Jest, Cucumber) exist but are not required for every change
- Focus on ensuring changes work correctly through hands-on verification

### Common Commands
```bash
# Start the app in development mode
npm start

# Build JavaScript bundle
npm run browserify     # Bundle and minify

# Linting
npx eslint <file>      # Lint specific files

# Database migrations
npm run migrate-db     # Run migrations and seeds

# Compile Pug templates
npm run compile-pug

# Documentation generation
npm run doc            # Generate JSDoc documentation

# Optional: Run automated tests if needed
npm test                # Jest unit tests
npm run dev-test       # Cucumber tests (fail-fast)
npm run full-test      # All Cucumber tests
```

### Building Releases
- Windows: `npm run build-win`, `npm run package-win`
- Linux: `npm run build-linux`, `npm run package-linux`
- macOS: `npm run build-mac-x64` / `npm run build-mac-arm64`

See `BUILD.md` for detailed platform-specific build instructions.

## Key Technologies and Libraries

### Core Dependencies
- **Electron**: Desktop app framework
- **Cordova**: Mobile app framework (Android)
- **Sequelize**: ORM for SQLite database
- **jQuery/jQuery UI**: DOM manipulation and UI widgets
- **i18next**: Internationalization framework
- **Pug**: Template engine for verse lists
- **node-sword-interface**: Native C++ addon for SWORD library

### UI Libraries
- **Chart.js**: Verse statistics visualization
- **CodeMirror**: In-browser editor for notes
- **Marked**: Markdown parser/renderer
- **fontawesome**: Icon set
- **iziToast**: Notification popups
- **Hammer.JS**: Touch gesture detection (mobile)

### Testing Frameworks (Optional)
The project includes automated testing frameworks, but manual verification is preferred:
- **Jest**: Unit testing
- **Cucumber.js**: Behavior-driven development (BDD)
- **Chai**: Assertion library
- **Spectron**: Electron testing

See `TECH.md` for complete technology stack details.

## Development Workflow

### Making Changes
1. Understand the architecture (backend vs frontend separation)
2. Check if changes affect IPC communication
3. Follow coding standards (single quotes, 2-space indentation)
4. **Manually verify changes** by running the application (`npm start`)
5. Update documentation if adding new features
6. Ensure license headers remain unchanged

### Working with Database
- Models are in `app/backend/database/models/`
- Migrations use Sequelize CLI and Umzug
- Run `npm run migrate-db` after schema changes

### Working with Translations
- Locale files are in `locales/<language-code>/`
- Add new languages by copying `locales/en/` and updating `locales/locales.json`
- Use i18next keys for all user-facing strings

### Working with IPC
- Backend IPC handlers: `app/backend/ipc/`
- Frontend IPC clients: `app/frontend/ipc/`
- Keep communication protocol documented and consistent

## Common Tasks

### Adding a New Feature
1. Determine if it's frontend, backend, or both
2. Create/update controllers and components as needed
3. Use event system for loose coupling between components
4. **Manually verify the feature** works by running the application
5. Update relevant documentation

### Fixing Bugs
1. Check if bug is frontend or backend related
2. Reproduce the bug manually
3. Implement fix following coding standards
4. **Verify fix through manual testing** by running the application

### Performance Optimization
- Profile with Chrome DevTools (Electron uses Chromium)
- Minimize database queries (use Sequelize efficiently)
- Use event system to avoid tight coupling
- Consider lazy loading for heavy UI components

## Documentation

- **README.md**: General project overview and user information
- **TECH.md**: Complete technology stack details
- **BUILD.md**: Platform-specific build instructions
- **DESIGN.md**: Architecture and design documentation
- **CONTRIBUTING.md**: Contribution guidelines
- **API Documentation**: https://apidocs.ezrabibleapp.net (generated with JSDoc)

## Additional Notes

- The app supports multiple Bible translations via SWORD modules
- Database file can be synced with Dropbox
- The app is licensed under GPL-2.0+
- See `CONTRIBUTING.md` for pull request guidelines
- Join discussions at https://github.com/ezra-bible-app/ezra-bible-app/discussions
