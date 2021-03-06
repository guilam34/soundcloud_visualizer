//var client_id = '7cf649bb46d7a637e916d38cd45fd90a';
var client_id = '242325eecde9bc50f4d3e2acd84b9166'; //ghpages key

var ICON_NAV_HEIGHT = 22.5;
var USER_ROW_HEIGHT = 106;
var SECTION_NAV_HEIGHT = 41;
var NEXT_NAV_HEIGHT = 50;

var colors = [["rgb(66,0,0)", "rgb(96,0,0)", "rgb(121,0,0)", "rgb(147,17,17)", "rgb(191,22,22)"], //Red
			  ["rgb(210,54,0)", "rgb(217,81,0)", "rgb(222,109,0)", "rgb(238,137,0)", "rgb(252,166,0)"], //Orange
			  ["rgb(220,148,27)", "rgb(237,194,102)", "rgb(182,149,44)", "rgb(225,211,166)", "rgb(233,161,25)"], //Yellow
			  ["rgb(27,182,0)", "rgb(53,131,39)", "rgb(16,106,0)", "rgb(74,182,55)", "rgb(8,55,0)"], //Green
              ["rgb(0,56,64)", "rgb(0,90,91)", "rgb(0,115,105)", "rgb(0,140,114)", "rgb(2,166,118)"], //Blue
              ["rgb(61,13,38)", "rgb(102,10,62)", "rgb(137,28,86)", "rgb(176,39,111)", "rgb(201,52,130)"], //Magenta
              ["rgb(34,16,77)", "rgb(45,30,94)", "rgb(72,58,133)", "rgb(112,103,171)", "rgb(164,156,250)"], //Violet
              ["rgb(71,65,67)", "rgb(166,158,157)", "rgb(231,226,218)", "rgb(255,255,255)", "rgb(231,232,231)"], //White
              ["rgb(189,121,56)", "rgb(141,68,33)", "rgb(100,48,1)", "rgb(81,39,0)", "rgb(58,28,0)"], //Brown
              ["rgb(0,0,0)", "rgb(20,20,20)", "rgb(28,25,25)", "rgb(25,23,22)", "rgb(36,32,31)"]]; //Black

var trackrow_colors = ["rgb(19,23,31)", "rgb(28,31,38)", "rgb(36,38,45)"];

var colors_init, current_color, current_track, menu_index; //UI objects
var context, source, streaming, analyzer;  //Web audio objects
var user, favorites; //Soundcloud API objects

// localStorage.removeItem("gome_oauth");

colors_init = false;
streaming = false;
paused = false;
init_canvas();

if(localStorage.gome_oauth == null){
	SC.initialize({
		client_id: client_id,
		redirect_uri: 'http://guilam34.github.io/soundcloud_visualizer/callback.html'
	});
}
else{
	SC.initialize({		
		oauth_token: localStorage.gome_oauth
	});

	SC.get('/me').then(function(me){
		loadMenuData(me);
	});	
}

$(document).ready(function(){
	window.addEventListener("resize", resize_handler);

	if(localStorage.gome_oauth == null)
		$('#soundcloudcontainer').fadeIn();

	$('#popoutcontainer > i').click(function(){
		$('#popoutcontainer').hide("slide", { direction: "left", easing: 'easeOutQuint', }, 800, function(){
			$('#colorcontainer').show("slide", { direction: "left", easing: 'easeOutQuint', }, 1500);	
			if(colors_init == false)
				init_colormenu();		
		});	
	});

	$('#colorcontainer > i').click(function(){
		$('#colorcontainer').hide("slide", { direction: "left", easing: 'easeOutQuint', }, 1200, function(){
			$('#popoutcontainer').show("slide", { direction: "left", easing: 'easeOutQuint', }, 800);			
		});	
	});

	$('#overlaymincontainer > i').click(function(){
		$('#overlaymincontainer').hide("slide", { direction: "right", easing: 'easeOutQuint', }, 800, function(){
			$('#soundcloudcontainer').show("slide", { direction: "right", easing: 'easeOutQuint', }, 1500);
		});
	});

	$('#inoverlay > i').click(function(){
		$('#soundcloudcontainer').hide("slide", { direction: "right", easing: 'easeOutQuint', }, 1200, function(){
			$('#overlaymincontainer').show("slide", { direction: "right", easing: 'easeOutQuint', }, 800);
		});
	});

	$('#usersettings').click(function(){
		event.stopPropagation();
		if($('#settingsdropdown').is(':visible')){
			$('#settingsdropdown').hide();
		}
		else{
			$('#settingsdropdown').show();
		}
	});

	$('html').click(function(){
		$('#settingsdropdown').hide();
	});

	$('#settingsdropdown').click(function(){
		event.stopPropagation();		
		localStorage.removeItem("gome_oauth");
		window.location.reload(false);				
	});
});

