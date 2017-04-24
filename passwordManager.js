
padder = "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$";
// To pad max string to same length as such:
//        ******************** : *************** : *** : *** : *** : ***
//           fileName              password         l     r     h     id

/**********************************************************************
 * Initialize the variables needed for AES 256-bit encryption
 *********************************************************************/

var pswd = "Ch0i@v1vg0O6";
Crypt = new Crypt();
var pMaplength, posMap, stash, root;
var count = 0;
var maxCount;

function managePasswords() {
    var name = document.getElementById("name").value;
    var password = document.getElementById("pswd").value;
    var op = document.getElementById("op").value;
    var result;
    
    if(op == "add")
	addPassword(name, password);
    else
	getPassword(name);

    while(count < maxCount) {
	result = ORAMRead(1);
    }
    document.getElementById("numAcc").innerHTML = "Number of accesses: "+count;
}


/***************************************************************************
 **********************   ADD METHOD IMPLEMENTATION   **********************
 **************************************************************************/

/***************************************************************************
 * addPassword simply takes user input and adds the file/password to the 
 * MySQL database. This function makes use of the ORAM being stored using 
 * an AVL structure.
 **************************************************************************/

function addPassword(name, password) {
    
    /**********************************************************************
     * Download the position map, stash, and root from the server
     *********************************************************************/
    var dinfo = download();
    posMap = dinfo[0];
    stash = dinfo[1];
    root = decrypt(dinfo[2]);    
    pMaplength = posMap.length;
    maxCount = (Math.log(pMaplength) / Math.log(2)) * 5;

    // Create the new file with data to be added to the database
    var toWrite = name + " : " + password + " : 0 : 0 : 0";

    var data = insert(name, root, toWrite);

    // Upload the position map, stash, and root back to the server
    root = encrypt(data[0]);
    var p = writePsmpSt();

    // Print password to let user know that the operation completed
    document.getElementById("newPswd").innerHTML = password;
}

/**************************************************************************
 * insert is a recursive function which performs an AVL insert of the given 
 * data to the MySQL database. It makes use of AVL data stored within the 
 * data stored in the path of the given root variable. 
 *************************************************************************/

function insert(name, r, toWrite) {
    var result, data, cur, n, lheight, rheight, balance;
    var ldata, rdata, lname, rname;

    // Base case: If a leaf found, fill in 
    if(r == '0') {
	result = ORAMWrite(0, toWrite);
	r = result;
	return [r, (toWrite + " : " + r).split(" : ")];
    }
    
    // Need to read in the current fileID & update info
    result = ORAMRead(r);
    data = getFile(result, r);
    cur = data.split(" : ");
    n = name.localeCompare(cur[0]);
    
    // Name is less than current, so go left
    if(n < 0) {
	result = insert(name, cur[2], toWrite);
	cur[2] = result[0];
	lheight = Number(result[1][4]);
	ldata = result[1];
	lname = result[1][0];
	rdata = getData(cur[3]);
	if(rdata == -1) {
	    rheight = -1;
	    rname = null;
	}
	else {
	    rheight = Number(rdata[4]);
	    rname = rdata[0];
	}
    }
    // Go right
    if(n > 0) {
	result = insert(name, cur[3], toWrite);
	cur[3] = result[0];
	rheight = Number(result[1][4]);
	rdata = result[1];
	rname = result[1][0];
	ldata = getData(cur[2]);
	if(ldata == -1) {
	    lheight = -1;
	    lname = null;
	}
	else {
	    lheight = Number(ldata[4]);
	    lname = ldata[0];
	}
    }
    // Found a match, so replace
    else {
	var splitF = toWrite.split(" : ");
	cur[1] = splitF[1];
	r = ORAMWrite(cur[5], ([cur[0],cur[1],cur[2],cur[3],cur[4]]).join(" : "));
	return [r, cur];
    }
    
    // Update height of current node
    cur[4] = 1 + Math.max(lheight, rheight);
    
    // Determine which side of each child of the root that the given
    // file should be placed. Used for rotations below.
    if(lname == null) { lm = 0; }
    else { lm = name.localeCompare(lname); }
    if(rname == null) { rm = 0; }
    else { rm = name.localeCompare(rname); }
    
    // Get the balance factor & rebalance if need be
    balance = lheight - rheight;
    
    // Left Left Case:
    if(balance > 1 && lm < 0)
	return rightRotate(cur, ldata);
    
    // Right Right Case:
    if(balance < -1 && rm > 0)
	return leftRotate(cur, rdata);
    
    // Left Right Case:
    if(balance > 1 && lm > 0) 
	return leftRightRotate(cur, ldata);
    
    // Right Left Case:
    if(balance < -1 && rm < 0)
	return rightLeftRotate(cur, rdata);

    // Write back the data to the database after it has been updated with new
    // AVL data.
    var toWritecur = ([cur[0], cur[1], cur[2], cur[3], cur[4]]).join(" : ");
    result = ORAMWrite(cur[5], toWritecur);
    return [cur[5], (toWritecur+" : "+cur[5]).split(" : ")];
}

