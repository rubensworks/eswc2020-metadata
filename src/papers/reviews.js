const url = require('url');

const he = require('he');
const nth = require('nth');
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const ttl_write = require('@graphy/content.ttl.write');
const progress = require('progress');

const {
	prefixes: H_PREFIXES,
	org_suffix,
	person_suffix,
	person_c1,
} = require('../common/share.js');

const a_tracks = require('./submissions-tracks.json');
const s_cookie = process.env.ESWC_EASYCHAIR_COOKIE || process.argv[2];

let p_conferences = 'https://easychair.org/conferences/';

const A_SPIN = ['◜ ◝', ' ˉ◞', ' ˍ◝', '◟ ◞', '◜ˍ ', '◟ˉ '];
const F_SORT_PAPER_INDEX = (sc1_a, sc1_b) => +(/(\d+)$/.exec(sc1_a)[1]) - +(/(\d+)$/.exec(sc1_b)[1]);

const texts = a_keys => a_keys.reduce((h_out, s_key) => ({
	...h_out,
	[s_key]: q => ({[s_key.replace(/ /g, '_')]:q.text()}),
}), {});

const dates = a_keys => a_keys.reduce((h_out, s_key) => ({
	...h_out,
	[s_key]: q => ({[s_key.replace(/ /g, '_')]:q.text().split(/, /).join(' 2019, ')}),
}), {});

const extract_table = ($_doc, a_rows, h_cleaner) => {
	let h_out = {};

	for(let d_row of a_rows) {
		let [q_key, q_value] = $_doc(d_row).find('td').toArray().map(d => $_doc(d));

		let s_key = q_key.text().trim().toLowerCase().replace(/\s*:\s*$/, '');
		if(s_key in h_cleaner) {
			h_out = {
				...h_out,
				...h_cleaner[s_key](q_value),
			};
		}
	}

	return h_out;
};

const h_submission_cleaner = {
	...texts([
		'title',
		'track',
		'abstract',
		'decision',
	]),
	...dates([
		'submitted',
		'last update',
	]),
};

const h_review_cleaner = {
	'pc member': q => ({reviewer:q.text()}),
	time: q => ({time:q.text().split(/, /).join(' 2019, ')}),
	'open and transparent review policy': q => ({transparent:'✔' === q.text()}),
	'reviewer\'s confidence': q => ({confidence:q.find('b').text()}),
	'overall evaluation': q => ({
		rating: q.find('div').eq(0).find('b').text(),
		content: q.find('div').eq(0).remove() && he.decode(q.html().replace(/<br>/g, '\n')),
	}),
};

const h_rebuttal_cleaner = {
	...texts([
		'response',
	]),
	...dates([
		'time',
	]),
};

