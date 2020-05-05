const ttl_write = require('@graphy/content.ttl.write');
const progress = require('progress');
const csv = require('csv-parser');
const nth = require('nth');
const arrayifyStream = require('arrayify-stream');

const {
	prefixes: H_PREFIXES,
	person_c1,
} = require('../common/share.js');

const A_SPIN = ['◜ ◝', ' ˉ◞', ' ˍ◝', '◟ ◞', '◜ˍ ', '◟ˉ '];
const F_SORT_PAPER_INDEX = (sc1_a, sc1_b) => +(/(\d+)$/.exec(sc1_a)[1]) - +(/(\d+)$/.exec(sc1_b)[1]);

const trackLabels = {
	'wsandtut': 'Workshops and Tutorials',
	'In-Use Track': 'In-Use',
	'Social and Human': 'Social and Human Aspects of the Semantic Web',
	'NLP and IR': 'Natural Language Processing and Information Retrieval',
	'SDM and DI': 'Semantic Data Management and Data Infrastructures',
	'Security, Privacy, Licensing and Trust': 'Security, Privacy, Licensing and Trust',
	'Knowledge Graphs': 'Knowledge Graphs',
	'Science of Science': 'Science of Science',
	'Ontologies and Reasoning': 'Ontologies and Reasoning',
	'Resources Track': 'Resources',
	'Machine Learning': 'Machine Learning',
	'Integration, Services and APIs': 'Integration, Services and APIs',
	'Distribution and Decentralization': 'Distribution and Decentralization',
	'eswc2020': 'ESWC 2020',
	'phdsym': 'PhD Symosium',
	'postersdemos': 'Posters and Demos',
	'industry': 'Industry',
};

(async() => {
	const tracks = {};
	let submissions = await arrayifyStream(process.stdin.pipe(csv({ separator: ';' })));

	// mk progress bar
	let k_bar = new progress('[:bar] :percent :spin +:elapseds; -:etas; :paper', {
		incomplete: ' ',
		complete: '∎', // 'Ξ',
		width: 40,
		total: submissions.length,
	});

	let a_proceedings = [];

	let ds_out = ttl_write({
		prefixes: H_PREFIXES,
	});

	ds_out.pipe(process.stdout);

	let b_seen = false;
	let i_spin = 0;
	let n_spin = A_SPIN.length;

	for(let submission of submissions) {
		{
			k_bar.tick(1, {
				paper: submissions,
				spin: A_SPIN[i_spin++],
			});
			i_spin %= n_spin;
			b_seen = true;
		}

		{
			k_bar.tick(0, {
				paper: submissions.Title,
				spin: A_SPIN[i_spin++],
			});
			i_spin %= n_spin;
		}

		let s_paper_id = submission['#'];
		let sc1_paper = `eswc2020-submissions:Paper.${s_paper_id}`;

		let a_author_items = submission.Authors.split(', ')
			.map((s_full_name, id) => {
				let sc1_person = person_c1(s_full_name);
				let sc1_author = `eswc2020-submissions:Author.${s_paper_id}.${id+1}`;

				return {
					c1: sc1_author,
					c3: {
						[sc1_person]: {
							a: 'conference:Person',
							'rdfs:label': '"'+s_full_name,
							'conference:name': '"'+s_full_name,
							'conference:holdsRole': sc1_author,
						},
						[sc1_author]: {
							a: 'conference:RoleDuringEvent',
							'rdfs:label': `@en"${s_full_name}, ${nth.appendSuffix(id+1)} Author for Proceedings Paper ${s_paper_id}`,
							'conference:isHeldBy': sc1_person,
							'conference:withRole': 'conference:PublishingRole',
						},
					},
				};
			});

		a_proceedings.push(sc1_paper);
		ds_out.write({
			type: 'c3',
			value: {
				[sc1_paper]: {
					a: ['eswc2020:SubmissionsPaper', 'conference:InProceedings'], //['eswc2020:ProceedingsPaper', 'conference:InProceedings'],
					'rdfs:label': '@en"'+submission.Title,
					'conference:title': '@en"'+submission.Title,
					'conference:isPartOf': 'eswc2020:Proceedings',
					//'eswc2020:pdf': `^xsd:anyUri"${H_PREFIXES['eswc2020-object']}${si_paper}.pdf`,
					'dct:issued': new Date(submission.Time),
					'eswc2020:authorList': [a_author_items.map(g => g.c1)],
					'eswc2020:submission': `eswc2020-submissions:Paper.${s_paper_id}`,
					'eswc2020:track': makeTrack(submission.Track),
				},

				...a_author_items.reduce((g_out, g_item) => ({
					...g_out,
					...g_item.c3,
				}), {}),
			},
		});
	}

	ds_out.write({
		type: 'c3',
		value: {
			'eswc2020:Conference': {
				'eswc2020:submissions': [a_proceedings.sort(F_SORT_PAPER_INDEX)],
			},
		},
	});

	k_bar.tick(1, {
		paper: '',
		spin: ' ✓ ',
	});

	function makeTrack(trackName) {
		const trackId = `eswc2020-submissions:Track.${trackName}`;
		if (!tracks[trackId]) {
			tracks[trackId] = true;
			if (!trackLabels[trackName]) {
				throw new Error('Could not find a track label for ' + trackName);
			}
			ds_out.write({
				type: 'c3',
				value: {
					[trackId]: {
						a: ['eswc2020:Track'],
						'rdfs:label': '@en"'+trackLabels[trackName]
					},
				},
			});
		}
		return trackId;
	}
})();