/**************************************************************************
 * rightRotate performs an AVL right rotation on the node cur. 
 *************************************************************************/

function rightRotate(cur, ldata) {
    var result, rldata, lldata, rcur, lcur;
    var rlheight, llheight, rcurheight, lcurheight;
    // Rotation
    var tmp = ldata[3];
    ldata[3] = cur[5];
    cur[2] = tmp;
    
    // Update height for old root
    rcur = getData(cur[3]);
    if(rcur == -1) 
	rcurheight = -1;
    else 
	rcurheight = Number(rcur[4]);
    lcur = getData(cur[2]);
    if(lcur == -1) 
	lcurheight = -1;
    else 
	lcurheight = Number(lcur[4]);
    cur[4] = 1 + Math.max(rcurheight, lcurheight);
    // Rewrite old root back to database
    var toWritecur = ([cur[0], cur[1], cur[2], cur[3], cur[4]]).join(" : ");
    result = ORAMWrite(cur[5], toWritecur);

    //Update height for new root
    rldata = getData(ldata[3]);
    if(rldata == -1) 
	rlheight = -1;
    else 
	rlheight = Number(rldata[4]);
    lldata = getData(ldata[2]);
    if(lldata == -1) 
	llheight = -1;
    else 
	llheight = Number(lldata[4]);
    ldata[4] = 1 + Math.max(rlheight, llheight);
    // Rewrite new root back to database
    var toWriteldata = ([ldata[0], ldata[1], ldata[2], ldata[3], ldata[4]]).join(" : ");
    result = ORAMWrite(ldata[5], toWriteldata);
    return [result, ldata];
}

/**************************************************************************
 * leftRotate performs an AVL left rotation on the node cur. 
 *************************************************************************/

function leftRotate(cur, rdata) {
    var result, rrdata, lrdata, rcur, lcur;
    var rrheight, lrheight, rcurheight, lcurheight;
    
    // Rotation
    var tmp = rdata[2];
    rdata[2] = cur[5];
    cur[3] = tmp;
    
    // Update height for old root
    rcur = getData(cur[3]);
    if(rcur == -1) 
	rcurheight = -1;
    else 
	rcurheight = Number(rcur[4]);
    lcur = getData(cur[2]);
    if(lcur == -1) 
	lcurheight = -1;
    else 
	lcurheight = Number(lcur[4]);
    cur[4] = 1 + Math.max(rcurheight, lcurheight);
    // Rewrite old root back to database
    var toWritecur = ([cur[0], cur[1], cur[2], cur[3], cur[4]]).join(" : ");
    result = ORAMWrite(cur[5], toWritecur);

    //Update height for new root
    rrdata = getData(rdata[3]);
    if(rrdata == -1) 
	rrheight = -1;
    else 
	rrheight = Number(rrdata[4]);
    lrdata = getData(rdata[2]);
    if(lrdata == -1) 
	lrheight = -1;
    else 
	lrheight = Number(lrdata[4]);
    rdata[4] = 1 + Math.max(rrheight, lrheight);
    // Rewrite new root back to database
    var toWriterdata = ([rdata[0], rdata[1], rdata[2], rdata[3], rdata[4]]).join(" : ");
    result = ORAMWrite(rdata[5], toWriterdata);
    return [result, rdata];
}

