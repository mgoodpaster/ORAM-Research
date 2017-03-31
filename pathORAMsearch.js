
// Pad the files & stash

function pathORAMsearch() {

    /**********************************************************************
     * Initialize the variables needed for AES 256-bit encryption
     *********************************************************************/

    // Password for AES encrypt/decrypt - will be made user input option later
    pswd = "Ch0i@v1vg0O6";

    Crypt = new Crypt();
    
    /**********************************************************************
     * Download the position map and stash from the server
     *********************************************************************/

    dinfo = download();
    posMap = dinfo[0];
    stash = dinfo[1];
    if(stash == null) { stash = []; }

    // Get input from user - keyword to search

    keyword = document.getElementById("keyw").value;
    
	/*********************************************************************
	 * Linear search through ORAM array to find if keyword exists
	 ********************************************************************/
	
	fileID = -1;
	for(i=0; i < posMap.length; i++) {	
		path = ORAMRead(Crypt, posMap, stash, i, pswd);
    	if(path == -1) { return; }
		for(j=0; j < path.length; j++) {
			for(k=1; k < 5; k++) {
				if(fileID > 0) { continue; }
				else if(path[j][k] == '') { break; }
				else if(path[j][k].substring(0, path[j][k].length-4) == keyword) { exists = true; }
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


function ORAMRead(Crypt, posMap, stash, fileID, pswd) {
    
    // If trying to read a file that doesn't exist, return an error message
    if((posMap[fileID-1] == null || posMap[fileID-1] == '') || fileID > posMap.length) {
		window.alert("ERROR: Cannot read a file that doesn't exist!");
		return -1;
    }
    
    /**********************************************************************
     * Decrypt the stash before using it.
     * Also decrypt the path number you will need if doing a read.
     *********************************************************************/
    
    i = 0;
    while(stash[i] != null) {
		stash[i] = decrypt(Crypt, stash[i], pswd);
		i++;
    }
	
   	pathNum = Number(decrypt(Crypt, posMap[fileID-1], pswd));		
	
    /**********************************************************************
     * Access and download the path from the server.
     * Then add the stash to the end of the path.
     *********************************************************************/
    
    // Change the path number to one that can be used to access id's from
    // database
    numBuckets = (posMap.length*2) - 1;
    numNonLeaf = Math.floor(numBuckets/2);
    realPathNum = Number(pathNum) + numNonLeaf + 1;
    
    // Change the location of the file to a new path
    newLoc = Math.floor(Math.random()*Math.ceil(numBuckets/2));
    posMap[fileID-1] = encrypt(Crypt, newLoc,pswd);
    
    // Get the path from the database
    path = access(realPathNum);
    
    /***************************************************************
     * Decrypt the path so it can be used & add it to the stash
     **************************************************************/
    
    dpath = decryptPath(Crypt, path, stash, pswd);
    path = dpath[0];
    stash = dpath[1];
    
    // Continue after decryption has occurred
    document.getElementById("path").innerHTML = path;
    
    L = path.length - 1;
    
    /**********************************************************************
     * Put the path into the correct order to be sent back to the database
     * Also encrypts as things are put into the correct order in newPath
     *********************************************************************/
    
    newData = rearrange(Crypt, pswd, stash, path, posMap, L);
    newPath = newData[0];
    newStash = newData[1];
	
	p = writeback([newPath, newStash, posMap]);
    
	if(p == "Transaction completed sucessfully")
    	return path;
	else {
		window.alert(p);
		return -1;
	}
}

/**********************************************************************
 * Encrypts the given string as well as pads it to a certain length.
 *********************************************************************/

function encrypt(Crypt, plaintext, pswd) {
    //plaintext = pad(plaintext);
    cipher = Crypt.AES.encrypt(String(plaintext), pswd);

    return cipher;
}


function decrypt(Crypt, ciphertext, pswd) {
    ciphertext = ciphertext.replace(/ /g, "+");
    plain = Crypt.AES.decrypt(ciphertext, pswd);
    //plain.unpad(plain);
    
    return plain;
}


function decryptPath(Crypt, path, stash, pswd) {
    for(i=0; i < path.length; i++) {
		for(j=1; j<5; j++) {
	    	if(path[i][j] == '')
				break;
	    	path[i][j] = decrypt(Crypt, path[i][j], pswd);
	    	stash.push(path[i][j]);
		}
    }
    
    return [path, stash];
}


function download() {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "downloadE.php", false);
    xmlhttp.send();
    data = JSON.parse(xmlhttp.responseText);
    
    return [data[0], data[1]];
}


function access(realPathNum) {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "accessE.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("path="+realPathNum);
    
    return JSON.parse(xmlhttp.responseText);
}


function writeback(result) {
    newPath = JSON.stringify(result[0]);
    posMap = JSON.stringify(result[2]);
    newStash = JSON.stringify(result[1]);
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "writebackE.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("path="+newPath+"&posMap="+posMap+"&stash="+newStash);
    
    return JSON.parse(xmlhttp.responseText);
}


function rearrange(Crypt, pswd, stash, path, posMap, L) {
    newPath = [];   
    for(i = 0; i <= L; i++) {
		// Initialize the index of the path & find the range needed to be on path
		newPath[i] = [];
		newPath[i][0] = path[i][0];
		range = Math.pow(2, i);
		pathIndexMin = (Number(path[i][0]) * range) - (numNonLeaf + 1);
		pathIndexMax = (pathIndexMin + range);
	
		for(j=0; j < stash.length; j++) {
	    	if(stash[j] != null && onPath(pathIndexMin, pathIndexMax, Number(decrypt(Crypt, posMap[getFileID(stash[j])-1], pswd)))) {
				k = 1;
				while(newPath[i][k] != null) { k++; }
				newPath[i][k] = encrypt(Crypt, stash[j], pswd);
				stash[j] = null;
	    	}
		}
    }
    
    // Now add the remaining files of the path to the stash
    newStash = [];
    for(i = 0; i < stash.length; i++) {
		if(stash[i] != null && stash[i] != '') 
	    	newStash.push(encrypt(Crypt, stash[i], pswd));	
    }
    
    return [newPath, newStash];
}


function getFileID(file) {
    if(file == null || file == "") 
		return null;
    splitFile = file.split(" : ");
    	return splitFile[1];
}


function onPath(min, max, pathNum) {
    if(pathNum == null)
		return false;
    if(min <= Number(pathNum) && max > Number(pathNum)) 
		return true;
    return false;
}
