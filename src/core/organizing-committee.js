const ttl_write = require('@graphy/content.ttl.write');

const {
	prefixes: H_PREFIXES,
} = require('../common/share.js');

const people = require('../common/people.js');

let ds_out = ttl_write({
	prefixes: H_PREFIXES,
});

ds_out.pipe(process.stdout);

ds_out.write({
	type: 'c3',
	value: {
		...people.c3('Andreas Harth <http://harth.org/andreas/> [Friedrich-Alexander University Erlangen-Nuremberg and Fraunhofer IIS-SCS]', {
			'conference:holdsRole': 'eswc2020:General_Chair',
		}),

		...people.c3('Sabrina Kirrane <http://sabrinakirrane.com/> [Vienna University of Economics and Business] | Axel Ngonga <http://dice-research.org> [Paderborn University]', {
			'conference:holdsRole': 'eswc2020:Program_Chair',
		}),

		...people.c3('Olaf Hartig <http://olafhartig.de/> [Linköping University] | Katja Hose <http://katja-hose.de/> [Aalborg University]', {
			'conference:holdsRole': 'eswc2020:Workshops_and_Tutorials_Chair',
		}),

		...people.c3('Valentina Presutti [University of Bologna] | Raphaël Troncy <http://www.eurecom.fr/~troncy/> [EURECOM]', {
			'conference:holdsRole': 'eswc2020:Posters_and_Demos_Chair',
		}),

		...people.c3('Maribel Acosta <https://www.aifb.kit.edu/web/Maribel_Acosta/en> [Karlsruhe Institute of Technology] | Axel Polleres <http://www.polleres.net> [Vienna University of Economics and Business]', {
			'conference:holdsRole': 'eswc2020:PhD_Symposium_Chair',
		}),

		/*...people.c3('Katja Hose <http://www.cs.aau.dk/~khose> [Aalborg University, Denmark] | Ruben Verborgh <https://ruben.verborgh.org/> [Ghent University, Belgium, and Massachusetts Institute of Technology, USA]', {
			'conference:holdsRole': 'eswc2020:Challenges_Chair',
		}),*/
            
    	...people.c3('Javier D. Fernández <https://www.linkedin.com/in/javierfernandez> [F. Hoffmann-La Roche AG] | Josiane Xavier Parreira <https://www.linkedin.com/in/josixp/> [Siemens AG Austria]', {
    		'conference:holdsRole': 'eswc2020:Industry_Chair',
    	}),    

		...people.c3('Victor Charpenay <https://www.vcharpenay.link/> [Friedrich-Alexander University Erlangen-Nuremberg]', {
			'conference:holdsRole': 'eswc2020:Sponsorship_Chair',
		}),

		...people.c3('Basil Ell <http://www.sc.cit-ec.uni-bielefeld.de/team/basil-ell/> [Bielefeld University]', {
			'conference:holdsRole': 'eswc2020:Project_Networking',
		}),

		...people.c3('Uldis Bojārs <https://www.linkedin.com/in/uldisbojars/> [University of Latvia and National Library of Latvia] | Valentina Ivanova <https://www.linkedin.com/in/valentinaivanova> [RISE Research Institutes of Sweden]', {
			'conference:holdsRole': 'eswc2020:Publicity_Chair',
		}),

		/*...people.c3('Jędrzej Potoniec <http://www.cs.put.poznan.pl/jpotoniec/> [Poznań University of Technology, Poland]', {
			'conference:holdsRole': ['eswc2020:Publicity_Chair', 'eswc2020:Webmaster'],
		}),*/

		...people.c3('Ruben Taelman <https://www.rubensworks.net/#me> [Ghent University]', {
			'conference:holdsRole': 'eswc2020:Semantic_Technologies_Coordinator',
		}),

		...people.c3('Michael Cochez <hm.cochez@vu.nl> [VU Amsterdam]', {
			'conference:holdsRole': 'eswc2020:Proceedings_Chair',
		}),

		/*...people.c3('Stefano Borgo [Istituto di Scienze e Tecnologie della Cognizione, Italy]', {
			'conference:holdsRole': 'eswc2020:Local_Chair',
		}),

		...people.c3('Marija Komatar [PITEA d.o.o., Slovenia]', {
			'conference:holdsRole': 'eswc2020:Local_Organizer',
		}),*/
	},
});