/**************************************************************************
 * leftRightRotate performs an AVL left rotation and then a right rotation
 * on the node cur.
 *************************************************************************/

function leftRightRotate(cur, ldata) {
    // Get the right child of the current node's left child
    var data = getData(ldata[3]);
    
    // Perform left rotate on left child of current node
    var result = leftRotate(ldata, data);
    cur[2] = result[0];

    // Perform right rotate on current node
    result = rightRotate(cur, result[1]);
    return result;
}

/**************************************************************************
 * rightLeftRotate performs an AVL right rotation and then a left rotation 
 * on the node cur.
 *************************************************************************/

function rightLeftRotate(cur, rdata) {
    // Get the left child of the current node's right child
    var data = getData(rdata[2]);

    // Perform the right rotate on right child of current node
    var result = rightRotate(rdata, data);
    cur[3] = result[0];

    // Perform left rotate on current node
    result = leftRotate(cur, result[1]);
    return result;
}


/***************************************************************************
 **********************   GET METHOD IMPLEMENTATION   **********************
 **************************************************************************/

/**************************************************************************
 * getPassword performs a search on the ORAM to find a desired entry in 
 * the database.
 *************************************************************************/

function getPassword(name) {
    
    /**********************************************************************
     * Download the position map, stash, and root from the server
     *********************************************************************/    
    var data;
    var dinfo = download();
    posMap = dinfo[0];
    stash = dinfo[1];
    root = decrypt(dinfo[2]);
    pMaplength = posMap.length;
    maxCount = (Math.log(pMaplength) / Math.log(2)) * 5;

    // If the database is empty
    if(root == '0')
	document.getElementById("newPswd").innerHTML = "There is no password for " + name;
    else {
	data = pathORAMsearch(root, name);
	document.getElementById("newPswd").innerHTML = data;
    }
    
    // Upload the position map, stash, and root back to the database
    root = encrypt(root);
    var p = writePsmpSt();
}

/**************************************************************************
 * pathORAMsearch is a recursive function which performs an AVL search 
 * through the ORAM to find the desired file.
 *************************************************************************/

function pathORAMsearch(r, name) {
    var result, data, cur, n;
    /*********************************************************************
     * AVL search through ORAM to see if the file is there.
     * If so, return its password.
     ********************************************************************/
    // Base Case: If r is 0, then name doesn't exist!
    if(r == 0) {
	return "There is no password for "+name;
    }
    
    result = ORAMRead(r);
    data = getFile(result, r);
    cur = data.split(" : ");
    n = name.localeCompare(cur[0]);
    
    // Name is less than cur, so go left
    if(n < 0) 
	return pathORAMsearch(cur[2], name);
    // Name is greater than cur, so go right
    else if(n > 0) 
	return pathORAMsearch(cur[3], name);
    // We found it!
    else 
	return cur[1];
}


/***************************************************************************
 *************************   ORAM IMPLEMENTATION   *************************
 **************************************************************************/


/***************************************************************************
 * ORAMRead performs an access on the MySQL database specifically with the 
 * goal to simply read in the path but not alter it. It does this 
 * obliviously.
 **************************************************************************/

function ORAMRead(fileID) {
    
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
    
    var dpath = decryptPath(path);
    path = dpath;
    
    // Continue after decryption has occurred
    
    var L = path.length - 1;
    
    /**********************************************************************
     * Put the path into the correct order to be sent back to the database
     * Also encrypts as things are put into the correct order in newPath
     *********************************************************************/
    
    var newData = rearrange(path, L, numNonLeaf);
    var newPath = newData[0];
    stash = newData[1];
    
    padStash();
    p = writeback(newPath);
    count++;
    
    if(p == "Transaction completed successfully") 
	return path;
    else {
	window.alert(p);
	return -1;
    }
}

/***************************************************************************
 * ORAMWrite performs an access on the database with the intention of 
 * writing a new file or overwriting a file within the path which is pulled
 * from the database. It is done so obliviously.
 **************************************************************************/