(async() => {
	let a_submissions = [];
	let a_papers = [];
	let hm_tracks = new Map();

	// mk track progress bar
	let k_bar_track = new progress('[:bar] :percent :spin +:elapseds; -:etas; :track', {
		incomplete: ' ',
		complete: '∎', // 'Ξ',
		width: 40,
		total: a_tracks.length,
	});

	k_bar_track.tick(0, {
		track: '...',
	});

	for(let si_track of a_tracks) {
		let du_track = new url.URL(`submissions?a=${si_track}`, p_conferences);

		let $_track =await rp({
			url: du_track,
			headers: {
				cookie: s_cookie,
			},
			transform: s => cheerio.load(s),
		});

		a_papers.push(...$_track('tr.green').map((i, d) => $_track(d).children().eq(3).children().eq(0).attr('href')).toArray());

		k_bar_track.tick(1, {
			track: si_track,
		});
	}

	k_bar_track.tick(1, {
		track: '',
	});

	// mk progress bar
	let k_bar = new progress('[:bar] :percent :spin +:elapseds; -:etas; :paper', {
		incomplete: ' ',
		complete: '∎', // 'Ξ',
		width: 40,
		total: a_papers.length,
	});

	let ds_out = ttl_write({
		prefixes: H_PREFIXES,
	});

	ds_out.pipe(process.stdout);

	let as_persons = new Set();

	let b_seen = false;
	let i_spin = 0;
	let n_spin = A_SPIN.length;

	for(let p_paper of a_papers) {
		{
			k_bar.tick(b_seen? 1: 0, {
				paper: '...',
				spin: A_SPIN[i_spin++],
			});
			i_spin %= n_spin;
			b_seen = true;
		}

		let du_submission = new url.URL(p_paper, p_conferences);
		let $_submission = await rp({
			url: du_submission,
			headers: {
				accept: 'text/html',
				cookie: s_cookie,
			},
			transform: s => cheerio.load(s),
		});

		let s_track = $_submission('tr#row9>td.value').text();
		let s_submitted = $_submission('tr#row21>td.value').text();
		let s_decision = $_submission('tr#row27>td.value').text();
		let p_reviews = $_submission(
			$_submission('#rmenu>a').toArray()
				.filter(d => 'show reviews' === $_submission(d).text().trim().toLowerCase())[0])
			.attr('href');

		let $_reviews = await rp({
			url: new url.URL(p_reviews, du_submission),
			headers: {
				accept: 'text/html',
				cookie: s_cookie,
			},
			transform: s => cheerio.load(s),
		});

		let si_submission = $_reviews('.pagetitle').text().replace(/^.*?(\d+)$/, '$1');
		let s_paper_id = si_submission;

		let sc1_submission = `eswc2019-submissions:Paper.${si_submission}`;
		a_submissions.push(sc1_submission);

		// let s_decision = $_reviews('.ct_table').eq(0).find('tr:last-child>td:last-child>b').text().toLowerCase();

		let q_table = $_reviews('table.ct_table').has('thead>tr');

		let a_events = $_reviews(q_table).find('tr')
			.filter('.green,.blue,.magenta').find('td:first-child>a').toArray()
			.map(d => $_reviews(d).attr('href'));

		for(let s_event of a_events) {
			let q_event = $_reviews(`a[name="${s_event.slice(1)}"]`).next();
			switch(s_event.replace(/^#|_.*$/g, '').toLowerCase()) {
				case 'review': {
					let g_review = extract_table($_reviews, q_event.find('tr').toArray().slice(1), h_review_cleaner);

					let s_index = q_event.find('tr').eq(0).text().replace(/^Review (\d+)$/, '$1');

					let sc1_review = `eswc2019-submissions:Review.${si_submission}.${s_index}`;
					let sc1_reviewer = `eswc2019-submissions:Reviewer.${si_submission}.${s_index}`;

					ds_out.write({
						type: 'c3',
						value: {
							[sc1_review]: {
								a: 'fr:ReviewVersion',
								'rdfs:label': `"Review #${s_index} for Proceedings Paper ${s_paper_id}`,
								'fr:issuedAt': '>https://easychair.org',
								'dct:issued': new Date(g_review.time),
								'dct:language': '>http://www.lexvo.org/page/iso639-3/eng',
								// 'dct:license': '',
								'fr:hasRating': `eswc2019:ReviewRating.${g_review.rating}`,
								'fr:hasReviewerConfidence': `eswc2019:ReviewerConfidence.${g_review.confidence}`,
								'cito:reviews': sc1_submission,
								'fr:issuedFor': '>https://2019.eswc-conferences.org',
								'fr:releasedBy': 'eswc2019:Metadata',
								'c4o:hasContent': '"'+g_review.content,
								'frbr:creator': sc1_reviewer,
								'eswc2019:transparentReviewer': g_review.transparent,
							},

							[sc1_reviewer]: {
								a: 'conference:RoleDuringEvent',
								'rdfs:label': `"Reviewer for Proceedings Paper ${s_paper_id}`,
								'conference:withRole': 'conference:Reviewer',
								...(g_review.transparent
									? {
										'conference:isHeldBy': person_c1(g_review.reviewer),
									}
									: {}),
							},
						},
					});

					// create person later (protect anonymity)
					as_persons.add(g_review.reviewer);
					break;
				}

				case 'rebuttal': {
					let g_rebuttal = extract_table($_reviews, q_event.find('tr').toArray().slice(1), h_rebuttal_cleaner);

					let sc1_rebuttal = `eswc2019-submissions:Rebuttal.${si_submission}`;

					ds_out.write({
						type: 'c3',
						value: {
							[sc1_rebuttal]: {
								a: 'eswc2019:Rebuttal',
								'fr:issuedAt': '>https://easychair.org',
								'dct:issued': new Date(g_rebuttal.time),
								'dct:language': '>http://www.lexvo.org/page/iso639-3/eng',
								'eswc2019:rebuts': sc1_submission,
								'fr:issuedFor': '>https://2019.eswc-conferences.org',
								'fr:releasedBy': 'eswc2019:Metadata',
								'c4o:hasContent': '"'+g_rebuttal.response,
								// 'frbr:creator': ,
							},
						},
					});
					break;
				}

				case 'metareview': {
					break;
				}

				default: {
					console.warn(`no event handler for ${s_event}`);
					break;
				}
			}
		}

		let sc1_author_list = `eswc2019-submissions:Authors.${si_submission}`;
		let a_author_items = $_submission('table[id="ec:table2"]>tbody>tr').slice(2).toArray()
			.map((d_row, i_row) => {
				let a_row = $_submission(d_row).find('td').toArray().map(d => $_submission(d).text().trim().replace(/&nbsp;/g, ''));

				let s_full_name = a_row[0]+' '+a_row[1];
				let sc1_person = person_c1(s_full_name);
				let sc1_author = `eswc2019-submissions:Author.${s_paper_id}.${i_row+1}`;
				let sc1_affiliation = `eswc2019-affiliations:${person_suffix(s_full_name)}.${org_suffix(a_row[4])}`;
				let sc1_organization = `eswc2019-organizations:${org_suffix(a_row[4])}`;
				let sc1_organization_site = `eswc2019-sites:${a_row[4].replace(/ /g, '_')}.${a_row[3].replace(/ /g, '_')}`;

				return {
					c1: sc1_author,
					c3: {
						[sc1_person]: {
							a: 'conference:Person',
							'rdfs:label': '"'+s_full_name,
							'conference:name': '"'+s_full_name,
							'conference:givenName': '"'+a_row[0],
							'conference:familyName': '"'+a_row[1],
							// 'foaf:mbox': '>mailto:'+a_row[2],
							...(a_row[5]? {'foaf:homepage':'>'+a_row[5]}: {}),
							'conference:holdsRole': sc1_author,
							'conference:hasAffiliation': sc1_affiliation,
						},
						[sc1_author]: {
							a: 'conference:RoleDuringEvent',
							'rdfs:label': `@en"${s_full_name}, ${nth.appendSuffix(i_row+1)} Author for Submissions Paper ${s_paper_id}`,
							'conference:isHeldBy': sc1_person,
							'conference:withRole': 'conference:PublishingRole',
							'eswc2019:correspondingAuthor': !!a_row[6],
						},
						[sc1_affiliation]: {
							a: 'conference:AffiliationDuringEvent',
							'rdfs:label': `@en"${s_full_name}'s Affiliation with ${a_row[4]}`,
							'conference:isAffiliationOf': sc1_person,
							'conference:withOrganisation': sc1_organization,
						},
						[sc1_organization]: {
							a: 'conference:Organisation',
							'rdfs:label': '@en"'+a_row[4],
							'conference:hasSite': sc1_organization_site,
						},
						[sc1_organization_site]: {
							a: 'conference:Site',
							'rdfs:label': '@en"'+a_row[4],
							'conference:description': '@en"'+a_row[4],
							'conference:address': '@en"'+a_row[3],
						},
					},
				};
			});

		let g_submission = extract_table($_submission, $_submission('table[id="ec:table1"]>tbody>tr').toArray().slice(1), h_submission_cleaner);

		let sc1_track = `eswc2019:Track.${g_submission.track.replace(/ /g, '_').replace(/_?[Tt]rack$/, '')}`;
		hm_tracks.set(sc1_track, g_submission.track.replace(/ ?[Tt]rack$/, ''));
		ds_out.write({
			type: 'c3',
			value: {
				[sc1_submission]: {
					a: ['eswc2019:SubmissionPaper', 'conference:Document'],

					'rdfs:label': '@en"'+g_submission.title,
					'conference:title': '@en"'+g_submission.title,
					'eswc2019:track': sc1_track,
					'conference:abstract': '@en"'+g_submission.abstract,
					'eswc2019:authorList': [a_author_items.map(g => g.c1)],
					'eswc2019:decision': `eswc2019:Decision.${g_submission.decision}`,

					'dct:issued': new Date(g_submission.submitted),
					// ...g_submission.last_update
					// 	? {'dct:modified':new Date(g_submission.last_update)}
					// 	: {},

					'dct:modified': new Date(g_submission.last_update),

					// 'rdfs:label': '@en"'+$_submission('#stitle').text(),
					// 'conference:title': '@en"'+$_submission('#stitle').text(),
					// 'conference:abstract': '@en"'+$_submission('tr#row18').text(),
					// 'eswc2019:authorList': [a_author_items.map(g => g.c1)],
					// 'eswc2019:decision': `eswc2019:Decision.${s_decision}`,

					// 'eswc2019:pdf': 'eswc2019-object:'+s_paper_id,
					// ...(s_comment? {'eswc2019:comment':'@en"'+s_comment}: {}),
					// 'conference:hasAuthorList': sc1_author_list,
				},
				// [sc1_author_list]: {
				// 	a: 'conference:List',
				// 	'rdfs:label': `"Author List of ${a_author_items.length} Authors for "${$_submission('#stitle').text()}"`,
				// 	'conference:hasItem': a_author_items.map(g => g.c1),
				// },
				...a_author_items.reduce((g_out, g_item) => ({
					...g_out,
					...g_item.c3,
				}), {}),
			},
		});
	}

	for(let s_person of [...as_persons].sort()) {
		ds_out.write({
			type: 'c3',
			value: {
				[person_c1(s_person)]: {
					a: 'conference:Person',
					'rdfs:label': '"'+s_person,
					'conference:name': '"'+s_person,
				},
			},
		});
	}

	ds_out.write({
		type: 'c3',
		value: {
			'eswc2019:Conference': {
				'eswc2019:submissionsList': [a_submissions.sort(F_SORT_PAPER_INDEX)],
				'eswc2019:tracksInclude': [...hm_tracks].map(a => a[0]),
			},
		},
	});

	for(let [sc1_track, s_track] of hm_tracks) {
		ds_out.write({
			type: 'c3',
			value: {
				[sc1_track]: {
					a: 'eswc2019:Track',
					'rdfs:label': '@en"'+s_track,
				},
			},
		});
	}

	k_bar.tick(1, {
		paper: '',
		spin: ' ✓ ',
	});
})();
