var xmlrpc = require('xmlrpc'),
	restify = require('restify');

// Creates an XML-RPC client. Passes the host information on where to
// make the XML-RPC calls.
var client = xmlrpc.createClient({ host: '46.137.212.8', port: 8069, path: '/xmlrpc/common'})

getCloudmallToken();

function getCloudmallToken() {
	console.log("\n\n***************** GET TOKEN");
	
	// Get a connection to TEA ready, so we'll be able to get a token
	var teaClient = restify.createJsonClient({
	    url: 'http://localhost:8080'
	});
	
	var json = { "projectName" : "cloudmall" };
	
	teaClient.post('/getToken', json, function(err, req, res, obj) {
		var token = obj.access_token;
		if (token == null || token == "") {
			console.log("***************** NO TOKEN FOUND");
			var documents = [ ];
			console.log("***************** LOGIN");
			// Sends a method call to the XML-RPC server
			client.methodCall('login', ['cloudmall-dev', 'admin', 'mouse1'], function (error, value) {
				if (error) console.log("error:", error);
				console.log('Method response: ', value)
				
				documents = {
					"projectName" : "cloudmall",
					"description" : "tea-openerp token",
					"host" : "46.137.212.8",
					"port" : 8069,
					"db_name" : "cloudmall-dev",
					"db_uid" : value,
					"db_user" : "admin",
					"db_pass" : "mouse1",
					"accessToken" : "33b68536a4cc468195276652dc3cd7db"
				};
				
				newCloudmallToken(documents);
			});
		} else {
			console.log("***************** TOKEN FOUND");
			getCloudmallTokenDetails(token);
		}
	});
}

function getCloudmallTokenDetails(token) {
	console.log("\n\n***************** GET TOKEN DETAILS");
	
	// Get a connection to TEA ready, so we'll be able to get token details
	var teaClient = restify.createJsonClient({
	    url: 'http://localhost:8080'
	});
	
	var json = { "accessToken" : token };
	
	teaClient.post('/getTokenDetails', json, function(err, req, res, obj) {
		console.log("***************** LOGIN");
		// Sends a method call to the XML-RPC server
		client.methodCall('login', [obj.db_name, obj.db_user, obj.db_pass], function (error, value) {
			if (error) console.log("error:", error);
			console.log('Method response: ', value)
				
			readPartners(obj);
		});
	});
}

function newCloudmallToken(documents) {
	console.log("\n\n***************** CREATE NEW TOKEN AND GET DETAILS");
	
	// Get a connection to TEA ready, so we'll be able to create new token and get it's details
	var teaClient = restify.createJsonClient({
	    url: 'http://localhost:8080'
	});
	
	teaClient.post('/getNewToken', documents, function(err, req, res, obj) {
		readPartners(obj);
	});
}

function readPartners(tokenDetails) {
	console.log("\n\n***************** READ PARTNERS");

	var params = [
		tokenDetails.db_name,
		tokenDetails.db_uid,
		tokenDetails.db_pass,
		'res.partner',
		'read',
		[ 3, 4 ], // IDs
		[ 'name', 'title', 'email' ]
	];
	
	client.setPathname('/xmlrpc/object');
	client.methodCall('execute', params, function(error, value) {
		// Results of the method response
		if (error) console.log("error:", error);
		console.log('Method response: ', value);
		
		// Move on to the next
		searchProducts(tokenDetails);
		
		searchCategories(tokenDetails);
	});
}

function searchPartners(tokenDetails) {
	console.log("\n\n***************** SEARCH PARTNERS");

	var params = [
		tokenDetails.db_name,
		tokenDetails.db_uid,
		tokenDetails.db_pass,
		'res.partner',
		'search',
		[] // criteria
	];
	client.setPathname('/xmlrpc/object');
	client.methodCall('execute', params, function(error, value) {
		// Results of the method response
		if (error) console.log("error:", error);
		console.log('Method response: ', value);
		
		// Load each of these in term
		var record_ids = value;
		var num_records = record_ids.length;
		var batch_size = 20;
		console.log("Num =" + num_records)

		var getNext = function(index) {
			console.log("------------------- " + index);
			if (index >= num_records) {
				return; // all finished
			}

			// Get a limited number at a time
			var remaining = num_records - index;
			if (remaining > batch_size) {
				remaining = batch_size;
			}
			var ids = [ ];
			for (var i = 0; i < remaining; i++) {
				var id = record_ids[index + i];
				ids.push(id);
			}
			index += remaining;
			
			
			
			var params = [
				tokenDetails.db_name,
				tokenDetails.db_uid,
				tokenDetails.db_pass,
				'res.partner',
				'read',
				ids,
//				[ record_ids[index] ], // IDs
				[ 'name', 'title', 'email' ]
			];
			client.setPathname('/xmlrpc/object');
			client.methodCall('execute', params, function(error, value) {
				// Results of the method response
				if (error) console.log("error:", error);
				console.log('Method response: ', value);
				getNext(index + 1);
			});
		};

		// Start selecting
		getNext(0);
		
	});
}

