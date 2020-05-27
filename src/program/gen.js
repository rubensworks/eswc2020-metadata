const ttl_read = require('@graphy/content.ttl.read');
const ttl_write = require('@graphy/content.ttl.write');
const {
	prefixes: H_PREFIXES,
	org_suffix,
} = require('../common/share.js');

const people = require('../common/people.js');

let ds_out = ttl_write({
	prefixes: H_PREFIXES,
});

let s_day = process.argv[2];

ds_out.pipe(process.stdout);

let h_dates = {
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
};

let h_papers = {
	...Object.entries({
		'Processing SPARQL Aggregates Queries with Web Preemption': 'Paper.155',
		'Equivalent Rewritings on Path Views with Binding Patterns': 'Paper.106',
		'StreamPipes Connect: Semantics-Based Edge Adapters for the Industrial IoT': 'Paper.136',
		'Entity Extraction from Wikipedia List Pages': 'Paper.39',
		'Building Linked Spatio-Temporal Data from Vectorized Historical Maps': 'Paper.48',
		'SchemaTree: Maximum-likelihood Property Recommendation for Wikidata': 'Paper.150',
		'Entity Summarization with User Feedback': 'Paper.66',
		'Detecting Synonymous Properties by Shared Data-driven Definitions': 'Paper.138',
		'Incremental Multi-source Entity Resolution for Knowledge Graph Completion': 'Paper.159',
		'Hyperbolic Knowledge Graph Embeddings for Knowledge Base Completion': 'Paper.52',
		'Unsupervised Bootstrapping of Active Learning for Entity Resolution': 'Paper.80',
		'Embedding-based Recommendations on Scholarly Knowledge Graphs': 'Paper.89',
		'SASOBUS: Semi-automatic Sentiment Domain Ontology Building Using Synsets': 'Paper.28',
		'Partial Domain Adaptation for Relation Extraction Based on Adversarial Learning': 'Paper.77',
		'Entity Linking and Lexico-Semantic Patterns for Ontology Learning': 'Paper.179',
		'Hybrid Reasoning Over Large Knowledge Bases Using On-The-Fly Knowledge Extraction': 'Paper.107',
		'A Simple Method for Inducing Class Taxonomies in Knowledge Graphs': 'Paper.193',
		'Handling Impossible Derivations during Stream Reasoning': 'Paper.247',
		'Semantic Data Integration for the SMT Manufacturing Process using SANSA Stack': 'Paper.276',
		'Enabling Digital Business Transformation through an enterprise Knowledge Graph': 'Paper.277',
		'Knowledge Graph-based Legal Search over German Court Cases': 'Paper.275',
		'Enabling FAIR Clinical Data Standards with Linked Data': 'Paper.337',
		'The Knowledge Graph Track at OAEI – Gold Standards, Baselines, and the Golden Hammer Bias': 'Paper.62',
		'Modular Graphical Ontology Engineering Evaluated': 'Paper.111',
		'Investigating Software Usage in the Social Sciences: A Knowledge Graph Approach': 'Paper.116',
		'QAnswer KG: Creating On-Demand Question Answering Systems on Top of RDF Data': 'Paper.237',
		'Keyword Search over RDF using Document-centric Information Retrieval Systems': 'Paper.186',
		'VQuAnDa: Verbalization QUestion ANswering DAtaset': 'Paper.69',
		'ESBM: An Entity Summarization BenchMark': 'Paper.72',
		'SemTab 2019: Resources to Benchmark Tabular Data to Knowledge Graph Matching Systems': 'Paper.88',
		'GEval: a Modular and Extensible Evaluation Framework for Graph Embedding Techniques': 'Paper.191',
		'YAGO 4: A Reason-able Knowledge Base': 'Paper.110',
		'A Knowledge Graph for Industry 4.0': 'Paper.169',
		'MetaLink: A Travel Guide to the LOD Cloud': 'Paper.230',
		'Applying Knowledge Graphs as Integrated Semantic Information Model for the Computerized Engineering of Building Automation Systems': 'Paper.102',
		'Astrea: automatic generation of SHACL shapes from ontologies': 'Paper.180',
		'SAShA: Semantic-Aware Shilling Attacks on Recommender Systems exploiting Knowledge Graphs': 'Paper.251',
		'Supporting complex decision making by semantic technologies': 'Paper.11',
		'On Modeling The Physical World as a Collection of Things: the W3C Thing Description Ontology': 'Paper.43',
		'Piveau: A Large-scale Open Data Management Platform based on Semantic Web Technologies': 'Paper.60',
		'Fast and Exact Rule Mining with AMIE 3': 'Paper.120',
		'Fostering Scientific Meta-Analyses with Knowledge Graphs : a Case-Study': 'Paper.53',
		'Estimating Characteristic Sets for RDF Dataset Profiles based on Sampling': 'Paper.196',
	}).reduce((h_out, [s_match, s_paper]) => ({
		...h_out,
		[s_match]: `${H_PREFIXES['eswc2020-proceedings']}${s_paper}`,
	}), {}),
};

