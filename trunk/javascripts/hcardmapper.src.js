// dont clutter the global namespace
if (typeof com != 'object') com = {};
if (typeof com.omniacomputing != 'object') com.omniacomputing = {};

/**
 * @class {Object} com.omniacomputing.HCardMapper
 * 
 * @author 		Gordon Oheim 
 * @copyright	Omnia Computing (www.omnia-computing.de)
 * @namespace 	com.omniacomputing
 * @license 	MIT (see file hcardmapper.license.txt)
 * @version		0.97
 * 
 * @classDescription
 * The HCardMapper provides methods for reading hCards from a 
 * remote URI and set the values in the hCard to form values 
 * on the page the HCardMapper is used.
 * 
 * The HCardMapper requires Prototype.js as it makes use of
 * several functions of the Prototype.js API. The documentation 
 * below indicates usage of the Prototype API by the keyword 
 * @requires, in case you want to write an adapter.
 * 
 * The HCardMapper requires a proxy resource in order to get 
 * hCards from remote servers due to the Same Origin Policy that 
 * prevents AJAX calls from the clientside to be made to remote 
 * servers. The proxy should return JSON formatted hCards and adhere
 * to the structure suggested for jCards:
 * 
 * @see http://microjson.org/wiki/JCard
 * 
 * This version of HCardMapper uses mofo for a microformat parser.
 * Currently mofo does not stick to the jCard specs, which is why
 * the mapping function below will only work with mofo parsed json.
 * 
 * Setting up proxy and parser in Rails is as simple as:
 *
 * require 'mofo'
 * class ContactController < ApplicationController
 *   def hcard
 *     if request.xhr?
 *       @card = hCard.find params[:uri]
 *       render(:text => @card.to_json)
 *     else
 *       render :file => "#{RAILS_ROOT}/public/404.html",
 *       :status => 404 and return
 *     end
 *   end
 * end
 * 
 * Examples of serverside Microformat parsers below.
 * 
 * @see mofo 		http://mofo.rubyforge.org/
 * @see Scrapi		http://rubyforge.org/projects/scrapi
 * @see uFormats	http://rubyforge.org/projects/uformats
 * @see hKit		http://allinthehead.com/hkit
 * @see Optimus		http://microformatique.com/optimus/
 * @see ufXtract	http://lab.backnetwork.com/ufXtract/
 * 
 * mofo, hKit, Optimus and ufXtract are verfied to work properly
 * with the hCardMapper. None of the return jCards though.
 * 
 * @param {Object} config
 * @constructor 
 */
