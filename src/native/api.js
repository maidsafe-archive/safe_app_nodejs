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


const { useMockByDefault } = require('../helpers');

module.exports = [
  require('./_base'),
  require('./_crypto'),
  require('./_app'),
  require('./_auth'),
  require('./_cipher_opt'),
  require('./_immutable'),
  require('./_mutable'),
  require('./_nfs'),
  require('./_logging'),
  useMockByDefault ? require("./_testing") : {} // we have some testing helpers
];