(async() => {
	await new Promise((fk_read) => {
		process.stdin.pipe(ttl_read({
			prefixes: H_PREFIXES,

			data({subject:yt_subject, predicate:yt_predicate, object:yt_object}) {
				if(yt_subject.value.startsWith(H_PREFIXES['eswc2020-proceedings']+'Paper.') && (H_PREFIXES.rdfs+'label') === yt_predicate.value) {
					h_papers[yt_object.value.toLowerCase().trim().replace(/([^A-Za-z0-9])+/g, '_')] = yt_subject.value;
				}
			},

			eof() {
				fk_read();
			},
		}));
	});

	const namify = s => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');


// for(let [s_day, n_date] of Object.entries(h_dates)) {
	let n_date = h_dates[s_day];

	let s_day_proper = `${s_day[0].toUpperCase()}${s_day.slice(1)}`;
	let sc1_day = `eswc2020:Day.${s_day_proper}`;

	const event = s_type => ({
		a: `conference:${s_type[0].toUpperCase()}${s_type.slice(1)}`,
		'conference:isSubEventOf': 'eswc2020:Conference',
		'eswc2020:day': sc1_day,
	});

	const hour = x_hour => `^xsd:dateTime"2020-06-0${n_date}:${(Math.ceil(x_hour)+'').padStart(2, '0')}:${(((x_hour % 1)*60)+'').padStart(2, '0')}:00.000+02:00`;

	const time = (x_start, x_end) => ({
		'conference:startDate': hour(x_start),
		'conference:endDate': hour(x_end),
	});

	const talk = (s_label, x_start, x_end) => ({
		[`eswc2020-${s_day}:${namify(s_label)}`]: {
			'rdfs:label': `@en"${s_label}`,
			...event('talk'),
			...time(x_start, x_end),
		},
	});

	const coffee = (s_type, x_start, x_end) => ({
		[`eswc2020-${s_day}:${namify(`${s_type[0].toUpperCase()}${s_type.slice(1)} Coffee Break`)}`]: {
			'rdfs:label': `@en"Coffee Break`,
			...event('break'),
			...time(x_start, x_end),
		},
	});

	const session = (s_label, x_start, x_end, g_info = {}) => ({
		[`eswc2020-${s_day}:${namify(s_label)}`]: {
			'rdfs:label': `@en"${s_label}`,
			...event('session'),
			...time(x_start, x_end),
			...g_info.location ? {'conference:hasLocation': g_info.location} : {},
			...(g_info.talks
				? {
					'eswc2020:sessionContent': [g_info.talks.map((s_title) => {
						let sc1_talk = `eswc2020-talks:${org_suffix(s_title)}`;

						let hc2_talk = {
							a: 'conference:Talk',
							'rdfs:label': '@en"'+s_title,
							// 'eswc2020:paper': ``,
							// 'eswc2020:paperAuthors': [...people.within(s_authors)],
						};

						if(!(s_title in h_papers)) {
							debugger;
							console.error(`could not find matching paper for talk: "${s_title}"`);
						}
						else {
							hc2_talk['eswc2020:coversPaper'] = '>'+h_papers[s_title];
						}

						ds_out.write({
							type: 'c3',
							value: {
								[sc1_talk]: hc2_talk,
							},
						});

						return sc1_talk;
					})],
				}
				: {}),
		},
	});

	const lunch = () => ({
		[`eswc2020-${s_day}:Lunch`]: {
			'rdfs:label': `@en"Lunch`,
			...event('meal'),
			...time(13, 14),
		},
	});

	let sc1_keynote_speaker = `eswc2020-${s_day}:Keynote_Speaker`;

	ds_out.write({
		type: 'c3',
		value: {
			[sc1_day]: {
				a: 'eswc2020:Day',
				'rdfs:label': '@en"'+s_day_proper,
			},
		},
	});

	switch(s_day.toLowerCase()) {
		case 'tuesday': {
			let sc1_keynote = '>https://2020.eswc-conferences.org/keynote-michael-schmidt/';

			ds_out.write({
				type: 'c3',
				value: {
					...people.c3('Michael Schmidt', {
						'conference:holdsRole': sc1_keynote_speaker,
					}),

					[sc1_keynote_speaker]: {
						a: 'conference:PublishingRoleDuringEvent',
						'conference:during': sc1_keynote,
						'conference:withRole': 'role:presenter',
					},

					...talk('Opening Ceremony', 9, 10),

					// keynote
					[sc1_keynote]: {
						'rdfs:label': '@en"Graph first, semantics follows',
						'rdfs:description': '@en"Organizations that want to build new applications using the relationships in their data are confronted with a choice between RDF and property graph models. Today, this choice may have long-ranging ramifications (e.g., when applications must interoperate with other systems), where instead it would be desirable to have users benefit from the best of each world. Motivated by real use cases in the context of Amazon Neptune, a fully managed graph database service that supports both SPARQL queries for RDF as well as Apache TinkerPop Gremlin queries for property graphs, we will highlight aspects that cause organizations to prefer property graphs over RDF (or vice versa) when building their graph applications. Advocating a “graph first, semantics follows” paradigm, we encourage the community to work towards a unification of existing graph data modeling and management approaches. Alongside, this includes exploring improvements of the Semantic Web technology stack for graph use cases (e.g., advanced path queries, graph analytics, and machine learning) and a stronger focus on its usage in the enterprise context. With the ongoing proliferation of graph databases in the industry, a shift in focus towards interdisciplinary, enterprise grade graph data management research could open up a unique chance for the community to make Semantic Web technologies mainstream, starting out from within the enterprise rather than the Web.',
						...event('talk'),
						...time(17, 18),
						'eswc2020:presenter': 'eswc2020-persons:Michael_Schmidt',
					},

					...session('Workshops / Tutorials', 10, 11, {}),
					...session('PhD Symposium', 10, 11, {}),

					...coffee('morning', 11, 11.5),

					...session('Workshops / Tutorials', 11.5, 13, {}),
					...session('PhD Symposium', 11.5, 13, {}),

					...lunch(),

					...session('Workshops / Tutorials', 14, 15.5, {}),
					...session('PhD Symposium', 14, 15.5, {}),

					...coffee('afternoon', 15.5, 16),

					...session('Workshops / Tutorials', 16, 17, {}),
					...session('PhD Symposium', 16, 17, {}),
				},
			});
			break;
		}

		case 'wednesday': {
			let sc1_keynote = '>https://2020.eswc-conferences.org/keynote-john-f-sowa/';

			ds_out.write({
				type: 'c3',
				value: {
					...people.c3('John F. Sowa', {
						'conference:holdsRole': sc1_keynote_speaker,
					}),

					[sc1_keynote_speaker]: {
						a: 'conference:PublishingRoleDuringEvent',
						'conference:during': sc1_keynote,
						'conference:withRole': 'role:presenter',
					},

					...talk('Minute Madness', 9, 10),

					// keynote
					[sc1_keynote]: {
						'rdfs:label': '@en"Language, Ontology, and the Semantic Web',
						'rdfs:description': '@en"In 2000, Tim Berners-Lee proposed a vision for the Semantic Web that was more ambitious than the results delivered in 2005. Research in the past 15 years produced advanced technology in artificial intelligence, language processing, and reasoning methods, both formal and informal. But many systems are proprietary, incompatible with one another, and too complex for widespread adoption. Among the most important requirements, trusted systems were never adequately implemented. This talk surveys promising developments and suggests ways of adapting them to the Semantic Web.',
						...event('talk'),
						...time(17, 18),
						'eswc2020:presenter': 'eswc2020-persons:John_F._Sowa',
					},

					...session('Workshops / Tutorials', 10, 11, {}),
					...session('PhD Symposium', 10, 11, {}),

					...coffee('morning', 11, 11.5),

					...session('Workshops / Tutorials', 11.5, 13, {}),
					...session('PhD Symposium', 11.5, 13, {}),

					...lunch(),

					...session('Workshops / Tutorials', 14, 15.5, {}),
					...session('PhD Symposium', 14, 15.5, {}),

					...coffee('afternoon', 15.5, 16),

					...session('Workshops / Tutorials', 16, 17, {}),
					...session('PhD Symposium', 16, 17, {}),
				},
			});
			break;
		}

		case 'thursday': {
			let sc1_keynote = '>https://2020.eswc-conferences.org/keynote-uli-sattler/';

			ds_out.write({
				type: 'c3',
				value: {
					...people.c3('Uli Slattler', {
						'conference:holdsRole': sc1_keynote_speaker,
					}),

					[sc1_keynote_speaker]: {
						a: 'conference:PublishingRoleDuringEvent',
						'conference:during': sc1_keynote,
						'conference:withRole': 'role:presenter',
					},

					// keynote
					[sc1_keynote]: {
						'rdfs:label': '@en"Modularity in OWL',
						'rdfs:description': '@en"The semantic web ontology language OWL is widely used in a range of applications, and supported by a broad range of tools, including editors, IDEs, APIs, and reasoners. Engineering ontologies (e.g., building, re-using, maintaining) remains, however, a complex task – and modularity is an obvious mechanism to make this task more manageable. In this talk, I will try to give an overview of work in this area. Firstly, we consider the task of extracting, from one ontology, a small/suitable fragment that captures a given topic (usually described in terms of its signature). The question of suitability versus size here is interesting, and has given rise to different notions of modules and their properties and algorithms for their extraction. Secondly, it would be extremely useful if we could “modularize” a large ontology into suitable coherent fragments (OWL has an “imports” construct that supports some kind of modular working with an ontology). Thirdly, if we have such a nice, modular ontology, how can a group of domain experts work independently on these without undesired side effects. Fourth and finally, we will briefly talk about whether/which form of modularity can be used and how to optimize reasoning.',
						...event('talk'),
						...time(9, 10),
						'eswc2020:presenter': 'eswc2020-persons:Uli_Slattler',
					},

					...session('Session 1: Query Processing', 10, 10.333, {
						talks: [
							`Processing SPARQL Aggregates Queries with Web Preemption`,
							`Equivalent Rewritings on Path Views with Binding Patterns`,
							`StreamPipes Connect: Semantics-Based Edge Adapters for the Industrial IoT`,
						],
					}),

					...session('Session 2: Knowledge Extraction and Recommendation 1', 10, 10.333, {
						talks: [
							`Entity Extraction from Wikipedia List Pages`,
							`Building Linked Spatio-Temporal Data from Vectorized Historical Maps`,
							`SchemaTree: Maximum-likelihood Property Recommendation for Wikidata`,
						],
					}),

					...session('Session 3: Knowledge Extraction and Recommendation 2', 10.333, 10.666, {
						talks: [
							`Entity Summarization with User Feedback`,
							`Detecting Synonymous Properties by Shared Data-driven Definitions`,
							`Incremental Multi-source Entity Resolution for Knowledge Graph Completion`,
						],
					}),

					...session('Session 4: Machine Learning', 10.333, 10.666, {
						talks: [
							`Hyperbolic Knowledge Graph Embeddings for Knowledge Base Completion`,
							`Unsupervised Bootstrapping of Active Learning for Entity Resolution`,
							`Embedding-based Recommendations on Scholarly Knowledge Graphs`,
						],
					}),

					...session('Session 5: Natural Language Processing', 10.666, 11, {
						talks: [
							`SASOBUS: Semi-automatic Sentiment Domain Ontology Building Using Synsets`,
							`Partial Domain Adaptation for Relation Extraction Based on Adversarial Learning`,
							`Entity Linking and Lexico-Semantic Patterns for Ontology Learning`,
						],
					}),

					...session('Session 6: Reasoning', 10.666, 11, {
						talks: [
							`Hybrid Reasoning Over Large Knowledge Bases Using On-The-Fly Knowledge Extraction`,
							`A Simple Method for Inducing Class Taxonomies in Knowledge Graphs`,
							`Handling Impossible Derivations during Stream Reasoning`,
						],
					}),

					...session('Industry track papers', 10, 11, {
						talks: [
							`Semantic Data Integration for the SMT Manufacturing Process using SANSA Stack`,
							`Enabling Digital Business Transformation through an enterprise Knowledge Graph`,
							`Knowledge Graph-based Legal Search over German Court Cases`,
							`Enabling FAIR Clinical Data Standards with Linked Data`,
						],
					}),

					...coffee('morning', 11, 11.5),

					...session('Session 7: Ontology Engineering and Alignment', 11.5, 11.833, {
						talks: [
							`The Knowledge Graph Track at OAEI – Gold Standards, Baselines, and the Golden Hammer Bias`,
							`Modular Graphical Ontology Engineering Evaluated`,
							`Investigating Software Usage in the Social Sciences: A Knowledge Graph Approach`,
						],
					}),

					...session('Session 8: Search and Question Answering', 11.5, 11.833, {
						talks: [
							`QAnswer KG: Creating On-Demand Question Answering Systems on Top of RDF Data`,
							`Keyword Search over RDF using Document-centric Information Retrieval Systems`,
							`VQuAnDa: Verbalization QUestion ANswering DAtaset`,
						],
					}),

					...session('Session 9: Benchmarking', 11.833, 12.166, {
						talks: [
							`ESBM: An Entity Summarization BenchMark`,
							`SemTab 2019: Resources to Benchmark Tabular Data to Knowledge Graph Matching Systems`,
							`GEval: a Modular and Extensible Evaluation Framework for Graph Embedding Techniques`,
						],
					}),

					...session('Session 10: Knowledge Graphs and Linked Data', 11.833, 12.166, {
						talks: [
							`YAGO 4: A Reason-able Knowledge Base`,
							`A Knowledge Graph for Industry 4.0`,
							`MetaLink: A Travel Guide to the LOD Cloud`,
						],
					}),

					...session('Session 11: Knowledge Graphs and Constraints', 12.166, 12.5, {
						talks: [
							`Applying Knowledge Graphs as Integrated Semantic Information Model for the Computerized Engineering of Building Automation Systems`,
							`Astrea: automatic generation of SHACL shapes from ontologies`,
							`SAShA: Semantic-Aware Shilling Attacks on Recommender Systems exploiting Knowledge Graphs`,
						],
					}),

					...session('Session 12: In use', 12.166, 12.5, {
						talks: [
							`Supporting complex decision making by semantic technologies`,
							`On Modeling The Physical World as a Collection of Things: the W3C Thing Description Ontology`,
							`Piveau: A Large-scale Open Data Management Platform based on Semantic Web Technologies`,
						],
					}),

					...session('Session 13: Mining and analysis', 12.5, 12.833, {
						talks: [
							`Fast and Exact Rule Mining with AMIE 3`,
							`Fostering Scientific Meta-Analyses with Knowledge Graphs : a Case-Study`,
							`Estimating Characteristic Sets for RDF Dataset Profiles based on Sampling`,
						],
					}),

					...lunch(),

					...session('Posters and demos with PhD posters', 14, 16),

					...session('Panel Discussion', 16, 17),

					[`eswc2020-${s_day}:Closing_Ceremony`]: {
						a: ['conference:SocialEvent'],
						'rdfs:label': `@en"Closing Ceremony`,
						...time(17, 18),
					},
				},
			});
			break;
		}

		case 'friday': {
			ds_out.write({
				type: 'c3',
				value: {
					...session('Town hall meeting', 10, 11, {}),
				},
			});
			break;
		}

		default: break;
	}
// }

	ds_out.end();
})();
