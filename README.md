# safe_app_nodejs

A safe_app library for [Node.js](https://nodejs.org/).

**Maintainer:** Gabriel Viganotti (gabriel.viganotti@maidsafe.net)

|Linux/OS X|Windows|Coverage Status|
|:---:|:---:|:---:|
|[![Build Status](https://travis-ci.org/maidsafe/safe_app_nodejs.svg?branch=master)](https://travis-ci.org/maidsafe/safe_app_nodejs)|[![Build status](https://ci.appveyor.com/api/projects/status/efktyecwydxrhs5d/branch/master?svg=true)](https://ci.appveyor.com/project/MaidSafe-QA/safe-app-nodejs/branch/master)|[![Coverage Status](https://coveralls.io/repos/github/maidsafe/safe_app_nodejs/badge.svg)](https://coveralls.io/github/maidsafe/safe_app_nodejs)|

## API Documentation

The documentation for the latest `safe_app_nodejs` API is available at <http://docs.maidsafe.net/safe_app_nodejs/>. See the ['Generate API docs' section](#generate-api-docs) further down for instructions to generate this docs locally.

## Development

1. Prerequisites

    * [Node.js](https://nodejs.org) ^8.0.0 (we recommend installing it via [nvm](https://github.com/creationix/nvm))
    * [Git](https://git-scm.com/)
    * [Yarn](https://yarnpkg.com) (as a replacement for `npm`).
    * Windows-specific:
      - Yarn attempts to build modules concurrently with multiple child processes, which causes intermittent timing issues on Windows. Users need to run `yarn config set child-concurrency 1` just once to effect local yarn settings.
      - In order to be able to build native Node modules for this library, run `npm install --global --production windows-build-tools` which installs Python 2.x, Visual Studio 2015 build tools, and Visual C++ build tools.

2. Clone this GitHub repository:

    ```bash
    git clone https://github.com/maidsafe/safe_app_nodejs.git
    ```

3. Install the dependencies:

    ``` bash
    cd safe_app_nodejs
    yarn
    ```

    If you are working on a development environment, you can run `NODE_ENV=dev yarn` instead in order to get the [`safe_app`](https://github.com/maidsafe/safe_client_libs/tree/master/safe_app) library which uses the `MockVault` file rather than connecting to the actual SAFE Network.
    ##### Windows-specific
    - In powershell, use `$env:NODE_ENV = "dev"`, which sets the environment variable for the duration of the terminal session.
    - In command prompt, use `set NODE_ENV=dev`, which also sets the environment variable for the duration of the terminal session.

### Testing

To run the tests locally, make sure you installed the [`safe_app`](https://github.com/maidsafe/safe_client_libs/tree/master/safe_app) library with `NODE_ENV=dev yarn`, then you can run them by executing `yarn test`.

Note: If you are compiling your own [`safe_app`](https://github.com/maidsafe/safe_client_libs/tree/master/safe_app) library for testing purposes, and if you want to be able to run the tests, make sure to include `testing` in your build features when compiling `safe_app` in `safe_client_libs`, i.e. `cargo build --release --features "use-mock-routing testing"`.

### Mobile Development

If you do not require [system_uri](https://github.com/maidsafe/system_uri) and would like to prevent it from downloading, first set `NODE_ENV` environment variable to either `mobile_prod` or `mobile_dev` before running `yarn`.

### Generate API docs

The documentation for the latest `safe_app_nodejs` API is published at <http://docs.maidsafe.net/safe_app_nodejs/>. If you are otherwise using a previous version of this package, you can also generate the API docs locally. Make sure you first install this package's dependencies with `yarn`, then execute the following command:
```bash
yarn docs
```
The API docs will be generated under the `docs` folder, you can simply open the `docs/index.html` file with your default browser.

### Experimental APIs

You are free to use any of the experimental APIs to explore the features that are being actively designed and developed.

Although you should be aware of the fact that all/any of the experimental APIs may be changed, deprecated, or even removed in the future, and without much anticipated notification by the core developers.

The reason they are exposed is to just allow developers to experiment and start learning about the APIs at an early stage.

In order to enable the experimental APIs the `--enable-experimental-apis` flag needs to be provided when running the application that depends on this package, or alternatively, the `enableExperimentalApis` flag can be set to true in the initialisation options.

When any of the experimental APIs is called by an application, a warning message like the following will be logged in the console:
```
** Experimental API WARNING **
* The application is making use of a safe-node-app experimental API *
The '<function name>' function is part of a set of experimental functions.
Any/all of them may be deprecated, removed, or very likely change in the future.
Also regular users won't have this APIs enabled by default unless the flag is provided, so be aware of all these limitations.
For more information, updates, or to submit ideas and suggestions, please visit https://github.com/maidsafe/safe_app_nodejs
```

## Further Help

You can discuss development-related questions on the [SAFE Dev Forum](https://forum.safedev.org/).
If you are just starting to develop an application for the SAFE Network, it's very advisable to visit the [SAFE Network Dev Hub](https://hub.safedev.org) where you will find a lot of relevant information, including a [tutorial to create an example SAFE desktop application](https://hub.safedev.org/platform/nodejs) which makes use of this package.

## License

This SAFE Network library is dual-licensed under the Modified BSD ([LICENSE-BSD](LICENSE-BSD) https://opensource.org/licenses/BSD-3-Clause) or the MIT license ([LICENSE-MIT](LICENSE-MIT) https://opensource.org/licenses/MIT) at your option.

## Contribution

Copyrights in the SAFE Network are retained by their contributors. No copyright assignment is required to contribute to this project.