com.omniacomputing.HCardMapper = function HCardMapper(config) {

	// make config param optional
	var config = config || {};
	
	// but terminate construction phase if no mappings are specified
	if (!config.mappings) {
		if (typeof console == 'object') {
			console.error('You must specify a mappings literal in the config Object.');
		}
		return false;
	}

	/**
	 * @private {Object} msg
	 * 
	 * The message object holds all strings used throghout the application.
	 * You can override this by specifying a message object in your config
	 */
	var msg = {
		alreadyInitialized: 'HCardMapper is already initialized.',
		invalidHttpUri: 'Param is not a valid HTTP/HTTPS resource:',
		enterValidUri: 'Enter a valid URI',
		errorReadingUri: 'Error while reading URI',		
		missingFn: 'The hCard is invalid (missing FN property)',
		errorOnMapping: 'Error during HCard mapping: ',
		hCardIsNoObject: 'HCard property is not an object: ',
		generalException: 'Exception caught in',
		ajaxRequestFailed: 'AJAX Request failed: ',
		uriSelectorTriggerTitle: 'Click to activate the hCard Reader',
		uriSelectorTriggerLinkText: 'Use my hCard',
		uriSelectorMessage: 'Enter the URI where your hCard is located in the field below. Then click the button to fetch the hCard. To learn more about the hCard microformat visit <a href="http://microformats.org" rel="external">Microformats.org</a>',
		triggerButtonValue: 'Fetch hCard',
		resetButtonValue: 'Cancel',
		fieldsetLegend: 'Multiple hCards found. Which hCard listed below do you want to use?',
		fieldsetButton: 'Use selected hCard',
		indicatorText: 'Loading... ' 
	};
	if (typeof config.msg == 'object') {
		for (m in config.msg) msg[m] = config.msg[m];
	}

	/**
	 * @private {Boolean} initialized
	 * 
	 * True if the HCardMapper was already registered. Else false.
	 */
	var initialized = false;

	/**
	 * @private {String} ajaxLoader
	 * 
	 * The path to the loading indicator graphic used in the
	 * indicator template. Default is '/images/icons/ajax-loader.gif'.
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 */
	var loadIcon = config.loadIcon || '/images/icons/ajax-loader.gif';

	/**
	 * @private {String} triggerButton
	 * 
	 * Id attribute of the element that will trigger 
	 * the AJAX call to read the hCard on a click event.
	 * The default value for this is 'hcard-reader'.
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 */
	var triggerButton = config.triggerButton || 'hcard-reader';

	/**
	 * @private {String} resetButton
	 * 
	 * Id attribute of the element that will cancel 
	 * the uriSelector box.
	 * The default value for this is 'hcard-cancel'.
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 */
	var resetButton = config.resetButton || 'hcard-cancel';

	/**
	 * @private {String} hCardUri 
	 * 
	 * Id attribute of the element that holds the URI 
	 * to fetch the hCard from when the triggerButton 
	 * is clicked. 
	 * The default value for this is 'hcard-uri'.
	 * If this property is set in the initial config 
	 * object it will be set to the specified value.
	 */
	var hCardUri = config.hCardUri || 'hcard-uri';

	/**
	 * @private {String} proxy
	 * 
	 * URI of the proxy that will return the hCard(s).
	 * The proxy must return the hCard in JSON format.
	 * Proxy usage circumvents the Same Origin Policy.
	 * The default value for this is '/contact/hcard?uri='.
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 */
	var proxy = config.proxy || '/contact/hcard?uri=';

	/**
	 * @private {String} param
	 * 
	 * The param will be send as part of the proxy URI 
	 * and contains the remote uri string. The initial
	 * value for this is the value of the form element
	 * specified with hCardUri. 
	 * Setting the param should be done via the 
	 * updateParam() method to make sure the param gets 
	 * encoded properly.
	 * This property cannot be set through the initial 
	 * config object.
	 * 
	 * @requires Prototype.js 
	 */
	var param = null;

	/**
	 * @private {String} form
	 * 
	 * The element id of the form that the HCard will
	 * try to apply its values to. The default value is 
	 * document.forms[0].id, e.g. the first document in 
	 * the DOM.
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 */
	var form = config.form || document.forms[0];

	/**
	 * @private {Array} mapping
	 * 
	 * The mapping for the forms elements. This is a literal
	 * where the values specify the form elements id attribute 
	 * and the keys specifies the HCard properties to use.
	 * This MUST be specified in the config object or the
	 * construction phase will terminate with an error.
	 * Note that keys may not contain the '-' character. Always 
	 * use an underscore, e.g. street_address or postal_code.
	 */
	var mappings = config.mappings;

	/**
	 * @private {Object} HCard
	 * 
	 * Holds the hCard object to work with. This property 
	 * can be accessed via the getCurrentHCard() method.
	 * This property cannot be set through the initial 
	 * config object.
	 */
	var HCard;

	/**
	 * @private {Object} hCards
	 * 
	 * Holds a collection of hCards. Because we are using 
	 * evalJSON to convert the returned string from the 
	 * getHCardFromUri() method into an object, the type 
	 * of this property will be Object instead of Array.
	 * Use Prototypes Object.isArray() method to determine 
	 * if hCards behaves is an Array-like structure, e.g. 
	 * holds multiple HCard objects. This property can be
	 * accessed via the getHCards() method.
	 * This property cannot be set through the initial 
	 * config object. 
	 */
	var hCards;
	
	/**
	 * @private {String} insertBelowEl
	 * 
	 * The id of an element on the page the hCardMapper is 
	 * used, where the uriSelector template will be inserted
	 * below on register. Defaults to the first paragraph 
	 * element in the form.
	 */
	var insertBelowEl = config.insertBelowEl || $(form).down('p');
	
	/**
	 * @private {Template} uriSelector
	 * 
	 * The template for the URI selector dialogue. The user
	 * has to input a URI pointing to a page holding a valid
	 * hCard implementation.
	 * 
	 * @requires Prototype.js
	 */
	var uriSelector = new Template(
		'<div id="hcr">'
		+'<a href="javascript:hcr.toggle()" title="#{uriSelectorTriggerTitle}">#{uriSelectorTriggerLinkText}</a>'
		+'<div style="display:none"><p>#{uriSelectorMessage}</p>'
		+'<label for="#{hCardUri}">URI</label>'
		+'<input id="#{hCardUri}" name="hcard_uri" value="http://"/>'
		+'<input id="#{triggerButton}" type="button" value="#{triggerButtonValue}"/>'
		+'<input id="#{resetButton}" type="button" value="#{resetButtonValue}"/>'
		+'</div>'    
		+'</div>'	
	);

	/**
	 * @private {Template} foundCardsTemplate
	 * 
	 * The template used within the selectionFieldsetTemplate to 
	 * allow for selection of an hCard from a collection of hCards 
	 * in case the proxy returned multiple items from a ressouce.
	 * 
	 * @see showSelectionDialogue
	 * @see selectionFieldsetTemplate
	 */
	var foundCardsTemplate = new Template(
		'<input id="hcr-#{index}" name="hcr-hcard"'+
		' type="radio"  value="#{index}" style="display:inline"/>' +
		'<label for="hcr-#{index}">#{name}</label><br/>'
	);
	
	/**
	 * @private {Template} selectionFieldsetTemplate
	 * 
	 * This is the template for the selection dialogue in case  
	 * the proxy returned multiple items from a ressouce.
	 * 
	 * @see showSelectionDialogue
	 * @see foundCardsTemplate
	 */	
	var selectionFieldsetTemplate = new Template(
		'<fieldset id="hcr-select-dialogue" style="display:none">'+
		'<legend>#{fieldsetLegend}</legend>'+
		'#{html}'+
		'<input id="hcr-selector" type="button" value="#{fieldsetButton}"/>'+
		'</fieldset>'
	);

	/**
	 * @private {Template} indicator
	 * 
	 * The loading indicator shown during any Ajax Requests.
	 */
	var indicator = new Template(
		'<span id="hcr-status">#{indicatorText}<img src="#{loadIcon}" alt="Ajax Loading Indicator"></span>'
	);
	
	/**
	 * @private {Function} hcrToggle
	 * 
	 * toggles the display of the uriSelector on or off, e.g.
	 * blinds the uriSelector into the form or out of it.
	 * 
	 * @requires Prototype.js and Scriptaculous
	 */
	var hcrToggle = function() {
		var el = $('hcr').down('div');
		(el.visible()) ? new Effect.Fade(el) : new Effect.Appear(el);
	};

	/**
	 * @private {Function} register
	 * 
	 * Register the Event Handler for the Form Button that
	 * triggers the AJAX call to read from a remote URI.
	 * This property cannot be set through the initial 
	 * config object.
	 * 
	 * @requires Prototype.js
	 */
	var register = function() {
		if (initialized === true) {	
			if (typeof console == 'object') {
				console.warn(this, msg.alreadyInitialized);
			}
			return false;
		} else {
			var tpl = uriSelector.evaluate({
				hCardUri: hCardUri,
				uriSelectorTriggerTitle: msg.uriSelectorTriggerTitle,
				uriSelectorTriggerLinkText: msg.uriSelectorTriggerLinkText,	
				uriSelectorMessage: msg.uriSelectorMessage,			
				triggerButton:triggerButton,
				triggerButtonValue: msg.triggerButtonValue,
				resetButton: resetButton,
				resetButtonValue: msg.resetButtonValue
			});
			Element.insert(insertBelowEl, {after: tpl});
			Event.observe(triggerButton, 'click', getHCardFromUri);
			Event.observe(resetButton, 'click', hcrToggle);
			initialized = true;
			return true;
		}
	};

	/**
	 * @private {Function} updateParam
	 * 
	 * Encodes, sets and returns the param property if the
	 * param is a valid uri. Otherwise the function will log 
	 * the error to the Firebug console (if present) and sets 
	 * param to an empty string. This property cannot be set 
	 * through the initial config object.
	 * 
	 * @return {Boolean} true or false
	 * @requires Prototype.js 
	 */
	var updateParam = function() {
		str = $F(hCardUri).strip();
		if (!isUri(str)) {
			if (typeof console == 'object') {
				console.warn(msg.invalidHttpUri, str);
			}
			$(hCardUri).value = msg.enterValidUri;
			return false;
		}
		param = encodeURIComponent(str);
		return true;
	};

	/**
	 * @private {Function} isUri
	 * 
	 * Checks whether a given string is a resouce that can be 
	 * accessed via http or https. Returns true or false.
	 * @param {String} uri
	 */
	var isUri = function(uri) {
		var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
		return regexp.test(uri);
	};
	
	/**
	 * @private {Function} unique
	 * 
	 * Removes duplicate HCards from hCards array.
	 * 
	 * @see http://dev.kanngard.net/Permalinks/ID_20030114184548.html
	 * @param {Object}
	 */
	var unique = function(a) {

		var contains = function(a, e) {
			for(j=0;j<a.length;j++) { 
				if(Object.toJSON(a[j]) === Object.toJSON(e)) return true;
			}
			return false;
		};

		var tmp = new Array(0);
		for(i = 0; i < a.length; i++){
			if(!contains(tmp, a[i])){
				tmp.length += 1;
				tmp[tmp.length - 1] = a[i];
			}
		}
		return tmp;
	};

	/**
	 * @private {Function} showSelectionDialogue
	 * 
	 * Generates a list from the hCards property in a modal
	 * dialogue and asks the user to pick one hCard. Any
	 * selected hCard will be assigned as the working copy 
	 * and mapped to the form values.
	 * 
	 * @requires Prototype.js
	 */
	var showSelectionDialogue = function() {
		var index = 0;
		var html = '';
		hCards.each(function(hCard) {
			html += foundCardsTemplate.evaluate({
				index: index++, 
				name: buildFnAndOrg(hCard)
			});
		});
		html = selectionFieldsetTemplate.evaluate({
			html:html,
			fieldsetLegend: msg.fieldsetLegend,
			fieldsetButton: msg.fieldsetButton
		});
		if($('hcr-select-dialogue')) Element.remove('hcr-select-dialogue');
		Element.insert(triggerButton, {after: html});
		Event.observe('hcr-selector', 'click', function(e) {
			var form = Event.element(e).up('form');
			var sel = form.getInputs('radio', 'hcr-hcard').find(
				function(radio) { return radio.checked }
			);			
			HCard = hCards[sel.getValue()];
			new Effect.Fade($('hcr').down('div'), {
				afterFinish: function() { Element.remove('hcr-select-dialogue'); }
			});
			guessNFromFN();		
			mapHCardToFormFields();
		});
		new Effect.Appear($('hcr-select-dialogue'));
	};

	/**
	 * @private {Function} buildFnAndOrg
	 * 
	 * If the string cannot be build from the method's logic, the
	 * return value will be a string stating the method could not
	 * read this specific HCard.
	 * 
	 * @param {Object} hCard
	 * @return {String}
	 */
	var buildFnAndOrg = function(hCard) {
		var hCard = hCard || HCard;
		var fnAndOrg = msg.missingFn;
		if ( (hCard.org == hCard.fn) || ((!hCard.org) && (hCard.fn)) ) {
			return hCard.fn;
		}
		if ((hCard.org) && (hCard.fn)) {
			return hCard.fn + (
				(typeof hCard.org == 'string') ? ' ('+hCard.org+')' : '');
		}
		if ((hCard.n.familyName) && (hCard.givenName)){
			fnAndOrg = hCard.familyName + ', ' + hCard.givenName;
			fnAndOrg += (typeof hCard.org == 'string') ? ' ('+hCard.org+')' : '';
		}
		return fnAndOrg.unescapeHTML();
	};

	/**
	 * @private {Function} mapHCardToFormFields
	 * 
	 * This function will try to map all hCard values to values in
	 * form elements. The rules about what goes where are defined
	 * in mappings.
	 * 
	 * Any string found in the hCard object is supposed to be value.
	 * If an array is found, the first value will be used.
	 * Every object will get recursed.
	 * 
	 * The method expects the HCard object to be derived from a 
	 * jCard (microJSON). If the internal object structure does not 
	 * adhere to that specification, the mapping will likely fail.
	 * 
	 * This version uses the mofo parser, which does not stick to
	 * the jCard spec and therefor is customized to work with it.
	 * @see convertOpenStructToObject
	 * 
	 * @see http://microjson.org/wiki/JCard
	 * @requires Prototype.js
	 */
	var mapHCardToFormFields = function(currentObject, prop) {
		try {
			var o = (typeof currentObject == 'object') ? currentObject : HCard;
			interceptTypeValueObject(o, prop);
			for (p in o) {
				if (typeof o[p] === 'string') {
					o[p] = o[p].unescapeHTML();
					findPropertyInMapping(o,p,mappings);
				}
				else if(!Object.isArray(o[p])) {
					convertOpenStructToObject(o,p, prop || false);
				}
				else if(Object.isArray(o[p])) {
					o[p] = o[p][0];
					if (typeof o[p] === 'string') {
						findPropertyInMapping(o, p, mappings);
					} else {
						mapHCardToFormFields(o[p],p);
					}		
				}
			}
		} catch(e) {
			if (typeof console == 'object') {
				console.log(msg.errorOnMapping, e, o, HCard);
			}
		}
	};

	/**
	 * @private {Function} findPropertyInMapping
	 * 
	 * Tries to find a property in an HCard Json Object in the
	 * user specified mappings object. If the mapping object
	 * holds any objects, the method will recurse to try to find
	 * the given property in this object.
	 * 
	 * @param {Object} o The currentObject from mapHCardToFormFields
	 * @param {String} p A property in o
	 * @param {Object} ms The mappings object or an object from within
	 */
	var findPropertyInMapping = function(o,p,ms) {
		Object.keys(ms).find(function(m){
			if (typeof ms[m] == 'object') {
				findPropertyInMapping(o,p,ms[m]);
			}
			var match = p.toLowerCase().replace(/-/g,'_');
			if((m.toLowerCase() == match) && ($(ms[m]))) {
				$(ms[m]).value = o[p];
				return true;
			}
		});
	};
	
	/**
	 * @private {Function} convertOpenStructToObject
	 * 
	 * This is an auxiliary method for mapHCardToFormFields. The mofo 
	 * parser returns Type properties in Microformats in an OpenStruct
	 * data structure. This method converts the structure into an object.
	 * 
	 * If the OpenStruct does not have a type property, the auxiliary
	 * type property will be used. This is the initial property name 
	 * holding the OpenStruct, e.g. your eMail property might not have 
	 * a type property, but only a value property.
	 * 
	 * @param {Object} o The currentObject from mapHCardToFormFields
	 * @param {String} p A property in o
	 * @param {String} t Auxiliary type property
	 */
	var convertOpenStructToObject = function(o,p,t) {
		if (p === 'table') {
			var bag = {};
			if (o[p].type && o[p].value) {
				if (Object.isArray(o[p].type)) {
					var i = 0;
					o[p].type.each(function(t) {
						bag[t] = o[p].value[i];
						i++;
					}); 
				} else {
					bag[o[p].type] = o[p].value;
				}
				mapHCardToFormFields(bag);
			} else if(!o[p].type && o[p].value) {
				bag[t] = o[p].value;
				mapHCardToFormFields(bag);
			}
		}
		mapHCardToFormFields(o[p], p);
	};

	/**
	 * This is another auxiliary function used to get values from 
	 * the parsers hKit and Optimus.
	 * 
	 * @param {Object} o The currentObject from mapHCardToFormFields
	 * @param {String} t Auxiliary type property
	 */
	var interceptTypeValueObject = function(o, t){
		if (o !== null) {
			if (o.type && o.value) {
				var bag = {};
				bag[o.type] = o.value;
				mapHCardToFormFields(bag);
			}
			if (o.href && o.value) {
				var bag = {};
				bag[t] = o.value;
				mapHCardToFormFields(bag);
			}							
		}
	};
	
	/**
	 * @private {Function} guessNFromFN
	 * 
	 * Implied n optimization as suggested at microformats.org.
	 * 
	 * @see http://microformats.org/wiki/hcard#Implied_.22n.22_Optimization
	 * @requires Prototype.js
	 */
	var guessNFromFN = function() {
		if ((HCard.fn != HCard.org) && (!HCard.n)){
			if (HCard.fn.split(' ').length == 2) {
				var n = HCard.fn.split(' ');
				HCard.n = { 'given_name': n[0], 'family_name': n[1] };
				if (n[0].endsWith(',')) { 
            		HCard.n = {
						'given_name': n[1], 'family_name': n[0].substring(0, n[0].length-1)
					};
          		} else if( (n[1].endsWith('.')) && (n[1].length == 2) ){
            		HCard.n = {
						'given_name': n[0], 'family_name': n[1]
					};					
				}
			}
		}
	};

	/**
	 * @private {Function} getHCardFromUri
	 * 
	 * AJAX call to the specified proxy to fetch the hCard
	 * from a remote location. The proxy is necessary if the
	 * hCard resides on another domain. If no proxy is set up,
	 * the script will not work due to the Same Origin Policy.
	 * 
	 * The Ajax.Request will not fire if the specified hCardUri
	 * is not a valid HTTP URI. Any form data present when the
	 * Request is triggered will be reset.
	 * 
	 * Callbacks are onCreate, onComplete, onException, onFailure,
	 * onLoaded, onLoading and onSuccess. Callbacks can be 
	 * customized with the config object. Otherwise the default 
	 * callbacks will be used.
	 * 
	 * This property cannot be set through the initial config 
	 * object.
	 * 
	 * @requires Prototype.js
	 */
	var getHCardFromUri = function() {
		if (!updateParam()) return false;
		form.reset();
		$(hCardUri).value = decodeURIComponent(param);
		new Ajax.Request(
			proxy.concat(param), {
			method: 'get',
			evalJS:	false,
			onCreate: cbOnCreate,
			onComplete: cbOnComplete,
			onException: cbOnException,
			onFailure: cbOnFailure,
			onLoaded: cbOnLoaded,
			onLoading: cbOnLoading,
			onSuccess: cbOnSuccess
		});
	};
	
	/**
	 * The method sets the HCard and hCards properties.
	 * 
	 * The code below contains two Parser specific fixes:
	 * JSON returned by the Optimus parser will return any
	 * found hCard in a property hcard. ufXtract will return
	 * any hCards in a property vcard. Both will break the 
	 * guessFromFN method of the hCardMapper, which is why
	 * we need to get those properties on the root level of
	 * the JSON object.
	 *  
	 * @param {Object} r
	 */
	function assignAjaxResponse(r) {
		if (r.hcard) { // Optimus Parser workaround
			r = r.hcard;
		}
		if (r.vcard) { // ufXtract Parser workaround
			r = r.vcard[0];
		}
		if(Object.isArray(r)) { // all other parsers
			hCards = unique(rl);
			HCard = null;
		} else {
			hCards = null;
			HCard = r;
		}		
	};
	
	/**
	 * @private {Function} cbOnSuccess
	 * 
	 * Callback function for the onSuccess property of the
	 * AJAX request made in getHCardFromURI() method. This
	 * will evaluate the JSON reponse and call the assignment 
	 * method.
	 * 
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 *  
	 * @param {Object} transport
	 * @requires Prototype.js
	 */
	var cbOnSuccess = config.cbOnSuccess || function(transport) {
		var retVal = transport.responseText.evalJSON(true);
		assignAjaxResponse(retVal);
	};
	
	/**
	 * Callback function for the onCreate property of the
	 * AJAX Request made in getHCardFromURI() method. The 
	 * default behavior is to return true.
	 * 
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 * 
	 * @return {Boolean} true
	 * @requires Prototype.js
	 */
	var cbOnCreate = config.cbOnCreate || function() {
		return true;
	};
	
	/**
	 * Callback function for the onComplete property of the
	 * AJAX Request made in getHCardFromURI() method. The 
	 * default behavior is to check if there is multiple hCards
	 * and if so present the selection dialogue. If there is 
	 * only one card, the function to guess the name from fn
	 * is called before the entire HCard is used for mapping.
	 * 
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 * 
	 * @requires Prototype.js
	 */
	var cbOnComplete = config.cbOnComplete || function() {
		if ((Object.isArray(hCards)) && (hCards.length > 0)) {	
			showSelectionDialogue();
		}
		else if(typeof HCard == 'object') {
			guessNFromFN();
			mapHCardToFormFields();
		} 
		else {
			if (typeof console == 'object') {
				console.error(msg.hCardIsNoObject, HCard);
			}
			return false;		
		}
		if ($('hcr-status')) {
			Element.remove('hcr-status');
		}
		return true;
	};
	
	/**
	 * Callback function for the onCException property of the
	 * AJAX Request made in getHCardFromURI() method. The 
	 * default behavior is to send a warning message to the 
	 * Firebug console (if present).
	 * 
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 * 
	 * @param {Object} requester
	 * @param {Object} exception
	 * @return {Boolean} false
	 */
	var cbOnException = config.cbOnException || function(requester, exception) {
		if (typeof console == 'object') {
			console.error(msg.generalException, requester, 'with', exception);
		}
		if ($('hcr-status')) {
			Element.remove('hcr-status');
		}
		$(hCardUri).value = msg.errorReadingUri;
		return false;
	};

	/**
	 * Callback function for the onLoaded property of the
	 * AJAX Request made in getHCardFromURI() method. The 
	 * default behavior is to return true.
	 * 
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 * 
	 * @return {Boolean} true
	 */
	var cbOnLoaded = config.cbOnLoaded || function() {
		return true;
	};
	
	/**
	 * Callback function for the onLoading property of the
	 * AJAX Request made in getHCardFromURI() method. The 
	 * default behavior is to return true.
	 * 
	 * If this property is set in the initial config object 
	 * it will be set to the specified value.
	 * 
	 * @return {Boolean} true
	 */
	var cbOnLoading = config.cbOnLoading || function() {
		Element.insert($('hcr'), {
			top: indicator.evaluate({
				indicatorText: msg.indicatorText,
				loadIcon: loadIcon
			})
		});
	};
	/**
	 * Callback function for the onFailure property of the
	 * AJAX Request made in getHCardFromURI() method. 
	 * 
	 * If this property is set in the initial config object 
	 * it will be set to the specified value. The default 
	 * behavior is to send a warning message to the Firebug 
	 * console (if present).
	 * 
	 * @param {Object} transport
	 * @return {Boolean} true
	 */
	var cbOnFailure = config.cbOnFailure || function(transport) {
		if (typeof console == 'object') {
			console.error(msg.ajaxRequestFailed, transport);
		}
		Element.remove('hcr-status');
		$(hCardUri).value = msg.errorReadingUri;
		return false;
	};
	
	var publicObject = {
	
		/**
		 * @privileged {Function} init
		 *
		 * Wrapper for private register() method. Use this
		 * method if you did not specify register: true in
		 * the config object.
		 *
		 * @see register
		 */
		init: register,
		
		/**
		 * @privileged {Function} toggle
		 *
		 * Wrapper for private hcrToggle method. Turns the
		 * uriSelector Dialogue on/off.
		 *
		 * @see hcrToggle
		 */
		toggle: hcrToggle
	};
	
	// register listener if user specified register in the config object.
	if (config.register === true) register();
	if (config.debug === true) {
		publicObject['debug'] = function(json) {
			assignAjaxResponse(json);
			cbOnComplete();
		} 
	}	
	// return public object
	return publicObject;
};