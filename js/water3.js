/*DATABASE*/
//THIS BIT WILL BE FOR THE LIVE VERSION THAT IS ON THE DEVICE.
/*Database controls based on the Simple saved usage
*/
var dbShell; //database name variable
var settings; //whether the db is loaded ie on or off
var frequency; //how often the alert should go
var start; //variable for the start time
var startmin; //variable for splitting the time
var range; //variable returned from db
var saveCalled = "false"; //This is a flag for determining when to set the alerts
var healthKit = "false"; //This is a flag for IOS to check to see if healthkit exists


/***************** DEVICE READY PHONEGAP *****************/
//check for the device to be ready
function phoneReady() {
    dbShell = window.openDatabase("AppSave", 2, "Appsave", 1000000); //First, open our db
    dbShell.transaction(setupTable,dbErrorHandler,getSettings); //Set it up if not set up / callback success is getSettings
    /*IOS 8 and up needs permission for all this stuff*/
    
    //###Plugins - BADGE
    cordova.plugins.notification.badge.hasPermission(function (granted) {
    // console.log('Permission has been granted: ' + granted);
    // alert("badges are permitted");
	});
    window.plugin.notification.badge.setClearOnTap(true); //clear the badge amount when clicked on
    //###Plugins - NOTIFICATIONS
    checkNotificationPermissions();
	//###Plugins - HEALTHKIT
	window.plugins.healthkit.available(/*LETS CHECK TO SEE IF IT'S IOS TO SEE IF WE CAN SHARE HEALTH DATA*/
	   function(isAvailable) {
		   if(isAvailable){
			  checkHealtkitPermissions(); //ok we have healthkit lets ask to use / store data
			  healthKit = "true"; //we can ask for permission to use HEALTHKIT DATA
		   }
	   }
	);
}

function phoneResume(){ //clear the badges
	window.plugin.notification.badge.clear(); 
}
function checkNotificationPermissions(){ //LETS CHECK WHETHER IT HAS BEEN GRANTED IF NOT PROMPT FOR PERMISSION
	window.plugin.notification.local.hasPermission(function (granted) {
	 	if(granted == true){//permission is granted
		}else{
		 	window.plugin.notification.local.promptForPermission();
	 	}
	});
}
function onSuccess(result) {
  //alert("OK you are authorized: " + JSON.stringify(result));
   //test to gather data
};

