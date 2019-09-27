const fs = require('fs');
const path = require('path');

const PD_SRC = 'src';

const PD_SRC_WORKSHOPS_TUTORIALS = path.join(PD_SRC, 'workshops_tutorials');
const PD_SRC_PROGRAM = path.join(PD_SRC, 'program');
const PD_SRC_PAPERS = path.join(PD_SRC, 'papers');
const PD_SRC_CORE = path.join(PD_SRC, 'core');


module.exports = {
	defs: {
		workshop_tutorial: fs.readdirSync(PD_SRC_WORKSHOPS_TUTORIALS),
		day: ['tuesday', 'wednesday', 'thursday'],
	},

	tasks: {
		all: 'build/**',

		clean: () => ({
			run: /* syntax: bash */ `
				rm -rf build/*
			`,
		}),
	},

	outputs: {
		build: {
			'union.ttl': () => ({
				deps: [
					'build/core/*',
					'build/workshops_tutorials/*',
					'build/program/*',
					'build/papers/*',
				],
				run: /* syntax: bash */ `
					npx graphy content.ttl.read --pipe util.dataset.tree --union --pipe content.ttl.write > union.ttl --inputs **/*.ttl
				`,
			}),

			core: {
				'ontology.ttl': () => ({
					link: path.join(PD_SRC_CORE, 'ontology.ttl'),
				}),

				'organizing-committee.ttl': () => ({
					deps: [path.join(PD_SRC_CORE, 'organizing-committee.js')],
					run: /* syntax: bash */ `
						node $1 > $@
					`,
				}),
			},

			workshops_tutorials: {
				':workshop_tutorial': ({workshop_tutorial:s_file}) => ({
					link: path.join(PD_SRC_WORKSHOPS_TUTORIALS, s_file),
				}),
			},

			program: {
				':day.ttl': ({day:s_day}) => ({
					deps: [
						path.join(PD_SRC_PROGRAM, 'gen.js'),
						'build/papers/proceedings.ttl',
					],
					run: /* syntax: bash */ `
						node $1 '${s_day}' < $2 > $@
					`,
				}),
			},

			papers: {
				'proceedings.ttl': () => ({
					deps: [
						'proceedings.js',
						'proceedings-list.json',
					].map(s => path.join(PD_SRC_PAPERS, s)),
					run: /* syntax: bash */ `
						mkdir -p build/download/pdfs build/download/zips
						node $1 < $2 > $@
					`,
				}),

				'reviews.ttl': () => ({
					deps: [
						'reviews.js',
						'submissions-tracks.json',
					].map(s => path.join(PD_SRC_PAPERS, s)),
					run: /* syntax: bash */ `
						node $1 < $2 > $@
					`,
				}),

				'dois.ttl': () => ({
					deps: [
						'src/papers/dois.js',
						'build/papers/proceedings.ttl',
						'src/papers/dois.json',
					],
					run: /* syntax: bash */ `
						node $1 < $2 > $@
					`,
				}),
			},
		},
	},
};
