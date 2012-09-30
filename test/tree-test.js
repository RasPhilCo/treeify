var treeify = require('../treeify'),
	vows = require('vows'),
	assert = require('assert'),
	events = require('events');

// - helper functions -----------------

function treeifyByLine(obj) {
	return function(showValues) {
		var emitter = new events.EventEmitter(),
			 lineNum = 0;
		treeify.asLines(obj, showValues, function(line) {
			emitter.emit('success', line);
			emitter.emit('line ' + (++lineNum), line);
		});
		return emitter;
	};	
}

function treeifyEntirely(obj) {
	return function(showValues) {
		return treeify.asTree(obj, showValues);
	};
}

function withValuesShown(showValues) {
	return function(func){ return func(showValues) };
}

function is(content, arrayIndex) {
	return function(lines) {
		var toCheck = lines;
		if (arrayIndex !== undefined) {
			toCheck = lines[arrayIndex];
		}
		assert.strictEqual(toCheck, content, 'should be "' + content + '" but was "' + toCheck + '"');
	};
}

function checkLines(/* ... */) {
	var ret = {}, entry;
	for (var line = 1; line <= arguments.length; line++) {
		if ( ! arguments[line - 1])
			continue;
		entry = {};
		entry['branches correctly on line '+line] = is(arguments[line - 1]);
		ret['line '+line] = entry;
	}
	return ret;
}

// - the beautiful test suite ---------

vows.describe('tree-test').addBatch({
	
	'A tree created from an empty object': {
		topic: {},
		
		'when returned as a whole tree': {
			topic: treeifyEntirely,

			'with values hidden': {
				topic: withValuesShown(false),
				'is an empty string': is('')
			},
			'with values shown': {
				topic: withValuesShown(true),
				'is an empty string': is('')
			}
		}
	},

	'A tree created from a single-level object': {
		topic: { 
			apples: 'gala',      //  ├─ apples: gala
			oranges: 'mandarin'  //  └─ oranges: mandarin
		},

		'when returned line-by-line': {
			topic: treeifyByLine,

			'with values hidden': {
				topic: withValuesShown(false),
				
				'is two lines long': function(err, line) {
					this.expect(2);
				},
				on: checkLines('├─ apples', 
									'└─ oranges')
			},
			'with values shown': {
				topic: withValuesShown(true),
				
				'is two lines long': function(err, line) {
					this.expect(2);
				},
				on: checkLines('├─ apples: gala', 
									'└─ oranges: mandarin')
			}
		},

		'when returned as a whole tree': {
			topic: treeifyEntirely,

			'with values hidden': {
				topic: withValuesShown(false),

				'is not empty': function(tree) {
					assert.notEqual(tree, '', 'should not be empty');
				},
				'contains 2 line breaks': function(tree) {
					assert.strictEqual(tree.match(/\n/g).length, 2, 'should contain 2 x \n');
				},
				'(split into an array of lines)': {
					topic: function(tree) { return tree.split(/\n/g) },
					'has a correct first line':  is('├─ apples', 0),
					'has a correct second line': is('└─ oranges', 1),
					'has nothing at the end':    is('', 2)
				}
			},
			'with values shown': {
				topic: withValuesShown(true),

				'is not empty': function(tree) {
					assert.notEqual(tree, '', 'should not be empty');
				},
				'contains 2 line breaks': function(tree) {
					assert.strictEqual(tree.match(/\n/g).length, 2, 'should contain 2 x \n');
				},
				'(split into an array of lines)': {
					topic: function(tree) { return tree.split(/\n/g) },
					'has a correct first line':  is('├─ apples: gala', 0),
					'has a correct second line': is('└─ oranges: mandarin', 1),
					'has nothing at the end':    is('', 2)
				}
			}
		}
	},

	'A tree created from a multi-level object': {
		topic: { 
			oranges: {                  //  ├─ oranges
				'mandarin': {            //  │  └─ mandarin
					clementine: null,     //  │     ├─ clementine
					tangerine:            //  │     └─ tangerine
						'so cheap and juicy!'
				}
			},
			apples: {                   //  └─ apples
				'gala': null,            //     ├─ gala
				'pink lady': null        //     └─ pink lady
			} 
		},

		'when returned line-by-line': {
			topic: treeifyByLine,

			'with values hidden': {
				topic: withValuesShown(false),
				
				'is seven lines long': function(err, line) {
					this.expect(7);
				},
				on: checkLines('├─ oranges', 
									'│  └─ mandarin',
									'│     ├─ clementine',
									'│     └─ tangerine',
									'└─ apples',
									'   ├─ gala',
									'   └─ pink lady')
			},
			'with values shown': {
				topic: withValuesShown(true),
				on: checkLines(null, null, null,
									'│     └─ tangerine: so cheap and juicy!')
			}
		},

		'when returned as a whole tree': {
			topic: treeifyEntirely,

			'with values shown': {
				topic: withValuesShown(true),

				'(split into an array of lines)': {
					topic: function(tree) { return tree.split(/\n/g) },
					'has a correct first line': is('├─ oranges', 0),
					'has a correct third line': is('│     └─ tangerine: so cheap and juicy!', 3),
					'has nothing at the end':   is('', 7)
				}
			}
		}
	},

	'A tree created from an object with not so circular references': {
		topic: function() {
			var obj = { one: 'one', two: { four: 'four' } };
			obj['three'] = obj.two;
			return obj;
		},

		'when returned line-by-line': {
			topic: treeifyByLine,

			'with values shown': {
				topic: withValuesShown(true),
				on: checkLines('├─ one: one',
									'├─ two',
									'│  └─ four: four',
									'└─ three',
									'   └─ four: four')
			}
		}
	},

	'A tree created from an object with circular references': {
		topic: function() {
			var obj = { one: 'one', two: 'two' };
			obj['three'] = obj;
			return obj;
		},

		'when returned line-by-line': {
			topic: treeifyByLine,

			'with values shown': {
				topic: withValuesShown(true),
				on: checkLines('├─ one: one',
									'├─ two: two',
									'└─ three (circular ref.)')
			}
		}
	},

	'A tree created from an object containing various types': {
		topic: {
			array: [ 'one', 'two' ],
			numeric: 42,
			decimal: 42.24,
			bool: false,
			nil: null,
			undef: undefined
		},

		'when returned line-by-line': {
			topic: treeifyByLine,

			'with values shown': {
				topic: withValuesShown(true),
				on: checkLines('├─ array',
									'│  ├─ 0: one',
									'│  └─ 1: two',
									'├─ numeric: 42',
									'├─ decimal: 42.24',
									'├─ bool: false',
									'├─ nil',
									'└─ undef: undefined')
			}
		}
	}

}).export(module);
