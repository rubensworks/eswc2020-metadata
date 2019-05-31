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
		...people.c3('Pascal Hitzler <http://www.pascal-hitzler.de/> [Wright State University, USA]', {
			'conference:holsRole': 'eswc2019:General_Chair',
		}),

		...people.c3('Miriam Fernandez [Open University, UK] | Krzysztof Janowicz [University of California, Santa Barbara, USA]', {
			'conference:holsRole': 'eswc2019:Program_Chair',
		}),

		...people.c3('Maria Maleshkova [Karlsruhe Institute of Technology (KIT), Germany] | Stefan Schlobach [Vrije Universiteit Amsterdam, Netherlands]', {
			'conference:holsRole': 'eswc2019:Workshops_and_Tutorials_Chair',
		}),

		...people.c3('Sabrina Kirrane <http://www.sabrinakirrane.com/> [Vienna University of Economics and Business, Austria] | Olaf Hartig <http://olafhartig.de/> [Linköping University, Sweden]', {
			'conference:holsRole': 'eswc2019:Posters_and_Demos_Chair',
		}),

		...people.c3('Victor de Boer <http://www.victordeboer.com/> [Vrije Universiteit Amsterdam, Netherlands] | Maria-Esther Vidal [Leibniz Information Centre For Science and Technology University Library, Germany, and Universidad Simon Bolivar, Venezuela]', {
			'conference:holsRole': 'eswc2019:PhD_Symposium_Chair',
		}),

		...people.c3('Katja Hose <http://www.cs.aau.dk/~khose> [Aalborg University, Denmark] | Ruben Verborgh <https://ruben.verborgh.org/> [Ghent University, Belgium, and Massachusetts Institute of Technology, USA]', {
			'conference:holsRole': 'eswc2019:Challenges_Chair',
		}),

		...people.c3('Laura Hollink <http://www.cwi.nl/~hollink/> [Centrum Wiskunde & Informatica, Netherlands] | Anna Tordai [Elsevier]', {
			'conference:holsRole': 'eswc2019:Sponsorship_Chair',
		}),

		...people.c3('Ioanna Lytra <http://sda.cs.uni-bonn.de/people/dr-ioanna-lytra/> [University of Bonn, Germany] | Laura Koesten [Open Data Institute, UK]', {
			'conference:holsRole': 'eswc2019:EU_Project_Networking',
		}),

		...people.c3('Nelia Lasierra [F. Hoffmann-La Roche AG] | Steffen Stadtmüller [Robert Bosch GmbH]', {
			'conference:holsRole': 'eswc2019:Industry_Chair',
		}),

		...people.c3('Agnieszka Ławrynowicz <http://www.cs.put.poznan.pl/alawrynowicz/> [Poznań University of Technology, Poland]', {
			'conference:holsRole': 'eswc2019:Publicity_Chair',
		}),

		...people.c3('Jędrzej Potoniec <http://www.cs.put.poznan.pl/jpotoniec/> [Poznań University of Technology, Poland]', {
			'conference:holsRole': ['eswc2019:Publicity_Chair', 'eswc2019:Webmaster'],
		}),

		...people.c3('Blake Regalia <https://blake-regalia.net/> [University of California, Santa Barbara, USA]', {
			'conference:holsRole': 'eswc2019:Semantic_Technologies_Coordinator',
		}),

		...people.c3('Karl Hammar <http://karlhammar.com/> [Jönköping University, Sweden]', {
			'conference:holsRole': 'eswc2019:Proceedings_Chair',
		}),

		...people.c3('Stefano Borgo [Istituto di Scienze e Tecnologie della Cognizione, Italy]', {
			'conference:holsRole': 'eswc2019:Local_Chair',
		}),

		...people.c3('Marija Komatar [PITEA d.o.o., Slovenia]', {
			'conference:holsRole': 'eswc2019:Local_Organizer',
		}),
	},
});


