# Getting started

```bash
git clone https://github.com/maidsafe/safe_app_nodejs.git
```
```bash
cd safe_app_nodejs
```
```bash
yarn
```
```javascript
const safe = require('@maidsafe/safe-node-app');
const appInfo = {
    id     : 'net.maidsafe.example',
    name   : 'Example SAFE app',
    vendor : 'MaidSafe.net Ltd'
};
const asyncFn = async () => {
    const app = await safe.{@link initialiseApp}(appInfo);
};
```

**Recommended to build [basic Electron app](https://github.com/maidsafe/safe_examples/tree/master/safe_app_electron_quick_start), while referencing this documentation.**

Our web API exposed in [SAFE Browser](https://github.com/maidsafe/safe_browser), nearly identical to this library with just one variation, is an easy way to start exploring operations.
Recommended to either follow the [web API tutorial](https://github.com/maidsafe/safe_examples/tree/master/safe_web_app_quick_start) or to explore with our [web API playground](https://github.com/maidsafe/safe_examples/tree/master/safe_web_api_playground).
