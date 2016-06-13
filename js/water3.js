/************************************************************
~~~~~~~~~ WATER APP 2.0 ~~~~~~~~~ 
Written by Voila! Media Group for Gibsons Water Care, All Rights Reserved. 	
************************************************************/

//GLOBAL VARIABLES
/*Database */
var dbShell; //database name variable
var settings; //whether the db is loaded ie on or off
/*App default settings*/
var frequency; //how often the alert should go
var start; //variable for the start time
var startmin; //variable for splitting the time
var range; //variable returned from db
/*Plugin Permissions*/
var saveCalled = "false"; //This is a flag for determining when to set the alerts
var healthKit = "false"; //This is a flag for IOS to check to see if healthkit exists
var healthKitPermission = "false";

/******************** Plugin Permissions *********************/
/*** LOCAL NOTIFICATIONS ***/
function checkNotificationPermissions(){ //LETS CHECK WHETHER IT HAS BEEN GRANTED IF NOT PROMPT FOR PERMISSION
	window.plugin.notification.local.hasPermission(function (granted) {
	 	if(granted == true){//permission is granted
		}else{
		 	window.plugin.notification.local.promptForPermission();
	 	}
	});
}
/*** HEALTHKIT ***/
function onSuccess(result) { //can be removed when live
	toastr.success('Healthkit Now Authorized', null, {target: $('.messages-home'),"timeOut": "3000","positionClass": "toast-top-full-width"}); 

};
function onError(result) { //can be removed when live
	toastr.error('Healthkit Permission Not Authorized', null, {target: $('.messages-home'),"timeOut": "3000","positionClass": "toast-top-full-width"}); 
};
function onPermissionSuccess(result) { 
	  if(result == "authorized"){ //already authorized continue
		  healthKitPermission = true;
	  }else{
		  window.plugins.healthkit.requestAuthorization( //lets request to read / store water data on healthkit
			  {
			    'readTypes' : ['HKQuantityTypeIdentifierDietaryWater'],
			    'writeTypes' : ['HKQuantityTypeIdentifierDietaryWater']
			  },
			  onSuccess,
			  onError
		  );
	  }	  
};
function onPermissionError(result) {//not able to test if we have permission
  //alert("Error: " + JSON.stringify(result));
  toastr.error('Healthkit Error', null, {target: $('.messages-home'),"timeOut": "3000","positionClass": "toast-top-full-width"}); 
};

function checkHealtkitPermissions(){
	//alert("check permission");
	window.plugins.healthkit.checkAuthStatus(//lets check to see if we have permission to access the healthkit
	{
    	'type'  : 'HKQuantityTypeIdentifierDietaryWater' // or any other HKObjectType
  	},
  		onPermissionSuccess, // will be one of 'undetermined', 'denied', or 'authorized'
  		onPermissionError
  	);
}

/*CHECK HEALTHKIT FOR DATA*/
function onReadHealthSuccess(result) {
  //alert("OK: " + JSON.stringify(result));
  	//lets sort through the results
  	var obj = JSON.stringify(result);
	// var results = [];
	var searchField = "sourceName";
	var searchVal = "Gibson's Water Tracking";
	/*for (var i=0 ; i < obj.list.length ; i++)
	{
	    if (obj.list[i][searchField] != searchVal) {//check for any that aren't with this app and return
	        results.push(obj.list[i]);
	    }
	}*/
	//console.log(results);
	search(obj,searchVal);
	
	function search(source, name) {
	    var results = [];
	    var index;
	    var entry;
	
	    name = name.toUpperCase();
	    for (index = 0; index < source.length; ++index) {
	        entry = source[index];
	        if (entry && entry.name && entry.name.toUpperCase().indexOf(name) !== -1) {
	            results.push(entry);
	        }
	    }
	
	    //return results;
	    console.log(results);
	}
};

function onReadHealthError(result) {
  alert("Error: " + JSON.stringify(result));
};

function gethealthkitdata(){
	//alert(new Date(new Date().setHours(0,0,0,0)) + " - - " + new Date(Date.now()));
	window.plugins.healthkit.querySampleType(
	  {
	    //'startDate' : new Date(new Date().getTime()-2*24*60*60*1000), // two days ago
	    'startDate' : new Date(new Date().setHours(0,0,0,0)),
	    'endDate'   : new Date(Date.now()), // now
	    'sampleType': 'HKQuantityTypeIdentifierDietaryWater',
	    'unit'      : 'mL' // make sure this is compatible with the sampleType literUnit
	  },
	  onReadHealthSuccess,
	  onReadHealthError
	);
}

