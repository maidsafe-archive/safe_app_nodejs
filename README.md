#safe-node-app

A nodejs API for the [SAFE Network](http://maidsafe.net).

A safe_app library for [Node.js](https://nodejs.org/).

**Maintainer:** Krishna Kumar (krishna.kumar@maidsafe.net)

|Linux/OS X|Windows|Coverage Status|
|:---:|:---:|:---:|
|[![Build Status](https://travis-ci.org/maidsafe/safe_app_nodejs.svg?branch=master)](https://travis-ci.org/maidsafe/safe_app_nodejs)|[![Build status](https://ci.appveyor.com/api/projects/status/efktyecwydxrhs5d/branch/master?svg=true)](https://ci.appveyor.com/project/MaidSafe-QA/safe-app-nodejs/branch/master)|[![Coverage Status](https://coveralls.io/repos/github/maidsafe/safe_app_nodejs/badge.svg)](https://coveralls.io/github/maidsafe/safe_app_nodejs)|

## API Documentation

The documentation for the safe_app Node.js API is available at <http://docs.maidsafe.net/safe_app_nodejs/>.

## Development

1. Prerequisites

    * Node.js 6.5.0 (we recommend installing it via [nvm](https://github.com/creationix/nvm))
    * [Git](https://git-scm.com/)
    * [Yarn](https://yarnpkg.com) (as a replacement for `npm`).

2. Clone this GitHub repository:

    ```bash
    git clone https://github.com/maidsafe/safe_app_nodejs.git
    ```

3. Install the dependencies:

    ``` bash
    cd safe_app_nodejs
    yarn
    ```

    If you are working on a development environment, you can run `NODE_ENV=dev yarn` instead in order to get the `safe_client` libraries which use the `MockVault` file rather than connecting to the SAFE Network.

### Testing

To run the tests locally, make sure you installed the `safe_client` libraries with `NODE_ENV=dev yarn`, then you can run them by executing `yarn test`.

Note: If you are compiling your own [safe_app](https://github.com/maidsafe/safe_client_libs/tree/master/safe_app) library for testing purposes, and if you want to be able to run the tests, make sure to include `testing` in your build features when compiling `safe_app` in `safe_client_libs`, i.e. `cargo build --release --features "use-mock-routing testing"`.

## Further Help

You can discuss development-related questions on the [SAFE Dev Forum](https://forum.safedev.org/).
Here's a good post to get started: [How to develop for the SAFE Network](https://forum.safedev.org/t/how-to-develop-for-the-safe-network-draft/843).

## License

Licensed under either of

* the MaidSafe.net Commercial License, version 1.0 or later ([LICENSE](LICENSE))
* the General Public License (GPL), version 3 ([COPYING](COPYING) or http://www.gnu.org/licenses/gpl-3.0.en.html)

at your option.

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the
work by you, as defined in the MaidSafe Contributor Agreement, version 1.1 ([CONTRIBUTOR](CONTRIBUTOR)),
shall be dual licensed as above, and you agree to be bound by the terms of the
MaidSafe Contributor Agreement, version 1.1.
