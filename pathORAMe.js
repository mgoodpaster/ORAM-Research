
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

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "downloadE.php", false);
    xmlhttp.send();
    data = JSON.parse(xmlhttp.responseText);
    posMap = data[0];
    stash = data[1];
    if(stash == null) { stash = []; }
    numBuckets = posMap.length/4;
    
    // Get input from user to use to access data
    // Also initialize other variables pertaining to the position map
    op = document.getElementById("op").value;
    fileID = Number(document.getElementById("pnum").value);
    file = document.getElementById("f").value;

    // If trying to read a file that doesn't exist, return an error message
    if((op == "read" && (posMap[fileID-1] == null || posMap[fileID-1] == '')) || fileID > posMap.length) {
	window.alert("ERROR: Cannot read a file that doesn't exist!");
	return;
    }
    
    /**********************************************************************
     * Decrypt the stash before using it.
     * Also decrypt the path number you will need if doing a read.
     *********************************************************************/
    
    i = 0;
    while(stash[i] != null) {
	stash[i] = stash[i].replace(/ /g, "+");
	stash[i] = Crypt.AES.decrypt(stash[i], pswd);
	i++;
    }

    var pathNum;
    if(op == "read") {
	pathNum = Number(Crypt.AES.decrypt(posMap[fileID-1].replace(/ /g, "+")
					   , pswd));
    }
    
    /**********************************************************************
     * If the operation is write, then make the new file and assign it a 
     * path and an index. If overwrite, need to decrypt pathNum.
     *********************************************************************/
    
    writeUpdate = false;
    var toWrite;
    if(op == "write") {
	if(fileID != 0 && posMap[fileID-1] != null) {
	    pathNum = Number(Crypt.AES.decrypt(posMap[fileID-1].replace(/ /g, "+")
					       , pswd));
	    writeUpdate = true;
	    toWrite = file + " : " + fileID;
	}
	else if((fileID == 0 &&
		 (posMap[posMap.length-1]!=null && posMap[posMap.length-1]!=''))
		|| (fileID > posMap.length)) {
	    window.alert("ERROR: Cannot write any new files; database full");
	    return;
	}
	else {
	    for(i = 0; i < posMap.length; i++) {
		if(posMap[i] == null || posMap[i] == '') {
		    fileID = i+1;
		    posMap[i]=Math.floor(Math.random()*Math.ceil(numBuckets/2));
		    pathNum = Number(posMap[i]);
		    posMap[i] = Crypt.AES.encrypt(String(posMap[i]), pswd);
		    break;
		}
	    }
	    newFileName = file + " : " + fileID;
	    stash.push(newFileName);
	}
    }
    
    /**********************************************************************
     * Access and download the path from the server.
     * Then add the stash to the end of the path.
     *********************************************************************/
    
    // Change the path number to one that can be used to access id's from
    // database
    numNonLeaf = Math.floor(numBuckets/2);
    realPathNum = Number(pathNum) + numNonLeaf + 1;

    // Change the location of the file to a new path
    newLoc = Math.floor(Math.random()*Math.ceil(numBuckets/2));
    posMap[fileID-1] = Crypt.AES.encrypt(String(newLoc),pswd);

    document.getElementById("newLoc").innerHTML = newLoc;
    
    // Get the path from the database
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "accessE.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("path="+realPathNum);
    path = JSON.parse(xmlhttp.responseText);

    document.getElementById("stash").innerHTML = stash;
    /***************************************************************
     * Decrypt the path so it can be used & add it to the stash
     **************************************************************/
    for(i=0; i < path.length; i++) {
	for(j=1; j<5; j++) {
	    if(path[i][j] == '')
		break;
	    path[i][j] = Crypt.AES.decrypt(path[i][j].replace(/ /g, "+"), pswd);
	    stash.push(path[i][j]);
	}
    }
    
    // Continue after decryption has occurred
    document.getElementById("path").innerHTML = path;
    document.getElementById("initPath").innerHTML = pathNum;

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

    newPath = [];   
    for(i = 0; i <= L; i++) {
	// Initialize the index of the path & find the range needed to be on path
	newPath[i] = [];
	newPath[i][0] = path[i][0];
	range = Math.pow(2, i);
	pathIndexMin = (Number(path[i][0]) * range) - (numNonLeaf + 1);
	pathIndexMax = (pathIndexMin + range);
	
	for(j=0; j < stash.length; j++) {
	    if(stash[j] != null
	       && onPath(pathIndexMin, pathIndexMax
			 , Number(Crypt.AES.decrypt(posMap[getFileID(stash[j])-1].replace(/ /g, "+")
						    , pswd)))) {
		k = 1;
		while(newPath[i][k] != null) { k++; }
		newPath[i][k] = Crypt.AES.encrypt(stash[j], pswd);
		stash[j] = null;
	    }
	}
    }
    
    // Now add the remaining files of the path to the stash
    newStash = [];
    for(i = 0; i < stash.length; i++) {
	if(stash[i] != null && stash[i] != '') 
	    newStash.push(Crypt.AES.encrypt(stash[i], pswd));	
    }

    document.getElementById("newPath").innerHTML = newPath;
    document.getElementById("newStash").innerHTML = newStash;
    
    /**********************************************************************
     * Send the updated path back to the server - writeback step
     *********************************************************************/

    newPath = JSON.stringify(newPath);
    posMap = JSON.stringify(posMap);
    newStash = JSON.stringify(newStash);
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "writebackE.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("path="+newPath+"&posMap="+posMap+"&stash="+newStash);
    p = JSON.parse(xmlhttp.responseText);

    window.alert(p);
    
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