/*SAVE DATA TO HEALTHKIT*/
function onAddDataSuccess(result) {
  //alert("OK: " + JSON.stringify(result));
  //toastr.Success('Saved to Healthkit', null, {target: $('.messages-water'),"timeOut": "3000","positionClass": "toast-top-full-width"}); 
};

function onAddDataError(result) {
  //alert("Error: " + JSON.stringify(result));
  //toastr.error('Healthkit Error', null, {target: $('.messages-water'),"timeOut": "3000","positionClass": "toast-top-full-width"}); 
};
function addwater(amount,startdate,enddate){ // save the water data to the healthkit as well
	if(amount){ //amount in mL
		//alert(amount);
		if(startdate == "" && enddate == ""){
			startdate = new Date(Date.now());
			enddate = new Date();
		}
		//enddate = newDate().setHours(24, 0, 0);
		//alert(date + ":" + enddate + ":" + amount);
		window.plugins.healthkit.saveQuantitySample(
		  {
		    'startDate': new Date(Date.now()), // a day ago
		    'endDate': new Date(),//, //enddate now
		    'sampleType': 'HKQuantityTypeIdentifierDietaryWater', // make sure you request write access beforehand
		    'unit': 'mL',
		    'amount': amount
		  },
		  onAddDataSuccess,
		  onAddDataError
		);
	}else{
		alert("no amount set");
	}
}

/***************** DEVICE READY PHONEGAP *****************/
//check for the device to be ready
function phoneReady() {
	//First, open our db
    dbShell = window.openDatabase("AppSave", 2, "Appsave", 1000000);  
    //Set it up if not set up / callback success is getSettings
	dbShell.transaction(setupTable,dbErrorHandler,getSettings);     
	/*** IOS 8 and up get permission to do badges, 
	notifications, access healthkit ***/    
    //###Plugins - BADGE
    cordova.plugins.notification.badge.hasPermission(function (granted) { 
	    //might not need to check since we are getting permission for the Notifications
		// alert("badges are permitted");
		window.plugin.notification.badge.clear(); 
		//window.plugins.notification.badge.configure({ autoClear: true });
	});
    //window.plugin.notification.badge.setClearOnTap(true); //clear the badge amount when clicked on
    window.plugin.notification.badge.configure({ autoClear: true });//clear badges we are in the app 
    //###Plugins - NOTIFICATIONS PERMISSION
    checkNotificationPermissions();
	//###Plugins - HEALTHKIT AVAILABLE?
	window.plugins.healthkit.available(
	   function(isAvailable) {
		   if(isAvailable){ //ok we have healthkit lets ask to use / store data
			  healthKit = "true"; //we can ask for permission to use HEALTHKIT DATA
			  checkHealtkitPermissions(); 
		   }
	   }
	);
}
/*When we come back to the phone*/
function phoneResume(){ //clear the badges
	window.plugin.notification.badge.clear(); 
}

/***************** DATABASE FUNCTIONS *****************/
function dbErrorHandler(err){ /* ERROR HANDLER */
    alert("DB Error: "+err.message + "\nCode="+err.code);
}

function setupTable(tx){ /*SETUP TABLE(S)*/
    tx.executeSql("CREATE TABLE IF NOT EXISTS saved(id,onoff,frequency,start,range,goal,updated)");
    tx.executeSql("CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY,time,updated)"); 
    tx.executeSql("CREATE TABLE IF NOT EXISTS goals(id INTEGER PRIMARY KEY,date,time,amount,updated)");
} 

function getSettings() { /*GET SETTING ENTRIES*/
    dbShell.transaction(function(tx) {
        tx.executeSql("select id, onoff, frequency, start, range, goal, updated from saved order by updated desc",[],renderSettings,dbErrorHandler);
    }, dbErrorHandler);
}

function getAlerts() { /*GET ALERTS ENTRIES*/
    dbShell.transaction(function(tx) {
        tx.executeSql("select id, time, updated from alerts order by updated desc",[],renderAlerts,dbErrorHandler);
    }, dbErrorHandler);
}

function getWater() { /*GET WATER ENTRIES*/
    dbShell.transaction(function(tx) {
        tx.executeSql("select id, date, time, amount, updated from goals order by id desc",[],renderWater,dbErrorHandler);
    }, dbErrorHandler);
}

