# safe_app_nodejs

**Maintainer:** Krishna Kumar (krishna.kumar@maidsafe.net)

safe_app Node.js library.

|Linux/OS X|Windows|
|:---:|:--------:|
|[![Build Status](https://travis-ci.org/maidsafe/safe_app_nodejs.svg?branch=master)](https://travis-ci.org/maidsafe/safe_app_nodejs)|[![Build status](https://ci.appveyor.com/api/projects/status/efktyecwydxrhs5d/branch/master?svg=true)](https://ci.appveyor.com/project/MaidSafe-QA/safe-app-nodejs/branch/master)|

|Coverage status|
|:-----------:|
|[![Coverage Status](https://coveralls.io/repos/github/maidsafe/safe_app_nodejs/badge.svg)](https://coveralls.io/github/maidsafe/safe_app_nodejs)|

## Documentation

The documentation for the safe_app Node.js API is available at http://docs.maidsafe.net/safe_app_nodejs/.

## External Libraries

The external libraries will automatically be downloaded when you run `npm install`.

If you are working on a development environment, you can run `NODE_ENV=dev npm install` instead in order to get the `safe_client` libraries which use the `MockVault` file rather than connecting to the SAFE Network.

## Testing

You may possibly be compiling your own [safe_app](https://github.com/maidsafe/safe_client_libs/tree/master/safe_app) library for testing purposes.

If you are using safe_app_nodejs in development, `NODE_ENV=dev`, it will import extra ffi function for testing. In this case, when compiling `safe_app` in `safe_client_libs` be sure to to include `testing` in your build features, i.e. `cargo build --release --features "use-mock-routing testing"`

# License

Licensed under either of

* the MaidSafe.net Commercial License, version 1.0 or later ([LICENSE](LICENSE))
* the General Public License (GPL), version 3 ([COPYING](COPYING) or http://www.gnu.org/licenses/gpl-3.0.en.html)

at your option.

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the
work by you, as defined in the MaidSafe Contributor Agreement, version 1.1 ([CONTRIBUTOR]
(CONTRIBUTOR)), shall be dual licensed as above, and you agree to be bound by the terms of the
MaidSafe Contributor Agreement, version 1.1.
