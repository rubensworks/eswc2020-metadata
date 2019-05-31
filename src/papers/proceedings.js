const fs = require('fs');
const path = require('path');
const url = require('url');

const nth = require('nth');
const request = require('request');
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const ttl_write = require('@graphy/content.ttl.write');
const progress = require('progress');
const unzip_parse = require('unzipper').Parse;
const latex_parser = require('latex-parser').latexParser;
const json_parse = require('stream-json').parser;
const json_stream_array = require('stream-json/streamers/StreamArray').streamArray;

const {
	prefixes: H_PREFIXES,
	org_suffix,
	person_suffix,
	person_c1,
} = require('../common/share.js');

const s_cookie = process.env.ESWC_EASYCHAIR_COOKIE || process.argv[2];

let p_proceedings = 'https://easychair.org/proceedings/';
let p_download = path.resolve(__dirname, '../../build/download');

const A_SPIN = ['◜ ◝', ' ˉ◞', ' ˍ◝', '◟ ◞', '◜ˍ ', '◟ˉ '];
const F_SORT_PAPER_INDEX = (sc1_a, sc1_b) => +(/(\d+)$/.exec(sc1_a)[1]) - +(/(\d+)$/.exec(sc1_b)[1]);

const latex_content = g_token => g_token.arguments.map(g => convert_latex(g.latex).text).join('');

const convert_latex = (a_tokens) => {
	let s_text = '';
	let a_keywords = [];

	for(let g_token of a_tokens) {
		if('TeXRaw' === g_token.type) {
			s_text += g_token.text;
		}
		else if('Dollar' === g_token.type) {
			s_text += convert_latex(g_token.latex).text;
		}
		else if('TeXComm' === g_token.type) {
			let s_command = g_token.name;

			switch(s_command) {
				// ignore
				case 'vspace':
				case 'cite':  // >_>
				case 'label':
				case '\\': break;

				// characters
				case '{': {
					s_text += '{';
					break;
				}
				case '}': {
					s_text += '}';
					break;
				}
				case 'langle': {
					s_text += '<';
					break;
				}
				case 'rangle': {
					s_text += '>';
					break;
				}

				// semantic
				case 'emph':
				case 'textbf': {
					s_text += '*'+latex_content(g_token)+'*';
					break;
				}
				case 'textit': {
					s_text += '_'+latex_content(g_token)+'_';
					break;
				}
				case 'mathtt':
				case 'texttt':
				case 'query': {
					s_text += '`'+latex_content(g_token)+'`';
					break;
				}
				case 'footnote': {
					s_text += '<'+latex_content(g_token)+'>';
					break;
				}

				case 'url': {
					s_text += `<${latex_content(g_token)}>`;
					break;
				}

				case 'num':
				case 'mbox':
				case 'ann':
				case '': {
					s_text += latex_content(g_token);
					break;
				}

				// keywords
				case 'keywords': {
					for(let g_keyword of g_token.arguments[0].latex) {
						if('TeXRaw' === g_keyword.type) {
							a_keywords.push(g_keyword.text.trim());
						}
					}
					break;
				}

				// warn
				default: {
					// not ignorable
					if(g_token.arguments.length) {
						debugger;
						console.warn(`unknown command: '${s_command}'`);
					}
				}
			}
		}
	}

	return {
		text: s_text.trim(),
		keywords: a_keywords,
	};
};

const extract_latex = (a_tokens) => {
	for(let g_token of a_tokens) {
		if('abstract' === g_token.name && 'TeXEnv' === g_token.type) {
			return convert_latex(g_token.latex);
		}
		else if(Array.isArray(g_token.latex)) {
			let z_hit = extract_latex(g_token.latex);
			if(z_hit) {
				return z_hit;
			}
		}
	}
};