function login(){
	SC.connect({
		response_type: 'code_and_token',
		scope: 'non-expiring'
	}).then(function(data) {
		localStorage.gome_oauth = data.oauth_token;		
		return SC.get('/me');
	}).then(function(me) {			
		loadMenuData(me);
	});
}

function resize_handler(){
	//Scale visualizer
	d3.select("body").select("#visualizer").remove();
	init_canvas(current_color);

	//Scale color menu
	d3.select("body").select("#colorcolumn").selectAll("*").remove();
	if($('#colorcolumn').is(':visible')){
		init_colormenu();
	}
	else{
		colors_init = false;
	}

	//Scale track menu
	$('.trackrow').remove();
	$('#tracknavcontainer').remove();
	var max_height = window.innerHeight - (ICON_NAV_HEIGHT + USER_ROW_HEIGHT + SECTION_NAV_HEIGHT) - NEXT_NAV_HEIGHT;
	var num_tracks = Math.floor(max_height / 71);
	if(favorites.length < num_tracks * (menu_index + 1)){
		menu_index = (favorites.length / num_tracks) - 1;
	}
	load_tracks(menu_index);
}

function loadMenuData(me){
	user = me;	
	document.getElementById('userpic').src= user.avatar_url;
	document.getElementById('username').innerHTML = user.username;
	SC.get('/me/favorites').then(function(f){
		favorites = f;
		menu_index = 0;				
		load_tracks(0);
		$('#outoverlay').hide();
		$('#inoverlay').fadeIn();
		$('#soundcloudcontainer').fadeIn();
	});
}

function load_tracks(index){
	$('.trackrow').remove();
	$('#tracknavcontainer').remove();

	var max_height = window.innerHeight - (ICON_NAV_HEIGHT + USER_ROW_HEIGHT + SECTION_NAV_HEIGHT) - NEXT_NAV_HEIGHT;
	var num_tracks = Math.floor(max_height / 71);
	for(var i = index * num_tracks; (i < (index + 1) * num_tracks) && (i < favorites.length); i++){									
		var div_container = document.createElement('div');
		// var div_color_index = Math.floor(Math.random() * trackrow_colors.length);
		div_container.className = 'trackrow';
		div_container.setAttribute('data-streamurl', favorites[i].stream_url);			
		div_container.setAttribute('data-trackindex', i);
		// div_container.style.backgroundColor = trackrow_colors[div_color_index];
		document.getElementById('inoverlay').appendChild(div_container);
		
		var div_title = document.createElement('div');
		div_title.className = 'trackTitle';
		div_title.innerHTML = favorites[i].title;
		div_container.appendChild(div_title);

		var div_artist = document.createElement('div');
		div_artist.className = 'trackArtist';
		div_artist.innerHTML = favorites[i].user.username;
		div_container.appendChild(div_artist);												
	}

	var tracks = document.getElementsByClassName('trackrow');

	for(var i = 0; i < tracks.length; i++){
		(function(i){
			var stream_url = tracks[i].getAttribute('data-streamurl');
			var track_index = tracks[i].getAttribute('data-trackindex');
			tracks[i].addEventListener("click", function(){										
											init_analyzer(stream_url, parseInt(track_index));
										}, false);
		}(i))
	}

	if(num_tracks < favorites.length){
		var track_navcontainer = document.createElement('div');
		track_navcontainer.id = 'tracknavcontainer';
		document.getElementById('inoverlay').appendChild(track_navcontainer);

		var track_nav = document.createElement('div');
		track_navcontainer.appendChild(track_nav);
		var left_arrow = document.createElement('div');
		// left_arrow.innerHTML = '<i class="fa fa-angle-left fa-lg"></i>';			
		left_arrow.innerHTML = '<i class="fa fa-long-arrow-left fa-lg arrow"></i>';
		left_arrow.addEventListener("click", function(){													
										menu_index--;
										load_tracks(menu_index);
									}, false);
		var right_arrow = document.createElement('div');
		// right_arrow.innerHTML = '<i class="fa fa-angle-right fa-lg"></i>';	
		right_arrow.innerHTML = '<i class="fa fa-long-arrow-right fa-lg arrow"></i>';	
		right_arrow.addEventListener("click", function(){										
										menu_index++;
										load_tracks(menu_index);
									}, false);		
		if(menu_index == 0){
			right_arrow.setAttribute('width', '100%');
			track_nav.appendChild(right_arrow);
		}
		else if(num_tracks * (menu_index + 1) >= favorites.length){
			left_arrow.setAttribute('width', '100%');
			track_nav.appendChild(left_arrow);
		}
		else{
			left_arrow.style.width = '50%';
			right_arrow.style.width = '50%';
			track_nav.appendChild(left_arrow);	
			track_nav.appendChild(right_arrow);
		}		
	}
}

