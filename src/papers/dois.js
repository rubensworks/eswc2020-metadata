const ttl_read = require('@graphy/content.ttl.read');
const ttl_write = require('@graphy/content.ttl.write');

const {
	prefixes: H_PREFIXES,
} = require('../common/share.js');

let a_dois = require('./dois.json');
let h_dois = a_dois.reduce((h_out, [s_doi, s_title]) => ({
	...h_out,
	[s_title]: s_doi,
}), {});

let ds_out = ttl_write({
	prefixes: H_PREFIXES,
});

ds_out.pipe(process.stdout);

process.stdin.pipe(ttl_read({
	data(g_quad) {
		if(`${H_PREFIXES.conference}title` === g_quad.predicate.value) {
			let s_title = g_quad.object.value;

			if(h_dois[s_title]) {
				ds_out.write({
					type: 'c3',
					value: {
						[g_quad.subject]: {
							'eswc2020:doi': '^eswc2020-datatype:doi"'+h_dois[s_title],
						},
					},
				});
			}
		}
	},

	eof() {
		ds_out.end();
	},
}));

