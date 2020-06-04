const ttl_write = require('@graphy/content.ttl.write');
const progress = require('progress');
const csv = require('csv-parser');
const nth = require('nth');
const arrayifyStream = require('arrayify-stream');
const fs = require('fs');

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

const preprints = {
	'1': true,
	'17': true,
	'33': true,
	'49': true,
	'65': true,
	'81': true,
	'96': true,
	'112': true,
	'128': true,
	'144': true,
	'160': true,
	'176': true,
	'192': true,
	'208': true,
	'224': true,
	'240': true,
	'256': true,
	'272': true,
	'288': true,
	'304': true,
	'320': true,
	'336': true,
	'352': true,
	'368': true,
	'386': true,
	'402': true,
	'418': true,
	'434': true,
	'450': true,
	'467': true,
	'483': true,
	'499': true,
	'515': true,
	'531': true,
	'544': true,
	'560': true,
	'576': true,
	'592': true,
	'608': true,
}

// Keep an index of all accepted papers
const acceptedPapers = fs.readFileSync(process.argv[2], { encoding: 'utf8' })
	.split('\n')
	.map(line => line.substr(0, line.indexOf(',')));

// Load the reviews
const reviews = indexReviews(fs.readFileSync(process.argv[4], { encoding: 'utf8' }), fs.readFileSync(process.argv[3], { encoding: 'utf8' }));

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

	let a_submissions = [];
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

		let a_author_items = submission.Authors.replace(' and', ',').split(', ')
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
							'rdfs:label': `@en"${s_full_name}, ${nth.appendSuffix(id+1)} Author for Paper ${s_paper_id}`,
							'conference:isHeldBy': sc1_person,
							'conference:withRole': 'conference:PublishingRole',
						},
					},
				};
			});

		const accepted = acceptedPapers.indexOf(s_paper_id) >= 0;
		const hasPreprint = preprints[s_paper_id];
		a_submissions.push(sc1_paper);
		if (accepted) {
			a_proceedings.push(sc1_paper);
		}
		ds_out.write({
			type: 'c3',
			value: {
				[sc1_paper]: {
					a: accepted ? ['eswc2020:SubmissionsPaper', 'conference:InProceedings'] : ['eswc2020:SubmissionsPaper'],
					'rdfs:label': '@en"'+submission.Title,
					'conference:title': '@en"'+submission.Title,
					...accepted ? { 'conference:isPartOf': 'eswc2020:Proceedings' } : {},
					//'eswc2020:pdf': `^xsd:anyUri"${H_PREFIXES['eswc2020-object']}${si_paper}.pdf`,
					'dct:issued': new Date(submission.Time),
					...hasPreprint ? { 'eswc2020:preprint': '>https://preprints.2020.eswc-conferences.org/12123' + paperIdToString(s_paper_id) + '.pdf' } : {},
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

		let reviewId = 0;
		for (const review of reviews[s_paper_id] || []) {
			const reviewIri = sc1_paper + '_Review.' + reviewId++;
			const reviewAuthorIri = reviewIri + '_Reviewer';
			if (review.reviewer === 'Anonymous') {
				ds_out.write({
					type: 'c3',
					value: {
						[reviewAuthorIri]: {
							a: 'conference:RoleDuringEvent',
							'rdfs:label': `@en"Anonymous Reviewer for Paper ${s_paper_id}`,
							'conference:withRole': ['conference:ReviewerRole', 'eswc2020:AnonymousReviewerRole'],
						},
					},
				});
			} else {
				const reviewAuthorPersonIri = person_c1(review.reviewer);
				ds_out.write({
					type: 'c3',
					value: {
						[reviewAuthorPersonIri]: {
							a: 'conference:Person',
							'rdfs:label': '"'+review.reviewer,
							'foaf:mbox': '>mailto:' + review.email,
							'conference:name': '"'+review.reviewer,
							'conference:holdsRole': reviewAuthorIri,
						},
						[reviewAuthorIri]: {
							a: 'conference:RoleDuringEvent',
							'rdfs:label': `@en"${review.reviewer}, Reviewer for Paper ${s_paper_id}`,
							'conference:isHeldBy': reviewAuthorPersonIri,
							'conference:withRole': ['conference:ReviewerRole', 'eswc2020:NonAnonymousReviewerRole'],
						},
					},
				});
			}
			ds_out.write({
				type: 'c3',
				value: {
					[reviewIri]: {
						a: 'fr:ReviewVersion',
						'frbr:creator': reviewAuthorIri,
						'fr:hasRating': 'eswc2020:ReviewRating.' + review.score,
						'fr:hasReviewerConfidence': 'eswc2020:ReviewerConfidence.' + review.confidence,
						'cito:reviews': sc1_paper,
						'fr:issuedAt': '>https://easychair.org',
						'fr:issuedFor': 'eswc2020:Conference',
						'fr:releasedBy': 'eswc2020:Conference',
						'dct:issued': new Date(review.date),
						'c4o:hasContent': '"' + review.content + '"',
					},
				},
			});
			ds_out.write({
				type: 'c3',
				value: {
					[sc1_paper]: {
						'eswc2020:review': '>' + reviewIri,
					},
				},
			});
		}
	}

	ds_out.write({
		type: 'c3',
		value: {
			'eswc2020:Conference': {
				'eswc2020:submissions': [a_submissions.sort(F_SORT_PAPER_INDEX)],
				'eswc2020:proceedings': [a_proceedings.sort(F_SORT_PAPER_INDEX)],
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
			ds_out.write({
				type: 'c3',
				value: {
					'eswc2020:Conference': {
						'eswc2020:tracksInclude': trackId,
					},
				},
			});
		}
		return trackId;
	}
})();

function indexReviews(reviewsRaw, reviewersRaw) {
	const index = {};

	for (const reviewsPaper of reviewsRaw.split('________________')) {
		let reviews = reviewsPaper.split(/------------------------------------------------------- Review [0-9]* -------------------------------------------------------/);
		const paperId = reviews[0].match(/\[([0-9]*)\]/)[1];
		reviews.splice(0, 1);

		index[paperId] = [];
		for (const review of reviews) {
			const reviewer = review.match(/PC member: *([^\n\r]*)/)[1].trim();
			const date = review.match(/Time: *([^\n\r]*)/)[1];
			const score = review.match(/Overall evaluation: *([0-9]*)/)[1];
			const confidence = review.match(/Reviewer's confidence: *([0-9]*)/)[1];
			const content = review.trimLeft().split('\n')[3].trimRight();
			let email;

			if (reviewer !== 'Anonymous') {
				const reviewerIndex = reviewersRaw.indexOf(reviewer);
				if (reviewerIndex < 0) {
					throw new Error('Could not find the email of a reviewer in reviewers.csv: ' + reviewer);
				}
				const reviewerPos = reviewerIndex + reviewer.length + 1;
				email = reviewersRaw.substr(reviewerPos, reviewersRaw.indexOf(',', reviewerPos + 1) - reviewerPos);
			}

			index[paperId].push({
				reviewer,
				email,
				date,
				score,
				confidence,
				content,
			});
		}
	}

	return index;
}

function paperIdToString(id) {
	return `${id}`.padStart(4, '0');
}