(async() => {
	let a_papers = [];
	let ds_papers = process.stdin
		.pipe(json_parse())
		.pipe(json_stream_array());

	for await(let {value:pf_paper} of ds_papers) {
		a_papers.push(pf_paper);
	}

	// mk progress bar
	let k_bar = new progress('[:bar] :percent :spin +:elapseds; -:etas; :paper', {
		incomplete: ' ',
		complete: '∎', // 'Ξ',
		width: 40,
		total: a_papers.length,
	});

	let a_proceedings = [];

	let ds_out = ttl_write({
		prefixes: H_PREFIXES,
	});

	ds_out.pipe(process.stdout);

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

		let $_paper = await rp({
			url: new url.URL(p_paper, p_proceedings),
			headers: {
				accept: 'text/html',
				cookie: s_cookie,
			},
			transform: s => cheerio.load(s),
		});

		let $_pdf = $_paper('tr#row9>td.value>a');
		let p_pdf = $_pdf.attr('href');
		let si_paper = $_pdf.text().replace(/\.pdf$/, '');
		let p_zip = $_paper('tr#row12>td.value>a').attr('href');
		let s_comment = $_paper('td#comment').text();

		if(!si_paper) {
			debugger;
		}

		{
			k_bar.tick(0, {
				paper: si_paper,
				spin: A_SPIN[i_spin++],
			});
			i_spin %= n_spin;
		}

		{
			let p_download_pdf = path.join(p_download, 'pdfs', si_paper+'.pdf');
			try {
				fs.accessSync(p_download_pdf, fs.constants.F_OK);
			}
			catch(e_access) {
				console.warn(`\ndownloading ${si_paper}.pdf`);
				request({
					url: new url.URL(p_pdf, p_proceedings),
					headers: {
						cookie: s_cookie,
					},
				}).pipe(fs.createWriteStream(p_download_pdf));
			}
		}

		{
			let p_download_zip = path.join(p_download, 'zips', si_paper+'.zip');
			try {
				fs.accessSync(p_download_zip, fs.constants.F_OK);
			}
			catch(e_access) {
				console.warn(`\ndownloading ${si_paper}.zip`);
				let ds_zip = request({
					url: new url.URL(p_zip, p_proceedings),
					headers: {
						cookie: s_cookie,
					},
				});

				// ds_zip.pipe(fs.createWriteStream(p_download_zip));

				ds_zip.pipe(unzip_parse())
					.on('entry', (ds_entry) => {
						let p_file = ds_entry.path;

						if(p_file.endsWith('.tex')) {
							let s_latex = '';
							ds_entry
								.on('data', (s_chunk) => {
									s_latex += s_chunk;
								})
								.on('end', () => {
									console.warn(`${si_paper} > ${p_file}`);

									let m_abstract = /\\begin\{abstract\}([^]*?)\\end\{abstract\}/.exec(s_latex);
									if(m_abstract && m_abstract[1]) {
										let stx_abstract = m_abstract[1];

										let z_result = convert_latex(latex_parser.parse(stx_abstract).value);
										if(!z_result) {
											console.warn(`failed to parse abstract tex: ${stx_abstract}`);
											return;
										}

										let {
											text: s_abstract,
											keywords: a_keywords,
										} = z_result;

										ds_out.write({
											type: 'c3',
											value: {
												[sc1_paper]: {
													'conference:abstract': '@en"'+s_abstract.trim()
														.replace(/``|''/g, '"')
														.replace(/\s*\n\s*/g, ' ')
														.replace(/\s{2,}/g, ' '),
													'conference:keyword': a_keywords.map(s => '@en"'+s),
												},
											},
										});
									}

									let m_keywords = /\\keyword\{([^]*?)\}/.exec(s_latex);
									if(m_keywords && m_keywords[1]) {
										let stx_keywords = m_keywords[1];

										let a_tokens = latex_parser.parse(stx_keywords).value;

										debugger;
										let a_keywords = [];
										for(let g_keyword of a_tokens) {
											if('TeXRaw' === g_keyword.type) {
												a_keywords.push(g_keyword.text.trim());
											}
										}
									}
								});
						}
						else {
							ds_entry.autodrain();
						}
					});
			}
		}

		let s_paper_id = si_paper.replace(/^paper_/, '');
		let sc1_paper = `eswc2019-proceedings:Paper.${s_paper_id}`;
		let sc1_author_list = `eswc2019-proceedings:Authors.${s_paper_id}`;

		let a_author_items = $_paper('table[id="ec:table2"] tbody>tr.cyan').toArray()
			.map((d_row, i_row) => {
				let a_row = $_paper(d_row).find('td').toArray().map(d => $_paper(d).text().trim().replace(/&nbsp;/g, ''));

				let s_full_name = a_row[0]+' '+a_row[1];
				let sc1_person = person_c1(s_full_name);
				let sc1_author = `eswc2019-proceedings:Author.${s_paper_id}.${i_row+1}`;
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
							'rdfs:label': `@en"${s_full_name}, ${nth.appendSuffix(i_row+1)} Author for Proceedings Paper ${s_paper_id}`,
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

		a_proceedings.push(sc1_paper);
		ds_out.write({
			type: 'c3',
			value: {
				[sc1_paper]: {
					a: ['eswc2019:ProceedingsPaper', 'conference:InProceedings'],
					'rdfs:label': '@en"'+$_paper('td#ptitle').text(),
					'conference:title': '@en"'+$_paper('td#ptitle').text(),
					'conference:isPartOf': 'eswc2019:Proceedings',
					'eswc2019:pdf': `^xsd:anyUri"${H_PREFIXES['eswc2019-object']}${si_paper}.pdf`,
					'bibo:numPages': '^xsd:integer"'+$_paper('td#pages').text(),
					'dct:issued': new Date($_paper('#time').text()+'Z'),
					...(s_comment? {'eswc2019:comment':'@en"'+s_comment}: {}),
					'eswc2019:authorList': [a_author_items.map(g => g.c1)],
					'eswc2019:submission': `eswc2019-submissions:Paper.${s_paper_id}`,
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
			'eswc2019:Conference': {
				'eswc2019:proceedings': [a_proceedings.sort(F_SORT_PAPER_INDEX)],
			},
		},
	});

	k_bar.tick(1, {
		paper: '',
		spin: ' ✓ ',
	});
})();
