# safe_app nodejs Change Log

[Unreleased]
### Added
- New binding `simulateNetworkDisconnect()` function to simulate a network disconnection event useful for applications testing purposes.
- Support for forcing the use of mock by providing `forceUseMock` boolean to the initialisation options of each safeApp instance, i.e. each safeApp instance can either use mock or prod libs independently.
- Ability to pass user metadata when inserting and updating file in MutableData
- Prevents download of `system_uri` if `PLATFORM_TYPE=mobile`

### Changed
- Upgrade safe_app native library to commit `a9b4c05` and adapt to minor API changes
- Removing `forEach` binding function from the MutableData entries API as it was removed from safe_app lib
- Adding `listEntries` binding function to the MutableData entries API which returns an array with all entries
- Moves asynchronous app initialisation opertions out of SAFEApp constructor and into class method
- The `initializeApp` function is now asynchronous
- `webFetch` may receive multipart range requests
- changes fromAuthURI to fromAuthUri
- changes loginFromURI to loginFromUri
- uses delete instead of remove as entry mutation action 
- changes initializeApp to use an s instead of z
- Network state callback invoked from `INIT` to `CONNECTED` states
- Simplifies test helper functions

### Fixed
- Fixed some tests which were giving false positive results

## SAFE libraries Dependencies
- safe_app: a9b4c05
- system_uri: v0.4.0

## [0.8.1] - 9-3-2018
### Changed
- Using "files" field in `package.json` to whitelist what's intended for packaing rather than blacklisting with .npmignore

### Fixed
- Native libraries were not being ignored when packaging

### SAFE libraries Dependencies
- safe_app: v0.6.0
- system_uri: v0.4.0

## [0.8.0] - 2-3-2018
### Added
- Tests for API modules
- Informative error codes and messages for cases not handled by native safe_app library
- Adapt code to upgrade safe_app lib to v0.6.0
- Download safe_app lib for both live & mock routing when installing in development mode
- Additional tests for verifying the size of keys generated from raw bytes
- New binding `getOwnContainerName()` function to retrieve the app's own container name
- New binding `readGrantedPermissions()` function to read the list of granted containers permissions from an auth URI without the need to connect beforehand

### Fixed
- The size of the secret encryption keys in the corresponding FFI array was corrected

### SAFE libraries Dependencies
- safe_app: v0.6.0
- system_uri: v0.4.0

## [0.7.0] - 29-1-2018
### Fixed
- Minor corrections to documentation snippet code and README
- Upgrade istanbul library to support async/await and remove errors when getting testing coverage

### Added
- Support for webFetch-ing partial content by providing the range of bytes to retrieve
- New tests were added as well as some enhancements to increase test coverage

### SAFE libraries Dependencies
- safe_app: v0.5.0
- system_uri: v0.4.0

## [0.6.1] - 18-1-2018
## Changed
- Recommend Node ^8.0.0 for building from source
- Upgrade CI scripts to test Node 8.0.0
- Pass the system URI's execution path as an array of arguments to support white spaces in it
- Adapt to changes in `system_uri` library API which now returns results as a pointer to FfiResult struct
- Upgrade system_uri library to v0.4.0

### SAFE libraries Dependencies
- safe_app: v0.5.0
- system_uri: v0.4.0

## [0.6.0] - 20-12-2017
### Added
- Increase test coverage to 90%+ plus minor reorganisation of tests

### Fixed
- Remove '/' characters added by some OS to auth URI before decoding it
- Fix issue in webFetch with URL's ending with '/' to correctly treat it as ending with a folder path

### SAFE libraries Dependencies
- safe_app: v0.5.0
- system_uri: v0.3.0

## 0.5.3
- Fix webFetch to load URLs from root and sub directory

## 0.5.2
- Fix webFetch to load URLs from root and sub directory

## 0.5.1
- Upgrade safe_app version to `57f3afb`
- Adapt to change in safe_app which adds app's ID in unreg auth requests

## 0.5.0

- Add function to retrieve account information
- Adapt to API changes from safe_client_libs to upgrade to latest version
- Add functions to verify network connection state
- Add API to manage signing keys (sign/verify functions included)
- Automate npm publish process triggered upon tag push
- Upgrade system_uri to v0.3.0

## 0.4.1

- Expose Constants which can be used by Apps
- Rely on the safe-core network observer callbacks upon a reconnection
- Uses e9080ac commit version from [alpha-2 branch](https://github.com/maidsafe/safe_client_libs/tree/f40fef47973294b03f8e37dade8edaa8e2da20c9)

## 0.4.0

- Compatible with safe_app v0.4.0
- New set of standalone API Examples Using Mock Routing
- Automatically remove white spaces from appInfo vendor and name to create the .desktop files when registering the URI scheme
- Add an option to allow registration of additional custom protocols in the system URI scheme.
- Support for passing the bundle id in the appInfo object upon initialisation needed for OSX system URI registration
- Upgrade system_uri to v0.2.3

## 0.3.0

- Compatible with safe_app v0.4.0
- Minor fixes
- uses system_uri v0.2.2

## 0.1.0-dev.1

- NFS API updates
- Freeing of safe_app handles
- Minor fixes