// function play_track(){	
// 	var track_url = document.getElementById('urlfield').value;

// 	var url = 'http://api.soundcloud.com/resolve?url=' + track_url + '&client_id=' + client_id;

// 	var request = new XMLHttpRequest();
// 	request.onreadystatechange = function() {
// 		if(request.readyState == 4 && request.status == 200){
// 			init_analyzer(JSON.parse(request.responseText)['stream_url']);		
// 		}
// 	}
// 	request.open("GET", url, true);
// 	request.send(null);
// }

function play_ctrl(command){
	var next_index;
	switch(command){
		case 'back':
			next_index = current_track == 0 ? favorites.length-1 : current_track-1;
			init_analyzer(favorites[next_index].stream_url, next_index);
			break;
		case 'next':
			next_index = current_track == favorites.length-1 ? 0 : current_track+1;
			init_analyzer(favorites[next_index].stream_url, next_index);
			break;
		case 'play':
			if(streaming){
				document.getElementById('playcontainer').innerHTML = '<i id="play" onclick="play_ctrl('+ "&quot;pause&quot;" + ')"  class="fa fa-pause"></i>';
				paused = false;
				context.resume();
			}
			break;
		case 'pause':			
			document.getElementById('playcontainer').innerHTML = '<i id="play" onclick="play_ctrl('+ "&quot;play&quot;" + ')"  class="fa fa-play"></i>';
			paused = true;
			context.suspend();
			break;
	}
}

function init_analyzer(stream_url, track_index){	
	if(typeof(source) != "undefined"){			
		source.disconnect();	
		analyzer.disconnect();		
		context.close();
		streaming = false;		
	}		
	
	context = new AudioContext();
	audio = new Audio();
	audio.src = stream_url + '?client_id=' + client_id;
	audio.crossOrigin = "anonymous";
	analyzer = context.createAnalyser();
	source = context.createMediaElementSource(audio);
	source.connect(analyzer);
	analyzer.connect(context.destination);	

	analyzer.fftSize = 256;
	var bufferLength = analyzer.frequencyBinCount;
	var dataArray = new Uint8Array(bufferLength);			

	streaming = true;
	current_track = track_index;
	document.getElementById('playcontainer').innerHTML = '<i id="play" onclick="play_ctrl('+ "&quot;pause&quot;" + ')"  class="fa fa-pause"></i>';

	function draw(){	
		if(streaming == false){
			return;
		}
		drawVisual = requestAnimationFrame(draw);
		analyzer.getByteFrequencyData(dataArray);		
		if(!paused)
			animate(dataArray);
	}	
	draw();

	source.mediaElement.play();			

	var next_index = track_index < (favorites.length - 1) ? track_index+1 : 0;
	audio.addEventListener('ended', function(){			
											init_analyzer(favorites[next_index].stream_url, next_index)
										}, false);
}

