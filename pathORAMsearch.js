
padder = "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$";
/**********************************************************************
 * Initialize the variables needed for AES 256-bit encryption
 *********************************************************************/
// Password for AES encrypt/decrypt - will be made user input option later
pswd = "Ch0i@v1vg0O6";
Crypt = new Crypt();
var pMaplength;

function pathORAMsearch() {
    
    /**********************************************************************
     * Download the position map and stash from the server
     *********************************************************************/
    
    var dinfo = download();
    var posMap = dinfo[0];
    var stash = dinfo[1];
    pMaplength = posMap.length;
    
    // Get input from user - keyword to search
    
    var keyword = document.getElementById("keyw").value;
    
    /*********************************************************************
     * Linear search through ORAM array to find if keyword exists
     ********************************************************************/
    
    var fileID = -1;
    var id, data, path, j, k;
    for(id = 1; id <= pMaplength; id++) {
	data = ORAMRead(posMap, stash, id);
	path = data[0];
	posMap = data[1];
    	if(path == -1) { return; }
	for(j = 0; j < path.length; j++) {
	    for(k = 1; k < 5; k++) {
		if(fileID > 0) { continue; }
		else if(path[j][k] == '') { break; }
		else if(path[j][k].substring(path[j][k].length-1) == id)
		    if(path[j][k].substring(0, path[j][k].length-4) == keyword)
			fileID = id;
	    }
	}
    }

    
    /*********************************************************************
     * Print yes/no as to whether or not the keyword exists.
     * Will make it so that it gives the fileID of the file eventually.
     ********************************************************************/
    
    if(fileID > 0) {
	report = "The keyword's fileID is " + fileID;
	window.alert(report);
    }
    else
	window.alert("The keyword does not exist!");
}


function ORAMRead(posMap, stash, fileID) {
    
    // If trying to read a file that doesn't exist, need to still read to
    // keep obliviousness so set fileID to be 0
    if(decrypt(posMap[fileID-1]) == '' || fileID > pMaplength) {
	fileID = 1;
    }

    /**********************************************************************
     * Decrypt the stash before using it.
     * Also decrypt the path number you will need if doing a read.
     *********************************************************************/
    
    var i = 0;
    var j = 0;
    var tempStash = [];
    while(stash[i] != null) {
	var temp = decrypt(stash[i]);
	if(temp != '') {
	    tempStash[j] = temp;
	    j++;
	}
	i++;
    }
    stash = tempStash;
    
    var pathNum;
    pathNum = Number(decrypt(posMap[fileID-1]));
    
    /**********************************************************************
     * Access and download the path from the server.
     * Then add the stash to the end of the path.
     *********************************************************************/
    
    // Change the path number to one that can be used to access id's from
    // database
    var numBuckets = (pMaplength*2) - 1;
    var numNonLeaf = Math.floor(numBuckets/2);
    var realPathNum = Number(pathNum) + numNonLeaf + 1;
    
    // Change the location of the file to a new path
    var newLoc = Math.floor(Math.random()*Math.ceil(numBuckets/2));
    posMap[fileID-1] = encrypt(newLoc);
    
    // Get the path from the database
    var path = access(realPathNum);
    
    /***************************************************************
     * Decrypt the path so it can be used & add it to the stash
     **************************************************************/
    
    var dpath = decryptPath(path, stash);
    path = dpath[0];
    stash = dpath[1];
    
    // Continue after decryption has occurred
    
    var L = path.length - 1;
    
    /**********************************************************************
     * Put the path into the correct order to be sent back to the database
     * Also encrypts as things are put into the correct order in newPath
     *********************************************************************/
    
    var newData = rearrange(stash, path, posMap, L, numNonLeaf);
    var newPath = newData[0];
    var newStash = newData[1];

    newStash = padStash(newStash);
    p = writeback([newPath, newStash, posMap]);

    if(p == "Transaction completed successfully")
	return [path, posMap];
    else {
	window.alert(p);
	return -1;
    }
}

/**********************************************************************
 * Encrypts the given string as well as pads it to a certain length.
 *********************************************************************/

function encrypt(plaintext) {
    plaintext = pad(plaintext);
    var cipher = Crypt.AES.encrypt(String(plaintext), pswd);

    return cipher;
}


function decrypt(ciphertext) {
    ciphertext = ciphertext.replace(/ /g, "+");
    var plain = Crypt.AES.decrypt(ciphertext, pswd);
    plain = unpad(plain);

    return plain;
}


function pad(text) {
    return (text + padder).substring(0,32);
}


function unpad(text) {
    return text.substring(0,text.indexOf("$"));
}


function decryptPath(path, stash) {
    for(i=0; i < path.length; i++) {
	for(j=1; j<5; j++) {
	    path[i][j] = decrypt(path[i][j]);
	    if(path[i][j] != '')
		stash.push(path[i][j]);
	}
    }
    
    return [path, stash];
}


function padStash(s) {
    var numPad = Math.log(pMaplength) / Math.log(2);
    for(i=0; i < numPad; i++) {
	if(s[i] == undefined)
	    s[i] = encrypt('');
    }

    return s;
}


function download() {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "downloadE.php", false);
    xmlhttp.send();
    var data = JSON.parse(xmlhttp.responseText);
    
    return [data[0], data[1]];
}


function access(realPathNum) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "accessE.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("path="+realPathNum);
    
    return JSON.parse(xmlhttp.responseText);
}


function writeback(result) {
    var newPath = JSON.stringify(result[0]);
    var posMap = JSON.stringify(result[2]);
    var newStash = JSON.stringify(result[1]);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "writebackE.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("path="+newPath+"&posMap="+posMap+"&stash="+newStash);
    
    return JSON.parse(xmlhttp.responseText);
}


function rearrange(stash, path, posMap, L, numNonLeaf) {
    var newPath = [];
    for(i = 0; i <= L; i++) {
	// Initialize the index of the path & find the range needed to be on path
	newPath[i] = [];
	newPath[i][0] = path[i][0];
	var range = Math.pow(2, i);
	var pathIndexMin = (Number(path[i][0]) * range) - (numNonLeaf + 1);
	var pathIndexMax = (pathIndexMin + range);

	var k = 1;
	for(j=0; j < stash.length; j++) {
	    if(stash[j] != null && onPath(pathIndexMin, pathIndexMax, Number(decrypt(posMap[getFileID(stash[j])-1])))) {
		newPath[i][k] = encrypt(stash[j]);
		stash[j] = null;
		k++;
	    }
	}
	// Finish padding out the bucket
	for(k; k < 5; k++) {
	    newPath[i][k] = encrypt('');
	}
    }
    
    // Now add the remaining files of the path to the stash
    var newStash = [];
    for(i = 0; i < stash.length; i++) {
	if(stash[i] != null && stash[i] != '') 
	    newStash.push(encrypt(stash[i]));	
    }
    
    return [newPath, newStash];
}


function getFileID(file) {
    if(file == null || file == "") 
	return null;
    var splitFile = file.split(" : ");
    return splitFile[1];
}


function onPath(min, max, pathNum) {
    if(pathNum == null)
	return false;
    if(min <= Number(pathNum) && max > Number(pathNum)) 
	return true;
    return false;
}
