const {
	person_c1,
	person_suffix,
	org_suffix,
} = require('./share.js');

const info = (s_ppl) => {
	let a_ppl = s_ppl.trim().replace(/\.\s*$/, '').split(/\s*\|\s*/g);

	// let a_last = a_ppl.pop().split(/(^|\s+)and\s+/);

	// a_ppl.push(...a_last);

	let a_persons = [];

	for(let s_person of a_ppl) {
		let m_person = /^\s*(?:\*([^([@<]*?)\*|([^([@<]*?))\s*(?:<([^>]*?)>)?\s*(?:\[([^\]]*?)\])?\s*$/.exec(s_person);
		if(!m_person) {
			throw new Error(`failed to parse person from "${s_person}"`);
		}

		let [, s_presenter, s_name, p_uri, s_affiliations] = m_person;

		let g_person = {
			presenter: false,
		};

		if(s_presenter) {
			g_person.presenter = true;
			s_name = s_presenter;
		}

		g_person.name = s_name;

		// same as uri
		if(p_uri) g_person.uri = p_uri;

		let a_names = s_name.split(/\s+/g);
		if(a_names.length < 2) {
			throw new Error(`invalid name "${s_name}"`);
		}
		// simple
		else if(2 === a_names.length) {
			[g_person.first, g_person.last] = a_names;
		}
		// middle initial
		else if(/^.\.$/.test(a_names[1])) {
			g_person.first = a_names[0]+' '+a_names[1];
			g_person.last = a_names.slice(2).join(' ');
		}
		// last-name prefix
		else if(/^(d[eiu])$/i.test(a_names[1])) {
			g_person.first = a_names[0];
			g_person.last = a_names.slice(2).join(' ');
		}
		// inherit to first name
		else {
			g_person.first = a_names[0]+' '+a_names[1];
			g_person.last = a_names.slice(2).join(' ');
		}

		// affiliation
		if(s_affiliations && s_affiliations.length) {
			let a_affiliations = s_affiliations.split(/,\s+and\s+/g);

			if(a_affiliations.length) g_person.affiliations = a_affiliations;
		}

		a_persons.push(g_person);
	}

	return a_persons;
};

module.exports = {
	info,

	* within(s_ppl) {
		for(let g_person of info(s_ppl)) {
			yield person_c1(g_person.name);
		}
	},

	c3(s_ppl, hc2_extend={}) {
		let hc3_persons = {};

		for(let g_person of info(s_ppl)) {
			hc3_persons[person_c1(g_person.name)] = {
				a: 'conference:Person',
				'rdfs:label': '"'+g_person.name,
				'conference:name': '"'+g_person.name,
				'conference:givenName': '"'+g_person.first,
				'conference:familyName': '"'+g_person.last,
				...(g_person.uri
					? {'owl:sameAs':'>'+g_person.uri}
					: {}),
				...hc2_extend,
				...(g_person.affiliations
					? {
						'conference:hasAffiliation': g_person.affiliations
							.map(s => `eswc2019-affiliations:${person_suffix(g_person.name)}.${org_suffix(s)}`),
					}
					: {}),
			};

			if(g_person.affiliations) {
				for(let s_affiliation of g_person.affiliations) {
					let sc1_affiliation = `eswc2019-affiliations:${person_suffix(g_person.name)}.${org_suffix(s_affiliation)}`;
					let sc1_organization = `eswc2019-organizations:${org_suffix(s_affiliation)}`;
					let sc1_site = `eswc2019-sites:${org_suffix(s_affiliation)}`;
					let s_site = s_affiliation.split(/\s*,\s+/g).slice(0, -1);

					Object.assign(hc3_persons, {
						[sc1_affiliation]: {
							a: 'conference:AffiliationDuringEvent',
							'rdfs:label': `@en"${g_person.name}'${g_person.name.endsWith('s')? '': 's'} Affiliation with ${s_affiliation}`,
							'conference:isAffiliationOf': person_c1(g_person.name),
							'conference:withOrganisation': sc1_organization,
						},

						[sc1_organization]: {
							a: 'conference:Organisation',
							'rdfs:label': `@en"${s_affiliation}`,
							'conference:hasSite': sc1_site,
						},

						[sc1_site]: {
							a: 'conference:Site',
							'rdfs:label': `@en"${s_site}`,
							'conference:description': `@en"${s_site}`,
							...(s_affiliation.includes(', ')
								? {'conference:address':`@en"${s_affiliation.split(/\s*,\s+/g).slice(-1)}`}
								: {}),
						},
					});
				}
			}
		}

		return hc3_persons;
	},
};
