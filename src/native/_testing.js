// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms.
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const ref = require('ref-napi');
const { types: t, helpers: h } = require("./_base");
const { types } = require('./_auth');

module.exports = {
  functions: {
    test_create_app: [t.Void, ['string', 'pointer', 'pointer']],
    test_create_app_with_access: [t.Void, [ref.refType(types.AuthReq), 'pointer', 'pointer']],
    test_simulate_network_disconnect: [t.Void, [t.AppPtr, 'pointer', 'pointer']]
  },
  api: {
    test_create_app: h.Promisified(null, t.AppPtr),
    test_create_app_with_access: h.Promisified(null, t.AppPtr),
    test_simulate_network_disconnect: h.Promisified(null, []),
  }
}
