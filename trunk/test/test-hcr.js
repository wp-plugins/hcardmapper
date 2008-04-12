/**
 * Reusable fully configured hCardMapper constructor wrapper
 */
Test.Unit.Runner.createFullHCR = function() {
	return new com.omniacomputing.HCardMapper({
		register: true,
		debug: true,
		mappings: {
			given_name: 'first',
			family_name: 'last',
			tel: {tel: 'phone', work: 'phone', cell:'phone'},
			email: 'email',
			org: {org: 'company', organization_name: 'company'},
			url: 'website',
			street_address: 'street',
			postal_code: 'zip',
			locality: 'town' 
		}
	});
}

/**
 * Holds various example JSON reponse for Unit Testing
 */
Test.Unit.Runner.Json = {

	/**
	 * Example JSON as returned by hKit
	 */
	hkit: {
		"fn": "Omnia Computing, Oheim & S\u00e4dtler GbR",
		"adr": {
			"street-address": "Arenbergstra\u00dfe 13a",
			"postal-code": "46238",
			"country-name": "Deutschland",
			"type": "work",
			"locality": "Bottrop"
		},
		"email": "info@omnia-computing.de",
		"org": "Omnia Computing, Oheim & S\u00e4dtler GbR",
		"tel": [{
			"type": "tel",
			"value": "0201 3839911"
		}, {
			"type": "fax",
			"value": "0201 3839916"
		}],
		"url": "http:\/\/www.omnia-computing.de"
	},
	
	/**
	 * Example JSON as returned by mofo
	 */
	mofo: {
		"url": null,
		"org": "Omnia Computing, Oheim \u0026amp; S\u00e4dtler GbR",
		"adr": {
			"postal_code": "46238",
			"type": "work",
			"street_address": "Arenbergstra\u00dfe 13a",
			"locality": "Bottrop",
			"properties": ["type", "country_name", "postal_code", "street_address", "locality"],
			"country_name": "Deutschland"
		},
		"tel": {
			"table": {
				"type": ["tel", "fax"],
				"value": ["0201 3839911", "0201 3839916"]
			}
		},
		"properties": ["fn", "email", "adr", "url", "tel", "org"],
		"fn": "Omnia Computing, Oheim \u0026amp; S\u00e4dtler GbR",
		"email": "info@omnia-computing.de"
	},
	
	/**
	 * Example JSON as returned by optimus.
	 * Note the invalid fn
	 */	
	optimus: {
		from: "http://pfefferle.org/static/microformats/hcard-test.html",
		title: "hCard Test",
		hcard: {
			"adr": {
				"street-address": "Street",
				"region": "State",
				"locality": "City",
				"postal-code": "12345",
				"country-name": "Country"
			},
			"email": {
				href: "mailto:mail@examle.org",
				value: "mail@examle.org"
			},
			"fn": "Mustermann Max",
			"org": "Organisation",
			"tel": "111-222-333",
			url: [
				"http://example.org", 
				"http://pfefferle.org/static/microformats/aim:goim?screenname=aim", 
				"http://pfefferle.org/static/microformats/ymsgr:sendIM?yim"
		    ]
		}
	},
	
	/**
	 * Example JSON as returned by ufXtract
	 * Note the invalid fn
	 */
	ufxtract: {
		"vcard": [{
			"fn": "Mustermann Max",
			"n": {
				"given-name": ["Max"],
				"family-name": ["Mustermann"]
			},
			"adr": [{
				"street-address": ["Street"],
				"locality": "City",
				"region": "State",
				"postal-code": "12345",
				"country-name": "Country"
			}],
			"org": {
				"organization-name": "Organisation"
			},
			"email": ["mail@examle.org"],
			"tel": ["111-222-333"],
			"url": [
				"http:\/\/example.org",
				"aim:goim?screenname=aim",
				"ymsgr:sendIM?yim"
			]
		}]
	}
}

/**
 * Actual Unit tests for the hCardMapper script
 */
