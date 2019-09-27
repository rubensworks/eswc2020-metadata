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

const SC1_EMERALD_1 = 'hoteli-bernardin:emerald-ballroom#section-1';
const SC1_EMERALD_2 = 'hoteli-bernardin:emerald-ballroom#section-2';
const SC1_ADRIA = 'hoteli-bernardin:adria';

let h_dates = {
	tuesday: 4,
	wednesday: 5,
	thursday: 6,
};

let h_papers = {
	...Object.entries({
		aligning_metadata_with_ontology_terms_using_clustering_and_embeddings: 'Paper.161',
		shacl_constraint_validation_over_ontology_enhanced_kgs_via_rewriting: 'Paper.119',
		mini_me_swift_the_first_owl_reasoner_for_ios: 'Paper.124',
		// using_knowledge_graphs_to_search_an_enterprise_data_lake: '',
	}).reduce((h_out, [s_match, s_paper]) => ({
		...h_out,
		[s_match]: `${H_PREFIXES['eswc2019-proceedings']}${s_paper}`,
	}), {}),
};

(async() => {
	await new Promise((fk_read) => {
		process.stdin.pipe(ttl_read({
			prefixes: H_PREFIXES,

			data({subject:yt_subject, predicate:yt_predicate, object:yt_object}) {
				if(yt_subject.value.startsWith(H_PREFIXES['eswc2019-proceedings']+'Paper.') && (H_PREFIXES.rdfs+'label') === yt_predicate.value) {
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
	let sc1_day = `eswc2019:Day.${s_day_proper}`;

	const event = s_type => ({
		a: `conference:${s_type[0].toUpperCase()}${s_type.slice(1)}`,
		'conference:isSubEventOf': 'eswc2019:Conference',
		'eswc2019:day': sc1_day,
	});

	const hour = x_hour => `^xsd:dateTime"2019-06-0${n_date}:${(Math.ceil(x_hour)+'').padStart(2, '0')}:${(((x_hour % 1)*60)+'').padStart(2, '0')}:00.000+02:00`;

	const time = (x_start, x_end) => ({
		'conference:startDate': hour(x_start),
		'conference:endDate': hour(x_end),
	});

	const talk = (s_label, x_start, x_end) => ({
		[`eswc2019-${s_day}:${namify(s_label)}`]: {
			'rdfs:label': `@en"${s_label}`,
			...event('talk'),
			...time(x_start, x_end),
		},
	});

	const coffee = (s_type, x_start, x_end) => ({
		[`eswc2019-${s_day}:${namify(`${s_type[0].toUpperCase()}${s_type.slice(1)} Coffee Break`)}`]: {
			'rdfs:label': `@en"Coffee Break`,
			...event('break'),
			...time(x_start, x_end),
		},
	});

	const session = (s_label, x_start, x_end, g_info) => ({
		[`eswc2019-${s_day}:${namify(s_label)}`]: {
			'rdfs:label': `@en"${s_label}`,
			...event('session'),
			...time(x_start, x_end),
			'conference:hasLocation': g_info.location,
			...(g_info.talks
				? {
					'eswc2019:sessionContent': [g_info.talks.map((s_talk) => {
						let [s_title, s_authors] = s_talk.split(/\s*\n+\s*/);

						let sc1_talk = `eswc2019-talks:${org_suffix(s_title)}`;

						let hc2_talk = {
							a: 'conference:Talk',
							'rdfs:label': '@en"'+s_title,
							// 'eswc2019:paper': ``,
							// 'eswc2019:paperAuthors': [...people.within(s_authors)],
						};

						let s_match = s_title.toLowerCase().trim().replace(/([^A-Za-z0-9])+/g, '_');
						if(!(s_match in h_papers)) {
							debugger;
							console.error(`could not find matching paper for talk: "${s_title}"`);
						}
						else {
							hc2_talk['eswc2019:coversPaper'] = '>'+h_papers[s_match];
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

		...(g_info.talks
			? {
				...g_info.talks.reduce((h_out, s_talk) => ({
					...h_out,
					...people.c3(s_talk.split(/\s*\n+\s*/)[1]),
				}), {}),
			}
			: {}),
	});

	const lunch = () => ({
		[`eswc2019-${s_day}:Lunch`]: {
			'rdfs:label': `@en"Lunch`,
			...event('meal'),
			...time(12.5, 14),
		},
	});

	let sc1_keynote_speaker = `eswc2019-${s_day}:Keynote_Speaker`;

	ds_out.write({
		type: 'c3',
		value: {
			[sc1_day]: {
				a: 'eswc2019:Day',
				'rdfs:label': '@en"'+s_day_proper,
			},
		},
	});

	switch(s_day.toLowerCase()) {
		case 'tuesday': {
			let sc1_keynote = '>https://2019.eswc-conferences.org/keynote-peter-haase/';

			ds_out.write({
				type: 'c3',
				value: {
					...people.c3('Peter Haase', {
						'conference:holdsRole': sc1_keynote_speaker,
					}),

					[sc1_keynote_speaker]: {
						a: 'conference:PublishingRoleDuringEvent',
						'conference:during': sc1_keynote,
						'conference:withRole': 'role:presenter',
					},

					...talk('Opening Ceremony', 9, 9.5),

					// keynote
					[sc1_keynote]: {
						'rdfs:label': '@en"Keynote: Knowledge Graph Kaleidoscope',
						'rdfs:description': '@en"In this talk I will provide a perspective on the history, current state and trends of Knowledge Graphs.  This perspective will range from personal experience in academic research in the Semantic Web community  to applications and uptake of knowledge graphs in industry. The talk will be presented as a knowledge graph itself –  with real-life data and examples to be interactively explored and to see what is possible with knowledge graph technology today.',
						...event('talk'),
						...time(9.5, 10.5),
						'eswc2019:presenter': 'eswc2019-persons:Peter_Haase',
					},

					...coffee('morning', 10.5, 11),

					...session('Best of Resources', 11, 12.5, {
						location: SC1_EMERALD_1,
						talks: [
							`AYNEC: All You Need for Evaluating Completion Techniques in Knowledge Graphs
								Daniel Ayala, Agustin Borrego, Inma Hernandez, Carlos R. Rivero and David Ruiz`,
							`EVENTSKG: A 5-Star Dataset of Top-ranked Events in Eight Computer Science Communities
								Said Fathalla, Christoph Lange and Sören Auer`,
							`A Software Framework and Datasets for the Analysis of Graph Measures on RDF Graphs
								Matthäus Zloch, Maribel Acosta, Daniel Hienert, Stefan Dietze and Stefan Conrad`,
						],
					}),

					...lunch(),

					...session('Querying and Learning on SW', 14, 15.5, {
						location: SC1_EMERALD_1,
						talks: [
							`Boosting DL Concept Learners
								Nicola Fanizzi | Giuseppe Rizzo | Claudia d’Amato`,
							`Generating Semantic Aspects for Queries
								Dhruv Gupta | Klaus Berberich | Jannik Strötgen | Demetrios Zeinalipour-Yazti`,
							`Reformulation-based query answering for RDF graphs with RDFS ontologies
								Maxime Buron | François Goasdoué | Ioana Manolescu | Marie-Laure Mugnier`,
						],
					}),

					...session('Linked Prediction: Methods and Resources', 14, 15.5, {
						location: SC1_EMERALD_2,
						talks: [
							`Link Prediction in Knowledge Graphs with Concepts of Nearest Neighbours
								Sebastien Ferre`,
							`Link Prediction Using Multi Part Embeddings
								Sameh Mohamed | Vit Novacek`,
							`MMKG: Multi-Modal Knowledge Graphs
								Ye Liu | Hui Li | Alberto Garcia Duran | Mathias Niepert | Daniel Oñoro-Rubio | David S. Rosenblum`,
						],
					}),

					...session('Neural Networks: Semantic Web Applications', 14, 15.5, {
						location: SC1_ADRIA,
						talks: [
							`Incorporating Joint Embeddings into Goal-Oriented Dialogues with Multi-Task Learning
								Firas Kassawat | Debanjan Chaudhuri | Jens Lehmann`,
							`Knowledge Based Short Text Categorization Using Entity and Category Embeddings
								Rima Türker | Lei Zhang | Maria Koutraki | Harald Sack`,
							`A Hybrid Approach for Aspect-Based Sentiment Analysis Using a Lexicalized Domain Ontology and Attentional Neural Models
								Olaf Wallaart | Flavius Frasincar`,
						],
					}),

					...coffee('afternoon', 15.5, 16),

					...session('Minute Madness', 16, 17, {
						location: SC1_EMERALD_1,
					}),

					...session('Evaluations and Lessons Learned', 16, 17.5, {
						location: SC1_EMERALD_2,
						talks: [
							`BeSEPPI: Semantic-Based Benchmarking of Property Path Implementations
								Adrian Skubella | Daniel Janke | Steffen Staab`,
							`QED: Out-of-the-box Datasets for SPARQL Query Evaluation
								Veronika Thost | Julian Dolby`,
							`Challenges of Constructing a Railway Knowledge Graph
								Stefan Bischof | Gottfried Schenner`,
						],
					}),

					[`eswc2019-${s_day}:Welcome_Reception`]: {
						a: 'conference:SocialEvent',
						'rdfs:label': `@en"Welcome reception with poster & demo session`,
						...time(19, 22),
					},
				},
			});
			break;
		}

		case 'wednesday': {
			let sc1_keynote = '>https://2019.eswc-conferences.org/keynote-diana-maynard/';

			ds_out.write({
				type: 'c3',
				value: {
					...people.c3('Diana Maynard', {
						'conference:holdsRole': sc1_keynote_speaker,
					}),

					[sc1_keynote_speaker]: {
						a: 'conference:PublishingRoleDuringEvent',
						'conference:during': sc1_keynote,
						'conference:withRole': 'role:presenter',
					},

					// keynote
					[sc1_keynote]: {
						'rdfs:label': '@en"Adding value to NLP: a little semantics goes a long way',
						'rdfs:description': '@en"Natural language processing technology is now ubiquitous, even if there are still many challenges to be faced in its development. From sentiment analysis to machine translation to chatbots; from medical systems to online shopping to fake news; even if not visibly apparent, NLP tools are now lurking hidden in the depths of an enormous number and range of real-world systems and applications. Techniques have advanced in many directions in the last 20 years thanks primarily to developments in machine learning and deep learning technologies, and to the concomitant creation of and attention to language resources. In this talk, I shall examine the role of semantics in NLP applications. It is perhaps surprising that despite recent advances in Semantic Web technology and NLP, researchers and practitioners in domains ranging from journalism to rocket science have yet to grasp their potential, and are still manually grappling feral spreadsheets and databases. I shall discuss how NLP infused with even small amounts of semantics can be a drastic game-changer in fields as diverse as crisis communication, politics, journalism, medicine, literature, and history, using examples from some of our recent projects and applications.',
						...event('talk'),
						...time(9.5, 10.5),
						'eswc2019:presenter': 'eswc2019-persons:Diana_Maynard',
					},

					...coffee('morning', 10.5, 11),

					...session('Best of In-Use', 11, 12.5, {
						location: SC1_EMERALD_1,
						talks: [
							`Using Shape Expressions (ShEx) to Share RDF Data Models and to Guide Curation with Rigorous Validation
								Katherine Thornton | Harold Solbrig | Gregory Stupp | Jose Emilio Labra Gayo | Daniel Mietchen | Eric Prud’Hommeaux | Andra Waagmeester`,
							`TinderBook: Fall in Love with Culture
								Enrico Palumbo | Alberto Buzio | Andrea Gaiardo | Giuseppe Rizzo | Raphaël Troncy | Elena Baralis`,
							`Legislative document content extraction based on Semantic Web technologies – A use case about processing the History of the Law
								Francisco Cifuentes-Silva | Jose Emilio Labra Gayo`,
						],
					}),

					...lunch(),

					...session('Enhancing Semantic Resources', 14, 15.5, {
						location: SC1_EMERALD_1,
						talks: [
							`Explore and Exploit – Dictionary Expansion with Human-in-the-Loop
								Anna Lisa Gentile | Daniel Gruhl | Petar Ristoski | Steve Welch`,
							`Aligning Metadata with Ontology Terms Using Clustering and Embeddings
								Rafael S Gonçalves | Maulik R Kamdar | Mark A Musen`,
							`Retrieving Textual Evidence for Knowledge Graph Facts
								Gonenc Ercan | Shady Elbassuoni | Katja Hose`,
						],
					}),

					...session('Ontology Design, Validation and Licensing', 14, 15.5, {
						location: SC1_EMERALD_2,
						talks: [
							`CORAL: A corpus of ontological requirements annotated with Lexico-Syntactic Patterns
								Alba Fernández-Izquierdo | María Poveda-Villalón | Raúl García-Castro`,
							`SHACL Constraint Validation over Ontology-enhanced KGs via Rewriting
								Ognjen Savkovic | Evgeny Kharlamov | Steffen Lamparter`,
							`Modelling the Compatibility of Licenses
								Benjamin Moreau | Patricia Serrano Alvarado | Matthieu Perrin | Emmanuel Desmontils`,
						],
					}),

					...session('EU Project Networking', 14, 15.5, {
						location: SC1_ADRIA,
					}),

					...coffee('afternoon', 15.5, 16),

					...session('SE and Applications', 16, 17.5, {
						location: SC1_EMERALD_1,
						talks: [
							`The Location Index: A Semantic Web Spatial Data Infrastructure
								Nicholas John Car | Paul Box | Ashley Sommer`,
							`BiographySampo – Publishing and Enriching Biographies on the Semantic Web for Digital Humanties Research
								Eero Hyvönen | Petri Leskinen | Minna Tamper | Heikki Rantala | Esko Ikkala | Jouni Tuominen | Kirsi Keravuori`,
							`ToCo: An ontology for representing hybrid telecommunication networks
								Qianru Zhou | Alasdair Gray | Steve Mclaughlin`,
						],
					}),

					...session('Research and Scholarly Data', 16, 17.5, {
						location: SC1_EMERALD_2,
						talks: [
							`Disclosing Citation Meanings for Augmented Research Retrieval and Exploration
								Roger Ferrod | Claudio Schifanella | Luigi Di Caro | Mario Cataldi`,
							`RVO – The Research Variable Ontology
								Madhushi Bandara | Fethi A. Rabhi | Ali Behnaz`,
							`Predicting Entity Mentions in Scientific Literature
								Yalun Zheng | Jon Ezeiza | Mehdi Farzanehpour | Jacopo Urbani`,
						],
					}),

					...session('EU Project Networking', 16, 17.5, {
						location: SC1_ADRIA,
					}),

					[`eswc2019-${s_day}:Gala_Dinner`]: {
						a: ['conference:SocialEvent', 'conference:Meal'],
						'rdfs:label': `@en"Gala_Dinner`,
						...time(19, 22),
					},
				},
			});
			break;
		}

		case 'thursday': {
			let sc1_keynote = '>https://2019.eswc-conferences.org/keynote-daniele-quercia/';

			ds_out.write({
				type: 'c3',
				value: {
					...people.c3('Daniele Quercia', {
						'conference:holdsRole': sc1_keynote_speaker,
					}),

					[sc1_keynote_speaker]: {
						a: 'conference:PublishingRoleDuringEvent',
						'conference:during': sc1_keynote,
						'conference:withRole': 'role:presenter',
					},

					// keynote
					[sc1_keynote]: {
						// 'rdfs:label': '@en"Adding value to NLP: a little semantics goes a long way',
						// 'rdfs:description': '@en"Natural language processing technology is now ubiquitous, even if there are still many challenges to be faced in its development. From sentiment analysis to machine translation to chatbots; from medical systems to online shopping to fake news; even if not visibly apparent, NLP tools are now lurking hidden in the depths of an enormous number and range of real-world systems and applications. Techniques have advanced in many directions in the last 20 years thanks primarily to developments in machine learning and deep learning technologies, and to the concomitant creation of and attention to language resources. In this talk, I shall examine the role of semantics in NLP applications. It is perhaps surprising that despite recent advances in Semantic Web technology and NLP, researchers and practitioners in domains ranging from journalism to rocket science have yet to grasp their potential, and are still manually grappling feral spreadsheets and databases. I shall discuss how NLP infused with even small amounts of semantics can be a drastic game-changer in fields as diverse as crisis communication, politics, journalism, medicine, literature, and history, using examples from some of our recent projects and applications.',
						...event('talk'),
						...time(9.5, 10.5),
						'eswc2019:presenter': 'eswc2019-persons:Daniele_Quercia',
					},

					...coffee('morning', 10.5, 11),

					...session('Best of Research', 11, 12.5, {
						location: SC1_EMERALD_1,
						talks: [
							`Learning URI Selection Criteria to Improve the Crawling of Linked Open Data
								Hai Huang | Fabien Gandon`,
							`Latent Relational Model for Relation Extraction
								Gaetano Rossiello | Alfio Gliozzo | Nicolas Fauceglia | Giovanni Semeraro`,
							`Mini-ME Swift: the first OWL reasoner for iOS
								Michele Ruta | Floriano Scioscia | Filippo Gramegna | Ivano Bilenchi | Eugenio Di Sciascio`,
						],
					}),

					...lunch(),

					// ...session('Ontologies: Reasoning and Learning', 14, 15.5, {
					// 	location: SC1_EMERALD_1,
					// 	talks: [
					// 		`Deontic reasoning for legal ontologies
					// 			Cheikh Kacfah Emani | Yannis Haralambous`,
					// 		`GConsent: A Consent Ontology based on the GDPR
					// 			Harshvardhan J. Pandit | Christophe Debruyne | Declan O’sullivan | Dave Lewis`,
					// 		`A Hybrid Graph Model for Distant Supervision Relation Extraction
					// 			Shangfu Duan | Huan Gao | Bing Liu | Guilin Qi`,
					// 	],
					// }),

					...session('Ontologies: Reasoning and Learning', 14, 15.5, {
						location: SC1_EMERALD_1,
						talks: [
							`Deontic reasoning for legal ontologies
								Cheikh Kacfah Emani | Yannis Haralambous`,
							`A Decentralized Architecture for Sharing and Querying Semantic Data
								Christian Aebeloe | Gabriela Montoya | Katja Hose`,
							`A Recommender System for Complex Real-World Applications with Nonlinear Dependencies and Knowledge Graph Context
								Marcel Hildebrandt | Swathi Shyam Sunder | Serghei Mogoreanu | Mitchell Joblin | Ingo Thon | Akhil Mehta | Volker Tresp`,
						],
					}),

					...session('Querying and Searching', 14, 15.5, {
						location: SC1_EMERALD_2,
						talks: [
							`A Decentralized Architecture for Sharing and Querying Semantic Data
								Christian Aebeloe | Gabriela Montoya | Katja Hose`,
							`An Ontology-Based Interactive Approach for Understanding User Queries
								Giorgos Stoilos | Szymon Wartak | Damir Juric | Jonathan Moore | Mohammad Khodadadi`,
							`Using Knowledge Graphs to Search an Enterprise Data Lake
								Stefan Schmid | Cory Henson | Tuan Tran`,
						],
					}),

					...session('KG Applications', 14, 15.5, {
						location: SC1_ADRIA,
						talks: [
							`A Recommender System for Complex Real-World Applications with Nonlinear Dependencies and Knowledge Graph Context
								Marcel Hildebrandt | Swathi Shyam Sunder | Serghei Mogoreanu | Mitchell Joblin | Ingo Thon | Akhil Mehta | Volker Tresp`,
							`Injecting Domain Knowledge in Electronic Medical Records to Improve Hospitalization Prediction
								Raphaël Gazzotti | Catherine Faron Zucker | Fabien Gandon | Virginie Lacroix-Hugues | David Darmon`,
							`NOVA: a Knowledge Base for the Node-RED IoT Ecosystem
								Arne Bröring | Victor Charpenay | Darko Anicic | Sebastien Puech`,
						],
					}),

					[`eswc2019-${s_day}:Closing_Ceremony`]: {
						a: ['conference:SocialEvent'],
						'rdfs:label': `@en"Closing Ceremony`,
						...time(15.5, 14),
					},

					...coffee('afternoon', 14, 15),
				},
			});
			break;
		}

		default: break;
	}
// }

	ds_out.end();
})();
