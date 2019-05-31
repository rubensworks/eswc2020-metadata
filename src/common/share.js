const prefixes = require('./prefixes');

const org_suffix = s_org => s_org.replace(/ /g, '_').replace(/,/g, '.');
const person_suffix = s_full_name => s_full_name.replace(/ /g, '_');

const person_c1 = s_full_name => `eswc2019-persons:${person_suffix(s_full_name)}`;

module.exports = {
	org_suffix,
	person_suffix,
	person_c1,
	prefixes,
};