/**
 *	Categories fields:
 *	{ property_account_expense_categ: [ 55, '220000 Expenses' ],
 *	    property_stock_journal: [ 11, 'Stock Journal (HKD)' ],
 *	    parent_right: 19,
 *	    name: 'Softwares',
 *	    sequence: 0,
 *	    property_stock_account_input_categ: false,
 *	    parent_id: [ 2, 'All products / Saleable' ],
 *	    parent_left: 18,
 *	    complete_name: 'All products / Saleable / Softwares',
 *	    property_account_income_categ: [ 51, '200000 Product Sales' ],
 *	    child_id: [],
 *	    property_stock_valuation_account_id: [ 8, 'X11001 Purchased Stocks - (test)' ],
 *	    type: 'normal',
 *	    id: 10,
 *	    property_stock_account_output_categ: false }
*/
function searchCategories(tokenDetails) {
	console.log("\n\n***************** SEARCH CATEGORIES");
	
	// Get a connection to TEA ready, so we'll be able to send our updates
	var teaClient = restify.createJsonClient({
	    url: 'http://localhost:8080'
	});

	var params = [
		tokenDetails.db_name,
		tokenDetails.db_uid,
		tokenDetails.db_pass,
		'product.category',
		'search',
		[] // criteria
	];
	client.setPathname('/xmlrpc/object');
	client.methodCall('execute', params, function(error, value) {
		// Results of the method response
		if (error) console.log("error:", error);
		console.log('Method response: ', value);
		
		// Load each of these in term
		var record_ids = value;
		var num_records = record_ids.length;
		var batch_size = 20;
		console.log("Num =" + num_records)

		var getNext = function(index) {
			console.log("------------------- " + index);
			if (index >= num_records) {
				return; // all finished
			}

			// Get a limited number at a time
			var remaining = num_records - index;
			if (remaining > batch_size) {
				remaining = batch_size;
			}
			var ids = [ ];
			for (var i = 0; i < remaining; i++) {
				var id = record_ids[index + i];
				ids.push(id);
			}
			index += remaining;
			
			
			
			var params = [
				tokenDetails.db_name,
				tokenDetails.db_uid,
				tokenDetails.db_pass,
				'product.category',
				'read',
				ids,
				[ 'id', 'name', 'parent_id']
//				[ ]
			];
			client.setPathname('/xmlrpc/object');
			client.methodCall('execute', params, function(error, value) {
				// Results of the method response
				if (error) console.log("error:", error);
				console.log('Method response: ', value);
				
				// // Load it into SOLR
				var documents = value;
				// solr.addDocument(documents, function(err){
				// 	if (err) throw err;
				 	// getNext(index);
				// });

				// Send this category to TEA
				var json = {
					source: "junk",
					categories: [ ]
				};
				
				// Prepare the message to send to TEA's RESTful interface
				for (var i = 0; i < documents.length; i++) {
					var category = documents[i];
					
					// Change the id to 'external_id'
					var id = category.id;
					delete category.id;
					category.external_id = id;
					
					json.categories.push(category);
				}
		
				teaClient.post('/category', json, function(err, req, res, obj) {
					//	console.log('%d -> %j', res.statusCode, res.headers);
				    console.log('%j', obj);
				 	getNext(index);
				});
				
				//getNext(index + 1);
			});
		};

		// Start selecting
		getNext(0);
		
	});
}


