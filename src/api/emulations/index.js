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


const NFS = require('./nfs');
const RDF = require('./rdf');
const WEBID = require('./web_id');

/**
* Emulations are abstraction helpers on top of MData
* @typedef {NFS} Emulation
* @typedef {RDF} Emulation
* @typedef {WebID} Emulation
*/

module.exports = {
  NFS,
  RDF,
  WEBID
};