function getGoal() { /*GET GOAL ENTRIES*/
    dbShell.transaction(function(tx) {
        tx.executeSql("select id, date, time, amount, updated from goals order by id desc",[],renderGoal,dbErrorHandler);
    }, dbErrorHandler);
    
}
function resetTracked(){ /*DELETE GOAL DB CONTENTS*/
	dbShell.transaction(function(tx) {
		tx.executeSql("DROP TABLE goals",[], 
    		function(tx,results){console.log("Successfully Dropped")},
			function(tx,error){console.log("Could not delete")});
	}, dbErrorHandler);
    tx.executeSql("CREATE TABLE IF NOT EXISTS goals(id INTEGER PRIMARY KEY,date,time,amount,updated)"); //recreate the table
}

/* RENDER THE SETTINGS TO THE SCREEN */
function renderSettings(tx,results){
    if (results.rows.length == 0) { //no settings found - create a default record
		tx.executeSql('INSERT INTO saved (id, onoff, frequency, start, range, goal, updated) VALUES (1, "off", "1 hour", "8:00", "8-17", "64", "default")'); 
		getSettings(); //load it again
    } else { //load and display the settings.
       var s = "";
       for(var i=0; i<results.rows.length; i++) {
       	 settings = results.rows.item(i).onoff;
       	 
       	 //if(settings != "off"){
	     //lets see what is stored in the settings area. 
   	 	frequency = results.rows.item(i).frequency;
   	 	start = results.rows.item(i).start;
   	 	startmin = start.split(":");
   	 	range = results.rows.item(i).range;
   	 	rangemin = range.split(":");
   	 	goal = results.rows.item(i).goal; 
   	 	$("#watergoal").val(goal);  
         //}
       }
       if(saveCalled == "true"){
	       createNotifications(); //create the notifications
	       saveCalled = false; //turn it back off now
       }
       $("#mainContent").html(s);//show what is saved 
       $(".alertSettings span").html(settings);
       if(settings == "on"){
		   $(".alertSettings span").removeClass("off");
		   $(".alertSettings span").addClass("on");
       }else{
	       $(".alertSettings span").removeClass("on");
		   $(".alertSettings span").addClass("off");
       }
       //set the default button
       $(".alertSettings span").addClass(settings);
    }
}

/*RENDER THE ALERTS TO THE SCREEN*/
function renderAlerts(tx,results){
    if (results.rows.length == 0) {//none set yet
		$("#alertstatus").html("no alerts set yet.");//show what is saved 
		$(".addeddata").html("");//clear out the old stuff
    } else {//load and display the settings.
    	$("#alertstatus").html("");
    	$(".addeddata").html("");//clear out the old stuff
       var s = "";
      
       for(var i=0; i<results.rows.length; i++) {
       	 if(settings != "off"){//print out the saved times with ID's 
       	 	id = results.rows.item(i).id;
       	 	time = results.rows.item(i).time;
       	 	 //alert(id);
	   	 	s +=  "<tr><td>" + time + "</td><td><a href='#' class='ui-btn ui-mini ui-corner-all ui-btn-inline ui-btn-a deletealert' id='"+id+"'><i class='icon-deletealarm'></i></a></td></tr>";  
         }else{
	        s = "<tr><td colspan='3'>alerts currently turned off.</td></tr>";
         }
       }
       //show what is saved 
       $(".addeddata").html("<table data-role='table' class='ui-responsive table-stroke table-alerts table-stripe' style='width:100%'><tr><thead><th>Date / Time</th><th>Options</th></thead></tr><tr><tbody>" + s + "</tbody></table>");
    }
}
//for time lets add a preceding zero 
function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}
/*RENDER THE WATER TRACKED TO THE SCREEN*/
function renderWater(tx,results){
	//lets set the field timer to the current time
	//set the default time for the save water
		
	var d = new Date();
	var h = addZero(d.getHours());
	var m = addZero(d.getMinutes());
	
	$("#mydate").val(h + ":" + m);

    if (results.rows.length == 0) {//none set yet
		$("#waterstatus").html("nothing saved.");//show what is saved 
		$(".waterdata").html(""); //remove the current data
    } else { //load and display the settings.
    	
    	var curdate = new Date();//check date then check records date
		var mday = curdate.getDate();
		var mmo = curdate.getMonth() + 1;
		
    	$("#waterstatus").html("");
    	$(".waterdata").html("");//clear out the old stuff
    	
       var s = "";
       var reset = 0;
       for(var i=0; i<results.rows.length; i++) {
       	 	id = results.rows.item(i).id;
       	 	date = results.rows.item(i).date;
       	 	time = results.rows.item(i).time;
       	 	amount = results.rows.item(i).amount;
       	 	var checksavedDate = date.split("/");//split it up now so that we can see how the dates compare
       	 	
       	 	console.log(checksavedDate[0] + " - " + mday + " =====" + mmo + " - " + checksavedDate[1]);
	   	 	///// NOW WE NEED TO COMPARE THE DATES TO SEE IF THE DATE IS IN THE PAST ////////
	   	 	if(checksavedDate[0] != mday || checksavedDate[1] != mmo){
	   	 		//remove this one
	   	 		deleteAlert(id, function(){
	   	 			checkAlerts() //refresh what is saved to get the latest. 
	    		});

	   	 		//reset ++;
	   	 	}else{
	   	 		s +=  "<tr><td>" + date + "</td><td>" + time + "</td><td>" + amount + "</td><td><a href='#' class='ui-btn ui-mini ui-btn-inline ui-btn-b editRecord' id=" + id + "><i class='icon-edit'></i></a><a href='#' class='ui-btn ui-mini ui-btn-inline ui-corner-all ui-btn-b deleteRecord' id=" + id + "><i class='icon-circledelete'></i></a></td></tr>";//print out the saved times with ID's  
	   	 	}
       }
       if(reset > 0){ //clear and rebuild the database
		   	resetTracked();
	   }
       $(".waterdata").html("<table data-role='table' class='ui-responsive table-stroke table-alerts table-stripe' style='width:100%'><tr><thead><th>Date</th><th>Time</th><th>Amount</th><th>Options</th></thead></tr><tr><tbody>" + s + "</tbody></table>");//show what is saved 
    }
}

