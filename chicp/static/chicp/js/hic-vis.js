var diameter = $("#svg-container").width();
if (diameter > $(".svg-row").height()) diameter =  $(".svg-row").height();
var trans = "translate(" + diameter * 0.5 + "," + diameter * 0.45 + ")";

var snpCutoff, maxscore, thresh

var interactionColor = d3.scale.linear().domain([0, 20]).range(["blue", "red"]);
var start, CHR, totalBP, region, META;
var pi = Math.PI;  
var selecting = 0;

var angleOffset = 5,
	arcAvail = 360 - (2 * angleOffset),
	startAngle = (angleOffset * pi)/180,
	endAngle = ((arcAvail + angleOffset) * pi) / 180;
	
var styleTooltip = function(name, description) {
	if (typeof description !== 'undefined')
		return "<p class='name'>" + name + "</p><p class='description'>" + description + "</p>";
	else
		return "<p class='name'>" + name + "</p>";
};
    		
function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
		if (pair[0] == variable) {
			return pair[1];
		}
	}
}

function findGeneForExon(genes, gene_id){
	for (i = 0; i < genes.length; i++) {
		if (genes[i].gene_id == gene_id)
			return genes[i];
	}
	return null;	
}

function hasClass(element, cls) {
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
}

function overlaps(s1, e1, s2, e2) {
    if (s1 < s2 & e1 < e2 & e1 > s2) {
        return 1;
    } else if (s2 < s1 & e2 > s1 & e2 < e1) {
        return 1;
    } else if (s2 > s1 & s2 < e1 & e2 < e1) {
        // return 1;
    } else if (s2 < s1 & e2 > e1) {
        return 1;
    } else if (s1 < s2 & e1 > e2) {
        return 1;
    } else if (s1 == s2 | s1 == e2 | e1 == s1 | e1 == e2) {
        return 1;
    }
    return 0;
}


function adjustBump(annot, offset) {
    var recurse = 0;
    for (var i = 0; i < annot.length; i++) {
        for (var j = 0; j < annot.length; j++) {
            if (i != j) {
                var g1 = annot[i];
                var g2 = annot[j];
                if (g1.bumpLevel == g2.bumpLevel && overlaps(g1.start - offset, g1.end + offset, g2.start - offset, g2.end + offset)) {
                    annot[i].bumpLevel++;
                    recurse = 1;
                }
            }
        }
    }
    if (recurse) {
        adjustBump(annot, offset);
    }
}


function computeCartesian(r, coord, totalBP) {
    var arcAvail = 360 - 10;
    var ratio = coord / totalBP;
    var theta = (((coord / totalBP) * arcAvail) * (pi / 180)) + (5 * (pi / 180));
    if (theta <= pi / 2) {
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    } else if (theta > pi / 2 && theta <= pi) {
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    } else if (theta > pi && theta <= (3 * pi) / 2) {
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    } else if (theta > (3 * pi) / 2 && theta <= 2 * pi) {
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    } else {
        theta = (arcAvail * (pi / 180)) + (5 * (pi / 180))
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    }
}


function computePath(start, end, r, totalBP, diameter) {
    // creates some d magic to connect paths
    // <path class="SamplePath" d="M100,200 C100,100 250,100 250,200
    //                                 S400,300 400,200" />
    startcoords = computeCartesian(r, start, totalBP);
    endcoords = computeCartesian(r, end, totalBP);
    //harcoded !!!!!!!!
    startcontrol = computeCartesian(r - (diameter * 0.1), start, totalBP);
    endcontrol = computeCartesian(r - (diameter * 0.1), end, totalBP);
    return ("M" + startcoords.x + "," + startcoords.y +
        " C" + startcontrol.x + "," + startcontrol.y + "," + endcontrol.x + "," + endcontrol.y + " " + endcoords.x + "," + endcoords.y);
}



function computeStrandPath(start, end, r, totalBP, flag) {
    startcoords = computeCartesian(r, start, totalBP);
    endcoords = computeCartesian(r, end, totalBP);
    if (undefined === flag){
    	flag = "0,1";
		if ((end - start - ((angleOffset/350)*totalBP)) /totalBP > 0.5){
			flag = "1,1";
		}
    }
    return ("M" + startcoords.x + "," + startcoords.y +
        " A" + r + "," + r + " 0 " + flag + " " + endcoords.x + "," + endcoords.y);
}

function computeArcPath(start, end, r1, r2, totalBP) {
	
    startcoords1 = computeCartesian(r1, start, totalBP);
    endcoords1 = computeCartesian(r1, end, totalBP);
    startcoords2 = computeCartesian(r2, start, totalBP);
    endcoords2 = computeCartesian(r2, end, totalBP);
    
	if (end > totalBP || start == 1){
		if (start == 1){
			startcoords1 = computeCartesian(r1, start-totalBP * (angleOffset/arcAvail), totalBP);
			startcoords2 = computeCartesian(r2, start-totalBP * (angleOffset/arcAvail), totalBP);
		}
		else{
			endcoords1 = computeCartesian(r1, totalBP+(totalBP * (angleOffset/arcAvail)), totalBP);
			endcoords2 = computeCartesian(r2, totalBP+(totalBP * (angleOffset/arcAvail)), totalBP);
		}	
	}   
    
    var flag1 = "0,1";
    if ((end - start) /totalBP > 0.5){
    	flag1 = "1,1";
    }
    var flag2 = "0,0";
    if ((end - start) /totalBP > 0.5) {
    	flag2 = "1,0";
    }
    return ("M" + startcoords1.x + "," + startcoords1.y +
        " A" + r1 + "," + r1 + " 0 " + flag1 + " " + endcoords1.x + "," + endcoords1.y +
        " L" + endcoords2.x + "," + endcoords2.y +
        " A" + r2 + "," + r2 + " 0 " + flag2 + " " + startcoords2.x + "," + startcoords2.y +
        " z");
}