function onError(result) {
  alert("Error: " + JSON.stringify(result));
};
function onPermissionSuccess(result) { 
	  if(result == "authorized"){ //already authorized continue
		  alert("OK: Authorized" + JSON.stringify(result));
	  }else{
		  window.plugins.healthkit.requestAuthorization( //lets request authorization to read / store water data on healthkit
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
  alert("Error: " + JSON.stringify(result));
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
	$("#homedebug .loading .settings").html("<p>settings db row length: " + results.rows.length + "</p>");
    if (results.rows.length == 0) { //no settings found - create a default record
		tx.executeSql('INSERT INTO saved (id, onoff, frequency, start, range, goal, updated) VALUES (1, "off", "1 hour", "8:00", "8-17", "64", "default")'); 
		getSettings(); //load it again
    } else { //load and display the settings.
       var s = "";
       for(var i=0; i<results.rows.length; i++) {
       	 settings = results.rows.item(i).onoff;
       	 if(settings != "off"){
       	 	frequency = results.rows.item(i).frequency;
       	 	start = results.rows.item(i).start;
       	 	startmin = start.split(":");
       	 	range = results.rows.item(i).range;
       	 	rangemin = range.split(":");
       	 	goal = results.rows.item(i).goal
	   	 	s += "<strong>Saved Settings:</strong><p>ON/OFF: " + results.rows.item(i).onoff + "</p><p> Frequency: "  + frequency + "</p><p>Start:"  + start + "</p><p>Range: " +  range + "</p><p>Goal: " + goal + " oz</p><br>";   
         }
       }
       if(saveCalled == "true"){
	       createNotifications(); //create the notifications
	       saveCalled = false; //turn it back off now
       }
       $("#mainContent").html(s);//show what is saved 
       $(".alertSettings span").html(settings);
    }
}
/*RENDER THE ALERTS TO THE SCREEN*/
function renderAlerts(tx,results){
	$("#homedebug .loading .alerts").html("<p>alert db row length: " + results.rows.length + "</p>");
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
	   	 	s +=  "<tr><td>" + time + "</td><td><a href='#' class='ui-btn ui-mini ui-corner-all ui-btn-inline ui-btn-a deletealert' id='"+id+"'>Delete</a></td></tr>";  
         }else{
	        s = "<tr><td colspan='3'>alerts currently turned off.</td></tr>";
         }
       }
       //show what is saved 
       $(".addeddata").html("<table data-role='table' class='ui-responsive table-stroke table-alerts table-stripe' style='width:100%'><tr><thead><th>Date / Time</th><th>Options</th></thead></tr><tr><tbody>" + s + "</tbody></table>");
    }
}
/*RENDER THE WATER TRACKED TO THE SCREEN*/
function renderWater(tx,results){
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
       	 	
	   	 	///// NOW WE NEED TO COMPARE THE DATES TO SEE IF THE DATE IS IN THE PAST ////////
	   	 	if(checksavedDate[0] != mday && checksavedDate[1] != mmo){
	   	 		reset ++;
	   	 	}else{
	   	 		s +=  "<tr><td>" + time + "</td><td>" + amount + "</td><td><a href='#' class='ui-btn ui-mini ui-btn-inline ui-btn-b editRecord' id=" + id + ">Edit</a><a href='#' class='ui-btn ui-mini ui-btn-inline ui-corner-all ui-btn-b deleteRecord' id=" + id + ">Delete</a></td></tr>";//print out the saved times with ID's  
	   	 	}
       }
       if(reset > 0){ //clear and rebuild the database
		   	resetTracked();
	   }
       $(".waterdata").html("<table data-role='table' class='ui-responsive table-stroke table-alerts table-stripe' style='width:100%'><tr><thead><th>Time</th><th>Amount</th><th>Options</th></thead></tr><tr><tbody>" + s + "</tbody></table>");//show what is saved 
    }
}

/* RENDER THE GOALS SAVED TO THE SCREEN */
function renderGoal(tx,results){
    if (results.rows.length == 0) {//none set yet
		$("#mygoalstatus").html("nothing saved.");//show what is saved 
		$(".mygoaldata").html(""); //remove the current data
    } else {//load and display the settings.
    	$("#mygoalstatus").html("");
    	$(".mygoaldata").html("");//clear out the old stuff
       var s = Number();
       var insp = "";
       for(var i=0; i<results.rows.length; i++) {
       	 	date = results.rows.item(i).date;
       	 	amount = results.rows.item(i).amount;
	   	 	s +=  Number(amount);//print out the saved times with ID's  
       }
       //some inspiration messages
       if(s <= 3){
	       insp = "Don't forget to drink your water.";
       }else if(s <= 32){
	       insp = "Almost there keep up the good work.";
       }else if(s >= 64){
	       insp = "Congratulations you've reached your daily goal of water.";
       }
       //add in a chart to render out here
       //end chart render
       //show what is saved
       $(".mygoaldata").html("<h3>"+insp+"</h3><table data-role='table' class='ui-responsive table-stroke table-alerts table-stripe' style='width:100%'><tr><thead><th>Date</th><th>Total</th></thead></tr><tr><tbody><td>" + date + "</td><td>" + s + "</td></tbody></table>"); 
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
	checkAlerts(); //update the page with the new set alerts
	toastr.success('Successfully Saved', null, {target: $('.messages-alerts'),"timeOut": "1000","positionClass": "toast-top-full-width"});
	//$("#popupDialog").click(); //show feedback for saving the data
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
        tx.executeSql("insert into goals(date,time,amount,updated) values(?,?,?,?)",[goal.date, goal.time, goal.amount, new Date()]);
        else tx.executeSql("update goals set date=?, time=?, amount=?, updated=? where id=?",[goal.date, goal.time, goal.amount, new Date(), goal.id]);
        //alert("edit");
    }, dbErrorHandler,cb);
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
/*CHECK HEALTHKIT FOR DATA*/
function onReadHealthSuccess(result) {
  alert("OK: " + JSON.stringify(result));
};

function onReadHealthError(result) {
  alert("Error: " + JSON.stringify(result));
};