function init_canvas(color){
	var window_width = window.innerWidth;
	var window_height = window.innerHeight;

	d3.select("body").select("#visualizer").remove();

	var svg = d3.select("body").append("svg")
					.attr("width", window_width)
					.attr("height", window_height)
					.attr("id", "visualizer")
					.style({"background-color": "#000000"});

	var coords = [ [ {"x": 0, "y": 0},
				     {"x": window_width/4, "y": 0},
				  	 {"x": window_width/2, "y": window_height/2} ],				   
				   [ {"x": window_width/3, "y": 0}, 
				     {"x": window_width*3/4, "y": 0}, 
				     {"x": window_width/2, "y": window_height/2} ],				   
				   [ {"x": window_width, "y": window_height/8}, 
				     {"x": window_width, "y": window_height*3/8}, 
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": window_width, "y": window_height*3/8}, 
				     {"x": window_width, "y": window_height*3/4}, 
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": window_width, "y": window_height*3/4}, 
				     {"x": window_width, "y": window_height}, 
				     {"x": window_width*7/8, "y": window_height},
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": window_width*7/8, "y": window_height}, 
				     {"x": window_width*4/7, "y": window_height}, 
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": window_width*3/4, "y": 0}, 
				     {"x": window_width, "y": 0},
				     {"x": window_width, "y": window_height/8}, 
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": window_width*4/7, "y": window_height}, 
				     {"x": window_width*2/7, "y": window_height}, 
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": window_width*2/7, "y": window_height}, 
				     {"x": 0, "y": window_height}, 
				     {"x": 0, "y": window_height*2/3},
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": 0, "y": window_height*2/3}, 
				     {"x": 0, "y": window_height*3/7}, 
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": window_width/4, "y": 0}, 
				     {"x": window_width/3, "y": 0},
				     {"x": window_width/2, "y": window_height/2} ],
				   [ {"x": 0, "y": window_height*3/7}, 
				     {"x": 0, "y": 0}, 
				     {"x": window_width/2, "y": window_height/2} ]];		   

	var lineFunction = d3.svg.line()
							.x(function(d){ return d.x; })
							.y(function(d){ return d.y; })
							.interpolate("linear");

	if(color === undefined){
		current_color = Math.floor(Math.random() * colors.length);
	}
	else{
		current_color = color;
	}

	for(var i = 0; i < coords.length; i++){
		var color_index = Math.floor(Math.random() * 5);
		svg.append("path")
			.attr("d", lineFunction(coords[i]))	
			.attr("stroke", colors[current_color][color_index])				
			.attr("stroke-width", 2)
			.attr("fill", colors[current_color][color_index]);
	}		
}

function animate(dataArray){
	var counter = 0;
	var paths = d3.select("body").select("#visualizer").selectAll("path");
	
	paths.each(function(d){
		var color_index = Math.floor(Math.random() * 5);		

		if(dataArray[counter] > 172){
			d3.select(this)
			  .transition()
			  .duration(65)
			  .attr("stroke", colors[current_color][color_index])
			  .attr("fill", colors[current_color][color_index]);
		}		

		counter += 2;
	});
}

function init_colormenu(){
	var height = $('#colorcolumn').height();
	var width = $('#colorcolumn').width();
	var block_height = (height-12.5)/10;
	var svg = d3.select("#colorcolumn");

	colors_init = true;

	for(var i = 0; i < 10; i++){
		svg.append("circle")
		   .attr("cx", width/2)
		   .attr("cy", block_height * i + block_height/2)
		   .attr("r", width / 2 - 15)
		   .style("fill", colors[i][2]);	   
	}

	$('#colorcolumn circle').click(function(){
		current_color = $(this).index();
		var paths = d3.select("body").select("svg").selectAll("path");

		paths.each(function(d){
			var color_index = Math.floor(Math.random() * 5);					
			d3.select(this)
			  .transition()
			  .duration(50)
			  .attr("stroke", colors[current_color][color_index])
			  .attr("fill", colors[current_color][color_index]);
		});
	});
}
