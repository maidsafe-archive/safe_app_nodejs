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


const makeError = (code, name) => {
  function E(message) {
    if (!Error.captureStackTrace) {
      this.stack = (new Error()).stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
    this.message = message || name;
  }
  E.prototype = new Error();
  E.prototype.name = name;
  E.prototype.code = code;
  E.prototype.constructor = E;
  return E;
}

module.exports = (code, msg) => {
  let cls = makeError(code, code);
  return new cls(msg);
}