function ORAMWrite(fileID, file) {
    
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
    
    /**********************************************************************
     * If the operation is write, then make the new file and assign it a 
     * path and an index. If overwrite, need to decrypt pathNum.
     *********************************************************************/
    
    var writeUpdate = false;
    var toWrite, pathNum;
    var numBuckets = (pMaplength*2) - 1;
    if(fileID != 0 && decrypt(posMap[fileID-1]) != null) {
	pathNum = Number(decrypt(posMap[fileID-1]));
	writeUpdate = true;
	toWrite = file + " : " + fileID;
    }
    
    else if((fileID == 0 && decrypt(posMap[pMaplength-1])!='') || (fileID > pMaplength)) {
	window.alert("ERROR: Cannot write any new files; database full");
	return -1;
    }
    
    else {
	for(i = 0; i < pMaplength; i++) {
	    if(decrypt(posMap[i]) == '') {
		fileID = i+1;
		pathNum = Math.floor(Math.random()*Math.ceil(numBuckets/2));
		posMap[i] = encrypt(posMap[i]);
		break;
	    }
	}
	var newFileName = file + " : " + fileID;
	stash.push(newFileName);
    }
    
    /**********************************************************************
     * Access and download the path from the server.
     * Then add the stash to the end of the path.
     *********************************************************************/
    
    // Change the path number to one that can be used to access id's from
    // database
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
    
    var dpath = decryptPath(path);
    path = dpath;
    
    // Continue after decryption has occurred
    
    var L = path.length - 1;
    
    /**********************************************************************
     * If overwriting, find file in the temporary stash (path) & update
     *********************************************************************/
    
    // Find the file index that must be reorganized
    if(writeUpdate) {
	for(i = 0; i < stash.length; i++) {
	    var splitFile = stash[i].split(" : ");
	    if(splitFile[5] == fileID) {
		stash[i] = toWrite;
		break;
	    }
	}
    }
    
    /**********************************************************************
     * Put the path into the correct order to be sent back to the database
     * Also encrypts as things are put into the correct order in newPath
     *********************************************************************/
    
    var newData = rearrange(path, L, numNonLeaf);
    var newPath = newData[0];
    stash = newData[1];
    
    padStash();
    p = writeback(newPath);

    count++;
    return fileID;
}

/***************************************************************************
 * rearrange reinserts the contents of the path after the path numbers and 
 * other data has been updated back into a new path to be sent back to the 
 * database.
 **************************************************************************/

