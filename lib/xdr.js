// Lots of code from http://jsfromhell.com/classes/binary-parser
//    Jonas Raoni Soares Silva
//    http://jsfromhell.com/classes/binary-parser [v1.0]


var END_OF_SEQUENCE = '\xa5\x00\x00\x00';
var START_OF_SEQUENCE = '\x5a\x00\x00\x00';


function dapUnpacker(xdrdata, dapvar) {
    this._buf = xdrdata;
    this.dapvar = dapvar;

    this._pos = 0;

    this.getValue = function() {
        var i = this._pos;
        var type = this.dapvar.type.toLowerCase();

        if (type == 'structure' || type == 'dataset') {
            var out = [], tmp;
            dapvar = this.dapvar;
            for (child in dapvar) {
                if (dapvar[child].type) {
                    this.dapvar = dapvar[child];
                    tmp = this.getValue();
                    out.push(tmp);
                }
            }
            this.dapvar = dapvar;
            return out;

        } else if (type == 'grid') {
            var out = [], tmp;
            dapvar = this.dapvar;

            this.dapvar = dapvar.array;
            tmp = this.getValue();
            out.push(tmp);

            for (map in dapvar.maps) {
                this.dapvar = dapvar.maps[map];
                tmp = this.getValue();
                out.push(tmp);
            }

            this.dapvar = dapvar;
            return out;

        } else if (type == 'sequence') {
            var mark = this._unpack_uint32();
            var out = [], struct, tmp;
            dapvar = this.dapvar;
            while (mark != 2768240640) {
                struct = [];
                for (child in dapvar) {
                    if (dapvar[child].type) {
                        this.dapvar = dapvar[child];
                        tmp = this.getValue();
                        struct.push(tmp);
                    }
                }
                out.push(struct);
                mark = this._unpack_uint32();
            }
            this.dapvar = dapvar;
            return out;
        // This is a request for a base type variable inside a
        // sequence.
        } else if (this._buf.getUint32(i, false) == START_OF_SEQUENCE) {
            var mark = this._unpack_uint32();
            var out = [], tmp;
            while (mark != 2768240640) {
                tmp = this.getValue();
                out.push(tmp);
                mark = this._unpack_uint32();
            }
            return out;
        }

        var n = 1;
        if (this.dapvar.shape.length) {
            n = this._unpack_uint32();
            if (type != 'url' && type != 'string') {
                this._unpack_uint32();
            }
        }

        // Bytes?
        var out;
        if (type == 'byte') {
            out = this._unpack_bytes(n);
        // String?
        } else if (type == 'url' || type == 'string') {
            out = this._unpack_string(n);
        } else {
          var func
          switch (type) {
            case 'float32':
              func = '_unpack_float32'
              out = new Float32Array(n)
              break
            case 'float64':
              func = '_unpack_float64'
              out = new Float64Array(n)
              break
            case 'int':
            case 'int32':
              func = '_unpack_int32'
              out = new Int32Array(n)
              break
            case 'uint':
            case 'uint32':
              func = '_unpack_uint32'
              out = new Uint32Array(n)
              break
            case 'int16':
              func = '_unpack_int16'
              out = new Int16Array(n)
              break
            case 'uint16':
              func = '_unpack_uint16'
              out = new Uint16Array(n)
              break
          }
          for (let i = 0; i < n; i++) {
            out[i] = this[func]()
          }
        }

        if (this.dapvar.shape) {
          out = reshape(out, this.dapvar.shape)
        } else {
          out = out[0]
        }

        return out
    };

    this._unpack_byte = function() {
        var bytes = 1;
        var signed = false;

        var i = this._pos;
        this._pos = i+bytes;
        return this._buf.getUint8(i, false);
    };

    this._unpack_uint16 = function() {
        var bytes = 4;
        var signed = false;

        var i = this._pos;
        this._pos = i+bytes;
        return this._buf.getUint16(i, false);
    };

    this._unpack_uint32 = function() {
        var bytes = 4;
        var signed = false;

        var i = this._pos;
        this._pos = i+bytes;
        return this._buf.getUint32(i, false);
    };

    this._unpack_int16 = function() {
        var bytes = 4;
        var signed = true;

        var i = this._pos;
        this._pos = i+bytes;
        return this._buf.getInt16(i, false);
    };

    this._unpack_int32 = function() {
        var bytes = 4;
        var signed = true;

        var i = this._pos;
        this._pos = i+bytes;
        return this._buf.getInt32(i, false);
    };

    this._unpack_float32 = function() {
        var precision = 23;
        var exponent = 8;
        var bytes = 4;

        var i = this._pos;
        this._pos = i+bytes;
        return this._buf.getFloat32(i, false);
    };

    this._unpack_float64 = function() {
        var precision = 52;
        var exponent = 11;
        var bytes = 8;

        var i = this._pos;
        this._pos = i+bytes;
        return this._buf.getFloat64(i, false)
    };

    this._unpack_bytes = function(count) {
        var i = this._pos;
        var out = [];
        for (var c=0; c<count; c++) {
            out.push(this._unpack_byte());
        }
        var padding = (4 - (count % 4)) % 4;
        this._pos = i + count + padding;

        return out;
    };

    this._unpack_string = function(count) {
        var out = [];
        var n, i, j;
        for (var c=0; c<count; c++) {
            n = this._unpack_uint32();
            i = this._pos;
            data = this._unpack_bytes(n);

            padding = (4 - (n % 4)) % 4;
            this._pos = i + n + padding;

            // convert back to string
            var str = '';
            for (var i=0; i<n; i++) {
                str += String.fromCharCode(data[i]);
            }
            out.push(str);
        }

        return out;
    };
}

function reshape (array, shape) {
  if (shape.length === 1) {
    return array
  }
  const out = new Array(shape[0])
  for (var i = 0; i < shape[0]; i++) {
    const size = array.length / shape[0]
    const start = i * size
    const stop = start + size
    out[i] = reshape(array.subarray(start, stop), shape.slice(1))
  }
  return out
}

function getBuffer(data) {
    var b = new Array(data.length);
    for (var i=0; i<data.length; i++) {
        b[i] = data.charCodeAt(i) & 0xff;
    }
    return b;
}


exports.getBuffer = getBuffer;
exports.dapUnpacker = dapUnpacker;