function gethealthkitdata(){
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
  alert("OK: " + JSON.stringify(result));
};

function onAddDataError(result) {
  alert("Error: " + JSON.stringify(result));
};
function addwater(){ // save the water data to the healthkit as well
	window.plugins.healthkit.saveQuantitySample(
	  {
	    'startDate': new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // a day ago
	    'endDate': new Date(), // now
	    'sampleType': 'HKQuantityTypeIdentifierDietaryWater', // make sure you request write access beforehand
	    'unit': 'mL',
	    'amount': 300
	  },
	  onAddDataSuccess,
	  onAddDataError
	);
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

//for desktops - testing in safari 
// Wait for PhoneGap to load
////if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
  ////phoneReady();
////} else {
  ////phoneReady(); //this is the browser
////}

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
		$(".alertSettings span").html("off");
		$(".saveSettings").addClass("ui-disabled");
	}
	
	//check to see if the alerts are on or off
	if(settings == "on"){
		$("#slider2").val() == "on";
		$(".alertSettings span").html("on");
		$(".saveSettings").removeClass("ui-disabled");
		validateTime();
	}
	
	$("#slider2").change(function() {//reenable the tools when its turned on. 
		if($("#slider2").val() == "off"){
			$("#select-native-2").addClass("ui-disabled");
			$("#starttime").addClass("ui-disabled");
			$("#endtime").addClass("ui-disabled");
			$("#mainContent").html("");
			$("#alerttime").html("");
			$("#alertstatus").html("");
			$(".alertSettings span").html("off");
		}else{
			validateTime();
			$("#select-native-2").removeClass("ui-disabled");
			$("#starttime").removeClass("ui-disabled");
			$("#endtime").removeClass("ui-disabled");
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
				getSettings(); //refresh what is saved to get the latest.
				saveCalled = "true"; //send a flag to the render function to generate the notifcations.
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
							toastr.success('Successfully Saved', null, {target: $('.messages-water'),"timeOut": "1000","positionClass": "toast-top-full-width"});
							$(".cancel").hide(); //hide the cancel button if it's showing
							$('.id-tag').val("");//clear the id field
				        });
			        }else{
			        	toastr.error('Sorry you have entered this already.', null, {target: $('.messages-water'),"timeOut": "1000","positionClass": "toast-top-full-width"});
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
			tx.executeSql("update saved set goal=? where id=1",[$("#watergoal").val()],function(tx,results) {
				toastr.success('Successfully Saved', null, {target: $('.messages'),"timeOut": "2000","positionClass": "toast-top-full-width"});
			});
			 //else tx.executeSql("update saved set onoff=?, frequency=?, start=?, range=?, goal=?, updated=? where id=?",
		}, dbErrorHandler);
		
		evt.preventDefault();
	});
	$.mobile.document.on( "click", ".option-checkwater", function( evt ) {
		gethealthkitdata();
	});
	$.mobile.document.on( "click", ".option-addwater", function( evt ) {
		addwater();
	});
	
	
	
    /*ON PAGE LOAD SHOW THE FOLLOWING*/
    $(document).on("pagecontainerbeforeshow", function( event, ui ) {
    	var ThisPage = $(':mobile-pagecontainer').pagecontainer('getActivePage').attr('id');
    	if(ThisPage == "alerts"){if(settings == "on"){switchedON();checkAlerts();}
    	}else if(ThisPage == "track"){getWater();
    	}else if(ThisPage == "account"){getGoal();}
    });
    
     $(document).on("pagecontainershow", function( event, ui ) {
    	var ThisPage = $(':mobile-pagecontainer').pagecontainer('getActivePage').attr('id');
    	if(ThisPage == "alerts"){if(settings == "on"){switchedON();checkAlerts();}
    	}else if(ThisPage == "track"){getWater();
    	}else if(ThisPage == "account"){getGoal();
    	}
    });
    
    /*clockpicker*/
    $('.clockpicker').clockpicker().find('input').change(function(){console.log(this.value);});
	$('#single-input').clockpicker({
		placement: 'bottom',
		align: 'right',
		autoclose: true,
		'default': '20:48'
	});
	if (/Mobile/.test(navigator.userAgent)) {$('input').prop('readOnly', true);}
});