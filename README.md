# safe_app_nodejs

**Maintainer:** Krishna Kumar (krishna.kumar@maidsafe.net)

safe_app nodejs library.

|Linux/OS X|Windows|
|:---:|:--------:|
|[![Build Status](https://travis-ci.org/maidsafe/safe-app-nodejs.svg?branch=master)](https://travis-ci.org/maidsafe/safe-app-nodejs)|[![Build status](https://ci.appveyor.com/api/projects/status/efktyecwydxrhs5d/branch/master?svg=true)](https://ci.appveyor.com/project/MaidSafe-QA/safe-app-nodejs/branch/master)|

# Development

To build and use this module locally you need latest stable [NodeJS](https://nodejs.org/en/) (& npm) and [Rust](https://www.rust-lang.org/en-US/) (we recommend [rustup](https://rustup.rs/)). 
[See here for more information about the version of rust we use.](https://github.com/maidsafe/QA/blob/master/Documentation/Rust%20Style.md#rust-version).


Initially after pulling the code ensure that you have the git submodules setup: `git submodule update --init` when you pull initially (`git submodule update` when you pull updates thereafter). 

The binary library will then automatically build when you do an `npm install`, and place them in `src/native` accordingly. It will also ensure you have the latest `debug`-build  with `use-mock-routing` enabled whenever you run `npm test`.

If you want to build the release version just run `npm run build-release`.


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
