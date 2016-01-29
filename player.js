//var client_id = '7cf649bb46d7a637e916d38cd45fd90a';
var client_id = '242325eecde9bc50f4d3e2acd84b9166'; //ghpages key

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

var current_color, current_track_index, menus_init; //UI objects
var source, streaming, analyzer;  //Web audio objects
var user, favorites; //Soundcloud API objects

//localStorage.removeItem("gome_oauth");

streaming = false;
init_canvas();

if(localStorage.gome_oauth == null){
	SC.initialize({
		client_id: client_id,
		redirect_uri: 'http://localhost/scvl/callback.html'
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
	if(localStorage.gome_oauth == null){
		$('#soundcloudcontainer').fadeIn();
	}
	$('#popoutcontainer i').click(function(){
		$('#popoutcontainer').hide("slide", { direction: "left", easing: 'easeOutQuint', }, 800, function(){
			$('#colorcontainer').show("slide", { direction: "left", easing: 'easeOutQuint', }, 1500);	
			if(typeof(menus_init) == 'undefined')
				init_menus();		
		});	
	});
	$('#colorcontainer i').click(function(){
		$('#colorcontainer').hide("slide", { direction: "left", easing: 'easeOutQuint', }, 1200, function(){
			$('#popoutcontainer').show("slide", { direction: "left", easing: 'easeOutQuint', }, 800);			
		});	
	});
	$('#overlaymincontainer i').click(function(){
		$('#overlaymincontainer').hide("slide", { direction: "right", easing: 'easeOutQuint', }, 800, function(){
			$('#soundcloudcontainer').show("slide", { direction: "right", easing: 'easeOutQuint', }, 1500);
		});
	});
	$('#inoverlay i').click(function(){
		$('#soundcloudcontainer').hide("slide", { direction: "right", easing: 'easeOutQuint', }, 1200, function(){
			$('#overlaymincontainer').show("slide", { direction: "right", easing: 'easeOutQuint', }, 800);
		});
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

function loadMenuData(me){
	user = me;	
	document.getElementById('userpic').src= user.avatar_url;
	document.getElementById('username').innerHTML = user.username;
	SC.get('/me/favorites').then(function(f){
		favorites = f;
		current_track_index = 0;				
		load_tracks(0);
		$('#outoverlay').hide();
		$('#inoverlay').fadeIn();
		$('#soundcloudcontainer').fadeIn();
	});
}

function load_tracks(index){
	var max_height = window.innerHeight - (22.5 + 106 + 41) - 50;
	var num_tracks = Math.floor(max_height / 71);
	for(var i = index * num_tracks; (i < (index + 1) * num_tracks) && (i < favorites.length); i++){									
		var div_container = document.createElement('div');
		div_container.className = 'trackrow';
		div_container.setAttribute('data-streamurl', favorites[i].stream_url);			
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
			tracks[i].addEventListener("click", function(){
											init_analyzer(stream_url);
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
		left_arrow.innerHTML = '<i class="fa fa-arrow-left fa-lg"></i>';			
		left_arrow.addEventListener("click", function(){
			console.log("hello");
										$('.trackrow').remove();
										$('#tracknavcontainer').remove();
										current_track_index--;
										load_tracks(current_track_index);
									}, false);
		var right_arrow = document.createElement('div');
		right_arrow.innerHTML = '<i class="fa fa-arrow-right fa-lg"></i>';	
		right_arrow.addEventListener("click", function(){
			console.log("hello");
										$('.trackrow').remove();
										$('#tracknavcontainer').remove();
										current_track_index++;
										load_tracks(current_track_index);
									}, false);		
		if(current_track_index == 0){
			right_arrow.setAttribute('width', '100%');
			track_nav.appendChild(right_arrow);
		}
		else if(num_tracks * (current_track_index + 1) > favorites.length){
			left_arrow.setAttribute('width', '100%');
			track_nav.appendChild(left_arrow);
		}
		else{
			left_arrow.setAttribute('width', '50%');
			right_arrow.setAttribute('width', '50%');
			track_nav.appendChild(left_arrow);	
			track_nav.appendChild(right_arrow);
		}		
	}
}

function play_track(){	
	var track_url = document.getElementById('urlfield').value;

	var url = 'http://api.soundcloud.com/resolve?url=' + track_url + '&client_id=' + client_id;

	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if(request.readyState == 4 && request.status == 200){
			init_analyzer(JSON.parse(request.responseText)['stream_url']);		
		}
	}
	request.open("GET", url, true);
	request.send(null);
}

function init_analyzer(stream_url){	
	if(typeof(source) != "undefined"){			
		source.disconnect();	
		analyzer.disconnect();		
		streaming = false;
	}		

	var context, audio;
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

	function draw(){	
		if(streaming == false){
			return;
		}
		drawVisual = requestAnimationFrame(draw);
		analyzer.getByteFrequencyData(dataArray);		
		animate(dataArray);
	}	
	draw();

	source.mediaElement.play();		
}

function init_canvas(){
	var window_width = window.innerWidth;
	var window_height = window.innerHeight;
	
	d3.select("body").select("svg").remove();

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

	current_color = Math.floor(Math.random() * colors.length);

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
	
	var paths = d3.select("body").select("svg").selectAll("path");

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

function init_menus(){
	var height = $('#colorcolumn').height();
	var width = $('#colorcolumn').width();
	var block_height = (height-12.5)/10;
	var svg = d3.select("#colorcolumn");

	menus_init = true;

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