/* RENDER THE GOALS SAVED TO THE SCREEN */
function renderGoal(tx,results){
    if (results.rows.length == 0) {//none set yet
		s = 0;
		$(".inspiration").html("Be sure to track some water");
    } else {//load and display the settings.
    	
    	//need to make sure that the goal is saved as such
    	//need to sort out for just today
       var s = Number();
       var insp = "";
       
       //check local objects for saved water
       //just todays date
       var td = new Date();
       var tdy = td.getFullYear();
       var tdm = td.getMonth() + 1;
       var tdd = td.getDate();
       var today = tdd + "/" + tdm + "/" + tdy;
       for(var i=0; i<results.rows.length; i++) {
       	 	date = results.rows.item(i).date;
       	 	//console.log(date);
       	 	if(date == today){
	       	 	amount = results.rows.item(i).amount;
		   	 	s +=  Number(amount);//print out the saved times with ID's  
		   	 	console.log(s);
       	 	}else{
	       	 	s += 0;
	       	 	console.log("not found" + date + " : " + today);
       	 	}
       }
       
       //if permitted and available check healthkit for saved water
       
       //some inspiration messages
       if(s <= 3){
	       insp = "Don't forget to drink your water.";
       }else if(s <= 32){
	       insp = "Almost there keep up the good work.";
       }else if(s >= 64){
	       insp = "Congratulations you've reached your daily goal of water.";
       }
       
       $(".inspiration").html(insp);
	   RenderChart(s,goal);
	   $(".showtotal").html(s+"/"+goal);
    }
	
    
}
function RenderChart(amount,goal){
	 if (config.data.datasets.length > 0) {
		//remove the old data
		config.data.datasets.splice(0, 1);
        
        //add in teh new data
        var newDataset = {
            backgroundColor: ["#003366","#f8981d","#CCCCCC"],
            data: [goal,amount,0],
            label: 'New dataset ' + config.data.datasets.length,
        };

        for (var index = 0; index < config.data.labels.length; ++index) {
            newDataset.data.push();
        }

        config.data.datasets.push(newDataset);
        
        window.myDoughnut.update();
     }
}

