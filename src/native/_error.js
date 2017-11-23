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