function computePointPath(start, end, score, minscore, maxscore, r, totalBP, diameter) {
    var adjMaxscore = maxscore - minscore;
    var adjScore = score - minscore;
    var trackwidth = diameter * 0.04;
    var radius = r;
    if (adjMaxscore > 0)
    	radius += ((parseFloat(adjScore) / adjMaxscore) * trackwidth)
    var startcoords = computeCartesian(radius, start, totalBP);
    return "translate(" + (startcoords.x + (diameter * 0.5)) + "," + (startcoords.y + (diameter * 0.45)) + ")";
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function log10(val) {
	return Math.log(val) / Math.LN10;
}




//function renderHic(term, tissue, diameter, breadcrumb) {
function renderHic(term, tissue, breadcrumb) {
	$.isLoading({ text: "Loading" });
	diameter = $("#svg-container").width();
	if (diameter > $(".svg-row").height()) diameter = $(".svg-row").height();
	trans = "translate(" + diameter * 0.5 + "," + diameter * 0.45 + ")";
	
	var gwas = $("#gwas").val();
	var region = $("#regionSearch").val();
	var targetIdx = $("#target")[0].options[$("#target")[0].selectedIndex].value;
	
	if (term.match(/__/g)){
		parts = term.split(/__/g);
		term = parts[0]
		region = parts[1];
		$("#regionSearch").val(region);
	}	
	
	resetPage(term, tissue, breadcrumb)
	
	url = "/chicp/search?searchTerm=" + term + '&tissue=' + tissue+'&targetIdx='+targetIdx;
	if (gwas != "" && gwas !==null && gwas !==undefined) url += '&snp_track=' + gwas;
//	if (gwas != "" && $.cookie('cb-enabled') == 'accepted' && gwas !==null && gwas !==undefined) url += '&snp_track=' + gwas;
	if (region != "") url += '&region='+region;
	$("#regionSearch").val("");
	
	d3.json(url, function (error, json) {
		if (error) return console.warn(error);
		if (json.error) {
				$("div.radio.tissue").each(function (index, value){
						var t = $(this).find("input").val();
						$("#"+t+"_count").text("(0)")
				});
				d3.select("#svg-container").selectAll("*").remove();
				if (json.results){
					console.log(json.results);
					div = d3.select("#svg-container")
					.append("div")
					.html("<p>"+json.error+"</p>")
					.attr("id", "message")
					.style("text-align", "left");
					
					var table = div.append('table').style("width", "100%").attr("id", "chicp-table-results")
						.attr("class", "display responsive table table-striped table-condensed dataTable no-footer");
					table.append('thead').append('tr')
						.selectAll('th')
						.data(json.cols).enter()
						.append('th')
						.text(function(c){ return c;} );
						
					var tr = table.append('tbody')
						.selectAll('tr')
						.data(json.results).enter()
						.append('tr');
						
					tr.append('td').html(function(g) { return g.gene_name; });
					tr.append('td').html(function(g) {
							return '<a href="#" onclick="$(\'#search_term\').val(\''+g.gene_id+'\');d3.select(\'#svg-container\').selectAll(\'*\').remove();doSearch();return false;">'+g.gene_id+'</a>';
					});
					tr.append('td').html(function(g) { return g.location });
					
					$('#chicp-table-results').dataTable({
						"bPaginate": true,
						"pagingType": "simple"
					});
				}
				else{
				div = d3.select("#svg-container")
				.append("div")
				.html("<h1>"+json.error+"</h1>")
				.attr("id", "message")
				.attr("class", "chicp_msg");
				}
			
			$.isLoading( "hide" );
			return;
		}
		data = json;
		var genes = data.genes;
		var snps = data.snps;
//		var meta = data.meta;
		var extras = data.extra;
		
		META = data.meta;
		totalBP = META.rend - META.rstart;
		start = parseInt(META.ostart);
		CHR = META.rchr;
		region = data.region
		                                                                 
		$("#region").val(data.region);
		$("#totalBP").val(totalBP); 
		
		var tissues = [];
		for (var i=0;i<META.tissues.length;i++) {
			tissues[META.tissues[i]] = 0;
		}
		
		var hics = data.hic;
		if (hics.length == 0) {
			d3.select("#svg-container").selectAll("*").remove();
			div = d3.select("#svg-container")
				.append("div")
				.html("<h1>No interactions found</h1>")
				.attr("id", "message")
				.attr("class", "chicp_msg");
			$.isLoading( "hide" );
			return;
		}
		for (var i = 0; i < hics.length; i++) {
		    hics[i].id = i + 1;
		}
		
		// set this to make genes that are close but not overlapping bump
		var offset = 100;
		adjustBump(genes, offset);
		var bt = {};
		for (var g in genes) {
			bt[genes[g].gene_biotype] = 1;
		}
		bt['hilight'] = 1;
		
		var vis = d3.select("#svg-container").append("svg").attr("id", "main-svg")
		.style("padding-top", "10px").attr("width", diameter).attr("height", diameter+100)
		.on("mouseup", function(d) {
				if (selecting){
					selecting = 0;
					var innerRadius = diameter * 0.4,
						outerRadius = innerRadius + 1,
						circum = 2 * innerRadius * pi,
						circAvail = circum - ((2 * angleOffset) * (pi/180) * innerRadius);
					zoomIn(innerRadius, circAvail, angleOffset);
				}
		});
		
		vis.append("text")
			.attr("x", 0).attr("y", -20)
			.attr("text-anchor", "left")  
			.style("font-size", "20px")
			.attr("class", "page_header svg_only")
			.text($("#page_header").html());
		
		vis.append("text")
			.attr("x", 0).attr("y", 0)
			.attr("text-anchor", "left")
			.style("font-size", "14px")
			.style("font-style", "italic")
			.attr("class", "svg_only")
			.attr("id", "snp_track_header")
			.text("SNP Data: "+$('#gwas option:selected').text());
		
		vis.append("g").attr("class", "left arrow_heads").selectAll("defs")
			.data(Object.keys(bt))
			.enter()
			.append("marker")
			.attr("id", function (d) {
			return ("lharrow_" + d);
		})
		.attr("viewBox", "-1 0 6 6")
		.attr("refX", -0.1)
		.attr("refY", 3)
		.attr("markerUnits", "strokeWidth")
		.attr("markerWidth", 1)
		.attr("markerHeight", 1)
		.attr("orient", "auto")
		.append("path")
		.attr("d", "M0,0 L-1,3 L0,6")
		.attr("class", function (d) {
			if (d =='hilight') return "svg_hide hilight";
			else return "svg_hide " +d;
		});
		
		vis.append("g").attr("class", "right arrow_heads").selectAll("defs")
			.data(Object.keys(bt))
			.enter()
			.append("marker")
			.attr("id", function (d) {
			return ("rharrow_" + d);
		})
		.attr("viewBox", "0 0 6 6")
		.attr("refX", 0.1)
		.attr("refY", 3)
		.attr("markerUnits", "strokeWidth")
		.attr("markerWidth", 1)
		.attr("markerHeight", 1)
		.attr("orient", "auto")
		.append("path")
		.attr("d", "M0,0 L1,3 L0,6")
		.attr("class", function (d) {
				if (d =='hilight') return "svg_hide hilight";
				else return "svg_hide " +d;
		});
		
		
		addSNPTrack(data.snps, data.snp_meta);
		addCenterScale(data.frags);
		
		if (extras.length > 0) addExtraData(extras);		
		
		//add gene track
		addGeneTrack(data.genes, totalBP);
		
		//add SNP track
		addSNPTrackPoints(data.snps, data.snp_meta, totalBP);

		addInteractions(hics, totalBP, tissues);

		var endAngle = (angleOffset * pi)/180,
		startAngle = ((arcAvail + angleOffset) * pi) / 180;
			
		var arc = d3.svg.arc()
			.innerRadius(diameter * 0.29).outerRadius(diameter * 0.4)
			.startAngle(-endAngle).endAngle(endAngle);
	
		var wedge = vis.append("path").attr("d", arc).attr("id", "originWedge")
			.attr("fill", "lightgrey")
			.attr("transform", trans)
			.on("click", function(d){
					id = $("#breadcrumb").children().last().attr('id')
					if (id.match(/__/g)){
						parts = term.split(/__/g);
						term = parts[0]
						region = parts[1];
						$("#regionSearch").val("");
						var tissue = $("input:radio[name=tissue]:checked").val();
						renderHic(term, tissue, 1);
						//renderHic(term, tissue, diameter, 1);
					}
			});
			
			vis.append("path")
				.attr("d", d3.svg.arc()
					.innerRadius(diameter * 0.29).outerRadius(diameter * 0.4)
					.startAngle((-0.5 * pi)/180).endAngle((0.5 * pi)/180))
				.attr("fill", "white")
				.attr("transform", trans)
			
		if ($("#breadcrumb").children().last().attr('id').match(/__/g)){
			wedge.style('cursor', 'zoom-out');
		}
			
				
		var text = vis.append("text")
			.text("chr"+CHR)
			.attr("dy", "-.35em")
			.attr("text-anchor", "middle")
			.attr("transform", "translate(" + diameter * 0.5 + ","+ ((diameter * 0.45) - (diameter * 0.4)) +")")
			
		for(var t in tissues) {
			$("#"+t+"_count").text("("+tissues[t]+")");
		}
		
		addGeneKey();
		
		$.isLoading( "hide" );
		// end of JSON call     
	});
}

function addCenterScale(frags){
	var vis = d3.select("#main-svg");

    var innerRadius = diameter * 0.4,
    	outerRadius = innerRadius + 1,
		circum = 2 * innerRadius * pi,
		circAvail = circum - ((2 * angleOffset) * (pi/180) * innerRadius);
    
	tickData = getTickData(innerRadius, arcAvail, startAngle, endAngle, circum, circAvail);
	
	var scale_group = vis.append("g").attr("class", "track scale")
		.attr("id", "fullScale").selectAll("svg")
		.data([1]).enter();
		
	var arc = d3.svg.arc()
		.innerRadius(innerRadius).outerRadius(outerRadius)
		.startAngle(startAngle).endAngle(endAngle);
			
	var arc2 = d3.svg.arc()
		.innerRadius(diameter * 0.28 - 10).outerRadius(outerRadius+50)
		.startAngle(startAngle).endAngle(endAngle);
	
	scale_group.append("path").attr("d", arc).attr("id", "arcScale");	
	
	var ticks = scale_group.append("g").attr("class", "scale ticks").selectAll("svg")
		.data(tickData).enter()
		.append("g")
		.attr("class", "tick")
		.attr("transform", function (d) {
				return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + outerRadius + ",0)";
		});

	ticks.append("line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", 8)
		.attr("y2", 0)
		.style("stroke", "#000");

	ticks.append("text")
		.attr("x", 8)
		.attr("dy", ".35em")
		.attr("transform", function(d) { return d.angle > pi ? "rotate(180)translate(-16)" : null; })
		.style("text-anchor", function(d) { return d.angle > pi ? "end" : null; })
		.text(function(d) { return d.label; });
	
	fragsData = getFragsTicks(frags, outerRadius, arcAvail, startAngle, endAngle, circum, circAvail);
	
	var frags = scale_group.append("g").attr("class", "scale ticks frags").selectAll("svg")
		.data(fragsData).enter()
		.append("g")
		.attr("class", "tick").append("line")
		.attr("x1", function(d){ return d.x1; })
		.attr("y1", function(d){ return d.y1; })
		.attr("x2", function(d){ return d.x2; })
		.attr("y2", function(d){ return d.y2; })
		.style("stroke", "red");		
	
	scale_group.append("path").attr("d", arc2).attr("id", "arcBackground").style("fill", "white").style("opacity", 0)
	
	//var colors = d3.scale.linear().domain([angleOffset, arcAvail]).range(["pink", "purple"]);
	var segmentData = [];
	for (i=angleOffset; i<=arcAvail; i+=angleOffset){
		segmentData.push(i);
	}
	var segments = scale_group.append("g").selectAll("svg").data(segmentData).enter();
	segments.append("path")
		.attr("d", d3.svg.arc()
			//.innerRadius(diameter * 0.28)
			.innerRadius(0)
			.outerRadius(outerRadius+40)
			.startAngle(function(d){ return d*pi/180; })
			.endAngle(function(d){ return (d+angleOffset)*pi/180; }))
		.style("fill", "white").style("opacity", 0)
		.attr("class", "segment")
		.attr("id", function (d) { return "seg"+d; })
		.on("mousedown", function(d) {
				d3.event.preventDefault();
				d3.selectAll(".segment").classed("selected", false).style("fill", "white").style("opacity", 0);
				d3.select(this).style("opacity", 0.2).style("fill",  "yellow");
				d3.select(this).classed('selected', true);
				selecting = d;
		})
		.on("mouseup", function(d) {
				if (selecting){
					selecting = 0;
					zoomIn(innerRadius, circAvail, angleOffset);
				}
		})
/*		.on("click", function (d) {
				if (selecting){
					selecting = 0;
					zoomIn(innerRadius, circAvail, angleOffset);
				}
				else{
					d3.selectAll(".segment").classed("selected", false).style("fill", "white").style("opacity", 0);
					d3.select(this).style("opacity", 0.2).style("fill",  "yellow");
					d3.select(this).classed('selected', true);
					selecting = d;
				}
		})	*/			
		.on("mouseover", function(d){ 
				if (selecting > 0){
					if (selecting != d && selecting != d+angleOffset && selecting != d-angleOffset){
						s1 = Math.min(selecting, d);
						s2 = Math.max(selecting, d);
						for (i=s1; i<s2; i+=angleOffset){
							d3.select("path#seg"+i).style("opacity", 0.2).style("fill", "yellow");
							d3.select("path#seg"+i).classed('selected', true);
						}
					}
					//d3.select(this).style("opacity", 0.3).style("fill", colors(d));
					d3.select(this).style("opacity", 0.2).style("fill", "yellow");
					d3.select(this).classed('selected', true);
				}
		});
	
	vis.select("#fullScale").attr("transform", trans)
}

function getFragsTicks(frags, outerRadius){
	var data = [];
	if (frags.length > 0){
		for (var i = 0; i < frags.length; i++) {
			position = frags[i].end;
			var startcoords = computeCartesian(outerRadius, position, totalBP);
			var endcoords = computeCartesian(outerRadius+5, position, totalBP);
			data.push({'x1':startcoords.x, 'y1':startcoords.y, 'x2':endcoords.x, 'y2':endcoords.y});
		}
	}
	return data;	
}

function getTickData(innerRadius, arcAvail, startAngle, endAngle, circum, circAvail){
	
	var end = start + totalBP;
	
	var divisor = 100000, multiplier = 10;
	if (totalBP < 500000) {
		divisor = divisor/10;
		multiplier = multiplier*10;
	}
	
	var data = [{'label': null, 'angle': startAngle, 'position': start}];

	var position1 = 1000000 * Math.ceil(start/divisor)/multiplier
    var theta1 = ((((position1-start) / totalBP) * arcAvail) * (pi / 180)) + startAngle;
	data.push({'label': position1/1000000+"Mb", 'position': position1, 'angle': theta1});

	var position2 = 1000000 * Math.floor(end/divisor)/multiplier
    var theta2 = ((((position2-start) / totalBP) * arcAvail) * (pi / 180)) + startAngle;

	var count = Math.ceil((position2-position1)/divisor);
	var section = (theta2 - theta1) / count;

	var totalAngle = theta1;
	for (i=position1+divisor; i<position2; i+=divisor){
		label = Math.ceil(i/divisor)/multiplier
		totalAngle += section
		data.push({'label': label+"Mb", 'position': i, 'angle': totalAngle});
	}
    
	data.push({'label': position2/1000000+"Mb", 'position': position2, 'angle': theta2});	
	data.push({'label': null, 'angle': endAngle, 'position': end});
	
	return data;
}
	

function addExtraData(extras){
	var vis = d3.select("#main-svg");
	//var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0).style("width", "100px");
	
	var path = vis.append("g").attr("class", "track extras3").selectAll("svg")
		.data(extras.filter(function (d) { return CHR==d.chr; }))
		.enter()
		.append("path")
		.attr("class", "extras")
		.attr("d", function (d) {
				padding = (totalBP/1000) - (d.end-d.start);
				return (computeStrandPath(d.start-(padding/2), d.end+(padding/2), diameter * 0.35, totalBP));
		})
		.attr("transform", trans)
		.attr("stroke", "red")
		.attr("stroke-width", "100")
		.attr("title", function (d) { return styleTooltip(d.name, ""); });
		
	vis.selectAll("path.extras").each(function(x) { $(this).tipsy({ gravity: 'e', opacity: 1, html: true, offset: 5, hoverlock: true }); });
}

function addGeneTrack(genes, totalBP){
	
	var vis = d3.select("#main-svg");
	var tissue = $("input:radio[name=tissue]:checked").val();
	
	var innerRadius = diameter * 0.35;
	
	var gene = vis.append("g").attr("class", "track genes").selectAll("svg").data(genes).enter();
	    
	gene.append("path")
		.attr("id", function (d) { return d.gene_id; })
		.attr("d", function (d) {
			return (computeStrandPath(d.start, d.end, innerRadius + (d.bumpLevel * 15), totalBP));
		})
		.attr("transform", trans)
		.attr("class", function (d) {
				if (d.gene_name == $("#search_term").val().toUpperCase() || d.gene_id == $("#search_term").val().toUpperCase()) {
					return "gene hilight";
				} else {
					return "gene "+d.gene_biotype;
				}
		})
		.attr("marker-start", function (d) {
			var bt = d.gene_biotype;
			if (d.gene_name == $("#search_term").val().toUpperCase() || d.gene_id == $("#search_term").val().toUpperCase()) {
				bt = 'hilight';
			}
			if (d.strand == "-") return ("url(#lharrow_" + bt + ")");
		})
		.attr("marker-end", function (d) {
			var bt = d.gene_biotype;
			if (d.gene_name == $("#search_term").val().toUpperCase() || d.gene_id == $("#search_term").val().toUpperCase()) {
				bt = 'hilight';
			}
			if (d.strand == "+") return ("url(#rharrow_" + bt + ")");
		})
		.on("click", function (d) {
				$("#search_term").val(d.gene_name);
				var term = $("#search_term").val().toUpperCase();
    				term = term.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				d3.selectAll("svg").remove();
				doSearch()
				//renderHic(term, tissue, 1);
				//renderHic(term, tissue, diameter, 1);
				return false;
		})
		
		vis.selectAll("path.gene")
			.attr("title", function(g) { return styleTooltip(g.gene_name, g.gene_biotype + "</br>" + g.gene_id + "</br>" + numberWithCommas(parseInt(g.start) + start) + "</br>" + numberWithCommas(parseInt(g.end) + start)) })
			.each(function(g) {
					var pos = {top: 0, left: 0, width:0, height:0};
					$(this).on('mouseenter',function(e){
							pos.top = e.pageY
							pos.left = e.pageX
					}).tipsy({ gravity: $.fn.tipsy.autoNSEW, opacity: 1, html: true, pos: pos, offset: 5, hoverlock: true }); });

			
		gene.append("text")
	        .style("text-align", "left")
	        .attr("class", "svg_only")
	        .attr("transform", function (d) {
	        		return (computePointPath(d.start, d.end, 0, 0, 0, (diameter * 0.36) + (d.bumpLevel * 15), totalBP, diameter))
	        })
			.text(function (d) {
	        		return d.gene_name;
	        });
}

function addSNPTrack(snps, snpMeta){	
	var vis = d3.select("#main-svg");
	
	snpCutoff = snpMeta.snpCutoff
	maxscore = parseFloat(snpMeta.max);
	thresh = parseFloat(snpMeta.min);
	$("#maxScore").val(maxscore);
	
	var innerRadius = diameter * 0.29
		outerRadius = innerRadius + (diameter * 0.05),
		gwSigRadius = innerRadius+(parseFloat(snpCutoff-thresh) / (maxscore-thresh)) * (outerRadius-innerRadius-(diameter*0.01))
		
	var arc = d3.svg.arc()
		.innerRadius(innerRadius).outerRadius(outerRadius)
		.startAngle(startAngle).endAngle(endAngle);
		
	var snpBackground = vis.append("g").attr("class", "track snps background").selectAll("svg")
		.data([1]).enter();
	
	snpBackground.append("path").attr("d", arc).style("fill", "lightgrey").style("opacity", 0.3).attr("transform", trans);
	if (maxscore >= snpCutoff){
		snpBackground.append("path")
		.attr("d", d3.svg.arc()
			.innerRadius(gwSigRadius-2).outerRadius(gwSigRadius)
			.startAngle(startAngle).endAngle(endAngle)
		).style("fill", "white").attr("transform", trans);
	}
}

function addSNPTrackPoints(snps, snpMeta, totalBP){
	
	var vis = d3.select("#main-svg");
	var tissue = $("input:radio[name=tissue]:checked").val();
	var innerRadius = diameter * 0.29;
	
	var symb = d3.svg.symbol();
	symb.size(15);
	vis.append("g").attr("class", "track snps").selectAll("svg")
		.data(snps.filter(function (d) {
				return parseFloat(d.score) >= thresh;
		}))
		.enter()
		.append("path")
		.attr("transform", function (d) {
				return (computePointPath(d.start, d.end, d.score, thresh, maxscore, innerRadius, totalBP, diameter))
		})
		.attr("class", "snp")
		.attr("d", symb)
		.attr("fill", function (d) {
				if (parseFloat(d.score) >= snpCutoff) return "green";
				return "darkgrey";
		})                                                    
		.on("click", function (d) {
            	$("#search_term").val(d.name);
            	var term = $("#search_term").val()
    		term = term.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            	d3.selectAll("svg").remove();
				doSearch()
				//renderHic(term, tissue, 1);
				//renderHic(term, tissue, diameter, 1);
            	return false;
		})
		
		vis.selectAll("path.snp")
			.attr("title", function(s) { return styleTooltip(s.name, snpMeta.score_text +" = " + parseFloat(s.score).toFixed(2) + "</br>" + numberWithCommas(parseInt(s.start) + parseInt(META.ostart))) })
			.each(function(s) { $(this).tipsy({ gravity: "w", opacity: 1, html: true, offset: 5, hoverlock: true }); });
}

function addInteractions(hics, totalBP, tissues) {
	// add hic links
	//console.log(META);
	
	var vis = d3.select("#main-svg");
	var tissue = $("input:radio[name=tissue]:checked").val();
	
	var path = vis.append("g").attr("class", "middle hic").selectAll("svg")
		.data(hics)
		.enter()
		.append("path")
		.attr("id", function (d, i) {
				return ('p' + i);
		})
		.attr("class", function(d){
				classes = "interaction";
				for (var i=0;i<META.tissues.length;i++) {
					if (parseFloat(d[META.tissues[i]]) >= localStorage["interactionScore"]){
						classes += " "+META.tissues[i];
						tissues[META.tissues[i]]++;
					}
				}
				return classes;
		})
		.attr("d", function (d) {
				if (d.oeEnd > totalBP || d.baitEnd > totalBP){
					end = totalBP+(totalBP * (angleOffset/arcAvail))
					if (d.oeEnd > totalBP)
						return computePath(d.baitStart + ((d.baitEnd - d.baitStart) / 2), d.oeStart + ((end - d.oeStart) / 2), diameter * 0.28, totalBP, diameter);
					else
						return computePath(d.baitStart + ((end - d.baitStart) / 2), d.oeStart + ((d.oeEnd - d.oeStart) / 2), diameter * 0.28, totalBP, diameter);
				}
				if (d.oeStart == 1 || d.baitStart == 1){
					start = 1-(totalBP * (angleOffset/arcAvail))
					if (d.oeStart == 1)
						return computePath(d.baitStart + ((d.baitEnd - d.baitStart) / 2), start + ((d.oeEnd - start) / 2), diameter * 0.28, totalBP, diameter);
					else
						return computePath(start + ((d.baitEnd - start) / 2), d.oeStart + ((d.oeEnd - d.oeStart) / 2), diameter * 0.28, totalBP, diameter);
				}
				return computePath(d.baitStart + ((d.baitEnd - d.baitStart) / 2), d.oeStart + ((d.oeEnd - d.oeStart) / 2), diameter * 0.28, totalBP, diameter);
		})
		.attr("transform", trans)
		.attr("fill", "none")
		.attr("stroke-width", 3);
		
		pathDetails(path);
		
		vis.selectAll("path.interaction").sort(function (a, b) {
				if (parseFloat(a[tissue]) < localStorage["interactionScore"]) return -1;
				if (a[tissue] > b[tissue]) return 1;
				if (b[tissue] > a[tissue]) return -1;
				else return 0;
		});
}

function pathDetails(interactions){
	var vis = d3.select("#main-svg");
	var tissue = $("input:radio[name=tissue]:checked").val();
	
	data = interactions.data();
	
	interactions.attr("stroke", function (d) {
			if (parseFloat(d[tissue]) >= localStorage["interactionScore"]){
				return interactionColor(d[tissue]);
			}
			else{
				return "lightgrey";
			}
	})
	.attr("stroke-dasharray", function (d) {
			if ((d.oeEnd > totalBP && d.oeStart > totalBP) || (d.baitEnd > totalBP && d.baitStart > totalBP) || (d.oeEnd == 1 && d.oeStart == 1) || (d.baitEnd == 1 && d.baitStart == 1))
				return 10;
			return 0;
	})
	.on("mouseover", function (d, i) {
			vis.selectAll("path.interaction").sort(function (a, b) {
					if (parseFloat(a[tissue]) < localStorage["interactionScore"]) return -1;
					if (a[tissue] > b[tissue]) return 1;
					if (b[tissue] > a[tissue]) return -1;
					else return 0;
			});
			
			if (d3.select(".updateClick").node() != null){
				this.parentNode.appendChild(d3.select(".updateClick").node());
			}
			
			d3.select(this).classed('hover', true);
			//this.parentNode.appendChild(this);
			
//			if (this.getAttribute("stroke") != "yellow"){
//			if(this.classList.contains("hover")){
//				console.log("here");
//				this.parentNode.appendChild(this);
//			}
			//this.parentNode.appendChild(this);
			
			vis.append("path")
				.attr("class", "deleteMe")
				.attr("d", computeArcPath(d.oeStart, d.oeEnd, diameter * 0.28, diameter / 2.5, totalBP))
				.style("stroke-width", 2)
				.style("stroke", "red")
				.attr("transform", trans)
				.attr("fill", "none")
				
			vis.append("path")
				.attr("class", "deleteMe")
				.attr("d", computeArcPath(d.baitStart, d.baitEnd, diameter * 0.28, diameter / 2.5, totalBP))
				.style("stroke-width", 2)
				.style("stroke", "blue")
				.attr("transform", trans)
				.attr("fill", "none")
	})
	.on("mouseout", function (d, i) {
			d3.select(this).classed('hover', false);
			vis.selectAll(".deleteMe").remove();			
			
			vis.selectAll("path.interaction").sort(function (a, b) {
					if (parseFloat(a[tissue]) < localStorage["interactionScore"]) return -1;
					if (a[tissue] > b[tissue]) return 1;
					if (b[tissue] > a[tissue]) return -1;
					else return 0;
			});
			
			if (d3.select(".updateClick").node() != null){
				this.parentNode.appendChild(d3.select(".updateClick").node());
			}
	})
	.on("click", function (d) {
			resetVis();
            $(".deleteMe").attr('class', 'deleteClick');
            d3.selectAll(".hicScore").classed('deleteClick', true);
            d3.select(this).classed('updateClick', true);
			
			$("#footer-bait").html('chr' + CHR + ':' + numberWithCommas(d.baitStart_ori) + '..' + numberWithCommas(d.baitEnd_ori) + " (" + ((d.baitEnd_ori - d.baitStart_ori) / 1000).toFixed(2) + "KB)");
			$("#footer-target").html('chr' + CHR + ':' + numberWithCommas(d.oeStart_ori) + '..' + numberWithCommas(d.oeEnd_ori) + " (" + ((d.oeEnd_ori - d.oeStart_ori) / 1000).toFixed(2) + "KB)");
			
			drawRegionPanel("bait", CHR, d.baitStart_ori, d.baitEnd_ori, $("#maxScore").val());
			drawRegionPanel("target", CHR, d.oeStart_ori, d.oeEnd_ori, $("#maxScore").val());
	});
	
	interactions.sort(function (a, b) {
			if (parseFloat(a[tissue]) < localStorage["interactionScore"]) return -1;
			if (a[tissue] > b[tissue]) return 1;
			if (b[tissue] > a[tissue]) return -1;                                                                 
			else return 0;
	});
	
	vis.selectAll("path.interaction")
		.attr("title", function(hic) { return styleTooltip("Score " + parseFloat(hic[tissue]).toFixed(2), "") })
		.each(function(hic) {
			var pos = {top: 0, left: 0, width:0, height:0};
			$(this).on('mouseenter',function(e){
					pos.top = e.pageY
					pos.left = e.pageX
		}).tipsy({ gravity: $.fn.tipsy.autoNSEW, opacity: 1, html: true, pos: pos, offset: 5, className: 'hicScore' }); });
}

function addGeneKey(){
	var vis = d3.select("#main-svg");
	
	var biotypes = ["protein_coding","lincRNA","snoRNA","antisense","miRNA","snRNA","pseudogene","misc_RNA","processed_transcript"]
	
	var rect_width = 20;
	var text_width = 100;
	var spacer_width = 5
	var cols = Math.ceil($("#main-svg").width() / (rect_width + text_width)) - 1;
	var rows = Math.ceil(biotypes.length / cols);
	
	var scale_group = vis.append("g").attr("class", "genes key")
		.attr("id", "geneKey").selectAll("svg")
		.data(biotypes).enter();
		
	scale_group.append("rect")
			.attr("x", function(d, i) { return ((i % cols) * (rect_width+text_width)) })
			.attr("y", function(d, i) { return Math.floor(i / cols) * 30 })
			.attr("width", rect_width).attr("height", rect_width)
			.attr("class", function(d){ return d; })
		
	scale_group.append("text")
		.attr("x", function(d,i) { return (spacer_width+rect_width+ (i % cols) * (rect_width+text_width)) })
		.attr("y", function(d, i) { return 15 + Math.floor(i / cols) * 30 })
		.text(function (d) { return d.replace("_", " "); });	
		
	vis.selectAll("g.key")
		.attr("transform", function(){ width = $(this)[0].getBBox().width; return "translate("+((diameter*0.5) - (width*0.5))+","+(diameter - (diameter*0.05))+")"} );
}

function drawRegionPanel(type, chr, start, end, maxscore) {	
	var region = chr+':'+start+'-'+end,
		data1 = [start, end],
		w = $("#panel-" + type).width(), h = 270, trackHeight = 90,
		margin = {top: 10, right: 10, bottom: 10, left: 10},
		formatxAxis = d3.format('0,000,000f'),
		xRange = d3.scale.linear().domain([d3.min(data1), d3.max(data1)]).range([(3 * margin.left), (w - margin.left)]),
		regionStart = d3.min(data1),
		tissue = $("input:radio[name=tissue]:checked").val()
		borderColor = "red";
		
//	var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
	var url = "/chicp/subSearch?region=" + region + '&tissue=' + tissue;
    var gwas = $("#gwas").val();
	if (gwas != "" && gwas !==null && gwas !==undefined) url += '&snp_track=' + gwas;
//	if (gwas != "" && $.cookie('cb-enabled') == 'accepted' && gwas !==null && gwas !==undefined) url += '&snp_track=' + gwas;
    
    $("#panel-" + type).isLoading({ text: "Loading", position: "overlay" });
		
	d3.json(url, function (error, data) {
			if (error) { $("#panel-" + type).isLoading( "hide" ); return console.warn(error);}
			
			if (type === 'bait') borderColor = 'blue';
			else if(type === 'target') borderColor = "red";
			
			//console.log(data);
			adjustBump(data.genes, 100);	
			
			//Create the SVG Viewport
			var svgContainer = d3.select("#panel-" + type).append("svg:svg")
				.attr("width", w)
				.attr("height", h)
				.attr("id", type + "-svg");
				
			svgContainer.append("text")
				.attr("x", 0).attr("y", 0)
				.attr("text-anchor", "left")  
				.style("font-size", "18px")
				.style("color", borderColor)
				.attr("class", "svg_only")
				.text(type.substring(0,1).toUpperCase() + type.substring(1));
				
			var rectangle = svgContainer.append("rect")
				.attr("x", -10).attr("y", -30)
				.attr("width", w+10+margin.left+margin.right).attr("height", h+30+margin.top+margin.bottom)
				.style("stroke", borderColor)
				.style("fill", "none")
				.style("stroke-width", 1)
				.attr("class", "svg_only");
			
			//Create the Axis
			var xAxis = d3.svg.axis()
				.scale(xRange)
				.ticks(4)
				.tickFormat(formatxAxis);
			
			//Create an SVG group Element for the Axis elements and call the xAxis function
			var xAxisGroup = svgContainer.append("svg:g")
				.attr("class", "x axis").attr("id", type+"XAxis")
				.attr("transform", "translate(0," + (h - margin.top - margin.bottom) + ")")
				.call(xAxis);
				
			// TRACK 1 - SNPS
			var yRangeS = d3.scale.linear().domain([0, maxscore]).range([trackHeight - margin.top, margin.top]);
			
			var tickFormatter = d3.format('.0f');
			if (maxscore <= 1) {tickFormatter = d3.format('.1f')}
			
			var yAxis = d3.svg.axis()
				.scale(yRangeS)
				.ticks(3)
				.tickFormat(function(d) { return tickFormatter(d); })
				.tickSize(-(w - margin.right - 3 * margin.left), 0, 0)
				.orient("left");
			
			var yAxisGroup = svgContainer.append("svg:g")
				.attr("class", "y axis").attr("id", type+"YAxis")
				.attr("transform", "translate(" + (3 * margin.left) + ",0)")
				.call(yAxis);
			
			yAxisGroup.append("text")
				.attr("class", "y label")
				.style("text-anchor", "middle")
				.attr("text-anchor", "end")
				.attr("y", -2.5 * margin.left)
				.attr("x", -(0.5 * trackHeight))
				.attr("dy", ".75em")
				.attr("transform", "rotate(-90)")
				.text(data.snp_meta.score_text);
				
			var snp = svgContainer.append("g").attr("class", "track snps").attr("id", type+"SNPTrack")
				.selectAll(".snp")
				.data(data.snps)
				.enter().append("g")
				.attr("class", "snp");		
			
			snp.append("path")
				.attr("class", "marker")
				.attr("d", d3.svg.symbol().size(30))
				.attr("stroke", function (d) {
					if (parseFloat(d.score) >= snpCutoff) return "green";
					return "lightgrey";
				})
				.attr("fill", function (d) {
					if (parseFloat(d.score) >= snpCutoff) return "green";
					return "lightgrey";
				})
				.attr("transform", function (d) {
					return "translate(" + xRange(d.start + regionStart) + "," + yRangeS(d.score) + ")";
				});
		
			svgContainer.selectAll("path.marker")
				.attr("title", function(s) { return styleTooltip('<a href="http://www.immunobase.org/page/Overview/display/marker/'+s.name+'" target="_blank">'+s.name+'</a>', data.snp_meta.score_text+" = " + d3.round(s.score, 3) + "</br>" + numberWithCommas(parseInt(s.start) + parseInt(regionStart))) })
				.each(function(s) { $(this).tipsy({ gravity: $.fn.tipsy.autoWE, opacity: 1, html: true, offset: 5, hoverlock: true }); });
				
			// TRACK 2 - GENES
			var yRangeG = d3.scale.linear().domain([0, trackHeight]).range([margin.top, margin.top + trackHeight]);
			var geneTrackOffset = trackHeight + (margin.top);
			
			var lineFunction = d3.svg.line()
				.x(function (d) {
				return d.x;
			})
				.y(function (d) {
				return d.y;
			})
			.interpolate("linear");
				
			var gene = svgContainer.append("g").attr("class", "track genes").attr("id", type+"GeneTrack")
				.selectAll(".gene")
				.data(data.genes)

			gene.enter().append("g")
				.attr("class", "gene")
				.attr("id", function (d) {
				return d.gene_id;
			});
				
			gene.append("text")
                .style("text-align", "right")
				.attr("y", function (d) {
				return geneTrackOffset + yRangeG(30 * d.bumpLevel);
			})
				.attr("x", function (d) {
				return xRange(d.start + regionStart) - 1.5*margin.left;
			})
				.attr("transform", function (d) {
				return "translate(0,-2)";
			})
				.text(function (d) {
				return d.gene_name;
			});
				
			gene.append("path")
				.attr("class", function (d) {
				return "line " + d.gene_biotype;
			})
			.attr("style", "stroke-width:1px")
				.attr("d", function (d) {
				return lineFunction([{
					x: xRange(d.start + regionStart),
					y: geneTrackOffset + 6 + yRangeG((30 * d.bumpLevel))
				}, {
					x: xRange(d.end + regionStart),
					y: geneTrackOffset + 6 + yRangeG((30 * d.bumpLevel))
				}]);
			});

			var exon = gene.append("g").attr("class", "track exons").selectAll(".exon")
				.data(function (d) {
					return data.exons[d.gene_id];
				})
				.enter().append("g")
				.attr("class", "exon")
				
			exon.append("path")
				.attr("d", function (d) {
					geneObj = findGeneForExon(gene.data(), d.name);
						if (geneObj.strand == "-") {
							return lineFunction([{
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}, {
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}, {
								x: xRange(d.start + regionStart) - 5,
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 6
							}, {
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 12
							}, {
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 12
							}, {
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}]);
						} else {
							return lineFunction([{
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}, {
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 12
							}, {
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 12
							}, {
								x: xRange(d.end + regionStart) + 5,
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 6
							}, {
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}, {
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}])
						}
    			})
				.attr("class", function (d) {
					geneObj = findGeneForExon(gene.data(), d.name);
					var classes = "line " + geneObj.gene_biotype;
					if (d.start != d.end && d.score > 0) { classes += " tss"; }
					return classes;
			});
			
			
				
			// TRACK 3 - BLUEPRINT
			var yRangeB = d3.scale.linear().domain([0, trackHeight]).range([margin.top, margin.top + trackHeight]);
			var trackOffset = $('g#'+type+'GeneTrack').get(0).getBBox().height + $('g#'+type+'GeneTrack').get(0).getBBox().y;			
			if (trackOffset == 0){ // No genes to display!
				trackOffset = $('g#'+type+'YAxis').get(0).getBBox().height + $('g#'+type+'YAxis').get(0).getBBox().y;
			}

			var line = d3.svg.line()
				.interpolate("linear")
				.x(function (d) { return xRange(d.x+regionStart); })
				.y(function (d) { return yRangeB(d.y); });
			
			var blueprintTrack = svgContainer.append("g").attr("class", "track blueprint");
				
			
			for (var sample in data.blueprint){
				if (data.blueprint[sample].length == 0)
					continue;
				
				trackOffset += margin.top;
				
				var blueprint = blueprintTrack.append("g").attr("class", sample)
				
				var states = blueprint.selectAll(".blueprint")
					.data(data.blueprint[sample])
					.enter();
				
				states.append("path")
					.attr("class", "line bp_states "+sample)
					.attr("d", function (d) {
							return line([ { x: d.start, y: trackOffset}, { x: d.end, y: trackOffset }]);
					})
					.attr("stroke", function (d) { return "rgb("+d.color+")"; })
					.attr("stroke-width", "6px");
					
				svgContainer.selectAll("path.bp_states."+sample)
					.attr("title", function(s){ return styleTooltip(s.label, s.desc) })
					.each(function(s) { $(this).tipsy({ gravity: 'n', opacity: 1, html: true, offset: 5, hoverlock: true }); });
					
				blueprint.append("text")
					.attr("x", 10)
					.attr("y", trackOffset+10)
					.attr("dy", ".35em")
					.style("font-size", "0.9em")
					.style("font-family", "FontAwesome")
					.text("\uf059")
					.attr("id", "label-"+sample)
					.attr("class", "svg_hide")
					
				svgContainer.selectAll("text#label-"+sample)
					.attr("title", styleTooltip(data.blueprint[sample][0]["label"]+" ("+sample+")") )
					.each(function(s) { $(this).tipsy({ gravity: 'e', opacity: 1, html: true, offset: 5, hoverlock: true }); });
					
			}
			$("#panel-" + type).isLoading( "hide" ); 
	});	
}

function resetPage(term, tissue, breadcrumb) {
    d3.selectAll("svg").remove();
    $(".tipsy").remove();
    resetVis();
    $("#search_term").val(term);
    $(".page_header").html(term + " in " + tissue.replace(/_/g, " ") + " Tissues");
    term = term.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    termText = term
    termId = term
    if ($("#regionSearch").val() != '' && $("#regionSearch").val() != term){
    	termText = term+" ("+$("#regionSearch").val()+")";
    	termId = term+"__"+$("#regionSearch").val();
    }
    if (breadcrumb) $("#breadcrumb").append('<li id="BC-' + termId + '"><a href="#" onclick=\'javascript:d3.selectAll("svg").remove(); $(document.getElementById("BC-'+termId+'")).remove();  renderHic("' + termId + '", $("input:radio[name=tissue]:checked").val(), 1)\'>' + termText + '</a></li>');
}

function renderVis() {
	resetVis();
	var tissue = $("input:radio[name=tissue]:checked").val();
	var term = $("#search_term").val();
	term = term.replace(/</g, "&lt;").replace(/>/g, "&gt;");
						renderHic(term, tissue, 0);
						//renderHic(term, tissue, diameter, 0);
}

function resetVis() {
	d3.select("#message").remove();	
	d3.select("#svg-container").selectAll(".deleteClick").remove();
	$(".deleteClick").remove();
	d3.select("#svg-container").selectAll(".updateClick").classed('updateClick', false);
	d3.select("#bait-svg").remove();
	d3.select("#target-svg").remove();
	$("#footer-bait").html("&nbsp;");
	$("#footer-target").html("&nbsp;");
}

function zoomIn(innerRadius, circAvail, angleOffset){
	selectedArray = d3.selectAll(".selected")[0];
	if (selectedArray.length > 0) {
		s1 = parseInt(selectedArray[0].id.replace("seg", ""))
		s2 = parseInt(selectedArray[selectedArray.length-1].id.replace("seg", ""))
		var l1 = (s1-angleOffset) * (pi/180) * innerRadius
		var l2 = s2 * (pi/180) * innerRadius
		var p1 = Math.ceil(META.ostart+(l1*(totalBP/circAvail)))
		var p2 = Math.ceil(META.ostart+(l2*(totalBP/circAvail)))
		if(p1 < 0) p1=0;
		var region = CHR+":"+p1+"-"+p2;
		console.log(region)
		var gwas = $("#gwas").val();
		var tissue = $("input:radio[name=tissue]:checked").val();
		$("#regionSearch").val(region);
		var term = $("#search_term").val();
		term = term.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		renderHic(term, tissue, 1);
		$("#regionSearch").val("");
	}
}
	

$(document).ready(function () {
		
	$("#search_term").keyup(function(event){
		if(event.which == 13){ doSearch(); }
	});
	
	$("#pushme").bind("click", function () { doSearch(); });

    $("input:radio[name=tissue]").bind("click", function () {
    		var tissue = $("input:radio[name=tissue]:checked").val();
    		var gene = $("#search_term").val();
		gene = gene.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    		$(".page_header").html(gene + " in " + tissue.replace(/_/g, " ") + " Tissues");
    		
			localStorage["tissue"] = tissue;
    		
    		resetVis();
    		pathDetails(d3.select("#svg-container").selectAll("path.interaction"));
    });
    
    $(document).keyup(function(e) {
		if (e.keyCode == 27) { 
			selecting = 0;
			d3.selectAll(".segment").classed("selected", false).style("fill", "white").style("opacity", 0);
		}
    });
});


function doSearch(){
	var term = $("#search_term").val();
	term = term.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	localStorage["searchTerm"] = term;
	localStorage["target"] = $("#target")[0].options[$("#target")[0].selectedIndex].value;
	
	if ($("input:radio[name=tissue]:checked").val() == undefined){
		$(".tissue").find("input:radio").each(function () { $(this).prop('checked', false); });
		$(document.getElementsByClassName(localStorage["target"])).first().find("input:radio").prop('checked',true);
	}
	var tissue = $("input:radio[name=tissue]:checked").val();
	localStorage["tissue"] = tissue;
	if ($("#gwas")[0] == undefined)
		localStorage["snp_track"] = "None";
	else
		localStorage["snp_track"] = $("#gwas")[0].options[$("#gwas")[0].selectedIndex].value;
	renderHic(term, tissue, 1);
	return (false);	
}
	
function reDrawSVG(){
	d3.selectAll("svg").remove();
	renderVis();
}