/* CREATE THE NOTIFICATIONS TO REMIND WATER DRINKING */
function createNotifications(){

	var startTime;
	var startCheck; 
	var endTime;
	var endCheck;
	
	alertTimes = new Array();
	alertSet = new Array();
	startmin = start.split(":");
	
	startTime = $("#starttime").val();
	startCheck = startTime.split(":");
	endTime = $("#endtime").val();
	endCheck = endTime.split(":");
	
	y = Number(startCheck[0]);
	while(y < endCheck[0]){ //loop through to find all the possible times during the day
		alertTimes.push(y);
		y += Number(frequency);
	}
	
	//get the current minute to compare 
	var d = new Date();
	var h = d.getHours(); 
	var m = d.getMinutes(); if(m < 10){ m = "0"+m;} 

	//now remove all times that have already happened.
	for(z=0;z<alertTimes.length;z++){
		
		if(alertTimes[z] == h){ //its the same hour as the time for the alert
			if(m > startmin[1]){ //its past the set time//added to remove current hour
			}else{
				alertSet.push(alertTimes[z] + ":" + startmin[1]); //remove it from the list of alerts
			}
		}else{
			alertSet.push(alertTimes[z] + ":" + startmin[1]);
		}
	}
    
	/* CREATE NEW NOTIFICATIONS */
	//init variables to convert human times back into javascript times.
	var dt;
	var dn;
	var spld;
	
	//CLEAR OUT THE OLD NOTIFICATIONS NO MATTER WHAT
	window.plugin.notification.local.getScheduledIds(function(scheduledIds) {
	
		for (var i = 0; scheduledIds.length > i; i++) { //remove all old notifications
			window.plugin.notification.local.cancel(scheduledIds[i]);
		}
		
		/*CLEAR OUT THE SAVED DATA*/
		dbShell.transaction(function(tx) { //clearl alerts table
			tx.executeSql("DELETE FROM alerts",[]);
		}, dbErrorHandler);
		
		
		if(settings == "on"){//check here to see if the setting is on or off

			for(r=0;r<alertSet.length;r++){ //check to see if one of the alerts is sprung - if it is then send out an alert
				
				//SET A NEW NOTIFICATION
				spld = alertSet[r].split(":");
				var dn = new Date();
				dn.setHours(spld[0]);
				dn.setMinutes(spld[1]);
				
				var d = new Date();
				var n = d.getTime();
				console.log(dn);
    
				//ADD THE ALERTS TO THE NOTIFICATION QUE
				window.plugin.notification.local.add({
				    id:      Number(n * (r+1)), //randomize the number more
				    title:   'Water Reminder',
				    message: 'Drink Some Water.',
				    repeat:  'daily',
				    badge:      1,  // Displays number badge to notification
				    //autoCancel: true,
				    //date:    Date(alertSet[r])
				    date:    dn
				});
				
				//or push them here to the database.
				dy = d.getDate();
				m = Number(d.getMonth()+1);
				y = d.getFullYear();
				time = dy+"/"+m+"/"+y+ " - " + alertSet[r];
				
				saveAlert(Number(n*(r+1)),time); //push these to the db 
			}
		}
	});
	toastr.success('Successfully Saved', null, {target: $('.messages-alerts'),"timeOut": "3000","positionClass": "toast-top-full-width"});
	getAlerts(); //update the page with the new set alerts
}
function checkAlerts(){
	//show what is saved
	getAlerts();
	//THIS NEEDS TO SHOW SOMEWHERE ELSE
	window.plugin.notification.local.getScheduledIds( function (scheduledIds) { //display the saved ids for debugging
    	$(".savedalerts").html("<table data-role='table' class='ui-responsive table-stroke table-alerts table-stripe' style='width:100%'><tr><td>notification IDs:</td><td>" + scheduledIds.join(' ,') + "</td></tr></table>");
	});
}

/*SAVE TO DB*/
function saveSettings(note, cb) {
    //if(note.title == "") note.title = "[No Title]"; //left over from old note application
    dbShell.transaction(function(tx) {
        if(note.id == "") 
        tx.executeSql("insert into saved(onoff,frequency,start,range,updated) values(?,?,?,?,?,?)",[note.onoff,note.frequency,note.start,note.range,note.goal,new Date()]);
        else tx.executeSql("update saved set onoff=?, frequency=?, start=?, range=?, goal=?, updated=? where id=?",[note.onoff,note.frequency,note.start,note.range,note.goal, new Date(), note.id]);
    }, dbErrorHandler,cb);
    //alert("saved");
}

/*SAVE ALERT*/
function saveAlert(id,time){
	dbShell.transaction(function(tx) {
		tx.executeSql("insert into alerts(id,time,updated) values(?,?,?)",[id,time, new Date()]);
	}, dbErrorHandler);
}

/*SAVE GOAL*/
function saveGoal(goal, cb) {
    dbShell.transaction(function(tx) {
        if(goal.id == undefined || goal.id == "")
        tx.executeSql("insert into goals(date,time,amount,updated) values(?,?,?,?)",[goal.date, goal.time, goal.amount, new Date()],renderSettings,dbErrorHandler);
        else tx.executeSql("update goals set date=?, time=?, amount=?, updated=? where id=?",[goal.date, goal.time, goal.amount, new Date(), goal.id],renderSettings,dbErrorHandler);
        //alert("edit");
    }, dbErrorHandler,cb);
    
    
    //
    /*dbShell.transaction(function(tx) {
        tx.executeSql("select id, onoff, frequency, start, range, goal, updated from saved order by updated desc",[],renderSettings,dbErrorHandler);
    }, dbErrorHandler);*/
    //
}

