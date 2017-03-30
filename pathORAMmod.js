
// Pad the files & stash
// Decrease position Map to N files

function pathORAMop() {
    
    // Make the headers visible to the user
    document.getElementById("h1").innerHTML = "Initial path/stash are as follows:";
    document.getElementById("h2").innerHTML = "New path location is:";
    document.getElementById("h3").innerHTML = "New path/stash are as follows:";

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
    
    // Get input from user to use to access data
    // Also initialize other variables pertaining to the position map
    op = document.getElementById("op").value;
    fileID = Number(document.getElementById("pnum").value);
    file = document.getElementById("f").value;

    var result;
    if(op == "read")
		result = ORAMRead(Crypt, posMap, stash, fileID, pswd);
    else
		result = ORAMWrite(Crypt, posMap, stash, fileID, file, pswd);
    
	if(result == -1) { return; }
	
    document.getElementById("newPath").innerHTML = result[0];
    document.getElementById("newStash").innerHTML = result[1];
    
    /**********************************************************************
     * Send the updated path back to the server - writeback step
     *********************************************************************/
	
	p = writeback(result);
    window.alert(p);
    
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
    document.getElementById("stash").innerHTML = stash;
	
    var pathNum;
    pathNum = Number(decrypt(Crypt, posMap[fileID-1], pswd));
	document.getElementById("initPath").innerHTML = pathNum;
    
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
    posMap[fileID-1] = Crypt.AES.encrypt(String(newLoc),pswd);
    document.getElementById("newLoc").innerHTML = newLoc;
    
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

    return [newPath, newStash, posMap];
}


function ORAMWrite(Crypt, posMap, stash, fileID, file, pswd) {
    
    /**********************************************************************
     * Decrypt the stash before using it.
     * Also decrypt the path number you will need if doing a read.
     *********************************************************************/
    
    i = 0;
    while(stash[i] != null) {
		stash[i] = decrypt(Crypt, stash[i], pswd);
		i++;
    }
    
    /**********************************************************************
     * If the operation is write, then make the new file and assign it a 
     * path and an index. If overwrite, need to decrypt pathNum.
     *********************************************************************/
    
    writeUpdate = false;
    var toWrite, pathNum;
    if(fileID != 0 && posMap[fileID-1] != null) {
		pathNum = Number(decrypt(Crypt, posMap[fileID-1], pswd));
		writeUpdate = true;
		toWrite = file + " : " + fileID;
    }
	
    else if((fileID == 0 && (posMap[posMap.length-1]!=null && posMap[posMap.length-1]!='')) || (fileID > posMap.length)) {
		window.alert("ERROR: Cannot write any new files; database full");
		return -1;
    }
	
    else {
		for(i = 0; i < posMap.length; i++) {
	    	if(posMap[i] == null || posMap[i] == '') {
				fileID = i+1;
				posMap[i]=Math.floor(Math.random()*Math.ceil(numBuckets/2));
				pathNum = Number(posMap[i]);
				posMap[i] = encrypt(Crypt, posMap[i], pswd);
				break;
	    	}
		}
		newFileName = file + " : " + fileID;
		stash.push(newFileName);
    }
	document.getElementById("stash").innerHTML = stash;
	document.getElementById("initPath").innerHTML = pathNum;
    
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
    posMap[fileID-1] = Crypt.AES.encrypt(String(newLoc),pswd);
    document.getElementById("newLoc").innerHTML = newLoc;
    
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
     * If overwriting, find file in the temporary stash (path) & update
     *********************************************************************/
    
    // Find the file index that must be reorganized
    if(writeUpdate) {
		for(i = 0; i < stash.length; i++) {
	    	splitFile = stash[i].split(" : ");
	    	if(splitFile[1] == fileID) {
				stash[i] = toWrite;
				break;
	    	}
		}
    }

    /**********************************************************************
     * Put the path into the correct order to be sent back to the database
     * Also encrypts as things are put into the correct order in newPath
     *********************************************************************/

	newData = rearrange(Crypt, pswd, stash, path, posMap, L);
	newPath = newData[0];
	newStash = newData[1];

    return [newPath, newStash, posMap];
}


function encrypt(Crypt, plaintext, pswd) {
	plaintext = pad(plaintext);
	cipher = Crypt.AES.decrypt(plaintext, pswd);
	
	return cipher;
}


function decrypt(Crypt, ciphertext, pswd) {
	ciphertext = ciphertext.replace(/ /g, "+");
	plain = Crypt.AES.decrypt(ciphertext, pswd);
	plain.unpad(plain);
	
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
