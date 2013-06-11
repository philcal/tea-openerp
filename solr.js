
// Use `var solr = require('solr-client')` in your code
//var solr = require('./../lib/solr');
var solr = require('solr-client');

var client = solr.createClient();


// Switch on "auto commit", by default `client.autoCommit = false`
client.autoCommit = true;

exports.addDocument = function(documents, callback) {
	
	// Verify we have the minimum required data
	//ZZZZZ
	
	// Adjust the document a bit
	for (var i = 0; i < documents.length; i++) {
		var doc = documents[i];
		var newId = "junk-" + doc.id;
		doc.id = newId;
	}
	
	// Add the document
	// var docs = [];
	//for(var i = 0; i <= 10 ; i++){

	// var id = "junk1-37";
	// var doc = {
	// 	id : id,
	// 	name : "Big Book",
	// 	price : 12.50
	// }
	// docs.push(doc);
	//}

	// Add documents
	client.add(documents, function(err,obj){
		if(err){
			// Do something serious here
			//ZZZZ
			console.log(err);
		}else{
			console.log("SOLR added: ", obj);
		}
		
		// Return control to the caller
		callback(err);
	});
};