function rearrange(path, L, numNonLeaf) {
    var newPath = [];
    var i;
    for(i = 0; i <= L; i++) {
	// Initialize the index of the path & find the range needed to be on path
	newPath[i] = [];
	newPath[i][0] = path[i][0];
	var range = Math.pow(2, i);
	var pathIndexMin = (Number(path[i][0]) * range) - (numNonLeaf + 1);
	var pathIndexMax = (pathIndexMin + range);

	var k = 1;
	for(j=0; j < stash.length; j++) {
	    if(k < 5 && stash[j] != null && onPath(pathIndexMin, pathIndexMax, Number(decrypt(posMap[getFileID(stash[j])-1])))) {
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

/***************************************************************************
 * onPath checks to see whether a given path number falls within a certain 
 * block of the ORAM structure.
 **************************************************************************/

function onPath(min, max, pathNum) {
    if(pathNum == null)
	return false;
    if(min <= Number(pathNum) && max > Number(pathNum)) 
	return true;
    return false;
}


/***************************************************************************
 ************************   MISCELLANEOUS METHODS   ************************
 **************************************************************************/


/**************************************************************************
 * getData does an ORAMRead to retrieve the path containing the requested
 * node of the AVL. It then parses the path and returns the desired node 
 * data.
 *************************************************************************/

function getData(fileID) {
    var data, splitFile;
    if(fileID == 0) { // If the data doesn't exist
	data = ORAMRead(1);
	splitFile = -1;
    }
    else { // Data does exist
	data = ORAMRead(fileID);
	file = getFile(data, fileID);
	splitFile = file.split(" : ");
    }
    return splitFile;
}

/***************************************************************************
 * getFileID retrieves a file id from the provided string. 
 **************************************************************************/

function getFileID(file) {
    if(file == null || file == "") 
	return null;
    var splitFile = file.split(" : ");
    return splitFile[5];
}

/***************************************************************************
 * getFile retrieves a string containing file data from a given path.
 **************************************************************************/

function getFile(path, id) {
    var file = '';
    var splitFile;
    for(j = 0; j < path.length; j++) {
	if(file != '') { break; }
	for(k = 1; k < 5; k++) {
	    if(path[j][k] === '') { break; }
	    splitFile = path[j][k].split(" : ");
	    if(splitFile[5] == id) {
		file = path[j][k];
		break;
	    }	    
	}
    }
    
    return file;
}


/***************************************************************************
 ***********************   ENCRYPT/DECRYPT METHODS   ***********************
 **************************************************************************/


/***************************************************************************
 * Encrypts the given string as well as pads it to a certain length.
 **************************************************************************/

function encrypt(plaintext) {
    plaintext = pad(plaintext);
    var cipher = Crypt.AES.encrypt(String(plaintext), pswd);
    
    return cipher;
}

/***************************************************************************
 * Decrypts the given cipher and removes the padding from the end.
 **************************************************************************/

function decrypt(ciphertext) {
    ciphertext = ciphertext.replace(/ /g, "+");
    var plain = Crypt.AES.decrypt(ciphertext, pswd);
    plain = unpad(plain);
    
    return plain;
}

/***************************************************************************
 * Pads the string to the desired length in order to maintain oblivousness.
 **************************************************************************/

function pad(text) {
    return (text + padder).substring(0,62);
}

/***************************************************************************
 * Removes padding from a previously padded string.
 **************************************************************************/

function unpad(text) {
    return text.substring(0,text.indexOf("$"));
}

/***************************************************************************
 * decryptPath takes a path as an input and decrypts all of its contents 
 * and places the decrypted strings into the stash to be used during ORAM
 * accesses.
 **************************************************************************/

function decryptPath(path) {
    for(i=0; i < path.length; i++) {
	for(j=1; j<5; j++) {
	    path[i][j] = decrypt(path[i][j]);
	    if(path[i][j] != '')
		stash.push(path[i][j]);
	}
    }

    return path;
}

/***************************************************************************
 * padStash pads the stash to log(N) length in order to maintain 
 * obliviousness.
 **************************************************************************/

function padStash() {
    var numPad = Math.log(pMaplength) / Math.log(2);
    for(i=0; i < numPad; i++) {
	if(stash[i] == undefined)
	    stash[i] = encrypt('');
    }
}


/***************************************************************************
 **********************   DATABASE INTERACT METHODS   **********************
 **************************************************************************/


/***************************************************************************
 * Downloads the position map, stash, and root from the MySQL database.
 **************************************************************************/

function download() {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "downloadPM.php", false);
    xmlhttp.send();
    var data = JSON.parse(xmlhttp.responseText);

    return [data[0], data[1], data[2]];
}

/***************************************************************************
 * Accesses the database and pulls the requested path from the database.
 **************************************************************************/

function access(realPathNum) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "accessPM.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("path="+realPathNum);
    
    return JSON.parse(xmlhttp.responseText);
}

/***************************************************************************
 * Writes back to the database the new path made after the read/write 
 * is completed.
 **************************************************************************/

function writeback(result) {
    var newPath = JSON.stringify(result);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "writebackPM.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("path="+newPath);
    
    return JSON.parse(xmlhttp.responseText);
}

/***************************************************************************
 * Uploads the modified position map, stash, and root back to the database
 * after all operations are completed.
 **************************************************************************/

function writePsmpSt() {
    var nposMap = JSON.stringify(posMap);
    var nstash = JSON.stringify(stash);
    var nroot = JSON.stringify(root);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "writePsmpStPM.php", false);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("posMap="+nposMap+"&stash="+nstash+"&root="+nroot);
    
    return JSON.parse(xmlhttp.responseText);
}
