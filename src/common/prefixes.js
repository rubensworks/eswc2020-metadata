const P_IRI_ESWC2020 = 'https://metadata.2020.eswc-conferences.org/rdf';

module.exports = {
	rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
	xsd: 'http://www.w3.org/2001/XMLSchema#',
	foaf: 'http://xmlns.com/foaf/0.1/',
	earl: 'http://www.w3.org/ns/earl#',
	dct: 'http://purl.org/dc/terms/',
	bibo: 'http://purl.org/ontology/bibo/',
	conference: 'https://w3id.org/scholarlydata/ontology/conference-ontology.owl#',
	role: 'https://w3id.org/scholarlydata/role/',
	eswc2020: P_IRI_ESWC2020+'/ontology/',
	'eswc2020-persons': P_IRI_ESWC2020+'/persons/',
	'eswc2020-affiliations': P_IRI_ESWC2020+'/affiliations/',
	'eswc2020-organizations': P_IRI_ESWC2020+'/organizations/',
	'eswc2020-sites': P_IRI_ESWC2020+'/sites/',
	'eswc2020-proceedings': P_IRI_ESWC2020+'/proceedings/',
	'eswc2020-submissions': P_IRI_ESWC2020+'/submissions/',
	'eswc2020-talks': P_IRI_ESWC2020+'/talks/',
	'eswc2020-object': P_IRI_ESWC2020.replace(/\/rdf$/, '/object/'),
	'eswc2020-datatype': P_IRI_ESWC2020+'/datatype/',
	'eswc2020-tuesday': P_IRI_ESWC2020+'/program/tuesday/',
	'eswc2020-wednesday': P_IRI_ESWC2020+'/program/wednesday/',
	'eswc2020-thursday': P_IRI_ESWC2020+'/program/thursday/',
	'eswc2020-friday': P_IRI_ESWC2020+'/program/friday/',
	'hotel-knossos': 'https://www.aldemarknossosroyal.gr/events/conferences/',
	owl: 'http://www.w3.org/2002/07/owl#',
	fr: 'http://purl.org/spar/fr/',
	frbr: 'http://purl.org/vocab/frbr/core#',
	bido: 'http://purl.org/spar/bido/',
	cito: 'http://purl.org/spar/cito/',
	fabio: 'http://purl.org/spar/fabio/',
	c4o: 'http://purl.org/spar/c4o/',
	datacite: 'http://purl.org/spar/datacite/',
	literal: 'http://www.essepuntato.it/2010/06/literalreification/',
};