/*REMOVE ENTRY*/
function deleteGoal(id, cb){
	if(id){
		dbShell.transaction(function(tx) {
			tx.executeSql('DELETE FROM goals WHERE id = ?', [id]);
		}, dbErrorHandler,cb);
	}
}

/*REMOVE ALERT*/
function deleteAlert(id, cb){
	if(id){
		dbShell.transaction(function(tx) {
			tx.executeSql('DELETE FROM alerts WHERE id = ?', [id]);
			window.plugin.notification.local.cancel(id); //remove from notifications too
		}, dbErrorHandler,cb);
	}
}


var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    // Bind any events that are required on startup. Common events are:
    // `load`, `deviceready`, `offline`, and `online`.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener('resume', this.onResume, false);
    },
    // deviceready Event Handler
    onDeviceReady: function() {
        phoneReady();
    },
    onResume: function() {
        phoneResume();
    }
};

/*ALERTS PAGE DISPLAY SETTINGS*/
function switchedON(){
	startmin = start.split(":");
	
	$("#slider2").val('on'); //make sure that on is turned on 
	$("#slider2").slider('refresh');//this may be funking up the system
	
	//check the other settings
	$("#select-native-2 :radio").filter('[value="'+frequency+'"]').click();
	
	$("#starttime").val(start);
	$("#endtime").val(range);
		
	$("#select-native-2").removeClass("ui-disabled");
	$("#starttime").removeClass("ui-disabled");
	$("#endtime").removeClass("ui-disabled");
	$("#buttona").removeClass("ui-disabled");
	$("#buttonb").removeClass("ui-disabled");
}