/**
 *	Products:
	{ ean13: false,
    code: 'DVD',
    incoming_qty: 28,
    standard_price: 21.6,
    name_template: 'Blank DVD-RW',
    property_account_income: false,
    seller_qty: 1,
    message_summary: ' ',
    company_id: [ 1, 'Your Company' ],
    loc_rack: false,
    pricelist_id: [],
    price_margin: 1,
    property_stock_account_input: false,
    reception_count: 0,
    warehouse_id: [],
    outgoing_qty: -3,
    variants: false,
    partner_ref: '[DVD] Blank DVD-RW',
    rental: false,
    packaging: [],
    seller_id: [ 12, 'Mediapole' ],
    image_medium: 'iVBORw0...FTkSuQmCC\n',
    name: 'Blank DVD-RW',
    pos_categ_id: [ 1, 'Others' ],
    seller_ids: [ 32 ],
    message_follower_ids: [ 3 ],
    supply_method: 'buy',
    orderpoint_ids: [ 1 ],
    weight: 0,
    description_purchase: false,
    virtual_available: 25,
    product_tmpl_id: [ 37, 'Blank DVD-RW' ],
    state: false,
    income_pdt: false,
    weight_net: 0,
    active: true,
    loc_row: false,
    seller_delay: 2,
    loc_case: false,
    property_stock_account_output: false,
    lst_price: 24,
    message_unread: false,
    warranty: 0,
    property_stock_procurement: [ 6, 'Virtual Locations / Procurements' ],
    uos_id: false,
    list_price: 24,
    color: 0,
    image: '/9j/4AAggX3krVLXYhPF0jsKyv...iIg//9k=',
    mes_type: 'fixed',
    qty_available: 0,
    expense_pdt: false,
    uos_coeff: 1,
    sale_ok: true,
    message_is_follower: true,
    product_manager: false,
    description_sale: false,
    track_incoming: false,
    property_stock_production: [ 7, 'Virtual Locations / Production' ],
    supplier_taxes_id: [],
    volume: 0,
    seller_info_id: [ 32, '12' ],
    procure_method: 'make_to_stock',
    property_stock_inventory: [ 5, 'Virtual Locations / Inventory loss' ],
    cost_method: 'standard',
    valuation: 'manual_periodic',
    sale_delay: 7,
    type: 'product',
    available_in_pos: false,
    image_small: 'iVBORw0KGgoAAAA...YII=\n',
    to_weight: false,
    track_production: false,
    price_extra: 0,
    uom_id: [ 2, 'Dozen(s)' ],
    default_code: 'DVD',
    location_id: [],
    id: 37,
    delivery_count: 1,
    track_outgoing: false,
    message_ids: [ 70 ],
    uom_po_id: [ 2, 'Dozen(s)' ],
    description: false,
    price: 0,
    categ_id: [ 8, 'All products / Saleable / Accessories' ],
    produce_delay: 1,
    property_account_expense: false,
    taxes_id: [] }
*/
function searchProducts(tokenDetails) {
	console.log("\n\n***************** Upload products");
	
	// Get a connection to TEA ready, so we'll be able to send our updates
	var teaClient = restify.createJsonClient({
	    url: 'http://localhost:8080'
	});


	// Use XMLRPC to get products from OpenERP
	var params = [
		tokenDetails.db_name,
		tokenDetails.db_uid,
		tokenDetails.db_pass,
		'product.product',
		'search',
		[] // criteria
	];
	client.setPathname('/xmlrpc/object');
	client.methodCall('execute', params, function(error, value) {
		// Results of the method response
		if (error) console.log("error:", error);
		console.log('Method response: ', value);
		
		// Load each of these in term
		var record_ids = value;
		var num_records = record_ids.length;
//num_records = 10;
		var MAX_BATCH_SIZE = 5;
		console.log("Num =" + num_records)

		var getNext = function(index) {
			console.log("------------------- " + index);
			if (index >= num_records) {
				return; // all finished
			}

			// Get a limited number at a time
			var remaining = num_records - index;
			if (remaining > MAX_BATCH_SIZE) {
				remaining = MAX_BATCH_SIZE;
			}
			var ids = [ ];
			for (var i = 0; i < remaining; i++) {
				var id = record_ids[index + i];
				ids.push(id);
			}
			var newIndex = index + remaining;
			
			
			// Now get a specific product's details
			var params = [
				tokenDetails.db_name,
				tokenDetails.db_uid,
				tokenDetails.db_pass,
				'product.product',
				'read',
				ids,
				[ 'id', 'name', 'lst_price', 'qty_available', 'categ_id', 'image']
//				[ ]
			];
			client.setPathname('/xmlrpc/object');
			client.methodCall('execute', params, function(error, value) {
				// Results of the method response
				if (error) console.log("error:", error);
				console.log('Method response: ', value);
				
				// // Load it into SOLR
				var documents = value;
				// solr.addDocument(documents, function(err){
				// 	if (err) throw err;
				 	// getNext(index);
				// });

				// Send this product to TEA
				var json = {
					source: "junk",
					products: [ ]
				};
				
				// Prepare the message to send to TEA's RESTful interface
				for (var i = 0; i < documents.length; i++) {
					var product = documents[i];
					
					// Change the id to 'external_id'
					var id = product.id;
					delete product.id;
					product.external_id = id;
					
					json.products.push(product);
				}
					
				// jsonForTEA.products.push(
				// 	{ "price": 1.25, "external_id": "junk-999", "name": "Smelly shoes" },
				// 		{ "price": 992.89, "external_id": "junk-998", "name": "Red shoes" }
				// 	]
				// };
				teaClient.post('/product', json, function(err, req, res, obj) {
					//	console.log('%d -> %j', res.statusCode, res.headers);
				    console.log('%j', obj);
				 	getNext(newIndex);
				});
			});
		};

		// Start selecting
		getNext(0);
		
	});
}