new Test.Unit.Runner({

	/**
	 * This test checks if the example JSON date is available
	 * in Test.Unit.Runner.Json (defined above)
	 */
	test_exampleJsonIsIncluded: function () {
		this.assertEqual(typeof Test.Unit.Runner.Json, 'object');
		this.assertNotNull(Test.Unit.Runner.Json.hkit);
		this.assertNotNull(Test.Unit.Runner.Json.mofo);
		this.assertNotNull(Test.Unit.Runner.Json.optimus);
		this.assertNotNull(Test.Unit.Runner.Json.ufxtract);
	},

	/**
	 * This test checks if the hCardMapper script is available
	 * in the test setup.
	 */
	test_hCardMapperIsIncluded: function () {
		this.assertNotNull(com.omniacomputing.HCardMapper);
		this.assertEqual(typeof com.omniacomputing.HCardMapper, 'function');
	},

	/**
	 * This test checks that the init method of the hCardMapper
	 * does not yield a usable hCardMapper object when no 
	 * mappings are specified in the config object. 
	 */
	test_setupWithoutMappingsDoesFail: function () {
		var hcr = new com.omniacomputing.HCardMapper();
		this.assertNull(hcr.init);
		this.assertNull(hcr.toggle)
	},
	
	/**
	 * This test checks that the init method of the hCardMapper
	 * does yield a usable hCardMapper object when mappings 
	 * are specified in the config object. 
	 */
	test_setupWithMappingsDoesNotFail: function () {
		var hcr = new com.omniacomputing.HCardMapper({
			mappings: { /* empty for testing */},
			debug: true
		});
		this.assertEqual(typeof hcr.init, 'function');
		this.assertEqual(typeof hcr.toggle, 'function')
		this.assertEqual(typeof hcr.debug, 'function')
	},

	/**
	 * This test checks if the uriSelector template gets
	 * properly inserted into the DOM when the register
	 * method is called in the hCardMapper. 
	 */
	test_initMethodInsertsUriSelector: function () {
		var hcr = new com.omniacomputing.HCardMapper({
			register: true,
			mappings: { /* empty for testing */}
		});
		var insertBelowEl = document.forms[0].down('p');
		this.assert($('hcr') instanceof HTMLElement);
		this.assert(insertBelowEl.next() instanceof HTMLElement);
		this.assertEqual($('hcr'),insertBelowEl.next());
		Element.remove($('hcr'));
	},
	
	/**
	 * This test checks the correct functionality of the
	 * implied n optimization method getNFromFN inside
	 * the hCardMapper. 
	 */
	test_getNFromFN: function() {
		hcr = Test.Unit.Runner.createFullHCR();
		// first name comes first
		document.forms[0].reset();
		hcr.debug({fn: "Max Mustermann"});
		this.assertEqual($('first').value,'Max');
		this.assertEqual($('last').value,'Mustermann');		
		
		// last name comes first
		document.forms[0].reset();
		hcr.debug({fn: "Mustermann, Max"});
		this.assertEqual($('first').value,'Max');
		this.assertEqual($('last').value,'Mustermann');		
		
		// last name is second and shortened
		document.forms[0].reset();
		hcr.debug({fn: "Max M."});
		this.assertEqual($('first').value,'Max');
		this.assertEqual($('last').value,'M.');		
		
		// n is given and fn is not org
		document.forms[0].reset();
		hcr.debug({fn: "Max M.", n:{given_name:'Tom'}});
		this.assertEqual($('first').value,'Tom');
		this.assertEqual($('last').value,'');		
		
		// n is given and fn is org
		document.forms[0].reset();
		hcr.debug({fn: "ACME", org:'ACME',n:{}});
		this.assertEqual($('first').value,'');
		this.assertEqual($('last').value,'');
		
		Element.remove($('hcr'));
	},
	
	/**
	 * This test checks if any malicious code is stripped
	 * from the json to prevent xss attacks.
	 */
	test_maliciousElementsGetRemoved: function() {
		hcr = Test.Unit.Runner.createFullHCR();
		
		// inserting html has no effect
		document.forms[0].reset();
		hcr.debug({fn: "<h1>John</h1> <script>alert('Doe')</script>"});
		this.assertEqual($('first').value,'John'.unescapeHTML());
		this.assertEqual($('last').value,'alert(\'Doe\')'.unescapeHTML());

		// inserting quotes has no effect  
		document.forms[0].reset();
		hcr.debug({fn: 'John Doe', postal_code:'"/>Peekabo!'});
		this.assertEqual($('zip').value,'"/>Peekabo!'.unescapeHTML());

		Element.remove($('hcr'));
	},
	
	/**
	 * This test checks if the example JSON date from
	 * Test.Unit.Runner.Json.hkit is mapped properly
	 * onto the (hidden) form field on the test page.
	 */
	test_mapJsonFromHKit: function() {
		document.forms[0].reset();
		hcr = Test.Unit.Runner.createFullHCR();
		hcr.debug(Test.Unit.Runner.Json.hkit);
		this.assertEqual($('first').value,'');
		this.assertEqual($('last').value,'');
		this.assertEqual($('phone').value, "0201 3839911");
		this.assertEqual($('email').value, "info@omnia-computing.de");
		this.assertEqual($('company').value, "Omnia Computing, Oheim & S\u00e4dtler GbR".unescapeHTML());
		this.assertEqual($('website').value, "http:\/\/www.omnia-computing.de".unescapeHTML());
		this.assertEqual($('street').value, "Arenbergstra\u00dfe 13a".unescapeHTML());
		this.assertEqual($('zip').value, "46238");
		this.assertEqual($('town').value, "Bottrop");
		Element.remove($('hcr'));
	},
	
	/**
	 * This test checks if the example JSON date from
	 * Test.Unit.Runner.Json.mofo is mapped properly
	 * onto the (hidden) form field on the test page.
	 */	
	test_mapJsonFromMofo: function() {
		document.forms[0].reset();
		hcr = Test.Unit.Runner.createFullHCR();
		hcr.debug(Test.Unit.Runner.Json.mofo);
		this.assertEqual($('first').value,'');
		this.assertEqual($('last').value,'');
		this.assertEqual($('phone').value, "0201 3839911");
		this.assertEqual($('email').value, "info@omnia-computing.de");
		this.assertEqual($('company').value, "Omnia Computing, Oheim \u0026amp; S\u00e4dtler GbR".unescapeHTML());
		this.assertEqual($('website').value, '');
		this.assertEqual($('street').value, "Arenbergstra\u00dfe 13a".unescapeHTML());
		this.assertEqual($('zip').value, "46238");
		this.assertEqual($('town').value, "Bottrop");
		Element.remove($('hcr'));
	},
	
	/**
	 * This test checks if the example JSON date from
	 * Test.Unit.Runner.Json.optimus is mapped properly
	 * onto the (hidden) form field on the test page.
	 */	
	test_mapJsonFromOptimus: function() {
		document.forms[0].reset();
		hcr = Test.Unit.Runner.createFullHCR();
		hcr.debug(Test.Unit.Runner.Json.optimus);
		// example data uses wrong fn and no n property
		this.assertEqual($('first').value, 'Mustermann');
		this.assertEqual($('last').value, 'Max');
		this.assertEqual($('phone').value, "111-222-333");
		this.assertEqual($('email').value, "mail@examle.org");
		this.assertEqual($('company').value, "Organisation");
		this.assertEqual($('website').value, "http://example.org".unescapeHTML());
		this.assertEqual($('street').value, "Street");
		this.assertEqual($('zip').value, "12345");
		this.assertEqual($('town').value, "City");
		Element.remove($('hcr'));
	},
	
	test_mapJsonFromUfXtract: function() {
		document.forms[0].reset();
		hcr = Test.Unit.Runner.createFullHCR();
		hcr.debug(Test.Unit.Runner.Json.ufxtract);
		// example data uses wrong fn but has valid n property
		this.assertEqual($('first').value, 'Max');
		this.assertEqual($('last').value, 'Mustermann');
		this.assertEqual($('phone').value, "111-222-333");
		this.assertEqual($('email').value, "mail@examle.org");
		this.assertEqual($('company').value, "Organisation");
		this.assertEqual($('website').value, "http:\/\/example.org".unescapeHTML());
		this.assertEqual($('street').value, "Street");
		this.assertEqual($('zip').value, "12345");
		this.assertEqual($('town').value, "City");
		Element.remove($('hcr'));
	}	

});