$(document).ready(function() {
	var d = new Date();
	var dt = d.getDate();
	var mt = d.getMonth() + 1;
	var yt = d.getFullYear();
	$(".date-tag").val(dt + "/" + mt + "/" + yt);
	
	FastClick.attach(document.body); /*make the clicks faster on mobile*/
	
	/*Alerts menu*/
	if($("#slider2").val() == "off"){//disable the other items
		$("#select-native-2").addClass("ui-disabled");
		$("#starttime").addClass("ui-disabled");
		$("#endtime").addClass("ui-disabled");
		$("#buttona").addClass("ui-disabled");
		$("#buttonb").addClass("ui-disabled");
		//$("#addalert").addClass("ui-disabled");
		$(".alertSettings span").html("off");
		$(".alertSettings span").removeClass("on");
		$(".alertSettings span").addClass("off");
		$(".saveSettings").addClass("ui-disabled");
	}
	//check to see if the alerts are on or off
	if(settings == "on"){
		$("#slider2").val() == "on";
		$(".alertSettings span").html("on");
		$(".alertSettings span").removeClass("off");
		$(".alertSettings span").addClass("on");
		$(".saveSettings").removeClass("ui-disabled");
		$("#buttona").removeClass("ui-disabled");
		$("#buttonb").removeClass("ui-disabled");
		//$("#addalert").removeClass("ui-disabled");
		validateTime();
	}else{
		$(".alertSettings span").removeClass("on");
		$(".alertSettings span").addClass("off");
	}
	
	$("#slider2").change(function() {//reenable the tools when its turned on. 
		if($("#slider2").val() == "off"){
			//update classes
			$("#select-native-2").addClass("ui-disabled");
			$("#starttime").addClass("ui-disabled");
			$("#endtime").addClass("ui-disabled");
			$("#buttona").addClass("ui-disabled");
			$("#buttonb").addClass("ui-disabled");
			//$("#addalert").addClass("ui-disabled");
			$(".alertSettings span").removeClass("on");
			$(".alertSettings span").addClass("off");
			$("#mainContent").html("");
			$("#alerttime").html("");
			$("#alertstatus").html("");
			$(".alertSettings span").html("off");
		}else{
			validateTime();
			//update classes
			$("#select-native-2").removeClass("ui-disabled");
			$("#starttime").removeClass("ui-disabled");
			$("#endtime").removeClass("ui-disabled");
			$("#buttona").removeClass("ui-disabled");
			$("#buttonb").removeClass("ui-disabled");
			//$("#addalert").removeClass("ui-disabled");
			$(".alertSettings span").removeClass("off");
			$(".alertSettings span").addClass("on");
			$(".alertSettings span").html("on");
			$(".saveSettings").removeClass("ui-disabled");
		}
	});
	
	function validateTime(){
		//use the 24 hour clock to check the hours
		var errors = "";
		var startCheck; 
		var endCheck;
		
		startCheck = $("#starttime").val().split(":");
		endCheck = $("#endtime").val().split(":");
		
		if(startCheck != "" && endCheck != ""){
			//if select-hour-end < select-hour - error
			if(Number(endCheck[0]) < Number(startCheck[0])){
				errors += "<li>Your ranges end time needs to be AFTER your start time</li>";
			}
			if(Number(startCheck[0]) == Number(endCheck[0])){
				errors += "<li>Your range can't be the same start and end times</li>";
			}
			if((Number(endCheck[0]) - Number(startCheck[0])) < frequency){
				var compare = Number(endCheck[0]) - Number(startCheck[0]);
				errors += "<li>Your range doesn't allow for the frequency you've chosen.";
				errors += compare + "</li>";
			}
			if(errors != ""){
				//show errors and disable save if the times are off
				toastr.error('<strong>There were some errors: Please fix before saving</strong><ul>' + errors + '</ul>', null, {target: $('.messages-alerts'),"timeOut": "3000","positionClass": "toast-top-full-width"});
				//alert("hello");
				$(".saveSettings").addClass("ui-disabled");
			}else{
				$(".saveSettings").removeClass("ui-disabled");
				
			}
		}
	}
	
	$("#select-native-2").change(function() { validateTime(); });
	
	$("#starttime").change(function() { validateTime(); });
	$("#endtime").change(function() { validateTime(); });
	
	//save the settings to the database
	$("#editNoteForm").on("submit",function(e) {
		//need to validate that the date is set before this can be submitted.
		if($("#starttime").val() == "" || $("#endtime").val() == ""){
			//$("#mainpopupError p").html("You need to choose both a start and end time");
			//$("#popupDialog3").click();
			toastr.error('<strong>There were some errors: Please fix before saving</strong><ul>' + errors + '</ul>', null, {target: $('.messages-alerts'),"timeOut": "3000","positionClass": "toast-top-full-width"});
		}else{
	        var data = {onoff:$('#slider2').val(), 
	                    frequency:$("#select-native-2 :radio:checked").val(),
	                    start:$("#starttime").val(),
	                    range:$("#endtime").val(),
	                    goal:$("#watergoal").val(),
	                    id: 1 // Replace the one entry
	        };
	        saveSettings(data,function() {
				saveCalled = "true"; //send a flag to the render function to generate the notifcations.
				getSettings(); //refresh what is saved to get the latest.
				
	        });
        }
        e.preventDefault(); //stop the page from refreshing
    });
    
    /*REMOVE SCHEDULED ALERTS*/
    $.mobile.document.on( "click", ".deletealert", function( evt ) {
		//alert("delete" + this.id);
		 deleteAlert(this.id, function(){
		   checkAlerts() //refresh what is saved to get the latest. 
	    });
    });
    $.mobile.document.on( "click", ".optiondeletewater", function( evt ) {
		//alert("delete" + this.id);
		d = new Date();
		date = d.setHours(0, 0, 0);
		alert(date);
		addwater(0,date);
    });
    /*SAVE WATER TRACKED*/
    /*need to validate that it can be saved before saving
    ie check that the same date and time don't already exist*/
    $("#editWater").on("submit",function(e) {
    	if($(".date-input").val() != ""){//check that a time is set
	    	var checkDate = $(".date-tag").val();
	    	var checkTime = $(".date-input").val();
	    	var checkAmount = $("#select-water-amount :radio:checked").val();
	    	var isThere = "";
	    	dbShell.transaction(function(tx) { //query the db for the entered data check for an exact match same day - time - amount
	            tx.executeSql("select date, time, amount from goals where time=? and date=? and amount=?",[checkTime,checkDate,checkAmount],function(tx,results) {
	            	isThere = results.rows.length;//get the length
	            	//alert("isThere: " + isThere);
	            	if(isThere == 0){ //its not there lets add this one.
				    	var data = {id:$('.id-tag').val(), 
				                    date:$(".date-tag").val(),
				                    time:$(".date-input").val(),
				                    amount:$("#select-water-amount :radio:checked").val()
				        };
						saveGoal(data,function() {
							getWater(); //refresh what is saved to get the latest.
							if(healthKitPermission && healthKit){
								//gettime = $(".date-input").val().split(":");
								d = new Date();
								date = d.setHours(0, 0, 0);
								amount = $("#select-water-amount :radio:checked").val();
								addwater(amount,date); //push to healthkit
							}
							toastr.success('Successfully Saved', null, {target: $('.messages-water'),"timeOut": "3000","positionClass": "toast-top-full-width"});
							$(".cancel").hide(); //hide the cancel button if it's showing
							$('.id-tag').val("");//clear the id field
				        });
			        }else{
			        	toastr.error('Sorry you have entered this already.', null, {target: $('.messages-water'),"timeOut": "3000","positionClass": "toast-top-full-width"});
			        }
	            });
			}, dbErrorHandler);
        }else{
	        $("#popupError p").html("You need to pick a time!"); //populate the error window
	        $("#popupDialog2").click(); //pop up error window
        }
	    e.preventDefault(); //stop the page from refreshing
    });
    
    /*EDIT WATER TRACKED ENTRIES*/
    $.mobile.document.on( "click", ".editRecord", function( evt ) {
    	var Id = this.id;
    	var SelAmount;
		dbShell.transaction(function(tx) {
            tx.executeSql("select id, date, time, amount from goals where id=?",[Id],function(tx,results) {
            	$(".id-tag").val(results.rows.item(0).id);//id to make sure that save causes it to replace old record.
                $(".date-input").val(results.rows.item(0).time);
                SelAmount = results.rows.item(0).amount;
                $("#select-water-amount :radio").filter('[value="'+SelAmount+'"]').click();
                $("#select-water-amount :radio").checkboxradio("refresh");
                $("#waterset .close").click();//close the open panel
                $(".cancel").show();
            });
       }, dbErrorHandler);
    });
    
    /*CANCEL EDIT WATER TRACKED ENTRIES*/
    $.mobile.document.on( "click", ".cancel", function( evt ) {
	    $(".cancel").hide();
	    $('.id-tag').val("");
	    $(".date-input").val("");
	    $("#select-choice-1").val(".5").selectmenu("refresh"); 
	    evt.preventDefault();
    });
    
    /*DELETE WATER TRACKED ENTRIES*/
    $.mobile.document.on( "click", ".deleteRecord", function( evt ) {
	    deleteGoal(this.id, function(){
		   getWater(); //refresh what is saved to get the latest. 
	    });
    });
    
	$.mobile.document.on( "click", "#save-goal", function( evt ) {
		dbShell.transaction(function(tx) {
		//stuff to add to db. 
		if($("#watergoal").val() != ""){
			tx.executeSql("update saved set goal=? where id=1",[$("#watergoal").val()],function(tx,results) {
				toastr.success('Successfully Saved', null, {target: $('.messages'),"timeOut": "3000","positionClass": "toast-top-full-width"});
			});
			 //else tx.executeSql("update saved set onoff=?, frequency=?, start=?, range=?, goal=?, updated=? where id=?",
			 }else{
				 //console.log("not able to save no goal amount set");
				 toastr.error('<strong>not able to save no goal amount set</strong>', null, {target: $('.messages'),"timeOut": "3000","positionClass": "toast-top-full-width"});
			 }
		}, dbErrorHandler);
		
		evt.preventDefault();
	});
	$.mobile.document.on( "click", ".option-checkwater", function( evt ) {
		gethealthkitdata();
	});
	$.mobile.document.on( "click", ".option-addwater", function( evt ) {
		addwater(4);
	});
	
	
	
    /*ON PAGE LOAD SHOW THE FOLLOWING*/
    $(document).on("pagecontainerbeforeshow", function( event, ui ) {
    	var ThisPage = $(':mobile-pagecontainer').pagecontainer('getActivePage').attr('id');
    	if(ThisPage == "alerts"){
	    	if(settings == "on"){switchedON();checkAlerts();}
    	}else if(ThisPage == "track"){getWater();
    	}else if(ThisPage == "account"){getGoal();}
    });
    
    $(document).on("pagecontainershow", function( event, ui ) {
    	var ThisPage = $(':mobile-pagecontainer').pagecontainer('getActivePage').attr('id');
    	if(ThisPage == "alerts"){
	    	if(settings == "on"){switchedON();checkAlerts();}
    	}else if(ThisPage == "track"){getWater();
    	}else if(ThisPage == "account"){getGoal();
    	}
    });
    
    /*clockpicker*/
    $('.clockpicker').clockpicker().find('input').change(function(){console.log(this.value);});
	if (/Mobile/.test(navigator.userAgent)) {$('.clockpicker input').prop('readOnly', true);}
	
	//global variables
	$.mobile.defaultPageTransition = "slidefade";
	$.mobile.transitionFallbacks.slideout = "none";
});